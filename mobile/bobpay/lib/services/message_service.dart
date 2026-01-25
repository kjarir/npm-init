import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:bobpay/services/supabase_client.dart';
import 'package:bobpay/services/local_key_service.dart';
import 'package:bobpay/services/user_certificate_service.dart';
import 'package:bobpay/services/secure_channel.dart';

/// Message Service
/// Handles sending and receiving messages
class MessageService {
  /// Send a text message
  /// Returns: {success, message, error}
  static Future<Map<String, dynamic>> sendMessage({
    required String conversationId,
    required String content,
    required String receiverId,
    String messageType = 'text',
  }) async {
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

      debugPrint('💬 [MESSAGE] Sending encrypted message to conversation: $conversationId');

      final myKeys = await LocalKeyService.getLocalKeys();
      if (myKeys['private_key']!.isEmpty || myKeys['device_fingerprint']!.isEmpty) {
        return {
          'success': false,
          'error': 'Missing local keys. Please re-register.',
        };
      }

      final receiverCert = await UserCertificateService.getUserCertificate(receiverId);
      if (receiverCert == null) {
        return {
          'success': false,
          'error': 'Receiver certificate not found. Ask them to re-register.',
        };
      }

      final channel = await SecureChannelService.getOrCreateChannel(
        myDeviceFingerprint: myKeys['device_fingerprint']!,
        theirDeviceFingerprint: receiverCert['device_fingerprint_hash'] as String,
        myPrivateKey: myKeys['private_key']!,
        theirPublicKey: receiverCert['public_key'] as String,
      );

      await SecureChannelService.sendEncryptedMessage(
        channelId: channel['channel_id'] as String,
        message: content,
        sharedSecret: channel['shared_secret'] as String,
        myPrivateKey: myKeys['private_key']!,
        myDeviceFingerprint: myKeys['device_fingerprint']!,
        theirDeviceFingerprint: receiverCert['device_fingerprint_hash'] as String,
        messageType: messageType,
      );

      // Update conversation's last_message_at
      await SupabaseService.client
          .from('conversations')
          .update({'last_message_at': DateTime.now().toIso8601String()})
          .eq('id', conversationId);

      debugPrint('✅ [MESSAGE] Encrypted message sent successfully');
      return {'success': true};
    } catch (e, stackTrace) {
      debugPrint('❌ [MESSAGE] ERROR: $e');
      debugPrint('❌ [MESSAGE] Stack trace: $stackTrace');
      return {
        'success': false,
        'error': 'Failed to send message: $e',
      };
    }
  }

  /// Send a media message (image, video, etc.)
  /// Returns: {success, message, error}
  static Future<Map<String, dynamic>> sendMediaMessage({
    required String conversationId,
    required String mediaUrl,
    required String mediaFilename,
    required String receiverId,
    int? mediaSize,
    int? mediaDuration,
    String? caption,
  }) async {
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

      debugPrint('💬 [MESSAGE] Sending encrypted media message to conversation: $conversationId');

      final payload = {
        'media_url': mediaUrl,
        'media_filename': mediaFilename,
        if (mediaSize != null) 'media_size': mediaSize,
        if (mediaDuration != null) 'media_duration': mediaDuration,
        'caption': caption ?? '',
      };

      final result = await sendMessage(
        conversationId: conversationId,
        content: jsonEncode(payload),
        receiverId: receiverId,
        messageType: 'media',
      );

      if (result['success'] != true) {
        return result;
      }

      // Update conversation's last_message_at
      await SupabaseService.client
          .from('conversations')
          .update({'last_message_at': DateTime.now().toIso8601String()})
          .eq('id', conversationId);

      debugPrint('✅ [MESSAGE] Media message sent successfully (encrypted)');
      return {
        'success': true,
      };
    } catch (e, stackTrace) {
      debugPrint('❌ [MESSAGE] ERROR: $e');
      debugPrint('❌ [MESSAGE] Stack trace: $stackTrace');
      return {
        'success': false,
        'error': 'Failed to send media message: $e',
      };
    }
  }

  /// Mark message as read
  static Future<void> markAsRead(String messageId) async {
    try {
      await SupabaseService.client
          .from('messages')
          .update({
            'read_at': DateTime.now().toIso8601String(),
          })
          .eq('id', messageId);
    } catch (e) {
      debugPrint('Error marking message as read: $e');
    }
  }

  /// Format timestamp for display
  static String formatTimestamp(String? timestamp) {
    if (timestamp == null) return '';
    try {
      final date = DateTime.parse(timestamp);
      final now = DateTime.now();
      final difference = now.difference(date);

      if (difference.inDays == 0) {
        // Today - show time
        final hour = date.hour;
        final minute = date.minute.toString().padLeft(2, '0');
        final period = hour >= 12 ? 'PM' : 'AM';
        final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
        return '$displayHour:$minute $period';
      } else if (difference.inDays == 1) {
        return 'YESTERDAY';
      } else if (difference.inDays < 7) {
        final days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
        return days[date.weekday - 1];
      } else {
        final months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        return '${months[date.month - 1]} ${date.day}';
      }
    } catch (e) {
      return timestamp;
    }
  }
}
