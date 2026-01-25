import 'package:bobpay/common/role_based_navigation.dart';
import 'package:bobpay/auth/register.dart';
import 'package:bobpay/auth/device_approval_pending.dart';
import 'package:bobpay/services/login_service.dart';
import 'package:bobpay/services/registration_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter/gestures.dart';

class Login extends StatefulWidget {
  const Login({super.key});

  @override
  State<Login> createState() => _LoginState();
}

class _LoginState extends State<Login> {
  bool obscure = true;
  bool _isLoggingIn = false;
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  static const bg = Color(0xFFFAF8F5);
  static const ink = Color(0xFF1A1F2E);
  static const muted = Color(0xFF8A8A8A);
  static const primary = Color(0xFFD96A4A);

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    setState(() {
      _isLoggingIn = true;
    });

    try {
      final email = _emailController.text.trim();
      final password = _passwordController.text.trim();

      // Validate inputs
      if (email.isEmpty || password.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Please enter both email and password'),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }
      
      // Attempt login using email and password
      final result = await LoginService.login(
        email: email,
        password: password,
      );

      if (result['device_verification_required'] == true) {
        if (mounted) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => DeviceApprovalPendingPage(
                challenge: Map<String, dynamic>.from(result['challenge'] ?? {}),
              ),
            ),
          );
        }
        return;
      }

      if (result['success'] == true) {
        // Success - navigate to dashboard
        if (mounted) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (context) => const RoleBasedNavigation(),
            ),
          );
        }
      } else {
        // Error - show message
        if (mounted) {
          final error = result['error']?.toString() ?? 'Login failed';
          final errorCode = result['error_code']?.toString();
          
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(error),
              backgroundColor: Colors.red,
              action: errorCode == 'email_not_confirmed'
                  ? SnackBarAction(
                      label: 'Resend',
                      textColor: Colors.white,
                      onPressed: () async {
                        final email = _emailController.text.trim();
                        if (email.isEmpty) return;
                        final resend = await RegistrationService.resendVerificationEmail(email);
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              resend['success'] == true
                                  ? 'Verification email sent.'
                                  : (resend['error']?.toString() ?? 'Failed to resend email'),
                            ),
                            backgroundColor:
                                resend['success'] == true ? Colors.green : Colors.red,
                          ),
                        );
                      },
                    )
                  : SnackBarAction(
                      label: 'Register',
                      textColor: Colors.white,
                      onPressed: () {
                        Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const Register(),
                          ),
                        );
                      },
                    ),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoggingIn = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 32),
              const Text(
                'Welcome back',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -0.6,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Sign in to access your dashboard',
                style: TextStyle(
                  fontSize: 16,
                  color: muted,
                ),
              ),
              const SizedBox(height: 32),
              _label('EMAIL', Icons.mail),
              _input(controller: _emailController, hint: 'you@example.com'),
              const SizedBox(height: 20),
              _label('PASSWORD', Icons.lock),
              _passwordInput(),
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerRight,
                child: Text(
                  'Forgot password?',
                  style: TextStyle(
                    fontSize: 13,
                    color: ink,
                    decoration: TextDecoration.underline,
                    decorationColor: primary,
                  ),
                ),
              ),
              const SizedBox(height: 28),
              _signInButton(),
              const SizedBox(height: 40),
              Center(
                child: RichText(
                  text: TextSpan(
                    style: const TextStyle(
                      fontSize: 14,
                      color: muted,
                    ),
                    children: [
                      const TextSpan(text: "Don't have an account? "),
                      TextSpan(
                        text: 'Sign up',
                        recognizer: TapGestureRecognizer()
                          ..onTap = () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => const Register(),
                              ),
                            );
                          },
                        style: const TextStyle(
                          color: ink,
                          fontWeight: FontWeight.w800,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 48),
              const Center(
                child: Text(
                  'TRUSTED BY 10,000+ FREELANCERS',
                  style: TextStyle(
                    fontSize: 11,
                    letterSpacing: 1.4,
                    color: Colors.black38,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _label(String text, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 16),
        const SizedBox(width: 8),
        Text(
          text,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w900,
            letterSpacing: 0.8,
          ),
        ),
      ],
    );
  }

  Widget _input({required TextEditingController controller, required String hint}) {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      height: 52,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: ink, width: 2),
      ),
      child: TextField(
        controller: controller,
        style: const TextStyle(
          fontSize: 14,
          color: Colors.black87,
        ),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(
            fontSize: 14,
            color: Colors.black38,
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
          border: InputBorder.none,
        ),
      ),
    );
  }

  Widget _passwordInput() {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      height: 52,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: ink, width: 2),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _passwordController,
              obscureText: obscure,
              style: const TextStyle(
                fontSize: 18,
                letterSpacing: 2,
                color: Colors.black87,
              ),
              decoration: InputDecoration(
                hintText: '••••••••',
                hintStyle: const TextStyle(
                  fontSize: 18,
                  letterSpacing: 2,
                  color: Colors.black38,
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
                border: InputBorder.none,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: GestureDetector(
              onTap: () => setState(() => obscure = !obscure),
              child: Icon(
                obscure ? Icons.visibility : Icons.visibility_off,
                color: Colors.black54,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _signInButton() {
    return Stack(
      children: [
        Container(
          margin: const EdgeInsets.only(left: 6, top: 6),
          height: 56,
          color: ink,
        ),
        Container(
          margin: const EdgeInsets.only(left: 0, top: 0, right: 6),
          height: 56,
          decoration: BoxDecoration(
            color: primary,
            border: Border.all(color: ink, width: 3),
          ),
          alignment: Alignment.center,
          child: TextButton(
            onPressed: _isLoggingIn ? null : _handleLogin,
            child: _isLoggingIn
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : const Text(
                    'SIGN IN',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.4,
                    ),
                  ),
          ),
        ),
      ],
    );
  }
}
