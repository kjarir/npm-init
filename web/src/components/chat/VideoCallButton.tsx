import { useState } from 'react';
import { Video, Phone, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCreateVideoCall } from '@/hooks/useVideoCalls';
import { VideoCallDialog } from './VideoCallDialog';

interface VideoCallButtonProps {
  conversationId?: string;
  projectId?: string;
  otherUserId: string;
}

export const VideoCallButton = ({ conversationId, projectId, otherUserId }: VideoCallButtonProps) => {
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [callType, setCallType] = useState<'video' | 'audio' | 'screen_share'>('video');
  const createVideoCall = useCreateVideoCall();

  const handleStartCall = async (type: 'video' | 'audio' | 'screen_share') => {
    try {
      await createVideoCall.mutateAsync({
        conversation_id: conversationId || null,
        project_id: projectId || null,
        participants: [otherUserId],
        call_type: type,
      });
      
      setCallType(type);
      setShowCallDialog(true);
    } catch (error) {
      // Error handled by hook
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleStartCall('video')}
          className="gap-2"
        >
          <Video size={16} />
          Video
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleStartCall('audio')}
          className="gap-2"
        >
          <Phone size={16} />
          Audio
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleStartCall('screen_share')}
          className="gap-2"
        >
          <Monitor size={16} />
          Share Screen
        </Button>
      </div>

      {showCallDialog && (
        <VideoCallDialog
          open={showCallDialog}
          onOpenChange={setShowCallDialog}
          callType={callType}
          otherUserId={otherUserId}
        />
      )}
    </>
  );
};
