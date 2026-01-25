import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Dispute } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useDisputes = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['disputes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        console.log('Fetching disputes for user:', user.id);
        
        const { data, error } = await supabase
          .from('disputes')
          .select(`
            *,
            project:projects(title),
            raised_by_profile:profiles!disputes_raised_by_fkey(full_name, email),
            against_profile:profiles!disputes_against_fkey(full_name, email)
          `)
          .or(`raised_by.eq.${user.id},against.eq.${user.id}`)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching disputes:', error);
          throw error;
        }
        
        console.log('Disputes fetched:', data?.length || 0, 'disputes');
        return (data || []) as Dispute[];
      } catch (error: any) {
        console.error('Failed to fetch disputes:', error);
        toast.error(`Failed to load disputes: ${error.message || 'Unknown error'}`);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 30000,
    retry: 2,
  });
};

export const useCreateDispute = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (disputeData: {
      project_id: string;
      milestone_id?: string;
      against: string;
      reason: string;
      description?: string;
      disputed_amount: number;
    }) => {
      if (!user) throw new Error('Must be logged in');
      
      const { data, error } = await supabase
        .from('disputes')
        .insert({
          ...disputeData,
          raised_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update milestone status if applicable
      if (disputeData.milestone_id) {
        await supabase
          .from('milestones')
          .update({ status: 'disputed' })
          .eq('id', disputeData.milestone_id);
      }
      
      // Log activity
      await supabase.from('activity_log').insert({
        user_id: user.id,
        project_id: disputeData.project_id,
        action_type: 'dispute_raised',
        title: 'Dispute Raised',
        description: disputeData.reason,
        amount: disputeData.disputed_amount,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      queryClient.invalidateQueries({ queryKey: ['my-projects'] });
      toast.success('Dispute submitted. Our team will review it.');
    },
    onError: (error) => {
      toast.error(`Failed to raise dispute: ${error.message}`);
    },
  });
};
