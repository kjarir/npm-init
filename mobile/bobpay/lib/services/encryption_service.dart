import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';
import 'package:pointycastle/export.dart';

/// AES-256-GCM Encryption Service
/// Provides military-grade encryption for secure communications
class EncryptionService {
  /// Encrypt data using AES-256-GCM
  /// Returns: {encrypted_data, nonce, tag}
  static Map<String, String> encrypt({
    required String data,
    required String key, // Base64 encoded 32-byte key
  }) {
    try {
      // Decode key
      final keyBytes = base64Decode(key);
      if (keyBytes.length != 32) {
        throw Exception('Key must be 32 bytes (256 bits)');
      }

      // Generate random nonce (12 bytes for GCM)
      final nonce = _generateNonce();
      
      // Create cipher
      final cipher = GCMBlockCipher(AESEngine());
      final params = AEADParameters(
        KeyParameter(keyBytes),
        128, // tag length in bits
        nonce,
        Uint8List(0), // additional authenticated data
      );
      cipher.init(true, params);

      // Encrypt
      final dataBytes = utf8.encode(data);
      final encrypted = cipher.process(dataBytes);

      // Extract tag (last 16 bytes)
      final tag = encrypted.sublist(encrypted.length - 16);
      final ciphertext = encrypted.sublist(0, encrypted.length - 16);

      return {
        'encrypted_data': base64Encode(ciphertext),
        'nonce': base64Encode(nonce),
        'tag': base64Encode(tag),
      };
    } catch (e) {
      throw Exception('Encryption failed: $e');
    }
  }

  /// Decrypt data using AES-256-GCM
  static String decrypt({
    required String encryptedData,
    required String nonce,
    required String tag,
    required String key,
  }) {
    try {
      // Decode inputs
      final keyBytes = base64Decode(key);
      final nonceBytes = base64Decode(nonce);
      final tagBytes = base64Decode(tag);
      final ciphertextBytes = base64Decode(encryptedData);

      // Combine ciphertext and tag
      final encrypted = Uint8List(ciphertextBytes.length + tagBytes.length);
      encrypted.setRange(0, ciphertextBytes.length, ciphertextBytes);
      encrypted.setRange(ciphertextBytes.length, encrypted.length, tagBytes);

      // Create cipher
      final cipher = GCMBlockCipher(AESEngine());
      final params = AEADParameters(
        KeyParameter(keyBytes),
        128,
        nonceBytes,
        Uint8List(0),
      );
      cipher.init(false, params);

      // Decrypt
      final decrypted = cipher.process(encrypted);
      return utf8.decode(decrypted);
    } catch (e) {
      throw Exception('Decryption failed: $e');
    }
  }

  /// Generate random nonce (12 bytes)
  static Uint8List _generateNonce() {
    final random = _createSecureRandom();
    final nonce = Uint8List(12);
    final bytes = random.nextBytes(12);
    nonce.setRange(0, 12, bytes);
    return nonce;
  }

  /// Create secure random number generator
  static SecureRandom _createSecureRandom() {
    // Use SecureRandomFactory for better compatibility
    final random = SecureRandom('Fortuna');
    final seedSource = Random.secure();
    // Seed with secure random bytes
    final seedBytes = Uint8List.fromList(List.generate(32, (i) => seedSource.nextInt(256)));
    // Seed with KeyParameter
    random.seed(KeyParameter(seedBytes));
    return random;
  }

  /// Generate random encryption key (32 bytes)
  static String generateKey() {
    final random = _createSecureRandom();
    final key = Uint8List(32);
    final bytes = random.nextBytes(32);
    key.setRange(0, 32, bytes);
    return base64Encode(key);
  }
}
