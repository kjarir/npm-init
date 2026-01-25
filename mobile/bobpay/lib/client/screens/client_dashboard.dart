import 'package:flutter/material.dart';
import 'package:bobpay/services/project_service.dart';
import 'package:bobpay/services/wallet_service.dart';
import 'package:bobpay/common/notifications.dart';
import 'package:bobpay/services/login_service.dart';
import 'package:bobpay/client/screens/edit_project.dart';
import 'package:bobpay/services/supabase_client.dart';
import 'package:bobpay/client/screens/project_proposals.dart';
import 'package:bobpay/services/contract_service.dart';
import 'package:bobpay/common/active_contracts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

// Global key to access dashboard state from anywhere
final GlobalKey<_ClientDashboardState> dashboardKey = GlobalKey<_ClientDashboardState>();

class ClientDashboard extends StatefulWidget {
  const ClientDashboard({super.key});

  @override
  State<ClientDashboard> createState() => _ClientDashboardState();
}

class _ClientDashboardState extends State<ClientDashboard> {
  static const bg = Color(0xFFFAF8F5);
  static const ink = Color(0xFF1A1F2E);
  static const navy = Color(0xFF24395D);
  static const orange = Color(0xFFF06542);
  static const green = Color(0xFF2D8659);
  static const muted = Color(0xFF8A8A8A);

  List<Map<String, dynamic>> _projects = [];
  List<Map<String, dynamic>> _activeContracts = [];
  int _activeProjectsCount = 0;
  double _totalEscrow = 0.0;
  bool _isLoading = true;
  String? _error;
  String? _contractsError;
  Map<String, dynamic>? _userProfile;

  @override
  void initState() {
    super.initState();
    _fetchDashboardData();
    _loadUserProfile();
    _setupRealtimeSubscription();
  }

  // Make _fetchDashboardData public so it can be called from navigation
  Future<void> refreshDashboard() => _fetchDashboardData();

  @override
  void dispose() {
    _realtimeSubscription?.unsubscribe();
    super.dispose();
  }

  RealtimeChannel? _realtimeSubscription;

  Future<void> _loadUserProfile() async {
    final profile = await LoginService.getCurrentProfile();
    setState(() {
      _userProfile = profile;
    });
  }

