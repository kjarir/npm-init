import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:bobpay/services/code_review_service.dart';
import 'package:bobpay/services/proposal_service.dart';
import 'package:bobpay/services/wallet_service.dart';

class SubmitProposal extends StatefulWidget {
  final Map<String, dynamic> project;
  
  const SubmitProposal({
    super.key,
    required this.project,
  });

  @override
  State<SubmitProposal> createState() => _SubmitProposalState();
}

class _SubmitProposalState extends State<SubmitProposal> {
  static const bg = Color(0xFFF7F9F4);
  static const ink = Color(0xFF1A1F2E);
  static const green = Color(0xFF7CFA4C);
  static const muted = Color(0xFF8A8A8A);
  static const lightGreen = Color(0xFFE9F7E5);

  final TextEditingController _bidAmountController = TextEditingController();
  final TextEditingController _durationController = TextEditingController();
  final TextEditingController _coverLetterController = TextEditingController();
  final TextEditingController _portfolioLinkController = TextEditingController();
  PlatformFile? _codeZipFile;
  
  bool _isSubmitting = false;

  @override
  void dispose() {
    _bidAmountController.dispose();
    _durationController.dispose();
    _coverLetterController.dispose();
    _portfolioLinkController.dispose();
    super.dispose();
  }

  String _formatCurrency(double amount) {
    return WalletService.formatCurrency(amount);
  }

  Future<void> _submitProposal() async {
    // Validate inputs
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
      _isSubmitting = true;
    });

    try {
      if (_codeZipFile != null) {
        final projectTitle = widget.project['title']?.toString() ?? 'Untitled Project';
        final reviewResult = await CodeReviewService.submitForReview(
          title: projectTitle,
          description: coverLetter,
          amount: bidAmount,
          zipFile: _codeZipFile!,
          milestonesJson: jsonEncode([]),
        );
        if (reviewResult['success'] != true) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(reviewResult['error']?.toString() ?? 'Code review failed'),
                backgroundColor: Colors.red,
              ),
            );
          }
          return;
        }
      }

      final result = await ProposalService.submitProposal(
        projectId: widget.project['id'].toString(),
        bidAmount: bidAmount,
        estimatedDuration: duration,
        coverLetter: coverLetter,
        portfolioLink: portfolioLink.isNotEmpty ? portfolioLink : null,
      );

      if (result['success'] == true) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(_codeZipFile != null
                  ? 'Proposal submitted and code review queued!'
                  : 'Proposal submitted successfully!'),
              backgroundColor: Colors.green,
            ),
          );
          Navigator.pop(context);
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['error']?.toString() ?? 'Failed to submit proposal'),
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
          _isSubmitting = false;
        });
      }
    }
  }

  Future<void> _pickCodeZip() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['zip'],
      withData: true,
    );
    if (result == null || result.files.isEmpty) return;
    setState(() {
      _codeZipFile = result.files.first;
    });
  }

  @override
  Widget build(BuildContext context) {
    final projectTitle = widget.project['title']?.toString() ?? 'Untitled Project';
    final projectBudget = widget.project['total_budget'] ?? 0;
    
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
                    _projectCard(projectTitle, projectBudget),
                    const SizedBox(height: 24),
                    _label('YOUR BID AMOUNT'),
                    _amountField(),
                    const SizedBox(height: 6),
                    const Text(
                      '* BobPay Escrow Fee (3%) will be deducted.',
                      style: TextStyle(
                        fontSize: 12,
                        color: muted,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                    const SizedBox(height: 24),
                    _label('ESTIMATED DURATION'),
                    _durationField(),
                    const SizedBox(height: 24),
                    _label('COVER LETTER / WHY YOU?'),
                    _coverField(),
                    const SizedBox(height: 24),
                    _label('ATTACH PORTFOLIO/LINKS (Optional)'),
                    _uploadBox(),
                    const SizedBox(height: 32),
                    _submitButton(),
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
        border: Border(bottom: BorderSide(color: ink, width: 3)),
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: const Icon(Icons.arrow_back),
          ),
          const Spacer(),
          const Text(
            'SUBMIT PROPOSAL',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
            ),
          ),
          const Spacer(),
        ],
      ),
    );
  }

  Widget _projectCard(String title, dynamic budget) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: lightGreen,
        border: Border.all(color: ink, width: 3),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'PROJECT',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
            ),
          ),
          if (budget != null && budget != 0) ...[
            const SizedBox(height: 8),
            Text(
              'Budget: ${_formatCurrency(budget is num ? budget.toDouble() : double.tryParse(budget.toString()) ?? 0)}',
              style: const TextStyle(
                fontSize: 12,
                color: muted,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ],
      ),
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

  Widget _amountField() {
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
                  hintStyle: TextStyle(
                    color: Colors.black38,
                  ),
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

  Widget _durationField() {
    return Container(
      height: 52,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: ink, width: 3),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _durationController,
              style: const TextStyle(
                fontSize: 14,
              ),
              decoration: const InputDecoration(
                hintText: 'e.g. 14 Days',
                hintStyle: TextStyle(
                  color: Colors.black38,
                ),
                border: InputBorder.none,
              ),
            ),
          ),
          const Icon(Icons.schedule),
        ],
      ),
    );
  }

  Widget _coverField() {
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
        style: const TextStyle(
          fontSize: 14,
        ),
        decoration: const InputDecoration(
          hintText: 'Describe your experience and why you are the best fit for this project...',
          hintStyle: TextStyle(
            color: Colors.black38,
          ),
          border: InputBorder.none,
        ),
      ),
    );
  }

  Widget _uploadBox() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(
          color: ink,
          width: 3,
          style: BorderStyle.solid,
        ),
      ),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'UPLOAD CODE ZIP (Optional)',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 10),
            if (_codeZipFile != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Text(
                  'Selected: ${_codeZipFile!.name}',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                  textAlign: TextAlign.center,
                ),
              )
            else
              const Text(
                'No zip selected',
                style: TextStyle(color: muted, fontSize: 12),
              ),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton(
                  onPressed: _pickCodeZip,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: green,
                  ),
                  child: const Text('Choose Zip'),
                ),
                const SizedBox(width: 12),
                if (_codeZipFile != null)
                  TextButton(
                    onPressed: () => setState(() => _codeZipFile = null),
                    child: const Text('Clear'),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            const Text(
              'PORTFOLIO / LINK (Optional)',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextField(
                controller: _portfolioLinkController,
                style: const TextStyle(
                  fontSize: 12,
                ),
                decoration: const InputDecoration(
                  hintText: 'Paste portfolio link here',
                  hintStyle: TextStyle(
                    color: Colors.black38,
                    fontSize: 11,
                  ),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _submitButton() {
    return GestureDetector(
      onTap: _isSubmitting ? null : _submitProposal,
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
              color: _isSubmitting ? Colors.grey : green,
              border: Border.all(color: ink, width: 3),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (_isSubmitting)
                  const Padding(
                    padding: EdgeInsets.all(8.0),
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                else ...[
                  const Text(
                    'SUBMIT PROPOSAL',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Icon(Icons.arrow_forward),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
