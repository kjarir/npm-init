import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ProjectAttachment {
  id: string;
  project_id: string;
  milestone_id: string | null;
  uploaded_by: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  description: string | null;
  created_at: string;
  uploader?: any;
  milestone?: any;
}

export const useProjectAttachments = (projectId: string, milestoneId?: string) => {
  return useQuery({
    queryKey: ['project-attachments', projectId, milestoneId],
    queryFn: async () => {
      let query = supabase
        .from('project_attachments')
        .select(`
          *,
          uploader:profiles!project_attachments_uploaded_by_fkey(*),
          milestone:milestones(*)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (milestoneId) {
        query = query.eq('milestone_id', milestoneId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ProjectAttachment[];
    },
    enabled: !!projectId,
  });
};

export const useUploadProjectAttachment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      projectId, 
      milestoneId, 
      file, 
      description 
    }: { 
      projectId: string; 
      milestoneId?: string;
      file: File; 
      description?: string;
    }) => {
      if (!user) throw new Error('Must be logged in');
      
      // Upload file to storage
      const fileName = `project-attachments/${projectId}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName);
      
      // Create attachment record
      const { data, error } = await supabase
        .from('project_attachments')
        .insert({
          project_id: projectId,
          milestone_id: milestoneId || null,
          uploaded_by: user.id,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          file_type: file.type,
          description: description || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['project-attachments'] });
      
      return data;
    },
    onSuccess: () => {
      toast.success('File uploaded successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to upload file: ${error.message}`);
    },
  });
};

export const useDeleteProjectAttachment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      if (!user) throw new Error('Must be logged in');
      
      // Get attachment to check ownership
      const { data: attachment, error: fetchError } = await supabase
        .from('project_attachments')
        .select('uploaded_by, file_url')
        .eq('id', attachmentId)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (attachment.uploaded_by !== user.id) {
        throw new Error('You can only delete your own attachments');
      }
      
      // Delete from storage (extract path from URL)
      const urlPath = attachment.file_url.split('/storage/v1/object/public/chat-media/')[1];
      if (urlPath) {
        await supabase.storage
          .from('chat-media')
          .remove([`project-attachments/${urlPath}`]);
      }
      
      // Delete record
      const { error } = await supabase
        .from('project_attachments')
        .delete()
        .eq('id', attachmentId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['project-attachments'] });
    },
    onSuccess: () => {
      toast.success('Attachment deleted');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete attachment: ${error.message}`);
    },
  });
};
