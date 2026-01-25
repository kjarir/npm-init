import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Blockchain Service for Hyperledger Fabric
/// Defaults match fabric-backend-api: port 3002, base /api/v1, health at /health.
class BlockchainService {
  static const String _defaultBase = 'http://localhost:3002/api/v1';

  /// Get the correct API URL based on platform
  /// Android emulator: 10.0.2.2 maps to host machine's localhost
  /// iOS simulator: localhost works
  /// Physical device: Use actual machine IP
  static String get _apiUrl {
    final envUrl = dotenv.env['VITE_HL_API_URL'] ?? _defaultBase;
    final androidOverride = dotenv.env['VITE_HL_API_URL_ANDROID'];

    if (Platform.isAndroid) {
      if (androidOverride != null && androidOverride.isNotEmpty) {
        debugPrint('🔄 [BLOCKCHAIN] Android override: $androidOverride');
        return androidOverride;
      }
      if (envUrl.contains('localhost')) {
        final correctedUrl = envUrl.replaceAll('localhost', '10.0.2.2');
        debugPrint('🔄 [BLOCKCHAIN] Android detected, using: $correctedUrl');
        return correctedUrl;
      }
    }

    return envUrl;
  }

  /// Health at root: GET /health (fabric-backend-api style). Derive from base origin.
  static String get _healthUrl {
    final explicit = dotenv.env['VITE_HL_HEALTH_URL'];
    if (explicit != null && explicit.isNotEmpty) return explicit;
    final u = Uri.parse(_apiUrl);
    return '${u.origin}/health';
  }

  /// Invoke path: /fabric/invoke (fabric-backend-api style). Override via VITE_HL_INVOKE_PATH.
  static String get _invokePath =>
      dotenv.env['VITE_HL_INVOKE_PATH'] ?? '/fabric/invoke';

  /// Invoke timeout (default 60s). Override via VITE_HL_INVOKE_TIMEOUT_SECONDS.
  static int get _invokeTimeoutSeconds {
    final v = dotenv.env['VITE_HL_INVOKE_TIMEOUT_SECONDS'];
    if (v == null || v.isEmpty) return 60;
    final n = int.tryParse(v);
    return n != null && n > 0 ? n.clamp(15, 300) : 60;
  }

  static String get _channel => dotenv.env['VITE_HL_CHANNEL'] ?? 'mychannel';
  static String get _userId => dotenv.env['VITE_HL_USER_ID'] ?? 'appUser';

