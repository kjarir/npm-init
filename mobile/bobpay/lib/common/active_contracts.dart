import 'package:flutter/material.dart';
import 'package:bobpay/services/contract_service.dart';
import 'package:bobpay/services/login_service.dart';
import 'package:bobpay/services/wallet_service.dart';
import 'package:bobpay/common/contract_details.dart';
import 'package:bobpay/freelancer/submit_deliverable.dart';

class ActiveContracts extends StatefulWidget {
  const ActiveContracts({super.key});

  @override
  State<ActiveContracts> createState() => _ActiveContractsState();
}

class _ActiveContractsState extends State<ActiveContracts> {
  static const bg = Color(0xFFFAF8F5);
  static const ink = Color(0xFF1A1F2E);
  static const primary = Color(0xFFF06542);
  static const muted = Color(0xFF8A8A8A);
  static const grey = Color(0xFFE6E6E6);
  static const success = Color(0xFF2FB344);

  List<Map<String, dynamic>> _contracts = [];
  bool _isLoading = true;
  String? _error;
  String _userRole = 'client';

  @override
  void initState() {
    super.initState();
    _loadContracts();
  }

  Future<void> _loadContracts() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final profile = await LoginService.getCurrentProfile();
      final role = (profile?['role'] as String?)?.trim().toLowerCase();

      final result = await ContractService.getActiveContracts();
      if (result['success'] == true) {
        setState(() {
          _contracts = List<Map<String, dynamic>>.from(result['contracts'] ?? []);
          _userRole = role?.isNotEmpty == true ? role! : 'client';
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = result['error']?.toString() ?? 'Failed to load contracts';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Failed to load contracts: $e';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: Column(
          children: [
            _topBar(),
            Expanded(child: _buildBody()),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(_error!, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadContracts,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_contracts.isEmpty) {
      return RefreshIndicator(
        onRefresh: _loadContracts,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: const [
            SizedBox(height: 120),
            Center(
              child: Text(
                'No active contracts yet.',
                style: TextStyle(color: muted, fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadContracts,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _contracts.length,
        itemBuilder: (context, index) {
          final contract = _contracts[index];
          final project = contract['project'] as Map<String, dynamic>?;
          final milestones = _extractMilestones(project);
          final completed = _countCompletedMilestones(milestones);
          final total = milestones.length;

          final status = (contract['status'] ?? 'active').toString().toLowerCase();
          final statusLabel = status.toUpperCase();
          final statusColor = _statusColor(status);

          final title = project?['title']?.toString().trim();
          final projectId = _resolveProjectId(contract, project);
          final fallbackTitle = projectId.isNotEmpty
              ? 'PROJECT ${_shortId(projectId)}'
              : 'UNTITLED PROJECT';
          final deadline = _formatDeadline(project?['deadline']);
          final escrow = WalletService.formatCurrency(contract['amount'] ?? project?['total_budget']);

          final partyLabel = _userRole == 'freelancer' ? 'CLIENT' : 'FREELANCER';
          final partyName = _userRole == 'freelancer'
              ? _displayName(contract['client'] as Map<String, dynamic>?, contract['client_id']?.toString())
              : _displayName(contract['freelancer'] as Map<String, dynamic>?, contract['freelancer_id']?.toString());
          return _ContractCard(
            status: statusLabel,
            statusColor: statusColor,
            title: (title == null || title.isEmpty) ? fallbackTitle : title.toUpperCase(),
            deadline: deadline,
            partyLabel: partyLabel,
            partyName: partyName,
            escrow: escrow,
            progress: completed,
            total: total,
            showSubmitDeliverable: _userRole == 'freelancer',
            onViewDetails: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => ContractDetailsPage(
                    contract: contract,
                    isFreelancer: _userRole == 'freelancer',
                  ),
                ),
              );
            },
            onSubmitDeliverable: _userRole == 'freelancer'
                ? () {
                    if (projectId.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Project ID missing. Please refresh contracts.'),
                          backgroundColor: Colors.red,
                        ),
                      );
                      return;
                    }
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => SubmitDeliverablePage(
                          projectId: projectId,
                          projectTitle: (title == null || title.isEmpty)
                              ? fallbackTitle
                              : title,
                        ),
                      ),
                    );
                  }
                : null,
          );
        },
      ),
    );
  }

