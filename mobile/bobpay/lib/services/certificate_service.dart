import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:crypto/crypto.dart';
import 'package:pointycastle/export.dart';

/// Device Authentication Certificate (DAC) Service
/// Generates cryptographic certificates ONE TIME on registration
/// Certificates are IMMUTABLE - never updated
class CertificateService {
  /// Generate a new Device Authentication Certificate
  /// Returns: {privateKey, publicKey, certificate}
  static Map<String, String> generateCertificate({
    required String deviceFingerprint,
    required Map<String, dynamic> deviceData,
  }) {
    try {
      debugPrint('🔐 [DAC] Starting certificate generation...');
      debugPrint('🔐 [DAC] Device Fingerprint: $deviceFingerprint');
      
      // Generate ECDSA key pair (Elliptic Curve Digital Signature Algorithm)
      debugPrint('🔐 [DAC] Creating secure random generator...');
      final secureRandom = _createSecureRandom();
      debugPrint('🔐 [DAC] Secure random generator created successfully');
      
      debugPrint('🔐 [DAC] Initializing EC key generator...');
      final keyParams = ECKeyGeneratorParameters(ECCurve_secp256r1());
      final params = ParametersWithRandom(keyParams, secureRandom);
      final generator = ECKeyGenerator();
      generator.init(params);
      debugPrint('🔐 [DAC] EC key generator initialized');

      debugPrint('🔐 [DAC] Generating key pair...');
      final keyPair = generator.generateKeyPair();
      final privateKey = keyPair.privateKey as ECPrivateKey;
      final publicKey = keyPair.publicKey as ECPublicKey;
      debugPrint('🔐 [DAC] Key pair generated successfully');

      // Create certificate data
      debugPrint('🔐 [DAC] Encoding public key...');
      final publicKeyEncoded = _encodePublicKey(publicKey);
      debugPrint('🔐 [DAC] Public key encoded: ${publicKeyEncoded.substring(0, 20)}...');
      
      final certificateData = {
        'device_fingerprint': deviceFingerprint,
        'device_data': deviceData,
        'created_at': DateTime.now().toIso8601String(),
        'public_key': publicKeyEncoded,
        'algorithm': 'ECDSA-P256',
        'version': '1.0',
      };

      // Sign certificate with private key
      debugPrint('🔐 [DAC] Signing certificate...');
      final certificateJson = jsonEncode(certificateData);
      final signature = _signData(certificateJson, privateKey);
      debugPrint('🔐 [DAC] Certificate signed successfully');

      // Create final certificate
      final certificateId = _generateCertificateId(deviceFingerprint);
      final certificate = {
        'certificate_data': certificateData,
        'signature': signature,
        'certificate_id': certificateId,
      };

      // Encode private key (to be stored securely on device only)
      debugPrint('🔐 [DAC] Encoding private key...');
      final privateKeyEncoded = _encodePrivateKey(privateKey);
      debugPrint('🔐 [DAC] Private key encoded: ${privateKeyEncoded.substring(0, 20)}...');

      debugPrint('🔐 [DAC] ✅ Certificate generation completed successfully!');
      debugPrint('🔐 [DAC] Certificate ID: $certificateId');
      debugPrint('🔐 [DAC] Public Key (first 50 chars): ${publicKeyEncoded.substring(0, 50)}...');
      debugPrint('🔐 [DAC] Private Key (first 50 chars): ${privateKeyEncoded.substring(0, 50)}...');

      return {
        'certificate': jsonEncode(certificate),
        'private_key': privateKeyEncoded,
        'public_key': publicKeyEncoded,
        'certificate_id': certificateId,
      };
    } catch (e, stackTrace) {
      debugPrint('❌ [DAC] ERROR in certificate generation: $e');
      debugPrint('❌ [DAC] Stack trace: $stackTrace');
      rethrow;
    }
  }

  /// Verify certificate signature
  static bool verifyCertificate(String certificateJson, String publicKeyEncoded) {
    try {
      final certificate = jsonDecode(certificateJson) as Map<String, dynamic>;
      final certificateData = certificate['certificate_data'] as Map<String, dynamic>;
      final signature = certificate['signature'] as String;

      // Recreate certificate data JSON
      final dataToVerify = jsonEncode(certificateData);

      // Decode public key
      final publicKey = _decodePublicKey(publicKeyEncoded);

      // Verify signature
      return _verifySignature(dataToVerify, signature, publicKey);
    } catch (e) {
      return false;
    }
  }

  /// Generate unique certificate ID
  static String _generateCertificateId(String deviceFingerprint) {
    final timestamp = DateTime.now().millisecondsSinceEpoch.toString();
    final random = Random().nextInt(999999).toString();
    final combined = '$deviceFingerprint|$timestamp|$random';
    final bytes = utf8.encode(combined);
    final digest = sha256.convert(bytes);
    return digest.toString().substring(0, 32); // First 32 chars
  }

