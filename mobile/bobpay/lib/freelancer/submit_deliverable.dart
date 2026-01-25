import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:file_picker/file_picker.dart';
import 'package:bobpay/services/deliverable_service.dart';
import 'package:bobpay/services/project_service.dart';

class SubmitDeliverablePage extends StatefulWidget {
  final String projectId;
  final String projectTitle;

  const SubmitDeliverablePage({
    super.key,
    required this.projectId,
    required this.projectTitle,
  });

  @override
  State<SubmitDeliverablePage> createState() => _SubmitDeliverablePageState();
}

class _SubmitDeliverablePageState extends State<SubmitDeliverablePage> {
  static const bg = Color(0xFFFAF8F5);
  static const ink = Color(0xFF1A1F2E);
  static const primary = Color(0xFFF06542);
  static const muted = Color(0xFF8A8A8A);

  final _repoController = TextEditingController();
  final _descController = TextEditingController();
  PlatformFile? _zipFile;
  bool _isSubmitting = false;
  bool _isPickingFile = false;
  double _uploadProgress = 0.0;
  String _submitStage = '';
  bool _isLoadingMilestones = false;
  List<Map<String, dynamic>> _milestones = [];
  String? _selectedMilestoneId;
  Map<String, dynamic>? _existingDeliverable;
  bool _isCheckingDeliverable = false;

  @override
  void dispose() {
    _repoController.dispose();
    _descController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _loadMilestones();
  }

