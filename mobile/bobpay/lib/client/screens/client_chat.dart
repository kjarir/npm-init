import 'dart:io';
import 'package:flutter/material.dart';
import 'package:bobpay/services/conversation_service.dart';
import 'package:bobpay/services/message_service.dart';
import 'package:bobpay/services/supabase_client.dart';
import 'package:bobpay/services/local_key_service.dart';
import 'package:bobpay/services/user_certificate_service.dart';
import 'package:bobpay/services/secure_channel.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart' as path;
import 'package:permission_handler/permission_handler.dart';
import 'package:bobpay/client/screens/call_screen.dart';

class ClientChat extends StatefulWidget {
  final String conversationId;
  final String freelancerId;
  final String freelancerName;

  const ClientChat({
    super.key,
    required this.conversationId,
    required this.freelancerId,
    required this.freelancerName,
  });

  @override
  State<ClientChat> createState() => _ClientChatState();
}

class _ClientChatState extends State<ClientChat> {
  static const bg = Color(0xFFFAF8F5);
  static const ink = Color(0xFF1A1F2E);
  static const navy = Color(0xFF24395D);
  static const primary = Color(0xFFF06542);
  static const muted = Color(0xFF8A8A8A);

  List<Map<String, dynamic>> _messages = [];
  bool _isLoading = true;
  String? _error;
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final ImagePicker _imagePicker = ImagePicker();
  bool _isRecording = false;
  String? _channelId;
  bool _showEncrypted = true;

