import 'package:flutter/foundation.dart';
import 'package:bobpay/services/supabase_client.dart';
import 'package:bobpay/services/contract_service.dart';

/// Proposal Service
/// Handles proposal submission and management
class ProposalService {
  /// Submit a proposal for a project
  /// Returns: {success, proposal_id, error}
  static Future<Map<String, dynamic>> submitProposal({
    required String projectId,
    required double bidAmount,
    required String estimatedDuration,
    required String coverLetter,
    String? portfolioLink,
  }) async {
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

      debugPrint('📝 [PROPOSAL] Submitting proposal for project: $projectId');

      // Check if proposal already exists (unique constraint on project_id + freelancer_id)
      try {
        final existing = await SupabaseService.client
            .from('proposals')
            .select('id')
            .eq('project_id', projectId)
            .eq('freelancer_id', user.id)
            .maybeSingle();
        
        if (existing != null) {
          return {
            'success': false,
            'error': 'You have already submitted a proposal for this project',
          };
        }
      } catch (e) {
        debugPrint('⚠️ [PROPOSAL] Could not check existing proposal: $e');
      }

      // Create proposal with correct schema field names
      final proposalData = {
        'project_id': projectId,
        'freelancer_id': user.id,
        'proposed_budget': bidAmount.toString(),
        'proposed_timeline': estimatedDuration,
        'cover_letter': coverLetter,
        'status': 'pending',
      };

      final response = await SupabaseService.client
          .from('proposals')
          .insert(proposalData)
          .select()
          .single();

      // Note: Proposal count is automatically updated by trigger 'on_proposal_change'

      debugPrint('✅ [PROPOSAL] Proposal submitted successfully: ${response['id']}');
      
      return {
        'success': true,
        'proposal_id': response['id'],
        'proposal': response,
      };
    } catch (e, stackTrace) {
      debugPrint('❌ [PROPOSAL] ERROR: $e');
      debugPrint('❌ [PROPOSAL] Stack trace: $stackTrace');
      return {
        'success': false,
        'error': 'Failed to submit proposal: $e',
      };
    }
  }

  /// Get proposals for a project
  static Future<Map<String, dynamic>> getProjectProposals(String projectId) async {
    try {
      if (!SupabaseService.isInitialized) {
        return {
          'success': false,
          'error': 'Supabase not initialized',
        };
      }

      final response = await SupabaseService.client
          .from('proposals')
          .select('''
            *,
            freelancer:profiles!proposals_freelancer_id_fkey(id, full_name, email, avatar_url)
          ''')
          .eq('project_id', projectId)
          .order('created_at', ascending: false);

      return {
        'success': true,
        'proposals': List<Map<String, dynamic>>.from(response),
      };
    } catch (e) {
      debugPrint('Error fetching proposals: $e');
      return {
        'success': false,
        'error': 'Failed to fetch proposals: $e',
      };
    }
  }

  /// Get proposals by freelancer
  static Future<Map<String, dynamic>> getFreelancerProposals() async {
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

      final response = await SupabaseService.client
          .from('proposals')
          .select('''
            *,
            project:projects!proposals_project_id_fkey(id, title, status, total_budget)
          ''')
          .eq('freelancer_id', user.id)
          .order('created_at', ascending: false);

      return {
        'success': true,
        'proposals': List<Map<String, dynamic>>.from(response),
      };
    } catch (e) {
      debugPrint('Error fetching freelancer proposals: $e');
      return {
        'success': false,
        'error': 'Failed to fetch proposals: $e',
      };
    }
  }

  /// Accept a proposal (client action)
  /// This creates a contract and updates project status
  static Future<Map<String, dynamic>> acceptProposal({
    required String proposalId,
    required String projectId,
  }) async {
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

      debugPrint('✅ [PROPOSAL] Accepting proposal: $proposalId');

      // Get proposal details
      final proposal = await SupabaseService.client
          .from('proposals')
          .select('*')
          .eq('id', proposalId)
          .single();

      final freelancerId = proposal['freelancer_id'] as String;
      final bidAmount = double.tryParse(proposal['proposed_budget']?.toString() ?? '0') ?? 0.0;

      // Update proposal status to accepted
      await SupabaseService.client
          .from('proposals')
          .update({
            'status': 'accepted',
          })
          .eq('id', proposalId);

      // Reject all other proposals for this project
      await SupabaseService.client
          .from('proposals')
          .update({'status': 'rejected'})
          .eq('project_id', projectId)
          .neq('id', proposalId);

      // Update project: assign freelancer and change status
      await SupabaseService.client
          .from('projects')
          .update({
            'freelancer_id': freelancerId,
            'status': 'in_progress',
            'total_budget': bidAmount.toString(),
            'started_at': DateTime.now().toIso8601String(),
          })
          .eq('id', projectId);

      // Create contract + certificate + secure channel
      final contractResult = await ContractService.createContractFromProposal(
        projectId: projectId,
        freelancerId: freelancerId,
        amount: bidAmount,
      );

      if (contractResult['success'] != true) {
        return {
          'success': false,
          'error': contractResult['error'] ?? 'Contract creation failed',
        };
      }

      debugPrint('✅ [PROPOSAL] Proposal accepted, contract created');
      return {
        'success': true,
        'message': 'Proposal accepted and contract created',
        'contract_id': contractResult['contract_id'],
      };
    } catch (e, stackTrace) {
      debugPrint('❌ [PROPOSAL] ERROR accepting proposal: $e');
      debugPrint('❌ [PROPOSAL] Stack trace: $stackTrace');
      return {
        'success': false,
        'error': 'Failed to accept proposal: $e',
      };
    }
  }

  /// Reject a proposal
  static Future<Map<String, dynamic>> rejectProposal(String proposalId) async {
    try {
      if (!SupabaseService.isInitialized) {
        return {
          'success': false,
          'error': 'Supabase not initialized',
        };
      }

      await SupabaseService.client
          .from('proposals')
          .update({
            'status': 'rejected',
          })
          .eq('id', proposalId);

      return {
        'success': true,
        'message': 'Proposal rejected',
      };
    } catch (e) {
      debugPrint('Error rejecting proposal: $e');
      return {
        'success': false,
        'error': 'Failed to reject proposal: $e',
      };
    }
  }

  /// Update a proposal (only if status is pending)
  /// Returns: {success, proposal, error}
  static Future<Map<String, dynamic>> updateProposal({
    required String proposalId,
    double? bidAmount,
    String? estimatedDuration,
    String? coverLetter,
    String? portfolioLink,
  }) async {
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

      // Check if proposal exists and belongs to current user
      final proposal = await SupabaseService.client
          .from('proposals')
          .select('*')
          .eq('id', proposalId)
          .eq('freelancer_id', user.id)
          .maybeSingle();

      if (proposal == null) {
        return {
          'success': false,
          'error': 'Proposal not found or you do not have permission to update it',
        };
      }

      // Only allow updates if proposal is pending
      final status = proposal['status']?.toString().toLowerCase();
      if (status != 'pending') {
        return {
          'success': false,
          'error': 'You can only update proposals with pending status',
        };
      }

      debugPrint('📝 [PROPOSAL] Updating proposal: $proposalId');

      // Build update data
      final updateData = <String, dynamic>{};
      if (bidAmount != null) {
        updateData['proposed_budget'] = bidAmount.toString();
      }
      if (estimatedDuration != null) {
        updateData['proposed_timeline'] = estimatedDuration;
      }
      if (coverLetter != null) {
        updateData['cover_letter'] = coverLetter;
      }
      if (portfolioLink != null) {
        updateData['portfolio_link'] = portfolioLink;
      }

      if (updateData.isEmpty) {
        return {
          'success': false,
          'error': 'No fields to update',
        };
      }

      // Update proposal
      final response = await SupabaseService.client
          .from('proposals')
          .update(updateData)
          .eq('id', proposalId)
          .select()
          .single();

      debugPrint('✅ [PROPOSAL] Proposal updated successfully');

      return {
        'success': true,
        'proposal': response,
        'message': 'Proposal updated successfully',
      };
    } catch (e, stackTrace) {
      debugPrint('❌ [PROPOSAL] ERROR updating proposal: $e');
      debugPrint('❌ [PROPOSAL] Stack trace: $stackTrace');
      return {
        'success': false,
        'error': 'Failed to update proposal: $e',
      };
    }
  }

  /// Delete/Withdraw a proposal (only if status is pending)
  /// Returns: {success, message, error}
  static Future<Map<String, dynamic>> deleteProposal(String proposalId) async {
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

      // Check if proposal exists and belongs to current user
      final proposal = await SupabaseService.client
          .from('proposals')
          .select('*')
          .eq('id', proposalId)
          .eq('freelancer_id', user.id)
          .maybeSingle();

      if (proposal == null) {
        return {
          'success': false,
          'error': 'Proposal not found or you do not have permission to delete it',
        };
      }

      // Only allow deletion if proposal is pending
      final status = proposal['status']?.toString().toLowerCase();
      if (status != 'pending') {
        // If not pending, mark as withdrawn instead of deleting
        await SupabaseService.client
            .from('proposals')
            .update({
              'status': 'withdrawn',
            })
            .eq('id', proposalId);

        debugPrint('✅ [PROPOSAL] Proposal withdrawn (status was not pending)');
        return {
          'success': true,
          'message': 'Proposal withdrawn successfully',
        };
      }

      debugPrint('🗑️ [PROPOSAL] Deleting proposal: $proposalId');

      // Delete proposal
      await SupabaseService.client
          .from('proposals')
          .delete()
          .eq('id', proposalId);

      debugPrint('✅ [PROPOSAL] Proposal deleted successfully');

      return {
        'success': true,
        'message': 'Proposal deleted successfully',
      };
    } catch (e, stackTrace) {
      debugPrint('❌ [PROPOSAL] ERROR deleting proposal: $e');
      debugPrint('❌ [PROPOSAL] Stack trace: $stackTrace');
      return {
        'success': false,
        'error': 'Failed to delete proposal: $e',
      };
    }
  }
}
