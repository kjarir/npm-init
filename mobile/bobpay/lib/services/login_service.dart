import 'package:flutter/foundation.dart';
import 'package:bobpay/services/supabase_client.dart';
import 'package:bobpay/services/audit_log.dart';
import 'package:bobpay/services/local_key_service.dart';
import 'package:bobpay/services/device_approval_service.dart';

/// Login Service
/// Handles normal email/password authentication using Supabase Auth
class LoginService {
  /// Login using email and password
  /// Returns: {success, profile, error}
  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    try {
      if (!SupabaseService.isInitialized) {
        return {
          'success': false,
          'error': 'Supabase not initialized. Please check your configuration.',
        };
      }

      debugPrint('🔐 [LOGIN] Attempting login for: $email');

      // Step 1: Sign in with email and password using Supabase Auth
      final response = await SupabaseService.client.auth.signInWithPassword(
        email: email.trim(),
        password: password,
      );

      if (response.user == null) {
        return {
          'success': false,
          'error': 'Login failed. Please check your credentials.',
        };
      }

      final userId = response.user!.id;
      debugPrint('✅ [LOGIN] User authenticated: $userId');

      try {
        await LocalKeyService.ensureLocalKeys(userId: userId);
      } catch (e) {
        debugPrint('⚠️ [LOGIN] Certificate recovery failed: $e');
      }

      final deviceApproval = await DeviceApprovalService.ensureDeviceTrusted(
        userId: userId,
      );
      if (deviceApproval['success'] != true) {
        return {
          'success': false,
          'error': deviceApproval['error']?.toString() ?? 'Device approval failed',
        };
      }
      if (deviceApproval['trusted'] != true) {
        return {
          'success': false,
          'device_verification_required': true,
          'challenge': deviceApproval['challenge'],
          'user_id': userId,
        };
      }

      // Step 2: Retrieve user profile from profiles table
      Map<String, dynamic>? profile;
      try {
        final profileResponse = await SupabaseService.client
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (profileResponse != null) {
          profile = Map<String, dynamic>.from(profileResponse);
          debugPrint('✅ [LOGIN] Profile retrieved: ${profile['full_name']} (${profile['email']})');
        } else {
          debugPrint('⚠️ [LOGIN] Profile not found for user: $userId');
          // Profile might not exist yet, create a basic one
          profile = {
            'id': userId,
            'email': response.user!.email ?? email,
            'full_name': response.user!.userMetadata?['full_name'] ?? 'User',
            'role': 'client',
            'reputation': 50,
          };
        }
      } catch (e) {
        debugPrint('⚠️ [LOGIN] Error retrieving profile: $e');
        // Continue with auth user data even if profile fetch fails
        profile = {
          'id': userId,
          'email': response.user!.email ?? email,
          'full_name': response.user!.userMetadata?['full_name'] ?? 'User',
          'role': 'client',
          'reputation': 50,
        };
      }

      // Log login (optional - only if audit_logs table exists)
      try {
        await AuditLogService.logLogin(
          userId: userId,
          loginData: {
            'email': profile['email'],
            'timestamp': DateTime.now().toIso8601String(),
          },
        );
      } catch (e) {
        debugPrint('⚠️ [LOGIN] Could not create audit log: $e');
      }

      debugPrint('✅ [LOGIN] Login successful');
      
      return {
        'success': true,
        'profile': profile,
        'user_id': userId,
        'message': 'Login successful',
      };
    } catch (e, stackTrace) {
      debugPrint('❌ [LOGIN] ERROR: $e');
      debugPrint('❌ [LOGIN] Stack trace: $stackTrace');
      
      // Handle specific Supabase auth errors
      String errorMessage = 'Login failed. Please try again.';
      String? errorCode;
      if (e.toString().contains('Invalid login credentials')) {
        errorMessage = 'Invalid email or password.';
        errorCode = 'invalid_credentials';
      } else if (e.toString().contains('Email not confirmed')) {
        errorMessage = 'Please verify your email before logging in.';
        errorCode = 'email_not_confirmed';
      } else if (e.toString().contains('Too many requests')) {
        errorMessage = 'Too many login attempts. Please try again later.';
        errorCode = 'rate_limited';
      }
      
      return {
        'success': false,
        'error': errorMessage,
        'error_details': e.toString(),
        if (errorCode != null) 'error_code': errorCode,
      };
    }
  }

  /// Check if user is already logged in
  static Future<bool> isLoggedIn() async {
    try {
      if (!SupabaseService.isInitialized) {
        return false;
      }
      final session = SupabaseService.client.auth.currentSession;
      return session != null;
    } catch (e) {
      return false;
    }
  }

  /// Get current user profile
  static Future<Map<String, dynamic>?> getCurrentProfile() async {
    try {
      if (!SupabaseService.isInitialized) {
        return null;
      }
      
      final user = SupabaseService.client.auth.currentUser;
      if (user == null) {
        return null;
      }

      final profileResponse = await SupabaseService.client
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

      if (profileResponse != null) {
        return Map<String, dynamic>.from(profileResponse);
      }
      
      return null;
    } catch (e) {
      debugPrint('Error getting current profile: $e');
      return null;
    }
  }

  /// Logout current user
  static Future<void> logout() async {
    try {
      if (SupabaseService.isInitialized) {
        await SupabaseService.client.auth.signOut();
        debugPrint('✅ [LOGOUT] User logged out successfully');
      }
    } catch (e) {
      debugPrint('❌ [LOGOUT] Error: $e');
    }
  }
}
