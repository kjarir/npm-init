import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Conversation {
  id: string;
  project_id: string | null;
  client_id: string;
  freelancer_id: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  client?: any;
  freelancer?: any;
  project?: any;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
  message_type?: 'text' | 'image' | 'file' | 'voice';
  media_url?: string | null;
  media_filename?: string | null;
  media_size?: number | null;
  media_duration?: number | null;
  sender?: any;
}

export const useConversations = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select(`
            *,
            client:profiles!conversations_client_id_fkey(id, full_name, email, avatar_url),
            freelancer:profiles!conversations_freelancer_id_fkey(id, full_name, email, avatar_url),
            project:projects(id, title, status)
          `)
          .or(`client_id.eq.${user.id},freelancer_id.eq.${user.id}`)
          .order('last_message_at', { ascending: false });
        
        if (error) throw error;
        
        // Get unread counts and last message for each conversation
        const conversationsWithData = await Promise.all(
          (data || []).map(async (conv: any) => {
            // Get unread count
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .neq('sender_id', user.id)
              .is('read_at', null);
            
            // Get last message
            const { data: lastMessage } = await supabase
              .from('messages')
              .select('content')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            return { 
              ...conv, 
              unread_count: count || 0,
              last_message_preview: lastMessage?.content || 'No messages yet'
            };
          })
        );
        
        return conversationsWithData as Conversation[];
      } catch (error: any) {
        console.error('Failed to fetch conversations:', error);
        return [];
      }
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useMessages = (conversationId: string | null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const queryClient = useQueryClient();

  // Initial fetch
  const { data: initialMessages = [] } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      try {
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!messages_sender_id_fkey(id, full_name, email, avatar_url)
          `)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });
        
        if (error) throw error;
        return (data || []) as Message[];
      } catch (error: any) {
        console.error('Failed to fetch messages:', error);
        return [];
      }
    },
    enabled: !!conversationId,
  });

  // Set initial messages
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
    } else if (initialMessages.length === 0 && conversationId) {
      // Clear messages if conversation changes and no messages found
      setMessages([]);
    }
  }, [initialMessages, conversationId]);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch sender profile
          const { data: sender } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url')
            .eq('id', payload.new.sender_id)
            .single();
          
          const newMessage = {
            ...payload.new,
            sender,
          } as Message;
          
          // Check if message already exists (avoid duplicates)
          setMessages((prev) => {
            const exists = prev.some(m => m.id === newMessage.id);
            if (exists) return prev;
            return [...prev, newMessage];
          });
          
          // Mark as read if it's not from current user
          if (user && String(payload.new.sender_id) !== String(user.id)) {
            await supabase
              .from('messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', payload.new.id);
          }
          
          // Invalidate conversations to update unread counts
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, queryClient]);

  return messages;
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
      mutationFn: async ({ 
      conversationId, 
      content, 
      mediaFile, 
      messageType = 'text',
      mediaDuration
    }: { 
      conversationId: string; 
      content: string;
      mediaFile?: File | Blob;
      messageType?: 'text' | 'image' | 'file' | 'voice';
      mediaDuration?: number;
    }) => {
      if (!user) throw new Error('Must be logged in');
      
      let mediaUrl: string | null = null;
      let mediaFilename: string | null = null;
      let mediaSize: number | null = null;
      let finalMediaDuration: number | null = null;

      // Upload media if provided
      if (mediaFile) {
        try {
          const fileExt = mediaFile instanceof File 
            ? mediaFile.name.split('.').pop() 
            : 'webm';
          const fileName = `${conversationId}/${Date.now()}.${fileExt}`;
          const filePath = `chat-media/${fileName}`;

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('chat-media')
            .upload(filePath, mediaFile, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error(`Failed to upload media: ${uploadError.message}`);
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('chat-media')
            .getPublicUrl(filePath);

          mediaUrl = urlData.publicUrl;
          mediaFilename = mediaFile instanceof File ? mediaFile.name : `voice-${Date.now()}.webm`;
          mediaSize = mediaFile.size;
          finalMediaDuration = messageType === 'voice' ? (mediaDuration || null) : null;
        } catch (error: any) {
          console.error('Media upload failed:', error);
          throw error;
        }
      }

      const messageData: any = {
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim() || (messageType === 'voice' ? 'Voice note' : 'Media'),
        message_type: messageType,
      };

      if (mediaUrl) {
        messageData.media_url = mediaUrl;
        messageData.media_filename = mediaFilename;
        messageData.media_size = mediaSize;
        if (finalMediaDuration !== null) {
          messageData.media_duration = finalMediaDuration;
        }
      }

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();
      
      if (error) throw error;
      
      // Invalidate conversations to update last_message_at
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      
      return data;
    },
    onError: (error: any) => {
      toast.error(`Failed to send message: ${error.message}`);
    },
  });
};

export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      otherUserId, 
      projectId 
    }: { 
      otherUserId: string; 
      projectId?: string | null;
    }) => {
      if (!user || !profile) throw new Error('Must be logged in');
      
      const isClient = profile.role === 'client';
      const clientId = isClient ? user.id : otherUserId;
      const freelancerId = isClient ? otherUserId : user.id;
      
      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', clientId)
        .eq('freelancer_id', freelancerId)
        .eq('project_id', projectId || null)
        .maybeSingle();
      
      if (existing) {
        return existing;
      }
      
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          client_id: clientId,
          freelancer_id: freelancerId,
          project_id: projectId || null,
          is_project_channel: !!projectId,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      
      return data;
    },
    onError: (error: any) => {
      toast.error(`Failed to create conversation: ${error.message}`);
    },
  });
};

export const useMarkAsRead = () => {
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user) return;
      
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .is('read_at', null);
    },
  });
};
