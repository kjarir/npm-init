import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:bobpay/services/supabase_client.dart';
import 'package:bobpay/config/env_config.dart';
import 'package:bobpay/services/audit_log.dart';
import 'package:bobpay/services/certificate_service.dart';
import 'package:bobpay/services/comprehensive_device_id.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';

/// Registration Service
/// Handles user registration with Supabase Auth, profile creation, and certificate generation
class RegistrationService {
  static const _storage = FlutterSecureStorage();

  /// Register user with email and password
  /// Generates certificate ONE TIME during registration
  /// Returns: {success, user_id, profile, error}
  static Future<Map<String, dynamic>> registerUser({
    required String name,
    required String email,
    required String password,
    required bool isFreelancer,
  }) async {
    try {
      if (!SupabaseService.isInitialized) {
        return {
          'success': false,
          'error': 'Supabase not initialized. Please check your configuration.',
        };
      }

      debugPrint('📝 [REGISTRATION] Registering user: $email');

      // Step 1: Validate inputs
      if (name.isEmpty || email.isEmpty || password.isEmpty) {
        return {
          'success': false,
          'error': 'Please fill in all fields',
        };
      }

      if (password.length < 6) {
        return {
          'success': false,
          'error': 'Password must be at least 6 characters',
        };
      }

      // Step 2: Get device data for certificate generation
      debugPrint('📝 [REGISTRATION] Collecting device data...');
      final deviceData = await ComprehensiveDeviceId.getAllDeviceData();
      final deviceFingerprint = deviceData['device_fingerprint_hash'] as String;
      debugPrint('📝 [REGISTRATION] Device fingerprint: $deviceFingerprint');

      // Step 3: Generate certificate (ONE TIME ONLY - during registration)
      debugPrint('📝 [REGISTRATION] Generating certificate...');
      Map<String, String> certificate;
      try {
        certificate = CertificateService.generateCertificate(
          deviceFingerprint: deviceFingerprint,
          deviceData: deviceData,
        );
        debugPrint('✅ [REGISTRATION] Certificate generated successfully!');
        debugPrint('📝 [REGISTRATION] Certificate ID: ${certificate['certificate_id']}');
      } catch (e, stackTrace) {
        debugPrint('❌ [REGISTRATION] ERROR generating certificate: $e');
        debugPrint('❌ [REGISTRATION] Stack trace: $stackTrace');
        return {
          'success': false,
          'error': 'Certificate generation failed: $e',
          'error_details': stackTrace.toString(),
        };
      }

      // Step 4: Store private key securely on device (NEVER send to server)
      // Store with both old and new key names for compatibility
      await _storage.write(
        key: 'device_private_key',
        value: certificate['private_key'],
      );
      await _storage.write(
        key: 'private_key', // Also store with this key for compatibility
        value: certificate['private_key'],
      );
      await _storage.write(
        key: 'device_certificate',
        value: certificate['certificate'],
      );
      await _storage.write(
        key: 'certificate', // Also store with this key for compatibility
        value: certificate['certificate'],
      );
      await _storage.write(
        key: 'public_key', // Extract and store public key separately
        value: certificate['public_key'],
      );
      await _storage.write(
        key: 'device_fingerprint',
        value: deviceFingerprint,
      );
      await _storage.write(
        key: 'certificate_id',
        value: certificate['certificate_id'] ?? '',
      );
      debugPrint('✅ [REGISTRATION] Certificate stored securely on device');

      // Step 5: Sign up with Supabase Auth
      AuthResponse response;
      try {
        response = await SupabaseService.client.auth.signUp(
          email: email.trim(),
          password: password,
          data: {
            'full_name': name,
            'role': isFreelancer ? 'freelancer' : 'client',
          },
          emailRedirectTo:
              EnvConfig.authRedirectUrl.isNotEmpty ? EnvConfig.authRedirectUrl : null,
        );
      } catch (e) {
        // Check if user already exists
        final errorStr = e.toString().toLowerCase();
        if (errorStr.contains('already registered') || 
            errorStr.contains('user already exists') ||
            errorStr.contains('already been registered')) {
          return {
            'success': false,
            'error': 'An account with this email already exists. Please login instead.',
          };
        }
        // Re-throw other errors
        rethrow;
      }

      if (response.user == null) {
        return {
          'success': false,
          'error': 'Registration failed. Please try again.',
        };
      }

      final userId = response.user!.id;
      debugPrint('✅ [REGISTRATION] User created in Auth: $userId');

      final verificationRequired = response.session == null;
      if (verificationRequired) {
        debugPrint('⚠️ [REGISTRATION] Email verification required before login.');
        return {
          'success': true,
          'verification_required': true,
          'user_id': userId,
          'email': email.trim(),
          'message': 'Please verify your email before logging in.',
        };
      }

      // Step 6: Check if session is available (important for RLS policies)
      if (response.session != null) {
        debugPrint('✅ [REGISTRATION] Session available, user is authenticated');
        // Session is set automatically by Supabase client
      } else {
        debugPrint('⚠️ [REGISTRATION] No session in response');
        debugPrint('⚠️ [REGISTRATION] This might mean email confirmation is required');
        debugPrint('⚠️ [REGISTRATION] Profile creation might fail due to RLS policy');
        debugPrint('⚠️ [REGISTRATION] Solution: Use database trigger to create profile automatically');
      }

      // Step 7: Create profile in profiles table
      try {
        final profileRecord = {
          'id': userId,
          'email': email.trim(),
          'full_name': name,
          'role': isFreelancer ? 'freelancer' : 'client',
          'reputation': 50,
        };

        debugPrint('📝 [REGISTRATION] Inserting profile into database...');
        debugPrint('📝 [REGISTRATION] Profile data: $profileRecord');
        debugPrint('📝 [REGISTRATION] Current auth user: ${SupabaseService.client.auth.currentUser?.id}');
        
        // Check if profile already exists (might be created by trigger)
        final existingProfile = await SupabaseService.client
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (existingProfile != null) {
          debugPrint('✅ [REGISTRATION] Profile already exists (created by trigger): $existingProfile');
        } else {
          // Insert profile - use the authenticated client
          // If RLS fails, it means the policy needs to allow inserts during signup
          try {
            final profileResponse = await SupabaseService.client
                .from('profiles')
                .insert(profileRecord)
                .select()
                .single();

            debugPrint('✅ [REGISTRATION] Profile created successfully: $profileResponse');
          } catch (e) {
            debugPrint('❌ [REGISTRATION] Profile insert failed: $e');
            debugPrint('⚠️ [REGISTRATION] This is likely due to RLS policy blocking the insert');
            debugPrint('⚠️ [REGISTRATION] Checking if database trigger created the profile...');
            
            // Wait a bit for trigger to execute (if it exists)
            await Future.delayed(const Duration(milliseconds: 1000));
            
            // Check if trigger created the profile
            final retryCheck = await SupabaseService.client
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();
            
            if (retryCheck != null) {
              debugPrint('✅ [REGISTRATION] Profile created by database trigger: $retryCheck');
            } else {
              debugPrint('❌ [REGISTRATION] Profile still not created after trigger check');
              debugPrint('❌ [REGISTRATION] You need to either:');
              debugPrint('   1. Run CREATE_PROFILE_TRIGGER.sql to create an auto-profile trigger');
              debugPrint('   2. Or fix the RLS policy to allow profile inserts during signup');
              rethrow; // Re-throw if still not created
            }
          }
        }

        // Step 7: Ensure device record exists (required by certificates FK)
        final deviceStored = await _upsertDeviceRecord(
          deviceData: deviceData,
          certificate: certificate,
        );
        if (!deviceStored) {
          debugPrint('⚠️ [REGISTRATION] Device record missing. Certificate insert may fail.');
        }

        // Step 7: Store certificate in certificates table
        // Note: certificates table uses device_fingerprint_hash, not user_id
        try {
          final certificateRecord = {
            'certificate_id': certificate['certificate_id'],
            'user_id': userId,
            'device_fingerprint_hash': deviceFingerprint,
            'certificate_data': certificate['certificate'],
            'public_key': certificate['public_key'],
            'signature': (jsonDecode(certificate['certificate']!) as Map<String, dynamic>)['signature']?.toString() ?? '',
            'created_at': DateTime.now().toIso8601String(),
          };

          if (deviceStored) {
            await SupabaseService.client
                .from('certificates')
                .insert(certificateRecord);
          } else {
            debugPrint('⚠️ [REGISTRATION] Skipping certificate insert (device missing)');
          }
          
          debugPrint('✅ [REGISTRATION] Certificate stored in database');
        } catch (e) {
          final message = e.toString();
          if (message.contains('42703') && message.contains('user_id')) {
            debugPrint('⚠️ [REGISTRATION] certificates.user_id missing. Inserting without user_id...');
            try {
              final fallbackRecord = {
                'certificate_id': certificate['certificate_id'],
                'device_fingerprint_hash': deviceFingerprint,
                'certificate_data': certificate['certificate'],
                'public_key': certificate['public_key'],
                'signature': (jsonDecode(certificate['certificate']!) as Map<String, dynamic>)['signature']?.toString() ?? '',
                'created_at': DateTime.now().toIso8601String(),
              };
              if (deviceStored) {
                await SupabaseService.client
                    .from('certificates')
                    .insert(fallbackRecord);
              } else {
                debugPrint('⚠️ [REGISTRATION] Skipping fallback insert (device missing)');
              }
              debugPrint('✅ [REGISTRATION] Certificate stored without user_id');
              debugPrint('⚠️ [REGISTRATION] Run supabase_certificates_user_id.sql for secure channels.');
            } catch (inner) {
              debugPrint('⚠️ [REGISTRATION] Fallback insert failed: $inner');
            }
          } else {
            debugPrint('⚠️ [REGISTRATION] Could not store certificate in database: $e');
          }
          debugPrint('⚠️ [REGISTRATION] Certificate is stored locally, but not in database');
        }

        // Step 8: Log registration
        try {
          await AuditLogService.logRegistration(
            userId: userId,
            deviceFingerprint: deviceFingerprint,
            registrationData: {
              'name': name,
              'email': email,
              'role': isFreelancer ? 'freelancer' : 'client',
              'certificate_id': certificate['certificate_id'],
            },
          );
        } catch (e) {
          debugPrint('⚠️ [REGISTRATION] Could not create audit log: $e');
        }

        return {
          'success': true,
          'user_id': userId,
          'profile': profileRecord,
          'certificate_id': certificate['certificate_id'],
          'message': 'Registration successful',
        };
      } catch (e, stackTrace) {
        debugPrint('❌ [REGISTRATION] Error creating profile: $e');
        debugPrint('❌ [REGISTRATION] Error type: ${e.runtimeType}');
        debugPrint('❌ [REGISTRATION] Stack trace: $stackTrace');
        
        // User is created but profile creation failed
        return {
          'success': false,
          'error': 'User created but profile creation failed: $e',
          'error_details': stackTrace.toString(),
        };
      }
    } catch (e, stackTrace) {
      debugPrint('❌ [REGISTRATION] ERROR: $e');
      debugPrint('❌ [REGISTRATION] Stack trace: $stackTrace');
      
      // Handle specific Supabase auth errors
      String errorMessage = 'Registration failed. Please try again.';
      if (e.toString().contains('User already registered')) {
        errorMessage = 'An account with this email already exists.';
      } else if (e.toString().contains('Invalid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (e.toString().contains('Password')) {
        errorMessage = 'Password does not meet requirements.';
      }
      
      return {
        'success': false,
        'error': errorMessage,
        'error_details': e.toString(),
      };
    }
  }

  /// Check if email is already registered
  static Future<bool> isEmailRegistered(String email) async {
    try {
      if (!SupabaseService.isInitialized) {
        return false;
      }

      // Try to sign in to check if user exists
      // Note: This is a workaround - Supabase doesn't have a direct "check email" endpoint
      // In production, you might want to create a custom function
      final response = await SupabaseService.client
          .from('profiles')
          .select('id')
          .eq('email', email.trim())
          .maybeSingle();

      return response != null;
    } catch (e) {
      debugPrint('Error checking email: $e');
      return false;
    }
  }

  static Future<Map<String, dynamic>> resendVerificationEmail(String email) async {
    try {
      if (!SupabaseService.isInitialized) {
        return {'success': false, 'error': 'Supabase not initialized'};
      }
      await SupabaseService.client.auth.resend(
        type: OtpType.signup,
        email: email.trim(),
        emailRedirectTo:
            EnvConfig.authRedirectUrl.isNotEmpty ? EnvConfig.authRedirectUrl : null,
      );
      return {'success': true};
    } catch (e) {
      debugPrint('⚠️ [REGISTRATION] Resend verification failed: $e');
      return {'success': false, 'error': 'Failed to resend verification email: $e'};
    }
  }

  static Future<bool> _upsertDeviceRecord({
    required Map<String, dynamic> deviceData,
    required Map<String, String> certificate,
  }) async {
    final fingerprint = deviceData['device_fingerprint_hash']?.toString() ?? '';
    if (fingerprint.isEmpty) {
      debugPrint('⚠️ [REGISTRATION] Device fingerprint missing, cannot store device');
      return false;
    }

    final deviceId = deviceData['device_id']?.toString() ??
        deviceData['android_id']?.toString() ??
        deviceData['identifier_for_vendor']?.toString() ??
        'unknown';

    final record = {
      'device_fingerprint_hash': fingerprint,
      'device_id': deviceId,
      'device_data': deviceData,
      'certificate_id': certificate['certificate_id'],
      'public_certificate': certificate['certificate'],
      'public_key': certificate['public_key'],
      'is_active': true,
      'updated_at': DateTime.now().toIso8601String(),
    };

    try {
      await SupabaseService.client
          .from('devices')
          .upsert(record, onConflict: 'device_fingerprint_hash');
      debugPrint('✅ [REGISTRATION] Device stored/updated');
      return true;
    } catch (e) {
      debugPrint('⚠️ [REGISTRATION] Could not store device: $e');
      return false;
    }
  }
}
