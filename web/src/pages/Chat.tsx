import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { ConversationsList } from '@/components/chat/ConversationsList';
import { useConversations, Conversation } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Chat = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const { data: conversations = [], isLoading } = useConversations();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchParams] = useSearchParams();
  const conversationIdFromUrl = searchParams.get('conversation');

  // Set selected conversation from URL param
  useEffect(() => {
    if (conversationIdFromUrl && conversations.length > 0) {
      const conv = conversations.find(c => c.id === conversationIdFromUrl);
      if (conv) {
        setSelectedConversation(conv);
      }
    }
  }, [conversationIdFromUrl, conversations]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-28 pb-20">
          <div className="container-editorial text-center">
            <h1 className="headline-lg mb-4">Please sign in to access chat</h1>
            <Button asChild variant="accent">
              <a href="/auth">Sign In</a>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const getOtherUser = (conversation: Conversation) => {
    if (profile.role === 'client') {
      return conversation.freelancer;
    }
    return conversation.client;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-28 pb-20">
        <div className="container-editorial">
          {/* Header */}
          <div className="mb-8">
            <div className="label-mono text-accent mb-2">Messaging</div>
            <h1 className="headline-lg mb-4">Messages</h1>
            <p className="body-lg text-muted-foreground">
              Chat with clients and freelancers. Create contracts directly from conversations.
            </p>
          </div>

          {/* Chat Interface - WhatsApp-like layout */}
          <div className="bg-background border-3 border-foreground brutal-shadow" style={{ height: '600px' }}>
            <div className="flex h-full">
              {/* Left Sidebar - Conversations List (like WhatsApp) */}
              <div className="w-80 md:w-96 border-r-3 border-foreground flex flex-col bg-background">
                <div className="p-4 border-b-3 border-foreground bg-secondary">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={20} className="text-accent" />
                    <span className="font-display font-bold">Conversations</span>
                  </div>
                </div>
                <ConversationsList
                  conversations={conversations}
                  selectedConversationId={selectedConversation?.id || null}
                  onSelectConversation={setSelectedConversation}
                />
              </div>

              {/* Right Side - Chat Window (like WhatsApp) */}
              <div className="flex-1 flex flex-col bg-background">
                <ChatWindow
                  conversationId={selectedConversation?.id || null}
                  otherUser={selectedConversation ? getOtherUser(selectedConversation) : undefined}
                  projectId={selectedConversation?.project_id || null}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Chat;
