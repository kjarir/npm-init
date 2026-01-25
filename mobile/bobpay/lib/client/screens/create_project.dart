import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:bobpay/services/ipfs_service.dart';
import 'package:bobpay/services/blockchain_service.dart';
import 'package:bobpay/services/audit_log_service.dart';
import 'package:bobpay/services/signature_service.dart';
import 'package:bobpay/services/certificate_pdf_service.dart';
import 'package:bobpay/services/supabase_client.dart';
import 'package:bobpay/services/local_key_service.dart';
import 'package:bobpay/services/escrow_service.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:uuid/uuid.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class CreateProject extends StatefulWidget {
  final String? freelancerId;
  final Map<String, dynamic>? freelancerData;

  const CreateProject({
    super.key,
    this.freelancerId,
    this.freelancerData,
  });

  @override
  State<CreateProject> createState() => _CreateProjectState();
}

class _CreateProjectState extends State<CreateProject> {
  static const bg = Color(0xFFFAF8F5);
  static const ink = Color(0xFF1A1F2E);
  static const primary = Color(0xFFF06542);
  static const muted = Color(0xFF8A8A8A);

  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _budgetController = TextEditingController();
  final _deadlineController = TextEditingController();
  final _storage = FlutterSecureStorage();

  bool _isSubmitting = false;
  bool _isGeneratingDraft = false;
  bool _isGeneratingMilestones = false;
  String? _selectedCategory;
  String? _billingType = 'fixed';
  List<Map<String, dynamic>> _milestones = [];
  List<String> _selectedSkills = [];
  final Map<int, TextEditingController> _milestoneTitleControllers = {};
  final Map<int, TextEditingController> _milestoneDescControllers = {};
  final Map<int, TextEditingController> _milestoneAmountControllers = {};
  final Map<int, TextEditingController> _milestoneDueDateControllers = {};
  final List<String> _availableSkills = [
    'Web Development', 'Mobile Development', 'UI/UX Design', 'Graphic Design',
    'Content Writing', 'SEO', 'Digital Marketing', 'Data Analysis',
    'Blockchain', 'AI/ML', 'DevOps', 'Backend Development',
    'Frontend Development', 'Full Stack', 'Video Editing', 'Photography'
  ];

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _budgetController.dispose();
    _deadlineController.dispose();
    // Dispose milestone controllers
    for (var controller in _milestoneTitleControllers.values) {
      controller.dispose();
    }
    for (var controller in _milestoneDescControllers.values) {
      controller.dispose();
    }
    for (var controller in _milestoneAmountControllers.values) {
      controller.dispose();
    }
    for (var controller in _milestoneDueDateControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  void _addMilestone() {
    setState(() {
      final index = _milestones.length;
      _milestones.add({
        'title': '',
        'description': '',
        'amount': 0.0,
        'percentage': 0.0,
        'due_date': '',
        'status': 'pending',
      });
      // Create controllers for new milestone
      _milestoneTitleControllers[index] = TextEditingController();
      _milestoneDescControllers[index] = TextEditingController();
      _milestoneAmountControllers[index] = TextEditingController();
      _milestoneDueDateControllers[index] = TextEditingController();
    });
  }

  void _removeMilestone(int index) {
    final controllersToDispose = [
      _milestoneTitleControllers[index],
      _milestoneDescControllers[index],
      _milestoneAmountControllers[index],
      _milestoneDueDateControllers[index],
    ];

    setState(() {
      _milestoneTitleControllers.remove(index);
      _milestoneDescControllers.remove(index);
      _milestoneAmountControllers.remove(index);
      _milestoneDueDateControllers.remove(index);
      
      // Reindex remaining controllers
      final keysToUpdate = _milestoneTitleControllers.keys.where((k) => k > index).toList()..sort();
      for (var oldKey in keysToUpdate) {
        final newKey = oldKey - 1;
        _milestoneTitleControllers[newKey] = _milestoneTitleControllers.remove(oldKey)!;
        _milestoneDescControllers[newKey] = _milestoneDescControllers.remove(oldKey)!;
        _milestoneAmountControllers[newKey] = _milestoneAmountControllers.remove(oldKey)!;
        _milestoneDueDateControllers[newKey] = _milestoneDueDateControllers.remove(oldKey)!;
      }
      
      _milestones.removeAt(index);
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      for (final controller in controllersToDispose) {
        controller?.dispose();
      }
    });
  }

  void _updateMilestone(int index, Map<String, dynamic> updates) {
    setState(() {
      _milestones[index] = {..._milestones[index], ...updates};
    });
  }

  String _sanitizeGeneratedText(String input) {
    return input.replaceAll('**', '').trim();
  }

  Future<int?> _askMilestoneCount() async {
    if (!mounted) return null;

    final initial = _milestones.isNotEmpty ? _milestones.length.toString() : '4';
    final result = await showDialog<int>(
      context: context,
      builder: (context) => _MilestoneCountDialog(initialCount: initial),
    );
    return result;
  }

  Future<void> _generateMilestonesWithCount() async {
    if (_isGeneratingMilestones) return;

    final title = _titleController.text.trim();
    if (title.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a project title first'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final description = _descriptionController.text.trim();
    if (description.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please add a description first'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final budget = double.tryParse(_budgetController.text.trim()) ?? 0.0;
    if (budget <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Add a budget to auto-generate milestones'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final countInput = await _askMilestoneCount();
    if (countInput == null) return;

    final count = countInput.clamp(1, 8);

    setState(() {
      _isGeneratingMilestones = true;
    });

    try {
      final result = await EscrowService.generateMilestones(
        title: title,
        description: description,
        count: count,
        budget: budget,
      );

      if (result['success'] == true) {
        final raw = result['milestones'] as List<dynamic>? ?? [];
        _applyGeneratedMilestones(raw, budget);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Auto-generated ${raw.isEmpty ? count : raw.length} milestones'),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['error']?.toString() ?? 'Failed to generate milestones'),
            backgroundColor: Colors.orange,
          ),
        );
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
          _isGeneratingMilestones = false;
        });
      }
    }
  }

