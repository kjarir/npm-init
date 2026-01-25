import 'dart:convert';
import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:battery_plus/battery_plus.dart';
import 'package:network_info_plus/network_info_plus.dart';

/// Comprehensive Device Identification Service
/// Collects ALL possible device identifiers for legal identification
class ComprehensiveDeviceId {
  static final DeviceInfoPlugin _deviceInfo = DeviceInfoPlugin();
  static final Battery _battery = Battery();

  /// Get ALL device identification data for legal evidence
  /// This includes every possible identifier to track a person legally
  static Future<Map<String, dynamic>> getAllDeviceData() async {
    final deviceData = <String, dynamic>{
      'timestamp': DateTime.now().toIso8601String(),
      'platform': defaultTargetPlatform.toString(),
    };

    try {
      // Platform-specific device info
      if (Platform.isAndroid) {
        final androidInfo = await _deviceInfo.androidInfo;
        deviceData.addAll({
          // Core Identifiers
          'android_id': androidInfo.id,
          'device_id': androidInfo.id,
          'android_id_secure': androidInfo.id, // Using id as androidId is deprecated
          
          // Device Hardware
          'manufacturer': androidInfo.manufacturer,
          'brand': androidInfo.brand,
          'model': androidInfo.model,
          'device': androidInfo.device,
          'product': androidInfo.product,
          'hardware': androidInfo.hardware,
          'board': androidInfo.board,
          'bootloader': androidInfo.bootloader,
          'fingerprint': androidInfo.fingerprint,
          'host': androidInfo.host,
          'tags': androidInfo.tags,
          'type': androidInfo.type,
          'is_physical_device': androidInfo.isPhysicalDevice,
          
          // OS Information
          'os_version': androidInfo.version.release,
          'sdk_int': androidInfo.version.sdkInt,
          'codename': androidInfo.version.codename,
          'incremental': androidInfo.version.incremental,
          'security_patch': androidInfo.version.securityPatch,
          'preview_sdk_int': androidInfo.version.previewSdkInt,
          
          // Display Information (using system info instead of displayMetrics)
          'display_info': 'available_via_media_query', // Display metrics available via MediaQuery in Flutter
          
          // System Information
          'system_features': androidInfo.systemFeatures,
          'supported_abis': androidInfo.supportedAbis,
          'supported_32_bit_abis': androidInfo.supported32BitAbis,
          'supported_64_bit_abis': androidInfo.supported64BitAbis,
        });

        // Try to get IMEI (requires permission)
        try {
          // Note: IMEI requires special permissions and may not be accessible
          // This is just a placeholder - actual implementation needs platform channels
          deviceData['imei'] = 'requires_platform_channel';
        } catch (e) {
          deviceData['imei'] = 'not_available';
        }

      } else if (Platform.isIOS) {
        final iosInfo = await _deviceInfo.iosInfo;
        deviceData.addAll({
          // Core Identifiers
          'identifier_for_vendor': iosInfo.identifierForVendor ?? 'unknown',
          'device_id': iosInfo.identifierForVendor ?? 'unknown',
          
          // Device Information
          'name': iosInfo.name,
          'model': iosInfo.model,
          'localized_model': iosInfo.localizedModel,
          'system_name': iosInfo.systemName,
          'system_version': iosInfo.systemVersion,
          'is_physical_device': iosInfo.isPhysicalDevice,
          'utsname_sysname': iosInfo.utsname.sysname,
          'utsname_nodename': iosInfo.utsname.nodename,
          'utsname_release': iosInfo.utsname.release,
          'utsname_version': iosInfo.utsname.version,
          'utsname_machine': iosInfo.utsname.machine,
        });
      }

      // App Information
      try {
        final packageInfo = await PackageInfo.fromPlatform();
        deviceData.addAll({
          'app_name': packageInfo.appName,
          'package_name': packageInfo.packageName,
          'version': packageInfo.version,
          'build_number': packageInfo.buildNumber,
          'installer_store': packageInfo.installerStore ?? 'unknown',
        });
      } catch (e) {
        deviceData['app_info_error'] = e.toString();
      }

      // Battery Information
      try {
        final batteryLevel = await _battery.batteryLevel;
        final batteryState = await _battery.batteryState;
        deviceData.addAll({
          'battery_level': batteryLevel,
          'battery_state': batteryState.toString(),
        });
      } catch (e) {
        deviceData['battery_info_error'] = e.toString();
      }

      // Network Information
      try {
        final connectivityResult = await Connectivity().checkConnectivity();
        deviceData.addAll({
          'connectivity_type': connectivityResult.toString(),
        });

        // Get IP Address
        final ipAddress = await _getIPAddress();
        deviceData['public_ip_address'] = ipAddress;

        // Get WiFi SSID (if available)
        try {
          final networkInfo = NetworkInfo();
          final wifiName = await networkInfo.getWifiName();
          final wifiBSSID = await networkInfo.getWifiBSSID();
          final wifiIP = await networkInfo.getWifiIP();
          deviceData.addAll({
            'wifi_ssid': wifiName ?? 'not_available',
            'wifi_bssid': wifiBSSID ?? 'not_available',
            'wifi_ip': wifiIP ?? 'not_available',
          });
        } catch (e) {
          deviceData['wifi_info_error'] = e.toString();
        }
      } catch (e) {
        deviceData['network_info_error'] = e.toString();
      }

      // System Information
      deviceData.addAll({
        'timezone': DateTime.now().timeZoneName,
        'timezone_offset': DateTime.now().timeZoneOffset.toString(),
        'locale': Platform.localeName,
        'number_of_processors': Platform.numberOfProcessors,
        'operating_system': Platform.operatingSystem,
        'operating_system_version': Platform.operatingSystemVersion,
      });

      // Generate Device Fingerprint Hash (SHA-256 of all identifiers)
      final fingerprint = _generateDeviceFingerprint(deviceData);
      deviceData['device_fingerprint_hash'] = fingerprint;

    } catch (e) {
      deviceData['error'] = e.toString();
      deviceData['error_stack'] = StackTrace.current.toString();
    }

    return deviceData;
  }

