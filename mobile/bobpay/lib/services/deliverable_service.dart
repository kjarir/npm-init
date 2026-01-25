import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:file_picker/file_picker.dart';
import 'package:path/path.dart' as path;
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';
import 'package:bobpay/config/env_config.dart';
import 'package:bobpay/services/blockchain_service.dart';
import 'package:bobpay/services/certificate_pdf_service.dart';
import 'package:bobpay/services/code_review_service.dart';
import 'package:bobpay/services/ipfs_service.dart';
import 'package:bobpay/services/local_key_service.dart';
import 'package:bobpay/services/reputation_service.dart';
import 'package:bobpay/services/signature_service.dart';
import 'package:bobpay/services/supabase_client.dart';

/// Deliverable Service
/// Handles repo link and zip uploads for freelancers
class DeliverableService {
  static Future<Map<String, dynamic>> getProjectDeliverables(String projectId) async {
    try {
      final response = await SupabaseService.client
          .from('project_attachments')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', ascending: false);
      final deliverables = List<Map<String, dynamic>>.from(response).map((item) {
        final desc = item['description']?.toString();
        if (desc != null && desc.contains('[MILESTONE_ID:')) {
          final cleaned = _stripMilestoneTag(desc);
          final copy = Map<String, dynamic>.from(item);
          copy['description'] = cleaned;
          return copy;
        }
        return item;
      }).toList();

      return {
        'success': true,
        'deliverables': deliverables,
      };
    } catch (e) {
      debugPrint('❌ [DELIVERABLE] Fetch error: $e');
      return {
        'success': false,
        'error': 'Failed to load deliverables: $e',
      };
    }
  }

