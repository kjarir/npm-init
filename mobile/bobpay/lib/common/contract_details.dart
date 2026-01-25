import 'package:flutter/material.dart';
import 'package:bobpay/services/project_service.dart';
import 'package:bobpay/services/wallet_service.dart';
import 'package:bobpay/services/deliverable_service.dart';
import 'package:bobpay/freelancer/submit_deliverable.dart';

class ContractDetailsPage extends StatefulWidget {
  final Map<String, dynamic> contract;
  final bool isFreelancer;

  const ContractDetailsPage({
    super.key,
    required this.contract,
    required this.isFreelancer,
  });

  @override
  State<ContractDetailsPage> createState() => _ContractDetailsPageState();
}

class _ContractDetailsPageState extends State<ContractDetailsPage> {
  static const bg = Color(0xFFFAF8F5);
  static const ink = Color(0xFF1A1F2E);
  static const primary = Color(0xFFF06542);
  static const muted = Color(0xFF8A8A8A);
  static const green = Color(0xFF2FB344);

  Map<String, dynamic>? _project;
  List<Map<String, dynamic>> _deliverables = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadDetails();
  }

  Future<void> _loadDetails() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final projectId = widget.contract['project_id']?.toString();
      if (projectId != null) {
        final fullProject = await ProjectService.getProjectById(projectId);
        if (fullProject != null) {
          _project = fullProject;
        }
        final deliverableResult =
            await DeliverableService.getProjectDeliverables(projectId);
        if (deliverableResult['success'] == true) {
          _deliverables =
              List<Map<String, dynamic>>.from(deliverableResult['deliverables'] ?? []);
        }
      }
    } catch (e) {
      _error = 'Failed to load details: $e';
    }

    if (mounted) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final projectTitle = _project?['title']?.toString() ??
        widget.contract['project']?['title']?.toString() ??
        'Contract Details';

    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: Column(
          children: [
            _topBar(projectTitle),
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? Center(
                          child: Text(
                            _error!,
                            style: const TextStyle(color: Colors.red),
                          ),
                        )
                      : SingleChildScrollView(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _sectionTitle('PROJECT'),
                              _infoCard([
                                _row('Title', projectTitle),
                                _row('Status', _project?['status']?.toString() ?? 'N/A'),
                                _row('Budget', WalletService.formatCurrency(
                                  _project?['total_budget'] ?? widget.contract['amount'],
                                )),
                                _row('Deadline', _project?['deadline']?.toString() ?? 'N/A'),
                                if ((_project?['description'] ?? '').toString().isNotEmpty)
                                  _row('Description', _project?['description']?.toString() ?? ''),
                              ]),
                              const SizedBox(height: 20),
                              _sectionTitle('CONTRACT'),
                              _infoCard([
                                _row('Contract ID', widget.contract['id']?.toString() ?? 'N/A'),
                                _row('Status', widget.contract['status']?.toString() ?? 'N/A'),
                                _row('Amount', WalletService.formatCurrency(
                                  widget.contract['amount'] ?? 0,
                                )),
                                _row('Certificate ID', widget.contract['contract_certificate_id']?.toString() ?? 'N/A'),
                                _row('IPFS Hash', widget.contract['ipfs_contract_hash']?.toString() ?? 'N/A'),
                                _row('Blockchain TX', widget.contract['blockchain_tx_id']?.toString() ?? 'N/A'),
                                _row('Secure Channel', widget.contract['secure_channel_id']?.toString() ?? 'N/A'),
                              ]),
                              const SizedBox(height: 20),
                              _sectionTitle('PARTICIPANTS'),
                              _infoCard([
                                _row('Client', _displayName(widget.contract['client'])),
                                _row('Freelancer', _displayName(widget.contract['freelancer'])),
                              ]),
                              const SizedBox(height: 20),
                              _sectionTitle('MILESTONES'),
                              _milestones(),
                              const SizedBox(height: 20),
                              _sectionTitle('DELIVERABLES'),
                              _deliverablesList(),
                              if (widget.isFreelancer) ...[
                                const SizedBox(height: 20),
                                _submitDeliverableButton(projectTitle),
                              ],
                            ],
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _topBar(String title) {
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
          Expanded(
            child: Text(
              title.toUpperCase(),
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w900,
          color: muted,
        ),
      ),
    );
  }

  Widget _infoCard(List<Widget> rows) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: ink, width: 3),
      ),
      child: Column(
        children: rows,
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 12,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _milestones() {
    final milestones = _project?['milestones'];
    if (milestones is! List || milestones.isEmpty) {
      return _infoCard([_row('Milestones', 'No milestones found')]);
    }

    return Column(
      children: milestones.map<Widget>((m) {
        final title = m['title']?.toString() ?? 'Milestone';
        final status = m['status']?.toString() ?? 'pending';
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: ink, width: 2),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: status.toLowerCase() == 'completed' ? green : primary,
                  border: Border.all(color: ink, width: 2),
                ),
                child: Text(
                  status.toUpperCase(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _deliverablesList() {
    if (_deliverables.isEmpty) {
      return _infoCard([_row('Deliverables', 'No deliverables submitted')]);
    }

    return Column(
      children: _deliverables.map((d) {
        final name = d['file_name']?.toString() ?? 'Deliverable';
        final url = d['file_url']?.toString() ?? '';
        final type = d['file_type']?.toString() ?? 'file';
        final desc = d['description']?.toString() ?? '';

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: ink, width: 2),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                name,
                style: const TextStyle(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 6),
              Text('Type: $type', style: const TextStyle(fontSize: 12)),
              if (desc.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text('Notes: $desc', style: const TextStyle(fontSize: 12)),
              ],
              if (url.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  url,
                  style: const TextStyle(fontSize: 12, color: primary),
                ),
              ],
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _submitDeliverableButton(String projectTitle) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: () {
          final projectId = widget.contract['project_id']?.toString() ??
              _project?['id']?.toString() ??
              '';
          if (projectId.isEmpty) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Project ID missing. Please refresh the contract.'),
                backgroundColor: Colors.red,
              ),
            );
            return;
          }
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => SubmitDeliverablePage(
                projectId: projectId,
                projectTitle: projectTitle,
              ),
            ),
          ).then((_) => _loadDetails());
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: ink,
          padding: const EdgeInsets.symmetric(vertical: 14),
        ),
        child: const Text(
          'SUBMIT DELIVERABLE',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
      ),
    );
  }

  String _displayName(dynamic profile) {
    if (profile is Map<String, dynamic>) {
      final name = profile['full_name']?.toString();
      if (name != null && name.isNotEmpty) return name.toUpperCase();
      final email = profile['email']?.toString();
      if (email != null && email.isNotEmpty) return email.toUpperCase();
    }
    return 'USER';
  }
}