  /// Generate cryptographic hash of device data for unique identification
  static String _generateDeviceFingerprint(Map<String, dynamic> deviceData) {
    // Create a deterministic string from all identifiers
    final identifiers = <String>[];
    
    // Add all critical identifiers in a consistent order
    identifiers.add(deviceData['android_id']?.toString() ?? '');
    identifiers.add(deviceData['android_id_secure']?.toString() ?? '');
    identifiers.add(deviceData['identifier_for_vendor']?.toString() ?? '');
    identifiers.add(deviceData['manufacturer']?.toString() ?? '');
    identifiers.add(deviceData['brand']?.toString() ?? '');
    identifiers.add(deviceData['model']?.toString() ?? '');
    identifiers.add(deviceData['device']?.toString() ?? '');
    identifiers.add(deviceData['hardware']?.toString() ?? '');
    identifiers.add(deviceData['fingerprint']?.toString() ?? '');
    identifiers.add(deviceData['public_ip_address']?.toString() ?? '');
    
    // Combine and hash
    final combined = identifiers.join('|');
    final bytes = utf8.encode(combined);
    final digest = sha256.convert(bytes);
    
    return digest.toString();
  }

  /// Get public IP address
  static Future<String> _getIPAddress() async {
    try {
      final services = [
        'https://api.ipify.org',
        'https://api64.ipify.org',
        'https://icanhazip.com',
      ];

      for (final service in services) {
        try {
          final response = await http.get(Uri.parse(service)).timeout(
            const Duration(seconds: 5),
          );
          if (response.statusCode == 200) {
            return response.body.trim();
          }
        } catch (e) {
          continue;
        }
      }
      return 'unknown';
    } catch (e) {
      return 'unknown';
    }
  }

  /// Get device metadata summary (for display/logging)
  static Future<Map<String, String>> getDeviceSummary() async {
    final allData = await getAllDeviceData();
    return {
      'device_id': allData['device_id']?.toString() ?? 'unknown',
      'device_fingerprint': allData['device_fingerprint_hash']?.toString() ?? 'unknown',
      'model': allData['model']?.toString() ?? 'unknown',
      'os_version': allData['os_version']?.toString() ?? allData['system_version']?.toString() ?? 'unknown',
      'ip_address': allData['public_ip_address']?.toString() ?? 'unknown',
      'platform': allData['platform']?.toString() ?? 'unknown',
    };
  }
}
