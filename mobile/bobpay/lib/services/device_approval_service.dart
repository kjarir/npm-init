import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:bobpay/services/comprehensive_device_id.dart';
import 'package:bobpay/services/supabase_client.dart';

class DeviceApprovalService {
  static const Duration _challengeTtl = Duration(minutes: 10);
  static const int _codeMin = 10;
  static const int _codeMax = 99;

  static Future<Map<String, dynamic>> ensureDeviceTrusted({
    required String userId,
  }) async {
    try {
      final deviceData = await ComprehensiveDeviceId.getAllDeviceData();
      final fingerprint = deviceData['device_fingerprint_hash']?.toString() ?? '';
      if (fingerprint.isEmpty) {
        return {'success': false, 'error': 'Device fingerprint missing'};
      }

      final summary = _buildSummary(deviceData);

      final trusted = await _getTrustedDevice(userId, fingerprint);
      if (trusted != null) {
        await _touchTrustedDevice(trusted['id']?.toString());
        return {
          'success': true,
          'trusted': true,
          'device_fingerprint_hash': fingerprint,
        };
      }

      final anyTrusted = await _hasAnyTrustedDevices(userId);
      if (!anyTrusted) {
        await SupabaseService.client
            .from('trusted_devices')
            .insert({
              'user_id': userId,
              'device_fingerprint_hash': fingerprint,
              'device_summary': summary,
              'is_active': true,
              'last_seen_at': DateTime.now().toIso8601String(),
            });
        return {
          'success': true,
          'trusted': true,
          'device_fingerprint_hash': fingerprint,
          'note': 'First device auto-trusted',
        };
      }

      final existing = await _getPendingChallenge(userId, fingerprint);
      if (existing != null) {
        final refreshed = await _refreshChallengeCodeIfNeeded(existing);
        return {
          'success': true,
          'trusted': false,
          'challenge': refreshed ?? existing,
          'device_fingerprint_hash': fingerprint,
        };
      }

      final code = _generateCode();
      final expiresAt = DateTime.now().add(_challengeTtl).toIso8601String();
      final inserted = await SupabaseService.client
          .from('device_login_challenges')
          .insert({
            'user_id': userId,
            'new_device_fingerprint_hash': fingerprint,
            'new_device_summary': summary,
            'status': 'pending',
            'code': code,
            'expires_at': expiresAt,
          })
          .select()
          .single();

      return {
        'success': true,
        'trusted': false,
        'challenge': Map<String, dynamic>.from(inserted),
        'device_fingerprint_hash': fingerprint,
      };
    } catch (e) {
      debugPrint('❌ [DEVICE_APPROVAL] ensureDeviceTrusted failed: $e');
      return {
        'success': false,
        'error': 'Device approval failed: $e',
      };
    }
  }

