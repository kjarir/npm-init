import 'dart:async';
import 'package:flutter/material.dart';
import 'package:bobpay/common/notifications.dart';
import 'package:bobpay/services/proposal_service.dart';
import 'package:bobpay/services/wallet_service.dart';
import 'package:bobpay/services/supabase_client.dart';
import 'package:bobpay/freelancer/view_proposal.dart';

class FreelancerProposals extends StatefulWidget {
  const FreelancerProposals({super.key});

  @override
  State<FreelancerProposals> createState() => _FreelancerProposalsState();
}

class _FreelancerProposalsState extends State<FreelancerProposals> {
  static const bg = Color(0xFFFAF8F5);
  static const ink = Color(0xFF1A1F2E);
  static const primary = Color(0xFFF06542);

  List<Map<String, dynamic>> _proposals = [];
  bool _isLoading = true;
  String? _error;
  String _selectedTab = 'PENDING'; // Default to PENDING since new proposals start as pending

  StreamSubscription<List<Map<String, dynamic>>>? _proposalsSubscription;

  @override
  void initState() {
    super.initState();
    _fetchProposals();
    _setupRealtimeSubscription();
  }

  @override
  void dispose() {
    _proposalsSubscription?.cancel();
    super.dispose();
  }

  void _setupRealtimeSubscription() {
    try {
      final user = SupabaseService.client.auth.currentUser;
      if (user == null || !SupabaseService.isInitialized) return;

      // Subscribe to proposals table changes for current user
      // Note: Real-time stream doesn't support joins, so we refetch to get full data with project relationships
      _proposalsSubscription = SupabaseService.client
          .from('proposals')
          .stream(primaryKey: ['id'])
          .eq('freelancer_id', user.id)
          .order('created_at', ascending: false)
          .listen((data) {
        if (mounted) {
          debugPrint('🔄 [PROPOSALS] Real-time update detected: ${data.length} proposals');
          // Refetch to get full data with project relationships
          _fetchProposals();
        }
      });
    } catch (e) {
      debugPrint('⚠️ [PROPOSALS] Error setting up real-time: $e');
    }
  }

  Future<void> _fetchProposals() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final result = await ProposalService.getFreelancerProposals();

    setState(() {
      if (result['success'] == true) {
        _proposals = List<Map<String, dynamic>>.from(result['proposals'] ?? []);
        debugPrint('📋 [PROPOSALS] Loaded ${_proposals.length} proposals');
        // Debug: Print status of each proposal
        for (var proposal in _proposals) {
          debugPrint('   - Proposal ID: ${proposal['id']}, Status: ${proposal['status']}');
        }
      } else {
        _error = result['error']?.toString() ?? 'Failed to load proposals';
      }
      _isLoading = false;
    });
  }

  List<Map<String, dynamic>> get _filteredProposals {
    debugPrint('🔍 [FILTER] Filtering ${_proposals.length} proposals for tab: $_selectedTab');
    
    switch (_selectedTab) {
      case 'ACTIVE':
        final filtered = _proposals.where((p) {
          final status = p['status']?.toString().toLowerCase() ?? '';
          return status == 'accepted' || status == 'shortlisted';
        }).toList();
        debugPrint('🔍 [FILTER] ACTIVE tab result: ${filtered.length} proposals');
        return filtered;
      case 'PENDING':
        final filtered = _proposals.where((p) {
          final status = p['status']?.toString().toLowerCase() ?? '';
          debugPrint('   - Checking proposal ${p['id']}: status="$status" (matches pending: ${status == 'pending'})');
          return status == 'pending';
        }).toList();
        debugPrint('🔍 [FILTER] PENDING tab result: ${filtered.length} proposals');
        return filtered;
      case 'ARCHIVED':
        final filtered = _proposals.where((p) {
          final status = p['status']?.toString().toLowerCase() ?? '';
          return status == 'rejected' || status == 'withdrawn';
        }).toList();
        debugPrint('🔍 [FILTER] ARCHIVED tab result: ${filtered.length} proposals');
        return filtered;
      default:
        debugPrint('🔍 [FILTER] No tab selected, returning all ${_proposals.length} proposals');
        return _proposals;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: Column(
          children: [
            _topBar(context),
            _tabs(),
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? Padding(
                          padding: const EdgeInsets.all(32.0),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                _error!,
                                style: const TextStyle(color: Colors.red),
                              ),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                onPressed: _fetchProposals,
                                child: const Text('Retry'),
                              ),
                            ],
                          ),
                        )
                      : _filteredProposals.isEmpty
                          ? const Center(
                              child: Text('No proposals found'),
                            )
                          : SingleChildScrollView(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                children: _filteredProposals.map((proposal) {
                                  return _ProposalCard(
                                    proposal: proposal,
                                    onViewDetails: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (context) => ViewProposal(
                                            proposal: proposal,
                                          ),
                                        ),
                                      ).then((deleted) {
                                        // If proposal was deleted, refresh the list
                                        if (deleted == true) {
                                          _fetchProposals();
                                        }
                                      });
                                    },
                                  );
                                }).toList(),
                              ),
                            ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _topBar(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: const BoxDecoration(
        color: bg,
        border: Border(bottom: BorderSide(color: ink, width: 3)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              GestureDetector(
                onTap: () => Navigator.pop(context),
                child: const Icon(Icons.arrow_back),
              ),
              const SizedBox(width: 8),
              const Text(
                'MY PROPOSALS',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          GestureDetector(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const NotificationsPage(),
                ),
              );
            },
            child: const _IconBox(Icons.notifications),
          ),
        ],
      ),
    );
  }

  Widget _tabs() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: const BoxDecoration(
        color: bg,
        border: Border(bottom: BorderSide(color: ink, width: 3)),
      ),
      child: Row(
        children: [
          _tab('ACTIVE', _selectedTab == 'ACTIVE'),
          const SizedBox(width: 8),
          _tab('PENDING', _selectedTab == 'PENDING'),
          const SizedBox(width: 8),
          _tab('ARCHIVED', _selectedTab == 'ARCHIVED'),
        ],
      ),
    );
  }

  Widget _tab(String text, bool active) {
    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() {
            _selectedTab = text;
          });
        },
        child: Container(
          height: 44,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: active ? primary : Colors.white,
            border: Border.all(color: ink, width: 3),
          ),
          child: Text(
            text,
            style: TextStyle(
              fontWeight: FontWeight.w900,
              color: active ? Colors.white : ink,
            ),
          ),
        ),
      ),
    );
  }
}

