import 'package:flutter/material.dart';
import 'package:bobpay/services/registration_service.dart';
import 'package:bobpay/auth/login.dart';

class EmailVerificationPendingPage extends StatefulWidget {
  final String email;

  const EmailVerificationPendingPage({
    super.key,
    required this.email,
  });

  @override
  State<EmailVerificationPendingPage> createState() => _EmailVerificationPendingPageState();
}

class _EmailVerificationPendingPageState extends State<EmailVerificationPendingPage> {
  static const bg = Color(0xFF0F172A);
  static const card = Color(0xFF111827);
  static const primary = Color(0xFF6366F1);
  static const muted = Color(0xFF94A3B8);

  bool _isResending = false;

  Future<void> _resendEmail() async {
    if (_isResending) return;
    setState(() => _isResending = true);
    final result = await RegistrationService.resendVerificationEmail(widget.email);
    if (!mounted) return;
    setState(() => _isResending = false);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          result['success'] == true
              ? 'Verification email sent.'
              : (result['error']?.toString() ?? 'Failed to resend email'),
        ),
        backgroundColor: result['success'] == true ? Colors.green : Colors.red,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 24),
              const Text(
                'VERIFY YOUR EMAIL',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 16),
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
                      'We sent a verification link to:',
                      style: TextStyle(color: muted),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      widget.email,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Open the email and click the link to activate your account.',
                      style: TextStyle(color: muted, fontSize: 12),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isResending ? null : _resendEmail,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: Text(
                    _isResending ? 'SENDING...' : 'RESEND VERIFICATION EMAIL',
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () {
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(builder: (_) => const Login()),
                    );
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: muted),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: const Text('BACK TO LOGIN'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
