import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:pointycastle/export.dart';

/// ECDH (Elliptic Curve Diffie-Hellman) Key Exchange Service
/// Enables secure key exchange between two parties
class KeyExchangeService {
  /// Generate ECDH key pair for key exchange
  static Map<String, String> generateKeyPair() {
    final keyParams = ECKeyGeneratorParameters(ECCurve_secp256r1());
    final secureRandom = _createSecureRandom();
    final params = ParametersWithRandom(keyParams, secureRandom);
    final generator = ECKeyGenerator();
    generator.init(params);

    final keyPair = generator.generateKeyPair();
    final privateKey = keyPair.privateKey as ECPrivateKey;
    final publicKey = keyPair.publicKey as ECPublicKey;

    return {
      'private_key': _encodePrivateKey(privateKey),
      'public_key': _encodePublicKey(publicKey),
    };
  }

  /// Derive shared secret using ECDH
  /// Returns: Shared secret key (32 bytes, base64 encoded)
  static String deriveSharedSecret({
    required String myPrivateKeyEncoded,
    required String theirPublicKeyEncoded,
  }) {
    try {
      // Decode keys
      final myPrivateKey = _decodePrivateKey(myPrivateKeyEncoded);
      final theirPublicKey = _decodePublicKey(theirPublicKeyEncoded);

      // Perform ECDH key agreement
      // Note: ECDHBasicAgreement API compatibility - using dynamic cast to handle version differences
      final agreement = ECDHBasicAgreement();
      // Cast to handle PointyCastle API variations
      final privateKeyParam = PrivateKeyParameter(myPrivateKey) as dynamic;
      final publicKeyParam = PublicKeyParameter(theirPublicKey) as dynamic;
      agreement.init(privateKeyParam);
      final sharedSecretBigInt = agreement.calculateAgreement(publicKeyParam);

      // Convert to bytes and derive 32-byte key using SHA-256
      final secretBytes = sharedSecretBigInt.toRadixString(16).padLeft(64, '0');
      final hash = sha256.convert(utf8.encode(secretBytes));
      
      return base64Encode(hash.bytes);
    } catch (e) {
      throw Exception('Key exchange failed: $e');
    }
  }

  /// Encode public key
  static String _encodePublicKey(ECPublicKey publicKey) {
    final point = publicKey.Q!;
    final x = point.x!.toBigInteger()!.toRadixString(16).padLeft(64, '0');
    final y = point.y!.toBigInteger()!.toRadixString(16).padLeft(64, '0');
    return base64Encode(utf8.encode('$x$y'));
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

  /// Encode private key
  static String _encodePrivateKey(ECPrivateKey privateKey) {
    final d = privateKey.d!.toRadixString(16).padLeft(64, '0');
    return base64Encode(utf8.encode(d));
  }

  /// Decode private key
  static ECPrivateKey _decodePrivateKey(String encoded) {
    final dHex = utf8.decode(base64Decode(encoded));
    final d = BigInt.parse(dHex, radix: 16);
    
    final domainParams = ECCurve_secp256r1();
    return ECPrivateKey(d, domainParams);
  }
}
