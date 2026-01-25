import 'package:flutter/foundation.dart';
import 'package:bobpay/services/supabase_client.dart';

/// Dispute Service
/// Handles dispute-related data fetching
class DisputeService {
  /// Get all disputes for the current logged-in user
  /// Returns: {success, disputes, error}
  static Future<Map<String, dynamic>> getUserDisputes() async {
    try {
      if (!SupabaseService.isInitialized) {
        return {
          'success': false,
          'error': 'Supabase not initialized',
        };
      }

      final user = SupabaseService.client.auth.currentUser;
      if (user == null) {
        return {
          'success': false,
          'error': 'No user logged in',
        };
      }

      debugPrint('⚖️ [DISPUTES] Fetching disputes for user: ${user.id}');

      // Fetch disputes where raised_by matches current user
      final disputesResponse = await SupabaseService.client
          .from('disputes')
          .select('''
            *,
            project:projects(id, title, client_id, freelancer_id),
            against_user:profiles!disputes_against_fkey(id, full_name, email, avatar_url)
          ''')
          .eq('raised_by', user.id)
          .order('created_at', ascending: false);

      debugPrint('✅ [DISPUTES] Retrieved ${disputesResponse.length} disputes');
      return {
        'success': true,
        'disputes': List<Map<String, dynamic>>.from(disputesResponse),
      };
    } catch (e, stackTrace) {
      debugPrint('❌ [DISPUTES] ERROR: $e');
      debugPrint('❌ [DISPUTES] Stack trace: $stackTrace');
      return {
        'success': false,
        'error': 'Failed to fetch disputes: $e',
      };
    }
  }
}
