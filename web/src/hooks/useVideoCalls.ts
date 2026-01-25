import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface VideoCall {
  id: string;
  conversation_id: string | null;
  project_id: string | null;
  initiated_by: string;
  participants: string[];
  call_type: 'video' | 'audio' | 'screen_share';
  status: 'scheduled' | 'active' | 'ended' | 'cancelled';
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  recording_url: string | null;
  created_at: string;
  initiator_profile?: any;
  participants_profiles?: any[];
}

export const useVideoCalls = (conversationId?: string, projectId?: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['video-calls', conversationId, projectId, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('video_calls')
        .select(`
          *,
          initiator_profile:profiles!video_calls_initiated_by_fkey(*)
        `)
        .or(`participants.cs.{${user?.id || ''}}`)
        .order('created_at', { ascending: false });
      
      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      }
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as VideoCall[];
    },
    enabled: !!user,
  });
};

export const useCreateVideoCall = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (callData: {
      conversation_id?: string;
      project_id?: string;
      participants: string[];
      call_type?: 'video' | 'audio' | 'screen_share';
      scheduled_at?: string;
    }) => {
      if (!user) throw new Error('Must be logged in');
      
      const { data, error } = await supabase
        .from('video_calls')
        .insert({
          ...callData,
          initiated_by: user.id,
          participants: [user.id, ...callData.participants],
          call_type: callData.call_type || 'video',
          status: callData.scheduled_at ? 'scheduled' : 'active',
        })
        .select()
        .single();
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['video-calls'] });
      
      return data;
    },
    onSuccess: () => {
      toast.success('Video call initiated');
    },
    onError: (error: any) => {
      toast.error(`Failed to create video call: ${error.message}`);
    },
  });
};

export const useUpdateVideoCall = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      callId, 
      status,
      started_at,
      ended_at,
      duration_seconds
    }: { 
      callId: string; 
      status?: 'active' | 'ended' | 'cancelled';
      started_at?: string;
      ended_at?: string;
      duration_seconds?: number;
    }) => {
      const updateData: any = {};
      if (status) updateData.status = status;
      if (started_at) updateData.started_at = started_at;
      if (ended_at) updateData.ended_at = ended_at;
      if (duration_seconds !== undefined) updateData.duration_seconds = duration_seconds;
      
      const { data, error } = await supabase
        .from('video_calls')
        .update(updateData)
        .eq('id', callId)
        .select()
        .single();
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['video-calls'] });
      
      return data;
    },
  });
};
