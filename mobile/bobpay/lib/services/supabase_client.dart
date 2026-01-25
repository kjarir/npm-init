import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseService {
  static SupabaseClient? _client;
  static bool _initialized = false;

  /// Initialize Supabase client
  /// Call this in main() before runApp()
  static Future<void> initialize({
    required String url,
    required String anonKey,
  }) async {
    if (_initialized) return;

    await Supabase.initialize(
      url: url,
      anonKey: anonKey,
    );

    _client = Supabase.instance.client;
    _initialized = true;
  }

  /// Get Supabase client instance
  static SupabaseClient get client {
    if (!_initialized || _client == null) {
      throw Exception('Supabase not initialized. Call SupabaseService.initialize() first.');
    }
    return _client!;
  }

  /// Check if Supabase is initialized
  static bool get isInitialized => _initialized && _client != null;
}