  static Future<bool> isCurrentDeviceTrusted({required String userId}) async {
    try {
      final deviceData = await ComprehensiveDeviceId.getAllDeviceData();
      final fingerprint = deviceData['device_fingerprint_hash']?.toString() ?? '';
      if (fingerprint.isEmpty) return false;
      final trusted = await _getTrustedDevice(userId, fingerprint);
      if (trusted != null) {
        await _touchTrustedDevice(trusted['id']?.toString());
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  static Future<Map<String, dynamic>> approveChallenge({
    required String challengeId,
  }) async {
    try {
      final user = SupabaseService.client.auth.currentUser;
      if (user == null) {
        return {'success': false, 'error': 'No user logged in'};
      }

      final deviceData = await ComprehensiveDeviceId.getAllDeviceData();
      final approverFingerprint = deviceData['device_fingerprint_hash']?.toString() ?? '';

      final challenge = await SupabaseService.client
          .from('device_login_challenges')
          .select('*')
          .eq('id', challengeId)
          .maybeSingle();

      if (challenge == null) {
        return {'success': false, 'error': 'Challenge not found'};
      }

      final newFingerprint = challenge['new_device_fingerprint_hash']?.toString() ?? '';
      final summary = challenge['new_device_summary'];

      await SupabaseService.client
          .from('device_login_challenges')
          .update({
            'status': 'approved',
            'approved_at': DateTime.now().toIso8601String(),
            'approved_by_device_fingerprint_hash': approverFingerprint,
            'approved_by_user_id': user.id,
          })
          .eq('id', challengeId);

      if (newFingerprint.isNotEmpty) {
        await SupabaseService.client
            .from('trusted_devices')
            .upsert({
              'user_id': user.id,
              'device_fingerprint_hash': newFingerprint,
              'device_summary': summary,
              'is_active': true,
              'last_seen_at': DateTime.now().toIso8601String(),
            }, onConflict: 'user_id,device_fingerprint_hash');
      }

      return {'success': true};
    } catch (e) {
      debugPrint('❌ [DEVICE_APPROVAL] approve failed: $e');
      return {'success': false, 'error': 'Approve failed: $e'};
    }
  }

  static Future<Map<String, dynamic>> denyChallenge({
    required String challengeId,
  }) async {
    try {
      await SupabaseService.client
          .from('device_login_challenges')
          .update({
            'status': 'denied',
          })
          .eq('id', challengeId);
      return {'success': true};
    } catch (e) {
      debugPrint('❌ [DEVICE_APPROVAL] deny failed: $e');
      return {'success': false, 'error': 'Deny failed: $e'};
    }
  }

  static Future<Map<String, dynamic>> expireChallenge({
    required String challengeId,
  }) async {
    try {
      await SupabaseService.client
          .from('device_login_challenges')
          .update({
            'status': 'expired',
          })
          .eq('id', challengeId);
      return {'success': true};
    } catch (e) {
      debugPrint('❌ [DEVICE_APPROVAL] expire failed: $e');
      return {'success': false, 'error': 'Expire failed: $e'};
    }
  }

  static Stream<List<Map<String, dynamic>>> watchPendingChallenges({
    required String userId,
  }) {
    return SupabaseService.client
        .from('device_login_challenges')
        .stream(primaryKey: ['id'])
        .map((rows) => rows
            .map((row) => Map<String, dynamic>.from(row))
            .where((row) =>
                row['user_id']?.toString() == userId &&
                (row['status']?.toString() ?? '') == 'pending')
            .toList()
          ..sort((a, b) {
            final aTime = a['created_at']?.toString() ?? '';
            final bTime = b['created_at']?.toString() ?? '';
            return bTime.compareTo(aTime);
          }));
  }

  static Future<List<Map<String, dynamic>>> getPendingChallenges({
    required String userId,
  }) async {
    try {
      final response = await SupabaseService.client
          .from('device_login_challenges')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'pending')
          .order('created_at', ascending: false);
      return response.map<Map<String, dynamic>>((row) => Map<String, dynamic>.from(row)).toList();
    } catch (_) {
      return [];
    }
  }

  static Stream<List<Map<String, dynamic>>> watchChallengeById({
    required String challengeId,
  }) {
    return SupabaseService.client
        .from('device_login_challenges')
        .stream(primaryKey: ['id'])
        .map((rows) => rows
            .map((row) => Map<String, dynamic>.from(row))
            .where((row) => row['id']?.toString() == challengeId)
            .toList());
  }

  static Future<Map<String, dynamic>?> _getTrustedDevice(
    String userId,
    String fingerprint,
  ) async {
    try {
      final response = await SupabaseService.client
          .from('trusted_devices')
          .select('id, user_id, device_fingerprint_hash')
          .eq('user_id', userId)
          .eq('device_fingerprint_hash', fingerprint)
          .maybeSingle();
      if (response == null) return null;
      return Map<String, dynamic>.from(response);
    } catch (_) {
      return null;
    }
  }

  static Future<Map<String, dynamic>?> _getPendingChallenge(
    String userId,
    String fingerprint,
  ) async {
    try {
      final response = await SupabaseService.client
          .from('device_login_challenges')
          .select('*')
          .eq('user_id', userId)
          .eq('new_device_fingerprint_hash', fingerprint)
          .eq('status', 'pending')
          .order('created_at', ascending: false)
          .maybeSingle();
      if (response == null) return null;
      return Map<String, dynamic>.from(response);
    } catch (_) {
      return null;
    }
  }

  static Future<Map<String, dynamic>?> _refreshChallengeCodeIfNeeded(
    Map<String, dynamic> challenge,
  ) async {
    try {
      final id = challenge['id']?.toString();
      if (id == null || id.isEmpty) return challenge;
      final code = challenge['code']?.toString() ?? '';
      final expiresAt = challenge['expires_at']?.toString();
      final expiry = expiresAt != null ? DateTime.tryParse(expiresAt) : null;
      final isExpired = expiry != null && DateTime.now().isAfter(expiry);
      final needsRefresh = code.length != 2 || isExpired;
      if (!needsRefresh) return challenge;

      final newCode = _generateCode();
      final newExpiry = DateTime.now().add(_challengeTtl).toIso8601String();
      final updated = await SupabaseService.client
          .from('device_login_challenges')
          .update({
            'code': newCode,
            'status': 'pending',
            'expires_at': newExpiry,
          })
          .eq('id', id)
          .select()
          .single();
      return Map<String, dynamic>.from(updated);
    } catch (_) {
      return challenge;
    }
  }

  static Future<void> _touchTrustedDevice(String? id) async {
    if (id == null || id.isEmpty) return;
    try {
      await SupabaseService.client
          .from('trusted_devices')
          .update({'last_seen_at': DateTime.now().toIso8601String()})
          .eq('id', id);
    } catch (_) {}
  }

  static Future<bool> _hasAnyTrustedDevices(String userId) async {
    try {
      final response = await SupabaseService.client
          .from('trusted_devices')
          .select('id')
          .eq('user_id', userId)
          .limit(1);
      return response.isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  static Map<String, dynamic> _buildSummary(Map<String, dynamic> deviceData) {
    return {
      'platform': deviceData['platform'],
      'brand': deviceData['brand'],
      'manufacturer': deviceData['manufacturer'],
      'model': deviceData['model'],
      'os_version': deviceData['os_version'] ?? deviceData['system_version'],
      'ip': deviceData['public_ip_address'],
    };
  }

  static String _generateCode() {
    final rand = Random.secure();
    final code = _codeMin + rand.nextInt(_codeMax - _codeMin + 1);
    return code.toString();
  }
}
