import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { bobcoin, escrow, certificateRegistry } from '@/lib/blockchain';
import { toast } from 'sonner';

/**
 * Hook to get BobCoin balance
 */
export const useBobCoinBalance = (address?: string) => {
  const { user } = useAuth();
  const walletAddress = address || user?.id; // Use user ID as wallet address for now

  return useQuery({
    queryKey: ['bobcoin-balance', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return '0';
      try {
        const balance = await bobcoin.balanceOf(walletAddress);
        return balance;
      } catch (error: any) {
        console.error('Error fetching BobCoin balance:', error);
        return '0';
      }
    },
    enabled: !!walletAddress,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

/**
 * Hook to create escrow contract
 */
export const useCreateEscrowContract = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      projectId: string;
      clientId: string;
      freelancerId: string;
      totalAmount: string;
      milestones: any[];
    }) => {
      if (!user) throw new Error('Must be logged in');
      
      try {
        const txHash = await escrow.createContract(
          data.projectId,
          data.clientId,
          data.freelancerId,
          data.totalAmount,
          data.milestones
        );
        
        // Lock funds (transfer BobCoins to escrow)
        await escrow.lockFunds(data.projectId, data.totalAmount, data.clientId);
        
        return txHash;
      } catch (error: any) {
        console.error('Error creating escrow contract:', error);
        throw new Error(`Failed to create contract: ${error.message}`);
      }
    },
    onSuccess: (txHash, variables) => {
      queryClient.invalidateQueries({ queryKey: ['escrow', variables.projectId] });
      toast.success('Contract created on blockchain');
    },
    onError: (error: any) => {
      toast.error(`Failed to create contract: ${error.message}`);
    },
  });
};

/**
 * Hook to release milestone payment
 */
export const useReleaseMilestone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      projectId: string;
      milestoneId: string;
      amount: string;
      freelancerWallet: string;
    }) => {
      try {
        // Release from escrow
        const escrowTxHash = await escrow.releaseMilestone(
          data.projectId,
          data.milestoneId,
          data.amount
        );
        
        // Transfer BobCoin to freelancer
        const transferTxHash = await bobcoin.transfer(data.freelancerWallet, data.amount);
        
        return {
          escrowTxHash,
          transferTxHash,
        };
      } catch (error: any) {
        console.error('Error releasing milestone:', error);
        throw new Error(`Failed to release milestone: ${error.message}`);
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['escrow', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['bobcoin-balance'] });
      toast.success('Milestone payment released');
    },
    onError: (error: any) => {
      toast.error(`Failed to release milestone: ${error.message}`);
    },
  });
};

/**
 * Hook to refund project
 */
export const useRefundProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      projectId: string;
      reason: string;
      clientWallet: string;
    }) => {
      try {
        // Get locked amount
        const lockedAmount = await escrow.getLockedAmount(data.projectId);
        
        // Refund from escrow
        const refundTxHash = await escrow.refundProject(data.projectId, data.reason);
        
        // Transfer BobCoin back to client (if needed)
        // This depends on your refund logic
        
        return refundTxHash;
      } catch (error: any) {
        console.error('Error refunding project:', error);
        throw new Error(`Failed to refund project: ${error.message}`);
      }
    },
    onSuccess: (txHash, variables) => {
      queryClient.invalidateQueries({ queryKey: ['escrow', variables.projectId] });
      toast.success('Project refunded');
    },
    onError: (error: any) => {
      toast.error(`Failed to refund project: ${error.message}`);
    },
  });
};

/**
 * Hook to register certificate on blockchain
 */
export const useRegisterCertificate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      certificateId: string;
      projectId: string;
      milestoneId: string;
      ipfsHash: string;
      transactionHash: string;
      freelancerId?: string;
      clientId?: string;
      amount?: string;
    }) => {
      try {
        const txHash = await certificateRegistry.registerCertificate(
          data.certificateId,
          data.projectId,
          data.milestoneId,
          data.ipfsHash,
          data.transactionHash,
          data.freelancerId,
          data.clientId,
          data.amount
        );
        return txHash;
      } catch (error: any) {
        console.error('Error registering certificate:', error);
        throw new Error(`Failed to register certificate: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      toast.success('Certificate registered on blockchain');
    },
    onError: (error: any) => {
      toast.error(`Failed to register certificate: ${error.message}`);
    },
  });
};

/**
 * Hook to get certificates for a project
 */
export const useProjectCertificates = (projectId: string) => {
  return useQuery({
    queryKey: ['certificates', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      try {
        const certificates = await certificateRegistry.getCertificatesByProject(projectId);
        return certificates;
      } catch (error: any) {
        console.error('Error fetching certificates:', error);
        return [];
      }
    },
    enabled: !!projectId,
  });
};
