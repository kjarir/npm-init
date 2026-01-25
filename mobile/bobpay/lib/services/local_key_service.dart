import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:bobpay/services/certificate_service.dart';
import 'package:bobpay/services/comprehensive_device_id.dart';
import 'package:bobpay/services/supabase_client.dart';

/// Local Key Service
/// Retrieves private/public keys and device fingerprint from secure storage.
class LocalKeyService {
  static const _storage = FlutterSecureStorage();

  static Future<Map<String, String>> getLocalKeys() async {
    final privateKey = await _storage.read(key: 'device_private_key') ?? await _storage.read(key: 'private_key') ?? '';
    final publicKey = await _storage.read(key: 'public_key') ?? '';
    final deviceFingerprint = await _storage.read(key: 'device_fingerprint') ?? '';
    final certificateId = await _storage.read(key: 'certificate_id') ?? '';

    return {
      'private_key': privateKey,
      'public_key': publicKey,
      'device_fingerprint': deviceFingerprint,
      'certificate_id': certificateId,
    };
  }

  /// Ensure local keys exist, reissue certificate if missing.
  /// Returns: {private_key, public_key, device_fingerprint, certificate_id}
  static Future<Map<String, String>> ensureLocalKeys({
    required String userId,
  }) async {
    var privateKey = await _storage.read(key: 'device_private_key') ??
        await _storage.read(key: 'private_key') ??
        '';
    var publicKey = await _storage.read(key: 'public_key') ?? '';
    var deviceFingerprint = await _storage.read(key: 'device_fingerprint') ?? '';
    var certificateId = await _storage.read(key: 'certificate_id') ?? '';
    String? storedCertificateJson;

    if (privateKey.isEmpty || certificateId.isEmpty) {
      return _reissueCertificate(userId: userId);
    }

    if (publicKey.isEmpty || deviceFingerprint.isEmpty) {
      storedCertificateJson = await _storage.read(key: 'device_certificate') ??
          await _storage.read(key: 'certificate');
      if (storedCertificateJson != null) {
        try {
          final certificate = jsonDecode(storedCertificateJson) as Map<String, dynamic>;
          final certificateData = certificate['certificate_data'] as Map<String, dynamic>?;
          if (publicKey.isEmpty) {
            publicKey = certificateData?['public_key']?.toString() ?? publicKey;
          }
          if (deviceFingerprint.isEmpty) {
            deviceFingerprint = certificateData?['device_fingerprint']?.toString() ?? deviceFingerprint;
          }
          if (certificateId.isEmpty) {
            certificateId = certificate['certificate_id']?.toString() ?? certificateId;
          }
        } catch (e) {
          debugPrint('⚠️ [LOCAL_KEYS] Failed to parse stored certificate: $e');
        }
      }
    }

    if ((publicKey.isEmpty || deviceFingerprint.isEmpty || certificateId.isEmpty) &&
        SupabaseService.isInitialized &&
        userId.isNotEmpty) {
      try {
        final response = await SupabaseService.client
            .from('certificates')
            .select('certificate_id, public_key, device_fingerprint_hash')
            .eq('user_id', userId)
            .order('created_at', ascending: false)
            .limit(1)
            .maybeSingle();

        if (response != null) {
          if (publicKey.isEmpty) {
            publicKey = response['public_key']?.toString() ?? publicKey;
          }
          if (deviceFingerprint.isEmpty) {
            deviceFingerprint = response['device_fingerprint_hash']?.toString() ?? deviceFingerprint;
          }
          if (certificateId.isEmpty) {
            certificateId = response['certificate_id']?.toString() ?? certificateId;
          }
        }
      } catch (e) {
        final message = e.toString();
        if (message.contains('42703') && message.contains('user_id')) {
          debugPrint('⚠️ [LOCAL_KEYS] certificates.user_id missing. Trying fingerprint fallback...');
          if (deviceFingerprint.isEmpty) {
            final deviceData = await ComprehensiveDeviceId.getAllDeviceData();
            deviceFingerprint = deviceData['device_fingerprint_hash']?.toString() ?? deviceFingerprint;
          }
          if (deviceFingerprint.isNotEmpty) {
            try {
              final response = await SupabaseService.client
                  .from('certificates')
                  .select('certificate_id, public_key, device_fingerprint_hash')
                  .eq('device_fingerprint_hash', deviceFingerprint)
                  .order('created_at', ascending: false)
                  .limit(1)
                  .maybeSingle();
              if (response != null) {
                if (publicKey.isEmpty) {
                  publicKey = response['public_key']?.toString() ?? publicKey;
                }
                if (certificateId.isEmpty) {
                  certificateId = response['certificate_id']?.toString() ?? certificateId;
                }
              }
            } catch (inner) {
              debugPrint('⚠️ [LOCAL_KEYS] Fingerprint fallback failed: $inner');
            }
          }
        } else {
          debugPrint('⚠️ [LOCAL_KEYS] Failed to fetch certificate from DB: $e');
        }
      }
    }

    if (publicKey.isEmpty || certificateId.isEmpty) {
      return _reissueCertificate(userId: userId);
    }

    if (deviceFingerprint.isEmpty) {
      final deviceData = await ComprehensiveDeviceId.getAllDeviceData();
      final fingerprint = deviceData['device_fingerprint_hash']?.toString() ?? '';
      if (fingerprint.isNotEmpty) {
        deviceFingerprint = fingerprint;
        await _storage.write(key: 'device_fingerprint', value: deviceFingerprint);
      }
    }

    if (publicKey.isNotEmpty) {
      await _storage.write(key: 'public_key', value: publicKey);
    }
    if (certificateId.isNotEmpty) {
      await _storage.write(key: 'certificate_id', value: certificateId);
    }

    if (SupabaseService.isInitialized &&
        userId.isNotEmpty &&
        deviceFingerprint.isNotEmpty &&
        storedCertificateJson != null) {
      try {
        final deviceData = await ComprehensiveDeviceId.getAllDeviceData();
        final certPayload = {
          'certificate_id': certificateId,
          'certificate': storedCertificateJson,
          'public_key': publicKey,
        };
        await _upsertDeviceRecord(
          deviceData: deviceData,
          certificate: certPayload,
        );
      } catch (e) {
        debugPrint('⚠️ [LOCAL_KEYS] Device upsert skipped: $e');
      }
    }

    return {
      'private_key': privateKey,
      'public_key': publicKey,
      'device_fingerprint': deviceFingerprint,
      'certificate_id': certificateId,
    };
  }

