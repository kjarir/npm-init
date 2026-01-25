import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Proposal } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { storeContractData } from '@/lib/storage';

export const useProposals = (projectId?: string) => {
  return useQuery({
    queryKey: ['proposals', projectId],
    queryFn: async () => {
      let query = supabase
        .from('proposals')
        .select(`
          *,
          freelancer:profiles!proposals_freelancer_id_fkey(*),
          project:projects(*)
        `)
        .order('created_at', { ascending: false });
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Proposal[];
    },
    enabled: !projectId || !!projectId,
  });
};

export const useMyProposals = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-proposals', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          *,
          project:projects(*, client:profiles!projects_client_id_fkey(*))
        `)
        .eq('freelancer_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Proposal[];
    },
    enabled: !!user,
  });
};

export const useCreateProposal = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (proposalData: {
      project_id: string;
      cover_letter: string;
      proposed_budget: number;
      proposed_timeline: number; // in days
    }) => {
      if (!user) throw new Error('Must be logged in');
      
      const { data, error } = await supabase
        .from('proposals')
        .insert({
          ...proposalData,
          freelancer_id: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Log activity
      await supabase.from('activity_log').insert({
        user_id: user.id,
        project_id: proposalData.project_id,
        action_type: 'proposal_submitted',
        title: 'Proposal Submitted',
        description: 'Submitted proposal for project',
      });
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['my-proposals'] });
      queryClient.invalidateQueries({ queryKey: ['project', data.project_id] });
      toast.success('Proposal submitted successfully!');
    },
    onError: (error) => {
      if (error.message.includes('duplicate')) {
        toast.error('You have already submitted a proposal for this project');
      } else {
        toast.error(`Failed to submit proposal: ${error.message}`);
      }
    },
  });
};

export const useAcceptProposal = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (proposalId: string) => {
      if (!user) throw new Error('Must be logged in');
      
      // Get proposal
      const { data: proposal, error: fetchError } = await supabase
        .from('proposals')
        .select('*, project:projects(*)')
        .eq('id', proposalId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Update proposal status
      const { error: proposalError } = await supabase
        .from('proposals')
        .update({ status: 'accepted' })
        .eq('id', proposalId);
      
      if (proposalError) throw proposalError;
      
      // Reject other proposals
      await supabase
        .from('proposals')
        .update({ status: 'rejected' })
        .eq('project_id', proposal.project_id)
        .neq('id', proposalId);
      
      // Update project
      const { error: projectError } = await supabase
        .from('projects')
        .update({
          freelancer_id: proposal.freelancer_id,
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', proposal.project_id);
      
      if (projectError) throw projectError;
      
      // Get project milestones
      const { data: milestones, error: milestonesError } = await supabase
        .from('milestones')
        .select('*')
        .eq('project_id', proposal.project_id)
        .order('milestone_number', { ascending: true });

      if (milestonesError) {
        throw new Error(`Failed to fetch milestones: ${milestonesError.message}`);
      }

      if (!milestones || milestones.length === 0) {
        throw new Error('No milestones found for this project');
      }

      // Store contract data with fallback to multiple storage options
      console.log('📤 Starting decentralized storage for contract:', proposal.project_id);
      
      const storageResult = await storeContractData(
        proposal.project_id,
        {
          contractId: `${proposal.project_id}-${proposal.id}`,
          proposalId: proposal.id,
          clientId: proposal.project.client_id,
          freelancerId: proposal.freelancer_id,
          totalAmount: proposal.proposed_budget || proposal.project.total_budget,
          milestones: milestones.map(m => ({
            id: m.id,
            milestoneNumber: m.milestone_number,
            title: m.title,
            description: m.description,
            amount: m.amount,
            deadline: m.deadline,
            status: m.status,
          })),
          proposalDetails: {
            coverLetter: proposal.cover_letter,
            proposedBudget: proposal.proposed_budget,
            proposedTimeline: proposal.proposed_timeline,
          },
        },
        async (data) => {
          const { error } = await supabase
            .from('projects')
            .update({
              contract_tx_hash: data.contract_tx_hash || null,
              contract_ipfs_hash: data.contract_ipfs_hash || null,
              ipfs_group_hash: (data as any).ipfs_group_hash || null,
            })
            .eq('id', proposal.project_id);
          if (error) throw error;
        }
      );

      // Show appropriate message
      if (storageResult.success) {
        const methods = [];
        if (storageResult.ipfsHash) methods.push('IPFS');
        if (storageResult.blockchainTxHash) methods.push('Blockchain');
        console.log(`✅ Contract stored successfully via: ${methods.join(' + ')}`);
      } else {
        console.warn('⚠️ Storage partially failed, but contract accepted in database');
      }
      
      // Log activity
      await supabase.from('activity_log').insert({
        user_id: user.id,
        project_id: proposal.project_id,
        action_type: 'proposal_accepted',
        title: 'Proposal Accepted',
        description: 'Accepted freelancer proposal and started project',
      });
      
      return proposal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['project', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['my-projects'] });
      toast.success('Proposal accepted! Contract created.');
    },
    onError: (error: any) => {
      console.error('❌ Proposal acceptance failed:', error);
      toast.error(`Failed to accept proposal: ${error.message || 'Unknown error'}`);
    },
  });
};
