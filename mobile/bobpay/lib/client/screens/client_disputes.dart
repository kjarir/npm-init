import 'package:flutter/material.dart';

class ClientDispute extends StatelessWidget {
  const ClientDispute({super.key});

  static const bg = Color(0xFFFAF8F5);
  static const ink = Color(0xFF1A1F2E);
  static const primary = Color(0xFFF06542);
  static const review = Color(0xFFF4A261);
  static const waiting = Color(0xFF4D7CFE);
  static const muted = Color(0xFF8A8A8A);

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
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    _DisputeCard(
                      status: 'IN REVIEW',
                      statusColor: review,
                      title: 'E-COMMERCE SMART CONTRACT',
                      meta: '#DISP-9921 | OCT 24, 2023',
                      desc:
                          'Milestone 2 payment locked. Developer claims API constraints; client disputes delivery.',
                      action: 'VIEW EVIDENCE',
                      icon: Icons.remove_red_eye,
                    ),
                    _DisputeCard(
                      status: 'AWAITING EVIDENCE',
                      statusColor: waiting,
                      title: 'MOBILE APP UI FIX',
                      meta: '#DISP-8842 | OCT 22, 2023',
                      desc:
                          'User Interface alignment issues reported on iPhone 15 Pro. Pending visual proof.',
                      action: 'UPLOAD FILES',
                      icon: Icons.cloud_upload,
                    ),
                    _DisputeCard(
                      status: 'ARBITRATION',
                      statusColor: primary,
                      title: 'BLOCKCHAIN INTEGRATION',
                      meta: '#DISP-7731 | OCT 20, 2023',
                      desc:
                          'Escrow agent reviewing network gas fee discrepancies. Final verdict pending.',
                      locked: true,
                    ),
                  ],
                ),
              ),
            ),
            _bottomAction(),
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
          Row(
            children: const [
              Icon(Icons.arrow_back),
              SizedBox(width: 8),
              Text(
                'ACTIVE DISPUTES',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: primary,
              border: Border.all(color: ink, width: 3),
            ),
            child: const Icon(Icons.help, color: Colors.black),
          ),
        ],
      ),
    );
  }

  Widget _bottomAction() {
    return Stack(
      children: [
        Container(
          margin: const EdgeInsets.only(left: 6, top: 6),
          height: 64,
          color: ink,
        ),
        Container(
          height: 64,
          decoration: BoxDecoration(
            color: primary,
            border: Border.all(color: ink, width: 3),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: const [
              Icon(Icons.add, color: Colors.black),
              SizedBox(width: 8),
              Text(
                'FILE NEW DISPUTE',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _DisputeCard extends StatelessWidget {
  final String status;
  final Color statusColor;
  final String title;
  final String meta;
  final String desc;
  final String? action;
  final IconData? icon;
  final bool locked;

  const _DisputeCard({
    required this.status,
    required this.statusColor,
    required this.title,
    required this.meta,
    required this.desc,
    this.action,
    this.icon,
    this.locked = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Stack(
        children: [
          Container(
            margin: const EdgeInsets.only(left: 6, top: 6),
            height: 250,
            color: ClientDispute.ink,
          ),
          Container(
            height: 250,
            margin: const EdgeInsets.only(left: 0, top: 0, right: 6),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              border:
                  Border.all(color: ClientDispute.ink, width: 3),
            ),
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    color: statusColor,
                    child: Text(
                      status,
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    meta,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: ClientDispute.muted,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade300,
                          border: Border.all(
                              color: ClientDispute.ink, width: 3),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          desc,
                          style: const TextStyle(
                            fontSize: 13,
                            height: 1.3,
                            color: ClientDispute.muted,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _action(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _action() {
    if (locked) {
      return Container(
        height: 44,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Colors.grey.shade200,
          border:
              Border.all(color: ClientDispute.ink, width: 2),
        ),
        child: const Text(
          'LOCKED VIEW',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w900,
            color: Colors.grey,
          ),
        ),
      );
    }

    return Container(
      height: 44,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Colors.white,
        border:
            Border.all(color: ClientDispute.ink, width: 3),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 18),
          const SizedBox(width: 8),
          Text(
            action!,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}
