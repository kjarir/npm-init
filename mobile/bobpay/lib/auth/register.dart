import 'package:bobpay/auth/login.dart';
import 'package:bobpay/common/role_based_navigation.dart';
import 'package:bobpay/services/registration_service.dart';
import 'package:bobpay/auth/email_verification_pending.dart';
import 'package:flutter/material.dart';
import 'package:flutter/gestures.dart';

class Register extends StatefulWidget {
  const Register({super.key});

  @override
  State<Register> createState() => _RegisterState();
}

class _RegisterState extends State<Register> {
  bool isFreelancer = true;
  bool _isRegistering = false;
  bool obscure = true;
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  static const bg = Color(0xFFFAF8F5);
  static const ink = Color(0xFF1A1F2E);
  static const muted = Color(0xFF8A8A8A);
  static const primary = Color(0xFFD96A4A);

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
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
              const Text(
                'Create account',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -0.6,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Join BobPay and start working securely',
                style: TextStyle(
                  fontSize: 16,
                  color: muted,
                ),
              ),
              const SizedBox(height: 32),
              const Text(
                'I AM A',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.8,
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _roleCard(
                      selected: isFreelancer,
                      title: 'Freelancer',
                      subtitle: 'I want to get paid',
                      icon: Icons.person,
                      onTap: () =>
                          setState(() => isFreelancer = true),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _roleCard(
                      selected: !isFreelancer,
                      title: 'Client',
                      subtitle: 'I want to hire',
                      icon: Icons.work,
                      onTap: () =>
                          setState(() => isFreelancer = false),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 28),
              _label('FULL NAME', Icons.person_outline),
              _input(controller: _nameController, hint: 'John Doe'),
              const SizedBox(height: 20),
              _label('EMAIL', Icons.mail_outline),
              _input(controller: _emailController, hint: 'you@example.com'),
              const SizedBox(height: 20),
              _label('PASSWORD', Icons.lock_outline),
              _passwordInput(),
              const SizedBox(height: 32),
              _createButton(),
              const SizedBox(height: 32),
              Center(
                child: RichText(
                  text: TextSpan(
                    style: const TextStyle(
                      fontSize: 14,
                      color: muted,
                    ),
                    children: [
                      const TextSpan(
                          text: 'Already have an account? '),
                      TextSpan(
                        text: 'Sign in',
                        recognizer: TapGestureRecognizer()..onTap = () {
                          Navigator.push(context, MaterialPageRoute(builder: (context) => const Login()));
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
            ],
          ),
        ),
      ),
    );
  }

  

  Widget _roleCard({
    required bool selected,
    required String title,
    required String subtitle,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Stack(
     
        children: [
          Container(
            margin: const EdgeInsets.only(left: 5, top: 5),
            height: 140,
            width: double.infinity,
            color: ink,
          ),
          Container(
            margin: const EdgeInsets.only(left: 0, top: 0, right: 5),
            height: 140,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(
                color: selected ? ink : Colors.black12,
                width: selected ? 3 : 2,
              ),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon,
                    size: 28,
                    color: selected ? ink : Colors.black26),
                const SizedBox(height: 10),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: selected ? ink : Colors.black38,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 13,
                    color: selected ? muted : Colors.black26,
                  ),
                ),
              ],
            ),
          ),
          if (selected)
            Positioned(
              right: 10,
              top: 10,
              child: Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: primary,
                  border: Border.all(color: ink, width: 2),
                ),
              ),
            ),
        ],
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

  Future<void> _handleRegister() async {
    setState(() {
      _isRegistering = true;
    });

    try {
      // Get name, email, and password from form
      final name = _nameController.text.trim();
      final email = _emailController.text.trim();
      final password = _passwordController.text.trim();

      // Validate inputs
      if (name.isEmpty || email.isEmpty || password.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Please fill in all fields'),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }

      // Validate password length
      if (password.length < 6) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Password must be at least 6 characters'),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }

      // Register user with email and password
      final result = await RegistrationService.registerUser(
        name: name,
        email: email,
        password: password,
        isFreelancer: isFreelancer,
      );

      if (result['verification_required'] == true) {
        if (mounted) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (context) => EmailVerificationPendingPage(
                email: result['email']?.toString() ?? email,
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
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['error']?.toString() ?? 'Registration failed'),
              backgroundColor: Colors.red,
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
          _isRegistering = false;
        });
      }
    }
  }

  Widget _createButton() {
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
          width: double.infinity,
          decoration: BoxDecoration(
            color: primary,
            border: Border.all(color: ink, width: 3),
          ),
          alignment: Alignment.center,
          child: TextButton(
            onPressed: _isRegistering ? null : _handleRegister,
            child: _isRegistering
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : const Text(
                    'CREATE ACCOUNT',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.2,
                    ),
                  ),
          ),
        ),
      ],
    );
  }
}
