import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { bobcoin } from '@/lib/blockchain';

export interface RedemptionRequest {
  id: string;
  user_id: string;
  amount: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  bobcoin_amount: string;
  fiat_amount: number;
  fiat_currency: string;
  bank_account?: string;
  created_at: string;
  processed_at?: string;
  transaction_hash?: string;
}

/**
 * Hook to get user's redemption requests
 */
export const useRedemptionRequests = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['redemption-requests', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('redemption_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as RedemptionRequest[];
    },
    enabled: !!user,
  });
};

/**
 * Hook to create redemption request
 */
export const useCreateRedemptionRequest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      amount: string; // BobCoin amount
      fiatAmount: number;
      fiatCurrency: string;
      bankAccount?: string;
    }) => {
      if (!user) throw new Error('Must be logged in');

      // Check balance
      const balance = await bobcoin.balanceOf(user.id);
      if (parseFloat(balance) < parseFloat(data.amount)) {
        throw new Error('Insufficient BobCoin balance');
      }

      // Create redemption request in database
      const { data: redemption, error } = await supabase
        .from('redemption_requests')
        .insert({
          user_id: user.id,
          bobcoin_amount: data.amount,
          fiat_amount: data.fiatAmount,
          fiat_currency: data.fiatCurrency,
          bank_account: data.bankAccount,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // TODO: Lock BobCoin (burn or transfer to escrow)
      // await bobcoin.burn(user.id, data.amount);

      return redemption as RedemptionRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redemption-requests'] });
      queryClient.invalidateQueries({ queryKey: ['bobcoin-balance'] });
      toast.success('Redemption request created. Will be processed manually.');
    },
    onError: (error: any) => {
      toast.error(`Failed to create redemption request: ${error.message}`);
    },
  });
};