  static Future<Map<String, dynamic>> submitDeliverable({
    required String projectId,
    String? repoUrl,
    PlatformFile? zipFile,
    String? description,
    String? milestoneId,
    void Function(double progress)? onProgress,
    void Function(String stage)? onStage,
  }) async {
    try {
      if (!SupabaseService.isInitialized) {
        return {'success': false, 'error': 'Supabase not initialized'};
      }

      final user = SupabaseService.client.auth.currentUser;
      if (user == null) {
        return {'success': false, 'error': 'No user logged in'};
      }

      final hasRepo = repoUrl != null && repoUrl.trim().isNotEmpty;
      final hasZip = zipFile != null;
      if (!hasRepo && !hasZip) {
        return {'success': false, 'error': 'Provide repo link or zip file'};
      }

      if (milestoneId != null && milestoneId.isNotEmpty) {
        final existing = await getMilestoneDeliverable(
          projectId: projectId,
          milestoneId: milestoneId,
        );
        if (existing != null) {
          return {
            'success': false,
            'error': 'Deliverable already submitted for this milestone. Use update or delete.',
            'existingDeliverable': existing,
          };
        }
      }

      Map<String, dynamic>? certificateData;
      double? reviewScore;
      final records = <Map<String, dynamic>>[];
      if (hasRepo) {
        final repoLink = repoUrl.trim();
        records.add({
          'project_id': projectId,
          if (milestoneId != null && milestoneId.isNotEmpty) 'milestone_id': milestoneId,
          'uploaded_by': user.id,
          'file_name': 'Repository Link',
          'file_url': repoLink,
          'file_type': 'repo_link',
          'description': description ?? '',
        });
      }

      if (hasZip) {
        onStage?.call('Starting code review...');
        debugPrint('📦 [DELIVERABLE] Zip detected, starting code review...');
        final milestoneContext = await _loadMilestoneContext(
          projectId: projectId,
          freelancerId: user.id,
          milestoneId: milestoneId,
        );

        if (milestoneContext['success'] != true) {
          return milestoneContext;
        }

        final milestoneData = milestoneContext['milestone'] as Map<String, dynamic>;
        final selectedTitle = milestoneData['title']?.toString() ?? '';
        final milestoneDesc = milestoneData['description']?.toString() ?? '';
        final apiTitle = selectedTitle.isNotEmpty ? selectedTitle : (milestoneContext['project_title']?.toString() ?? 'Milestone Completion');
        final apiDesc = _buildCodeReviewDescription(
          milestoneTitle: selectedTitle,
          milestoneDescription: milestoneDesc,
          deliverableNotes: description?.trim(),
        );
        final milestonesJson = _buildMilestonesJsonForApi(milestoneData);
        final reviewResult = await CodeReviewService.submitForReview(
          title: apiTitle,
          description: apiDesc,
          amount: double.tryParse(milestoneData['amount']?.toString() ?? '0') ?? 0,
          zipFile: zipFile,
          milestonesJson: milestonesJson,
        );

        if (reviewResult['success'] != true) {
          debugPrint('❌ [DELIVERABLE] Code review failed: ${reviewResult['error']}');
          return {
            'success': false,
            'error': reviewResult['error']?.toString() ?? 'Code review failed',
          };
        }

        final apiData = reviewResult['data'] as Map<String, dynamic>? ?? {};
        debugPrint('📋 [DELIVERABLE] Code review API data: ${jsonEncode(apiData)}');
        if (reviewResult['raw'] != null) {
          debugPrint('📋 [DELIVERABLE] Code review API raw: ${reviewResult['raw']}');
        }
        final matched = _matchReviewToSelectedMilestone(apiData, selectedTitle, milestoneDesc);
        reviewScore = matched['score'] as double?;
        final reviewDataForCert = matched['reviewData'] as Map<String, dynamic>;
        debugPrint('✅ [DELIVERABLE] Code review completed (matched=${matched['matched']}, score=${reviewScore?.toStringAsFixed(1) ?? "N/A"}%)');
        onStage?.call('Code review completed');
        if (reviewScore != null) {
          debugPrint('📊 [DELIVERABLE] Review score: ${reviewScore.toStringAsFixed(1)}%');
        }

        final fileName = zipFile.name;
        final storagePath = 'deliverables/$projectId/${DateTime.now().millisecondsSinceEpoch}_$fileName';
        final fileSize = zipFile.size;
        Uint8List? resolvedBytes;

        onStage?.call('Uploading zip to storage...');
        debugPrint('📤 [DELIVERABLE] Uploading zip to storage...');
        if (onProgress != null) {
          try {
            await _uploadWithProgress(
              zipFile: zipFile,
              storagePath: storagePath,
              totalBytes: fileSize,
              onProgress: onProgress,
            ).timeout(const Duration(minutes: 5));
          } on TimeoutException {
            debugPrint('⚠️ [DELIVERABLE] Upload timed out, retrying without progress...');
            onStage?.call('Upload timed out. Retrying...');
            resolvedBytes = await _resolveZipBytes(zipFile);
            await SupabaseService.client.storage
                .from('message-media')
                .uploadBinary(storagePath, resolvedBytes);
          }
        } else {
          resolvedBytes = await _resolveZipBytes(zipFile);
          await SupabaseService.client.storage
              .from('message-media')
              .uploadBinary(storagePath, resolvedBytes);
        }
        final publicUrl = SupabaseService.client.storage
            .from('message-media')
            .getPublicUrl(storagePath);
        final recordedSize = (resolvedBytes?.length ?? fileSize);

        records.add({
          'project_id': projectId,
          if (milestoneId != null && milestoneId.isNotEmpty) 'milestone_id': milestoneId,
          'uploaded_by': user.id,
          'file_name': fileName,
          'file_url': publicUrl,
          'file_size': recordedSize,
          'file_type': _fileType(fileName),
          'description': description ?? '',
        });

        debugPrint('📥 [DELIVERABLE] Stored zip in Supabase Storage');

        onStage?.call('Building certificate...');
        debugPrint('🧾 [DELIVERABLE] Building milestone completion certificate...');
        final milestoneResult = await _createMilestoneCertificate(
          context: milestoneContext,
          reviewData: reviewDataForCert,
          reviewRaw: reviewResult['raw']?.toString(),
          deliverableDescription: description ?? '',
        );

        if (milestoneResult['success'] != true) {
          return milestoneResult;
        }
        certificateData = milestoneResult;

        if (reviewScore != null && reviewScore >= 90) {
          onStage?.call('Releasing escrow...');
          debugPrint('💸 [ESCROW] Review >= 90%, releasing escrow funds...');
          await _releaseEscrowForMilestone(
            context: milestoneContext,
            reviewScore: reviewScore,
          );
          final projectId = milestoneContext['project']?['id']?.toString();
          if (projectId != null && await _isFinalMilestone(projectId)) {
            onStage?.call('Updating reputation...');
            await _updateReputationAfterFinalMilestone(milestoneContext);
          }
        } else {
          debugPrint('⏸️ [ESCROW] Review below 90%, escrow not released');
        }
      }

      if (records.isNotEmpty) {
        onStage?.call('Saving deliverable...');
        final insertResult = await _insertDeliverables(
          records,
          milestoneId: milestoneId,
        );
        if (insertResult['success'] != true) {
          return insertResult;
        }
      }

      return {
        'success': true,
        if (certificateData != null) 'certificate': certificateData,
        if (reviewScore != null) 'review_score': reviewScore,
      };
    } catch (e) {
      debugPrint('❌ [DELIVERABLE] Submit error: $e');
      final msg = e.toString();
      if (msg.contains('Bucket not found')) {
        return {
          'success': false,
          'error': "Storage bucket 'message-media' not found. Create it in Supabase Dashboard → Storage → New bucket (name: message-media, public). Then run supabase_storage_message_media.sql in SQL Editor for RLS.",
        };
      }
      return {
        'success': false,
        'error': msg.length > 200 ? 'Upload failed. ${msg.substring(0, 200)}...' : 'Failed to submit deliverable: $e',
      };
    }
  }

  static String _fileType(String fileName) {
    final ext = path.extension(fileName).replaceFirst('.', '').toLowerCase();
    if (ext.isEmpty) return 'file';
    return ext;
  }

  static Future<Uint8List> _resolveZipBytes(PlatformFile zipFile) async {
    final inMemory = zipFile.bytes;
    if (inMemory != null) {
      return inMemory;
    }
    if (zipFile.path != null) {
      return Uint8List.fromList(await File(zipFile.path!).readAsBytes());
    }
    if (zipFile.readStream != null) {
      return await _readStreamBytes(zipFile.readStream!);
    }
    throw Exception('Zip file data unavailable');
  }

  static Future<Uint8List> _readStreamBytes(Stream<List<int>> stream) async {
    final builder = BytesBuilder(copy: false);
    await for (final chunk in stream) {
      builder.add(chunk);
    }
    return builder.toBytes();
  }

  static Stream<List<int>> _bytesToStream(Uint8List bytes, {int chunkSize = 64 * 1024}) async* {
    var offset = 0;
    while (offset < bytes.length) {
      final end = (offset + chunkSize) > bytes.length ? bytes.length : offset + chunkSize;
      yield bytes.sublist(offset, end);
      offset = end;
    }
  }