  Widget _topBar() {
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
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.arrow_back),
              ),
              const SizedBox(width: 4),
              const Text(
                'ACTIVE CONTRACTS',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          Row(
            children: const [
              _IconBox(Icons.search),
              SizedBox(width: 10),
              _IconBox(Icons.filter_list),
            ],
          ),
        ],
      ),
    );
  }

  List<Map<String, dynamic>> _extractMilestones(Map<String, dynamic>? project) {
    final raw = project?['milestones'];
    if (raw is List) {
      return List<Map<String, dynamic>>.from(raw);
    }
    return [];
  }

  int _countCompletedMilestones(List<Map<String, dynamic>> milestones) {
    return milestones.where((m) {
      final status = m['status']?.toString().toLowerCase();
      return status == 'completed';
    }).length;
  }

  String _formatDeadline(dynamic deadline) {
    if (deadline == null) return 'N/A';
    final raw = deadline.toString().trim();
    if (raw.isEmpty) return 'N/A';
    final date = DateTime.tryParse(raw);
    if (date == null) return raw.toUpperCase();
    const months = [
      'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
      'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
    ];
    return '${date.day} ${months[date.month - 1]}';
  }

  String _displayName(Map<String, dynamic>? profile, String? fallbackId) {
    final name = profile?['full_name']?.toString().trim();
    if (name != null && name.isNotEmpty) return name.toUpperCase();
    final email = profile?['email']?.toString().trim();
    if (email != null && email.isNotEmpty) return email.toUpperCase();
    if (fallbackId != null && fallbackId.isNotEmpty) {
      return _shortId(fallbackId);
    }
    return 'USER';
  }

  String _shortId(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return 'UNKNOWN';
    return trimmed.length > 8 ? trimmed.substring(0, 8).toUpperCase() : trimmed.toUpperCase();
  }

  String _resolveProjectId(Map<String, dynamic> contract, Map<String, dynamic>? project) {
    final direct = contract['project_id'] ?? contract['projectId'];
    final nested = project?['id'];
    return (direct ?? nested)?.toString() ?? '';
  }

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'closed':
      case 'done':
        return success;
      case 'pending':
      case 'waiting':
        return muted;
      case 'cancelled':
      case 'rejected':
        return muted;
      case 'active':
      case 'in_progress':
      case 'ongoing':
      default:
        return primary;
    }
  }
}

class _ContractCard extends StatelessWidget {
  final String status;
  final Color statusColor;
  final String title;
  final String deadline;
  final String partyLabel;
  final String partyName;
  final String escrow;
  final int progress;
  final int total;
  final bool showSubmitDeliverable;
  final VoidCallback onViewDetails;
  final VoidCallback? onSubmitDeliverable;

  const _ContractCard({
    required this.status,
    required this.statusColor,
    required this.title,
    required this.deadline,
    required this.partyLabel,
    required this.partyName,
    required this.escrow,
    required this.progress,
    required this.total,
    required this.showSubmitDeliverable,
    required this.onViewDetails,
    this.onSubmitDeliverable,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Stack(
        children: [
          Container(
            margin: const EdgeInsets.only(left: 6, top: 6),
            height: 420,
            color: _ActiveContractsState.ink,
          ),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: _ActiveContractsState.ink, width: 3),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  height: 160,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    border: Border(
                      bottom: BorderSide(
                        color: _ActiveContractsState.ink,
                        width: 3,
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            color: statusColor,
                            child: Text(
                              status,
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                              ),
                            ),
                          ),
                          const Spacer(),
                          Text(
                            'DEADLINE: $deadline',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                              color: _ActiveContractsState.primary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 10),
                      _meta(Icons.person, '$partyLabel: $partyName'),
                      const SizedBox(height: 6),
                      _meta(Icons.lock, 'TOTAL ESCROW: $escrow'),
                      const SizedBox(height: 18),
                      if (total > 0) ...[
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'MILESTONE PROGRESS',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            Text(
                              '$progress/$total',
                              style: const TextStyle(
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        _progressBar(),
                        const SizedBox(height: 18),
                      ] else ...[
                        const Text(
                          'NO MILESTONES',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: _ActiveContractsState.muted,
                          ),
                        ),
                        const SizedBox(height: 18),
                      ],
                      Row(
                        children: [
                          Expanded(child: _outlineBtn('VIEW DETAILS', onTap: onViewDetails)),
                          if (showSubmitDeliverable) ...[
                            const SizedBox(width: 12),
                            Expanded(
                              child: _primaryBtn(
                                'SUBMIT DELIVERABLE',
                                onTap: onSubmitDeliverable,
                              ),
                            ),
                          ],
                        ],
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

  Widget _meta(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 16),
        const SizedBox(width: 6),
        Text(
          text,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: _ActiveContractsState.muted,
          ),
        ),
      ],
    );
  }

  Widget _progressBar() {
    return Row(
      children: List.generate(
        total,
        (i) => Expanded(
          child: Container(
            height: 14,
            margin: EdgeInsets.only(right: i == total - 1 ? 0 : 6),
            decoration: BoxDecoration(
              color: i < progress ? _ActiveContractsState.primary : _ActiveContractsState.grey,
              border: Border.all(color: _ActiveContractsState.ink, width: 2),
            ),
          ),
        ),
      ),
    );
  }

  Widget _outlineBtn(String text, {VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 44,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: _ActiveContractsState.ink, width: 3),
        ),
        child: Text(
          text,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }

  Widget _primaryBtn(String text, {VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Stack(
        children: [
          Container(
            margin: const EdgeInsets.only(left: 4, top: 4),
            height: 44,
            color: _ActiveContractsState.ink,
          ),
          Container(
            height: 44,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: _ActiveContractsState.primary,
              border: Border.all(color: _ActiveContractsState.ink, width: 3),
            ),
            child: Text(
              text,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _IconBox extends StatelessWidget {
  final IconData icon;
  const _IconBox(this.icon);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: _ActiveContractsState.ink, width: 3),
      ),
      child: Icon(icon, size: 18),
    );
  }
}
