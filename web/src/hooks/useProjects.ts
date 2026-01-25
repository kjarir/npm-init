import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Project, Milestone } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { storeProjectData } from '@/lib/storage';

export const useProjects = (status?: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['projects', status],
    queryFn: async () => {
      try {
        console.log('Fetching projects with status:', status || 'all');
        
        let query = supabase
          .from('projects')
          .select(`
            *,
            client:profiles!projects_client_id_fkey(*),
            freelancer:profiles!projects_freelancer_id_fkey(*),
            milestones(*)
          `)
          .order('created_at', { ascending: false });
        
        if (status) {
          query = query.eq('status', status);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('Error fetching projects:', error);
          throw error;
        }
        
        console.log('Projects fetched:', data?.length || 0, 'projects');
        return (data || []) as Project[];
      } catch (error: any) {
        console.error('Failed to fetch projects:', error);
        toast.error(`Failed to load projects: ${error.message || 'Unknown error'}`);
        return [];
      }
    },
    staleTime: 30000,
    retry: 2,
  });
};

export const useMyProjects = () => {
  const { user, profile } = useAuth();
  
  return useQuery({
    queryKey: ['my-projects', user?.id],
    queryFn: async () => {
      if (!user) {
        console.log('No user, returning empty projects');
        return [];
      }
      
      try {
        const isClient = profile?.role === 'client';
        console.log('Fetching my projects for user:', user.id, 'role:', profile?.role);
        
        const filterField = isClient ? 'client_id' : 'freelancer_id';
        const { data, error } = await supabase
          .from('projects')
          .select(`
            *,
            client:profiles!projects_client_id_fkey(*),
            freelancer:profiles!projects_freelancer_id_fkey(*),
            milestones(*)
          `)
          .eq(filterField, user.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching my projects:', error);
          throw error;
        }
        
        console.log('My projects fetched:', data?.length || 0, 'projects');
        return (data || []) as Project[];
      } catch (error: any) {
        console.error('Failed to fetch my projects:', error);
        toast.error(`Failed to load your projects: ${error.message || 'Unknown error'}`);
        return [];
      }
    },
    enabled: !!user && !!profile,
    staleTime: 30000,
    retry: 2,
  });
};

export const useProject = (id: string) => {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      try {
        console.log('Fetching project:', id);
        
        const { data, error } = await supabase
          .from('projects')
          .select(`
            *,
            client:profiles!projects_client_id_fkey(*),
            freelancer:profiles!projects_freelancer_id_fkey(*),
            milestones(*)
          `)
          .eq('id', id)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching project:', error);
          throw error;
        }
        
        console.log('Project fetched:', data ? 'Found' : 'Not found');
        return data as Project | null;
      } catch (error: any) {
        console.error('Failed to fetch project:', error);
        toast.error(`Failed to load project: ${error.message || 'Unknown error'}`);
        return null;
      }
    },
    enabled: !!id,
    staleTime: 30000,
    retry: 2,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (projectData: {
      title: string;
      description: string;
      category: string;
      deadline?: string;
      skills_required?: string[];
      milestones: { title: string; description: string; amount: number; deadline: string }[];
    }) => {
      if (!user) throw new Error('Must be logged in');
      
      const totalBudget = projectData.milestones.reduce((sum, m) => sum + m.amount, 0);
      
      // Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          client_id: user.id,
          title: projectData.title,
          description: projectData.description,
          category: projectData.category,
          deadline: projectData.deadline,
          skills_required: projectData.skills_required || [],
          total_budget: totalBudget,
          locked_funds: totalBudget,
          status: 'open',
          funds_verified: true,
        })
        .select()
        .single();
      
      if (projectError) throw projectError;
      
      // Create milestones
      const milestonesData = projectData.milestones.map((m, index) => ({
        project_id: project.id,
        milestone_number: index + 1,
        title: m.title,
        description: m.description,
        amount: m.amount,
        deadline: m.deadline,
        status: index === 0 ? 'active' : 'locked',
      }));
      
      const { error: milestonesError } = await supabase
        .from('milestones')
        .insert(milestonesData);
      
      if (milestonesError) throw milestonesError;
      
      // Store project data with fallback to multiple storage options
      // NOTE: Even if IPFS/Pinata/Blockchain fail, project is already in database (primary storage)
      console.log('📤 Starting decentralized storage for project:', project.id);
      
      let storageResult;
      try {
        storageResult = await storeProjectData(
          project.id,
          {
            title: projectData.title,
            description: projectData.description,
            category: projectData.category,
            clientId: user.id,
            totalBudget,
            deadline: projectData.deadline,
            skillsRequired: projectData.skills_required || [],
            milestones: milestonesData,
          },
          async (data) => {
            const { error } = await supabase
              .from('projects')
              .update({
                blockchain_tx_hash: data.blockchain_tx_hash || null,
                ipfs_hash: data.ipfs_hash || null,
                ipfs_group_hash: (data as any).ipfs_group_hash || null,
              })
              .eq('id', project.id);
            if (error) throw error;
          }
        );

        // Show appropriate message based on what succeeded
        if (storageResult.success) {
          const methods = ['Database']; // Database is always primary
          if (storageResult.ipfsHash) methods.push('IPFS');
          if (storageResult.blockchainTxHash) methods.push('Blockchain');
          console.log(`✅ Project stored successfully via: ${methods.join(' + ')}`);
        } else {
          console.warn('⚠️ Decentralized storage had issues, but project created in database (primary storage)');
          // Don't throw - project is still created in database
        }
      } catch (storageError: any) {
        // Log storage errors but don't fail - project is already in database
        console.error('❌ Decentralized storage failed, but project is saved in database:', storageError);
        console.warn('⚠️ Project created in database (primary storage). IPFS/Blockchain storage can be retried later.');
        // Continue - project creation is successful
      }
      
      // Log activity
      await supabase.from('activity_log').insert({
        user_id: user.id,
        project_id: project.id,
        action_type: 'project_created',
        title: 'Project Created',
        description: `Created project "${projectData.title}"`,
        amount: totalBudget,
      });
      
      return project;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['my-projects'] });
      toast.success('Project created successfully!');
    },
    onError: (error: any) => {
      console.error('❌ Project creation failed:', error);
      toast.error(`Failed to create project: ${error.message || 'Unknown error'}`);
    },
  });
};

