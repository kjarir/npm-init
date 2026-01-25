import 'package:bobpay/services/supabase_client.dart';

/// Audit Log Service for tracking user actions for legal evidence
class AuditLogService {
  /// Log a user action with full context for legal evidence
  static Future<void> logAction({
    required String action,
    required String actionType,
    required String userId,
    String? deviceFingerprint,
    Map<String, dynamic>? details,
  }) async {
    try {
      if (!SupabaseService.isInitialized) {
        print('Supabase not initialized, skipping audit log');
        return;
      }

      final fingerprint = deviceFingerprint?.trim().isNotEmpty == true
          ? deviceFingerprint!.trim()
          : 'unknown';
      final auditEntry = {
        'user_id': userId,
        'device_fingerprint_hash': fingerprint,
        'actor_fingerprint': fingerprint,
        'action': action,
        'action_type': actionType,
        'details': details ?? {},
        'timestamp': DateTime.now().toIso8601String(),
        'created_at': DateTime.now().toIso8601String(),
      };

      await SupabaseService.client
          .from('audit_logs')
          .insert(auditEntry);

      print('Audit log created: $actionType - $action');
    } catch (e) {
      print('Error creating audit log: $e');
    }
  }

  /// Log user registration
  static Future<void> logRegistration({
    required String userId,
    String? deviceFingerprint,
    Map<String, dynamic>? registrationData,
  }) async {
    await logAction(
      action: 'User Registration',
      actionType: 'register',
      userId: userId,
      deviceFingerprint: deviceFingerprint,
      details: {
        'registration_data': registrationData,
      },
    );
  }

  /// Log user login
  static Future<void> logLogin({
    required String userId,
    String? deviceFingerprint,
    Map<String, dynamic>? loginData,
  }) async {
    await logAction(
      action: 'User Login',
      actionType: 'login',
      userId: userId,
      deviceFingerprint: deviceFingerprint,
      details: {
        'login_data': loginData,
      },
    );
  }
}
