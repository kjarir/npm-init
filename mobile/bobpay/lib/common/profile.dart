import 'dart:async';
import 'package:bobpay/common/active_contracts.dart';
import 'package:flutter/material.dart';
import 'package:bobpay/services/login_service.dart';
import 'package:bobpay/services/wallet_service.dart';
import 'package:bobpay/common/edit_profile.dart';
import 'package:bobpay/client/screens/client_wallet.dart';
import 'package:bobpay/freelancer/active_proposals.dart';
import 'package:bobpay/common/security_password.dart';
import 'package:bobpay/common/help&support.dart';
import 'package:bobpay/auth/login.dart';
import 'package:bobpay/common/notifications.dart';
import 'package:bobpay/services/device_approval_service.dart';

class Profile extends StatefulWidget {
  const Profile({super.key});

  @override
  State<Profile> createState() => _ProfileState();
}

class _ProfileState extends State<Profile> {
  static const bg = Color(0xFFFAF8F5);
  static const ink = Color(0xFF1A1F2E);
  static const blue = Color(0xFF1F3F96);
  static const green = Color(0xFF2FB344);
  static const primary = Color(0xFFF06542);
  static const muted = Color(0xFF8A8A8A);

  Map<String, dynamic>? _profile;
  Map<String, dynamic>? _wallet;
  bool _isLoading = true;
  String? _error;
  List<Map<String, dynamic>> _pendingChallenges = [];
  bool _isLoadingChallenges = false;
  Timer? _challengePoller;

  @override
  void initState() {
    super.initState();
    _fetchProfileData();
    _fetchPendingChallenges();
    _challengePoller = Timer.periodic(const Duration(seconds: 10), (_) {
      _fetchPendingChallenges();
    });
  }

  @override
  void dispose() {
    _challengePoller?.cancel();
    super.dispose();
  }

  Future<void> _fetchProfileData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Fetch profile
      final profile = await LoginService.getCurrentProfile();
      
      // Fetch wallet
      final walletResult = await WalletService.getCurrentUserWallet();
      Map<String, dynamic>? wallet;
      if (walletResult['success'] == true) {
        wallet = walletResult['wallet'];
      }

