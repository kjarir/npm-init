// Flutter/Dart Example - How to invoke chaincodes from mobile app
// Note: These calls should go through a backend API

import 'package:http/http.dart' as http;
import 'dart:convert';

class FabricService {
  final String baseUrl = 'http://your-backend-url:3001/api';
  
  // ============================================
  // BOBCOIN TOKEN CONTRACT
  // ============================================
  
  // Query BobCoin balance
  Future<Map<String, dynamic>> getBobCoinBalance(String address) async {
    final response = await http.post(
      Uri.parse('$baseUrl/chaincode/query'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'chaincodeName': 'bobcoin',
        'function': 'BalanceOf',
        'args': [address]
      }),
    );
    return json.decode(response.body);
  }
  
  // Mint BobCoin tokens
  Future<Map<String, dynamic>> mintBobCoin(String to, String amount) async {
    final response = await http.post(
      Uri.parse('$baseUrl/chaincode/invoke'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'chaincodeName': 'bobcoin',
        'function': 'Mint',
        'args': [to, amount]
      }),
    );
    return json.decode(response.body);
  }
  
  // Transfer BobCoin
  Future<Map<String, dynamic>> transferBobCoin(
    String from, 
    String to, 
    String amount
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/chaincode/invoke'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'chaincodeName': 'bobcoin',
        'function': 'Transfer',
        'args': [from, to, amount]
      }),
    );
    return json.decode(response.body);
  }
  
  // Get total supply
  Future<Map<String, dynamic>> getTotalSupply() async {
    final response = await http.post(
      Uri.parse('$baseUrl/chaincode/query'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'chaincodeName': 'bobcoin',
        'function': 'TotalSupply',
        'args': []
      }),
    );
    return json.decode(response.body);
  }
  
  // ============================================
  // ESCROW CONTRACT
  // ============================================
  
  // Create escrow contract
  Future<Map<String, dynamic>> createEscrowContract(
    String contractId,
    String projectId,
    String clientAddress,
    String freelancerAddress,
    String totalAmount,
    List<Map<String, dynamic>> milestones,
  ) async {
    final milestonesJSON = json.encode(milestones);
    final response = await http.post(
      Uri.parse('$baseUrl/chaincode/invoke'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'chaincodeName': 'escrow',
        'function': 'CreateContract',
        'args': [
          contractId,
          projectId,
          clientAddress,
          freelancerAddress,
          totalAmount,
          milestonesJSON
        ]
      }),
    );
    return json.decode(response.body);
  }
  
  // Lock funds in escrow
  Future<Map<String, dynamic>> lockFunds(
    String contractId,
    String amount,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/chaincode/invoke'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'chaincodeName': 'escrow',
        'function': 'LockFunds',
        'args': [contractId, amount]
      }),
    );
    return json.decode(response.body);
  }
  
  // Release milestone payment
  Future<Map<String, dynamic>> releaseMilestone(
    String contractId,
    String milestoneId,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/chaincode/invoke'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'chaincodeName': 'escrow',
        'function': 'ReleaseMilestone',
        'args': [contractId, milestoneId]
      }),
    );
    return json.decode(response.body);
  }
  
  // Get escrow contract details
  Future<Map<String, dynamic>> getEscrowContract(String contractId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/chaincode/query'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'chaincodeName': 'escrow',
        'function': 'GetContract',
        'args': [contractId]
      }),
    );
    return json.decode(response.body);
  }
  
  // Refund project
  Future<Map<String, dynamic>> refundProject(String contractId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/chaincode/invoke'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'chaincodeName': 'escrow',
        'function': 'RefundProject',
        'args': [contractId]
      }),
    );
    return json.decode(response.body);
  }
  
  // ============================================
  // CERTIFICATE REGISTRY CONTRACT
  // ============================================
  
  // Register certificate
  Future<Map<String, dynamic>> registerCertificate(
    String certificateId,
    String projectId,
    String contractId,
    String issuerAddress,
    String recipientAddress,
    String ipfsHash,
    String description,
    Map<String, String>? metadata,
  ) async {
    final metadataJSON = metadata != null ? json.encode(metadata) : '{}';
    final response = await http.post(
      Uri.parse('$baseUrl/chaincode/invoke'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'chaincodeName': 'certificate-registry',
        'function': 'RegisterCertificate',
        'args': [
          certificateId,
          projectId,
          contractId,
          issuerAddress,
          recipientAddress,
          ipfsHash,
          description,
          metadataJSON
        ]
      }),
    );
    return json.decode(response.body);
  }
  
  // Get certificate
  Future<Map<String, dynamic>> getCertificate(String certificateId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/chaincode/query'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'chaincodeName': 'certificate-registry',
        'function': 'GetCertificate',
        'args': [certificateId]
      }),
    );
    return json.decode(response.body);
  }
  
  // Verify certificate
  Future<bool> verifyCertificate(String certificateId, String ipfsHash) async {
    final response = await http.post(
      Uri.parse('$baseUrl/chaincode/query'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'chaincodeName': 'certificate-registry',
        'function': 'VerifyCertificate',
        'args': [certificateId, ipfsHash]
      }),
    );
    final result = json.decode(response.body);
    return result['result'] == true;
  }
  
  // Get certificates by project
  Future<List<Map<String, dynamic>>> getCertificatesByProject(
    String projectId,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/chaincode/query'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'chaincodeName': 'certificate-registry',
        'function': 'GetCertificatesByProject',
        'args': [projectId]
      }),
    );
    final result = json.decode(response.body);
    return List<Map<String, dynamic>>.from(result['result']);
  }
}

// Usage example in Flutter widget
class ExampleWidget extends StatefulWidget {
  @override
  _ExampleWidgetState createState() => _ExampleWidgetState();
}

class _ExampleWidgetState extends State<ExampleWidget> {
  final _fabricService = FabricService();
  String _balance = '0';
  
  @override
  void initState() {
    super.initState();
    _loadBalance();
  }
  
  Future<void> _loadBalance() async {
    try {
      final result = await _fabricService.getBobCoinBalance('user123');
      setState(() {
        _balance = result['result'].toString();
      });
    } catch (e) {
      print('Error loading balance: $e');
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('BobCoin Balance')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Balance: $_balance BOB'),
            ElevatedButton(
              onPressed: () async {
                await _fabricService.mintBobCoin('user123', '100.0');
                _loadBalance();
              },
              child: Text('Mint 100 BOB'),
            ),
          ],
        ),
      ),
    );
  }
}
