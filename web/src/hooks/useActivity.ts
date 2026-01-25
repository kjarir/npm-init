import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ActivityLog } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

export const useActivityLog = (limit = 10) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['activity', user?.id, limit],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        console.log('Fetching activity log for user:', user.id);
        
        const { data, error } = await supabase
          .from('activity_log')
          .select(`
            *,
            project:projects(title)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (error) {
          console.error('Error fetching activity log:', error);
          throw error;
        }
        
        console.log('Activity log fetched:', data?.length || 0, 'activities');
        return (data || []) as ActivityLog[];
      } catch (error: any) {
        console.error('Failed to fetch activity log:', error);
        // Don't show toast for activity log, it's not critical
        return [];
      }
    },
    enabled: !!user,
    staleTime: 30000,
    retry: 2,
  });
};