      setState(() {
        _profile = profile;
        _wallet = wallet;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load profile: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _fetchPendingChallenges() async {
    final profile = await LoginService.getCurrentProfile();
    final userId = profile?['id']?.toString();
    if (userId == null || userId.isEmpty) return;
    setState(() {
      _isLoadingChallenges = true;
    });
    final pending = await DeviceApprovalService.getPendingChallenges(userId: userId);
    if (!mounted) return;
    setState(() {
      _pendingChallenges = pending;
      _isLoadingChallenges = false;
    });
  }

  String _getWalletSubtitle() {
    if (_wallet == null) return 'Loading...';
    final available = _wallet!['available_balance'];
    if (available == null) return '\$0.00';
    return WalletService.formatCurrency(available);
  }

  Widget _deviceApprovalCard(Map<String, dynamic> challenge) {
    final code = challenge['code']?.toString().padLeft(2, '0') ?? '--';
    final summary = challenge['new_device_summary'] as Map<String, dynamic>? ?? {};
    final deviceLabel = [
      summary['brand'],
      summary['model'],
      summary['os_version'],
    ].where((e) => e != null && e.toString().trim().isNotEmpty).join(' • ');

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: ink, width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'DEVICE APPROVAL REQUEST',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w900,
              color: muted,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Code: $code',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w900,
            ),
          ),
          if (deviceLabel.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              deviceLabel,
              style: const TextStyle(fontSize: 12, color: muted),
            ),
          ],
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () async {
                    await DeviceApprovalService.denyChallenge(
                      challengeId: challenge['id']?.toString() ?? '',
                    );
                    _fetchPendingChallenges();
                  },
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Colors.red),
                  ),
                  child: const Text('DENY'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: () async {
                    await DeviceApprovalService.approveChallenge(
                      challengeId: challenge['id']?.toString() ?? '',
                    );
                    _fetchPendingChallenges();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: green,
                  ),
                  child: const Text('APPROVE'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
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
                  : _error != null
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                _error!,
                                style: const TextStyle(color: Colors.red),
                              ),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                onPressed: _fetchProfileData,
                                child: const Text('Retry'),
                              ),
                            ],
                          ),
                        )
                      : SingleChildScrollView(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            children: [
                              _profileHeader(),
                              const SizedBox(height: 24),
                              if (_isLoadingChallenges)
                                const LinearProgressIndicator(),
                              if (_pendingChallenges.isNotEmpty) ...[
                                _deviceApprovalCard(_pendingChallenges.first),
                                const SizedBox(height: 20),
                              ],
                              _menuItem(
                                icon: Icons.settings,
                                title: 'EDIT PROFILE',
                                onTap: () async {
                                  final updated = await Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => const EditProfile(),
                                    ),
                                  );
                                  if (updated == true) {
                                    _fetchProfileData();
                                  }
                                },
                              ),
                              _menuItem(
                                icon: Icons.account_balance_wallet,
                                title: 'VIEW WALLET',
                                subtitle: _getWalletSubtitle(),
                                subtitleColor: green,
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => const ClientWallet(),
                                    ),
                                  );
                                },
                              ),
                              _menuItem(
                                icon: Icons.description,
                                title: 'MY PROPOSALS',
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => const FreelancerProposals(),
                                    ),
                                  );
                                },
                              ),
                              _menuItem(
                                icon: Icons.gavel,
                                title: 'ACTIVE CONTRACTS',
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => const ActiveContracts(),
                                    ),
                                  );
                                },
                              ),
                              _menuItem(
                                icon: Icons.lock,
                                title: 'SECURITY & PASSWORDS',
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => const SecurityPassword(),
                                    ),
                                  );
                                },
                              ),
                              _menuItem(
                                icon: Icons.help_outline,
                                title: 'HELP & SUPPORT',
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => const HelpCenter(),
                                    ),
                                  );
                                },
                              ),
                              const SizedBox(height: 36),
                              _logoutButton(),
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
        border: Border(bottom: BorderSide(color: blue, width: 3)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text(
            'MY ACCOUNT',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
              color: blue,
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
                child: const _IconBox(Icons.notifications),
              ),
              const SizedBox(width: 10),
              const _IconBox(Icons.chat_bubble),
            ],
          ),
        ],
      ),
    );
  }

  static double _reputationValue(dynamic v) {
    if (v == null) return 50;
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString()) ?? 50;
  }

  Widget _profileHeader() {
    final fullName = _profile?['full_name'] as String? ?? 'User';
    final role = _profile?['role'] as String? ?? 'client';
    final avatarUrl = _profile?['avatar_url'] as String?;
    final reputation = _reputationValue(_profile?['reputation']);

    return Row(
      children: [
        Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            color: Colors.grey.shade300,
            border: Border.all(color: blue, width: 3),
            shape: BoxShape.circle,
          ),
          child: avatarUrl != null && avatarUrl.isNotEmpty
              ? ClipOval(
                  child: Image.network(
                    avatarUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return Icon(Icons.person, color: blue, size: 36);
                    },
                  ),
                )
              : Icon(Icons.person, color: blue, size: 36),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                fullName.toUpperCase(),
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: blue,
                ),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: blue,
                      border: Border.all(color: blue, width: 2),
                    ),
                    child: Text(
                      role.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.verified,
                          size: 14, color: blue),
                      SizedBox(width: 4),
                      Text(
                        'VERIFIED',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: blue,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Icon(Icons.workspace_premium, size: 14, color: green),
                  const SizedBox(width: 4),
                  Flexible(
                    child: Text(
                      'REPUTATION ${reputation.round()}%',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: green,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _menuItem({
    required IconData icon,
    required String title,
    String? subtitle,
    Color subtitleColor = muted,
    VoidCallback? onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: GestureDetector(
        onTap: onTap,
        child: Stack(
          children: [
            Container(
              margin: const EdgeInsets.only(left: 6, top: 6),
              height: 64,
              color: blue,
            ),
            Container(
              height: 64,
              margin: const EdgeInsets.only(left: 0, top: 0, right: 6),
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: blue, width: 3),
              ),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: blue,
                      border: Border.all(color: blue, width: 2),
                    ),
                    child: Icon(icon,
                        color: Colors.white, size: 18),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w900,
                            color: blue,
                          ),
                        ),
                        if (subtitle != null)
                          const SizedBox(height: 2),
                        if (subtitle != null)
                          Text(
                            subtitle,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: subtitleColor,
                            ),
                          ),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right,
                      color: blue),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _logoutButton() {
    return GestureDetector(
      onTap: () async {
        // Show confirmation dialog
        final confirm = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Log Out'),
            content: const Text('Are you sure you want to log out?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Log Out'),
              ),
            ],
          ),
        );

        if (confirm == true) {
          await LoginService.logout();
          if (mounted) {
            Navigator.pushAndRemoveUntil(
              context,
              MaterialPageRoute(builder: (context) => const Login()),
              (route) => false,
            );
          }
        }
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
            margin: const EdgeInsets.only(left: 0, top: 0, right: 6),
            decoration: BoxDecoration(
              color: primary,
              border: Border.all(color: primary, width: 3),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: const [
                Icon(Icons.logout, color: Colors.white),
                SizedBox(width: 8),
                Text(
                  'LOG OUT',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.2,
                    color: Colors.white,
                  ),
                ),
              ],
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

  static const blue = Color(0xFF1F3F96);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: blue, width: 3),
      ),
      child: Icon(icon,
          size: 18, color: blue),
    );
  }
}
