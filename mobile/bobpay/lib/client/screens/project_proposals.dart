import 'package:flutter/material.dart';
import 'package:bobpay/services/proposal_service.dart';

class ProjectProposalsPage extends StatefulWidget {
  final String projectId;
  final String projectTitle;

  const ProjectProposalsPage({
    super.key,
    required this.projectId,
    required this.projectTitle,
  });

  @override
  State<ProjectProposalsPage> createState() => _ProjectProposalsPageState();
}

class _ProjectProposalsPageState extends State<ProjectProposalsPage> {
  static const bg = Color(0xFFFAF8F5);
  static const ink = Color(0xFF1A1F2E);
  static const primary = Color(0xFFF06542);
  static const muted = Color(0xFF8A8A8A);

  bool _isLoading = true;
  String? _error;
  List<Map<String, dynamic>> _proposals = [];

  @override
  void initState() {
    super.initState();
    _fetchProposals();
  }

  Future<void> _fetchProposals() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final result = await ProposalService.getProjectProposals(widget.projectId);
    setState(() {
      if (result['success'] == true) {
        _proposals = List<Map<String, dynamic>>.from(result['proposals'] ?? []);
      } else {
        _error = result['error']?.toString() ?? 'Failed to load proposals';
      }
      _isLoading = false;
    });
  }

  Future<void> _acceptProposal(Map<String, dynamic> proposal) async {
    final proposalId = proposal['id'] as String?;
    if (proposalId == null) return;

    setState(() {
      _isLoading = true;
    });

    final result = await ProposalService.acceptProposal(
      proposalId: proposalId,
      projectId: widget.projectId,
    );

    if (mounted) {
      setState(() {
        _isLoading = false;
      });
      if (result['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Proposal accepted. Contract created.')),
        );
        _fetchProposals();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(result['error']?.toString() ?? 'Failed to accept proposal')),
        );
      }
    }
  }

  void _viewProposal(Map<String, dynamic> proposal) {
    final freelancer = proposal['freelancer'] as Map<String, dynamic>?;
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'PROPOSAL DETAILS',
                style: TextStyle(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 12),
              Text('Freelancer: ${freelancer?['full_name'] ?? 'Unknown'}'),
              Text('Email: ${freelancer?['email'] ?? '-'}'),
              const SizedBox(height: 8),
              Text('Budget: ${proposal['proposed_budget'] ?? '-'}'),
              Text('Timeline: ${proposal['proposed_timeline'] ?? '-'}'),
              const SizedBox(height: 8),
              Text('Cover Letter:\n${proposal['cover_letter'] ?? '-'}'),
              const SizedBox(height: 16),
              Align(
                alignment: Alignment.centerRight,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Close'),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(
        backgroundColor: bg,
        elevation: 0,
        foregroundColor: ink,
        title: Text('Proposals • ${widget.projectTitle}'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
              : _proposals.isEmpty
                  ? const Center(child: Text('No proposals yet'))
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _proposals.length,
                      itemBuilder: (context, index) {
                        final proposal = _proposals[index];
                        final freelancer = proposal['freelancer'] as Map<String, dynamic>?;
                        final status = proposal['status']?.toString().toLowerCase() ?? 'pending';

                        return Container(
                          margin: const EdgeInsets.only(bottom: 16),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            border: Border.all(color: ink, width: 2),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                freelancer?['full_name'] ?? 'Freelancer',
                                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                              ),
                              const SizedBox(height: 4),
                              Text(freelancer?['email'] ?? '-', style: const TextStyle(color: muted)),
                              const SizedBox(height: 8),
                              Text('Budget: ${proposal['proposed_budget'] ?? '-'}'),
                              Text('Timeline: ${proposal['proposed_timeline'] ?? '-'}'),
                              const SizedBox(height: 8),
                              Text('Status: ${status.toUpperCase()}'),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  OutlinedButton(
                                    onPressed: () => _viewProposal(proposal),
                                    child: const Text('View'),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: ElevatedButton(
                                      style: ElevatedButton.styleFrom(backgroundColor: primary),
                                      onPressed: status == 'pending' ? () => _acceptProposal(proposal) : null,
                                      child: const Text('Accept & Create Contract'),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        );
                      },
                    ),
    );
  }
}
