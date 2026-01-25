import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, FileText, Image, Mic, X, Play, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMessages, useSendMessage, useMarkAsRead, Message } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { CreateContractDialog } from './CreateContractDialog';
import { VoiceRecorder } from './VoiceRecorder';
import { VideoCallButton } from './VideoCallButton';

interface ChatWindowProps {
  conversationId: string | null;
  otherUser?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  projectId?: string | null;
}

export const ChatWindow = ({ conversationId, otherUser, projectId }: ChatWindowProps) => {
  const { user, profile } = useAuth();
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const messages = useMessages(conversationId);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showContractDialog, setShowContractDialog] = useState(false);

  // Debug: Log message alignment (only when messages actually change)
  useEffect(() => {
    if (messages.length > 0 && user?.id) {
      const messageIds = messages.map(m => m.id).join(',');
      console.log('Messages alignment check:', {
        userId: user.id,
        messageCount: messages.length,
        messageIds,
      });
    }
  }, [messages.length, user?.id]); // Only depend on length, not the array itself

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (conversationId) {
      markAsRead.mutate(conversationId);
    }
  }, [conversationId]);

  const handleSend = async () => {
    if ((!message.trim() && !selectedFile) || !conversationId) return;
    
    const messageType = selectedFile 
      ? (selectedFile.type.startsWith('image/') ? 'image' : 'file')
      : 'text';
    
    await sendMessage.mutateAsync({
      conversationId,
      content: message,
      mediaFile: selectedFile || undefined,
      messageType: messageType as 'text' | 'image' | 'file',
    });
    
    setMessage('');
    setSelectedFile(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleVoiceComplete = async (audioBlob: Blob, duration: number) => {
    if (!conversationId) return;
    
    await sendMessage.mutateAsync({
      conversationId,
      content: 'Voice note',
      mediaFile: audioBlob,
      messageType: 'voice',
      mediaDuration: duration,
    });
    
    setShowVoiceRecorder(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-secondary border-3 border-foreground">
        <div className="text-center">
          <div className="text-muted-foreground mb-2">Select a conversation to start chatting</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b-3 border-foreground p-4 bg-secondary">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent flex items-center justify-center text-accent-foreground font-display font-bold rounded">
              {otherUser?.full_name?.[0]?.toUpperCase() || otherUser?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div className="font-display font-bold">{otherUser?.full_name || otherUser?.email || 'User'}</div>
              <div className="text-xs text-muted-foreground">
                {otherUser?.email}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {otherUser && (
              <VideoCallButton
                conversationId={conversationId || undefined}
                projectId={projectId || undefined}
                otherUserId={otherUser.id}
              />
            )}
            {profile?.role === 'client' && !projectId && (
              <Button
                variant="accent"
                size="sm"
                onClick={() => setShowContractDialog(true)}
                className="gap-2"
              >
                <FileText size={16} />
                Create Contract
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-secondary/30">
        {!user?.id ? (
          <div className="text-center text-muted-foreground py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p>Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg: Message) => {
              // Compare sender_id with user.id (both as strings to ensure exact match)
              const isOwn = String(msg.sender_id) === String(user.id);
              
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[65%] md:max-w-[50%] flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                    {/* Avatar for received messages */}
                    {!isOwn && (
                      <div className="w-8 h-8 bg-accent flex items-center justify-center text-accent-foreground font-display font-bold text-xs rounded-full flex-shrink-0">
                        {otherUser?.full_name?.[0]?.toUpperCase() || otherUser?.email?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    
                    {/* Message bubble */}
                    <div className={`p-0 rounded-lg overflow-hidden ${
                      isOwn 
                        ? 'bg-accent text-accent-foreground rounded-br-none' 
                        : 'bg-background border-3 border-foreground rounded-bl-none'
                    }`}>
                      {/* Media Content */}
                      {msg.message_type === 'image' && msg.media_url && (
                        <div className="relative">
                          <img 
                            src={msg.media_url} 
                            alt={msg.content || 'Image'} 
                            className="max-w-full h-auto cursor-pointer"
                            onClick={() => window.open(msg.media_url!, '_blank')}
                          />
                          {msg.content && msg.content !== 'Media' && (
                            <p className="text-sm p-3 whitespace-pre-wrap break-words leading-relaxed">
                              {msg.content}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {msg.message_type === 'file' && msg.media_url && (
                        <div className="p-3">
                          <a 
                            href={msg.media_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                          >
                            <FileText size={20} />
                            <div className="flex-1">
                              <p className="text-sm font-display font-bold">{msg.media_filename || 'File'}</p>
                              {msg.media_size && (
                                <p className="text-xs opacity-70">
                                  {(msg.media_size / 1024).toFixed(1)} KB
                                </p>
                              )}
                            </div>
                            <Download size={16} />
                          </a>
                          {msg.content && msg.content !== 'Media' && (
                            <p className="text-sm mt-2 whitespace-pre-wrap break-words leading-relaxed">
                              {msg.content}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {msg.message_type === 'voice' && msg.media_url && (
                        <div className="p-3">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                const audio = new Audio(msg.media_url!);
                                audio.play();
                              }}
                              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                isOwn 
                                  ? 'bg-accent-foreground/20 text-accent-foreground' 
                                  : 'bg-accent text-accent-foreground'
                              }`}
                            >
                              <Play size={16} fill="currentColor" />
                            </button>
                            <div className="flex-1">
                              <div className="h-1 bg-foreground/20 rounded-full overflow-hidden">
                                <div className="h-full bg-accent" style={{ width: '60%' }} />
                              </div>
                              <p className="text-xs mt-1">
                                {msg.media_duration 
                                  ? `${Math.floor(msg.media_duration / 60)}:${(msg.media_duration % 60).toString().padStart(2, '0')}`
                                  : 'Voice note'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Text Content */}
                      {(msg.message_type === 'text' || (!msg.message_type && msg.content)) && (
                        <p className="text-sm p-3 whitespace-pre-wrap break-words leading-relaxed">
                          {msg.content}
                        </p>
                      )}
                      
                      {/* Timestamp */}
                      <div className={`text-xs px-3 pb-2 flex items-center gap-1 ${
                        isOwn ? 'text-accent-foreground/70 justify-end' : 'text-muted-foreground'
                      }`}>
                        <span>{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                    
                    {/* Avatar for sent messages */}
                    {isOwn && (
                      <div className="w-8 h-8 bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-xs rounded-full flex-shrink-0">
                        {user?.email?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Voice Recorder */}
      {showVoiceRecorder && (
        <div className="border-t-3 border-foreground">
          <VoiceRecorder
            onRecordingComplete={handleVoiceComplete}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        </div>
      )}

      {/* Selected File Preview */}
      {selectedFile && !showVoiceRecorder && (
        <div className="border-t-3 border-foreground p-3 bg-secondary">
          <div className="flex items-center gap-3">
            {selectedFile.type.startsWith('image/') ? (
              <Image size={20} className="text-accent" />
            ) : (
              <FileText size={20} className="text-accent" />
            )}
            <div className="flex-1">
              <p className="text-sm font-display font-bold">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFile(null)}
            >
              <X size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Input Area - WhatsApp style */}
      {!showVoiceRecorder && (
        <div className="border-t-3 border-foreground p-4 bg-secondary">
          <div className="flex gap-2 items-end">
            {/* Media Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-[50px] w-[50px] p-0 rounded-full flex items-center justify-center"
            >
              <Image size={20} />
            </Button>
            
            {/* Voice Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVoiceRecorder(true)}
              className="h-[50px] w-[50px] p-0 rounded-full flex items-center justify-center"
            >
              <Mic size={20} />
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,.doc,.docx,.zip,.fig,.psd"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 min-h-[50px] max-h-[120px] p-3 border-3 border-foreground bg-background font-body resize-none focus:outline-none focus:ring-2 focus:ring-accent rounded-lg"
              rows={1}
            />
            <Button
              variant="accent"
              onClick={handleSend}
              disabled={(!message.trim() && !selectedFile) || sendMessage.isPending}
              className="h-[50px] w-[50px] p-0 rounded-full flex items-center justify-center"
            >
              {sendMessage.isPending ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Create Contract Dialog */}
      {otherUser && (
        <CreateContractDialog
          open={showContractDialog}
          onOpenChange={setShowContractDialog}
          freelancerId={profile?.role === 'client' ? otherUser.id : undefined}
          conversationId={conversationId}
        />
      )}
    </div>
  );
};
