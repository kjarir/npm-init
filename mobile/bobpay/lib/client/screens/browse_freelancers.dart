import 'package:flutter/material.dart';
import 'package:bobpay/services/supabase_client.dart';
import 'package:bobpay/client/screens/freelancer_profile_view.dart';
import 'package:bobpay/services/conversation_service.dart';
import 'package:bobpay/client/screens/client_chat.dart';
import 'package:bobpay/common/notifications.dart';
import 'package:bobpay/services/login_service.dart';
import 'package:bobpay/client/screens/create_project.dart';

class BrowseFreelancer extends StatefulWidget {
  const BrowseFreelancer({super.key});

  @override
  State<BrowseFreelancer> createState() => _BrowseFreelancerState();
}

class _BrowseFreelancerState extends State<BrowseFreelancer> {
  static const bg = Color(0xFFFAF8F5);
  static const ink = Color(0xFF1A1F2E);
  static const primary = Color(0xFFF06542);
  static const muted = Color(0xFF8A8A8A);
  static const star = Color(0xFFF5B301);

  List<Map<String, dynamic>> _freelancers = [];
  bool _isLoading = true;
  String? _error;

  String? _userRole;
  bool _isCheckingRole = true;

  @override
  void initState() {
    super.initState();
    _checkRoleAndFetch();
  }

