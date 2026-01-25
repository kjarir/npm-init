import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Wallet, Transaction } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useWallet = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      try {
        console.log('Fetching wallet for user:', user.id);
        
        const { data, error } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching wallet:', error);
          throw error;
        }
        
        console.log('Wallet fetched:', data ? 'Found' : 'Not found');
        return data as Wallet | null;
      } catch (error: any) {
        console.error('Failed to fetch wallet:', error);
        toast.error(`Failed to load wallet: ${error.message || 'Unknown error'}`);
        return null;
      }
    },
    enabled: !!user,
    staleTime: 30000,
    retry: 2,
  });
};

export const useTransactions = (limit = 10) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['transactions', user?.id, limit],
    queryFn: async () => {
      if (!user) return [];
      
      // First get wallet
      const { data: wallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!wallet) return [];
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          project:projects(title)
        `)
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!user,
  });
};

export const useAddFunds = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (amount: number) => {
      if (!user) throw new Error('Must be logged in');
      
      // Get wallet
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (walletError) throw walletError;
      
      // Update wallet
      const { error: updateError } = await supabase
        .from('wallets')
        .update({
          total_balance: wallet.total_balance + amount,
          available_balance: wallet.available_balance + amount,
        })
        .eq('id', wallet.id);
      
      if (updateError) throw updateError;
      
      // Create transaction
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          wallet_id: wallet.id,
          type: 'deposit',
          amount,
          description: 'Deposit from bank',
        });
      
      if (txError) throw txError;
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Funds added successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to add funds: ${error.message}`);
    },
  });
};

export const useWithdrawFunds = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (amount: number) => {
      if (!user) throw new Error('Must be logged in');
      
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (walletError) throw walletError;
      
      if (wallet.available_balance < amount) {
        throw new Error('Insufficient funds');
      }
      
      const { error: updateError } = await supabase
        .from('wallets')
        .update({
          total_balance: wallet.total_balance - amount,
          available_balance: wallet.available_balance - amount,
        })
        .eq('id', wallet.id);
      
      if (updateError) throw updateError;
      
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          wallet_id: wallet.id,
          type: 'withdrawal',
          amount,
          description: 'Withdrawal to bank',
        });
      
      if (txError) throw txError;
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Withdrawal initiated!');
    },
    onError: (error) => {
      toast.error(`Failed to withdraw: ${error.message}`);
    },
  });
};
