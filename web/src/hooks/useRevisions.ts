import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Revision {
  id: string;
  milestone_id: string | null;
  project_id: string;
  requested_by: string;
  requested_from: string;
  reason: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  created_at: string;
  completed_at: string | null;
  requested_by_profile?: any;
  requested_from_profile?: any;
  milestone?: any;
  project?: any;
}

export const useRevisions = (projectId?: string, milestoneId?: string) => {
  return useQuery({
    queryKey: ['revisions', projectId, milestoneId],
    queryFn: async () => {
      let query = supabase
        .from('revisions')
        .select(`
          *,
          requested_by_profile:profiles!revisions_requested_by_fkey(*),
          requested_from_profile:profiles!revisions_requested_from_fkey(*),
          milestone:milestones(*),
          project:projects(*)
        `)
        .order('created_at', { ascending: false });
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      if (milestoneId) {
        query = query.eq('milestone_id', milestoneId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Revision[];
    },
    enabled: !!projectId || !!milestoneId,
  });
};

export const useCreateRevision = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (revisionData: {
      milestone_id?: string;
      project_id: string;
      requested_from: string;
      reason: string;
    }) => {
      if (!user) throw new Error('Must be logged in');
      
      const { data, error } = await supabase
        .from('revisions')
        .insert({
          ...revisionData,
          requested_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update milestone status if provided
      if (revisionData.milestone_id) {
        await supabase
          .from('milestones')
          .update({ status: 'disputed' })
          .eq('id', revisionData.milestone_id);
      }
      
      queryClient.invalidateQueries({ queryKey: ['revisions'] });
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      
      return data;
    },
    onSuccess: () => {
      toast.success('Revision request submitted');
    },
    onError: (error: any) => {
      toast.error(`Failed to request revision: ${error.message}`);
    },
  });
};

export const useUpdateRevision = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      revisionId, 
      status 
    }: { 
      revisionId: string; 
      status: 'in_progress' | 'completed' | 'rejected' 
    }) => {
      if (!user) throw new Error('Must be logged in');
      
      const updateData: any = { status };
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('revisions')
        .update(updateData)
        .eq('id', revisionId)
        .select()
        .single();
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['revisions'] });
      
      return data;
    },
    onSuccess: () => {
      toast.success('Revision status updated');
    },
  });
};