  static Future<Map<String, dynamic>> _invokeCertificate({
    required String functionName,
    required List<String> args,
  }) async {
    try {
      final base = _apiUrl.endsWith('/') ? _apiUrl.substring(0, _apiUrl.length - 1) : _apiUrl;
      final path = _invokePath.startsWith('/') ? _invokePath : '/$_invokePath';
      final url = Uri.parse('$base$path');
      final contractName = dotenv.env['VITE_HL_CERTIFICATE_CHAINCODE'] ?? 'certificate-registry';
      final payload = {
        'contractName': contractName,
        'functionName': functionName,
        'args': args,
      };

      debugPrint('🔗 [BLOCKCHAIN] Invoke $functionName @ $url (contract: $contractName)');

      final timeoutSeconds = _invokeTimeoutSeconds;
      final response = await http
          .post(
            url,
            headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
            body: jsonEncode(payload),
          )
          .timeout(
            Duration(seconds: timeoutSeconds),
            onTimeout: () {
              throw TimeoutException('Blockchain invoke timed out after ${timeoutSeconds}s');
            },
          );

      if (response.statusCode == 200) {
        final result = jsonDecode(response.body) as Map<String, dynamic>;
        final txId = result['transactionId'] ?? result['txId'];
        debugPrint('✅ [BLOCKCHAIN] Invoke OK: $txId');
        return {'success': true, 'txId': txId};
      }

      debugPrint('❌ [BLOCKCHAIN] Invoke failed: ${response.statusCode} ${response.body}');
      return {
        'success': false,
        'error': 'Invoke failed: ${response.statusCode} ${response.body}',
      };
    } on SocketException catch (e) {
      debugPrint('❌ [BLOCKCHAIN] SocketException: $e');
      return {
        'success': false,
        'error': 'Cannot reach blockchain server at $_apiUrl. Is it running and listening on 0.0.0.0?',
        'details': e.toString(),
      };
    } on TimeoutException catch (e) {
      debugPrint('❌ [BLOCKCHAIN] Timeout: $e');
      return {
        'success': false,
        'error': 'Blockchain request timed out. Ensure Fabric backend has POST /api/v1/fabric/invoke and chaincode responds.',
        'details': e.toString(),
      };
    } catch (e) {
      debugPrint('❌ [BLOCKCHAIN] Error: $e');
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Test blockchain server connection
  /// Tries GET /health (root), GET /api/v1/, GET /api/v1/fabric/status
  static Future<Map<String, dynamic>> testConnection() async {
    final results = <String, bool>{};
    
    try {
      final url = Uri.parse(_healthUrl);
      final response = await http.get(url).timeout(
        const Duration(seconds: 3),
        onTimeout: () => throw TimeoutException('Health check timeout'),
      );
      results['health'] = response.statusCode == 200;
    } catch (e) {
      results['health'] = false;
    }
    
    try {
      final url = Uri.parse('$_apiUrl/');
      final response = await http.get(url).timeout(
        const Duration(seconds: 3),
        onTimeout: () => throw TimeoutException('Root timeout'),
      );
      results['root'] = response.statusCode < 500;
    } catch (e) {
      results['root'] = false;
    }
    
    try {
      final url = Uri.parse('$_apiUrl/fabric/status');
      final response = await http.get(url).timeout(
        const Duration(seconds: 3),
        onTimeout: () => throw TimeoutException('Status timeout'),
      );
      results['fabric_status'] = response.statusCode == 200;
    } catch (e) {
      results['fabric_status'] = false;
    }
    
    final isConnected = results.values.any((v) => v == true);
    return {
      'connected': isConnected,
      'url': _apiUrl,
      'healthUrl': _healthUrl,
      'tests': results,
    };
  }

  /// Create project on blockchain
  /// Matches chaincode RegisterProject function signature:
  /// Args: projectId, title, description, category, clientId, totalBudget, deadline, skillsRequired (JSON), ipfsHash
  static Future<Map<String, dynamic>> createProject({
    required String projectId,
    required String clientId,
    required String title,
    required String description,
    required double budget,
    required String ipfsHash,
    required String signature,
    String? category,
    String? deadline,
    List<String>? skillsRequired,
  }) async {
    try {
      final url = Uri.parse('$_apiUrl/projects/create');
      
      debugPrint('🔗 [BLOCKCHAIN] Connecting to: $url');
      
      // Match chaincode RegisterProject arguments
      final payload = {
        'projectId': projectId,
        'title': title,
        'description': description,
        'category': category ?? 'general',
        'clientId': clientId,
        'totalBudget': budget.toString(),
        'deadline': deadline ?? '',
        'skillsRequired': skillsRequired != null ? jsonEncode(skillsRequired) : '[]',
        'ipfsHash': ipfsHash,
        'signature': signature,
        'channel': _channel,
        'userId': _userId,
      };

      debugPrint('📤 [BLOCKCHAIN] Sending request with payload: ${payload.keys.join(", ")}');
      debugPrint('📤 [BLOCKCHAIN] Payload size: ${jsonEncode(payload).length} bytes');

      // Test connection first (quick check)
      debugPrint('🔍 [BLOCKCHAIN] Testing server connection...');
      final connectionTest = await testConnection();
      if (!connectionTest['connected']) {
        debugPrint('❌ [BLOCKCHAIN] Server is not reachable at: $_apiUrl');
        debugPrint('❌ [BLOCKCHAIN] Connection test results: ${connectionTest['tests']}');
        return {
          'success': false,
          'error': 'Blockchain server is not reachable. Please check:',
          'details': [
            '1. Is the Fabric backend running? (default port 3002)',
            '2. Is it listening on 0.0.0.0 (not just localhost)?',
            '3. For Android emulator: use http://10.0.2.2:3002 in VITE_HL_API_URL',
            '4. Check server logs for errors',
            '5. Verify health: GET $_healthUrl',
          ].join('\n'),
          'url': _apiUrl,
        };
      }
      debugPrint('✅ [BLOCKCHAIN] Server connection OK');

      // Use longer timeout for blockchain operations (30 seconds)
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode(payload),
      ).timeout(
        const Duration(seconds: 30),
        onTimeout: () {
          throw TimeoutException('Blockchain request timed out after 30 seconds. Server may be slow or processing.');
        },
      );

      debugPrint('📥 [BLOCKCHAIN] Response status: ${response.statusCode}');
      debugPrint('📥 [BLOCKCHAIN] Response body: ${response.body.substring(0, response.body.length > 200 ? 200 : response.body.length)}');

      if (response.statusCode == 200) {
        final result = jsonDecode(response.body) as Map<String, dynamic>;
        debugPrint('✅ [BLOCKCHAIN] Project created successfully! TX ID: ${result['txId']}');
        return {
          'success': true,
          'txId': result['txId'],
          'blockNumber': result['blockNumber'],
        };
      } else {
        debugPrint('❌ [BLOCKCHAIN] Transaction failed with status ${response.statusCode}');
        debugPrint('❌ [BLOCKCHAIN] Error response: ${response.body}');
        return {
          'success': false,
          'error': 'Blockchain transaction failed: ${response.statusCode} - ${response.body}',
        };
      }
    } on SocketException catch (e) {
      debugPrint('❌ [BLOCKCHAIN] Connection error: $e');
      debugPrint('💡 [BLOCKCHAIN] Server URL: $_apiUrl');
      debugPrint('💡 [BLOCKCHAIN] Troubleshooting:');
      debugPrint('   1. Check if Fabric backend is running: curl $_healthUrl');
      debugPrint('   2. For Android emulator: VITE_HL_API_URL=http://10.0.2.2:3002/api/v1');
      debugPrint('   3. For physical device: VITE_HL_API_URL_ANDROID=http://<MACHINE_IP>:3002/api/v1');
      debugPrint('   4. Ensure server listens on 0.0.0.0');
      return {
        'success': false,
        'error': 'Cannot connect to blockchain server. Server may not be running or accessible.',
        'details': e.toString(),
        'url': _apiUrl,
      };
    } on TimeoutException catch (e) {
      debugPrint('❌ [BLOCKCHAIN] Request timeout: $e');
      debugPrint('💡 [BLOCKCHAIN] Server may be:');
      debugPrint('   - Processing slowly (chaincode execution takes time)');
      debugPrint('   - Not responding at: $_apiUrl');
      debugPrint('   - Network connectivity issues');
      return {
        'success': false,
        'error': 'Blockchain request timed out after 30 seconds. Server may be slow, unreachable, or the endpoint may not exist.',
        'url': _apiUrl,
      };
    } catch (e, stackTrace) {
      debugPrint('❌ [BLOCKCHAIN] Unexpected error: $e');
      debugPrint('❌ [BLOCKCHAIN] Stack trace: $stackTrace');
      return {
        'success': false,
        'error': 'Blockchain error: $e',
      };
    }
  }

  /// Update project on blockchain
  static Future<Map<String, dynamic>> updateProject({
    required String projectId,
    required Map<String, dynamic> updates,
    required String signature,
  }) async {
    try {
      final url = Uri.parse('$_apiUrl/projects/update');
      
      final payload = {
        'projectId': projectId,
        'updates': updates,
        'signature': signature,
        'channel': _channel,
        'userId': _userId,
      };

      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload),
      );

      if (response.statusCode == 200) {
        final result = jsonDecode(response.body) as Map<String, dynamic>;
        return {
          'success': true,
          'txId': result['txId'],
        };
      } else {
        return {
          'success': false,
          'error': 'Update failed: ${response.statusCode}',
        };
      }
    } catch (e) {
      return {
        'success': true,
        'txId': 'mock_update_tx_${DateTime.now().millisecondsSinceEpoch}',
        'note': 'Blockchain offline, using mock transaction',
      };
    }
  }

  /// Delete project on blockchain
  static Future<Map<String, dynamic>> deleteProject({
    required String projectId,
    required String signature,
  }) async {
    try {
      final url = Uri.parse('$_apiUrl/projects/delete');
      
      final payload = {
        'projectId': projectId,
        'signature': signature,
        'channel': _channel,
        'userId': _userId,
      };

      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload),
      );

      if (response.statusCode == 200) {
        final result = jsonDecode(response.body) as Map<String, dynamic>;
        return {
          'success': true,
          'txId': result['txId'],
        };
      } else {
        return {
          'success': false,
          'error': 'Delete failed: ${response.statusCode}',
        };
      }
    } catch (e) {
      return {
        'success': true,
        'txId': 'mock_delete_tx_${DateTime.now().millisecondsSinceEpoch}',
        'note': 'Blockchain offline, using mock transaction',
      };
    }
  }

  /// Register project on blockchain (RegisterProject)
  static Future<Map<String, dynamic>> registerProject({
    required String projectId,
    required String clientId,
    required String title,
    required String description,
    required double budget,
    required String ipfsHash,
    required String ipfsGroupHash,
    String? category,
    String? deadline,
    List<String>? skillsRequired,
  }) async {
    return _invokeCertificate(functionName: 'RegisterProject', args: [
      projectId,
      title,
      description,
      category ?? 'general',
      clientId,
      budget.toString(),
      deadline ?? '',
      skillsRequired != null ? jsonEncode(skillsRequired) : '[]',
      ipfsHash,
      ipfsGroupHash,
    ]);
  }

  static Future<Map<String, dynamic>> registerContractCertificate({
    required String certificateId,
    required String projectId,
    required String contractId,
    required String ipfsHash,
    required String transactionHash,
    required String freelancerId,
    required String clientId,
    required String amount,
  }) async {
    return _invokeCertificate(functionName: 'RegisterContractCertificate', args: [
      certificateId,
      projectId,
      contractId,
      ipfsHash,
      transactionHash,
      freelancerId,
      clientId,
      amount,
    ]);
  }

  static Future<Map<String, dynamic>> registerMilestoneCertificate({
    required String certificateId,
    required String projectId,
    required String contractId,
    required String milestoneId,
    required String ipfsHash,
    required String transactionHash,
    required String freelancerId,
    required String clientId,
    required String amount,
  }) async {
    return _invokeCertificate(functionName: 'RegisterMilestoneCertificate', args: [
      certificateId,
      projectId,
      contractId,
      milestoneId,
      ipfsHash,
      transactionHash,
      freelancerId,
      clientId,
      amount,
    ]);
  }
  /// Legacy certificate registration (RegisterCertificate)
  static Future<Map<String, dynamic>> registerCertificate({
    required String certificateId,
    required String userId,
    required String ipfsHash,
    required String signature,
    String? projectId,
    String? milestoneId,
    String? transactionHash,
    String? freelancerId,
    String? clientId,
    String? amount,
  }) async {
    try {
      final url = Uri.parse('$_apiUrl/certificates/register');
      
      // Match chaincode RegisterCertificate arguments
      final payload = {
        'certificateId': certificateId,
        'projectId': projectId ?? '',
        'milestoneId': milestoneId ?? '',
        'ipfsHash': ipfsHash,
        'transactionHash': transactionHash ?? '',
        'freelancerId': freelancerId ?? '',
        'clientId': clientId ?? userId, // Use userId as clientId if not provided
        'amount': amount ?? '0',
        'signature': signature,
        'channel': _channel,
        'requestUserId': _userId,
      };

      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload),
      );

      if (response.statusCode == 200) {
        final result = jsonDecode(response.body) as Map<String, dynamic>;
        return {
          'success': true,
          'txId': result['txId'],
        };
      } else {
        return {
          'success': false,
          'error': 'Certificate registration failed',
        };
      }
    } catch (e) {
      return {
        'success': true,
        'txId': 'mock_cert_tx_${DateTime.now().millisecondsSinceEpoch}',
        'note': 'Blockchain offline, using mock transaction',
      };
    }
  }

  /// Anchor audit log hash to blockchain
  static Future<Map<String, dynamic>> anchorAuditLog({
    required String logHash,
    required String signature,
  }) async {
    try {
      final url = Uri.parse('$_apiUrl/audit/anchor');
      
      final payload = {
        'logHash': logHash,
        'signature': signature,
        'timestamp': DateTime.now().toIso8601String(),
        'channel': _channel,
        'userId': _userId,
      };

      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload),
      );

      if (response.statusCode == 200) {
        final result = jsonDecode(response.body) as Map<String, dynamic>;
        return {
          'success': true,
          'txId': result['txId'],
        };
      } else {
        return {
          'success': false,
          'error': 'Audit log anchoring failed',
        };
      }
    } catch (e) {
      return {
        'success': true,
        'txId': 'mock_audit_tx_${DateTime.now().millisecondsSinceEpoch}',
        'note': 'Blockchain offline, using mock transaction',
      };
    }
  }
}
