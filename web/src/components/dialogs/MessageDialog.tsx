import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCreateConversation, useSendMessage } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";

interface MessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientName: string;
  recipientId?: string;
  projectId?: string;
}

export const MessageDialog = ({
  open,
  onOpenChange,
  recipientName,
  recipientId,
  projectId,
}: MessageDialogProps) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [message, setMessage] = useState("");
  const createConversation = useCreateConversation();
  const sendMessage = useSendMessage();

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (!user || !profile || !recipientId) {
      toast.error("Please sign in to send messages");
      navigate('/auth');
      return;
    }

    try {
      // Create or get conversation
      const conversation = await createConversation.mutateAsync({
        otherUserId: recipientId,
        projectId: projectId || null,
      });

      // Send initial message if provided
      if (message.trim()) {
        await sendMessage.mutateAsync({
          conversationId: conversation.id,
          content: message,
        });
      }

      toast.success(`Message sent to ${recipientName}`);
      setMessage("");
      onOpenChange(false);
      
      // Navigate to chat
      navigate(`/chat?conversation=${conversation.id}`);
    } catch (error: any) {
      toast.error(`Failed to send message: ${error.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Message {recipientName}</DialogTitle>
          <DialogDescription>
            {projectId && `Regarding project ${projectId}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[200px] border-3 border-foreground"
            disabled={sending}
          />

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={handleSend}
              disabled={!message.trim() || sending}
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Message
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