export const useUpdateMilestone = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Milestone> & { id: string }) => {
      const { data, error } = await supabase
        .from('milestones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['my-projects'] });
    },
  });
};

export const useSubmitMilestone = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ milestoneId, submissionUrl, notes }: { milestoneId: string; submissionUrl?: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('milestones')
        .update({
          status: 'submitted',
          submission_url: submissionUrl,
          submission_notes: notes,
          submitted_at: new Date().toISOString(),
        })
        .eq('id', milestoneId)
        .select()
        .single();
      
      if (error) throw error;
      
      // Log activity
      if (user) {
        await supabase.from('activity_log').insert({
          user_id: user.id,
          project_id: data.project_id,
          action_type: 'milestone_submitted',
          title: 'Milestone Submitted',
          description: `Submitted "${data.title}" for verification`,
        });
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project', data.project_id] });
      toast.success('Milestone submitted for verification!');
    },
  });
};

export const useApproveMilestone = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ milestoneId, verificationScore = 95 }: { milestoneId: string; verificationScore?: number }) => {
      // Get milestone and project data
      const { data: milestone, error: fetchError } = await supabase
        .from('milestones')
        .select('*, project:projects(*)')
        .eq('id', milestoneId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Update milestone
      const { data, error } = await supabase
        .from('milestones')
        .update({
          status: 'completed',
          verification_score: verificationScore,
          verified_at: new Date().toISOString(),
        })
        .eq('id', milestoneId)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update project funds
      await supabase
        .from('projects')
        .update({
          locked_funds: (milestone.project as any).locked_funds - milestone.amount,
          released_funds: (milestone.project as any).released_funds + milestone.amount,
        })
        .eq('id', milestone.project_id);
      
      // Activate next milestone
      const { data: nextMilestone } = await supabase
        .from('milestones')
        .select()
        .eq('project_id', milestone.project_id)
        .eq('milestone_number', milestone.milestone_number + 1)
        .maybeSingle();
      
      if (nextMilestone) {
        await supabase
          .from('milestones')
          .update({ status: 'active' })
          .eq('id', nextMilestone.id);
      }
      
      // Log activity
      if (user) {
        await supabase.from('activity_log').insert({
          user_id: user.id,
          project_id: milestone.project_id,
          action_type: 'milestone_completed',
          title: 'Milestone Completed',
          description: `"${milestone.title}" verified and payment released`,
          amount: milestone.amount,
        });
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['my-projects'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success('Milestone approved and payment released!');
    },
  });
};
