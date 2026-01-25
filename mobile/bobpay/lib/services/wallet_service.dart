import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:bobpay/services/supabase_client.dart';

/// Wallet Service
/// Handles wallet data fetching for the current user
class WalletService {
  /// Get wallet data for the current logged-in user
  /// Returns: {success, wallet, error}
  static Future<Map<String, dynamic>> getCurrentUserWallet() async {
    try {
      if (!SupabaseService.isInitialized) {
        return {
          'success': false,
          'error': 'Supabase not initialized',
        };
      }

      // Get current user
      final user = SupabaseService.client.auth.currentUser;
      if (user == null) {
        return {
          'success': false,
          'error': 'No user logged in',
        };
      }

      debugPrint('💰 [WALLET] Fetching wallet for user: ${user.id}');

      // Fetch wallet data from wallets table
      final walletResponse = await SupabaseService.client
          .from('wallets')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

      if (walletResponse == null) {
        debugPrint('⚠️ [WALLET] No wallet found for user. Creating default wallet...');
        
        final profileReady = await _ensureProfile(user);
        if (!profileReady) {
          return {
            'success': false,
            'error': 'Profile missing. Run CREATE_PROFILE_TRIGGER.sql or allow profile inserts, then re-login.',
          };
        }
        
        // Create a default wallet if it doesn't exist
        final newWallet = {
          'user_id': user.id,
          'total_balance': 0.00,
          'available_balance': 0.00,
          'locked_balance': 0.00,
          'pending_release': 0.00,
        };

        try {
          final createdWallet = await SupabaseService.client
              .from('wallets')
              .insert(newWallet)
              .select()
              .single();

          debugPrint('✅ [WALLET] Default wallet created');
          return {
            'success': true,
            'wallet': Map<String, dynamic>.from(createdWallet),
          };
        } catch (e) {
          debugPrint('❌ [WALLET] Error creating wallet: $e');
          return {
            'success': false,
            'error': 'Failed to create wallet: $e',
          };
        }
      }

      debugPrint('✅ [WALLET] Wallet retrieved successfully');
      return {
        'success': true,
        'wallet': Map<String, dynamic>.from(walletResponse),
      };
    } catch (e, stackTrace) {
      debugPrint('❌ [WALLET] ERROR: $e');
      debugPrint('❌ [WALLET] Stack trace: $stackTrace');
      return {
        'success': false,
        'error': 'Failed to fetch wallet: $e',
      };
    }
  }

  static Future<bool> _ensureProfile(User user) async {
    try {
      final existing = await SupabaseService.client
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();
      if (existing != null) return true;

      final fullName = user.userMetadata?['full_name']?.toString() ??
          user.email?.split('@').first ??
          'User';
      final role = user.userMetadata?['role']?.toString() ?? 'client';

      final profileRecord = {
        'id': user.id,
        'email': user.email ?? '',
        'full_name': fullName,
        'role': role,
        'reputation': 50,
      };

      await SupabaseService.client
          .from('profiles')
          .insert(profileRecord);
      debugPrint('✅ [WALLET] Profile created for wallet');
      return true;
    } catch (e) {
      debugPrint('⚠️ [WALLET] Could not create profile: $e');
      return false;
    }
  }

  /// Format currency value
  static String formatCurrency(dynamic value) {
    if (value == null) return '\$0.00';
    
    // Handle both String and numeric types
    double amount;
    if (value is String) {
      amount = double.tryParse(value) ?? 0.0;
    } else if (value is num) {
      amount = value.toDouble();
    } else {
      amount = 0.0;
    }

    // Format with commas and 2 decimal places
    return '\$${amount.toStringAsFixed(2).replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]},',
    )}';
  }
}
