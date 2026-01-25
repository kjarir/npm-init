import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useFreelancers = () => {
  return useQuery({
    queryKey: ['freelancers'],
    queryFn: async () => {
      try {
        console.log('Fetching freelancers from database...');
        
        // First, try to get all profiles to check RLS
        const { data: allProfiles, error: allError } = await supabase
          .from('profiles')
          .select('id, email, role, full_name')
          .limit(100);
        
        console.log('All profiles query result:', {
          count: allProfiles?.length || 0,
          error: allError,
          profiles: allProfiles
        });
        
        if (allError) {
          console.error('Error fetching all profiles (RLS check):', allError);
          // Continue anyway - might be RLS blocking
        }
        
        // Now try the filtered query
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'freelancer');
        
        if (error) {
          console.error('Error fetching freelancers:', error);
          console.error('Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          
          // If RLS is blocking, try fetching all and filtering client-side
          if (error.code === '42501' || error.message?.includes('RLS') || error.message?.includes('permission')) {
            console.log('RLS policy blocking query. Attempting to fetch all profiles and filter client-side...');
            
            const { data: allData, error: allDataError } = await supabase
              .from('profiles')
              .select('*');
            
            if (allDataError) {
              console.error('Error fetching all profiles:', allDataError);
              throw error; // Throw original error
            }
            
            // Filter client-side
            const freelancers = (allData || []).filter((p: any) => p.role === 'freelancer');
            console.log('Filtered freelancers client-side:', freelancers.length);
            
            const sorted = freelancers.sort((a: any, b: any) => {
              const aRating = a.rating || 0;
              const bRating = b.rating || 0;
              if (bRating !== aRating) {
                return bRating - aRating;
              }
              return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
            });
            
            return sorted as Profile[];
          }
          
          throw error;
        }
        
        console.log('Freelancers fetched:', data?.length || 0, 'profiles');
        
        // Debug: Log the actual data
        if (data && data.length > 0) {
          console.log('Sample freelancer data:', data[0]);
        } else {
          console.log('No freelancers found with filtered query.');
          console.log('All profiles available:', allProfiles);
          if (allProfiles) {
            const roleCounts = allProfiles.reduce((acc: any, p: any) => {
              acc[p.role] = (acc[p.role] || 0) + 1;
              return acc;
            }, {});
            console.log('Profiles by role:', roleCounts);
            
            // If we can see all profiles but filtered query returned nothing, filter client-side
            const freelancers = allProfiles.filter((p: any) => p.role === 'freelancer');
            if (freelancers.length > 0) {
              console.log('Found freelancers in all profiles, fetching full data...');
              // Fetch full data for freelancers
              const { data: fullData } = await supabase
                .from('profiles')
                .select('*')
                .in('id', freelancers.map((f: any) => f.id));
              
              if (fullData) {
                const sorted = fullData.sort((a: any, b: any) => {
                  const aRating = a.rating || 0;
                  const bRating = b.rating || 0;
                  if (bRating !== aRating) {
                    return bRating - aRating;
                  }
                  return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
                });
                return sorted as Profile[];
              }
            }
          }
        }
        
        // Sort by rating if available, otherwise by created_at
        const sorted = (data || []).sort((a: any, b: any) => {
          const aRating = a.rating || 0;
          const bRating = b.rating || 0;
          if (bRating !== aRating) {
            return bRating - aRating;
          }
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });
        
        return sorted as Profile[];
      } catch (error: any) {
        console.error('Failed to fetch freelancers:', error);
        toast.error(`Failed to load freelancers: ${error.message || 'Unknown error'}`);
        return [];
      }
    },
    staleTime: 30000, // 30 seconds
    retry: 2,
  });
};

export const useProfile = (userId: string) => {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!userId,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { user, refreshProfile } = useAuth();
  
  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user) throw new Error('Must be logged in');
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['freelancers'] });
      refreshProfile();
      toast.success('Profile updated!');
    },
    onError: (error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });
};