  Future<void> _generateProjectDraft() async {
    final title = _titleController.text.trim();
    if (title.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a project title first'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() {
      _isGeneratingDraft = true;
    });

    try {
      final descriptionResult = await EscrowService.generateDescription(title: title);
      if (descriptionResult['success'] == true) {
        final generated = descriptionResult['description']?.toString() ?? '';
        if (generated.isNotEmpty) {
          _descriptionController.text = _sanitizeGeneratedText(generated);
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(descriptionResult['error']?.toString() ?? 'Failed to generate description'),
              backgroundColor: Colors.orange,
            ),
          );
        }
      }

      final budget = double.tryParse(_budgetController.text.trim()) ?? 0.0;
      if (budget <= 0) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Add a budget to auto-generate milestones'),
              backgroundColor: Colors.orange,
            ),
          );
        }
        return;
      }

      final desc = _descriptionController.text.trim();
      if (desc.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Description is required to generate milestones'),
              backgroundColor: Colors.orange,
            ),
          );
        }
        return;
      }

      final milestoneCount = _milestones.isNotEmpty ? _milestones.length : 4;
      final milestonesResult = await EscrowService.generateMilestones(
        title: title,
        description: desc,
        count: milestoneCount,
        budget: budget,
      );

      if (milestonesResult['success'] == true) {
        final raw = milestonesResult['milestones'] as List<dynamic>? ?? [];
        _applyGeneratedMilestones(raw, budget);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Auto-generated ${raw.isEmpty ? milestoneCount : raw.length} milestones'),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(milestonesResult['error']?.toString() ?? 'Failed to generate milestones'),
            backgroundColor: Colors.orange,
          ),
        );
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
          _isGeneratingDraft = false;
        });
      }
    }
  }

  void _applyGeneratedMilestones(List<dynamic> rawMilestones, double budget) {
    final cleaned = <Map<String, dynamic>>[];
    for (var i = 0; i < rawMilestones.length; i++) {
      final item = rawMilestones[i] as Map<String, dynamic>? ?? {};
      final amount = (item['amount'] as num?)?.toDouble() ?? 0.0;
      final title = _sanitizeGeneratedText(
        (item['title'] ?? 'Milestone ${i + 1}').toString(),
      );
      final description = _sanitizeGeneratedText(
        (item['description'] ?? '').toString(),
      );
      cleaned.add({
        'title': title,
        'description': description,
        'amount': amount,
        'percentage': budget > 0 ? (amount / budget) * 100 : 0.0,
        'due_date': '',
        'status': 'pending',
      });
    }

    setState(() {
      _milestones = cleaned;
    });
  }

  Future<void> _createProject() async {
    if (!_formKey.currentState!.validate()) return;

    // Validate milestones
    if (_milestones.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please add at least one milestone'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // Validate milestone amounts sum to budget
    final totalBudget = double.tryParse(_budgetController.text.trim()) ?? 0.0;
    final milestoneTotal = _milestones.fold<double>(
      0.0,
      (sum, m) => sum + (m['amount'] as num? ?? 0.0).toDouble(),
    );

    if ((milestoneTotal - totalBudget).abs() > 0.01) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Milestone amounts must equal total budget (\$${totalBudget.toStringAsFixed(2)})'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      final currentUser = SupabaseService.client.auth.currentUser;
      if (currentUser == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please login first')),
        );
        return;
      }

      final profileReady = await _ensureProfile(currentUser);
      if (!profileReady) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Profile missing. Please re-login or contact support.'),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }

      final projectId = const Uuid().v4();
      final title = _titleController.text.trim();
      final description = _descriptionController.text.trim();
      final budget = double.tryParse(_budgetController.text.trim()) ?? 0.0;

      Map<String, String> localKeys;
      try {
        localKeys = await LocalKeyService.ensureLocalKeys(userId: currentUser.id);
      } catch (e) {
        debugPrint('❌ [CREATE_PROJECT] Certificate recovery failed: $e');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Unable to initialize device certificate. Please try again.'),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }

      final storedPrivateKey = localKeys['private_key'] ?? '';
      final storedCertificateId = localKeys['certificate_id'] ?? '';
      String? storedPublicKey = localKeys['public_key'];
      final storedCertificateJson = await _storage.read(key: 'device_certificate') ??
          await _storage.read(key: 'certificate');

      debugPrint('🔍 [CREATE_PROJECT] Certificate check:');
      debugPrint('  - Private key: ${storedPrivateKey.isNotEmpty ? "✓ Found" : "✗ Missing"}');
      debugPrint('  - Certificate JSON: ${storedCertificateJson != null ? "✓ Found" : "✗ Missing"}');
      debugPrint('  - Certificate ID: ${storedCertificateId.isNotEmpty ? "✓ Found" : "✗ Missing"}');
      debugPrint('  - Public key (direct): ${storedPublicKey?.isNotEmpty == true ? "✓ Found" : "✗ Missing"}');

      if (storedPrivateKey.isEmpty || storedCertificateId.isEmpty) {
        debugPrint('❌ [CREATE_PROJECT] Missing required certificate data');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Certificate not found. Please logout and register again.'),
              backgroundColor: Colors.orange,
            ),
          );
        }
        return;
      }

      // If public key not stored separately, extract from certificate JSON
      if ((storedPublicKey == null || storedPublicKey.isEmpty) &&
          storedCertificateJson != null) {
        try {
          debugPrint('🔍 [CREATE_PROJECT] Extracting public key from certificate JSON...');
          final certificate = jsonDecode(storedCertificateJson) as Map<String, dynamic>?;
          
          if (certificate != null) {
            // Certificate structure: {certificate_data: {...}, signature: "...", certificate_id: "..."}
            final certificateData = certificate['certificate_data'] as Map<String, dynamic>?;
            storedPublicKey = certificateData?['public_key'] as String?;
            
            if (storedPublicKey != null) {
              debugPrint('✅ [CREATE_PROJECT] Public key extracted from certificate JSON');
              // Store it separately for future use
              await _storage.write(key: 'public_key', value: storedPublicKey);
            } else {
              debugPrint('⚠️ [CREATE_PROJECT] Public key not found in certificate_data');
            }
          } else {
            debugPrint('⚠️ [CREATE_PROJECT] Certificate JSON is null after parsing');
          }
        } catch (e, stackTrace) {
          debugPrint('❌ [CREATE_PROJECT] Error parsing certificate JSON: $e');
          debugPrint('❌ [CREATE_PROJECT] Stack trace: $stackTrace');
          final preview = storedCertificateJson.length > 200 
              ? storedCertificateJson.substring(0, 200) 
              : storedCertificateJson;
          debugPrint('❌ [CREATE_PROJECT] Certificate JSON (first 200 chars): $preview');
        }
      }

      if (storedPublicKey == null || storedPublicKey.isEmpty) {
        debugPrint('❌ [CREATE_PROJECT] Public key is still null or empty');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Invalid certificate format. Please logout and register again.'),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }

      debugPrint('✅ [CREATE_PROJECT] All certificate data retrieved successfully');
      debugPrint('  - Certificate ID: $storedCertificateId');
      final publicKeyPreview = storedPublicKey.length > 30 
          ? '${storedPublicKey.substring(0, 30)}...' 
          : storedPublicKey;
      debugPrint('  - Public Key: $publicKeyPreview');


      // Create project data with enhanced security
      final projectData = {
        'id': projectId,
        'client_id': currentUser.id,
        'title': title,
        'description': description,
        'total_budget': budget.toString(),
        'status': 'draft',
        'category': _selectedCategory ?? 'general',
        'billing_type': _billingType,
        'deadline': _deadlineController.text.trim().isNotEmpty 
            ? _deadlineController.text.trim() 
            : null,
        'freelancer_id': widget.freelancerId,
        'skills_required': _selectedSkills.isNotEmpty ? _selectedSkills : null,
        'created_at': DateTime.now().toIso8601String(),
      };

      // Upload project JSON to IPFS
      final ipfsResult = await IPFSService.uploadJSON({
        ...projectData,
        'milestones': _milestones,
      });
      if (ipfsResult['success'] != true) {
        throw Exception('Failed to upload project data to IPFS');
      }
      final ipfsHash = ipfsResult['ipfsHash'] as String;

      // Sign project creation with enhanced data
      final signature = SignatureService.signData(
        data: jsonEncode({
          ...projectData,
          'milestones': _milestones,
          'ipfs_hash': ipfsHash,
        }),
        privateKeyEncoded: storedPrivateKey,
      );

      // Create Pinata IPFS group for this project
      final groupResult = await IPFSService.createGroup(
        name: 'project-$projectId',
      );
      if (groupResult['success'] != true) {
        throw Exception('Failed to create IPFS group');
      }
      final groupId = groupResult['groupId'] as String;

      // Generate Project Registration Certificate (PDF)
      final projectCertId = const Uuid().v4();
      final certPayload = {
        ...projectData,
        'milestones': _milestones,
        'ipfs_hash': ipfsHash,
        'ipfs_group_id': groupId,
        'certificate_id': projectCertId,
        'created_at': DateTime.now().toIso8601String(),
      };
      final certSignature = SignatureService.signData(
        data: jsonEncode(certPayload),
        privateKeyEncoded: storedPrivateKey,
      );
      final pdfBytes = await CertificatePdfService.buildProjectCertificate(
        projectData: projectData,
        certificateId: projectCertId,
        ipfsGroupId: groupId,
        signature: certSignature,
        milestones: _milestones,
      );

      // Upload certificate PDF to IPFS and add to group
      final certUpload = await IPFSService.uploadFile(
        pdfBytes,
        'project_certificate_$projectId.pdf',
        groupId: groupId,
      );
      if (certUpload['success'] != true) {
        throw Exception('Failed to upload project certificate to IPFS');
      }

      // Add project JSON CID to the same group
      await IPFSService.addCidsToGroup(
        groupId: groupId,
        cids: [ipfsHash],
      );

      // Store in Supabase
      await SupabaseService.client
          .from('projects')
          .insert({
            ...projectData,
            'ipfs_hash': ipfsHash,
            'certificate_group_hash': groupId,
            'signature': signature,
            'blockchain_tx_id': null,
          });

      // Create milestones in database
      for (var i = 0; i < _milestones.length; i++) {
        final milestone = _milestones[i];
        await SupabaseService.client
            .from('milestones')
            .insert({
              'id': const Uuid().v4(),
              'project_id': projectId,
              'title': milestone['title'],
              'description': milestone['description'] ?? '',
              'amount': milestone['amount'].toString(),
              'milestone_number': i + 1,
              'deadline': milestone['due_date']?.toString().isEmpty == true 
                  ? null 
                  : milestone['due_date'],
              'status': 'locked',
              'created_at': DateTime.now().toIso8601String(),
            });
      }

      // Register project on blockchain (RegisterProject: projectId, title, description, category, clientId, totalBudget, deadline, skillsRequired, ipfsHash, ipfsGroupHash)
      debugPrint('🔗 [CREATE_PROJECT] Registering project on blockchain...');
      final blockchainResult = await BlockchainService.registerProject(
        projectId: projectId,
        clientId: currentUser.id,
        title: title,
        description: description,
        budget: budget,
        ipfsHash: ipfsHash,
        ipfsGroupHash: groupId,
        category: _selectedCategory ?? 'general',
        deadline: _deadlineController.text.trim().isNotEmpty
            ? _deadlineController.text.trim()
            : null,
        skillsRequired: _selectedSkills.isNotEmpty ? _selectedSkills : null,
      );

      if (blockchainResult['success'] == true) {
        debugPrint('✅ [CREATE_PROJECT] Project stored on blockchain! TX ID: ${blockchainResult['txId']}');
        await SupabaseService.client
            .from('projects')
            .update({'blockchain_tx_id': blockchainResult['txId']})
            .eq('id', projectId);
      } else {
        final err = blockchainResult['error']?.toString() ?? 'Unknown error';
        debugPrint('⚠️ [CREATE_PROJECT] Blockchain registration failed: $err');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Project created in app. Blockchain push failed: ${err.length > 80 ? "${err.substring(0, 80)}..." : err}',
              ),
              backgroundColor: Colors.orange,
              duration: const Duration(seconds: 5),
            ),
          );
        }
      }

      // Log audit trail with enhanced details
      await AuditLogService.logAction(
        actionType: 'project_create',
        target: projectId,
        actionData: {
          'title': title,
          'budget': budget,
          'milestones_count': _milestones.length,
          'skills_required': _selectedSkills,
          'ipfs_hash': ipfsHash,
        },
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Project created successfully with ${_milestones.length} milestones!'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true);
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
          _isSubmitting = false;
        });
      }
    }
  }

  Future<bool> _ensureProfile(User user) async {
    try {
      final existing = await SupabaseService.client
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();
      if (existing != null) return true;

      final fullName = user.userMetadata?['full_name']?.toString() ??
          user.email?.split('@').first ??
          'User';
      final role = user.userMetadata?['role']?.toString() ?? 'client';
      final profileRecord = {
        'id': user.id,
        'email': user.email ?? '',
        'full_name': fullName,
        'role': role,
        'reputation': 50,
      };

      await SupabaseService.client
          .from('profiles')
          .insert(profileRecord);
      return true;
    } catch (e) {
      debugPrint('⚠️ [CREATE_PROJECT] Could not create profile: $e');
      return false;
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
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'CREATE PROJECT',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 24),
                      _buildTextField(
                        controller: _titleController,
                        label: 'PROJECT TITLE *',
                        hint: 'Enter project title',
                        validator: (v) => v?.isEmpty == true ? 'Required' : null,
                        onSubmitted: (_) {
                          if (!_isGeneratingDraft) {
                            _generateProjectDraft();
                          }
                        },
                      ),
                      const SizedBox(height: 20),
                      _buildDescriptionSection(),
                      const SizedBox(height: 20),
                      Row(
                        children: [
                          Expanded(
                            child: _buildTextField(
                              controller: _budgetController,
                              label: 'TOTAL BUDGET (USD) *',
                              hint: '0.00',
                              keyboardType: TextInputType.number,
                              validator: (v) {
                                if (v?.isEmpty == true) return 'Required';
                                final amount = double.tryParse(v ?? '');
                                if (amount == null) return 'Invalid amount';
                                if (amount <= 0) return 'Must be > 0';
                                return null;
                              },
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildDropdown(
                              label: 'BILLING TYPE *',
                              value: _billingType,
                              items: ['fixed', 'hourly'],
                              onChanged: (v) => setState(() => _billingType = v),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      _buildTextField(
                        controller: _deadlineController,
                        label: 'DEADLINE (Optional)',
                        hint: 'YYYY-MM-DD',
                      ),
                      const SizedBox(height: 20),
                      _buildSkillsSelector(),
                      const SizedBox(height: 24),
                      _buildMilestonesSection(),
                      const SizedBox(height: 32),
                      _submitButton(),
                    ],
                  ),
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
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: const Icon(Icons.arrow_back),
          ),
          const SizedBox(width: 8),
          const Expanded(
            child: Text(
              'CREATE PROJECT',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    int maxLines = 1,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
    void Function(String)? onSubmitted,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: ink, width: 3),
          ),
          child: TextFormField(
            controller: controller,
            maxLines: maxLines,
            keyboardType: keyboardType,
            validator: validator,
            onFieldSubmitted: onSubmitted,
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: const TextStyle(color: muted),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.all(12),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDescriptionSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'DESCRIPTION *',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w900,
              ),
            ),
            GestureDetector(
              onTap: _isGeneratingDraft ? null : _generateProjectDraft,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: _isGeneratingDraft ? Colors.grey : primary,
                  border: Border.all(color: ink, width: 2),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.auto_awesome, color: Colors.white, size: 14),
                    const SizedBox(width: 6),
                    Text(
                      _isGeneratingDraft ? 'GENERATING...' : 'AUTO-GENERATE',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: ink, width: 3),
          ),
          child: TextFormField(
            controller: _descriptionController,
            maxLines: 5,
            validator: (v) => v?.isEmpty == true ? 'Required' : null,
            decoration: const InputDecoration(
              hintText: 'Describe your project in detail...',
              hintStyle: TextStyle(color: muted),
              border: InputBorder.none,
              contentPadding: EdgeInsets.all(12),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDropdown({
    required String label,
    required String? value,
    required List<String> items,
    required Function(String?) onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: ink, width: 3),
          ),
          child: DropdownButton<String>(
            value: value,
            isExpanded: true,
            underline: const SizedBox(),
            items: items.map((item) => DropdownMenuItem(
              value: item,
              child: Text(item.toUpperCase()),
            )).toList(),
            onChanged: onChanged,
          ),
        ),
      ],
    );
  }

  Widget _buildSkillsSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'REQUIRED SKILLS (Optional)',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _availableSkills.map((skill) {
            final isSelected = _selectedSkills.contains(skill);
            return GestureDetector(
              onTap: () {
                setState(() {
                  if (isSelected) {
                    _selectedSkills.remove(skill);
                  } else {
                    _selectedSkills.add(skill);
                  }
                });
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected ? primary : Colors.white,
                  border: Border.all(color: ink, width: 2),
                ),
                child: Text(
                  skill,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: isSelected ? Colors.white : ink,
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildMilestonesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Expanded(
              child: Text(
                'MILESTONES *',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Flexible(
              child: Wrap(
                alignment: WrapAlignment.end,
                spacing: 8,
                runSpacing: 8,
                children: [
                  GestureDetector(
                    onTap: _isGeneratingMilestones ? null : _generateMilestonesWithCount,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: _isGeneratingMilestones ? Colors.grey : primary,
                        border: Border.all(color: ink, width: 2),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.auto_awesome, color: Colors.white, size: 16),
                          const SizedBox(width: 4),
                          Text(
                            _isGeneratingMilestones ? 'GENERATING...' : 'AUTO-GENERATE',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  GestureDetector(
                    onTap: _addMilestone,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: primary,
                        border: Border.all(color: ink, width: 2),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.add, color: Colors.white, size: 16),
                          SizedBox(width: 4),
                          Text(
                            'ADD MILESTONE',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (_milestones.isEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: muted, width: 2, style: BorderStyle.solid),
            ),
            child: const Text(
              'No milestones added. Click "ADD MILESTONE" to add one.',
              style: TextStyle(color: muted, fontSize: 12),
            ),
          )
        else
          ..._milestones.asMap().entries.map((entry) {
            final index = entry.key;
            final milestone = entry.value;
            return _buildMilestoneCard(index, milestone);
          }),
      ],
    );
  }

  Widget _buildMilestoneCard(int index, Map<String, dynamic> milestone) {
    final totalBudget = double.tryParse(_budgetController.text.trim()) ?? 0.0;
    
    // Get or create controllers
    final titleController = _milestoneTitleControllers.putIfAbsent(
      index,
      () => TextEditingController(text: milestone['title']?.toString() ?? ''),
    );
    final descController = _milestoneDescControllers.putIfAbsent(
      index,
      () => TextEditingController(text: milestone['description']?.toString() ?? ''),
    );
    final amountController = _milestoneAmountControllers.putIfAbsent(
      index,
      () => TextEditingController(text: milestone['amount']?.toString() ?? '0.0'),
    );
    final dueDateController = _milestoneDueDateControllers.putIfAbsent(
      index,
      () => TextEditingController(text: milestone['due_date']?.toString() ?? ''),
    );
    
    // Sync controller values with milestone data
    if (titleController.text != (milestone['title']?.toString() ?? '')) {
      titleController.text = milestone['title']?.toString() ?? '';
    }
    if (descController.text != (milestone['description']?.toString() ?? '')) {
      descController.text = milestone['description']?.toString() ?? '';
    }
    if (amountController.text != (milestone['amount']?.toString() ?? '0.0')) {
      amountController.text = milestone['amount']?.toString() ?? '0.0';
    }
    if (dueDateController.text != (milestone['due_date']?.toString() ?? '')) {
      dueDateController.text = milestone['due_date']?.toString() ?? '';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: ink, width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'MILESTONE ${index + 1}',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                ),
              ),
              if (_milestones.length > 1)
                GestureDetector(
                  onTap: () => _removeMilestone(index),
                  child: const Icon(Icons.delete, color: Colors.red, size: 18),
                ),
            ],
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: titleController,
            decoration: const InputDecoration(
              labelText: 'Title *',
              border: OutlineInputBorder(),
              isDense: true,
            ),
            onChanged: (v) => _updateMilestone(index, {'title': v}),
            validator: (v) => v?.isEmpty == true ? 'Required' : null,
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: descController,
            decoration: const InputDecoration(
              labelText: 'Description',
              border: OutlineInputBorder(),
              isDense: true,
            ),
            maxLines: 2,
            onChanged: (v) => _updateMilestone(index, {'description': v}),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: amountController,
                  decoration: InputDecoration(
                    labelText: 'Amount (USD) *',
                    border: const OutlineInputBorder(),
                    isDense: true,
                    suffixText: totalBudget > 0
                        ? '${((double.tryParse(amountController.text) ?? 0.0) / totalBudget * 100).toStringAsFixed(1)}%'
                        : null,
                  ),
                  keyboardType: TextInputType.number,
                  onChanged: (v) {
                    final amount = double.tryParse(v) ?? 0.0;
                    final percentage = totalBudget > 0 ? (amount / totalBudget * 100) : 0.0;
                    _updateMilestone(index, {
                      'amount': amount,
                      'percentage': percentage,
                    });
                  },
                  validator: (v) {
                    if (v?.isEmpty == true) return 'Required';
                    final amount = double.tryParse(v ?? '');
                    if (amount == null || amount <= 0) return 'Invalid';
                    return null;
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextFormField(
                  controller: dueDateController,
                  decoration: const InputDecoration(
                    labelText: 'Due Date (Optional)',
                    border: OutlineInputBorder(),
                    isDense: true,
                    hintText: 'YYYY-MM-DD',
                  ),
                  onChanged: (v) => _updateMilestone(index, {'due_date': v}),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _submitButton() {
    final totalBudget = double.tryParse(_budgetController.text.trim()) ?? 0.0;
    final milestoneTotal = _milestones.fold<double>(
      0.0,
      (sum, m) => sum + (m['amount'] as num? ?? 0.0).toDouble(),
    );
    final isValid = _milestones.isNotEmpty && 
                    (milestoneTotal - totalBudget).abs() < 0.01 &&
                    totalBudget > 0;

    return GestureDetector(
      onTap: isValid && !_isSubmitting ? _createProject : null,
      child: Stack(
        children: [
          Container(
            margin: const EdgeInsets.only(left: 6, top: 6),
            height: 56,
            color: ink,
          ),
          Container(
            height: 56,
            decoration: BoxDecoration(
              color: isValid && !_isSubmitting ? primary : Colors.grey,
              border: Border.all(color: ink, width: 3),
            ),
            alignment: Alignment.center,
            child: _isSubmitting
                ? const CircularProgressIndicator(color: Colors.white)
                : Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text(
                        'CREATE PROJECT',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      if (!isValid && _milestones.isNotEmpty)
                        Text(
                          'Milestone total: \$${milestoneTotal.toStringAsFixed(2)} / \$${totalBudget.toStringAsFixed(2)}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                          ),
                        ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

/// Dialog that owns its TextEditingController so it is disposed only when
/// the route is fully removed, avoiding "used after being disposed".
class _MilestoneCountDialog extends StatefulWidget {
  final String initialCount;

  const _MilestoneCountDialog({required this.initialCount});

  @override
  State<_MilestoneCountDialog> createState() => _MilestoneCountDialogState();
}

class _MilestoneCountDialogState extends State<_MilestoneCountDialog> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialCount);
  }

  @override
  void dispose() {
    // Defer disposal until after route exit transition. The route animates out
    // and can rebuild the TextField during that time; disposing immediately
    // causes "TextEditingController used after being disposed".
    final c = _controller;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Future.delayed(const Duration(milliseconds: 400), () {
        c.dispose();
      });
    });
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Auto-Generate Milestones'),
      content: TextField(
        controller: _controller,
        keyboardType: TextInputType.number,
        decoration: const InputDecoration(
          labelText: 'Milestone count',
          hintText: 'e.g. 4',
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        TextButton(
          onPressed: () {
            final parsed = int.tryParse(_controller.text.trim());
            Navigator.pop(context, parsed);
          },
          child: const Text('Generate'),
        ),
      ],
    );
  }
}
