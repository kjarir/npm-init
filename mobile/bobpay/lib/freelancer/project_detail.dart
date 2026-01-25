import 'package:flutter/material.dart';
import 'package:bobpay/services/wallet_service.dart';
import 'package:bobpay/services/project_service.dart';

class ProjectDetailsFreelancer extends StatefulWidget {
  final Map<String, dynamic>? project;
  
  const ProjectDetailsFreelancer({
    super.key,
    this.project,
  });

  @override
  State<ProjectDetailsFreelancer> createState() => _ProjectDetailsFreelancerState();
}

class _ProjectDetailsFreelancerState extends State<ProjectDetailsFreelancer> {
  static const bg = Color(0xFFFAF8F5);
  static const ink = Color(0xFF1A1F2E);
  static const primary = Color(0xFFF06542);
  static const muted = Color(0xFF8A8A8A);

  Map<String, dynamic>? _project;
  List<Map<String, dynamic>> _milestones = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    if (widget.project != null) {
      _project = widget.project;
      _loadMilestones();
    } else {
      _isLoading = false;
    }
  }

  Future<void> _loadMilestones() async {
    if (_project == null || _project!['id'] == null) {
      setState(() {
        _isLoading = false;
      });
      return;
    }

    try {
      final projectId = _project!['id'].toString();
      final fullProject = await ProjectService.getProjectById(projectId);
      
      setState(() {
        if (fullProject != null) {
          _project = fullProject;
          _milestones = List<Map<String, dynamic>>.from(
            fullProject['milestones'] ?? [],
          );
        }
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  String _formatCurrency(dynamic amount) {
    if (amount == null) return '\$0 USD';
    if (amount is String) {
      final parsed = double.tryParse(amount);
      return parsed != null ? '${WalletService.formatCurrency(parsed)} USD' : '\$0 USD';
    }
    if (amount is num) {
      return '${WalletService.formatCurrency(amount.toDouble())} USD';
    }
    return '\$0 USD';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: Column(
          children: [
            _topBar(),
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _project == null
                      ? const Center(child: Text('Project not found'))
                      : SingleChildScrollView(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _status(),
                              const SizedBox(height: 10),
                              _title(),
                              const SizedBox(height: 20),
                              _budgetCard(),
                              const SizedBox(height: 28),
                              _projectInfo(),
                              const SizedBox(height: 28),
                              _section('PROJECT DESCRIPTION'),
                              const SizedBox(height: 12),
                              _description(),
                              if (_hasSkills()) ...[
                                const SizedBox(height: 28),
                                _section('REQUIRED SKILLS'),
                                const SizedBox(height: 12),
                                _skills(),
                              ],
                              const SizedBox(height: 28),
                              _section('MILESTONES'),
                              const SizedBox(height: 12),
                              if (_milestones.isEmpty)
                                _milestone(1, 'PROJECT INITIATION',
                                    'Initial setup and planning', true),
                              ..._milestones.asMap().entries.map((entry) {
                                final index = entry.key + 1;
                                final milestone = entry.value;
                                final title = milestone['title']?.toString() ?? 'Milestone $index';
                                final amount = milestone['amount'] ?? 0;
                                final percentage = milestone['percentage'] ?? 0;
                                final isCompleted = milestone['status']?.toString().toLowerCase() == 'completed';
                                final subtitle = percentage > 0 
                                    ? '$percentage% of total budget'
                                    : _formatCurrency(amount);
                                return _milestone(index, title, subtitle, !isCompleted);
                              }),
                              const SizedBox(height: 32),
                              _applyButton(),
                            ],
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _topBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: ink, width: 3)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                border: Border.all(color: ink, width: 3),
              ),
              child: const Row(
                children: [
                  Icon(Icons.arrow_back, size: 16),
                  SizedBox(width: 6),
                  Text(
                    'BACK',
                    style: TextStyle(fontWeight: FontWeight.w900),
                  ),
                ],
              ),
            ),
          ),
          const Text(
            'PROJECT DETAILS',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
            ),
          ),
          const Icon(Icons.share),
        ],
      ),
    );
  }

  Widget _status() {
    final status = _project?['status']?.toString().toUpperCase() ?? 'OPEN';
    return Container(
      padding:
          const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: primary,
        border: Border.all(color: ink, width: 3),
      ),
      child: Text(
        status == 'OPEN' ? 'OPEN FOR BIDS' : status,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w900,
          color: Colors.white,
        ),
      ),
    );
  }

  Widget _title() {
    final title = _project?['title']?.toString() ?? 'Untitled Project';
    return Text(
      title,
      style: const TextStyle(
        fontSize: 30,
        height: 1.1,
        fontWeight: FontWeight.w900,
      ),
    );
  }

  Widget _budgetCard() {
    // Use total_budget from schema
    final budget = _project?['total_budget'] ?? 0;
    final lockedFunds = _project?['locked_funds'] ?? 0;
    final releasedFunds = _project?['released_funds'] ?? 0;
    final billingType = _project?['billing_type']?.toString() ?? 'fixed';
    final hourlyRate = _project?['hourly_rate'];
    final fundsVerified = _project?['funds_verified'] ?? false;
    
    return Stack(
      children: [
        Container(
          margin: const EdgeInsets.only(left: 6, top: 6),
          height: 160,
          color: ink,
        ),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: primary,
            border: Border.all(color: ink, width: 3),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment:
                    MainAxisAlignment.spaceBetween,
                children: const [
                  Text(
                    'BUDGET & ESCROW',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                    ),
                  ),
                  Icon(Icons.lock, color: Colors.white),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                _formatCurrency(budget),
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                ),
              ),
              if (billingType == 'hourly' && hourlyRate != null) ...[
                const SizedBox(height: 6),
                Text(
                  'Hourly Rate: ${_formatCurrency(hourlyRate)}/hr',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Colors.white70,
                  ),
                ),
              ],
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: ink,
                  border: Border.all(color: ink, width: 3),
                ),
                child: Row(
                  children: [
                    Icon(
                      fundsVerified ? Icons.verified : Icons.verified_user,
                      size: 16,
                      color: Colors.white,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        fundsVerified
                            ? 'FUNDS VERIFIED & SECURED IN ESCROW'
                            : 'FUNDS PENDING VERIFICATION',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              if (lockedFunds > 0 || releasedFunds > 0) ...[
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    if (lockedFunds > 0)
                      Text(
                        'Locked: ${_formatCurrency(lockedFunds)}',
                        style: const TextStyle(
                          fontSize: 10,
                          color: Colors.white70,
                        ),
                      ),
                    if (releasedFunds > 0)
                      Text(
                        'Released: ${_formatCurrency(releasedFunds)}',
                        style: const TextStyle(
                          fontSize: 10,
                          color: Colors.white70,
                        ),
                      ),
                  ],
                ),
              ],
              const SizedBox(height: 12),
              Container(
                height: 44,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: Colors.white,
                  border:
                      Border.all(color: ink, width: 3),
                ),
                child: const Text(
                  'VIEW SMART CONTRACT',
                  style: TextStyle(
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _section(String text) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          text,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 6),
        Container(height: 3, width: 40, color: ink),
      ],
    );
  }

  Widget _projectInfo() {
    final category = _project?['category']?.toString() ?? '';
    final deadline = _project?['deadline']?.toString();
    final proposalCount = _project?['proposal_count'] ?? 0;
    final billingType = _project?['billing_type']?.toString() ?? 'fixed';
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: ink, width: 3),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (category.isNotEmpty) ...[
            Row(
              children: [
                const Icon(Icons.category, size: 16, color: muted),
                const SizedBox(width: 8),
                Text(
                  'Category: $category',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
          ],
          if (deadline != null) ...[
            Row(
              children: [
                const Icon(Icons.calendar_today, size: 16, color: muted),
                const SizedBox(width: 8),
                Text(
                  'Deadline: $deadline',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
          ],
          Row(
            children: [
              const Icon(Icons.people, size: 16, color: muted),
              const SizedBox(width: 8),
              Text(
                'Proposals: $proposalCount',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.payment, size: 16, color: muted),
              const SizedBox(width: 8),
              Text(
                'Billing: ${billingType.toUpperCase()}',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  bool _hasSkills() {
    final skills = _project?['skills_required'];
    if (skills == null) return false;
    if (skills is List) return skills.isNotEmpty;
    if (skills is String) return skills.trim().isNotEmpty;
    return false;
  }

  Widget _skills() {
    final skills = _project?['skills_required'];
    List<String> skillsList = [];
    
    if (skills != null) {
      if (skills is List) {
        skillsList = skills
            .where((e) => e != null)
            .map((e) => e.toString().toUpperCase())
            .toList();
      } else if (skills is String) {
        skillsList = skills
            .split(',')
            .map((e) => e.trim().toUpperCase())
            .where((e) => e.isNotEmpty)
            .toList();
      }
    }
    
    if (skillsList.isEmpty) {
      return const Text(
        'No specific skills required',
        style: TextStyle(
          fontSize: 13,
          color: muted,
        ),
      );
    }
    
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: skillsList.map((skill) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: ink, width: 2),
          ),
          child: Text(
            skill,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _description() {
    final description = _project?['description']?.toString() ?? 
        'No description available for this project.';
    return Text(
      description,
      style: const TextStyle(
        fontSize: 14,
        height: 1.5,
        color: ink,
      ),
    );
  }

  Widget _milestone(
      int index, String title, String subtitle, bool active) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: active ? Colors.white : Colors.grey.shade200,
        border:
            Border.all(color: ink, width: 3),
      ),
      child: Row(
        children: [
          Container(
            width: 28,
            height: 28,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: active ? ink : muted,
              border:
                  Border.all(color: ink, width: 3),
            ),
            child: Text(
              '$index',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    color: muted,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _applyButton() {
    return GestureDetector(
      onTap: () {
        // TODO: Navigate to submit proposal screen
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Submit proposal functionality coming soon')),
        );
      },
      child: Stack(
        children: [
          Container(
            margin: const EdgeInsets.only(left: 6, top: 6),
            height: 56,
            color: ink,
          ),
          Container(
            height: 56,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: primary,
              border:
                  Border.all(color: ink, width: 3),
            ),
            child: const Text(
              'APPLY FOR PROJECT',
              style: TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