  Future<void> _checkRoleAndFetch() async {
    // Check user role first
    final profile = await LoginService.getCurrentProfile();
    final role = profile?['role'] as String?;
    
    setState(() {
      _userRole = role;
      _isCheckingRole = false;
    });

    // Only fetch if user is a client
    if (role == 'client') {
      _fetchFreelancers();
    } else if (role == 'freelancer') {
      // Redirect freelancers away from this page
      if (mounted) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          Navigator.of(context).pop();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('This page is only available for clients'),
              backgroundColor: Colors.red,
            ),
          );
        });
      }
    }
  }

  Future<void> _fetchFreelancers() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      if (!SupabaseService.isInitialized) {
        setState(() {
          _error = 'Database not initialized';
          _isLoading = false;
        });
        return;
      }

      final response = await SupabaseService.client
          .from('profiles')
          .select('*')
          .eq('role', 'freelancer')
          .order('reputation', ascending: false)
          .order('created_at', ascending: false);

      setState(() {
        _freelancers = List<Map<String, dynamic>>.from(response);
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load freelancers: $e';
        _isLoading = false;
      });
    }
  }

  static String _formatReputation(dynamic v) {
    if (v == null) return '50%';
    if (v is num) return '${v.round()}%';
    final n = double.tryParse(v.toString());
    return '${(n ?? 50).round()}%';
  }

  static String _formatRate(dynamic v) {
    if (v == null) return '\$—/HR';
    if (v is num && v > 0) return '\$${v.toStringAsFixed(0)}/HR';
    final n = double.tryParse(v.toString());
    if (n != null && n > 0) return '\$${n.toStringAsFixed(0)}/HR';
    return '\$—/HR';
  }

  @override
  Widget build(BuildContext context) {
    // Show loading while checking role
    if (_isCheckingRole) {
      return Scaffold(
        backgroundColor: bg,
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    // If user is not a client, show error message
    if (_userRole != 'client') {
      return Scaffold(
        backgroundColor: bg,
        body: SafeArea(
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 64, color: Colors.red),
                const SizedBox(height: 16),
                const Text(
                  'Access Denied',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'This page is only available for clients',
                  style: TextStyle(color: muted),
                ),
              ],
            ),
          ),
        ),
      );
    }

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
                  children: [
                    _searchBar(),
                    const SizedBox(height: 16),
                    _createProjectButton(),
                    const SizedBox(height: 16),
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
                              onPressed: _fetchFreelancers,
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    else if (_freelancers.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(32.0),
                        child: Text(
                          'No freelancers found',
                          style: TextStyle(color: muted),
                        ),
                      )
                    else
                      ..._freelancers.map((freelancer) => _freelancerCard(
                            freelancer: freelancer,
                            name: (freelancer['full_name'] as String?)?.toUpperCase() ?? 'FREELANCER',
                            rating: _formatReputation(freelancer['reputation']),
                            rate: _formatRate(freelancer['hourly_rate']),
                            tags: ['FREELANCER'],
                            desc: 'Available freelancer on BOBPAY platform. Contact for more details.',
                            email: freelancer['email'] as String? ?? '',
                            avatarUrl: freelancer['avatar_url'] as String?,
                          )),
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
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              
              SizedBox(height: 2),
              Text(
                'Browse Freelancers',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          Row(
            children: [
              const _IconBox(Icons.chat_bubble_outline),
              const SizedBox(width: 10),
              GestureDetector(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const NotificationsPage(),
                    ),
                  );
                },
                child: const _IconBox(Icons.notifications_none),
              ),
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
          margin: const EdgeInsets.only(left: 4, top: 4),
          height: 56,
          color: ink,
        ),
        Container(
          height: 56,
          margin: const EdgeInsets.only(left: 0, top: 0, right: 4),
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: ink, width: 3),
          ),
          child: Row(
            children: const [
              Icon(Icons.search),
              SizedBox(width: 10),
              Text(
                'SEARCH SKILLS OR FREELANCERS...',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: Colors.black38,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _createProjectButton() {
    return GestureDetector(
      onTap: () async {
        final result = await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => const CreateProject(),
          ),
        );
        if (result == true) {
          // Refresh dashboard when returning
          // The dashboard will auto-refresh via real-time subscription
          // But we can also trigger a manual refresh if needed
          debugPrint('🔄 [BROWSE] Project created, dashboard should auto-update');
        }
      },
      child: Stack(
        children: [
          Container(
            margin: const EdgeInsets.only(left: 4, top: 4),
            height: 52,
            color: ink,
          ),
          Container(
            height: 52,
            margin: const EdgeInsets.only(left: 0, top: 0, right: 4),
            decoration: BoxDecoration(
              color: primary,
              border: Border.all(color: ink, width: 3),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: const [
                Icon(Icons.add, color: Colors.white),
                SizedBox(width: 8),
                Text(
                  'CREATE PROJECT',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _freelancerCard({
    required Map<String, dynamic> freelancer,
    required String name,
    required String rating,
    required String rate,
    required List<String> tags,
    required String desc,
    String? email,
    String? avatarUrl,
  }) {
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Stack(
        children: [
          Container(
            margin: const EdgeInsets.only(left: 5, top: 5),
            height: 320,
            color: ink,
          ),
          Container(
            height: 320,
            margin: const EdgeInsets.only(left: 0, top: 0, right: 5),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: ink, width: 3),
            ),
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      color: ink,
                      child: Text(
                        rate,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(Icons.star,
                        size: 16, color: star),
                    const SizedBox(width: 4),
                    Text(
                      rating,
                      style: const TextStyle(
                          fontWeight: FontWeight.w800),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  children: tags
                      .map(
                        (t) => Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            border:
                                Border.all(color: ink, width: 2),
                          ),
                          child: Text(
                            t,
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      )
                      .toList(),
                ),
                const SizedBox(height: 12),
                Text(
                  desc,
                  style: const TextStyle(
                    fontSize: 13,
                    color: muted,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => FreelancerProfileView(
                                freelancer: freelancer,
                              ),
                            ),
                          );
                        },
                        child: _outlineBtn('VIEW PROFILE'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => _handleMessage(context, freelancer),
                        child: _outlineBtn('MESSAGE'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                GestureDetector(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => CreateProject(
                          freelancerId: freelancer['id'] as String?,
                          freelancerData: freelancer,
                        ),
                      ),
                    );
                  },
                  child: _primaryBtn('CREATE PROJECT'),
                ),
              ],
            ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _outlineBtn(String text) {
    return Container(
      height: 44,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: ink, width: 3),
      ),
      child: Text(
        text,
        style: const TextStyle(
          fontWeight: FontWeight.w900,
          fontSize: 12,
        ),
      ),
    );
  }

  Widget _primaryBtn(String text) {
    return Stack(
      children: [
        Container(
          margin: const EdgeInsets.only(left: 4, top: 4),
          height: 48,
          color: ink,
        ),
        Container(
          height: 48,
          margin: const EdgeInsets.only(left: 0, top: 0, right: 4),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: primary,
            border: Border.all(color: ink, width: 3),
          ),
          child: Text(
            text,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _handleMessage(BuildContext context, Map<String, dynamic> freelancer) async {
    try {
      final currentUser = SupabaseService.client.auth.currentUser;
      if (currentUser == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please login to message')),
        );
        return;
      }

      final freelancerId = freelancer['id'] as String?;
      if (freelancerId == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Invalid freelancer')),
        );
        return;
      }

      // Check if conversation exists, if not create one
      final conversationsResult = await ConversationService.getClientConversations();
      String? conversationId;

      if (conversationsResult['success'] == true) {
        final conversations = conversationsResult['conversations'] as List;
        try {
          final existing = conversations.firstWhere(
            (conv) => conv['freelancer_id'] == freelancerId,
          );
          conversationId = existing['id'] as String;
        } catch (e) {
          // No existing conversation found, will create one below
          conversationId = null;
        }
      }

      // If no conversation exists, create one
      if (conversationId == null) {
        try {
          final newConversation = {
            'client_id': currentUser.id,
            'freelancer_id': freelancerId,
            'is_project_channel': false,
          };

          final response = await SupabaseService.client
              .from('conversations')
              .insert(newConversation)
              .select()
              .single();

          conversationId = response['id'] as String;
        } catch (e) {
          debugPrint('Error creating conversation: $e');
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Error creating conversation: $e')),
            );
          }
          return;
        }
      }

      // Navigate to chat screen
      if (context.mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ClientChat(
              conversationId: conversationId!,
              freelancerId: freelancerId,
              freelancerName: freelancer['full_name'] as String? ?? 'Freelancer',
            ),
          ),
        );
      }
    } catch (e) {
      debugPrint('Error in _handleMessage: $e');
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }
}

class _IconBox extends StatelessWidget {
  final IconData icon;
  const _IconBox(this.icon);

  static const ink = Color(0xFF1A1F2E);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        border: Border.all(color: ink, width: 3),
        color: Colors.white,
      ),
      child: Icon(icon, size: 18),
    );
  }
}

// Make static colors accessible
extension BrowseFreelancerColors on _BrowseFreelancerState {
  static const bg = Color(0xFFFAF8F5);
  static const ink = Color(0xFF1A1F2E);
}
