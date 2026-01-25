import 'dart:async';
import 'package:flutter/material.dart';
import 'package:bobpay/common/role_based_navigation.dart';
import 'package:bobpay/services/device_approval_service.dart';
import 'package:bobpay/services/login_service.dart';

class DeviceApprovalPendingPage extends StatefulWidget {
  final Map<String, dynamic> challenge;

  const DeviceApprovalPendingPage({
    super.key,
    required this.challenge,
  });

  @override
  State<DeviceApprovalPendingPage> createState() => _DeviceApprovalPendingPageState();
}

class _DeviceApprovalPendingPageState extends State<DeviceApprovalPendingPage> {
  static const bg = Color(0xFF0F172A);
  static const card = Color(0xFF111827);
  static const primary = Color(0xFF6366F1);
  static const success = Color(0xFF10B981);
  static const danger = Color(0xFFEF4444);
  static const muted = Color(0xFF94A3B8);

  StreamSubscription<List<Map<String, dynamic>>>? _subscription;
  Timer? _expiryTimer;
  String _status = 'pending';

  @override
  void initState() {
    super.initState();
    _subscribe();
    _startExpiryTimer();
  }

  @override
  void dispose() {
    _subscription?.cancel();
    _expiryTimer?.cancel();
    super.dispose();
  }

  void _subscribe() {
    final challengeId = widget.challenge['id']?.toString();
    if (challengeId == null || challengeId.isEmpty) return;
    _subscription = DeviceApprovalService.watchChallengeById(
      challengeId: challengeId,
    ).listen((rows) async {
      if (rows.isEmpty) return;
      final row = rows.first;
      final status = row['status']?.toString() ?? 'pending';
      if (!mounted) return;
      setState(() {
        _status = status;
      });

      if (status == 'approved') {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Device approved. Logging you in...'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => const RoleBasedNavigation()),
          (_) => false,
        );
      } else if (status == 'denied' || status == 'expired') {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(status == 'denied'
                ? 'Device access denied.'
                : 'Request expired. Please login again.'),
            backgroundColor: Colors.red,
          ),
        );
        await LoginService.logout();
        if (!mounted) return;
        Navigator.pop(context);
      }
    });
  }

  void _startExpiryTimer() {
    final expiresAt = widget.challenge['expires_at']?.toString();
    if (expiresAt == null || expiresAt.isEmpty) return;
    final expiry = DateTime.tryParse(expiresAt);
    if (expiry == null) return;
    _expiryTimer = Timer.periodic(const Duration(seconds: 10), (_) async {
      if (!mounted) return;
      if (_status != 'pending') return;
      if (DateTime.now().isAfter(expiry)) {
        setState(() {
          _status = 'expired';
        });
        await DeviceApprovalService.expireChallenge(
          challengeId: widget.challenge['id']?.toString() ?? '',
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final code = widget.challenge['code']?.toString().padLeft(2, '0') ?? '--';
    final expiresAt = widget.challenge['expires_at']?.toString();
    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              const SizedBox(height: 24),
              const Text(
                'DEVICE APPROVAL REQUIRED',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 24),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: card,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: primary, width: 2),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Approve this login from a trusted device',
                      style: TextStyle(color: muted),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Approval Code',
                      style: TextStyle(color: muted, fontSize: 12),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      code,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 36,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 8,
                      ),
                    ),
                    if (expiresAt != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        'Expires: $expiresAt',
                        style: const TextStyle(color: muted, fontSize: 12),
                      ),
                    ],
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        _statusChip(),
                        const SizedBox(width: 12),
                        const Text(
                          'Waiting for approval...',
                          style: TextStyle(color: muted, fontSize: 12),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () async {
                    await LoginService.logout();
                    if (!mounted) return;
                    Navigator.pop(context);
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: muted),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: const Text('Cancel & Logout'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _statusChip() {
    Color color;
    String label;
    switch (_status) {
      case 'approved':
        color = success;
        label = 'APPROVED';
        break;
      case 'denied':
        color = danger;
        label = 'DENIED';
        break;
      case 'expired':
        color = danger;
        label = 'EXPIRED';
        break;
      default:
        color = primary;
        label = 'PENDING';
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w800,
          fontSize: 10,
        ),
      ),
    );
  }
}
