import 'package:flutter/material.dart';
import 'package:bobpay/services/conversation_service.dart';
import 'package:bobpay/services/supabase_client.dart';
import 'package:bobpay/client/screens/client_chat.dart';

class FreelancerProfileView extends StatefulWidget {
  final Map<String, dynamic> freelancer;

  const FreelancerProfileView({
    super.key,
    required this.freelancer,
  });

  @override
  State<FreelancerProfileView> createState() => _FreelancerProfileViewState();
}

class _FreelancerProfileViewState extends State<FreelancerProfileView> {
  static const bg = Color(0xFFFAF8F5);
  static const ink = Color(0xFF1A1F2E);
  static const primary = Color(0xFFF06542);
  static const muted = Color(0xFF8A8A8A);
  static const green = Color(0xFF2D8659);
  static const star = Color(0xFFF5B301);

  List<Map<String, dynamic>> _pastProjects = [];
  bool _isLoading = true;
  String? _error;
  double _rating = 0.0;
  int _totalReviews = 0;

  @override
  void initState() {
    super.initState();
    _fetchFreelancerDetails();
  }

  Future<void> _fetchFreelancerDetails() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final freelancerId = widget.freelancer['id'] as String?;
      if (freelancerId == null) {
        setState(() {
          _error = 'Invalid freelancer ID';
          _isLoading = false;
        });
        return;
      }

      // Fetch past projects (completed or delivered)
      // Try to fetch projects, but handle case where table might not have data
      List<Map<String, dynamic>> projectsResponse = [];
      try {
        final response = await SupabaseService.client
            .from('projects')
            .select('*')
            .eq('freelancer_id', freelancerId)
            .or('status.eq.completed,status.eq.delivered')
            .order('created_at', ascending: false)
            .limit(5);
        projectsResponse = List<Map<String, dynamic>>.from(response);
      } catch (e) {
        debugPrint('Error fetching projects: $e');
        // If query fails, just use empty list
        projectsResponse = [];
      }