  static Future<void> _uploadWithProgress({
    required PlatformFile zipFile,
    required String storagePath,
    required int totalBytes,
    required void Function(double progress) onProgress,
  }) async {
    final token = SupabaseService.client.auth.currentSession?.accessToken;
    if (token == null) {
      throw Exception('User session expired. Please login again.');
    }

    final baseUrl = EnvConfig.supabaseUrl;
    if (baseUrl.isEmpty) {
      throw Exception('Supabase URL missing');
    }

    final uri = Uri.parse('$baseUrl/storage/v1/object/message-media/$storagePath');
    final request = http.StreamedRequest('POST', uri);
    request.headers['Authorization'] = 'Bearer $token';
    request.headers['apikey'] = EnvConfig.supabaseAnonKey;
    request.headers['Content-Type'] = 'application/zip';
    request.headers['x-upsert'] = 'true';

    final int size = totalBytes > 0 ? totalBytes : zipFile.size;
    if (size > 0) {
      request.contentLength = size;
    }

    Stream<List<int>> stream;
    if (zipFile.readStream != null) {
      stream = zipFile.readStream!;
    } else if (zipFile.path != null) {
      stream = File(zipFile.path!).openRead();
    } else if (zipFile.bytes != null) {
      stream = _bytesToStream(zipFile.bytes!);
    } else {
      throw Exception('Zip file data unavailable');
    }

    var sent = 0;
    onProgress(0);

    await for (final chunk in stream) {
      request.sink.add(chunk);
      sent += chunk.length;
      if (size > 0) {
        onProgress((sent / size).clamp(0, 1));
      }
    }
    await request.sink.close();

    final response = await request.send();
    final responseBody = await response.stream.bytesToString();
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Upload failed: ${response.statusCode} $responseBody');
    }
    onProgress(1);
  }

  static Future<Map<String, dynamic>> updateDeliverable({
    required String deliverableId,
    required String projectId,
    String? milestoneId,
    String? repoUrl,
    PlatformFile? zipFile,
    String? description,
    void Function(double progress)? onProgress,
    void Function(String stage)? onStage,
  }) async {
    try {
      final user = SupabaseService.client.auth.currentUser;
      if (user == null) {
        return {'success': false, 'error': 'No user logged in'};
      }

      Map<String, dynamic>? certificateData;
      double? reviewScore;
      final updates = <String, dynamic>{};
      if (repoUrl != null && repoUrl.trim().isNotEmpty) {
        updates['file_url'] = repoUrl.trim();
        updates['file_name'] = 'Repository Link';
        updates['file_type'] = 'repo_link';
      }

      if (zipFile != null) {
        onStage?.call('Starting code review...');
        debugPrint('📦 [DELIVERABLE] Updating with new zip, starting code review...');
        final milestoneContext = await _loadMilestoneContext(
          projectId: projectId,
          freelancerId: user.id,
          milestoneId: milestoneId,
        );
        if (milestoneContext['success'] != true) {
          return milestoneContext;
        }

        final milestoneData = milestoneContext['milestone'] as Map<String, dynamic>;
        final selectedTitle = milestoneData['title']?.toString() ?? '';
        final milestoneDesc = milestoneData['description']?.toString() ?? '';
        final apiTitle = selectedTitle.isNotEmpty ? selectedTitle : (milestoneContext['project_title']?.toString() ?? 'Milestone Completion');
        final apiDesc = _buildCodeReviewDescription(
          milestoneTitle: selectedTitle,
          milestoneDescription: milestoneDesc,
          deliverableNotes: description?.trim(),
        );
        final milestonesJson = _buildMilestonesJsonForApi(milestoneData);
        final reviewResult = await CodeReviewService.submitForReview(
          title: apiTitle,
          description: apiDesc,
          amount: double.tryParse(milestoneData['amount']?.toString() ?? '0') ?? 0,
          zipFile: zipFile,
          milestonesJson: milestonesJson,
        );

        if (reviewResult['success'] != true) {
          return {
            'success': false,
            'error': reviewResult['error']?.toString() ?? 'Code review failed',
          };
        }

        final apiData = reviewResult['data'] as Map<String, dynamic>? ?? {};
        final matched = _matchReviewToSelectedMilestone(apiData, selectedTitle, milestoneDesc);
        reviewScore = matched['score'] as double?;
        final reviewDataForCert = matched['reviewData'] as Map<String, dynamic>;
        onStage?.call('Code review completed');
        final fileName = zipFile.name;
        final storagePath = 'deliverables/$projectId/${DateTime.now().millisecondsSinceEpoch}_$fileName';
        final fileSize = zipFile.size;

        onStage?.call('Uploading zip to storage...');
        if (onProgress != null) {
          try {
            await _uploadWithProgress(
              zipFile: zipFile,
              storagePath: storagePath,
              totalBytes: fileSize,
              onProgress: onProgress,
            ).timeout(const Duration(minutes: 5));
          } on TimeoutException {
            debugPrint('⚠️ [DELIVERABLE] Upload timed out, retrying without progress...');
            onStage?.call('Upload timed out. Retrying...');
            final bytes = await _resolveZipBytes(zipFile);
            await SupabaseService.client.storage
                .from('message-media')
                .uploadBinary(storagePath, bytes);
          }
        } else {
          final bytes = await _resolveZipBytes(zipFile);
          await SupabaseService.client.storage
              .from('message-media')
              .uploadBinary(storagePath, bytes);
        }

        final publicUrl = SupabaseService.client.storage
            .from('message-media')
            .getPublicUrl(storagePath);

        updates['file_url'] = publicUrl;
        updates['file_name'] = fileName;
        updates['file_type'] = _fileType(fileName);
        updates['file_size'] = fileSize;

        onStage?.call('Building certificate...');
        debugPrint('🧾 [DELIVERABLE] Rebuilding milestone completion certificate...');
        final milestoneResult = await _createMilestoneCertificate(
          context: milestoneContext,
          reviewData: reviewDataForCert,
          reviewRaw: reviewResult['raw']?.toString(),
          deliverableDescription: description ?? '',
        );

        if (milestoneResult['success'] != true) {
          return milestoneResult;
        }
        certificateData = milestoneResult;

        if (reviewScore != null && reviewScore >= 90) {
          onStage?.call('Releasing escrow...');
          debugPrint('💸 [ESCROW] Review >= 90%, releasing escrow funds...');
          await _releaseEscrowForMilestone(
            context: milestoneContext,
            reviewScore: reviewScore,
          );
          final projectId = milestoneContext['project']?['id']?.toString();
          if (projectId != null && await _isFinalMilestone(projectId)) {
            onStage?.call('Updating reputation...');
            await _updateReputationAfterFinalMilestone(milestoneContext);
          }
        } else {
          debugPrint('⏸️ [ESCROW] Review below 90%, escrow not released');
        }
      }

      if (description != null) {
        updates['description'] = description;
      }
      if (milestoneId != null && milestoneId.isNotEmpty) {
        updates['milestone_id'] = milestoneId;
      }

      if (updates.isEmpty) {
        return {'success': false, 'error': 'Nothing to update'};
      }

      try {
        await SupabaseService.client
            .from('project_attachments')
            .update(updates)
            .eq('id', deliverableId);
      } catch (e) {
        final message = e.toString();
        if (message.contains('milestone_id') && message.contains('column')) {
          debugPrint('⚠️ [DELIVERABLE] milestone_id column missing. Falling back to tagged description.');
          final fallback = Map<String, dynamic>.from(updates);
          fallback.remove('milestone_id');
          if (milestoneId != null && milestoneId.isNotEmpty) {
            final desc = fallback['description']?.toString() ?? '';
            fallback['description'] = _appendMilestoneTag(desc, milestoneId);
          }
          await SupabaseService.client
              .from('project_attachments')
              .update(fallback)
              .eq('id', deliverableId);
        } else {
          rethrow;
        }
      }

      debugPrint('✅ [DELIVERABLE] Deliverable updated');
      onStage?.call('Done');
      return {
        'success': true,
        if (certificateData != null) 'certificate': certificateData,
        if (reviewScore != null) 'review_score': reviewScore,
      };
    } catch (e) {
      debugPrint('❌ [DELIVERABLE] Update error: $e');
      final msg = e.toString();
      if (msg.contains('Bucket not found')) {
        return {
          'success': false,
          'error': "Storage bucket 'message-media' not found. Create it in Supabase Dashboard → Storage → New bucket (name: message-media, public). Then run supabase_storage_message_media.sql in SQL Editor for RLS.",
        };
      }
      return {'success': false, 'error': 'Failed to update deliverable: $e'};
    }
  }

  static Future<Map<String, dynamic>> deleteDeliverable({
    required String deliverableId,
  }) async {
    try {
      await SupabaseService.client
          .from('project_attachments')
          .delete()
          .eq('id', deliverableId);
      return {'success': true};
    } catch (e) {
      debugPrint('❌ [DELIVERABLE] Delete error: $e');
      return {'success': false, 'error': 'Failed to delete deliverable: $e'};
    }
  }

  static Future<Map<String, dynamic>?> getMilestoneDeliverable({
    required String projectId,
    required String milestoneId,
  }) async {
    final user = SupabaseService.client.auth.currentUser;
    if (user == null) return null;
    try {
      final response = await SupabaseService.client
          .from('project_attachments')
          .select('*')
          .eq('project_id', projectId)
          .eq('uploaded_by', user.id)
          .eq('milestone_id', milestoneId)
          .order('created_at', ascending: false)
          .maybeSingle();
      if (response == null) return null;
      return Map<String, dynamic>.from(response);
    } catch (e) {
      final message = e.toString();
      if (message.contains('milestone_id') && message.contains('column')) {
        final response = await SupabaseService.client
            .from('project_attachments')
            .select('*')
            .eq('project_id', projectId)
            .eq('uploaded_by', user.id)
            .order('created_at', ascending: false);
        final items = List<Map<String, dynamic>>.from(response);
        final found = items.firstWhere(
          (item) => _hasMilestoneTag(item['description']?.toString() ?? '', milestoneId),
          orElse: () => <String, dynamic>{},
        );
        if (found.isEmpty) return null;
        final cleaned = Map<String, dynamic>.from(found);
        final desc = cleaned['description']?.toString();
        if (desc != null) {
          cleaned['description'] = _stripMilestoneTag(desc);
        }
        return cleaned;
      }
      return null;
    }
  }

  static Future<Map<String, dynamic>> _insertDeliverables(
    List<Map<String, dynamic>> records, {
    String? milestoneId,
  }) async {
    try {
      await SupabaseService.client
          .from('project_attachments')
          .insert(records);
      debugPrint('✅ [DELIVERABLE] Deliverable record stored');
      return {'success': true};
    } catch (e) {
      final message = e.toString();
      if (message.contains('milestone_id') && message.contains('column')) {
        debugPrint('⚠️ [DELIVERABLE] milestone_id column missing. Falling back to tagged description.');
        final fallback = records.map((record) {
          final desc = record['description']?.toString() ?? '';
          final withTag = milestoneId != null && milestoneId.isNotEmpty
              ? _appendMilestoneTag(desc, milestoneId)
              : desc;
          final copy = Map<String, dynamic>.from(record);
          copy.remove('milestone_id');
          copy['description'] = withTag;
          return copy;
        }).toList();
        await SupabaseService.client
            .from('project_attachments')
            .insert(fallback);
        debugPrint('✅ [DELIVERABLE] Deliverable stored with milestone tag');
        return {'success': true, 'note': 'milestone_id not available, tagged description'};
      }
      return {'success': false, 'error': 'Failed to store deliverable: $e'};
    }
  }

  static bool _hasMilestoneTag(String description, String milestoneId) {
    return description.contains('[MILESTONE_ID:$milestoneId]');
  }

  static String _buildCodeReviewDescription({
    required String milestoneTitle,
    required String milestoneDescription,
    String? deliverableNotes,
  }) {
    final parts = <String>[];
    if (milestoneTitle.isNotEmpty) {
      parts.add('Milestone: $milestoneTitle');
    }
    if (milestoneDescription.trim().isNotEmpty) {
      parts.add('Description: ${milestoneDescription.trim()}');
    }
    if (deliverableNotes != null && deliverableNotes.trim().isNotEmpty) {
      parts.add('Deliverable notes: ${deliverableNotes.trim()}');
    }
    if (parts.isEmpty) return 'Milestone completion submission';
    return parts.join('. ');
  }

  /// API expects milestones as JSON: [{ "title", "description", "amount" }].
  /// We send the selected milestone so the API audits against it.
  static String _buildMilestonesJsonForApi(Map<String, dynamic> milestone) {
    final title = milestone['title']?.toString() ?? '';
    final description = milestone['description']?.toString() ?? '';
    final amount = (milestone['amount'] != null)
        ? ((milestone['amount'] is num)
            ? (milestone['amount'] as num).toDouble()
            : double.tryParse(milestone['amount'].toString()) ?? 0)
        : 0.0;
    final list = [
      <String, dynamic>{'title': title, 'description': description, 'amount': amount},
    ];
    return jsonEncode(list);
  }

  /// API returns milestone_name as "title: description". Build same format to match.
  static String _apiMilestoneNameFormat(String title, String description) {
    final t = title.trim();
    final d = description.trim();
    if (t.isEmpty) return d;
    if (d.isEmpty) return t;
    return '$t: $d';
  }

  static Future<Map<String, dynamic>> _createMilestoneCertificate({
    Map<String, dynamic>? context,
    String? projectId,
    String? freelancerId,
    required Map<String, dynamic> reviewData,
    String? reviewRaw,
    required String deliverableDescription,
  }) async {
    try {
      final resolvedContext = context ?? await _loadMilestoneContext(
        projectId: projectId ?? '',
        freelancerId: freelancerId ?? '',
      );

      if (resolvedContext['success'] != true) {
        return resolvedContext;
      }

      final project = resolvedContext['project'] as Map<String, dynamic>;
      final contract = resolvedContext['contract'] as Map<String, dynamic>;
      final milestone = resolvedContext['milestone'] as Map<String, dynamic>;
      final groupId = resolvedContext['group_id']?.toString() ?? '';
      final resolvedFreelancerId = resolvedContext['freelancer_id']?.toString() ??
          freelancerId ??
          '';
      if (resolvedFreelancerId.isEmpty) {
        return {'success': false, 'error': 'Freelancer ID missing'};
      }

      debugPrint('🔐 [MILESTONE] Preparing certificate payload...');
      final localKeys = await LocalKeyService.ensureLocalKeys(userId: resolvedFreelancerId);
      final privateKey = localKeys['private_key'] ?? '';
      if (privateKey.isEmpty) {
        return {'success': false, 'error': 'Missing local private key'};
      }

      final certificateId = const Uuid().v4();
      final certPayload = {
        'certificate_id': certificateId,
        'project_id': project['id'],
        'project_title': project['title'],
        'contract_id': contract['id'],
        'milestone_id': milestone['id'],
        'milestone_title': milestone['title'],
        'milestone_amount': milestone['amount'],
        'freelancer_id': resolvedFreelancerId,
        'client_id': project['client_id'],
        'review_output': reviewData,
        'deliverable_description': deliverableDescription,
        'issued_at': DateTime.now().toIso8601String(),
      };

      final signature = SignatureService.signData(
        data: jsonEncode(certPayload),
        privateKeyEncoded: privateKey,
      );

      final pdfBytes = await CertificatePdfService.buildMilestoneCertificate(
        milestoneData: milestone,
        contractId: contract['id'].toString(),
        certificateId: certificateId,
        ipfsGroupId: groupId,
        signature: signature,
        extraFields: {
          'Project Title': project['title'],
          'Client ID': project['client_id'],
          'Freelancer ID': resolvedFreelancerId,
          'Contract Amount': contract['amount'],
          'Milestone Number': milestone['milestone_number'],
          'Milestone Title': milestone['title'],
          'Milestone Description': milestone['description'] ?? '—',
          'Milestone Deadline': milestone['deadline'] ?? '—',
          'Review Output': jsonEncode(reviewData),
          if (reviewRaw != null && reviewRaw.trim().isNotEmpty)
            'Review Raw': _truncateReviewRaw(reviewRaw),
          'Review Score': _formatReviewScore(reviewData),
          'Deliverable Notes': deliverableDescription.isNotEmpty
              ? deliverableDescription
              : 'N/A',
          'Issued At': certPayload['issued_at'],
        },
      );

      debugPrint('📤 [MILESTONE] Uploading certificate to IPFS (group: $groupId)...');
      final certUpload = await IPFSService.uploadFile(
        pdfBytes,
        'milestone_certificate_${milestone['id']}.pdf',
        groupId: groupId,
      );

      if (certUpload['success'] != true) {
        return {'success': false, 'error': 'Failed to upload milestone certificate'};
      }
      final certIpfsHash = certUpload['ipfsHash'] as String;
      debugPrint('✅ [MILESTONE] Certificate stored on IPFS: $certIpfsHash');

      final addToGroup = await IPFSService.addCidsToGroup(groupId: groupId, cids: [certIpfsHash]);
      if (addToGroup['success'] != true) {
        debugPrint('⚠️ [MILESTONE] Could not add cert CID to group: ${addToGroup['error']}');
      } else {
        debugPrint('✅ [MILESTONE] Certificate added to project IPFS group');
      }

      debugPrint('🔗 [MILESTONE] Registering certificate on blockchain...');
      final txHash = sha256.convert(utf8.encode(jsonEncode(certPayload))).toString();
      final blockchainResult = await BlockchainService.registerMilestoneCertificate(
        certificateId: certificateId,
        projectId: project['id'].toString(),
        contractId: contract['id'].toString(),
        milestoneId: milestone['id'].toString(),
        ipfsHash: certIpfsHash,
        transactionHash: txHash,
        freelancerId: resolvedFreelancerId,
        clientId: project['client_id'].toString(),
        amount: (milestone['amount'] ?? '0').toString(),
      );

      if (blockchainResult['success'] != true) {
        debugPrint('⚠️ [MILESTONE] Blockchain registration failed: ${blockchainResult['error']}');
      } else {
        debugPrint('✅ [MILESTONE] Blockchain TX: ${blockchainResult['txId']}');
      }

      return {
        'success': true,
        'certificate_id': certificateId,
        'ipfs_hash': certIpfsHash,
        'blockchain_tx_id': blockchainResult['txId'],
      };
    } catch (e) {
      debugPrint('❌ [MILESTONE] Certificate error: $e');
      return {'success': false, 'error': 'Milestone certificate failed: $e'};
    }
  }

  static Future<Map<String, dynamic>> _loadMilestoneContext({
    required String projectId,
    required String freelancerId,
    String? milestoneId,
  }) async {
    try {
      debugPrint('🔎 [MILESTONE] Loading project + contract data...');
      final project = await SupabaseService.client
          .from('projects')
          .select('id, title, client_id, certificate_group_hash')
          .eq('id', projectId)
          .maybeSingle();

      if (project == null) {
        return {'success': false, 'error': 'Project not found for certificate'};
      }

      final groupId = project['certificate_group_hash']?.toString() ?? '';
      if (groupId.isEmpty) {
        return {'success': false, 'error': 'Project IPFS group not found'};
      }

      final contract = await SupabaseService.client
          .from('contracts')
          .select('id, client_id, freelancer_id, amount, status')
          .eq('project_id', projectId)
          .eq('freelancer_id', freelancerId)
          .maybeSingle();

      if (contract == null) {
        return {'success': false, 'error': 'Active contract not found'};
      }

      debugPrint('📌 [MILESTONE] Fetching milestone...');
      final milestones = await SupabaseService.client
          .from('milestones')
          .select('id, project_id, title, description, amount, status, milestone_number, deadline')
          .eq('project_id', projectId)
          .order('milestone_number', ascending: true);

      if (milestones.isEmpty) {
        return {'success': false, 'error': 'No milestones found for project'};
      }

      Map<String, dynamic>? milestone;
      if (milestoneId != null && milestoneId.isNotEmpty) {
        final list = milestones.cast<Map<String, dynamic>>();
        milestone = list.firstWhere(
          (m) => m['id']?.toString() == milestoneId,
          orElse: () => <String, dynamic>{},
        );
        if (milestone.isEmpty) {
          return {'success': false, 'error': 'Selected milestone not found'};
        }
      } else {
        milestone = milestones.firstWhere(
          (m) => (m['status'] ?? '').toString().toLowerCase() != 'completed',
          orElse: () => milestones.first,
        );
      }

      final resolvedMilestone = milestone;
      debugPrint('✅ [MILESTONE] Using selected milestone: id=${resolvedMilestone['id']} title=${resolvedMilestone['title']}');

      return {
        'success': true,
        'project': project,
        'contract': contract,
        'milestone': milestone,
        'milestones': milestones,
        'milestoneId': milestoneId,
        'group_id': groupId,
        'project_title': project['title'],
        'freelancer_id': freelancerId,
      };
    } catch (e) {
      debugPrint('❌ [MILESTONE] Context error: $e');
      return {'success': false, 'error': 'Milestone context failed: $e'};
    }
  }

  static String _formatReviewScore(Map<String, dynamic> reviewData) {
    final score = _extractReviewScore(reviewData);
    if (score == null) return 'N/A';
    return '${score.toStringAsFixed(1)}%';
  }

  /// Match code-review API response (list of {milestone_name, status, percentage_completed}).
  /// API returns milestone_name as "title: description". We match by that format first, then title-only.
  static Map<String, dynamic> _matchReviewToSelectedMilestone(
    Map<String, dynamic> reviewData,
    String selectedMilestoneTitle,
    String selectedMilestoneDescription,
  ) {
    final items = reviewData['items'];
    if (items is! List || items.isEmpty) {
      return {'score': _extractReviewScore(reviewData), 'reviewData': reviewData, 'matched': false};
    }
    final wantTitle = selectedMilestoneTitle.trim().toLowerCase();
    final wantTitleDesc = _apiMilestoneNameFormat(selectedMilestoneTitle, selectedMilestoneDescription).trim().toLowerCase();
    Map<String, dynamic>? matched;
    double sum = 0;
    int count = 0;
    for (final e in items) {
      final m = e is Map<String, dynamic> ? e : (e is Map ? Map<String, dynamic>.from(e) : null);
      if (m == null) continue;
      final p = m['percentage_completed'];
      if (p != null) {
        final v = (p is num) ? p.toDouble() : double.tryParse(p.toString());
        if (v != null && v >= 0 && v <= 100) {
          sum += v;
          count++;
        }
      }
      final name = (m['milestone_name'] ?? '').toString().trim().toLowerCase();
      if (name.isEmpty || matched != null) continue;
      if (wantTitleDesc.isNotEmpty && name == wantTitleDesc) {
        matched = m;
      } else if (wantTitle.isNotEmpty && (name == wantTitle || name.startsWith('$wantTitle:'))) {
        matched = m;
      }
    }
    final avg = count > 0 ? sum / count : null;
    if (matched != null) {
      final s = _extractReviewScore(matched);
      debugPrint('✅ [DELIVERABLE] Matched API item for selected milestone "$selectedMilestoneTitle": ${matched['milestone_name']} -> ${s?.toStringAsFixed(1) ?? "?"}%');
      return {'score': s, 'reviewData': matched, 'matched': true};
    }
    if (avg != null) {
      debugPrint('⚠️ [DELIVERABLE] No API match for "$selectedMilestoneTitle"; using overall average ${avg.toStringAsFixed(1)}%');
      return {
        'score': avg,
        'reviewData': <String, dynamic>{'percentage_completed': avg, 'note': 'no match; used overall average'},
        'matched': false,
      };
    }
    return {'score': null, 'reviewData': reviewData, 'matched': false};
  }

  static double? _extractReviewScore(Map<String, dynamic> reviewData) {
    double? score;

    double? _parseScore(dynamic value, String key) {
      if (value == null) return null;
      double? parsed;
      if (value is num) {
        parsed = value.toDouble();
      } else if (value is String) {
        parsed = double.tryParse(value.replaceAll('%', '').trim());
      }
      if (parsed == null) return null;
      if (parsed <= 1 && key.contains('rate')) {
        parsed *= 100;
      }
      if (parsed <= 1 && key.contains('score')) {
        parsed *= 100;
      }
      if (parsed <= 1 && key.contains('accuracy')) {
        parsed *= 100;
      }
      if (parsed >= 0 && parsed <= 100) return parsed;
      return null;
    }

    const keys = ['score', 'success', 'percentage', 'percentage_completed', 'accuracy', 'overall', 'rating', 'confidence'];
    for (final key in keys) {
      if (reviewData.containsKey(key)) {
        final parsed = _parseScore(reviewData[key], key);
        if (parsed != null) {
          score = parsed;
          break;
        }
      }
    }

    if (score != null) return score;

    for (final entry in reviewData.entries) {
      final key = entry.key.toString().toLowerCase();
      if (entry.value is num || entry.value is String) {
        if (key.contains('score') || key.contains('percent') || key.contains('accuracy') || key.contains('success')) {
          final parsed = _parseScore(entry.value, key);
          if (parsed != null) return parsed;
        }
      }
    }
    return null;
  }

  static Future<void> _releaseEscrowForMilestone({
    required Map<String, dynamic> context,
    required double reviewScore,
  }) async {
    try {
      final milestone = context['milestone'] as Map<String, dynamic>;
      final project = context['project'] as Map<String, dynamic>;
      final freelancerId = context['freelancer_id']?.toString() ?? '';
      final clientId = project['client_id']?.toString() ?? '';
      final amount = double.tryParse(milestone['amount']?.toString() ?? '0') ?? 0;
      final status = (milestone['status'] ?? '').toString().toLowerCase();

      if (status == 'completed') {
        debugPrint('ℹ️ [ESCROW] Milestone already completed, skipping release');
        return;
      }

      if (amount <= 0) {
        debugPrint('⚠️ [ESCROW] Invalid milestone amount, skipping release');
        return;
      }

      await SupabaseService.client
          .from('milestones')
          .update({'status': 'completed'})
          .eq('id', milestone['id']);

      debugPrint('✅ [ESCROW] Milestone marked completed');

      await _updateWalletBalance(
        userId: freelancerId,
        deltaAvailable: amount,
        deltaTotal: amount,
      );

      await _updateWalletBalance(
        userId: clientId,
        deltaLocked: -amount,
      );

      debugPrint('✅ [ESCROW] Wallet balances updated');
    } catch (e) {
      debugPrint('❌ [ESCROW] Release failed: $e');
    }
  }

  static const double _highValueContractThreshold = 500;

  static Future<bool> _isFinalMilestone(String projectId) async {
    try {
      final milestones = await SupabaseService.client
          .from('milestones')
          .select('id, status')
          .eq('project_id', projectId);
      final list = (milestones as List<dynamic>).cast<Map<String, dynamic>>();
      if (list.isEmpty) return false;
      final allCompleted = list.every((m) =>
          (m['status']?.toString().toLowerCase() ?? '') == 'completed');
      return allCompleted;
    } catch (e) {
      debugPrint('⚠️ [REPUTATION] _isFinalMilestone error: $e');
      return false;
    }
  }

  static Future<void> _updateReputationAfterFinalMilestone(
    Map<String, dynamic> context,
  ) async {
    try {
      final project = context['project'] as Map<String, dynamic>?;
      final contract = context['contract'] as Map<String, dynamic>?;
      final milestone = context['milestone'] as Map<String, dynamic>?;
      final freelancerId = context['freelancer_id']?.toString() ?? '';
      final clientId = project?['client_id']?.toString() ??
          contract?['client_id']?.toString() ?? '';
      if (freelancerId.isEmpty || clientId.isEmpty) {
        debugPrint('⚠️ [REPUTATION] Missing freelancer/client IDs');
        return;
      }

      final contractAmount = (contract?['amount'] as num?)?.toDouble() ?? 0;
      final highValueContract = contractAmount >= _highValueContractThreshold;

      final deadlineRaw = milestone?['deadline']?.toString();
      DateTime? deadline;
      if (deadlineRaw != null && deadlineRaw.isNotEmpty) {
        deadline = DateTime.tryParse(deadlineRaw);
      }
      final now = DateTime.now();
      final speedBonus = deadline != null && !now.isAfter(deadline);
      final missedDeadline = deadline != null && now.isAfter(deadline);

      final freelancerProfile = await SupabaseService.client
          .from('profiles')
          .select('reputation')
          .eq('id', freelancerId)
          .maybeSingle();
      final clientProfile = await SupabaseService.client
          .from('profiles')
          .select('reputation')
          .eq('id', clientId)
          .maybeSingle();

      double freelancerRep = 50;
      if (freelancerProfile != null) {
        final r = freelancerProfile['reputation'];
        if (r != null) freelancerRep = (r is num) ? r.toDouble() : (double.tryParse(r.toString()) ?? 50);
      }
      double clientRep = 50;
      if (clientProfile != null) {
        final r = clientProfile['reputation'];
        if (r != null) clientRep = (r is num) ? r.toDouble() : (double.tryParse(r.toString()) ?? 50);
      }

      final resF = await ReputationService.calculate(
        milestoneCompletion: true,
        speedBonus: speedBonus,
        highValueContract: highValueContract,
        streakBonus: false,
        missedDeadline: missedDeadline,
        contractAbandonment: false,
        currentReputation: freelancerRep,
      );
      if (resF['success'] == true) {
        final newRep = (resF['newReputation'] as num?)?.toDouble();
        if (newRep != null) {
          await SupabaseService.client
              .from('profiles')
              .update({'reputation': newRep})
              .eq('id', freelancerId);
          debugPrint('✅ [REPUTATION] Freelancer reputation updated: $freelancerRep → $newRep');
        }
      } else {
        debugPrint('⚠️ [REPUTATION] Freelancer calc failed: ${resF['error']}');
      }

      final resC = await ReputationService.calculate(
        milestoneCompletion: true,
        speedBonus: speedBonus,
        highValueContract: highValueContract,
        streakBonus: false,
        missedDeadline: missedDeadline,
        contractAbandonment: false,
        currentReputation: clientRep,
      );
      if (resC['success'] == true) {
        final newRep = (resC['newReputation'] as num?)?.toDouble();
        if (newRep != null) {
          await SupabaseService.client
              .from('profiles')
              .update({'reputation': newRep})
              .eq('id', clientId);
          debugPrint('✅ [REPUTATION] Client reputation updated: $clientRep → $newRep');
        }
      } else {
        debugPrint('⚠️ [REPUTATION] Client calc failed: ${resC['error']}');
      }
    } catch (e) {
      debugPrint('❌ [REPUTATION] _updateReputationAfterFinalMilestone error: $e');
    }
  }

  static Future<void> _updateWalletBalance({
    required String userId,
    double deltaAvailable = 0,
    double deltaLocked = 0,
    double deltaTotal = 0,
  }) async {
    try {
      if (userId.isEmpty) return;
      final wallet = await SupabaseService.client
          .from('wallets')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
      if (wallet == null) return;

      final updates = <String, dynamic>{};
      if (wallet.containsKey('available_balance')) {
        final current = (wallet['available_balance'] as num?)?.toDouble() ?? 0;
        updates['available_balance'] = (current + deltaAvailable).clamp(0, double.infinity);
      }
      if (wallet.containsKey('locked_balance')) {
        final current = (wallet['locked_balance'] as num?)?.toDouble() ?? 0;
        updates['locked_balance'] = (current + deltaLocked).clamp(0, double.infinity);
      }
      if (wallet.containsKey('total_balance')) {
        final current = (wallet['total_balance'] as num?)?.toDouble() ?? 0;
        updates['total_balance'] = (current + deltaTotal).clamp(0, double.infinity);
      }

      if (updates.isEmpty) return;

      await SupabaseService.client
          .from('wallets')
          .update(updates)
          .eq('user_id', userId);
    } catch (e) {
      debugPrint('⚠️ [ESCROW] Wallet update skipped: $e');
    }
  }

  static String _truncateReviewRaw(String raw, {int maxChars = 1200}) {
    final trimmed = raw.trim();
    if (trimmed.length <= maxChars) return trimmed;
    return '${trimmed.substring(0, maxChars)}...';
  }

  static String _appendMilestoneTag(String description, String milestoneId) {
    if (description.contains('[MILESTONE_ID:')) return description;
    return '${description.trimRight()}\n\n[MILESTONE_ID:$milestoneId]';
  }

  static String _stripMilestoneTag(String description) {
    return description.replaceAll(RegExp(r'\n*\[MILESTONE_ID:[^\]]+\]\s*'), '').trim();
  }
}
