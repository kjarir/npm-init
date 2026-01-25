import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ProjectTemplate {
  id: string;
  created_by: string | null;
  name: string;
  description: string | null;
  category: string;
  template_data: any; // JSON structure for project
  is_public: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
  creator?: any;
}

export const useProjectTemplates = (category?: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['project-templates', category, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('project_templates')
        .select(`
          *,
          creator:profiles!project_templates_created_by_fkey(*)
        `)
        .or(`is_public.eq.true,created_by.eq.${user?.id || 'null'}`)
        .order('usage_count', { ascending: false });
      
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ProjectTemplate[];
    },
  });
};

export const useCreateTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (templateData: {
      name: string;
      description?: string;
      category: string;
      template_data: any;
      is_public?: boolean;
    }) => {
      if (!user) throw new Error('Must be logged in');
      
      const { data, error } = await supabase
        .from('project_templates')
        .insert({
          ...templateData,
          created_by: user.id,
          is_public: templateData.is_public || false,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['project-templates'] });
      
      return data;
    },
    onSuccess: () => {
      toast.success('Template created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });
};

export const useTemplate = (templateId: string) => {
  return useQuery({
    queryKey: ['project-template', templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      
      if (error) throw error;
      return data as ProjectTemplate;
    },
    enabled: !!templateId,
  });
};