      final rep = _reputationValue(widget.freelancer['reputation']);
      setState(() {
        _pastProjects = List<Map<String, dynamic>>.from(projectsResponse);
        // Derive star rating from reputation (0–100 -> 0–5 scale)
        _rating = (rep / 20).clamp(0.0, 5.0);
        _totalReviews = _pastProjects.length;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load profile: $e';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final fullName = widget.freelancer['full_name'] as String? ?? 'Freelancer';
    final email = widget.freelancer['email'] as String? ?? '';
    final avatarUrl = widget.freelancer['avatar_url'] as String?;
    final role = widget.freelancer['role'] as String? ?? 'freelancer';
    final freelancerId = widget.freelancer['id'] as String?;
    
    // Get skills from profile (if stored in JSONB or separate column)
    final skills = _getSkills();

    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: Column(
          children: [
            _topBar(context),
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                _error!,
                                style: const TextStyle(color: Colors.red),
                              ),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                onPressed: _fetchFreelancerDetails,
                                child: const Text('Retry'),
                              ),
                            ],
                          ),
                        )
                      : SingleChildScrollView(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _profileHeader(
                                fullName: fullName,
                                email: email,
                                avatarUrl: avatarUrl,
                                role: role,
                              ),
                              const SizedBox(height: 24),
                              _ratingSection(),
                              const SizedBox(height: 24),
                              if (skills.isNotEmpty) ...[
                                _skillsSection(skills),
                                const SizedBox(height: 24),
                              ],
                              if (_pastProjects.isNotEmpty) ...[
                                _pastProjectsSection(),
                                const SizedBox(height: 24),
                              ],
                              _actionButtons(context, freelancerId ?? ''),
                            ],
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }

  List<String> _getSkills() {
    // Try to get skills from profile data
    // This could be stored in a JSONB column or separate skills table
    // For now, return default skills or from profile metadata
    final profileData = widget.freelancer;
    if (profileData.containsKey('skills')) {
      final skillsData = profileData['skills'];
      if (skillsData is List) {
        return List<String>.from(skillsData);
      }
    }
    // Default skills if not found
    return ['FREELANCER', 'AVAILABLE'];
  }

  Widget _topBar(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: const BoxDecoration(
        color: bg,
        border: Border(bottom: BorderSide(color: ink, width: 3)),
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: const Icon(Icons.arrow_back),
          ),
          const SizedBox(width: 10),
          const Text(
            'FREELANCER PROFILE',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }

  static double _reputationValue(dynamic v) {
    if (v == null) return 50;
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString()) ?? 50;
  }

  Widget _profileHeader({
    required String fullName,
    required String email,
    String? avatarUrl,
    required String role,
    double? reputation,
  }) {
    final rep = reputation ?? _reputationValue(widget.freelancer['reputation']);
    return Column(
      children: [
        Stack(
          children: [
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                border: Border.all(color: ink, width: 3),
                shape: BoxShape.circle,
              ),
              child: avatarUrl != null && avatarUrl.isNotEmpty
                  ? ClipOval(
                      child: Image.network(
                        avatarUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return Icon(Icons.person, color: ink, size: 60);
                        },
                      ),
                    )
                  : Icon(Icons.person, color: ink, size: 60),
            ),
            Positioned(
              bottom: 0,
              right: 0,
              child: Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: green,
                  border: Border.all(color: ink, width: 2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.verified,
                  color: Colors.white,
                  size: 18,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        Text(
          fullName.toUpperCase(),
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          email,
          style: const TextStyle(
            fontSize: 14,
            color: muted,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: primary,
            border: Border.all(color: ink, width: 3),
          ),
          child: Text(
            role.toUpperCase(),
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w900,
              color: Colors.white,
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.workspace_premium, size: 18, color: green),
            const SizedBox(width: 6),
            Text(
              'REPUTATION ${rep.round()}%',
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w900,
                color: green,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _ratingSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: ink, width: 3),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          ...List.generate(5, (index) {
            return Icon(
              index < _rating.floor() ? Icons.star : Icons.star_border,
              color: star,
              size: 24,
            );
          }),
          const SizedBox(width: 12),
          Text(
            '$_rating',
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '($_totalReviews reviews)',
            style: const TextStyle(
              fontSize: 14,
              color: muted,
            ),
          ),
        ],
      ),
    );
  }

  Widget _skillsSection(List<String> skills) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'SKILLS',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: skills.map((skill) {
            return Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: ink, width: 3),
              ),
              child: Text(
                skill.toUpperCase(),
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _pastProjectsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'PAST PROJECTS',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 12),
        ..._pastProjects.map((project) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: ink, width: 3),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    (project['title'] as String? ?? 'Untitled Project').toUpperCase(),
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    project['description'] as String? ?? 'No description',
                    style: const TextStyle(
                      fontSize: 12,
                      color: muted,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        color: green,
                        child: Text(
                          (project['status'] as String? ?? 'COMPLETED').toUpperCase(),
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _actionButtons(BuildContext context, String freelancerId) {
    return Column(
      children: [
        _actionButton(
          context: context,
          icon: Icons.chat_bubble_outline,
          label: 'MESSAGE',
          color: primary,
          onTap: () => _handleMessage(context, freelancerId),
        ),
        const SizedBox(height: 16),
        _actionButton(
          context: context,
          icon: Icons.phone,
          label: 'VOICE CALL',
          color: Colors.white,
          onTap: () => _handleVoiceCall(context, freelancerId),
        ),
        const SizedBox(height: 16),
        _actionButton(
          context: context,
          icon: Icons.videocam,
          label: 'VIDEO CALL',
          color: Colors.white,
          onTap: () => _handleVideoCall(context, freelancerId),
        ),
        const SizedBox(height: 16),
        _actionButton(
          context: context,
          icon: Icons.handshake,
          label: 'HIRE',
          color: green,
          onTap: () => _handleHire(context, freelancerId),
        ),
      ],
    );
  }

  Widget _actionButton({
    required BuildContext context,
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    final isPrimary = color == primary || color == green;
    
    return GestureDetector(
      onTap: onTap,
      child: Stack(
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
              color: color,
              border: Border.all(color: ink, width: 3),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  icon,
                  color: isPrimary ? Colors.white : ink,
                ),
                const SizedBox(width: 8),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w900,
                    color: isPrimary ? Colors.white : ink,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleMessage(BuildContext context, String freelancerId) async {
    try {
      final currentUser = SupabaseService.client.auth.currentUser;
      if (currentUser == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please login to message')),
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
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error creating conversation: $e')),
          );
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
              freelancerName: widget.freelancer['full_name'] as String? ?? 'Freelancer',
            ),
          ),
        );
      }
    } catch (e) {
      debugPrint('Error in _handleMessage: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }

  void _handleVoiceCall(BuildContext context, String freelancerId) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Voice call feature - Coming soon')),
    );
  }

  void _handleVideoCall(BuildContext context, String freelancerId) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Video call feature - Coming soon')),
    );
  }

  void _handleHire(BuildContext context, String freelancerId) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Hire feature - Coming soon')),
    );
  }
}