/// Proposal card widget for displaying freelancer proposals
class _ProposalCard extends StatelessWidget {
  final Map<String, dynamic> proposal;
  final VoidCallback onViewDetails;

  static const _ink = Color(0xFF1A1F2E);
  static const _primary = Color(0xFFF06542);
  static const _yellow = Color(0xFFF2C94C);
  static const _muted = Color(0xFF8A8A8A);
  static const _green = Color(0xFF2D8659);

  // Non-const constructor to support dynamic data
  _ProposalCard({
    required this.proposal,
    required this.onViewDetails,
  });

  String _formatCurrency(dynamic amount) {
    if (amount == null) return '\$0';
    if (amount is String) {
      final parsed = double.tryParse(amount);
      return parsed != null ? WalletService.formatCurrency(parsed) : '\$0';
    }
    if (amount is num) {
      return WalletService.formatCurrency(amount.toDouble());
    }
    return '\$0';
  }

  String _getStatusDisplay(String? status) {
    if (status == null) return 'PENDING';
    switch (status.toLowerCase()) {
      case 'accepted':
        return 'ACCEPTED';
      case 'pending':
        return 'PENDING';
      case 'rejected':
        return 'REJECTED';
      case 'shortlisted':
        return 'SHORTLISTED';
      case 'withdrawn':
        return 'WITHDRAWN';
      default:
        return status.toUpperCase();
    }
  }

  Color _getStatusColor(String? status) {
    if (status == null) return _yellow;
    switch (status.toLowerCase()) {
      case 'accepted':
        return _green;
      case 'pending':
        return _primary;
      case 'shortlisted':
        return _yellow;
      case 'rejected':
      case 'withdrawn':
        return _muted;
      default:
        return _primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final project = proposal['project'] as Map<String, dynamic>?;
    final projectTitle = project?['title']?.toString() ?? 'Unknown Project';
    final status = proposal['status']?.toString();
    final proposedBudget = proposal['proposed_budget'];
    final projectBudget = project?['total_budget'];
    final createdDate = proposal['created_at']?.toString();
    
    // Format date
    String dateDisplay = 'Recently';
    if (createdDate != null) {
      try {
        final date = DateTime.parse(createdDate);
        final now = DateTime.now();
        final difference = now.difference(date);
        if (difference.inDays == 0) {
          dateDisplay = 'Today';
        } else if (difference.inDays == 1) {
          dateDisplay = 'Yesterday';
        } else if (difference.inDays < 7) {
          dateDisplay = '${difference.inDays} days ago';
        } else {
          dateDisplay = '${date.day}/${date.month}/${date.year}';
        }
      } catch (e) {
        dateDisplay = 'Recently';
      }
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Stack(
        children: [
          Container(
            margin: const EdgeInsets.only(left: 6, top: 6),
            color: _ink,
          ),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              border:
                  Border.all(color: _ink, width: 3),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  height: 160,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    border: Border(
                      bottom: BorderSide(
                          color: _ink, width: 3),
                    ),
                  ),
                  child: project?['title'] != null
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Text(
                              projectTitle,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                              ),
                              textAlign: TextAlign.center,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        )
                      : null,
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            color: _getStatusColor(status),
                            child: Text(
                              _getStatusDisplay(status),
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                              ),
                            ),
                          ),
                          const Spacer(),
                          Text(
                            dateDisplay,
                            style: TextStyle(
                              fontSize: 11,
                              color: _muted,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        projectTitle,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          Expanded(
                            child: _meta(
                              'PROPOSED BUDGET',
                              _formatCurrency(proposedBudget),
                            ),
                          ),
                          Expanded(
                            child: _meta(
                              'PROJECT BUDGET',
                              _formatCurrency(projectBudget),
                            ),
                          ),
                        ],
                      ),
                      if (proposal['proposed_timeline'] != null) ...[
                        const SizedBox(height: 12),
                        _meta(
                          'TIMELINE',
                          proposal['proposed_timeline']?.toString() ?? 'N/A',
                        ),
                      ],
                      const SizedBox(height: 18),
                      GestureDetector(
                        onTap: onViewDetails,
                        child: _outlineButton(),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _meta(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: _muted,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w900,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }

  Widget _outlineButton() {
    return Container(
      height: 44,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Colors.white,
        border:
            Border.all(color: _ink, width: 3),
      ),
      child: const Text(
        'VIEW PROPOSAL DETAILS',
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w900,
          letterSpacing: 0.6,
        ),
      ),
    );
  }
}

class _IconBox extends StatelessWidget {
  final IconData icon;
  static const _ink = Color(0xFF1A1F2E);
  
  const _IconBox(this.icon);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(
            color: _ink, width: 3),
      ),
      child: Icon(icon, size: 18),
    );
  }
}
