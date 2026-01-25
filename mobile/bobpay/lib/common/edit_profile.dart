import 'package:flutter/material.dart';
import 'package:bobpay/services/login_service.dart';
import 'package:bobpay/services/supabase_client.dart';

class EditProfile extends StatefulWidget {
  const EditProfile({super.key});

  @override
  State<EditProfile> createState() => _EditProfileState();
}

class _EditProfileState extends State<EditProfile> {
  static const bg = Color(0xFFFAF8F5);
  static const ink = Color(0xFF1A1F2E);
  static const muted = Color(0xFF8A8A8A);
  static const primary = Color(0xFF1F3F96);

  final _formKey = GlobalKey<FormState>();
  final _displayNameController = TextEditingController();
  final _headlineController = TextEditingController();
  final _hourlyRateController = TextEditingController();
  final _bioController = TextEditingController();
  final _experienceController = TextEditingController();
  final _educationController = TextEditingController();
  final _locationController = TextEditingController();
  final _websiteController = TextEditingController();
  final _githubController = TextEditingController();
  final _linkedinController = TextEditingController();
  final _skillController = TextEditingController();

  List<String> _skills = [];
  double _reputation = 50;
  bool _isLoading = true;
  bool _isSaving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  @override
  void dispose() {
    _displayNameController.dispose();
    _headlineController.dispose();
    _hourlyRateController.dispose();
    _bioController.dispose();
    _experienceController.dispose();
    _educationController.dispose();
    _locationController.dispose();
    _websiteController.dispose();
    _githubController.dispose();
    _linkedinController.dispose();
    _skillController.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final profile = await LoginService.getCurrentProfile();
      if (profile == null) {
        setState(() {
          _error = 'Profile not found. Please login again.';
          _isLoading = false;
        });
        return;
      }

      _reputation = _reputationValue(profile['reputation']);
      _displayNameController.text = profile['full_name']?.toString() ?? '';
      _headlineController.text = profile['headline']?.toString() ?? '';
      _hourlyRateController.text = _formatRate(profile['hourly_rate']);
      _bioController.text = profile['bio']?.toString() ?? '';
      _experienceController.text = profile['experience']?.toString() ?? '';
      _educationController.text = profile['education']?.toString() ?? '';
      _locationController.text = profile['location']?.toString() ?? '';
      _websiteController.text = profile['website']?.toString() ?? '';
      _githubController.text = profile['github']?.toString() ?? '';
      _linkedinController.text = profile['linkedin']?.toString() ?? '';
      _skills = _parseSkills(profile['skills']);

      setState(() {
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
    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: Column(
          children: [
            _topBar(),
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
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                onPressed: _loadProfile,
                                child: const Text('Retry'),
                              ),
                            ],
                          ),
                        )
                      : Form(
                          key: _formKey,
                          child: SingleChildScrollView(
                            padding: const EdgeInsets.fromLTRB(20, 20, 20, 120),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _sectionTitle('BASIC INFO'),
                                _label('REPUTATION'),
                                _reputationDisplay(),
                                const SizedBox(height: 16),
                                _label('DISPLAY NAME'),
                                _textInput(
                                  controller: _displayNameController,
                                  hint: 'e.g. Satoshi Nakamoto',
                                  textInputAction: TextInputAction.next,
                                ),
                                const SizedBox(height: 16),
                                _label('HEADLINE'),
                                _textInput(
                                  controller: _headlineController,
                                  hint: 'e.g. Smart contract developer',
                                  textInputAction: TextInputAction.next,
                                ),
                                const SizedBox(height: 16),
                                _label('HOURLY RATE (USDC)'),
                                _rateInput(),
                                const SizedBox(height: 20),
                                _sectionTitle('ABOUT'),
                                _label('BIO'),
                                _textarea(
                                  controller: _bioController,
                                  hint: 'Tell the world about your skills...',
                                ),
                                const SizedBox(height: 16),
                                _label('EXPERIENCE'),
                                _textarea(
                                  controller: _experienceController,
                                  hint: 'List your experience, roles, and achievements',
                                ),
                                const SizedBox(height: 16),
                                _label('EDUCATION'),
                                _textarea(
                                  controller: _educationController,
                                  hint: 'Add your education background',
                                ),
                                const SizedBox(height: 20),
                                _sectionTitle('SKILLS'),
                                _skillInput(),
                                const SizedBox(height: 12),
                                if (_skills.isNotEmpty)
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: _skills.map(_skillChip).toList(),
                                  ),
                                if (_skills.isEmpty)
                                  const Text(
                                    'No skills added yet',
                                    style: TextStyle(color: muted, fontSize: 12),
                                  ),
                                const SizedBox(height: 20),
                                _sectionTitle('LINKS'),
                                _label('LOCATION'),
                                _textInput(
                                  controller: _locationController,
                                  hint: 'e.g. Dubai, UAE',
                                  textInputAction: TextInputAction.next,
                                ),
                                const SizedBox(height: 16),
                                _label('WEBSITE'),
                                _textInput(
                                  controller: _websiteController,
                                  hint: 'e.g. https://yourdomain.com',
                                  keyboardType: TextInputType.url,
                                  textInputAction: TextInputAction.next,
                                ),
                                const SizedBox(height: 16),
                                _label('GITHUB'),
                                _textInput(
                                  controller: _githubController,
                                  hint: 'e.g. https://github.com/username',
                                  keyboardType: TextInputType.url,
                                  textInputAction: TextInputAction.next,
                                ),
                                const SizedBox(height: 16),
                                _label('LINKEDIN'),
                                _textInput(
                                  controller: _linkedinController,
                                  hint: 'e.g. https://linkedin.com/in/username',
                                  keyboardType: TextInputType.url,
                                  textInputAction: TextInputAction.done,
                                ),
                              ],
                            ),
                          ),
                        ),
            ),
            _saveButton(),
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
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: const Icon(Icons.arrow_back),
          ),
          const SizedBox(width: 10),
          const Text(
            'EDIT PROFILE',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.3,
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w900,
          letterSpacing: 1.4,
          color: primary,
        ),
      ),
    );
  }

  Widget _label(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w900,
          letterSpacing: 0.8,
        ),
      ),
    );
  }

  Widget _textInput({
    required TextEditingController controller,
    required String hint,
    TextInputType keyboardType = TextInputType.text,
    TextInputAction textInputAction = TextInputAction.next,
  }) {
    return Container(
      height: 52,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: ink, width: 3),
      ),
      alignment: Alignment.centerLeft,
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        textInputAction: textInputAction,
        decoration: InputDecoration(
          hintText: hint,
          border: InputBorder.none,
          isCollapsed: true,
        ),
        style: const TextStyle(fontSize: 14),
      ),
    );
  }

  Widget _rateInput() {
    return Container(
      height: 52,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: ink, width: 3),
      ),
      child: Row(
        children: [
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: TextFormField(
                controller: _hourlyRateController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  hintText: '0.00',
                  border: InputBorder.none,
                  isCollapsed: true,
                ),
                style: const TextStyle(fontSize: 14),
              ),
            ),
          ),
          Container(
            width: 72,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              border: Border(
                left: BorderSide(color: ink, width: 3),
              ),
            ),
            child: const Text(
              'USDC',
              style: TextStyle(
                fontWeight: FontWeight.w900,
                color: primary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _textarea({
    required TextEditingController controller,
    required String hint,
  }) {
    return Container(
      height: 120,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: ink, width: 3),
      ),
      alignment: Alignment.topLeft,
      child: TextFormField(
        controller: controller,
        maxLines: null,
        decoration: InputDecoration(
          hintText: hint,
          border: InputBorder.none,
          isCollapsed: true,
        ),
        style: const TextStyle(fontSize: 14),
      ),
    );
  }

  Widget _skillInput() {
    return Row(
      children: [
        Expanded(
          child: Container(
            height: 48,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: ink, width: 3),
            ),
            alignment: Alignment.centerLeft,
            child: TextField(
              controller: _skillController,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _addSkill(),
              decoration: const InputDecoration(
                hintText: 'Add a skill (e.g. Rust)',
                border: InputBorder.none,
                isCollapsed: true,
              ),
              style: const TextStyle(fontSize: 14),
            ),
          ),
        ),
        const SizedBox(width: 8),
        GestureDetector(
          onTap: _addSkill,
          child: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.black,
              border: Border.all(color: ink, width: 3),
            ),
            child: const Icon(Icons.add, color: Colors.white),
          ),
        ),
      ],
    );
  }

  Widget _skillChip(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.grey.shade200,
        border: Border.all(color: ink, width: 3),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            text,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(width: 6),
          GestureDetector(
            onTap: () => _removeSkill(text),
            child: const Icon(Icons.close, size: 14),
          ),
        ],
      ),
    );
  }

  Widget _saveButton() {
    return Stack(
      children: [
        Container(
          margin: const EdgeInsets.only(left: 6, top: 6),
          height: 64,
          color: ink,
        ),
        GestureDetector(
          onTap: _isSaving ? null : _saveProfile,
          child: Container(
            height: 64,
            decoration: BoxDecoration(
              color: primary,
              border: Border.all(color: ink, width: 3),
            ),
            alignment: Alignment.center,
            child: _isSaving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : const Text(
                    'SAVE CHANGES',
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

  void _addSkill() {
    final skill = _skillController.text.trim();
    if (skill.isEmpty) return;
    final normalized = skill.toUpperCase();
    if (_skills.any((s) => s.toUpperCase() == normalized)) {
      _skillController.clear();
      return;
    }
    setState(() {
      _skills.add(skill);
      _skillController.clear();
    });
  }

  void _removeSkill(String skill) {
    setState(() {
      _skills.removeWhere((s) => s == skill);
    });
  }

  Future<void> _saveProfile() async {
    if (_isSaving) return;
    if (!_formKey.currentState!.validate()) return;

    final user = SupabaseService.client.auth.currentUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please login again'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final rateValue = _parseRate(_hourlyRateController.text.trim());

    setState(() {
      _isSaving = true;
    });

    try {
      final updates = {
        'full_name': _nullIfEmpty(_displayNameController.text),
        'headline': _nullIfEmpty(_headlineController.text),
        'bio': _nullIfEmpty(_bioController.text),
        'experience': _nullIfEmpty(_experienceController.text),
        'education': _nullIfEmpty(_educationController.text),
        'location': _nullIfEmpty(_locationController.text),
        'website': _nullIfEmpty(_websiteController.text),
        'github': _nullIfEmpty(_githubController.text),
        'linkedin': _nullIfEmpty(_linkedinController.text),
        'hourly_rate': rateValue,
        'skills': _skills,
        'updated_at': DateTime.now().toIso8601String(),
      };

      await SupabaseService.client
          .from('profiles')
          .update(updates)
          .eq('id', user.id);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile updated successfully'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update profile: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });
      }
    }
  }

  static double _reputationValue(dynamic v) {
    if (v == null) return 50;
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString()) ?? 50;
  }

  Widget _reputationDisplay() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        border: Border.all(color: muted),
      ),
      child: Row(
        children: [
          Icon(Icons.workspace_premium, size: 20, color: primary),
          const SizedBox(width: 8),
          Text(
            '${_reputation.round()}%',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              '— Higher reputation builds trust and ranking',
              style: TextStyle(fontSize: 12, color: muted),
              overflow: TextOverflow.ellipsis,
              maxLines: 1,
            ),
          ),
        ],
      ),
    );
  }

  String _formatRate(dynamic value) {
    if (value == null) return '';
    if (value is num) return value.toString();
    final parsed = double.tryParse(value.toString());
    return parsed?.toString() ?? '';
  }

  double? _parseRate(String text) {
    if (text.isEmpty) return null;
    final cleaned = text.replaceAll(',', '');
    return double.tryParse(cleaned);
  }

  String? _nullIfEmpty(String value) {
    final trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }

  List<String> _parseSkills(dynamic skills) {
    if (skills == null) return [];
    if (skills is List) {
      return skills.map((e) => e.toString()).where((e) => e.trim().isNotEmpty).toList();
    }
    if (skills is String) {
      return skills
          .split(',')
          .map((e) => e.trim())
          .where((e) => e.isNotEmpty)
          .toList();
    }
    return [];
  }
}
