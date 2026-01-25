import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TimeEntry {
  id: string;
  project_id: string;
  freelancer_id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  description: string | null;
  screenshot_urls: string[];
  status: 'active' | 'paused' | 'completed' | 'disputed';
  created_at: string;
  updated_at: string;
  project?: any;
  freelancer?: any;
}

export const useTimeEntries = (projectId?: string) => {
  const { user, profile } = useAuth();
  
  return useQuery({
    queryKey: ['time-entries', projectId, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('time_entries')
        .select(`
          *,
          project:projects(*),
          freelancer:profiles!time_entries_freelancer_id_fkey(*)
        `)
        .order('created_at', { ascending: false });
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      } else if (profile?.role === 'freelancer' && user) {
        query = query.eq('freelancer_id', user.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as TimeEntry[];
    },
    enabled: !!user,
  });
};

export const useStartTimeTracking = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      projectId, 
      description 
    }: { 
      projectId: string; 
      description?: string 
    }) => {
      if (!user) throw new Error('Must be logged in');
      
      // Check for active time entry
      const { data: activeEntry } = await supabase
        .from('time_entries')
        .select('id')
        .eq('project_id', projectId)
        .eq('freelancer_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      
      if (activeEntry) {
        throw new Error('You already have an active time entry for this project');
      }
      
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          project_id: projectId,
          freelancer_id: user.id,
          start_time: new Date().toISOString(),
          description: description || null,
          status: 'active',
        })
        .select()
        .single();
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      
      return data;
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to start time tracking');
    },
  });
};

export const useStopTimeTracking = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      timeEntryId, 
      screenshotUrls 
    }: { 
      timeEntryId: string; 
      screenshotUrls?: string[] 
    }) => {
      if (!user) throw new Error('Must be logged in');
      
      // Get the time entry
      const { data: entry, error: fetchError } = await supabase
        .from('time_entries')
        .select('start_time')
        .eq('id', timeEntryId)
        .eq('freelancer_id', user.id)
        .single();
      
      if (fetchError) throw fetchError;
      
      const endTime = new Date().toISOString();
      const startTime = new Date(entry.start_time);
      const durationMinutes = Math.floor((new Date(endTime).getTime() - startTime.getTime()) / 60000);
      
      const { data, error } = await supabase
        .from('time_entries')
        .update({
          end_time: endTime,
          duration_minutes: durationMinutes,
          screenshot_urls: screenshotUrls || [],
          status: 'completed',
        })
        .eq('id', timeEntryId)
        .select()
        .single();
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      
      return data;
    },
    onSuccess: () => {
      toast.success('Time entry saved');
    },
    onError: (error: any) => {
      toast.error(`Failed to stop time tracking: ${error.message}`);
    },
  });
};

export const useUploadScreenshots = () => {
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      timeEntryId, 
      files 
    }: { 
      timeEntryId: string; 
      files: File[] 
    }) => {
      if (!user) throw new Error('Must be logged in');
      
      const screenshotUrls: string[] = [];
      
      for (const file of files) {
        const fileName = `time-tracking/${timeEntryId}/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(fileName, file);
        
        if (uploadError) {
          console.error('Screenshot upload error:', uploadError);
          continue;
        }
        
        const { data: urlData } = supabase.storage
          .from('chat-media')
          .getPublicUrl(fileName);
        
        screenshotUrls.push(urlData.publicUrl);
      }
      
      // Update time entry with screenshot URLs
      const { data: existingEntry } = await supabase
        .from('time_entries')
        .select('screenshot_urls')
        .eq('id', timeEntryId)
        .single();
      
      const updatedUrls = [...(existingEntry?.screenshot_urls || []), ...screenshotUrls];
      
      const { error } = await supabase
        .from('time_entries')
        .update({ screenshot_urls: updatedUrls })
        .eq('id', timeEntryId);
      
      if (error) throw error;
      
      return screenshotUrls;
    },
    onSuccess: () => {
      toast.success('Screenshots uploaded');
    },
    onError: (error: any) => {
      toast.error(`Failed to upload screenshots: ${error.message}`);
    },
  });
};
