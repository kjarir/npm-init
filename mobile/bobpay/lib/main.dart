import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:app_links/app_links.dart';
import 'package:bobpay/auth/login.dart';
import 'package:bobpay/common/role_based_navigation.dart';
import 'package:bobpay/services/supabase_client.dart';

void main() async {
  runZonedGuarded(() async {
    WidgetsFlutterBinding.ensureInitialized();
    
    // Load environment variables
    bool envLoaded = false;
    String? supabaseUrl;
    String? supabaseAnonKey;
    
    try {
      // Try loading from assets first (for release builds)
      try {
        await dotenv.load(fileName: '.env');
        envLoaded = true;
        supabaseUrl = dotenv.env['SUPABASE_URL'];
        supabaseAnonKey = dotenv.env['SUPABASE_ANON_KEY'];
        debugPrint('✅ Successfully loaded .env file from assets');
      } catch (e1) {
        // If that fails, try loading from root directory (for development)
        try {
          await dotenv.load(fileName: '.env', mergeWith: Platform.environment);
          envLoaded = true;
          supabaseUrl = dotenv.env['SUPABASE_URL'];
          supabaseAnonKey = dotenv.env['SUPABASE_ANON_KEY'];
          debugPrint('✅ Successfully loaded .env file from root directory');
        } catch (e2) {
          debugPrint('⚠️ Warning: Could not load .env file from assets: $e1');
          debugPrint('⚠️ Warning: Could not load .env file from root: $e2');
          debugPrint('⚠️ Make sure .env file exists in bobpay directory and is listed in pubspec.yaml assets');
        }
      }
    } catch (e) {
      debugPrint('❌ Error loading .env file: $e');
      debugPrint('⚠️ Make sure .env file exists in the bobpay directory with SUPABASE_URL and SUPABASE_ANON_KEY');
    }
    
    // Initialize Supabase only if .env was loaded successfully and credentials are present
    if (envLoaded && supabaseUrl != null && supabaseUrl.isNotEmpty && supabaseAnonKey != null && supabaseAnonKey.isNotEmpty) {
      try {
        await SupabaseService.initialize(
          url: supabaseUrl,
          anonKey: supabaseAnonKey,
        );
        debugPrint('Supabase initialized successfully');
      } catch (e) {
        debugPrint('Error initializing Supabase: $e');
      }
    } else {
      if (!envLoaded) {
        debugPrint('Warning: .env file not loaded. Supabase will not be initialized.');
      } else {
        debugPrint('Warning: Supabase credentials not found in .env file');
        debugPrint('Warning: SUPABASE_URL=${supabaseUrl ?? "null"}, SUPABASE_ANON_KEY=${supabaseAnonKey != null ? "***" : "null"}');
      }
    }
    
    FlutterError.onError = (FlutterErrorDetails details) {
      if (details.exception.toString().contains('path_provider') ||
          details.exception.toString().contains('getApplicationSupportDirectory') ||
          details.exception.toString().contains('MissingPluginException')) {
        debugPrint('Font caching error (non-critical, app will continue): ${details.exception}');
        return;
      }
      FlutterError.presentError(details);
    };
    
    runApp(const MyApp());
  }, (error, stack) {
    if (error.toString().contains('path_provider') || 
        error.toString().contains('getApplicationSupportDirectory') ||
        error.toString().contains('MissingPluginException')) {
      debugPrint('Font caching error (non-critical, app will continue): $error');
      return;
    }
    FlutterError.presentError(FlutterErrorDetails(exception: error, stack: stack));
  });
}

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();
final GlobalKey<ScaffoldMessengerState> messengerKey =
    GlobalKey<ScaffoldMessengerState>();

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _sub;

  @override
  void initState() {
    super.initState();
    _initDeepLinks();
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  Future<void> _initDeepLinks() async {
    try {
      final initialUri = await _appLinks.getInitialLink();
      if (initialUri != null) {
        await _handleAuthLink(initialUri);
      }
      _sub = _appLinks.uriLinkStream.listen((uri) async {
        await _handleAuthLink(uri);
      });
    } catch (e) {
      debugPrint('⚠️ [DEEPLINK] Failed to init: $e');
    }
  }

  Future<void> _handleAuthLink(Uri uri) async {
    if (!SupabaseService.isInitialized) return;
    if (uri.scheme != 'bobpay') return;
    if (uri.host != 'auth-callback') return;

    try {
      await SupabaseService.client.auth.getSessionFromUrl(uri);
      messengerKey.currentState?.showSnackBar(
        const SnackBar(
          content: Text('Email verified. You are now logged in.'),
          backgroundColor: Colors.green,
        ),
      );
      navigatorKey.currentState?.pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const RoleBasedNavigation()),
        (_) => false,
      );
    } catch (e) {
      messengerKey.currentState?.showSnackBar(
        SnackBar(
          content: Text('Verification failed: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'BOBPAY',
      debugShowCheckedModeBanner: false,
      navigatorKey: navigatorKey,
      scaffoldMessengerKey: messengerKey,
      theme: ThemeData(
        textTheme: _buildSpaceGroteskTextTheme(),
        primaryTextTheme: _buildSpaceGroteskTextTheme(),
        useMaterial3: true,
      ),
      home: const Login(),
    );
  }

  TextTheme _buildSpaceGroteskTextTheme() {
    final baseTheme = ThemeData.light().textTheme;

    return TextTheme(
      displayLarge: _spaceGrotesk(baseTheme.displayLarge),
      displayMedium: _spaceGrotesk(baseTheme.displayMedium),
      displaySmall: _spaceGrotesk(baseTheme.displaySmall),
      headlineLarge: _spaceGrotesk(baseTheme.headlineLarge),
      headlineMedium: _spaceGrotesk(baseTheme.headlineMedium),
      headlineSmall: _spaceGrotesk(baseTheme.headlineSmall),
      titleLarge: _spaceGrotesk(baseTheme.titleLarge),
      titleMedium: _spaceGrotesk(baseTheme.titleMedium),
      titleSmall: _spaceGrotesk(baseTheme.titleSmall),
      bodyLarge: _spaceGrotesk(baseTheme.bodyLarge),
      bodyMedium: _spaceGrotesk(baseTheme.bodyMedium),
      bodySmall: _spaceGrotesk(baseTheme.bodySmall),
      labelLarge: _spaceGrotesk(baseTheme.labelLarge),
      labelMedium: _spaceGrotesk(baseTheme.labelMedium),
      labelSmall: _spaceGrotesk(baseTheme.labelSmall),
    );
  }

  TextStyle? _spaceGrotesk(TextStyle? style) {
    if (style == null) return null;
    try {
      return GoogleFonts.spaceGrotesk(textStyle: style);
    } catch (e) {
      return style.copyWith(fontFamily: 'SpaceGrotesk');
    }
  }
}