  void _setupRealtimeSubscription() {
    final user = SupabaseService.client.auth.currentUser;
    if (user == null) return;

    // Subscribe to projects table changes for this user
    _realtimeSubscription = SupabaseService.client
        .channel('client_projects_${user.id}')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'projects',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'client_id',
            value: user.id,
          ),
          callback: (payload) {
            debugPrint('🔄 [DASHBOARD] Real-time update received: ${payload.eventType}');
            // Refresh dashboard data when projects change
            _fetchDashboardData();
          },
        )
        .subscribe();

    debugPrint('✅ [DASHBOARD] Real-time subscription active');
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  Future<void> _fetchDashboardData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Fetch projects
      final projectsResult = await ProjectService.getClientProjects();

      // Fetch active contracts
      final contractsResult = await ContractService.getActiveContracts();
      
      // Fetch stats
      final activeCount = await ProjectService.getActiveProjectsCount();
      final totalEscrow = await ProjectService.getTotalEscrow();

      setState(() {
        if (projectsResult['success'] == true) {
          _projects = List<Map<String, dynamic>>.from(projectsResult['projects'] ?? []);
        }
        if (contractsResult['success'] == true) {
          _activeContracts = List<Map<String, dynamic>>.from(contractsResult['contracts'] ?? []);
          _contractsError = null;
        } else {
          _contractsError = contractsResult['error']?.toString();
          _activeContracts = [];
        }
        _activeProjectsCount = activeCount;
        _totalEscrow = totalEscrow;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load dashboard: $e';
        _isLoading = false;
      });
    }
  }

  String _formatCurrency(double amount) {
    return WalletService.formatCurrency(amount);
  }

  String _getStatusDisplay(String? status) {
    if (status == null) return 'DRAFT';
    switch (status.toLowerCase()) {
      case 'active':
      case 'in_progress':
        return 'IN PROGRESS';
      case 'completed':
        return 'COMPLETED';
      case 'cancelled':
        return 'CANCELLED';
      default:
        return status.toUpperCase();
    }
  }

  Color _getStatusColor(String? status) {
    if (status == null) return muted;
    switch (status.toLowerCase()) {
      case 'active':
      case 'in_progress':
        return green;
      case 'completed':
        return green;
      case 'cancelled':
        return Colors.red;
      default:
        return orange;
    }
  }

  String _getActionText(String? status) {
    if (status == null) return 'DETAILS';
    switch (status.toLowerCase()) {
      case 'active':
      case 'in_progress':
        return 'DETAILS';
      default:
        return 'DETAILS';
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
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.only(left: 16, right: 16, top: 16, bottom: 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Greeting
                    if (_userProfile != null) ...[
                      Text(
                        '${_getGreeting()}, ${_userProfile!['full_name']?.toString().split(' ').first ?? 'User'}!',
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.4,
                        ),
                      ),
                      const SizedBox(height: 8),
                    ],
                    const Text(
                      'DASHBOARD',
                      style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.4,
                      ),
                    ),
                    const SizedBox(height: 20),
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
                              onPressed: _fetchDashboardData,
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    else ...[
                      Row(
                        children: [
                          Expanded(
                            child: _statCard(
                              title: 'ACTIVE\nPROJECTS',
                              value: _activeProjectsCount.toString().padLeft(2, '0'),
                              footer: '${_projects.length} TOTAL',
                              bg: navy,
                              footerColor: green,
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: _statCard(
                              title: 'TOTAL\nESCROW',
                              value: _formatCurrency(_totalEscrow),
                              footer: 'LOCKED FUNDS',
                              bg: orange,
                              footerColor: Colors.white,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 28),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'ONGOING WORK',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          _outlineBtn(
                            'VIEW ALL',
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => const ActiveContracts(),
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      if (_activeContracts.isEmpty && _projects.isEmpty)
                        Padding(
                          padding: const EdgeInsets.all(32.0),
                          child: _contractsError != null
                              ? Text(
                                  _contractsError!,
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(color: muted),
                                )
                              : _userProfile?['role'] == 'freelancer'
                                  ? Column(
                                      children: [
                                        const Icon(Icons.search, size: 48, color: muted),
                                        const SizedBox(height: 12),
                                        const Text(
                                          'You\'re a freelancer',
                                          style: TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w900,
                                            color: ink,
                                          ),
                                        ),
                                        const SizedBox(height: 6),
                                        const Text(
                                          'Tap SEARCH below to browse open projects and submit proposals.',
                                          textAlign: TextAlign.center,
                                          style: TextStyle(color: muted, height: 1.4),
                                        ),
                                      ],
                                    )
                                  : const Text(
                                      'No projects found',
                                      style: TextStyle(color: muted),
                                    ),
                        )
                      else if (_activeContracts.isNotEmpty)
                        ..._activeContracts.take(5).map((contract) {
                          final project = contract['project'] as Map<String, dynamic>?;
                          final freelancer = contract['freelancer'] as Map<String, dynamic>?;
                          final freelancerName =
                              freelancer?['full_name'] as String? ?? 'Freelancer';
                          final amount = WalletService.formatCurrency(
                            contract['amount'] ?? project?['total_budget'],
                          );
                          final status = contract['status']?.toString();
                          final title = project?['title'] as String? ?? 'Active Contract';

                          return _workCard(
                            status: _getStatusDisplay(status),
                            statusColor: _getStatusColor(status),
                            title: title,
                            freelancer: freelancerName,
                            amount: amount,
                            action: 'DETAILS',
                            actionColor: ink,
                            showEdit: false,
                            project: project,
                            onActionTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => const ActiveContracts(),
                                ),
                              );
                            },
                          );
                        })
                      else
                        ..._projects.take(5).map((project) {
                          final freelancer = project['freelancer'] as Map<String, dynamic>?;
                          final freelancerName = freelancer?['full_name'] as String? ?? 'No Freelancer';
                          final lockedFunds = project['locked_funds'];
                          final amount = lockedFunds != null 
                              ? _formatCurrency(lockedFunds is String ? double.tryParse(lockedFunds) ?? 0.0 : (lockedFunds as num).toDouble())
                              : '\$0.00';
                          final status = project['status'] as String?;
                          
                          return _workCard(
                            status: _getStatusDisplay(status),
                            statusColor: _getStatusColor(status),
                            title: project['title'] as String? ?? 'Untitled Project',
                            freelancer: freelancerName,
                            amount: amount,
                            action: _getActionText(status),
                            actionColor: ink,
                            showEdit: true,
                            project: project,
                            onActionTap: () => _openProposals(context, project),
                          );
                        }),
                    ],
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
        color: bg,
        border: Border(bottom: BorderSide(color: ink, width: 3)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text(
            'BOBPAY',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w900,
            ),
          ),
          Row(
            children: [
              GestureDetector(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const NotificationsPage(),
                    ),
                  );
                },
                child: const _IconBox(Icons.notifications_none),
              ),
              const SizedBox(width: 10),
              const _IconBox(Icons.chat_bubble_outline),
            ],
          ),
        ],
      ),
    );
  }

  Widget _statCard({
    required String title,
    required String value,
    required String footer,
    required Color bg,
    required Color footerColor,
  }) {
    return Stack(
      alignment: Alignment.center,
      children: [
        Container(
          margin: const EdgeInsets.only(left: 6, top: 6),
          width: double.infinity,
          height: 190,
          color: ink,
        ),
        Container(
          margin: const EdgeInsets.only(left: 0, top: 0, right: 6),
          width: double.infinity,
          height: 190,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: bg,
            border: Border.all(color: ink, width: 3),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [ 
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 32,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                footer,
                style: TextStyle(
                  color: footerColor,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _workCard({
    required String status,
    required Color statusColor,
    required String title,
    required String freelancer,
    required String amount,
    required String action,
    required Color actionColor,
    required bool showEdit,
    Map<String, dynamic>? project,
    VoidCallback? onActionTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Stack(
        children: [
          Container(
            margin: const EdgeInsets.only(left: 6, top: 6),
            height: 240,
            color: ink,
          ),
          Container(
            height: 240,
            margin: const EdgeInsets.only(left: 0, top: 0, right: 6),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: ink, width: 3),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
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
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        border: Border.all(color: ink, width: 3),
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
                const SizedBox(height: 4),
                Text(
                  'Freelancer: $freelancer',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: muted,
                  ),
                ),
                const SizedBox(height: 16),
                Container(height: 2, color: Colors.black12),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'LOCKED FUNDS',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: muted,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          amount,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        if (showEdit)
                          GestureDetector(
                            onTap: () {
                              if (project == null) return;
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => EditProject(project: project),
                                ),
                              ).then((updated) {
                                if (updated == true) {
                                  _fetchDashboardData();
                                }
                              });
                            },
                            child: Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                border: Border.all(color: ink, width: 2),
                                color: Colors.white,
                              ),
                              child: const Icon(Icons.edit, size: 18),
                            ),
                          ),
                        const SizedBox(width: 8),
                        _actionBtn(
                          action,
                          actionColor,
                          onTap: onActionTap,
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _openProposals(BuildContext context, Map<String, dynamic> project) {
    final projectId = project['id']?.toString();
    final title = project['title']?.toString() ?? 'Project';
    if (projectId == null) return;

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ProjectProposalsPage(
          projectId: projectId,
          projectTitle: title,
        ),
      ),
    );
  }

  Widget _actionBtn(String text, Color color, {VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Stack(
        children: [
          Container(
            margin: const EdgeInsets.only(left: 4, top: 4),
            width: 96,
            height: 42,
            color: ink,
          ),
          Container(
            width: 96,
            height: 42,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: color,
              border: Border.all(color: ink, width: 3),
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

  Widget _outlineBtn(String text, {VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          border: Border.all(color: ink, width: 3),
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

}

class _IconBox extends StatelessWidget {
  final IconData icon;
  const _IconBox(this.icon);

  static const ink = Color(0xFF1A1F2E);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        border: Border.all(color: ink, width: 3),
        color: Colors.white,
      ),
      child: Icon(icon, size: 18),
    );
  }
}
