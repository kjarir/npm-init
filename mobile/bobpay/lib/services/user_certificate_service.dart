import 'package:flutter/foundation.dart';
import 'package:bobpay/services/supabase_client.dart';

/// User Certificate Service
/// Fetches public key + device fingerprint for a user (needed for secure channels)
class UserCertificateService {
  static Future<Map<String, dynamic>?> getUserCertificate(String userId) async {
    try {
      final response = await SupabaseService.client
          .from('certificates')
          .select('certificate_id, public_key, device_fingerprint_hash, created_at')
          .eq('user_id', userId)
          .order('created_at', ascending: false)
          .limit(1)
          .maybeSingle();

      if (response == null) return null;
      return Map<String, dynamic>.from(response);
    } catch (e) {
      final message = e.toString();
      if (_isMissingColumnError(message, 'user_id')) {
        debugPrint('⚠️ [CERT] Missing certificates.user_id. Trying fallback...');
        final fallback = await _getCertificateByProfile(userId);
        if (fallback != null) return fallback;
        debugPrint(
          '❌ [CERT] Cannot link certificate to user. '
          'Run supabase_certificates_user_id.sql and re-register.',
        );
        return null;
      }
      debugPrint('❌ [CERT] Error fetching user certificate: $e');
      return null;
    }
  }

  static bool _isMissingColumnError(String message, String column) {
    return message.contains('42703') &&
        message.toLowerCase().contains('column') &&
        message.toLowerCase().contains(column);
  }

  static Future<Map<String, dynamic>?> _getCertificateByProfile(String userId) async {
    // Try to read certificate_id or device fingerprint from profiles if present.
    Map<String, dynamic>? profile;
    try {
      profile = await SupabaseService.client
          .from('profiles')
          .select('certificate_id, device_fingerprint_hash, device_fingerprint')
          .eq('id', userId)
          .maybeSingle();
    } catch (e) {
      debugPrint('⚠️ [CERT] Profile fallback failed: $e');
      return null;
    }

    final certId = profile?['certificate_id']?.toString();
    if (certId != null && certId.isNotEmpty) {
      try {
        final response = await SupabaseService.client
            .from('certificates')
            .select('certificate_id, public_key, device_fingerprint_hash, created_at')
            .eq('certificate_id', certId)
            .order('created_at', ascending: false)
            .limit(1)
            .maybeSingle();
        if (response == null) return null;
        return Map<String, dynamic>.from(response);
      } catch (e) {
        debugPrint('⚠️ [CERT] certificate_id fallback failed: $e');
      }
    }

    final fingerprint = profile?['device_fingerprint_hash']?.toString() ??
        profile?['device_fingerprint']?.toString();
    if (fingerprint != null && fingerprint.isNotEmpty) {
      try {
        final response = await SupabaseService.client
            .from('certificates')
            .select('certificate_id, public_key, device_fingerprint_hash, created_at')
            .eq('device_fingerprint_hash', fingerprint)
            .order('created_at', ascending: false)
            .limit(1)
            .maybeSingle();
        if (response == null) return null;
        return Map<String, dynamic>.from(response);
      } catch (e) {
        debugPrint('⚠️ [CERT] device_fingerprint fallback failed: $e');
      }
    }
    return null;
  }
}
