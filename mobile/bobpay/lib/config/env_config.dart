import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Environment Configuration
/// Loads all credentials from .env file
class EnvConfig {
  static String get supabaseUrl {
    try {
      return dotenv.env['SUPABASE_URL'] ?? '';
    } catch (e) {
      return '';
    }
  }
  
  static String get supabaseAnonKey {
    try {
      return dotenv.env['SUPABASE_ANON_KEY'] ?? '';
    } catch (e) {
      return '';
    }
  }

  // Pinata IPFS
  static String get pinataApiKey => dotenv.env['VITE_PINATA_API_KEY'] ?? '';
  static String get pinataApiSecret => dotenv.env['VITE_PINATA_API_SECRET'] ?? '';
  static String get pinataJwt => dotenv.env['VITE_PINATA_JWT'] ?? '';
  static String get pinataGateway => dotenv.env['VITE_PINATA_GATEWAY'] ?? 'https://gateway.pinata.cloud/ipfs/';
  static String get ipfsApiUrl => dotenv.env['VITE_IPFS_API_URL'] ?? 'http://localhost:3002/api/ipfs';

  // Hyperledger Fabric (fabric-backend-api: port 3002, /api/v1)
  static String get hlChannel => dotenv.env['VITE_HL_CHANNEL'] ?? 'mychannel';
  static String get hlApiUrl => dotenv.env['VITE_HL_API_URL'] ?? 'http://localhost:3002/api/v1';
  static String get hlApiUrlAndroid => dotenv.env['VITE_HL_API_URL_ANDROID'] ?? '';
  static String get hlUserId => dotenv.env['VITE_HL_USER_ID'] ?? 'appUser';

  // Auth redirect (email verification)
  static String get authRedirectUrl =>
      dotenv.env['VITE_AUTH_REDIRECT_URL'] ?? 'bobpay://auth-callback';

  static bool get isConfigured => supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;
}