  static Future<Map<String, String>> _reissueCertificate({
    required String userId,
  }) async {
    debugPrint('⚠️ [LOCAL_KEYS] Missing local certificate, reissuing...');
    final deviceData = await ComprehensiveDeviceId.getAllDeviceData();
    final deviceFingerprint = deviceData['device_fingerprint_hash']?.toString() ?? '';
    if (deviceFingerprint.isEmpty) {
      throw Exception('Device fingerprint unavailable');
    }

    final certificate = CertificateService.generateCertificate(
      deviceFingerprint: deviceFingerprint,
      deviceData: deviceData,
    );

    await _storage.write(key: 'device_private_key', value: certificate['private_key']);
    await _storage.write(key: 'private_key', value: certificate['private_key']);
    await _storage.write(key: 'device_certificate', value: certificate['certificate']);
    await _storage.write(key: 'certificate', value: certificate['certificate']);
    await _storage.write(key: 'public_key', value: certificate['public_key']);
    await _storage.write(key: 'device_fingerprint', value: deviceFingerprint);
    await _storage.write(key: 'certificate_id', value: certificate['certificate_id'] ?? '');

    if (SupabaseService.isInitialized && userId.isNotEmpty) {
      try {
        final deviceStored = await _upsertDeviceRecord(
          deviceData: deviceData,
          certificate: certificate,
        );
        final signature = certificate['certificate'] != null
            ? (jsonDecode(certificate['certificate']!) as Map<String, dynamic>)['signature']?.toString() ?? ''
            : '';
        final certificateRecord = {
          'certificate_id': certificate['certificate_id'],
          'user_id': userId,
          'device_fingerprint_hash': deviceFingerprint,
          'certificate_data': certificate['certificate'],
          'public_key': certificate['public_key'],
          'signature': signature,
          'created_at': DateTime.now().toIso8601String(),
        };

        if (deviceStored) {
          await SupabaseService.client.from('certificates').insert(certificateRecord);
          debugPrint('✅ [LOCAL_KEYS] Certificate stored in database');
        } else {
          debugPrint('⚠️ [LOCAL_KEYS] Skipping certificate insert (device missing)');
        }
      } catch (e) {
        debugPrint('⚠️ [LOCAL_KEYS] Could not store certificate in database: $e');
      }
    }

    return {
      'private_key': certificate['private_key'] ?? '',
      'public_key': certificate['public_key'] ?? '',
      'device_fingerprint': deviceFingerprint,
      'certificate_id': certificate['certificate_id'] ?? '',
    };
  }

  static Future<bool> _upsertDeviceRecord({
    required Map<String, dynamic> deviceData,
    required Map<String, String> certificate,
  }) async {
    final fingerprint = deviceData['device_fingerprint_hash']?.toString() ?? '';
    if (fingerprint.isEmpty) {
      debugPrint('⚠️ [LOCAL_KEYS] Device fingerprint missing, cannot store device');
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
      debugPrint('✅ [LOCAL_KEYS] Device stored/updated');
      return true;
    } catch (e) {
      debugPrint('⚠️ [LOCAL_KEYS] Could not store device: $e');
      return false;
    }
  }
}
