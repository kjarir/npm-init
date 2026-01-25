import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:bobpay/services/supabase_client.dart';
import 'package:bobpay/services/ipfs_service.dart';
import 'package:bobpay/services/blockchain_service.dart';
import 'package:bobpay/services/audit_log_service.dart';
import 'package:bobpay/services/signature_service.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class EditProject extends StatefulWidget {
  final Map<String, dynamic> project;

  const EditProject({
    super.key,
    required this.project,
  });

  @override
  State<EditProject> createState() => _EditProjectState();
}

class _EditProjectState extends State<EditProject> {
  static const bg = Color(0xFFFAF8F5);
  static const ink = Color(0xFF1A1F2E);
  static const primary = Color(0xFFF06542);
  static const muted = Color(0xFF8A8A8A);

  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _budgetController = TextEditingController();
  final _storage = FlutterSecureStorage();

  bool _isSaving = false;
  bool _isDeleting = false;

  @override
  void initState() {
    super.initState();
    _loadProjectData();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _budgetController.dispose();
    super.dispose();
  }

  void _loadProjectData() {
    _titleController.text = widget.project['title']?.toString() ?? '';
    _descriptionController.text = widget.project['description']?.toString() ?? '';
    _budgetController.text = widget.project['total_budget']?.toString() ?? '';
  }

  Future<void> _updateProject() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isSaving = true;
    });

    try {
      final privateKey = await _storage.read(key: 'private_key');
      if (privateKey == null) {
        throw Exception('Private key not found');
      }

      final updates = {
        'title': _titleController.text.trim(),
        'description': _descriptionController.text.trim(),
        'total_budget': _budgetController.text.trim(),
        'updated_at': DateTime.now().toIso8601String(),
      };

      final signature = SignatureService.signData(
        data: jsonEncode(updates),
        privateKeyEncoded: privateKey,
      );

      // Update in Supabase
      await SupabaseService.client
          .from('projects')
          .update({
            ...updates,
            'signature': signature,
          })
          .eq('id', widget.project['id']);

      // Update IPFS
      final projectData = {
        ...widget.project,
        ...updates,
      };
      final ipfsResult = await IPFSService.uploadJSON(projectData);
      if (ipfsResult['success'] == true) {
        await SupabaseService.client
            .from('projects')
            .update({'ipfs_hash': ipfsResult['ipfsHash']})
            .eq('id', widget.project['id']);
      }

      // Update on blockchain
      await BlockchainService.updateProject(
        projectId: widget.project['id'].toString(),
        updates: updates,
        signature: signature,
      );

      // Log audit
      await AuditLogService.logAction(
        actionType: 'project_update',
        target: widget.project['id'].toString(),
        actionData: updates,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Project updated successfully!'),
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
          _isSaving = false;
        });
      }
    }
  }

  Future<void> _deleteProject() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Project'),
        content: const Text('Are you sure? This cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() {
      _isDeleting = true;
    });

    try {
      final privateKey = await _storage.read(key: 'private_key');
      if (privateKey == null) {
        throw Exception('Private key not found');
      }

      final signature = SignatureService.signData(
        data: 'delete|${widget.project['id']}',
        privateKeyEncoded: privateKey,
      );

      // Delete on blockchain
      await BlockchainService.deleteProject(
        projectId: widget.project['id'].toString(),
        signature: signature,
      );

      // Delete in Supabase
      await SupabaseService.client
          .from('projects')
          .delete()
          .eq('id', widget.project['id']);

      // Log audit
      await AuditLogService.logAction(
        actionType: 'project_delete',
        target: widget.project['id'].toString(),
        actionData: {'title': widget.project['title']},
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Project deleted successfully'),
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
          _isDeleting = false;
        });
      }
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
                        'EDIT PROJECT',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 24),
                      _buildTextField(
                        controller: _titleController,
                        label: 'PROJECT TITLE',
                        validator: (v) => v?.isEmpty == true ? 'Required' : null,
                      ),
                      const SizedBox(height: 20),
                      _buildTextField(
                        controller: _descriptionController,
                        label: 'DESCRIPTION',
                        maxLines: 5,
                        validator: (v) => v?.isEmpty == true ? 'Required' : null,
                      ),
                      const SizedBox(height: 20),
                      _buildTextField(
                        controller: _budgetController,
                        label: 'BUDGET (USD)',
                        keyboardType: TextInputType.number,
                        validator: (v) {
                          if (v?.isEmpty == true) return 'Required';
                          if (double.tryParse(v ?? '') == null) return 'Invalid';
                          return null;
                        },
                      ),
                      const SizedBox(height: 32),
                      Row(
                        children: [
                          Expanded(
                            child: _outlineButton('DELETE', _deleteProject, _isDeleting),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _primaryButton('SAVE', _updateProject, _isSaving),
                          ),
                        ],
                      ),
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
              'EDIT PROJECT',
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
    int maxLines = 1,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
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
            decoration: const InputDecoration(
              border: InputBorder.none,
              contentPadding: EdgeInsets.all(12),
            ),
          ),
        ),
      ],
    );
  }

  Widget _primaryButton(String text, VoidCallback onTap, bool isLoading) {
    return GestureDetector(
      onTap: isLoading ? null : onTap,
      child: Stack(
        children: [
          Container(
            margin: const EdgeInsets.only(left: 4, top: 4),
            height: 48,
            color: ink,
          ),
          Container(
            height: 48,
            decoration: BoxDecoration(
              color: isLoading ? Colors.grey : primary,
              border: Border.all(color: ink, width: 3),
            ),
            alignment: Alignment.center,
            child: isLoading
                ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                : Text(
                    text,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _outlineButton(String text, VoidCallback onTap, bool isLoading) {
    return GestureDetector(
      onTap: isLoading ? null : onTap,
      child: Container(
        height: 48,
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: Colors.red, width: 3),
        ),
        alignment: Alignment.center,
        child: isLoading
            ? const CircularProgressIndicator(color: Colors.red, strokeWidth: 2)
            : Text(
                text,
                style: const TextStyle(
                  color: Colors.red,
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                ),
              ),
      ),
    );
  }
}
