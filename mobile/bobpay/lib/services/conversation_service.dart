import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:bobpay/services/supabase_client.dart';
import 'package:bobpay/services/local_key_service.dart';
import 'package:bobpay/services/user_certificate_service.dart';
import 'package:bobpay/services/secure_channel.dart';

/// Conversation Service
/// Handles conversation and message data fetching
class ConversationService {
  /// Get all conversations for the current logged-in client
  /// Returns: {success, conversations, error}
  static Future<Map<String, dynamic>> getClientConversations() async {
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

      debugPrint('💬 [CONVERSATIONS] Fetching conversations for client: ${user.id}');

      // Fetch conversations where client_id matches current user
      final conversationsResponse = await SupabaseService.client
          .from('conversations')
          .select('''
            *,
            freelancer:profiles!conversations_freelancer_id_fkey(id, full_name, email, avatar_url),
            project:projects(id, title)
          ''')
          .eq('client_id', user.id)
          .order('last_message_at', ascending: false);

      debugPrint('✅ [CONVERSATIONS] Retrieved ${conversationsResponse.length} conversations');
      return {
        'success': true,
        'conversations': List<Map<String, dynamic>>.from(conversationsResponse),
      };
    } catch (e, stackTrace) {
      debugPrint('❌ [CONVERSATIONS] ERROR: $e');
      debugPrint('❌ [CONVERSATIONS] Stack trace: $stackTrace');
      return {
        'success': false,
        'error': 'Failed to fetch conversations: $e',
      };
    }
  }

  /// Get messages for a specific conversation
  /// Returns: {success, messages, error}
  static Future<Map<String, dynamic>> getConversationMessages({
    required String conversationId,
    required String otherUserId,
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

      debugPrint('💬 [MESSAGES] Fetching encrypted messages for conversation: $conversationId');

      final myKeys = await LocalKeyService.getLocalKeys();
      final otherCert = await UserCertificateService.getUserCertificate(otherUserId);
      if (myKeys['private_key']!.isEmpty || myKeys['device_fingerprint']!.isEmpty || otherCert == null) {
        return {
          'success': false,
          'error': 'Secure channel keys missing. Ask both users to re-register.',
        };
      }

      final channel = await SecureChannelService.getOrCreateChannel(
        myDeviceFingerprint: myKeys['device_fingerprint']!,
        theirDeviceFingerprint: otherCert['device_fingerprint_hash'] as String,
        myPrivateKey: myKeys['private_key']!,
        theirPublicKey: otherCert['public_key'] as String,
      );

      final encryptedRows = await SupabaseService.client
          .from('encrypted_messages')
          .select('*')
          .eq('channel_id', channel['channel_id'])
          .order('created_at', ascending: true);

      final messages = <Map<String, dynamic>>[];
      for (final row in encryptedRows) {
        try {
          final decrypted = SecureChannelService.decryptMessage(
            encryptedData: row['encrypted_data'] as String,
            nonce: row['nonce'] as String,
            tag: row['tag'] as String,
            signature: row['signature'] as String,
            sharedSecret: channel['shared_secret'] as String,
            theirPublicKey: otherCert['public_key'] as String,
            timestamp: row['timestamp'] as String,
          );

          final senderFingerprint = row['sender_fingerprint'] as String? ?? '';
          final isMine = senderFingerprint == myKeys['device_fingerprint'];

          final messageType = row['message_type'] ?? 'text';
          Map<String, dynamic> parsedMedia = {};
          if (messageType == 'media') {
            try {
              parsedMedia = jsonDecode(decrypted) as Map<String, dynamic>;
            } catch (_) {}
          }

          messages.add({
            'id': row['id'],
            'content': messageType == 'media' ? (parsedMedia['caption'] ?? '') : decrypted,
            'message_type': messageType,
            'created_at': row['created_at'],
            'sender_id': isMine ? user.id : otherUserId,
            'media_url': parsedMedia['media_url'],
            'media_filename': parsedMedia['media_filename'],
            'media_size': parsedMedia['media_size'],
            'media_duration': parsedMedia['media_duration'],
            'encrypted_data': row['encrypted_data'],
            'nonce': row['nonce'],
            'tag': row['tag'],
          });
        } catch (e) {
          debugPrint('⚠️ [MESSAGES] Failed to decrypt a message: $e');
        }
      }

      return {
        'success': true,
        'messages': messages,
      };
    } catch (e, stackTrace) {
      debugPrint('❌ [MESSAGES] ERROR: $e');
      debugPrint('❌ [MESSAGES] Stack trace: $stackTrace');
      return {
        'success': false,
        'error': 'Failed to fetch messages: $e',
      };
    }
  }
}
