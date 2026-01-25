import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';

/// IPFS Service using Pinata
class IPFSService {
  /// Backend IPFS API (Pinata keys live on server, NOT in client)
  static String get _apiUrl {
    final androidOverride = dotenv.env['VITE_IPFS_API_URL_ANDROID'];
    if (Platform.isAndroid && androidOverride != null && androidOverride.isNotEmpty) {
      debugPrint('🔄 [IPFS] Android override URL: $androidOverride');
      return androidOverride;
    }

    final envUrl = dotenv.env['VITE_IPFS_API_URL'] ?? 'http://localhost:3002/api/ipfs';
    if (Platform.isAndroid && envUrl.contains('localhost')) {
      final correctedUrl = envUrl.replaceAll('localhost', '10.0.2.2');
      debugPrint('🔄 [IPFS] Android detected, using: $correctedUrl');
      return correctedUrl;
    }
    return envUrl;
  }

  static String get _gateway => dotenv.env['VITE_PINATA_GATEWAY'] ?? 'https://gateway.pinata.cloud/ipfs/';

  /// Upload JSON data to IPFS (via backend)
  static Future<Map<String, dynamic>> uploadJSON(Map<String, dynamic> data) async {
    try {
      final url = Uri.parse('$_apiUrl/pinJSON');

      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'data': data}),
      );

      if (response.statusCode == 200) {
        final result = jsonDecode(response.body) as Map<String, dynamic>;
        final ipfsHash = result['ipfsHash'] as String;
        debugPrint('✅ [IPFS] Uploaded to IPFS: $ipfsHash');
        return {
          'success': true,
          'ipfsHash': ipfsHash,
          'url': '$_gateway$ipfsHash',
        };
      } else {
        debugPrint('❌ [IPFS] Upload failed: ${response.statusCode} - ${response.body}');
        return {
          'success': false,
          'error': 'Upload failed: ${response.statusCode}',
        };
      }
    } catch (e) {
      debugPrint('❌ [IPFS] Error: $e');
      return {
        'success': false,
        'error': e.toString(),
      };
    }
  }

  /// Upload file to IPFS (via backend)
  static Future<Map<String, dynamic>> uploadFile(
    List<int> fileBytes,
    String fileName, {
    String? groupId,
  }) async {
    try {
      final url = Uri.parse('$_apiUrl/pinFile');

      final request = http.MultipartRequest('POST', url);
      request.files.add(
        http.MultipartFile.fromBytes(
          'file',
          fileBytes,
          filename: fileName,
        ),
      );
      if (groupId != null && groupId.isNotEmpty) {
        request.fields['groupId'] = groupId;
      }

      final response = await request.send();
      final responseBody = await response.stream.bytesToString();

      if (response.statusCode == 200) {
        final result = jsonDecode(responseBody) as Map<String, dynamic>;
        final ipfsHash = result['ipfsHash'] as String;
        return {
          'success': true,
          'ipfsHash': ipfsHash,
          'url': '$_gateway$ipfsHash',
        };
      } else {
        return {
          'success': false,
          'error': 'Upload failed: ${response.statusCode}',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'error': e.toString(),
      };
    }
  }

  /// Retrieve data from IPFS
  static Future<Map<String, dynamic>?> getFromIPFS(String ipfsHash) async {
    try {
      final url = Uri.parse('$_gateway$ipfsHash');
      final response = await http.get(url);
      
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      return null;
    } catch (e) {
      debugPrint('❌ [IPFS] Error retrieving: $e');
      return null;
    }
  }

  /// Create IPFS group (Pinata Group API via backend)
  static Future<Map<String, dynamic>> createGroup({
    required String name,
  }) async {
    try {
      final url = Uri.parse('$_apiUrl/groups');
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'name': name}),
      );
      if (response.statusCode == 200) {
        final result = jsonDecode(response.body) as Map<String, dynamic>;
        return {
          'success': true,
          'groupId': result['groupId'],
        };
      }
      return {'success': false, 'error': response.body};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Add CIDs to existing group
  static Future<Map<String, dynamic>> addCidsToGroup({
    required String groupId,
    required List<String> cids,
  }) async {
    try {
      final url = Uri.parse('$_apiUrl/groups/$groupId/cids');
      final response = await http.put(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'cids': cids}),
      );
      if (response.statusCode == 200) {
        return {'success': true};
      }
      return {'success': false, 'error': response.body};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Get all certificates from group
  static Future<Map<String, dynamic>?> getGroupCertificates(String groupHash) async {
    return await getFromIPFS(groupHash);
  }
}
