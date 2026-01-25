import 'package:flutter/material.dart';

class ClientMessages extends StatelessWidget {
  const ClientMessages({super.key});

  static const bg = Color(0xFFFAF8F5);
  static const ink = Color(0xFF1A1F2E);
  static const muted = Color(0xFF8A8A8A);
  static const primary = Color(0xFFF06542);

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
                  children: const [
                    _MessageCard(
                      name: 'ALICE (UI DESIGN)',
                      time: '2M AGO',
                      preview:
                          'Can you review the smart contract for the logo design? I...',
                      unread: true,
                    ),
                    _MessageCard(
                      name: 'CONTRACT #4021',
                      time: '1H AGO',
                      preview:
                          'Escrow payment has been initiated for milestone 1. Funds...',
                      system: true,
                    ),
                    _MessageCard(
                      name: 'CHARLIE (FULL STACK)',
                      time: 'YESTERDAY',
                      preview:
                          'I\'ve updated the repository with the latest fix. Please check the...',
                    ),
                    _MessageCard(
                      name: 'DAVE (BLOCKCHAIN)',
                      time: 'OCT 24',
                      preview:
                          'The gas fees look correct on the testnet. We are ready for the...',
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
            'MESSAGES',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.4,
            ),
          ),
          Row(
            children: const [
              _IconBox(Icons.search),
              SizedBox(width: 10),
              _IconBox(Icons.more_vert),
            ],
          ),
        ],
      ),
    );
  }

  Widget _composeButton() {
    return Stack(
      children: [
        Container(
          margin: const EdgeInsets.only(left: 4, top: 4),
          width: 56,
          height: 56,
          color: ink,
        ),
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: primary,
            border: Border.all(color: ink, width: 3),
          ),
          child: const Icon(Icons.edit, color: Colors.white),
        ),
      ],
    );
  }

  
}

class _MessageCard extends StatelessWidget {
  final String name;
  final String time;
  final String preview;
  final bool unread;
  final bool system;

  const _MessageCard({
    required this.name,
    required this.time,
    required this.preview,
    this.unread = false,
    this.system = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Stack(
        children: [
          Container(
            margin: const EdgeInsets.only(left: 5, top: 5),
            height: 96,
            color: ClientMessages.ink,
          ),
          Container(
            height: 96,
            margin: const EdgeInsets.only(left: 0, top: 0, right: 5),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              border:
                  Border.all(color: ClientMessages.ink, width: 3),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _avatar(),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              name,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w900,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Text(
                            time,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: ClientMessages.muted,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        preview,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13,
                          color: ClientMessages.muted,
                          height: 1.3,
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

  Widget _avatar() {
    return Stack(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: system ? ClientMessages.ink : Colors.grey.shade300,
            border:
                Border.all(color: ClientMessages.ink, width: 3),
          ),
          child: system
              ? const Icon(Icons.gavel,
                  color: Colors.white, size: 20)
              : const Icon(Icons.person, size: 24),
        ),
        if (unread)
          Positioned(
            right: -2,
            top: -2,
            child: Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                color: ClientMessages.primary,
                border: Border.all(
                    color: ClientMessages.ink, width: 2),
              ),
            ),
          ),
      ],
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
        border:
            Border.all(color: ClientMessages.ink, width: 3),
      ),
      child: Icon(icon, size: 18),
    );
  }
}

