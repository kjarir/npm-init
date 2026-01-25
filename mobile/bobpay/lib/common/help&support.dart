import 'package:flutter/material.dart';
import 'package:bobpay/common/notifications.dart';

class HelpCenter extends StatelessWidget {
  const HelpCenter({super.key});

  static const bg = Color(0xFFFAF8F5);
  static const ink = Color(0xFF1A1F2E);
  static const primary = Color(0xFFE07A4E);
  static const muted = Color(0xFF8A8A8A);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: Column(
          children: [
            _topBar(context),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _searchBar(),
                    const SizedBox(height: 28),
                    const Text(
                      'FAQ CATEGORIES',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.2,
                        color: primary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _category(
                      icon: Icons.rocket_launch,
                      title: 'GETTING STARTED',
                    ),
                    _category(
                      icon: Icons.sync_alt,
                      title: 'PAYMENTS & ESCROW',
                    ),
                    _category(
                      icon: Icons.gavel,
                      title: 'DISPUTE RESOLUTION',
                    ),
                    _category(
                      icon: Icons.shield,
                      title: 'ACCOUNT SECURITY',
                    ),
                    const SizedBox(height: 32),
                    Container(
                      height: 3,
                      color: Colors.black12,
                    ),
                    const SizedBox(height: 24),
                    _primaryButton(
                      icon: Icons.headset_mic,
                      label: 'CHAT WITH SUPPORT',
                    ),
                    const SizedBox(height: 12),
                    _outlineButton(
                      icon: Icons.mail,
                      label: 'EMAIL US',
                    ),
                  ],
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
          const Text(
            'HELP CENTER',
            style: TextStyle(
              fontSize: 16,
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

  Widget _searchBar() {
    return Stack(
      children: [
        Container(
          margin: const EdgeInsets.only(left: 5, top: 5),
          height: 52,
          color: ink,
        ),
        Container(
          height: 52,
          margin: const EdgeInsets.only(left: 0, top: 0, right: 5),
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: ink, width: 3),
          ),
          child: Row(
            children: const [
              Icon(Icons.search, size: 20),
              SizedBox(width: 10),
              Text(
                'SEARCH TOPICS',
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

  Widget _category({
    required IconData icon,
    required String title,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Stack(
        children: [
          Container(
            margin: const EdgeInsets.only(left: 6, top: 6),
            height: 64,
            color: ink,
          ),
          Container(
            height: 64,
            margin: const EdgeInsets.only(left: 0, top: 0, right: 6),
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: ink, width: 3),
            ),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: primary,
                    border: Border.all(color: ink, width: 3),
                  ),
                  child: Icon(icon,
                      color: Colors.white, size: 18),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                const Icon(Icons.chevron_right),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _primaryButton({
    required IconData icon,
    required String label,
  }) {
    return Stack(
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
            border: Border.all(color: ink, width: 3),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: Colors.white),
              const SizedBox(width: 8),
              Text(
                label,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.8,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _outlineButton({
    required IconData icon,
    required String label,
  }) {
    return Container(
      height: 56,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: ink, width: 3),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon),
          const SizedBox(width: 8),
          Text(
            label,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w900,
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
        border: Border.all(color: HelpCenter.ink, width: 3),
      ),
      child: Icon(icon, size: 18),
    );
  }
}
