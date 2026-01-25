/**
 * Hook for managing Pinata Groups and retrieving certificates for rating
 */

import { useQuery } from '@tanstack/react-query';
import { getGroupCertificates, getCertificatesForRating } from '@/lib/ipfs-groups';
import { supabase } from '@/lib/supabase';

/**
 * Get all certificates from a project's Pinata Group
 */
export const useProjectGroupCertificates = (projectId: string) => {
  return useQuery({
    queryKey: ['pinata-group', projectId],
    queryFn: async () => {
      // Get project to find Pinata Group ID
      const { data: project, error } = await supabase
        .from('projects')
        .select('ipfs_group_hash')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      if (!project?.ipfs_group_hash) {
        throw new Error('Project does not have a Pinata Group');
      }

      return await getGroupCertificates(project.ipfs_group_hash);
    },
    enabled: !!projectId,
    staleTime: 30000,
  });
};

/**
 * Get certificates organized for rating
 */
export const useCertificatesForRating = (projectId: string) => {
  return useQuery({
    queryKey: ['certificates-for-rating', projectId],
    queryFn: async () => {
      // Get project to find Pinata Group ID
      const { data: project, error } = await supabase
        .from('projects')
        .select('ipfs_group_hash')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      if (!project?.ipfs_group_hash) {
        throw new Error('Project does not have a Pinata Group');
      }

      return await getCertificatesForRating(project.ipfs_group_hash);
    },
    enabled: !!projectId,
    staleTime: 30000,
  });
};
