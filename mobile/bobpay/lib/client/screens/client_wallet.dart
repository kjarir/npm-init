import 'package:flutter/material.dart';
import 'package:bobpay/services/wallet_service.dart';

class ClientWallet extends StatefulWidget {
  const ClientWallet({super.key});

  @override
  State<ClientWallet> createState() => _ClientWalletState();
}

class _ClientWalletState extends State<ClientWallet> {
  static const bg = Color(0xFFFAF8F5);
  static const ink = Color(0xFF1A1F2E);
  static const navy = Color(0xFF24395D);
  static const green = Color(0xFF7EDC8C);
  static const orange = Color(0xFFF1A057);
  static const cream = Color(0xFFFFFAEE);
  static const muted = Color(0xFF8A8A8A);
  static const primary = Color(0xFFF06542);

  Map<String, dynamic>? _wallet;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchWallet();
  }

  Future<void> _fetchWallet() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final result = await WalletService.getCurrentUserWallet();

    setState(() {
      if (result['success'] == true) {
        _wallet = result['wallet'];
        _error = null;
      } else {
        _error = result['error']?.toString() ?? 'Failed to load wallet';
        _wallet = null;
      }
      _isLoading = false;
    });
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
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'YOUR\nWALLET',
                      style: TextStyle(
                        fontSize: 34,
                        fontWeight: FontWeight.w900,
                        height: 1.05,
                        letterSpacing: -0.6,
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
                              onPressed: _fetchWallet,
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    else if (_wallet != null)
                      _balanceGrid(),
                    const SizedBox(height: 28),
                    _recentHeader(),
                    const SizedBox(height: 12),
                    _activityCard(),
                    const SizedBox(height: 28),
                    _securityCard(),
                    const SizedBox(height: 24),
                    _actions(),
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
        border: Border(bottom: BorderSide(color: ink, width: 3)),
        color: bg,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _iconBox(Icons.menu),
          const Text(
            'BOBPAY',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.3,
            ),
          ),
          _iconBox(Icons.account_balance_wallet, filled: true),
        ],
      ),
    );
  }

  Widget _iconBox(IconData icon, {bool filled = false}) {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: filled ? primary : bg,
        border: Border.all(color: ink, width: 3),
      ),
      child: Icon(icon, size: 18, color: filled ? Colors.white : ink),
    );
  }

  Widget _balanceGrid() {
    if (_wallet == null) {
      return const SizedBox.shrink();
    }

    final totalBalance = WalletService.formatCurrency(_wallet!['total_balance']);
    final availableBalance = WalletService.formatCurrency(_wallet!['available_balance']);
    final lockedBalance = WalletService.formatCurrency(_wallet!['locked_balance']);
    final pendingRelease = WalletService.formatCurrency(_wallet!['pending_release']);

    return Column(
      children: [
        Row(
          children: [
            Expanded(child: _balanceCard('TOTAL BOB COINS', totalBalance, navy, true)),
            const SizedBox(width: 12),
            Expanded(
                child: _balanceCard(
                    'AVAILABLE BOB COINS', availableBalance, green, false)),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
                child:
                    _balanceCard('LOCKED', lockedBalance, orange, false, lock: true)),
            const SizedBox(width: 12),
            Expanded(
                child:
                    _balanceCard('PENDING', pendingRelease, cream, false)),
          ],
        ),
      ],
    );
  }

  Widget _balanceCard(
    String label,
    String value,
    Color color,
    bool lightText, {
    bool lock = false,
  }) {
    return Stack(
      children: [
        Container(
          margin: const EdgeInsets.only(left: 10, top: 10),
          height: 140,
          color: ink,
        ),
        Container(
          height: 140,
          margin: const EdgeInsets.only(left: 0, top: 0, right: 10),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: color,
            border: Border.all(color: ink, width: 3),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Flexible(
                    child: Text(
                      label,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        color: lightText ? Colors.white : ink,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const Spacer(),
                  if (lock)
                    Icon(Icons.lock,
                        size: 16,
                        color: lightText ? Colors.white : ink),
                ],
              ),
              const Spacer(),
              Text(
                value,
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: lightText ? Colors.white : ink,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _recentHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: const [
        Text(
          'RECENT ACTIVITY',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w900,
          ),
        ),
        Icon(Icons.tune),
      ],
    );
  }

  Widget _activityCard() {
    return Stack(
      children: [
        Container(
          margin: const EdgeInsets.only(left: 10, top: 10),
          height: 230,
          color: ink,
        ),
        Container(
          margin: const EdgeInsets.only(left: 0, top: 0, right: 10),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: ink, width: 3),
          ),
          child: Column(
            children: [
              _activityRow(
                icon: Icons.arrow_downward,
                title: 'PAYMENT',
                subtitle: 'Logo Design · Oct 24',
                amount: '+\$500.00',
                badge: 'CLEAR',
                badgeColor: green,
              ),
              _divider(),
              _activityRow(
                icon: Icons.account_balance,
                title: 'WITHDRAWAL',
                subtitle: 'Bank Transfer · Oct 22',
                amount: '-\$1,200.00',
                badge: 'SENT',
                badgeColor: navy,
              ),
              _divider(),
              _activityRow(
                icon: Icons.verified,
                title: 'ESCROW RELEASE',
                subtitle: 'Web Dev Phase 1 · Oct 20',
                amount: '+\$2,000.00',
                badge: 'SUCCESS',
                badgeColor: green,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _activityRow({
    required IconData icon,
    required String title,
    required String subtitle,
    required String amount,
    required String badge,
    required Color badgeColor,
  }) {
    return Row(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            border: Border.all(color: ink, width: 3),
            color: Colors.white,
          ),
          child: Icon(icon),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title,
                  style: const TextStyle(
                      fontWeight: FontWeight.w900, fontSize: 13)),
              Text(subtitle,
                  style: const TextStyle(
                      fontSize: 12, color: Colors.black54)),
            ],
          ),
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(amount,
                style: const TextStyle(
                    fontWeight: FontWeight.w900, fontSize: 14)),
            const SizedBox(height: 4),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: badgeColor,
              ),
              child: Text(
                badge,
                style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    color: Colors.white),
              ),
            ),
          ],
        )
      ],
    );
  }

  Widget _divider() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Container(height: 2, color: Colors.black12),
    );
  }

  Widget _securityCard() {
    return Stack(
      children: [
        Container(
          margin: const EdgeInsets.only(left: 10, top: 10),
          height: 200,
          color: ink,
        ),
        Container(
          height: 200,
          margin: const EdgeInsets.only(left: 0, top: 0, right: 10),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: navy,
            border: Border.all(color: ink, width: 3),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'SECURE YOUR EARNINGS',
                style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 16),
              ),
              const SizedBox(height: 8),
              const Text(
                'Blockchain escrow ensures you get paid for every milestone completed.',
                style: TextStyle(color: Colors.white70, fontSize: 13),
              ),
              const SizedBox(height: 12),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border.all(color: ink, width: 3),
                ),
                child: const Text(
                  'LEARN MORE',
                  style: TextStyle(
                      fontWeight: FontWeight.w900, fontSize: 12),
                ),
              )
            ],
          ),
        ),
      ],
    );
  }

  Widget _actions() {
    return Row(
      children: [
        Expanded(
          child: _actionButton(
              'WITHDRAW', primary, Icons.payments, true),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _actionButton(
              'DEPOSIT', Colors.white, Icons.add, false),
        ),
      ],
    );
  }

  Widget _actionButton(
      String text, Color color, IconData icon, bool filled) {
    return Stack(
      children: [
        Container(
          margin: const EdgeInsets.only(left: 5, top:5),
          height: 54,
          color: ink,
        ),
        Container(
          height: 54,
          margin: const EdgeInsets.only(left: 0, top: 0, right: 5),
          decoration: BoxDecoration(
            color: color,
            border: Border.all(color: ink, width: 3),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon,
                  size: 18,
                  color: filled ? Colors.white : ink),
              const SizedBox(width: 8),
              Text(
                text,
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  color: filled ? Colors.white : ink,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
