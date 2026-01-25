import 'dart:async';
import 'package:flutter/material.dart';
import 'package:bobpay/services/login_service.dart';
import 'package:bobpay/services/device_approval_service.dart';
import 'package:bobpay/services/supabase_client.dart';
import 'package:bobpay/common/profile.dart';
import 'package:bobpay/client/screens/client_dashboard.dart' show ClientDashboard, dashboardKey;
import 'package:bobpay/client/screens/project_detail.dart';
import 'package:bobpay/client/screens/browse_freelancers.dart';
import 'package:bobpay/freelancer/browse_project.dart';

/// Role-based navigation that shows different screens based on user role
class RoleBasedNavigation extends StatefulWidget {
  const RoleBasedNavigation({super.key});

  @override
  State<RoleBasedNavigation> createState() => _RoleBasedNavigationState();
}

class _RoleBasedNavigationState extends State<RoleBasedNavigation> {
  int _currentIndex = 0;
  String? _userRole;
  bool _isLoading = true;
  StreamSubscription<List<Map<String, dynamic>>>? _challengeSub;
  bool _challengeDialogOpen = false;
  Timer? _challengePoller;

  @override
  void initState() {
    super.initState();
    _loadUserRole();
  }

  @override
  void dispose() {
    _challengeSub?.cancel();
    _challengePoller?.cancel();
    super.dispose();
  }


  Future<void> _loadUserRole() async {
    final profile = await LoginService.getCurrentProfile();
    final role = (profile?['role'] as String?)?.trim().toLowerCase();
    setState(() {
      _userRole = role;
      _isLoading = false;
      if (role == 'freelancer') _currentIndex = 2;
    });
    _startChallengeListener();
  }

  void _startChallengeListener() {
    final userId = SupabaseService.client.auth.currentUser?.id;
    if (userId == null) return;
    _challengeSub?.cancel();
    _challengeSub = DeviceApprovalService.watchPendingChallenges(userId: userId).listen((rows) {
      if (rows.isEmpty || _challengeDialogOpen) return;
      final challenge = rows.first;
      _showChallengeDialog(challenge);
    });

    _challengePoller?.cancel();
    _challengePoller = Timer.periodic(const Duration(seconds: 10), (_) async {
      if (_challengeDialogOpen) return;
      final pending = await DeviceApprovalService.getPendingChallenges(userId: userId);
      if (pending.isNotEmpty) {
        _showChallengeDialog(pending.first);
      }
    });
  }

  void _showChallengeDialog(Map<String, dynamic> challenge) {
    final code = challenge['code']?.toString() ?? '------';
    final summary = challenge['new_device_summary'] as Map<String, dynamic>? ?? {};
    final deviceLabel = [
      summary['brand'],
      summary['model'],
      summary['os_version'],
    ].where((e) => e != null && e.toString().trim().isNotEmpty).join(' • ');

    _challengeDialogOpen = true;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return AlertDialog(
          title: const Text('Approve New Device'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('A new device is requesting access with code:'),
              const SizedBox(height: 8),
              Text(
                code,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                ),
              ),
              if (deviceLabel.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  deviceLabel,
                  style: const TextStyle(fontSize: 12, color: Colors.black54),
                ),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: () async {
                await DeviceApprovalService.denyChallenge(
                  challengeId: challenge['id']?.toString() ?? '',
                );
                if (mounted) {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Device request denied'),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
                _challengeDialogOpen = false;
              },
              child: const Text('Deny'),
            ),
            TextButton(
              onPressed: () async {
                await DeviceApprovalService.approveChallenge(
                  challengeId: challenge['id']?.toString() ?? '',
                );
                if (mounted) {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Device approved'),
                      backgroundColor: Colors.green,
                    ),
                  );
                }
                _challengeDialogOpen = false;
              },
              child: const Text('Approve'),
            ),
          ],
        );
      },
    ).then((_) {
      _challengeDialogOpen = false;
    });
  }

  List<Widget> get _screens {
    final dashboard = ClientDashboard(key: dashboardKey);
    if ((_userRole ?? '').toLowerCase() == 'freelancer') {
      // Freelancer screens - non-const to support dynamic role checking
      return [
        dashboard, // Same dashboard for both
        const ProjectDetailsPage(), // Project details placeholder
        const BrowseProjectsFreelancer(), // Browse projects (search) - DIFFERENT
        const Profile(),
      ];
    } else {
      // Client screens (default) - non-const to support dynamic role checking
      return [
        dashboard, // Same dashboard for both
        const ProjectDetailsPage(),
        const BrowseFreelancer(), // Browse freelancers (search) - DIFFERENT
        const Profile(),
      ];
    }
  }

  List<String> get _labels {
    // Same labels for both roles
    return [
      'HOME',
      'PROJECT',
      'SEARCH',
      'PROFILE',
    ];
  }

  List<IconData> get _icons {
    // Same icons for both roles
    return [
      Icons.grid_view,
      Icons.folder_outlined,
      Icons.search,
      Icons.person_outline,
    ];
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
        height: 70,
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 4,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: List.generate(
                _screens.length,
                (index) => GestureDetector(
                  onTap: () {
                    setState(() {
                      _currentIndex = index;
                    });
                    // Refresh dashboard when switching back to it
                    if (index == 0 && dashboardKey.currentState != null) {
                      WidgetsBinding.instance.addPostFrameCallback((_) {
                        dashboardKey.currentState!.refreshDashboard();
                      });
                    }
                  },
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _icons[index],
                        color: _currentIndex == index 
                            ? const Color(0xFFE36F4C) 
                            : const Color(0xFF757575),
                        size: 24,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _labels[index],
                        style: TextStyle(
                          color: _currentIndex == index 
                              ? const Color(0xFFE36F4C) 
                              : const Color(0xFF757575),
                          fontSize: 12,
                          fontWeight: _currentIndex == index 
                              ? FontWeight.w600 
                              : FontWeight.normal,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
