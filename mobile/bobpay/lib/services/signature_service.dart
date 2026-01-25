import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';
import 'package:pointycastle/export.dart';

/// Digital Signature Service
/// Provides message integrity and non-repudiation
class SignatureService {
  /// Sign data with private key
  /// Returns: Base64 encoded signature
  static String signData({
    required String data,
    required String privateKeyEncoded,
  }) {
    try {
      final privateKey = _decodePrivateKey(privateKeyEncoded);
      
      // Create SecureRandom for ECDSASigner
      final secureRandom = _createSecureRandom();
      final signer = ECDSASigner(SHA256Digest(), null);
      // Use ParametersWithRandom to provide SecureRandom
      final params = ParametersWithRandom(PrivateKeyParameter(privateKey), secureRandom);
      signer.init(true, params);
      
      final dataBytes = utf8.encode(data);
      final signature = signer.generateSignature(dataBytes) as ECSignature;
      
      final r = signature.r.toRadixString(16).padLeft(64, '0');
      final s = signature.s.toRadixString(16).padLeft(64, '0');
      
      // Include timestamp and nonce for replay protection
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final nonce = _generateNonce();
      final signatureData = {
        'r': r,
        's': s,
        'timestamp': timestamp,
        'nonce': nonce,
      };
      
      return base64Encode(utf8.encode(jsonEncode(signatureData)));
    } catch (e) {
      throw Exception('Signing failed: $e');
    }
  }

  /// Verify signature
  static bool verifySignature({
    required String data,
    required String signatureEncoded,
    required String publicKeyEncoded,
  }) {
    try {
      final publicKey = _decodePublicKey(publicKeyEncoded);
      final signatureData = jsonDecode(utf8.decode(base64Decode(signatureEncoded))) as Map<String, dynamic>;
      
      final r = BigInt.parse(signatureData['r'] as String, radix: 16);
      final s = BigInt.parse(signatureData['s'] as String, radix: 16);
      final timestamp = signatureData['timestamp'] as int;
      
      // Check timestamp (prevent replay attacks - allow 5 minute window)
      final now = DateTime.now().millisecondsSinceEpoch;
      final timeDiff = (now - timestamp).abs();
      if (timeDiff > 300000) { // 5 minutes
        return false;
      }
      
      // Create SecureRandom for ECDSASigner
      final secureRandom = _createSecureRandom();
      final signer = ECDSASigner(SHA256Digest(), null);
      // Use ParametersWithRandom to provide SecureRandom
      final params = ParametersWithRandom(PublicKeyParameter(publicKey), secureRandom);
      signer.init(false, params);
      
      final dataBytes = utf8.encode(data);
      final signature = ECSignature(r, s);
      
      return signer.verifySignature(dataBytes, signature);
    } catch (e) {
      return false;
    }
  }

  /// Generate nonce for replay protection
  static String _generateNonce() {
    final random = _createSecureRandom();
    final nonce = Uint8List(16);
    final bytes = random.nextBytes(16);
    nonce.setRange(0, 16, bytes);
    return base64Encode(nonce);
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

  /// Decode private key
  static ECPrivateKey _decodePrivateKey(String encoded) {
    final dHex = utf8.decode(base64Decode(encoded));
    final d = BigInt.parse(dHex, radix: 16);
    final domainParams = ECCurve_secp256r1();
    return ECPrivateKey(d, domainParams);
  }

  /// Decode public key
  static ECPublicKey _decodePublicKey(String encoded) {
    final keyData = utf8.decode(base64Decode(encoded));
    final xHex = keyData.substring(0, 64);
    final yHex = keyData.substring(64, 128);
    
    final x = BigInt.parse(xHex, radix: 16);
    final y = BigInt.parse(yHex, radix: 16);
    
    final domainParams = ECCurve_secp256r1();
    final point = domainParams.curve.createPoint(x, y);
    
    return ECPublicKey(point, domainParams);
  }
}
