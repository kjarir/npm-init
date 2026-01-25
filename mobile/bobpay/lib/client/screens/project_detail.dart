import 'package:flutter/material.dart';

class ProjectDetailsPage extends StatelessWidget {
  const ProjectDetailsPage({super.key});

  static const navy = Color(0xFF1A1F2E);
  static const cream = Color(0xFFF7F5F0);
  static const bgLight = Color(0xFFFAF8F5);
  static const primary = Color(0xFFF06542);
  static const green = Color(0xFF2D8659);
  static const muted = Color(0xFFD1CED6);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: bgLight,
      body: SafeArea(
        child: Column(
          children: [
            _topBar(),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.only(left: 16, right: 16, top: 16, bottom: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _heroCard(),
                    const SizedBox(height: 32),
                    _timelineSection(),
                    const SizedBox(height: 32),
                    _deliverables(),
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
        color: bgLight,
        border: Border(bottom: BorderSide(color: navy, width: 3)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: const [
              Icon(Icons.arrow_back, size: 22),
              SizedBox(width: 8),
              Text(
                'PROJECT DETAILS',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -0.3,
                ),
              ),
            ],
          ),
          Row(
            children: const [
              Icon(Icons.account_balance_wallet_outlined),
              SizedBox(width: 14),
              Icon(Icons.more_vert),
            ],
          ),
        ],
      ),
    );
  }

  Widget _heroCard() {
    return Stack(
      children: [
        Container(
          margin: const EdgeInsets.only(left: 10, top: 10),
          height: 300,
          width: double.infinity,
          color: navy,
        ),
        Container(
          height: 300,
          margin: const EdgeInsets.only(left: 0, top: 0, right: 10),
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: Color.fromARGB(255, 100, 100, 100),
            border: Border.all(color: navy, width: 3),
          ),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
              const Text(
                'STATUS: IN PROGRESS',
                style: TextStyle(
                  color: primary,
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'PROJECT: UI DESIGN\nSYSTEM',
                style: TextStyle(
                  color: cream,
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  height: 1.05,
                ),
              ),
              const SizedBox(height: 20),
              _heroRow('CLIENT', 'ACME CORP'),
              _heroRow('TOTAL ESCROW', '2.5 BobCoins'),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  border: Border.all(color: navy, width: 3),
                  color: Colors.white.withOpacity(0.08),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: const [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'ESCROW CONTRACT',
                          style: TextStyle(
                            fontSize: 10,
                            color: Colors.white54,
                            letterSpacing: 0.8,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          '0x71C...89ab',
                          style: TextStyle(
                            fontSize: 12,
                            color: cream,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                    Icon(Icons.open_in_new, color: cream, size: 16),
                  ],
                ),
              ),
            ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _heroRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: Colors.white54,
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              color: cream,
              fontSize: 14,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }

  Widget _timelineSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: const [
            Icon(Icons.reorder),
            SizedBox(width: 8),
            Text(
              'MILESTONE TIMELINE',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w900,
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        Stack(
          children: [
            Positioned(
              left: 13,
              top: 0,
              bottom: 0,
              child: Container(width: 3, color: navy),
            ),
            Column(
              children: [
                _timelineItem(
                  icon: Icons.check,
                  bg: green,
                  title: 'PROJECT INITIATION',
                  subtitle: 'Funds Released · 0.5 BobCoins',
                  badge: 'DONE',
                  badgeColor: green,
                ),
                _timelineActive(),
                _timelineItem(
                  icon: Icons.lock,
                  bg: muted,
                  title: 'FINAL HANDOFF',
                  subtitle: 'Upcoming · 1.0 BobCoins Locked',
                  faded: true,
                ),
              ],
            ),
          ],
        ),
      ],
    );
  }

  Widget _timelineItem({
    required IconData icon,
    required Color bg,
    required String title,
    required String subtitle,
    String? badge,
    Color? badgeColor,
    bool faded = false,
  }) {
    final textColor = faded ? Colors.black38 : navy;

    return Padding(
      padding: const EdgeInsets.only(left: 12, bottom: 28),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: bg,
              border: Border.all(color: navy, width: 3),
            ),
            child: Icon(icon, color: Colors.white, size: 20),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          color: textColor,
                        ),
                      ),
                    ),
                    if (badge != null)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          border: Border.all(color: badgeColor!, width: 2),
                          color: badgeColor!.withOpacity(0.1),
                        ),
                        child: Text(
                          badge,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            color: badgeColor,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: textColor.withOpacity(0.6),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _timelineActive() {
    return Padding(
      padding: const EdgeInsets.only(left: 12, bottom: 28),
      child: Column(
        children: [
          _timelineItem(
            icon: Icons.bolt,
            bg: primary,
            title: 'V1 PROTOTYPES',
            subtitle: 'Active · 1.0 BobCoins Pending',
            badge: 'ACTIVE',
            badgeColor: primary,
          ),
          Stack(
            children: [
              Container(
                margin: const EdgeInsets.only(left: 4, top: 4),
                height: 52,
                color: navy,
              ),
              Container(
                height: 52,
                decoration: BoxDecoration(
                  color: primary,
                  border: Border.all(color: navy, width: 3),
                ),
                child: const Center(
                  child: Text(
                    'RELEASE FUNDS',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.6,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _deliverables() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: const [
            Icon(Icons.inventory_2),
            SizedBox(width: 8),
            Text(
              'DELIVERABLES',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w900,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Stack(
          children: [
            Container(
              margin: const EdgeInsets.only(left: 4, top: 4),
              height: 170,
              color: navy,
            ),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: navy, width: 3),
              ),
              child: Column(
                children: [
                  _deliverable(true, 'COMPONENT LIBRARY',
                      'React & Figma sources'),
                  _deliverable(false, 'DOCUMENTATION SITE',
                      'Using Docusaurus'),
                  _deliverable(false, 'ASSET EXPORT PACKAGE',
                      'SVG, PNG, WebP variants'),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _deliverable(bool done, String title, String subtitle) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        children: [
          Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(
              color: done ? green : Colors.white,
              border: Border.all(color: navy, width: 3),
            ),
            child:
                done ? const Icon(Icons.check, size: 16, color: Colors.white) : null,
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                ),
              ),
              Text(
                subtitle,
                style: const TextStyle(
                  fontSize: 12,
                  color: Colors.black54,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  
}

