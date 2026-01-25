import 'package:flutter/material.dart';
import 'package:bobpay/services/project_service.dart';
import 'package:bobpay/services/wallet_service.dart';
import 'package:bobpay/freelancer/project_detail.dart';
import 'package:bobpay/freelancer/submit_proposal.dart';
import 'package:bobpay/services/login_service.dart';

class BrowseProjectsFreelancer extends StatefulWidget {
  const BrowseProjectsFreelancer({super.key});

  @override
  State<BrowseProjectsFreelancer> createState() => _BrowseProjectsFreelancerState();
}

class _BrowseProjectsFreelancerState extends State<BrowseProjectsFreelancer> {
  static const bg = Color(0xFFFAF8F5);

  List<Map<String, dynamic>> _projects = [];
  bool _isLoading = true;
  String? _error;
  String? _userRole;
  bool _isCheckingRole = true;

  @override
  void initState() {
    super.initState();
    _checkRoleAndFetch();
  }

  Future<void> _checkRoleAndFetch() async {
    final profile = await LoginService.getCurrentProfile();
    final role = (profile?['role'] as String?)?.trim().toLowerCase();
    
    setState(() {
      _userRole = role;
      _isCheckingRole = false;
    });

    if (role == 'freelancer') {
      _fetchProjects();
    } else if (role == 'client') {
      // Redirect clients away from this page
      if (mounted) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          Navigator.of(context).pop();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('This page is only available for freelancers'),
              backgroundColor: Colors.red,
            ),
          );
        });
      }
    }
  }

  Future<void> _fetchProjects() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final result = await ProjectService.getAllAvailableProjects();

      setState(() {
        if (result['success'] == true) {
          final projects = result['projects'] ?? [];
          _projects = List<Map<String, dynamic>>.from(projects);
          debugPrint('✅ [BROWSE] Loaded ${_projects.length} projects into UI');
          
          // Log project details for debugging
          if (_projects.isNotEmpty) {
            debugPrint('📋 [BROWSE] First project: ${_projects.first['title']} (status: ${_projects.first['status']})');
          }
        } else {
          _error = result['error']?.toString() ?? 'Failed to load projects';
          debugPrint('❌ [BROWSE] Error: $_error');
        }
        _isLoading = false;
      });
    } catch (e, stackTrace) {
      debugPrint('❌ [BROWSE] Exception in _fetchProjects: $e');
      debugPrint('❌ [BROWSE] Stack: $stackTrace');
      setState(() {
        _error = 'Unexpected error: $e';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    // Show loading while checking role
    if (_isCheckingRole) {
      return Scaffold(
        backgroundColor: bg,
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if ((_userRole ?? '').toLowerCase() != 'freelancer') {
      return Scaffold(
        backgroundColor: bg,
        body: SafeArea(
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 64, color: Colors.red),
                const SizedBox(height: 16),
                const Text(
                  'Access Denied',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'This page is only available for freelancers',
                  style: TextStyle(color: Color(0xFF8A8A8A)),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: RefreshIndicator(
                onRefresh: _fetchProjects,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const _SearchBar(),
                      const SizedBox(height: 12),
                      const _FilterBar(),
                      const SizedBox(height: 24),
                      const _SectionTitle(),
                      const SizedBox(height: 16),
                      if (_isLoading)
                        const Padding(
                          padding: EdgeInsets.all(32.0),
                          child: CircularProgressIndicator(),
                        )
                      else if (_error != null)
                        Padding(
                          padding: const EdgeInsets.all(32.0),
                          child: Column(
                            children: [
                              Text(
                                _error!,
                                style: const TextStyle(color: Colors.red),
                              ),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                onPressed: _fetchProjects,
                                child: const Text('Retry'),
                              ),
                            ],
                          ),
                        )
                      else if (_projects.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(32.0),
                          child: Text('No projects available'),
                        )
                      else
                        ..._projects.map((project) => _ProjectCard(
                              project: project,
                              onViewDetails: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => ProjectDetailsFreelancer(
                                      project: project,
                                    ),
                                  ),
                                );
                              },
                            )),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SearchBar extends StatelessWidget {
  static const _ink = Color(0xFF1A1F2E);
  
  const _SearchBar();

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Container(
          margin: const EdgeInsets.only(left: 5, top: 5),
          height: 52,
          color: _ink,
        ),
        Container(
          height: 52,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(
                color: _ink, width: 3),
          ),
          child: Row(
            children: const [
              Icon(Icons.search),
              SizedBox(width: 10),
              Text(
                'SEARCH PROJECTS (E.G. UI DESIGN)',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: Colors.black38,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _FilterBar extends StatelessWidget {
  static const _ink = Color(0xFF1A1F2E);
  
  const _FilterBar();

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Container(
          margin: const EdgeInsets.only(left: 5, top: 5),
          height: 48,
          color: _ink,
        ),
        Container(
          height: 48,
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(
                color: _ink, width: 3),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: const [
              Icon(Icons.tune),
              SizedBox(width: 8),
              Text(
                'FILTER PROJECTS',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  static const _primary = Color(0xFFF06542);
  
  const _SectionTitle();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 4,
          height: 18,
          color: _primary,
        ),
        const SizedBox(width: 10),
        const Text(
          'OPEN OPPORTUNITIES',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w900,
          ),
        ),
      ],
    );
  }
}

class _ProjectCard extends StatelessWidget {
  final Map<String, dynamic> project;
  final VoidCallback onViewDetails;

  static const _ink = Color(0xFF1A1F2E);
  static const _primary = Color(0xFFF06542);
  static const _muted = Color(0xFF8A8A8A);
  static const _star = Color(0xFFF5B301);

  const _ProjectCard({
    required this.project,
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

  @override
  Widget build(BuildContext context) {
    final title = project['title']?.toString() ?? 'Untitled Project';
    // Use total_budget from schema
    final budget = project['total_budget'] ?? 0;
    final description = project['description']?.toString() ?? 'No description available';
    final status = project['status']?.toString() ?? 'draft';
    final category = project['category']?.toString() ?? '';
    final billingType = project['billing_type']?.toString() ?? 'fixed';
    final hourlyRate = project['hourly_rate'];
    final deadline = project['deadline']?.toString();
    final proposalCount = project['proposal_count'] ?? 0;
    
    // Extract tags/skills from skills_required array (schema field)
    List<String> tags = [];
    if (project['skills_required'] != null) {
      if (project['skills_required'] is List) {
        tags = (project['skills_required'] as List)
            .where((e) => e != null)
            .map((e) => e.toString().toUpperCase())
            .toList();
      } else if (project['skills_required'] is String) {
        tags = (project['skills_required'] as String)
            .split(',')
            .map((e) => e.trim().toUpperCase())
            .where((e) => e.isNotEmpty)
            .toList();
      }
    }
    
    // Add category to tags if available
    if (category.isNotEmpty && !tags.contains(category.toUpperCase())) {
      tags.insert(0, category.toUpperCase());
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: IntrinsicHeight(
        child: Stack(
          children: [
            Positioned.fill(
              child: Container(
                margin: const EdgeInsets.only(left: 6, top: 6),
                color: _ink,
              ),
            ),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(
                    color: _ink, width: 3),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      color: _primary,
                      child: Text(
                        _formatCurrency(budget),
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    const Icon(Icons.star,
                        size: 16,
                        color: _star),
                    const SizedBox(width: 4),
                    Text(
                      proposalCount > 0 ? '$proposalCount proposals' : 'New',
                      style: const TextStyle(
                          fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '($status)',
                      style: const TextStyle(
                        fontSize: 12,
                        color: _muted,
                      ),
                    ),
                  ],
                ),
                if (billingType == 'hourly' && hourlyRate != null) ...[
                  const SizedBox(height: 6),
                  Text(
                    'Hourly: ${_formatCurrency(hourlyRate)}/hr',
                    style: const TextStyle(
                      fontSize: 11,
                      color: _muted,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ] else if (billingType == 'fixed') ...[
                  const SizedBox(height: 6),
                  Text(
                    'Fixed Price',
                    style: const TextStyle(
                      fontSize: 11,
                      color: _muted,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
                if (deadline != null) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.calendar_today, size: 12, color: _muted),
                      const SizedBox(width: 4),
                      Text(
                        'Deadline: $deadline',
                        style: const TextStyle(
                          fontSize: 10,
                          color: _muted,
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 12),
                Text(
                  description,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    color: _muted,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 14),
                if (tags.isNotEmpty)
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: tags
                        .map(
                          (t) => Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              border: Border.all(
                                  color:
                                      _ink,
                                  width: 2),
                            ),
                            child: Text(
                              t,
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                        )
                        .toList(),
                  ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: onViewDetails,
                        child: _outlineBtn('VIEW DETAILS'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => SubmitProposal(
                                project: project,
                              ),
                            ),
                          );
                        },
                        child: _primaryBtn('SUBMIT PROPOSAL'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          ],
        ),
      ),
    );
  }

  Widget _outlineBtn(String text) {
    return Container(
      height: 44,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(
            color: _ink, width: 3),
      ),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }

  Widget _primaryBtn(String text) {
    return Stack(
      children: [
        Container(
          margin: const EdgeInsets.only(left: 4, top: 4),
          height: 44,
          color: _ink,
        ),
        Container(
          height: 44,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: _primary,
            border: Border.all(
                color: _ink, width: 3),
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
    );
  }
}