  /// Create secure random number generator
  static SecureRandom _createSecureRandom() {
    try {
      debugPrint('🔐 [DAC] Creating SecureRandom with Fortuna algorithm...');
      
      // Try Fortuna first
      try {
        final random = SecureRandom('Fortuna');
        final seedSource = Random.secure();
        final seedBytes = Uint8List.fromList(List.generate(32, (i) => seedSource.nextInt(256)));
        random.seed(KeyParameter(seedBytes));
        debugPrint('🔐 [DAC] Fortuna SecureRandom created successfully');
        return random;
      } catch (e) {
        debugPrint('⚠️ [DAC] Fortuna failed: $e');
        debugPrint('⚠️ [DAC] Error details: ${e.toString()}');
        
        // Fallback: Try with different seed method
        try {
          debugPrint('🔐 [DAC] Trying alternative Fortuna initialization...');
          final random = SecureRandom('Fortuna');
          // Try seeding with just secure random bytes directly
          final seedSource = Random.secure();
          final seedBytes = Uint8List.fromList(List.generate(32, (i) => seedSource.nextInt(256)));
          // Try different seed approaches
          try {
            random.seed(KeyParameter(seedBytes));
          } catch (seedError) {
            debugPrint('⚠️ [DAC] KeyParameter seed failed: $seedError');
            // Try alternative seeding if available
            throw seedError;
          }
          debugPrint('🔐 [DAC] Alternative Fortuna initialization successful');
          return random;
        } catch (e2) {
          debugPrint('❌ [DAC] All SecureRandom initialization methods failed');
          debugPrint('❌ [DAC] Last error: $e2');
          throw Exception('Failed to create SecureRandom: $e2. Original error: $e');
        }
      }
    } catch (e, stackTrace) {
      debugPrint('❌ [DAC] CRITICAL ERROR creating SecureRandom: $e');
      debugPrint('❌ [DAC] Error type: ${e.runtimeType}');
      debugPrint('❌ [DAC] Stack trace: $stackTrace');
      rethrow;
    }
  }

  /// Encode public key to base64
  static String _encodePublicKey(ECPublicKey publicKey) {
    final point = publicKey.Q!;
    final x = point.x!.toBigInteger()!.toRadixString(16).padLeft(64, '0');
    final y = point.y!.toBigInteger()!.toRadixString(16).padLeft(64, '0');
    final keyData = '$x$y';
    return base64Encode(utf8.encode(keyData));
  }

  /// Decode public key from base64
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

  /// Encode private key to base64
  static String _encodePrivateKey(ECPrivateKey privateKey) {
    final d = privateKey.d!.toRadixString(16).padLeft(64, '0');
    return base64Encode(utf8.encode(d));
  }

  /// Sign data with private key
  static String _signData(String data, ECPrivateKey privateKey) {
    try {
      debugPrint('🔐 [DAC] Initializing ECDSA signer...');
      // ECDSASigner constructor: (Digest digest, Mac? mac)
      // The SecureRandom is created internally, we just need to pass null for Mac
      // But we need to provide SecureRandom via ParametersWithRandom
      final secureRandom = _createSecureRandom();
      final signer = ECDSASigner(SHA256Digest(), null);
      // Use ParametersWithRandom to provide SecureRandom
      final params = ParametersWithRandom(PrivateKeyParameter(privateKey), secureRandom);
      signer.init(true, params);
      debugPrint('🔐 [DAC] ECDSA signer initialized');
      
      debugPrint('🔐 [DAC] Generating signature...');
      final dataBytes = utf8.encode(data);
      final signature = signer.generateSignature(dataBytes) as ECSignature;
      debugPrint('🔐 [DAC] Signature generated');
      
      final r = signature.r.toRadixString(16).padLeft(64, '0');
      final s = signature.s.toRadixString(16).padLeft(64, '0');
      
      // Include timestamp for replay protection
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final signatureData = {
        'r': r,
        's': s,
        'timestamp': timestamp,
      };
      
      final signatureEncoded = base64Encode(utf8.encode(jsonEncode(signatureData)));
      debugPrint('🔐 [DAC] Signature encoded: ${signatureEncoded.substring(0, 30)}...');
      return signatureEncoded;
    } catch (e, stackTrace) {
      debugPrint('❌ [DAC] ERROR signing data: $e');
      debugPrint('❌ [DAC] Stack trace: $stackTrace');
      rethrow;
    }
  }

  /// Verify signature with public key
  static bool _verifySignature(String data, String signatureEncoded, ECPublicKey publicKey) {
    try {
      // For verification, we don't need SecureRandom, but ECDSASigner still requires it
      final secureRandom = _createSecureRandom();
      final signer = ECDSASigner(SHA256Digest(), null);
      // Use ParametersWithRandom to provide SecureRandom even for verification
      final params = ParametersWithRandom(PublicKeyParameter(publicKey), secureRandom);
      signer.init(false, params);
      
      final signatureJson = jsonDecode(utf8.decode(base64Decode(signatureEncoded))) as Map<String, dynamic>;
      final r = BigInt.parse(signatureJson['r'] as String, radix: 16);
      final s = BigInt.parse(signatureJson['s'] as String, radix: 16);
      final timestamp = signatureJson['timestamp'] as int;
      
      // Check timestamp (prevent replay attacks - allow 5 minute window)
      final now = DateTime.now().millisecondsSinceEpoch;
      final timeDiff = (now - timestamp).abs();
      if (timeDiff > 300000) { // 5 minutes
        return false;
      }
      
      final signature = ECSignature(r, s);
      final dataBytes = utf8.encode(data);
      
      return signer.verifySignature(dataBytes, signature);
    } catch (e) {
      return false;
    }
  }
}
