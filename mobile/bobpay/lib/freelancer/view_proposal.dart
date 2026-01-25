import 'package:flutter/material.dart';
import 'package:bobpay/services/proposal_service.dart';
import 'package:bobpay/services/wallet_service.dart';

class ViewProposal extends StatefulWidget {
  final Map<String, dynamic> proposal;

  const ViewProposal({
    super.key,
    required this.proposal,
  });

  @override
  State<ViewProposal> createState() => _ViewProposalState();
}

class _ViewProposalState extends State<ViewProposal> {
  static const bg = Color(0xFFFAF8F5);
  static const ink = Color(0xFF1A1F2E);
  static const primary = Color(0xFFF06542);
  static const muted = Color(0xFF8A8A8A);
  static const green = Color(0xFF2D8659);
  static const yellow = Color(0xFFF2C94C);

  final TextEditingController _bidAmountController = TextEditingController();
  final TextEditingController _durationController = TextEditingController();
  final TextEditingController _coverLetterController = TextEditingController();
  final TextEditingController _portfolioLinkController = TextEditingController();

  bool _isEditing = false;
  bool _isUpdating = false;
  bool _isDeleting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadProposalData();
  }

  @override
  void dispose() {
    _bidAmountController.dispose();
    _durationController.dispose();
    _coverLetterController.dispose();
    _portfolioLinkController.dispose();
    super.dispose();
  }

  void _loadProposalData() {
    final proposal = widget.proposal;
    final proposedBudget = proposal['proposed_budget'];
    final timeline = proposal['proposed_timeline'];
    final coverLetter = proposal['cover_letter'];
    final portfolioLink = proposal['portfolio_link'];

    _bidAmountController.text = proposedBudget?.toString() ?? '';
    _durationController.text = timeline?.toString() ?? '';
    _coverLetterController.text = coverLetter?.toString() ?? '';
    _portfolioLinkController.text = portfolioLink?.toString() ?? '';
  }

  String _formatCurrency(dynamic amount) {
    if (amount == null) return '\$0';
    if (amount is String) {
      final parsed = double.tryParse(amount);
      return parsed != null ? WalletService.formatCurrency(parsed) : '\$0';
    }
    if (amount is num) {
      return WalletService.formatCurrency(amount.toDouble());
    }
    return '\$0';
  }

  String _getStatusDisplay(String? status) {
    if (status == null) return 'PENDING';
    switch (status.toLowerCase()) {
      case 'accepted':
        return 'ACCEPTED';
      case 'pending':
        return 'PENDING';
      case 'rejected':
        return 'REJECTED';
      case 'shortlisted':
        return 'SHORTLISTED';
      case 'withdrawn':
        return 'WITHDRAWN';
      default:
        return status.toUpperCase();
    }
  }

  Color _getStatusColor(String? status) {
    if (status == null) return yellow;
    switch (status.toLowerCase()) {
      case 'accepted':
        return green;
      case 'pending':
        return primary;
      case 'shortlisted':
        return yellow;
      case 'rejected':
      case 'withdrawn':
        return muted;
      default:
        return primary;
    }
  }

  bool get _canEdit {
    final status = widget.proposal['status']?.toString().toLowerCase();
    return status == 'pending';
  }

  Future<void> _updateProposal() async {
    final bidAmountText = _bidAmountController.text.trim();
    final duration = _durationController.text.trim();
    final coverLetter = _coverLetterController.text.trim();
    final portfolioLink = _portfolioLinkController.text.trim();

    if (bidAmountText.isEmpty || duration.isEmpty || coverLetter.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please fill in all required fields'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final bidAmount = double.tryParse(bidAmountText);
    if (bidAmount == null || bidAmount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a valid bid amount'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      _isUpdating = true;
      _error = null;
    });

    try {
      final result = await ProposalService.updateProposal(
        proposalId: widget.proposal['id'].toString(),
        bidAmount: bidAmount,
        estimatedDuration: duration,
        coverLetter: coverLetter,
        portfolioLink: portfolioLink.isNotEmpty ? portfolioLink : null,
      );

      if (result['success'] == true) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Proposal updated successfully!'),
              backgroundColor: Colors.green,
            ),
          );
          setState(() {
            _isEditing = false;
            // Update the proposal data
            widget.proposal['proposed_budget'] = bidAmount.toString();
            widget.proposal['proposed_timeline'] = duration;
            widget.proposal['cover_letter'] = coverLetter;
            widget.proposal['portfolio_link'] = portfolioLink;
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _error = result['error']?.toString() ?? 'Failed to update proposal';
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(_error!),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Error: $e';
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_error!),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isUpdating = false;
        });
      }
    }
  }

  Future<void> _deleteProposal() async {
    // Show confirmation dialog
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Proposal'),
        content: const Text(
          'Are you sure you want to delete this proposal? This action cannot be undone.',
        ),
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
      _error = null;
    });

    try {
      final result = await ProposalService.deleteProposal(
        widget.proposal['id'].toString(),
      );

      if (result['success'] == true) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Proposal deleted successfully'),
              backgroundColor: Colors.green,
            ),
          );
          // Navigate back to proposals list
          Navigator.pop(context, true); // Return true to indicate deletion
        }
      } else {
        if (mounted) {
          setState(() {
            _error = result['error']?.toString() ?? 'Failed to delete proposal';
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(_error!),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Error: $e';
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_error!),
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
    final proposal = widget.proposal;
    final project = proposal['project'] as Map<String, dynamic>?;
    final projectTitle = project?['title']?.toString() ?? 'Unknown Project';
    final projectBudget = project?['total_budget'];
    final status = proposal['status']?.toString();
    final createdDate = proposal['created_at']?.toString();

    // Format date
    String dateDisplay = 'Recently';
    if (createdDate != null) {
      try {
        final date = DateTime.parse(createdDate);
        dateDisplay = '${date.day}/${date.month}/${date.year}';
      } catch (e) {
        dateDisplay = 'Recently';
      }
    }

    return Scaffold(
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
                    // Status Badge
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      color: _getStatusColor(status),
                      child: Text(
                        _getStatusDisplay(status),
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    // Project Info Card
                    _projectInfoCard(projectTitle, projectBudget, dateDisplay),
                    const SizedBox(height: 24),
                    // Proposal Details
                    const Text(
                      'PROPOSAL DETAILS',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Bid Amount
                    _label('YOUR BID AMOUNT'),
                    _isEditing
                        ? _editableAmountField()
                        : _readOnlyField(
                            _formatCurrency(proposal['proposed_budget']),
                          ),
                    const SizedBox(height: 20),
                    // Timeline
                    _label('ESTIMATED DURATION'),
                    _isEditing
                        ? _editableDurationField()
                        : _readOnlyField(
                            proposal['proposed_timeline']?.toString() ?? 'N/A',
                          ),
                    const SizedBox(height: 20),
                    // Cover Letter
                    _label('COVER LETTER'),
                    _isEditing
                        ? _editableCoverField()
                        : _readOnlyCoverField(
                            proposal['cover_letter']?.toString() ?? '',
                          ),
                    const SizedBox(height: 20),
                    // Portfolio Link
                    _label('PORTFOLIO LINK (Optional)'),
                    _isEditing
                        ? _editablePortfolioField()
                        : _readOnlyField(
                            proposal['portfolio_link']?.toString() ?? 'Not provided',
                          ),
                    const SizedBox(height: 32),
                    // Action Buttons
                    if (_canEdit) ...[
                      if (_isEditing) ...[
                        Row(
                          children: [
                            Expanded(
                              child: _outlineButton(
                                'CANCEL',
                                () {
                                  setState(() {
                                    _isEditing = false;
                                    _loadProposalData(); // Reset to original values
                                  });
                                },
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _primaryButton(
                                'SAVE CHANGES',
                                _isUpdating ? null : _updateProposal,
                                isLoading: _isUpdating,
                              ),
                            ),
                          ],
                        ),
                      ] else ...[
                        Row(
                          children: [
                            Expanded(
                              child: _outlineButton(
                                'EDIT PROPOSAL',
                                () {
                                  setState(() {
                                    _isEditing = true;
                                  });
                                },
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _dangerButton(
                                'DELETE PROPOSAL',
                                _isDeleting ? null : _deleteProposal,
                                isLoading: _isDeleting,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ] else ...[
                      _infoCard(
                        'This proposal cannot be edited because it is ${_getStatusDisplay(status).toLowerCase()}.',
                      ),
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
              'PROPOSAL DETAILS',
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

  Widget _projectInfoCard(String title, dynamic budget, String date) {
    return Stack(
      children: [
        Container(
          margin: const EdgeInsets.only(left: 6, top: 6),
          color: ink,
        ),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: ink, width: 3),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'PROJECT',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: muted,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _meta('PROJECT BUDGET', _formatCurrency(budget)),
                  ),
                  Expanded(
                    child: _meta('SUBMITTED', date),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _meta(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: muted,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w900,
          ),
        ),
      ],
    );
  }

  Widget _label(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }

  Widget _readOnlyField(String value) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: ink, width: 3),
      ),
      child: Text(
        value,
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  Widget _readOnlyCoverField(String value) {
    return Container(
      padding: const EdgeInsets.all(16),
      height: 120,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: ink, width: 3),
      ),
      child: SingleChildScrollView(
        child: Text(
          value.isEmpty ? 'No cover letter provided' : value,
          style: const TextStyle(
            fontSize: 14,
            height: 1.4,
          ),
        ),
      ),
    );
  }

  Widget _editableAmountField() {
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
              child: TextField(
                controller: _bidAmountController,
                keyboardType: TextInputType.number,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
                decoration: const InputDecoration(
                  hintText: 'Enter amount',
                  hintStyle: TextStyle(color: Colors.black38),
                  border: InputBorder.none,
                ),
              ),
            ),
          ),
          Container(
            width: 60,
            alignment: Alignment.center,
            decoration: const BoxDecoration(
              border: Border(left: BorderSide(color: ink, width: 3)),
            ),
            child: const Text(
              'USD',
              style: TextStyle(
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _editableDurationField() {
    return Container(
      height: 52,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: ink, width: 3),
      ),
      child: TextField(
        controller: _durationController,
        style: const TextStyle(fontSize: 14),
        decoration: const InputDecoration(
          hintText: 'e.g. 14 Days',
          hintStyle: TextStyle(color: Colors.black38),
          border: InputBorder.none,
        ),
      ),
    );
  }

  Widget _editableCoverField() {
    return Container(
      height: 160,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: ink, width: 3),
      ),
      child: TextField(
        controller: _coverLetterController,
        maxLines: null,
        expands: true,
        textAlignVertical: TextAlignVertical.top,
        style: const TextStyle(fontSize: 14),
        decoration: const InputDecoration(
          hintText: 'Describe your experience and why you are the best fit...',
          hintStyle: TextStyle(color: Colors.black38),
          border: InputBorder.none,
        ),
      ),
    );
  }

  Widget _editablePortfolioField() {
    return Container(
      height: 52,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: ink, width: 3),
      ),
      child: TextField(
        controller: _portfolioLinkController,
        style: const TextStyle(fontSize: 14),
        decoration: const InputDecoration(
          hintText: 'Paste portfolio link here',
          hintStyle: TextStyle(color: Colors.black38),
          border: InputBorder.none,
        ),
      ),
    );
  }

  Widget _outlineButton(String text, VoidCallback? onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 48,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: ink, width: 3),
        ),
        child: Text(
          text,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }

  Widget _primaryButton(String text, VoidCallback? onTap, {bool isLoading = false}) {
    return GestureDetector(
      onTap: onTap,
      child: Stack(
        children: [
          Container(
            margin: const EdgeInsets.only(left: 4, top: 4),
            height: 48,
            color: ink,
          ),
          Container(
            height: 48,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: isLoading ? Colors.grey : primary,
              border: Border.all(color: ink, width: 3),
            ),
            child: isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
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

  Widget _dangerButton(String text, VoidCallback? onTap, {bool isLoading = false}) {
    return GestureDetector(
      onTap: onTap,
      child: Stack(
        children: [
          Container(
            margin: const EdgeInsets.only(left: 4, top: 4),
            height: 48,
            color: ink,
          ),
          Container(
            height: 48,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: isLoading ? Colors.grey : Colors.red,
              border: Border.all(color: ink, width: 3),
            ),
            child: isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
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

  Widget _infoCard(String message) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        border: Border.all(color: ink, width: 2),
      ),
      child: Row(
        children: [
          const Icon(Icons.info_outline, color: Colors.blue),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontSize: 13,
                color: Colors.blue,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
