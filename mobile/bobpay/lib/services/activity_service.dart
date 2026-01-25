import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:bobpay/services/supabase_client.dart';
import 'package:bobpay/services/wallet_service.dart';

/// Activity Service
/// Handles activity log and transaction data
class ActivityService {
  /// Get recent activity log entries for current user
  /// Returns: {success, activities, error}
  static Future<Map<String, dynamic>> getRecentActivities({int limit = 10}) async {
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

      debugPrint('📋 [ACTIVITY] Fetching activities for user: ${user.id}');

      final activitiesResponse = await SupabaseService.client
          .from('activity_log')
          .select('''
            *,
            project:projects(id, title)
          ''')
          .eq('user_id', user.id)
          .order('created_at', ascending: false)
          .limit(limit);

      debugPrint('✅ [ACTIVITY] Retrieved ${activitiesResponse.length} activities');
      return {
        'success': true,
        'activities': List<Map<String, dynamic>>.from(activitiesResponse),
      };
    } catch (e, stackTrace) {
      debugPrint('❌ [ACTIVITY] ERROR: $e');
      debugPrint('❌ [ACTIVITY] Stack trace: $stackTrace');
      return {
        'success': false,
        'error': 'Failed to fetch activities: $e',
      };
    }
  }

  /// Get recent transactions for current user's wallet
  /// Returns: {success, transactions, error}
  static Future<Map<String, dynamic>> getRecentTransactions({int limit = 10}) async {
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

      // First get wallet ID
      final walletResult = await WalletService.getCurrentUserWallet();
      if (walletResult['success'] != true || walletResult['wallet'] == null) {
        return {
          'success': false,
          'error': 'Wallet not found',
        };
      }

      final walletId = walletResult['wallet']['id'] as String;

      debugPrint('💰 [TRANSACTIONS] Fetching transactions for wallet: $walletId');

      final transactionsResponse = await SupabaseService.client
          .from('transactions')
          .select('''
            *,
            project:projects(id, title),
            milestone:milestones(id, title)
          ''')
          .eq('wallet_id', walletId)
          .order('created_at', ascending: false)
          .limit(limit);

      debugPrint('✅ [TRANSACTIONS] Retrieved ${transactionsResponse.length} transactions');
      return {
        'success': true,
        'transactions': List<Map<String, dynamic>>.from(transactionsResponse),
      };
    } catch (e, stackTrace) {
      debugPrint('❌ [TRANSACTIONS] ERROR: $e');
      debugPrint('❌ [TRANSACTIONS] Stack trace: $stackTrace');
      return {
        'success': false,
        'error': 'Failed to fetch transactions: $e',
      };
    }
  }

  /// Format activity for display
  static Map<String, dynamic> formatActivityForDisplay(Map<String, dynamic> activity) {
    final actionType = activity['action_type'] as String? ?? '';
    final title = activity['title'] as String? ?? '';
    final description = activity['description'] as String? ?? '';
    final amount = activity['amount'];
    final createdAt = activity['created_at'] as String?;
    final project = activity['project'] as Map<String, dynamic>?;

    // Map action types to display info
    IconData icon;
    String displayTitle;
    String subtitle;
    String amountStr = '';
    Color badgeColor;

    switch (actionType.toLowerCase()) {
      case 'payment':
      case 'deposit':
        icon = Icons.arrow_downward;
        displayTitle = title.isNotEmpty ? title : 'PAYMENT';
        subtitle = project != null 
            ? '${project['title']} · ${_formatDate(createdAt)}'
            : description.isNotEmpty ? description : 'Deposit · ${_formatDate(createdAt)}';
        amountStr = amount != null ? '+${WalletService.formatCurrency(amount)}' : '';
        badgeColor = const Color(0xFF7EDC8C); // green
        break;
      case 'withdrawal':
        icon = Icons.account_balance;
        displayTitle = 'WITHDRAWAL';
        subtitle = description.isNotEmpty ? description : 'Bank Transfer · ${_formatDate(createdAt)}';
        amountStr = amount != null ? '-${WalletService.formatCurrency(amount)}' : '';
        badgeColor = const Color(0xFF24395D); // navy
        break;
      case 'escrow_release':
      case 'milestone_release':
        icon = Icons.verified;
        displayTitle = 'ESCROW RELEASE';
        subtitle = project != null 
            ? '${project['title']} · ${_formatDate(createdAt)}'
            : description.isNotEmpty ? description : 'Milestone Release · ${_formatDate(createdAt)}';
        amountStr = amount != null ? '+${WalletService.formatCurrency(amount)}' : '';
        badgeColor = const Color(0xFF7EDC8C); // green
        break;
      default:
        icon = Icons.info;
        displayTitle = title.isNotEmpty ? title.toUpperCase() : actionType.toUpperCase();
        subtitle = description.isNotEmpty ? description : _formatDate(createdAt) ?? '';
        amountStr = amount != null ? WalletService.formatCurrency(amount) : '';
        badgeColor = const Color(0xFF24395D); // navy
    }

    return {
      'icon': icon,
      'title': displayTitle,
      'subtitle': subtitle,
      'amount': amountStr,
      'badge': _getBadgeText(actionType),
      'badgeColor': badgeColor,
    };
  }

  static String _getBadgeText(String actionType) {
    switch (actionType.toLowerCase()) {
      case 'payment':
      case 'deposit':
        return 'CLEAR';
      case 'withdrawal':
        return 'SENT';
      case 'escrow_release':
      case 'milestone_release':
        return 'SUCCESS';
      default:
        return 'COMPLETE';
    }
  }

  static String? _formatDate(String? dateStr) {
    if (dateStr == null) return null;
    try {
      final date = DateTime.parse(dateStr);
      final now = DateTime.now();
      final difference = now.difference(date);

      if (difference.inDays == 0) {
        return 'Today';
      } else if (difference.inDays == 1) {
        return 'Yesterday';
      } else if (difference.inDays < 7) {
        return '${difference.inDays} days ago';
      } else {
        final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return '${months[date.month - 1]} ${date.day}';
      }
    } catch (e) {
      return dateStr;
    }
  }
}
