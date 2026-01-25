import 'dart:async';
import 'package:flutter/material.dart';
import 'package:agora_rtc_engine/agora_rtc_engine.dart';
import 'package:bobpay/services/supabase_client.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class CallScreen extends StatefulWidget {
  final String callId;
  final String callType; // 'audio' or 'video'
  final String conversationId;
  final String otherUserId;
  final String otherUserName;

  const CallScreen({
    super.key,
    required this.callId,
    required this.callType,
    required this.conversationId,
    required this.otherUserId,
    required this.otherUserName,
  });

  @override
  State<CallScreen> createState() => _CallScreenState();
}

class _CallScreenState extends State<CallScreen> {
  static const primary = Color(0xFFF06542);

  RtcEngine? _engine;
  bool _isJoined = false;
  int? _remoteUid;
  bool _localUserMuted = false;
  bool _localVideoEnabled = true;
  bool _isSpeakerEnabled = true;
  DateTime? _callStartTime;
  Timer? _callTimer;
  String _callDuration = '00:00';

  @override
  void initState() {
    super.initState();
    _initAgora();
  }

  Future<void> _initAgora() async {
    // Initialize Agora RTC Engine
    // Load App ID from environment variables
    final appId = dotenv.env['AGORA_APP_ID'] ?? '';
    
    if (appId.isEmpty) {
      debugPrint('⚠️ AGORA_APP_ID not found in .env file');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Agora App ID not configured. Please add AGORA_APP_ID to .env file'),
            duration: Duration(seconds: 3),
          ),
        );
        Future.delayed(const Duration(seconds: 1), () {
          if (mounted) Navigator.pop(context);
        });
      }
      return;
    }
    
    _engine = createAgoraRtcEngine();
    await _engine!.initialize(RtcEngineContext(
      appId: appId,
      channelProfile: ChannelProfileType.channelProfileCommunication,
    ));

    // Set up event handlers
    _engine!.registerEventHandler(
      RtcEngineEventHandler(
        onJoinChannelSuccess: (RtcConnection connection, int elapsed) {
          debugPrint('✅ Joined channel successfully');
          setState(() {
            _isJoined = true;
            _callStartTime = DateTime.now();
            _startCallTimer();
          });
        },
        onUserJoined: (RtcConnection connection, int remoteUid, int elapsed) {
          debugPrint('👤 Remote user joined: $remoteUid');
          setState(() {
            _remoteUid = remoteUid;
          });
        },
        onUserOffline: (RtcConnection connection, int remoteUid, UserOfflineReasonType reason) {
          debugPrint('👤 Remote user left: $remoteUid');
          setState(() {
            _remoteUid = null;
          });
        },
        onError: (ErrorCodeType err, String msg) {
          debugPrint('❌ Agora error: $err - $msg');
        },
      ),
    );

    // Enable video if it's a video call
    if (widget.callType == 'video') {
      await _engine!.enableVideo();
      await _engine!.startPreview();
    } else {
      await _engine!.enableAudio();
    }

    // Join channel
    final currentUser = SupabaseService.client.auth.currentUser;
    if (currentUser != null) {
      final channelName = widget.conversationId;
      final token = ''; // For production, generate token from your server
      final uid = int.tryParse(currentUser.id.substring(0, 8), radix: 16) ?? 0;
      
      await _engine!.joinChannel(
        token: token,
        channelId: channelName,
        uid: uid,
        options: const ChannelMediaOptions(),
      );
    }
  }

  void _startCallTimer() {
    _callTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_callStartTime != null) {
        final duration = DateTime.now().difference(_callStartTime!);
        final minutes = duration.inMinutes.toString().padLeft(2, '0');
        final seconds = (duration.inSeconds % 60).toString().padLeft(2, '0');
        setState(() {
          _callDuration = '$minutes:$seconds';
        });
      }
    });
  }

  Future<void> _toggleMute() async {
    await _engine?.muteLocalAudioStream(!_localUserMuted);
    setState(() {
      _localUserMuted = !_localUserMuted;
    });
  }

  Future<void> _toggleVideo() async {
    if (widget.callType == 'video') {
      await _engine?.muteLocalVideoStream(!_localVideoEnabled);
      setState(() {
        _localVideoEnabled = !_localVideoEnabled;
      });
    }
  }

  Future<void> _toggleSpeaker() async {
    await _engine?.setEnableSpeakerphone(!_isSpeakerEnabled);
    setState(() {
      _isSpeakerEnabled = !_isSpeakerEnabled;
    });
  }

  Future<void> _endCall() async {
    _callTimer?.cancel();
    
    // Update call status in database
    try {
      await SupabaseService.client
          .from('video_calls')
          .update({
            'status': 'ended',
            'ended_at': DateTime.now().toIso8601String(),
            'duration_seconds': _callStartTime != null
                ? DateTime.now().difference(_callStartTime!).inSeconds
                : 0,
          })
          .eq('id', widget.callId);
    } catch (e) {
      debugPrint('Error updating call status: $e');
    }

    // Leave channel and destroy engine
    await _engine?.leaveChannel();
    await _engine?.release();
    
    if (mounted) {
      Navigator.pop(context);
    }
  }

  @override
  void dispose() {
    _callTimer?.cancel();
    _engine?.leaveChannel();
    _engine?.release();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Stack(
          children: [
            // Remote video view (for video calls)
            if (widget.callType == 'video')
              _remoteUid != null
                  ? AgoraVideoView(
                      controller: VideoViewController.remote(
                        rtcEngine: _engine!,
                        canvas: VideoCanvas(uid: _remoteUid),
                        connection: RtcConnection(channelId: widget.conversationId),
                      ),
                    )
                  : Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.person, size: 80, color: Colors.white54),
                          const SizedBox(height: 16),
                          Text(
                            widget.otherUserName.toUpperCase(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Waiting for user to join...',
                            style: TextStyle(color: Colors.white70),
                          ),
                        ],
                      ),
                    ),

            // Local video view (for video calls)
            if (widget.callType == 'video' && _localVideoEnabled)
              Positioned(
                top: 20,
                right: 20,
                child: Container(
                  width: 120,
                  height: 160,
                  decoration: BoxDecoration(
                    color: Colors.black,
                    border: Border.all(color: Colors.white, width: 2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: AgoraVideoView(
                      controller: VideoViewController(
                        rtcEngine: _engine!,
                        canvas: const VideoCanvas(uid: 0),
                      ),
                    ),
                  ),
                ),
              ),

            // Audio call UI
            if (widget.callType == 'audio')
              Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 150,
                      height: 150,
                      decoration: BoxDecoration(
                        color: Colors.white24,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 3),
                      ),
                      child: const Icon(
                        Icons.person,
                        size: 80,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 32),
                    Text(
                      widget.otherUserName.toUpperCase(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _isJoined ? _callDuration : 'Connecting...',
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 18,
                      ),
                    ),
                  ],
                ),
              ),

            // Call controls
            Positioned(
              bottom: 40,
              left: 0,
              right: 0,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  // Mute button
                  _callControlButton(
                    icon: _localUserMuted ? Icons.mic_off : Icons.mic,
                    onTap: _toggleMute,
                    color: _localUserMuted ? primary : Colors.white24,
                  ),
                  
                  // Video toggle (for video calls)
                  if (widget.callType == 'video')
                    _callControlButton(
                      icon: _localVideoEnabled ? Icons.videocam : Icons.videocam_off,
                      onTap: _toggleVideo,
                      color: _localVideoEnabled ? Colors.white24 : primary,
                    ),
                  
                  // Speaker toggle
                  _callControlButton(
                    icon: _isSpeakerEnabled ? Icons.volume_up : Icons.volume_off,
                    onTap: _toggleSpeaker,
                    color: Colors.white24,
                  ),
                  
                  // End call button
                  _callControlButton(
                    icon: Icons.call_end,
                    onTap: _endCall,
                    color: primary,
                    size: 64,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _callControlButton({
    required IconData icon,
    required VoidCallback onTap,
    required Color color,
    double size = 56,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 2),
        ),
        child: Icon(
          icon,
          color: Colors.white,
          size: size * 0.4,
        ),
      ),
    );
  }
}
