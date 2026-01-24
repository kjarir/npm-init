# Flutter Mobile App Integration Guide

This guide explains how to integrate your Flutter mobile app with the Hyperledger Fabric Backend API.

## API Base URL

```
http://YOUR_SERVER_IP:3002/api/v1
```

For local development:
```
http://localhost:3002/api/v1
```

For mobile device testing (replace with your computer's IP):
```
http://192.168.1.100:3002/api/v1
```

## API Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Success message",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Flutter HTTP Client Setup

### 1. Add Dependencies

Add to `pubspec.yaml`:
```yaml
dependencies:
  http: ^1.1.0
  dio: ^5.3.0  # Optional, but recommended for better error handling
```

### 2. Create API Service Class

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class FabricApiService {
  final String baseUrl;
  
  FabricApiService({this.baseUrl = 'http://localhost:3002/api/v1'});
  
  // Helper method for GET requests
  Future<Map<String, dynamic>> get(String endpoint) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl$endpoint'),
        headers: {'Content-Type': 'application/json'},
      );
      
      return _handleResponse(response);
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }
  
  // Helper method for POST requests
  Future<Map<String, dynamic>> post(
    String endpoint,
    Map<String, dynamic> body,
  ) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl$endpoint'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      );
      
      return _handleResponse(response);
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }
  
  // Handle API response
  Map<String, dynamic> _handleResponse(http.Response response) {
    final data = jsonDecode(response.body);
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (data['success'] == true) {
        return data['data'] ?? data;
      } else {
        throw Exception(data['message'] ?? 'Request failed');
      }
    } else {
      throw Exception(data['message'] ?? 'HTTP ${response.statusCode}');
    }
  }
}
```

## BobCoin API Examples

### Get Total Supply

```dart
class BobCoinService extends FabricApiService {
  Future<String> getTotalSupply() async {
    final response = await get('/bobcoin/totalSupply');
    return response['totalSupply'] as String;
  }
  
  Future<String> getFormattedTotalSupply() async {
    final response = await get('/bobcoin/totalSupply');
    return response['formatted'] as String;
  }
}
```

### Get Balance

```dart
Future<Map<String, dynamic>> getBalance(String address) async {
  final response = await get('/bobcoin/balance/$address');
  return {
    'balance': response['balance'] as String,
    'formatted': response['formatted'] as String,
    'address': response['address'] as String,
  };
}
```

### Mint BobCoin

```dart
Future<String> mintBobCoin(String to, String amount) async {
  final response = await post('/bobcoin/mint', {
    'to': to,
    'amount': amount,
  });
  return response['transactionId'] as String;
}
```

### Transfer BobCoin

```dart
Future<String> transferBobCoin(
  String from,
  String to,
  String amount,
) async {
  final response = await post('/bobcoin/transfer', {
    'from': from,
    'to': to,
    'amount': amount,
  });
  return response['transactionId'] as String;
}
```

### Burn BobCoin

```dart
Future<String> burnBobCoin(String from, String amount) async {
  final response = await post('/bobcoin/burn', {
    'from': from,
    'amount': amount,
  });
  return response['transactionId'] as String;
}
```

## Complete Flutter Example

```dart
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'BobCoin Wallet',
      home: BobCoinWallet(),
    );
  }
}

class BobCoinWallet extends StatefulWidget {
  @override
  _BobCoinWalletState createState() => _BobCoinWalletState();
}

class _BobCoinWalletState extends State<BobCoinWallet> {
  final apiService = FabricApiService(
    baseUrl: 'http://192.168.1.100:3002/api/v1', // Your server IP
  );
  
  String balance = '0';
  String address = 'user-123';
  bool loading = false;
  
  @override
  void initState() {
    super.initState();
    loadBalance();
  }
  
  Future<void> loadBalance() async {
    setState(() => loading = true);
    try {
      final data = await apiService.get('/bobcoin/balance/$address');
      setState(() {
        balance = data['formatted'] ?? '0';
        loading = false;
      });
    } catch (e) {
      setState(() => loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }
  
  Future<void> mintCoins(String amount) async {
    setState(() => loading = true);
    try {
      await apiService.post('/bobcoin/mint', {
        'to': address,
        'amount': amount,
      });
      await loadBalance(); // Refresh balance
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      setState(() => loading = false);
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('BobCoin Wallet')),
      body: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Column(
                  children: [
                    Text('Balance', style: TextStyle(fontSize: 16)),
                    SizedBox(height: 8),
                    Text(
                      loading ? 'Loading...' : '$balance BOB',
                      style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ),
            SizedBox(height: 16),
            ElevatedButton(
              onPressed: loading ? null : () => mintCoins('100'),
              child: Text('Mint 100 BOB'),
            ),
            ElevatedButton(
              onPressed: loading ? null : loadBalance,
              child: Text('Refresh Balance'),
            ),
          ],
        ),
      ),
    );
  }
}
```

## Error Handling

```dart
try {
  final response = await apiService.get('/bobcoin/balance/$address');
  // Handle success
} on SocketException {
  // Network error
  showError('No internet connection');
} on HttpException {
  // HTTP error
  showError('Server error');
} on FormatException {
  // JSON parsing error
  showError('Invalid response format');
} catch (e) {
  // Other errors
  showError('Unexpected error: $e');
}
```

## API Endpoints Reference

### Health Check
```
GET /health
```

### API Info
```
GET /api/v1/info
```

### Fabric Connection
```
POST /api/v1/fabric/connect
GET  /api/v1/fabric/status
POST /api/v1/fabric/disconnect
```

### Generic Chaincode
```
POST /api/v1/fabric/invoke
POST /api/v1/fabric/query
```

### BobCoin
```
GET  /api/v1/bobcoin/totalSupply
GET  /api/v1/bobcoin/balance/:address
GET  /api/v1/bobcoin/tokenInfo
GET  /api/v1/bobcoin/transactions
POST /api/v1/bobcoin/mint
POST /api/v1/bobcoin/burn
POST /api/v1/bobcoin/transfer
```

## Testing on Mobile Device

1. **Find your computer's IP address:**
   ```bash
   # macOS/Linux
   ifconfig | grep "inet "
   
   # Windows
   ipconfig
   ```

2. **Update Flutter app base URL:**
   ```dart
   final apiService = FabricApiService(
     baseUrl: 'http://YOUR_IP:3002/api/v1',
   );
   ```

3. **Ensure firewall allows port 3002:**
   ```bash
   # macOS
   sudo pfctl -f /etc/pf.conf
   ```

4. **Test connection:**
   ```dart
   // Test health endpoint
   final health = await http.get(Uri.parse('http://YOUR_IP:3002/health'));
   print(health.body);
   ```

## Security Notes

- In production, use HTTPS instead of HTTP
- Implement authentication/authorization
- Validate all user inputs
- Use environment variables for API URLs
- Implement request signing for sensitive operations

## Troubleshooting

### Connection Refused
- Ensure backend API is running: `npm start`
- Check firewall settings
- Verify IP address is correct

### CORS Errors
- The API allows all origins by default
- If issues persist, check server logs

### Timeout Errors
- Increase timeout in HTTP client
- Check network connectivity
- Verify Fabric network is running

## Support

For issues or questions:
1. Check server logs: `tail -f server.log`
2. Test API with curl/Postman first
3. Verify Fabric network is running
4. Check network connectivity
