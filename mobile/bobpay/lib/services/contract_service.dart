import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';
import 'package:bobpay/services/supabase_client.dart';
import 'package:bobpay/services/certificate_pdf_service.dart';
import 'package:bobpay/services/ipfs_service.dart';
import 'package:bobpay/services/signature_service.dart';
import 'package:bobpay/services/blockchain_service.dart';
import 'package:bobpay/services/local_key_service.dart';
import 'package:bobpay/services/user_certificate_service.dart';
import 'package:bobpay/services/secure_channel.dart';

/// Contract Service
/// Creates contract + certificate + secure channel when a proposal is accepted
class ContractService {
  /// Fetch active contracts for the current user
  /// Returns: {success, contracts, error}
  static Future<Map<String, dynamic>> getActiveContracts() async {
    try {
      if (!SupabaseService.isInitialized) {
        return {
          'success': false,
          'error': 'Supabase not initialized',
        };
      }

      final user = SupabaseService.client.auth.currentUser;
      if (user == null) {
        return {
          'success': false,
          'error': 'No user logged in',
        };
      }

      List<dynamic> response;
      try {
        response = await SupabaseService.client
            .from('contracts')
            .select('''
              *,
              project:projects(
                id, title, deadline, total_budget, status,
                milestones:milestones(id, status)
              ),
              client:profiles!contracts_client_id_fkey(id, full_name, email, avatar_url),
              freelancer:profiles!contracts_freelancer_id_fkey(id, full_name, email, avatar_url)
            ''')
            .order('created_at', ascending: false);
      } catch (e) {
        debugPrint('⚠️ [CONTRACTS] Falling back to basic select: $e');
        response = await SupabaseService.client
            .from('contracts')
            .select('*')
            .order('created_at', ascending: false);
      }

      final contracts = List<Map<String, dynamic>>.from(response);
      const activeStatuses = {'active', 'in_progress', 'ongoing'};
      final filtered = contracts.where((c) {
        final status = (c['status'] ?? '').toString().toLowerCase();
        if (status.isEmpty) return true;
        return activeStatuses.contains(status);
      }).toList();

      return {
        'success': true,
        'contracts': filtered,
      };
    } catch (e, stackTrace) {
      debugPrint('❌ [CONTRACTS] ERROR: $e');
      debugPrint('❌ [CONTRACTS] Stack trace: $stackTrace');
      final message = e.toString();
      if (message.contains('PGRST205') ||
          message.contains("Could not find the table 'public.contracts'")) {
        return {
          'success': false,
          'error': 'Contracts table is missing. Run supabase_contracts.sql in Supabase SQL Editor and restart the app.',
        };
      }
      return {
        'success': false,
        'error': 'Failed to fetch contracts: $e',
      };
    }
  }

  static Future<Map<String, dynamic>> createContractFromProposal({
    required String projectId,
    required String freelancerId,
    required double amount,
  }) async {
    try {
      final user = SupabaseService.client.auth.currentUser;
      if (user == null) {
        return {'success': false, 'error': 'No user logged in'};
      }

      // Load project to get IPFS group id
      final project = await SupabaseService.client
          .from('projects')
          .select('id, client_id, certificate_group_hash, ipfs_hash, title')
          .eq('id', projectId)
          .single();

      final groupId = project['certificate_group_hash']?.toString() ?? '';
      if (groupId.isEmpty) {
        return {'success': false, 'error': 'Project IPFS group not found'};
      }

      final contractId = const Uuid().v4();
      final contractData = {
        'id': contractId,
        'project_id': projectId,
        'client_id': user.id,
        'freelancer_id': freelancerId,
        'amount': amount.toString(),
        'status': 'active',
        'created_at': DateTime.now().toIso8601String(),
      };

      await SupabaseService.client.from('contracts').insert(contractData);

      // Generate contract certificate PDF
      final localKeys = await LocalKeyService.getLocalKeys();
      if (localKeys['private_key']!.isEmpty) {
        return {'success': false, 'error': 'Missing local private key'};
      }

      final contractCertId = const Uuid().v4();
      final certPayload = {
        ...contractData,
        'certificate_id': contractCertId,
        'ipfs_group_id': groupId,
        'project_title': project['title'],
      };
      final signature = SignatureService.signData(
        data: jsonEncode(certPayload),
        privateKeyEncoded: localKeys['private_key']!,
      );

      final pdfBytes = await CertificatePdfService.buildContractCertificate(
        contractData: contractData,
        certificateId: contractCertId,
        ipfsGroupId: groupId,
        signature: signature,
      );

      final certUpload = await IPFSService.uploadFile(
        pdfBytes,
        'contract_certificate_$contractId.pdf',
        groupId: groupId,
      );
      if (certUpload['success'] != true) {
        return {'success': false, 'error': 'Failed to upload contract certificate'};
      }

      // Register contract certificate on blockchain
      final txHash = sha256.convert(utf8.encode(jsonEncode(certPayload))).toString();
      final blockchainResult = await BlockchainService.registerContractCertificate(
        certificateId: contractCertId,
        projectId: projectId,
        contractId: contractId,
        ipfsHash: certUpload['ipfsHash'] as String,
        transactionHash: txHash,
        freelancerId: freelancerId,
        clientId: user.id,
        amount: amount.toString(),
      );
      final txId = blockchainResult['success'] == true ? blockchainResult['txId'] : null;
      if (blockchainResult['success'] != true) {
        debugPrint('⚠️ [CONTRACT] Blockchain registration failed: ${blockchainResult['error']}');
      }

      // Establish secure channel
      final freelancerCert = await UserCertificateService.getUserCertificate(freelancerId);
      if (freelancerCert == null) {
        return {'success': false, 'error': 'Freelancer certificate not found'};
      }
      final channel = await SecureChannelService.getOrCreateChannel(
        myDeviceFingerprint: localKeys['device_fingerprint']!,
        theirDeviceFingerprint: freelancerCert['device_fingerprint_hash'] as String,
        myPrivateKey: localKeys['private_key']!,
        theirPublicKey: freelancerCert['public_key'] as String,
      );

      await SupabaseService.client
          .from('contracts')
          .update({
            'contract_certificate_id': contractCertId,
            'ipfs_contract_hash': certUpload['ipfsHash'],
            'blockchain_tx_id': txId,
            'secure_channel_id': channel['channel_id'],
          })
          .eq('id', contractId);

      return {
        'success': true,
        'contract_id': contractId,
        'blockchain_tx_id': txId,
        'secure_channel_id': channel['channel_id'],
      };
    } catch (e) {
      debugPrint('❌ [CONTRACT] Error: $e');
      return {'success': false, 'error': e.toString()};
    }
  }
}
