import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class CodeReviewService {
  static const String _endpoint =
      'https://superpolitely-edificatory-lucille.ngrok-free.dev/api/submission/upload';
  static const String _fileFieldName = 'projectZip';
  static const String _milestonesFieldName = 'milestones';

  static Future<Map<String, dynamic>> submitForReview({
    required String title,
    required String description,
    required double amount,
    required PlatformFile zipFile,
    String milestonesJson = '[]',
  }) async {
    try {
      final payload = await _resolvePayload(zipFile);
      return await _sendReviewRequest(
        fieldName: _fileFieldName,
        payload: payload,
        title: title,
        description: description,
        amount: amount,
        milestonesJson: milestonesJson,
      );
    } catch (e) {
      debugPrint('❌ [CODE_REVIEW] Error: $e');
      return {
        'success': false,
        'error': e.toString(),
      };
    }
  }

  static Future<Map<String, dynamic>> _sendReviewRequest({
    required String fieldName,
    required _FilePayload payload,
    required String title,
    required String description,
    required double amount,
    required String milestonesJson,
  }) async {
    final bytes = payload.bytes;
    if (bytes == null || bytes.isEmpty) {
      debugPrint('❌ [CODE_REVIEW] No zip bytes to send');
      return {'success': false, 'error': 'Zip file data missing or empty'};
    }

    final request = http.MultipartRequest('POST', Uri.parse(_endpoint));
    request.headers['ngrok-skip-browser-warning'] = 'true';
    request.fields[_milestonesFieldName] = milestonesJson;
    request.files.add(
      http.MultipartFile.fromBytes(
        fieldName,
        bytes,
        filename: payload.fileName,
      ),
    );

    debugPrint('📤 [CODE_REVIEW] Sending zip to API: ${payload.fileName}, ${bytes.length} bytes, field=$fieldName');
    debugPrint('📤 [CODE_REVIEW] milestones: $milestonesJson');

    http.StreamedResponse response;
    String body;
    try {
      response = await request.send().timeout(
        const Duration(seconds: 120),
        onTimeout: () => throw Exception('Code review API timeout after 120s'),
      );
      body = await response.stream.bytesToString();
      debugPrint('📋 [CODE_REVIEW] API response status=${response.statusCode} bodyLength=${body.length}');
      debugPrint('📋 [CODE_REVIEW] API response body: $body');
    } catch (e) {
      debugPrint('❌ [CODE_REVIEW] Request failed: $e');
      return {'success': false, 'error': e.toString()};
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      dynamic decoded;
      try {
        decoded = jsonDecode(body);
      } catch (_) {
        decoded = null;
      }
      if (decoded is List) {
        decoded = <String, dynamic>{'items': decoded};
      } else if (decoded is! Map<String, dynamic>) {
        decoded = <String, dynamic>{};
      }
      return {
        'success': true,
        'data': decoded as Map<String, dynamic>,
        'raw': body,
      };
    }

    return {
      'success': false,
      'error': body.isNotEmpty ? body : 'Review upload failed',
      'raw': body,
      'statusCode': response.statusCode,
      'field': fieldName,
    };
  }

  /// Resolve to bytes always. Prefer bytes > readStream > path so we never use
  /// fromPath (Android content URIs often break). API always sends via fromBytes.
  static Future<_FilePayload> _resolvePayload(PlatformFile zipFile) async {
    Uint8List? bytes;
    if (zipFile.bytes != null && zipFile.bytes!.isNotEmpty) {
      bytes = zipFile.bytes;
    } else if (zipFile.readStream != null) {
      bytes = await _readStreamBytes(zipFile.readStream!);
    } else if (zipFile.path != null && zipFile.path!.isNotEmpty) {
      try {
        bytes = await File(zipFile.path!).readAsBytes();
      } catch (e) {
        debugPrint('⚠️ [CODE_REVIEW] readAsBytes from path failed: $e');
      }
    }
    if (bytes == null || bytes.isEmpty) {
      throw Exception('Zip file data missing or unreadable');
    }
    return _FilePayload(bytes: bytes, path: null, fileName: zipFile.name);
  }

  static Future<Uint8List> _readStreamBytes(Stream<List<int>> stream) async {
    final builder = BytesBuilder(copy: false);
    await for (final chunk in stream) {
      builder.add(chunk);
    }
    return builder.toBytes();
  }
}

class _FilePayload {
  final Uint8List? bytes;
  final String? path;
  final String fileName;

  _FilePayload({this.bytes, this.path, required this.fileName});
}
