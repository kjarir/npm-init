import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class EscrowService {
  static const String _hardcodedBase =
      'https://superpolitely-edificatory-lucille.ngrok-free.dev/api/escrow';

  static String get _apiUrl {
    return _hardcodedBase;
  }

  static Future<Map<String, dynamic>> generateDescription({
    required String title,
  }) async {
    try {
      final url = Uri.parse('$_apiUrl/generate-description');
      final response = await http
          .post(
            url,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'title': title}),
          )
          .timeout(const Duration(seconds: 20));

      if (response.statusCode == 200) {
        final result = jsonDecode(response.body) as Map<String, dynamic>;
        return {
          'success': true,
          'description': result['description'] ?? '',
        };
      }
      debugPrint('❌ [ESCROW] Description failed: ${response.statusCode} ${response.body}');
      return {
        'success': false,
        'error': response.body,
      };
    } catch (e) {
      debugPrint('❌ [ESCROW] Description error: $e');
      return {
        'success': false,
        'error': e.toString(),
      };
    }
  }

  static Future<Map<String, dynamic>> generateMilestones({
    required String title,
    required String description,
    required int count,
    required double budget,
  }) async {
    try {
      final url = Uri.parse('$_apiUrl/generate-milestones');
      final response = await http
          .post(
            url,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'title': title,
              'description': description,
              'count': count,
              'budget': budget,
            }),
          )
          .timeout(const Duration(seconds: 25));

      if (response.statusCode == 200) {
        final result = jsonDecode(response.body) as Map<String, dynamic>;
        return {
          'success': true,
          'milestones': result['milestones'] ?? [],
        };
      }
      debugPrint('❌ [ESCROW] Milestones failed: ${response.statusCode} ${response.body}');
      return {
        'success': false,
        'error': response.body,
      };
    } catch (e) {
      debugPrint('❌ [ESCROW] Milestones error: $e');
      return {
        'success': false,
        'error': e.toString(),
      };
    }
  }
}
