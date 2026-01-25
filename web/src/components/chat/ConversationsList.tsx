import { Conversation } from '@/hooks/useChat';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface ConversationsListProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (conversation: Conversation) => void;
}

export const ConversationsList = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
}: ConversationsListProps) => {
  const { user, profile } = useAuth();

  const getOtherUser = (conversation: Conversation) => {
    if (profile?.role === 'client') {
      return conversation.freelancer;
    }
    return conversation.client;
  };

  const getLastMessagePreview = (conversation: Conversation) => {
    // Get last message preview from conversation data
    return (conversation as any).last_message_preview || 'Click to view messages';
  };

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-secondary border-3 border-foreground">
        <div className="text-center text-muted-foreground">
          <p>No conversations yet</p>
          <p className="text-sm mt-2">Start a conversation from a project or freelancer profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      {conversations.map((conversation) => {
        const otherUser = getOtherUser(conversation);
        const isSelected = conversation.id === selectedConversationId;
        const initials = otherUser?.full_name
          ? otherUser.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
          : otherUser?.email?.[0]?.toUpperCase() || 'U';
        const lastMessage = getLastMessagePreview(conversation);

        return (
          <button
            key={conversation.id}
            onClick={() => onSelectConversation(conversation)}
            className={`w-full p-3 border-b border-foreground/20 hover:bg-secondary/50 transition-colors text-left ${
              isSelected ? 'bg-accent/10 border-l-4 border-l-accent' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-accent flex items-center justify-center text-accent-foreground font-display font-bold rounded-full flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-display font-bold text-sm truncate">
                    {otherUser?.full_name || otherUser?.email || 'User'}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {conversation.unread_count && conversation.unread_count > 0 && (
                      <span className="bg-accent text-accent-foreground text-xs px-2 py-0.5 rounded-full font-display font-bold min-w-[20px] text-center">
                        {conversation.unread_count}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                {conversation.project && (
                  <div className="text-xs text-muted-foreground mb-1 truncate">
                    📁 {conversation.project.title}
                  </div>
                )}
                <div className="text-sm text-muted-foreground truncate">
                  {lastMessage !== 'Click to view messages' && lastMessage !== 'No messages yet' ? lastMessage : 'Start conversation...'}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
