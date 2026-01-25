import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

/// Certificate PDF Service
/// Generates PDF certificates for project, contract, and milestone events.
class CertificatePdfService {
  static Future<Uint8List> buildProjectCertificate({
    required Map<String, dynamic> projectData,
    required String certificateId,
    required String ipfsGroupId,
    required String signature,
    List<Map<String, dynamic>>? milestones,
  }) async {
    final fields = <String, dynamic>{
      'Project ID': projectData['id'],
      'Project Name': projectData['title'],
      'Client ID': projectData['client_id'],
      'Description': projectData['description'] ?? '—',
      'Category': projectData['category'] ?? 'general',
      'Total Budget': projectData['total_budget'],
      'Billing Type': projectData['billing_type'] ?? 'fixed',
      'Deadline': projectData['deadline'] ?? 'N/A',
      'Skills Required': _formatList(projectData['skills_required']),
      'IPFS Group ID': ipfsGroupId,
      'Created At': projectData['created_at'] ?? '—',
    };
    return _buildCertificate(
      title: 'Project Registration Certificate',
      certificateId: certificateId,
      fields: fields,
      signature: signature,
      milestones: milestones,
    );
  }

  static String _formatList(dynamic v) {
    if (v == null) return '—';
    if (v is List) return v.isEmpty ? '—' : v.join(', ');
    if (v is String) return v.isEmpty ? '—' : v;
    return v.toString();
  }

  static Future<Uint8List> buildContractCertificate({
    required Map<String, dynamic> contractData,
    required String certificateId,
    required String ipfsGroupId,
    required String signature,
  }) async {
    return _buildCertificate(
      title: 'Project Contract Certificate',
      certificateId: certificateId,
      fields: {
        'Contract ID': contractData['id'],
        'Project ID': contractData['project_id'],
        'Client ID': contractData['client_id'],
        'Freelancer ID': contractData['freelancer_id'],
        'Amount': contractData['amount'],
        'Status': contractData['status'],
        'IPFS Group ID': ipfsGroupId,
      },
      signature: signature,
    );
  }

  static Future<Uint8List> buildMilestoneCertificate({
    required Map<String, dynamic> milestoneData,
    required String contractId,
    required String certificateId,
    required String ipfsGroupId,
    required String signature,
    Map<String, dynamic>? extraFields,
  }) async {
    final fields = {
      'Milestone ID': milestoneData['id'],
      'Contract ID': contractId,
      'Project ID': milestoneData['project_id'],
      'Amount': milestoneData['amount'],
      'Status': milestoneData['status'],
      'IPFS Group ID': ipfsGroupId,
    };
    if (extraFields != null && extraFields.isNotEmpty) {
      fields.addAll(extraFields);
    }
    return _buildCertificate(
      title: 'Milestone Completion Certificate',
      certificateId: certificateId,
      fields: fields,
      signature: signature,
    );
  }

  static Future<Uint8List> _buildCertificate({
    required String title,
    required String certificateId,
    required Map<String, dynamic> fields,
    required String signature,
    List<Map<String, dynamic>>? milestones,
  }) async {
    final pdf = pw.Document();
    final now = DateTime.now().toIso8601String();

    final body = <pw.Widget>[
      pw.Text(title, style: pw.TextStyle(fontSize: 22, fontWeight: pw.FontWeight.bold)),
      pw.SizedBox(height: 12),
      pw.Text('Certificate ID: $certificateId'),
      pw.Text('Issued At: $now'),
      pw.SizedBox(height: 16),
      ...fields.entries.map((e) => pw.Padding(
            padding: const pw.EdgeInsets.only(bottom: 6),
            child: pw.Text('${e.key}: ${e.value ?? 'N/A'}'),
          )),
    ];

    if (milestones != null && milestones.isNotEmpty) {
      body.add(pw.SizedBox(height: 16));
      body.add(pw.Text('Milestones', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)));
      body.add(pw.SizedBox(height: 8));
      for (var i = 0; i < milestones.length; i++) {
        final m = milestones[i];
        final n = i + 1;
        body.add(pw.Padding(
          padding: const pw.EdgeInsets.only(bottom: 10),
          child: pw.Container(
            padding: const pw.EdgeInsets.all(10),
            decoration: pw.BoxDecoration(border: pw.Border.all(width: 1)),
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Text('Milestone $n: ${m['title'] ?? '—'}', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                pw.SizedBox(height: 4),
                pw.Text('Description: ${m['description'] ?? '—'}'),
                pw.Text('Amount: ${m['amount'] ?? '0'} | Due: ${m['due_date'] ?? '—'} | Status: ${m['status'] ?? 'pending'}'),
              ],
            ),
          ),
        ));
      }
    }

    body.add(pw.SizedBox(height: 20));
    body.add(pw.Text('Signature:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)));
    body.add(pw.Text(signature));

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (context) {
          return pw.Container(
            padding: const pw.EdgeInsets.all(24),
            decoration: pw.BoxDecoration(border: pw.Border.all(width: 2)),
            child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: body),
          );
        },
      ),
    );

    return pdf.save();
  }
}
