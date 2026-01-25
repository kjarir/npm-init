import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

/// Calls POST /api/reputation/calculate.
/// Used after final milestone submission to update freelancer/client reputation.
class ReputationService {
  static const String _base =
      'https://superpolitely-edificatory-lucille.ngrok-free.dev/api/reputation';

  static Future<Map<String, dynamic>> calculate({
    required bool milestoneCompletion,
    required bool speedBonus,
    required bool highValueContract,
    bool streakBonus = false,
    required bool missedDeadline,
    bool contractAbandonment = false,
    required double currentReputation,
  }) async {
    try {
      final url = Uri.parse('$_base/calculate');
      final body = {
        'milestoneCompletion': milestoneCompletion,
        'speedBonus': speedBonus,
        'highValueContract': highValueContract,
        'streakBonus': streakBonus,
        'missedDeadline': missedDeadline,
        'contractAbandonment': contractAbandonment,
        'currentReputation': currentReputation,
      };
      final response = await http
          .post(
            url,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body) as Map<String, dynamic>;
        final data = decoded['data'] as Map<String, dynamic>?;
        if (decoded['success'] == true && data != null) {
          return {
            'success': true,
            'newReputation': (data['newReputation'] as num?)?.toDouble() ?? currentReputation,
            'totalScoreChange': (data['totalScoreChange'] as num?)?.toInt() ?? 0,
            'details': data['details'] as List<dynamic>? ?? [],
          };
        }
      }
      debugPrint('❌ [REPUTATION] Calculate failed: ${response.statusCode} ${response.body}');
      return {
        'success': false,
        'error': response.body,
        'newReputation': currentReputation,
      };
    } catch (e) {
      debugPrint('❌ [REPUTATION] Error: $e');
      return {
        'success': false,
        'error': e.toString(),
        'newReputation': currentReputation,
      };
    }
  }
}
