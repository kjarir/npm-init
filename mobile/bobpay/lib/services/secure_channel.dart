import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:bobpay/services/key_exchange.dart';
import 'package:bobpay/services/encryption_service.dart';
import 'package:bobpay/services/signature_service.dart';
import 'package:bobpay/services/supabase_client.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Secure Channel Service
/// Establishes encrypted communication channels between users
class SecureChannelService {
  static const _storage = FlutterSecureStorage();
  /// Establish secure channel with another user
  /// Returns: {channel_id, shared_secret, established_at}
  static Future<Map<String, dynamic>> establishChannel({
    required String myDeviceFingerprint,
    required String theirDeviceFingerprint,
    required String myPrivateKey, // From certificate
    required String theirPublicKey, // From their certificate
  }) async {
    try {
      // Derive shared secret using ECDH
      final sharedSecret = KeyExchangeService.deriveSharedSecret(
        myPrivateKeyEncoded: myPrivateKey,
        theirPublicKeyEncoded: theirPublicKey,
      );

      // Generate channel ID
      final channelId = _generateChannelId(myDeviceFingerprint, theirDeviceFingerprint);

      // Store channel in Supabase
      final channelData = {
        'channel_id': channelId,
        'device_fingerprint_1': myDeviceFingerprint,
        'device_fingerprint_2': theirDeviceFingerprint,
        'established_at': DateTime.now().toIso8601String(),
        'status': 'active',
      };

      await SupabaseService.client
          .from('secure_channels')
          .insert(channelData);

      return {
        'channel_id': channelId,
        'shared_secret': sharedSecret,
        'established_at': channelData['established_at'],
      };
    } catch (e) {
      throw Exception('Failed to establish secure channel: $e');
    }
  }

  /// Get or create a secure channel between two devices (deterministic channel ID)
  static Future<Map<String, dynamic>> getOrCreateChannel({
    required String myDeviceFingerprint,
    required String theirDeviceFingerprint,
    required String myPrivateKey,
    required String theirPublicKey,
  }) async {
    final channelId = _generateChannelId(myDeviceFingerprint, theirDeviceFingerprint);
    final sharedSecret = KeyExchangeService.deriveSharedSecret(
      myPrivateKeyEncoded: myPrivateKey,
      theirPublicKeyEncoded: theirPublicKey,
    );

    // Check existing channel
    final existing = await SupabaseService.client
        .from('secure_channels')
        .select('id, channel_id, status')
        .eq('channel_id', channelId)
        .maybeSingle();

    if (existing == null) {
      await SupabaseService.client.from('secure_channels').insert({
        'channel_id': channelId,
        'device_fingerprint_1': myDeviceFingerprint,
        'device_fingerprint_2': theirDeviceFingerprint,
        'established_at': DateTime.now().toIso8601String(),
        'status': 'active',
      });
    }

    // Cache shared secret locally
    await _storage.write(key: 'secure_channel_$channelId', value: sharedSecret);

    return {
      'channel_id': channelId,
      'shared_secret': sharedSecret,
    };
  }

  /// Send encrypted message through secure channel
  static Future<Map<String, String>> sendEncryptedMessage({
    required String channelId,
    required String message,
    required String sharedSecret,
    required String myPrivateKey,
    required String myDeviceFingerprint,
    required String theirDeviceFingerprint,
    String messageType = 'text',
  }) async {
    try {
      // Encrypt message
      final encrypted = EncryptionService.encrypt(
        data: message,
        key: sharedSecret,
      );
      final encryptedData = encrypted['encrypted_data'] ?? '';
      final nonce = encrypted['nonce'] ?? '';
      final tag = encrypted['tag'] ?? '';
      debugPrint(
        '🔐 [SECURE_CHANNEL] Encrypted payload '
        'data=${_preview(encryptedData)}, nonce=${_preview(nonce)}, tag=${_preview(tag)}',
      );

      // Sign encrypted message
      final messageToSign = jsonEncode({
        'encrypted_data': encryptedData,
        'nonce': nonce,
        'timestamp': DateTime.now().toIso8601String(),
      });

      final signature = SignatureService.signData(
        data: messageToSign,
        privateKeyEncoded: myPrivateKey,
      );

      final messageData = {
        'channel_id': channelId,
        'encrypted_data': encryptedData,
        'nonce': nonce,
        'tag': tag,
        'signature': signature,
        'timestamp': DateTime.now().toIso8601String(),
        'sender_fingerprint': myDeviceFingerprint,
        'receiver_fingerprint': theirDeviceFingerprint,
        'message_type': messageType,
        'created_at': DateTime.now().toIso8601String(),
      };

      await SupabaseService.client.from('encrypted_messages').insert(messageData);

      return {
        'message_id': messageData['created_at'] as String,
        'encrypted_data': encryptedData,
        'nonce': nonce,
        'tag': tag,
        'signature': signature,
      };
    } catch (e) {
      throw Exception('Failed to send encrypted message: $e');
    }
  }

  /// Decrypt message payload
  static String decryptMessage({
    required String encryptedData,
    required String nonce,
    required String tag,
    required String signature,
    required String sharedSecret,
    required String theirPublicKey,
    required String timestamp,
  }) {
    final messageToVerify = jsonEncode({
      'encrypted_data': encryptedData,
      'nonce': nonce,
      'timestamp': timestamp,
    });

    final isValid = SignatureService.verifySignature(
      data: messageToVerify,
      signatureEncoded: signature,
      publicKeyEncoded: theirPublicKey,
    );
    if (!isValid) {
      throw Exception('Invalid signature');
    }

    return EncryptionService.decrypt(
      encryptedData: encryptedData,
      nonce: nonce,
      tag: tag,
      key: sharedSecret,
    );
  }

  /// Generate unique channel ID
  static String _generateChannelId(String fingerprint1, String fingerprint2) {
    // Sort fingerprints to ensure consistent channel ID regardless of order
    final sorted = [fingerprint1, fingerprint2]..sort();
    final combined = '${sorted[0]}|${sorted[1]}';
    final bytes = utf8.encode(combined);
    final hash = sha256.convert(bytes);
    return hash.toString().substring(0, 32);
  }

  static String _preview(String value) {
    if (value.isEmpty) return '';
    return value.length > 48 ? '${value.substring(0, 48)}...' : value;
  }
}
