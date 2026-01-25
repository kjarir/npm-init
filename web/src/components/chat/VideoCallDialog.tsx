import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Monitor } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface VideoCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callType: 'video' | 'audio' | 'screen_share';
  otherUserId: string;
}

export const VideoCallDialog = ({ open, onOpenChange, callType, otherUserId }: VideoCallDialogProps) => {
  const { user } = useAuth();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (open && callType !== 'audio') {
      startLocalVideo();
    }

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [open, callType]);

  const startLocalVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'screen_share' ? false : true,
        audio: true,
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  const handleStartScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      setIsScreenSharing(true);
      
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        setIsScreenSharing(false);
        startLocalVideo();
      });
    } catch (error) {
      console.error('Error starting screen share:', error);
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
    }
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff;
      });
    }
    setIsVideoOff(!isVideoOff);
  };

  const handleEndCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0">
        <DialogHeader className="p-6 border-b-3 border-foreground">
          <DialogTitle>
            {callType === 'video' ? 'Video Call' : callType === 'audio' ? 'Audio Call' : 'Screen Share'}
          </DialogTitle>
        </DialogHeader>

        <div className="relative bg-background" style={{ height: '500px' }}>
          {/* Remote Video/Audio */}
          <div className="absolute inset-0 bg-secondary flex items-center justify-center">
            {callType === 'audio' ? (
              <div className="text-center">
                <div className="w-32 h-32 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-accent-foreground font-display font-bold text-2xl">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <p className="text-muted-foreground">Connecting...</p>
              </div>
            ) : (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Local Video (Picture-in-Picture) */}
          {callType !== 'audio' && (
            <div className="absolute bottom-4 right-4 w-48 h-36 bg-background border-3 border-foreground rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Controls */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-3">
            {callType !== 'audio' && (
              <Button
                variant={isVideoOff ? "destructive" : "outline"}
                size="lg"
                onClick={toggleVideo}
                className="rounded-full w-14 h-14 p-0"
              >
                {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
              </Button>
            )}
            
            <Button
              variant={isMuted ? "destructive" : "outline"}
              size="lg"
              onClick={toggleMute}
              className="rounded-full w-14 h-14 p-0"
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </Button>

            {callType === 'video' && (
              <Button
                variant={isScreenSharing ? "accent" : "outline"}
                size="lg"
                onClick={handleStartScreenShare}
                className="rounded-full w-14 h-14 p-0"
              >
                <Monitor size={20} />
              </Button>
            )}

            <Button
              variant="destructive"
              size="lg"
              onClick={handleEndCall}
              className="rounded-full w-14 h-14 p-0"
            >
              <PhoneOff size={20} />
            </Button>
          </div>
        </div>

        <div className="p-4 bg-secondary border-t-3 border-foreground text-center text-sm text-muted-foreground">
          <p>Note: This is a demo. For production, integrate with WebRTC or services like Daily.co, Agora, or Twilio.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
