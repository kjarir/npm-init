import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Delivery {
  id: string;
  milestone_id: string;
  project_id: string;
  delivered_by: string;
  delivered_to: string;
  delivery_files: string[];
  delivery_notes: string | null;
  status: 'delivered' | 'reviewing' | 'approved' | 'revision_requested' | 'rejected';
  delivered_at: string;
  reviewed_at: string | null;
  approved_at: string | null;
  delivered_by_profile?: any;
  delivered_to_profile?: any;
  milestone?: any;
  project?: any;
}

export const useDeliveries = (projectId?: string, milestoneId?: string) => {
  return useQuery({
    queryKey: ['deliveries', projectId, milestoneId],
    queryFn: async () => {
      let query = supabase
        .from('deliveries')
        .select(`
          *,
          delivered_by_profile:profiles!deliveries_delivered_by_fkey(*),
          delivered_to_profile:profiles!deliveries_delivered_to_fkey(*),
          milestone:milestones(*),
          project:projects(*)
        `)
        .order('delivered_at', { ascending: false });
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      if (milestoneId) {
        query = query.eq('milestone_id', milestoneId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Delivery[];
    },
    enabled: !!projectId || !!milestoneId,
  });
};

export const useCreateDelivery = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (deliveryData: {
      milestone_id: string;
      project_id: string;
      delivered_to: string;
      delivery_files: string[];
      delivery_notes?: string;
    }) => {
      if (!user) throw new Error('Must be logged in');
      
      const { data, error } = await supabase
        .from('deliveries')
        .insert({
          ...deliveryData,
          delivered_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update milestone status
      await supabase
        .from('milestones')
        .update({ status: 'submitted' })
        .eq('id', deliveryData.milestone_id);
      
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      
      return data;
    },
    onSuccess: () => {
      toast.success('Delivery submitted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to submit delivery: ${error.message}`);
    },
  });
};

export const useUpdateDeliveryStatus = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      deliveryId, 
      status 
    }: { 
      deliveryId: string; 
      status: 'reviewing' | 'approved' | 'revision_requested' | 'rejected' 
    }) => {
      if (!user) throw new Error('Must be logged in');
      
      const updateData: any = { 
        status,
        reviewed_at: new Date().toISOString(),
      };
      
      if (status === 'approved') {
        updateData.approved_at = new Date().toISOString();
        
        // Get delivery to update milestone
        const { data: delivery } = await supabase
          .from('deliveries')
          .select('milestone_id')
          .eq('id', deliveryId)
          .single();
        
        if (delivery) {
          await supabase
            .from('milestones')
            .update({ status: 'verified' })
            .eq('id', delivery.milestone_id);
        }
      } else if (status === 'revision_requested') {
        const { data: delivery } = await supabase
          .from('deliveries')
          .select('milestone_id')
          .eq('id', deliveryId)
          .single();
        
        if (delivery) {
          await supabase
            .from('milestones')
            .update({ status: 'disputed' })
            .eq('id', delivery.milestone_id);
        }
      }
      
      const { data, error } = await supabase
        .from('deliveries')
        .update(updateData)
        .eq('id', deliveryId)
        .select()
        .single();
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      
      return data;
    },
    onSuccess: (_, variables) => {
      if (variables.status === 'approved') {
        toast.success('Delivery approved');
      } else if (variables.status === 'revision_requested') {
        toast.success('Revision requested');
      }
    },
  });
};