  Future<void> _loadMilestones() async {
    setState(() {
      _isLoadingMilestones = true;
    });

    try {
      final project = await ProjectService.getProjectById(widget.projectId);
      if (project == null) return;
      final milestones = (project['milestones'] as List<dynamic>? ?? [])
          .map((m) => Map<String, dynamic>.from(m as Map))
          .toList();
      milestones.sort((a, b) {
        final aNum = int.tryParse(a['milestone_number']?.toString() ?? '') ?? 0;
        final bNum = int.tryParse(b['milestone_number']?.toString() ?? '') ?? 0;
        return aNum.compareTo(bNum);
      });

      final next = milestones.firstWhere(
        (m) => (m['status'] ?? '').toString().toLowerCase() != 'completed',
        orElse: () => milestones.isNotEmpty ? milestones.first : <String, dynamic>{},
      );

      if (!mounted) return;
      setState(() {
        _milestones = milestones;
        _selectedMilestoneId = next['id']?.toString();
      });
      await _loadExistingDeliverable();
    } catch (_) {
      // ignored - UI will show empty list
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingMilestones = false;
        });
      }
    }
  }

  Future<void> _loadExistingDeliverable() async {
    final milestoneId = _selectedMilestoneId;
    if (milestoneId == null || milestoneId.isEmpty) {
      if (mounted) {
        setState(() {
          _existingDeliverable = null;
        });
      }
      return;
    }

    if (mounted) {
      setState(() {
        _isCheckingDeliverable = true;
      });
    }

    try {
      final existing = await DeliverableService.getMilestoneDeliverable(
        projectId: widget.projectId,
        milestoneId: milestoneId,
      );
      if (!mounted) return;
      setState(() {
        _existingDeliverable = existing;
      });
    } finally {
      if (mounted) {
        setState(() {
          _isCheckingDeliverable = false;
        });
      }
    }
  }

  Future<void> _pickZipFile() async {
    if (_isPickingFile) return;
    setState(() {
      _isPickingFile = true;
    });
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['zip'],
        withData: true,
        withReadStream: false,
      );
      if (result == null || result.files.isEmpty) return;
      if (!mounted) return;
      setState(() {
        _zipFile = result.files.first;
      });
    } on PlatformException catch (e) {
      if (mounted) {
        final message = e.code == 'unknown_path'
            ? 'Drive files can be slow. Please move the zip to local storage or use a repo link.'
            : 'File picker error: ${e.message ?? e.code}';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isPickingFile = false;
        });
      }
    }
  }

  Future<void> _submit({bool isUpdate = false}) async {
    if (_isSubmitting) return;
    if (_selectedMilestoneId == null || _selectedMilestoneId!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select a milestone'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }
    if (_existingDeliverable != null && !isUpdate) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Already submitted. Use Update or Delete.'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }
    if (isUpdate && (_existingDeliverable?['id']?.toString().isEmpty ?? true)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Unable to update: deliverable id missing'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }
    setState(() {
      _isSubmitting = true;
      _uploadProgress = 0.0;
      _submitStage = 'Starting submission...';
    });

    final result = isUpdate
        ? await DeliverableService.updateDeliverable(
            deliverableId: _existingDeliverable?['id']?.toString() ?? '',
            projectId: widget.projectId,
            repoUrl: _repoController.text.trim(),
            zipFile: _zipFile,
            description: _descController.text.trim(),
            milestoneId: _selectedMilestoneId,
            onProgress: (progress) {
              if (!mounted) return;
              setState(() {
                _uploadProgress = progress.clamp(0, 1);
                if (_submitStage.isEmpty) {
                  _submitStage = 'Uploading zip...';
                }
              });
            },
            onStage: (stage) {
              if (!mounted) return;
              setState(() {
                _submitStage = stage;
              });
            },
          )
        : await DeliverableService.submitDeliverable(
            projectId: widget.projectId,
            repoUrl: _repoController.text.trim(),
            zipFile: _zipFile,
            description: _descController.text.trim(),
            milestoneId: _selectedMilestoneId,
            onProgress: (progress) {
              if (!mounted) return;
              setState(() {
                _uploadProgress = progress.clamp(0, 1);
                if (_submitStage.isEmpty) {
                  _submitStage = 'Uploading zip...';
                }
              });
            },
            onStage: (stage) {
              if (!mounted) return;
              setState(() {
                _submitStage = stage;
              });
            },
          );

    if (!mounted) return;
    if (result['success'] == true) {
      final certificate = result['certificate'] as Map<String, dynamic>?;
      final certId = certificate?['certificate_id']?.toString();
      final ipfsHash = certificate?['ipfs_hash']?.toString();
      final reviewScore = result['review_score'];
      final message = certId != null
          ? 'Milestone submitted. Cert: $certId${ipfsHash != null ? " • IPFS: $ipfsHash" : ""}'
          : 'Deliverable submitted successfully';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: Colors.green,
        ),
      );
      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          title: Row(
            children: [
              Icon(Icons.check_circle, color: Colors.green, size: 28),
              SizedBox(width: 10),
              Text('Success!', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Milestone deliverable submitted successfully.',
                  style: TextStyle(fontSize: 15),
                ),
                if (certId != null) ...[
                  SizedBox(height: 12),
                  Text('Certificate ID:', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                  SelectableText(certId, style: TextStyle(fontSize: 11, fontFamily: 'monospace')),
                ],
                if (ipfsHash != null) ...[
                  SizedBox(height: 8),
                  Text('IPFS hash:', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                  SelectableText(ipfsHash, style: TextStyle(fontSize: 11, fontFamily: 'monospace')),
                ],
                if (reviewScore != null) ...[
                  SizedBox(height: 8),
                  Text('Review score: ${(reviewScore as num).toStringAsFixed(1)}%', style: TextStyle(fontSize: 12)),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text('OK'),
            ),
          ],
        ),
      );
      if (mounted) {
        await _loadExistingDeliverable();
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['error']?.toString() ?? 'Failed to submit deliverable'),
          backgroundColor: Colors.red,
        ),
      );
    }

    if (mounted) {
      setState(() {
        _isSubmitting = false;
        _submitStage = '';
      });
    }
  }

  Future<void> _deleteExistingDeliverable() async {
    if (_existingDeliverable == null) return;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Delete Deliverable'),
          content: const Text('Are you sure you want to delete this deliverable?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Delete'),
            ),
          ],
        );
      },
    );

    if (confirm != true) return;

    setState(() {
      _isSubmitting = true;
    });

    final result = await DeliverableService.deleteDeliverable(
      deliverableId: _existingDeliverable?['id']?.toString() ?? '',
    );

    if (!mounted) return;
    if (result['success'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Deliverable deleted'),
          backgroundColor: Colors.green,
        ),
      );
      setState(() {
        _existingDeliverable = null;
      });
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['error']?.toString() ?? 'Failed to delete deliverable'),
          backgroundColor: Colors.red,
        ),
      );
    }

    if (mounted) {
      setState(() {
        _isSubmitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        if (_isSubmitting) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Upload in progress. Please wait...'),
              backgroundColor: Colors.orange,
            ),
          );
          return false;
        }
        return true;
      },
      child: Scaffold(
        backgroundColor: bg,
        body: SafeArea(
          child: Column(
            children: [
              _topBar(),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.projectTitle.toUpperCase(),
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 20),
                      _sectionTitle('REPO LINK (OPTIONAL)'),
                      _textField(
                        controller: _repoController,
                        hint: 'https://github.com/username/repo',
                      ),
                      const SizedBox(height: 16),
                      _sectionTitle('ZIP FILE (OPTIONAL)'),
                      _filePicker(),
                      const SizedBox(height: 16),
                      _sectionTitle('MILESTONE *'),
                      _milestoneSelector(),
                      const SizedBox(height: 16),
                      if (_isCheckingDeliverable)
                        const LinearProgressIndicator(),
                      if (_existingDeliverable != null) ...[
                        const SizedBox(height: 12),
                        _existingDeliverableCard(),
                        const SizedBox(height: 16),
                      ],
                      _sectionTitle('DESCRIPTION (OPTIONAL)'),
                      _textField(
                        controller: _descController,
                        hint: 'Add short notes about this deliverable...',
                        maxLines: 4,
                      ),
                      if (_isSubmitting && _zipFile != null) ...[
                        const SizedBox(height: 16),
                        if (_submitStage.isNotEmpty) ...[
                          Text(
                            _submitStage,
                            style: const TextStyle(fontSize: 12, color: muted),
                          ),
                          const SizedBox(height: 6),
                        ],
                        _uploadProgressBar(),
                      ],
                      const SizedBox(height: 24),
                      _submitButton(),
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
              'SUBMIT DELIVERABLE',
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

  Widget _sectionTitle(String text) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w900,
        color: muted,
      ),
    );
  }

  Widget _textField({
    required TextEditingController controller,
    required String hint,
    int maxLines = 1,
  }) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
      decoration: InputDecoration(
        hintText: hint,
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: ink, width: 2),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: ink, width: 2),
        ),
      ),
    );
  }

  Widget _filePicker() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: ink, width: 2),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_zipFile != null)
            Text(
              'Selected: ${_zipFile!.name}',
              style: const TextStyle(fontWeight: FontWeight.w700),
            )
          else
            const Text('No zip selected', style: TextStyle(color: muted)),
          const SizedBox(height: 10),
          Row(
            children: [
              ElevatedButton(
                onPressed: _isPickingFile ? null : _pickZipFile,
                style: ElevatedButton.styleFrom(
                  backgroundColor: primary,
                ),
                child: Text(_isPickingFile ? 'Opening...' : 'Choose Zip'),
              ),
              const SizedBox(width: 12),
              if (_zipFile != null)
                TextButton(
                  onPressed: () => setState(() => _zipFile = null),
                  child: const Text('Clear'),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _submitButton() {
    final isUpdate = _existingDeliverable != null;
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: _isSubmitting ? null : () => _submit(isUpdate: isUpdate),
        style: ElevatedButton.styleFrom(
          backgroundColor: ink,
          padding: const EdgeInsets.symmetric(vertical: 14),
        ),
        child: Text(
          _isSubmitting
              ? (isUpdate ? 'UPDATING...' : 'SUBMITTING...')
              : (isUpdate ? 'UPDATE DELIVERABLE' : 'SUBMIT DELIVERABLE'),
          style: const TextStyle(
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }

  Widget _existingDeliverableCard() {
    final deliverable = _existingDeliverable ?? {};
    final name = deliverable['file_name']?.toString() ?? 'Deliverable';
    final url = deliverable['file_url']?.toString() ?? '';
    final desc = deliverable['description']?.toString() ?? '';

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: ink, width: 2),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'DELIVERABLE ALREADY SUBMITTED',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w900,
              color: muted,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            name,
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
          if (desc.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(desc, style: const TextStyle(fontSize: 12)),
          ],
          if (url.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(url, style: const TextStyle(fontSize: 12, color: primary)),
          ],
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _isSubmitting ? null : _deleteExistingDeliverable,
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Colors.red),
                  ),
                  child: const Text('DELETE'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : () => _submit(isUpdate: true),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primary,
                  ),
                  child: const Text('UPDATE'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _uploadProgressBar() {
    final percent = (_uploadProgress * 100).clamp(0, 100).toStringAsFixed(0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Uploading $percent%',
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: muted,
          ),
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: LinearProgressIndicator(
            minHeight: 8,
            value: _uploadProgress > 0 ? _uploadProgress : null,
            backgroundColor: Colors.white,
            color: primary,
          ),
        ),
      ],
    );
  }

  Widget _milestoneSelector() {
    if (_isLoadingMilestones) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 8),
        child: LinearProgressIndicator(),
      );
    }

    if (_milestones.isEmpty) {
      return const Text(
        'No milestones found for this project.',
        style: TextStyle(color: muted),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: ink, width: 2),
        borderRadius: BorderRadius.circular(8),
      ),
      child: DropdownButton<String>(
        value: _selectedMilestoneId,
        isExpanded: true,
        underline: const SizedBox(),
        items: _milestones.map((milestone) {
          final title = milestone['title']?.toString() ?? 'Milestone';
          final number = milestone['milestone_number']?.toString() ?? '';
          final status = milestone['status']?.toString() ?? '';
          return DropdownMenuItem<String>(
            value: milestone['id']?.toString(),
            child: Text(
              'M${number.isNotEmpty ? number : ''} • $title (${status.isNotEmpty ? status : 'pending'})',
              overflow: TextOverflow.ellipsis,
            ),
          );
        }).toList(),
        onChanged: (value) {
          setState(() {
            _selectedMilestoneId = value;
          });
          _loadExistingDeliverable();
        },
      ),
    );
  }
}
