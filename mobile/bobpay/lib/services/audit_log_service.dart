import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:bobpay/services/blockchain_service.dart';
import 'package:bobpay/services/ipfs_service.dart';
import 'package:bobpay/services/signature_service.dart';
import 'package:bobpay/services/supabase_client.dart';
import 'package:bobpay/services/comprehensive_device_id.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Immutable Audit Log Service
class AuditLogService {
  static const _storage = FlutterSecureStorage();

  /// Log action with full audit trail
  static Future<Map<String, dynamic>> logAction({
    required String actionType,
    required String target,
    required Map<String, dynamic> actionData,
    String? userId,
  }) async {
    try {
      // Get device fingerprint
      final deviceData = await ComprehensiveDeviceId.getAllDeviceData();
      final deviceFingerprint = deviceData['device_fingerprint_hash'] as String? ?? 'unknown';

      // Get user ID if not provided
      final currentUserId = userId ?? 
          SupabaseService.client.auth.currentUser?.id ?? 'unknown';

      // Get private key for signing
      final privateKey = await _storage.read(key: 'private_key');
      if (privateKey == null) {
        return {
          'success': false,
          'error': 'Private key not found',
        };
      }

      // Create action hash
      final actionDataJson = jsonEncode(actionData);
      final actionHash = sha256.convert(utf8.encode(actionDataJson)).toString();

      // Upload full action data to IPFS
      final ipfsData = {
        'action_type': actionType,
        'target': target,
        'action_data': actionData,
        'device_fingerprint': deviceFingerprint,
        'user_id': currentUserId,
        'timestamp': DateTime.now().toIso8601String(),
      };

      final ipfsResult = await IPFSService.uploadJSON(ipfsData);
      if (ipfsResult['success'] != true) {
        return {
          'success': false,
          'error': 'Failed to upload to IPFS',
        };
      }

      final ipfsHash = ipfsResult['ipfsHash'] as String;

      // Sign action hash
      final signature = SignatureService.signData(
        data: actionHash,
        privateKeyEncoded: privateKey,
      );

      final fingerprint = deviceFingerprint.isNotEmpty ? deviceFingerprint : 'unknown';
      // Create audit log entry (metadata only). device_fingerprint_hash required by DB.
      final logEntry = {
        'action_id': sha256.convert(utf8.encode('$actionType|$target|${DateTime.now().millisecondsSinceEpoch}')).toString(),
        'action_type': actionType,
        'actor_fingerprint': fingerprint,
        'device_fingerprint_hash': fingerprint,
        'user_id': currentUserId,
        'target': target,
        'action_hash': actionHash,
        'signature': signature,
        'ipfs_hash': ipfsHash,
        'timestamp': DateTime.now().toIso8601String(),
      };

      // Store metadata in Supabase
      try {
        await SupabaseService.client
            .from('audit_logs')
            .insert(logEntry);
      } catch (e) {
        debugPrint('⚠️ [AUDIT] Could not store in Supabase: $e');
      }

      // Anchor log hash to blockchain
      final logHash = sha256.convert(utf8.encode(jsonEncode(logEntry))).toString();
      await BlockchainService.anchorAuditLog(
        logHash: logHash,
        signature: signature,
      );

      debugPrint('✅ [AUDIT] Action logged: $actionType');

      return {
        'success': true,
        'logId': logEntry['action_id'],
        'ipfsHash': ipfsHash,
        'logHash': logHash,
      };
    } catch (e) {
      debugPrint('❌ [AUDIT] Error: $e');
      return {
        'success': false,
        'error': e.toString(),
      };
    }
  }

  /// Query audit trail
  static Future<List<Map<String, dynamic>>> queryAuditTrail({
    String? actorFingerprint,
    String? actionType,
    String? target,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      var query = SupabaseService.client
          .from('audit_logs')
          .select('*');

      if (actorFingerprint != null) {
        query = query.eq('actor_fingerprint', actorFingerprint);
      }
      if (actionType != null) {
        query = query.eq('action_type', actionType);
      }
      if (target != null) {
        query = query.eq('target', target);
      }
      if (startDate != null) {
        query = query.gte('timestamp', startDate.toIso8601String());
      }
      if (endDate != null) {
        query = query.lte('timestamp', endDate.toIso8601String());
      }

      final response = await query.order('timestamp', ascending: false);
      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      debugPrint('❌ [AUDIT] Query error: $e');
      return [];
    }
  }
}
