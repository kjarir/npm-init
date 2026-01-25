import 'package:flutter/material.dart';

class NotificationsPage extends StatelessWidget {
  const NotificationsPage({super.key});

  static const bg = Color(0xFFFAF8F5);
  static const ink = Color(0xFF1A1F2E);
  static const primary = Color(0xFFF06542);
  static const blue = Color(0xFF1F3F96);
  static const green = Color(0xFF2FB344);
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
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: const [
                    _NotificationCard(
                      icon: Icons.lock,
                      iconColor: primary,
                      title: 'Escrow Funded',
                      message:
                          'Funds for “DEX UI Redesign” have been successfully locked in escrow.',
                      time: '2 mins ago',
                      unread: true,
                    ),
                    _NotificationCard(
                      icon: Icons.chat_bubble,
                      iconColor: blue,
                      title: 'New Message',
                      message:
                          'Alice sent you a message regarding milestone approval.',
                      time: '1 hour ago',
                      unread: true,
                    ),
                    _NotificationCard(
                      icon: Icons.check_circle,
                      iconColor: green,
                      title: 'Milestone Approved',
                      message:
                          'Milestone 2 for “Smart Contract Audit” has been approved.',
                      time: 'Yesterday',
                    ),
                    _NotificationCard(
                      icon: Icons.warning,
                      iconColor: primary,
                      title: 'Action Required',
                      message:
                          'Please submit deliverables for “NFT Landscape Design”.',
                      time: 'Oct 24',
                    ),
                    _NotificationCard(
                      icon: Icons.person,
                      iconColor: blue,
                      title: 'Profile Verified',
                      message:
                          'Your freelancer profile has been successfully verified.',
                      time: 'Oct 20',
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
        border: Border(bottom: BorderSide(color: ink, width: 3)),
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: const Icon(Icons.arrow_back),
          ),
          const Spacer(),
          const Text(
            'NOTIFICATIONS',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
            ),
          ),
          const Spacer(),
        ],
      ),
    );
  }
}

class _NotificationCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String message;
  final String time;
  final bool unread;

  const _NotificationCard({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.message,
    required this.time,
    this.unread = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Stack(
        children: [
          Container(
            margin: const EdgeInsets.only(left: 6, top: 6),
            height: 96,
            color: NotificationsPage.ink,
          ),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: unread
                  ? Colors.white
                  : Colors.grey.shade100,
              border: Border.all(
                  color: NotificationsPage.ink, width: 3),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: iconColor,
                    border: Border.all(
                        color: NotificationsPage.ink, width: 3),
                  ),
                  child: Icon(icon,
                      color: Colors.white, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment:
                        CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              title,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                          if (unread)
                            Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color:
                                    NotificationsPage.primary,
                                shape: BoxShape.circle,
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        message,
                        style: const TextStyle(
                          fontSize: 13,
                          height: 1.4,
                          color:
                              NotificationsPage.muted,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        time,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color:
                              NotificationsPage.muted,
                        ),
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
}