  @override
  void initState() {
    super.initState();
    _initSecureChannel();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _initSecureChannel() async {
    try {
      final myKeys = await LocalKeyService.getLocalKeys();
      final otherCert = await UserCertificateService.getUserCertificate(widget.freelancerId);
      if (myKeys['private_key']!.isEmpty || otherCert == null) {
        setState(() {
          _error = 'Secure channel not ready. Ask both users to re-register.';
          _isLoading = false;
        });
        return;
      }

      final channel = await SecureChannelService.getOrCreateChannel(
        myDeviceFingerprint: myKeys['device_fingerprint']!,
        theirDeviceFingerprint: otherCert['device_fingerprint_hash'] as String,
        myPrivateKey: myKeys['private_key']!,
        theirPublicKey: otherCert['public_key'] as String,
      );

      setState(() {
        _channelId = channel['channel_id'] as String;
      });

      await _fetchMessages();
      _setupRealtimeSubscription();
    } catch (e) {
      setState(() {
        _error = 'Secure channel setup failed: $e';
        _isLoading = false;
      });
    }
  }

  void _setupRealtimeSubscription() {
    try {
      if (_channelId == null) return;
      SupabaseService.client
          .from('encrypted_messages')
          .stream(primaryKey: ['id'])
          .eq('channel_id', _channelId!)
          .order('created_at', ascending: true)
          .listen((_) {
        if (mounted) {
          _fetchMessages();
        }
      });
    } catch (e) {
      debugPrint('Error setting up realtime subscription: $e');
    }
  }

  Future<void> _fetchMessages() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final result = await ConversationService.getConversationMessages(
        conversationId: widget.conversationId,
        otherUserId: widget.freelancerId,
      );
      
      setState(() {
        if (result['success'] == true) {
          _messages = List<Map<String, dynamic>>.from(result['messages'] ?? []);
        } else {
          _error = result['error']?.toString() ?? 'Failed to load messages';
        }
        _isLoading = false;
      });

      _scrollToBottom();
    } catch (e) {
      setState(() {
        _error = 'Error loading messages: $e';
        _isLoading = false;
      });
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    final content = _messageController.text.trim();
    if (content.isEmpty) return;

    _messageController.clear();

    final result = await MessageService.sendMessage(
      conversationId: widget.conversationId,
      content: content,
      receiverId: widget.freelancerId,
    );

    if (result['success'] != true) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(result['error']?.toString() ?? 'Failed to send message')),
        );
      }
    } else {
      _scrollToBottom();
    }
  }

  Future<void> _pickAndSendImage() async {
    try {
      // Request storage permission first
      final status = await Permission.photos.request();
      if (!status.isGranted && !status.isLimited) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Photo permission denied')),
          );
        }
        return;
      }

      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
      );

      if (image == null) return;

      // Upload image to Supabase Storage
      final file = File(image.path);
      final fileName = '${DateTime.now().millisecondsSinceEpoch}_${path.basename(image.path)}';
      final fileBytes = await file.readAsBytes();

      // Upload to Supabase Storage
      final storagePath = 'messages/${widget.conversationId}/$fileName';
      await SupabaseService.client.storage
          .from('message-media')
          .uploadBinary(storagePath, fileBytes);

      // Get public URL
      final publicUrl = SupabaseService.client.storage
          .from('message-media')
          .getPublicUrl(storagePath);

      // Send media message
      final result = await MessageService.sendMediaMessage(
        conversationId: widget.conversationId,
        mediaUrl: publicUrl,
        mediaFilename: fileName,
        receiverId: widget.freelancerId,
        mediaSize: fileBytes.length,
        caption: '',
      );

      if (result['success'] != true) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(result['error']?.toString() ?? 'Failed to send image')),
          );
        }
      } else {
        _scrollToBottom();
      }
    } catch (e) {
      debugPrint('Error picking image: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  Future<void> _startRecording() async {
    // Voice note recording - placeholder for now
    // Can be implemented with a compatible audio recording package
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Voice note recording - Coming soon')),
      );
    }
  }

  Future<void> _stopRecordingAndSend() async {
    // Voice note recording - placeholder for now
    setState(() {
      _isRecording = false;
    });
  }

  Future<void> _cancelRecording() async {
    setState(() {
      _isRecording = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final currentUserId = SupabaseService.client.auth.currentUser?.id;

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
                              ),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                onPressed: _fetchMessages,
                                child: const Text('Retry'),
                              ),
                            ],
                          ),
                        )
                      : _messages.isEmpty
                          ? const Center(
                              child: Text(
                                'No messages yet. Start the conversation!',
                                style: TextStyle(color: muted),
                              ),
                            )
                          : SingleChildScrollView(
                              controller: _scrollController,
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                children: [
                                  _secureChannelBanner(),
                                  _dayDivider(),
                                  const SizedBox(height: 16),
                                  ..._messages.map((message) {
                                    final isSent = message['sender_id'] == currentUserId;
                                    final content = message['content'] as String? ?? '';
                                    final timestamp = message['created_at'] as String?;
                                    final messageType = message['message_type'] as String? ?? 'text';
                                    final mediaUrl = message['media_url'] as String?;
                                    final fileName = message['media_filename'] as String?;
                                    final sender = message['sender'] as Map<String, dynamic>?;
                                    final senderName = sender?['full_name'] as String? ?? 'User';
                                    final encryptedData = message['encrypted_data'] as String?;
                                    final nonce = message['nonce'] as String?;
                                    final tag = message['tag'] as String?;

                                    if (messageType == 'media' && mediaUrl != null) {
                                      final isVoiceNote = fileName?.toLowerCase().contains('.m4a') == true ||
                                                          fileName?.toLowerCase().contains('.mp3') == true ||
                                                          fileName?.toLowerCase().contains('.wav') == true;
                                      
                                      if (isVoiceNote) {
                                        return _voiceNoteMessage(
                                          mediaUrl: mediaUrl,
                                          time: MessageService.formatTimestamp(timestamp),
                                          senderName: isSent ? 'SENT' : senderName,
                                          isSent: isSent,
                                          duration: message['media_duration'] as int? ?? 0,
                                          encryptedData: encryptedData,
                                          nonce: nonce,
                                          tag: tag,
                                        );
                                      } else {
                                        return _imageMessage(
                                          mediaUrl: mediaUrl,
                                          caption: content,
                                          time: MessageService.formatTimestamp(timestamp),
                                          senderName: isSent ? 'SENT' : senderName,
                                          isSent: isSent,
                                          encryptedData: encryptedData,
                                          nonce: nonce,
                                          tag: tag,
                                        );
                                      }
                                    }

                                    return isSent
                                        ? _sentMessage(
                                            content,
                                            MessageService.formatTimestamp(timestamp),
                                            encryptedData: encryptedData,
                                            nonce: nonce,
                                            tag: tag,
                                          )
                                        : _receivedMessage(
                                            content,
                                            MessageService.formatTimestamp(timestamp),
                                            senderName,
                                            encryptedData: encryptedData,
                                            nonce: nonce,
                                            tag: tag,
                                          );
                                  }),
                                ],
                              ),
                            ),
            ),
            _inputBar(),
            _primaryAction(),
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
          Expanded(
            child: Text(
              widget.freelancerName.toUpperCase(),
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          GestureDetector(
            onTap: () => _initiateVoiceCall(),
            child: _iconBox(Icons.call),
          ),
          const SizedBox(width: 10),
          GestureDetector(
            onTap: () => _initiateVideoCall(),
            child: _iconBox(Icons.videocam),
          ),
          const SizedBox(width: 10),
          GestureDetector(
            onTap: () {
              setState(() {
                _showEncrypted = !_showEncrypted;
              });
            },
            child: _iconBox(
              _showEncrypted ? Icons.lock : Icons.lock_open,
            ),
          ),
        ],
      ),
    );
  }

  Widget _secureChannelBanner() {
    if (_channelId == null || _channelId!.isEmpty) {
      return const SizedBox(height: 0);
    }
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: ink, width: 3),
      ),
      child: Row(
        children: [
          const Icon(Icons.lock, size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'SECURE CHANNEL: ${_channelId!}',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _iconBox(IconData icon) {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: ink, width: 3),
      ),
      child: Icon(icon, size: 18),
    );
  }

  Widget _dayDivider() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: navy,
        border: Border.all(color: ink, width: 3),
      ),
      child: const Text(
        'TODAY',
        style: TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.w900,
          letterSpacing: 0.6,
        ),
      ),
    );
  }

  Widget _encryptedPreview({
    String? encryptedData,
    String? nonce,
    String? tag,
    required bool isSent,
  }) {
    if (!_showEncrypted) return const SizedBox.shrink();
    final data = encryptedData ?? '';
    if (data.isEmpty) return const SizedBox.shrink();

    final align = isSent ? CrossAxisAlignment.end : CrossAxisAlignment.start;
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Column(
        crossAxisAlignment: align,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: ink, width: 2),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'ENCRYPTED PAYLOAD',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    color: muted,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'data: ${_preview(data)}',
                  style: const TextStyle(fontSize: 11),
                ),
                if ((nonce ?? '').isNotEmpty)
                  Text(
                    'nonce: ${_preview(nonce!)}',
                    style: const TextStyle(fontSize: 11),
                  ),
                if ((tag ?? '').isNotEmpty)
                  Text(
                    'tag: ${_preview(tag!)}',
                    style: const TextStyle(fontSize: 11),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _preview(String value) {
    return value.length > 48 ? '${value.substring(0, 48)}...' : value;
  }

  Widget _sentMessage(
    String text,
    String time, {
    String? encryptedData,
    String? nonce,
    String? tag,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Stack(
          children: [
            Container(
              margin: const EdgeInsets.only(left: 5, top: 5),
              width: double.infinity,
              color: ink,
            ),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: navy,
                border: Border.all(color: ink, width: 3),
              ),
              child: Text(
                text,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  height: 1.4,
                ),
              ),
            ),
          ],
        ),
        _encryptedPreview(
          encryptedData: encryptedData,
          nonce: nonce,
          tag: tag,
          isSent: true,
        ),
        const SizedBox(height: 4),
        Text(
          time,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: muted,
          ),
        ),
      ],
    );
  }

  Widget _receivedMessage(
    String text,
    String time,
    String senderName, {
    String? encryptedData,
    String? nonce,
    String? tag,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Stack(
          children: [
            Container(
              margin: const EdgeInsets.only(left: 5, top: 5),
              width: double.infinity,
              color: ink,
            ),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: ink, width: 3),
              ),
              child: Text(
                text,
                style: const TextStyle(
                  fontSize: 14,
                  height: 1.4,
                ),
              ),
            ),
          ],
        ),
        _encryptedPreview(
          encryptedData: encryptedData,
          nonce: nonce,
          tag: tag,
          isSent: false,
        ),
        const SizedBox(height: 4),
        Text(
          '$time · $senderName',
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: muted,
          ),
        ),
      ],
    );
  }

  Widget _imageMessage({
    required String? mediaUrl,
    required String caption,
    required String time,
    required String senderName,
    required bool isSent,
    String? encryptedData,
    String? nonce,
    String? tag,
  }) {
    return Column(
      crossAxisAlignment: isSent ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      children: [
        Stack(
          children: [
            Container(
              margin: const EdgeInsets.only(left: 5, top: 5),
              width: 200,
              height: 220,
              color: ink,
            ),
            Container(
              width: 200,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: ink, width: 3),
              ),
              child: Column(
                children: [
                  Container(
                    height: 140,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      border: Border.all(color: ink, width: 3),
                    ),
                    child: mediaUrl != null && mediaUrl.isNotEmpty
                        ? Image.network(
                            mediaUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) {
                              return const Icon(Icons.broken_image, size: 40);
                            },
                          )
                        : const Icon(Icons.image, size: 40),
                  ),
                  if (caption.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      caption,
                      style: const TextStyle(
                        fontSize: 14,
                        height: 1.4,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
        _encryptedPreview(
          encryptedData: encryptedData,
          nonce: nonce,
          tag: tag,
          isSent: isSent,
        ),
        const SizedBox(height: 4),
        Text(
          '$time · ${isSent ? 'SENT' : senderName}',
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: muted,
          ),
        ),
      ],
    );
  }

  Widget _voiceNoteMessage({
    required String mediaUrl,
    required String time,
    required String senderName,
    required bool isSent,
    required int duration,
    String? encryptedData,
    String? nonce,
    String? tag,
  }) {
    return Column(
      crossAxisAlignment: isSent ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      children: [
        Stack(
          children: [
            Container(
              margin: const EdgeInsets.only(left: 5, top: 5),
              width: 200,
              height: 60,
              color: ink,
            ),
            Container(
              width: 200,
              height: 60,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isSent ? navy : Colors.white,
                border: Border.all(color: ink, width: 3),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.mic,
                    color: isSent ? Colors.white : ink,
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Voice Note',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                            color: isSent ? Colors.white : ink,
                          ),
                        ),
                        Text(
                          '${duration}s',
                          style: TextStyle(
                            fontSize: 10,
                            color: isSent ? Colors.white70 : muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    Icons.play_arrow,
                    color: isSent ? Colors.white : ink,
                    size: 24,
                  ),
                ],
              ),
            ),
          ],
        ),
        _encryptedPreview(
          encryptedData: encryptedData,
          nonce: nonce,
          tag: tag,
          isSent: isSent,
        ),
        const SizedBox(height: 4),
        Text(
          '$time · ${isSent ? 'SENT' : senderName}',
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: muted,
          ),
        ),
      ],
    );
  }

  Widget _inputBar() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: const BoxDecoration(
        color: bg,
        border: Border(top: BorderSide(color: ink, width: 3)),
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: _pickAndSendImage,
            child: _iconBox(Icons.add),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Container(
              height: 44,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: ink, width: 3),
              ),
              child: TextField(
                controller: _messageController,
                decoration: const InputDecoration(
                  hintText: 'TYPE MESSAGE...',
                  hintStyle: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: Colors.black38,
                  ),
                  border: InputBorder.none,
                ),
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
                maxLines: null,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _sendMessage(),
              ),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTapDown: (_) => _startRecording(),
            onTapUp: (_) => _stopRecordingAndSend(),
            onTapCancel: () => _cancelRecording(),
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: _isRecording ? primary : Colors.white,
                border: Border.all(color: ink, width: 3),
              ),
              child: Icon(
                Icons.mic,
                size: 18,
                color: _isRecording ? Colors.white : ink,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _initiateVoiceCall() async {
    try {
      // Request microphone permission
      final micStatus = await Permission.microphone.request();
      if (!micStatus.isGranted) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Microphone permission denied')),
          );
        }
        return;
      }

      // Create video call record in database
      final currentUser = SupabaseService.client.auth.currentUser;
      if (currentUser == null) return;

      final callData = {
        'conversation_id': widget.conversationId,
        'initiated_by': currentUser.id,
        'participants': [currentUser.id, widget.freelancerId],
        'call_type': 'audio',
        'status': 'active',
        'started_at': DateTime.now().toIso8601String(),
      };

      final response = await SupabaseService.client
          .from('video_calls')
          .insert(callData)
          .select()
          .single();

      if (mounted) {
        // Navigate to call screen with real-time audio
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => CallScreen(
              callId: response['id'] as String,
              callType: 'audio',
              conversationId: widget.conversationId,
              otherUserId: widget.freelancerId,
              otherUserName: widget.freelancerName,
            ),
          ),
        );
      }
    } catch (e) {
      debugPrint('Error initiating voice call: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  Future<void> _initiateVideoCall() async {
    try {
      // Request camera and microphone permissions
      final cameraStatus = await Permission.camera.request();
      final micStatus = await Permission.microphone.request();
      
      if (!cameraStatus.isGranted || !micStatus.isGranted) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Camera or microphone permission denied')),
          );
        }
        return;
      }

      // Create video call record in database
      final currentUser = SupabaseService.client.auth.currentUser;
      if (currentUser == null) return;

      final callData = {
        'conversation_id': widget.conversationId,
        'initiated_by': currentUser.id,
        'participants': [currentUser.id, widget.freelancerId],
        'call_type': 'video',
        'status': 'active',
        'started_at': DateTime.now().toIso8601String(),
      };

      final response = await SupabaseService.client
          .from('video_calls')
          .insert(callData)
          .select()
          .single();

      if (mounted) {
        // Navigate to call screen with real-time video
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => CallScreen(
              callId: response['id'] as String,
              callType: 'video',
              conversationId: widget.conversationId,
              otherUserId: widget.freelancerId,
              otherUserName: widget.freelancerName,
            ),
          ),
        );
      }
    } catch (e) {
      debugPrint('Error initiating video call: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  Widget _primaryAction() {
    return Stack(
      children: [
        Container(
          margin: const EdgeInsets.only(left: 6, top: 6),
          height: 60,
          color: ink,
        ),
        Container(
          height: 60,
          decoration: BoxDecoration(
            color: primary,
            border: Border.all(color: ink, width: 3),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: const [
              Icon(Icons.gavel, color: Colors.white),
              SizedBox(width: 8),
              Text(
                'CREATE CONTRACT',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  fontSize: 14,
                  letterSpacing: 0.6,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// CallDialog removed - using CallScreen instead
