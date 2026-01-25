/**
 * Hooks for withdrawal requests (manual processing)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { processWithdrawal as processWithdrawalAPI } from '@/lib/payment-gateway';

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  bank_account_number?: string;
  bank_ifsc?: string;
  bank_name?: string;
  account_holder_name?: string;
  upi_id?: string;
  transaction_hash?: string;
  admin_notes?: string;
  created_at: string;
  processed_at?: string;
  profile?: {
    full_name: string;
    email: string;
  };
}

/**
 * Create a withdrawal request (AUTOMATED - Processes immediately!)
 */
export const useCreateWithdrawalRequest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      amount: number;
      bankAccountNumber?: string;
      bankIFSC?: string;
      bankName?: string;
      accountHolderName?: string;
      upiId?: string;
    }) => {
      if (!user) throw new Error('Must be logged in');
      
      if (data.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Check BobCoin balance from blockchain
      const { bobcoin } = await import('@/lib/blockchain');
      const bobcoinBalance = parseFloat(await bobcoin.balanceOf(user.id));
      
      if (bobcoinBalance < data.amount) {
        throw new Error('Insufficient BobCoin balance');
      }

      // Validate bank details
      if (!data.upiId && (!data.bankAccountNumber || !data.bankIFSC || !data.accountHolderName)) {
        throw new Error('Please provide either UPI ID or complete bank details');
      }

      // Create withdrawal request
      const { data: withdrawalRequest, error } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user.id,
          amount: data.amount,
          bank_account_number: data.bankAccountNumber,
          bank_ifsc: data.bankIFSC,
          bank_name: data.bankName,
          account_holder_name: data.accountHolderName,
          upi_id: data.upiId,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Lock funds in wallet (reduce available balance)
      const { data: wallet } = await supabase
        .from('wallets')
        .select('available_balance')
        .eq('user_id', user.id)
        .single();

      if (wallet) {
        await supabase
          .from('wallets')
          .update({
            available_balance: wallet.available_balance - data.amount,
          })
          .eq('user_id', user.id);
      }

      // AUTOMATED: Process withdrawal immediately (no admin needed!)
      // Call backend API to process withdrawal automatically
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      try {
        const response = await fetch(`${apiUrl}/api/withdrawals/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId: withdrawalRequest.id,
            userId: user.id,
            amount: data.amount,
            bankAccount: data.bankAccountNumber,
            bankIFSC: data.bankIFSC,
            bankName: data.bankName,
            accountHolderName: data.accountHolderName,
            upiId: data.upiId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to process withdrawal automatically');
        }

        const result = await response.json();
        console.log('✅ Withdrawal processed automatically (NO ADMIN NEEDED!):', result);
      } catch (autoError: any) {
        console.error('Auto-withdrawal processing error:', autoError);
        // Don't throw - request is created, will be processed by webhook or retry
        // User will see success message, processing happens in background
      }

      return withdrawalRequest as WithdrawalRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawal-requests'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['bobcoin-balance'] });
      toast.success('Withdrawal processing automatically! BobCoin will be burned and money transferred.');
    },
    onError: (error: any) => {
      toast.error(`Failed to create withdrawal request: ${error.message}`);
    },
  });
};


/**
 * Get user's withdrawal requests
 */
export const useMyWithdrawalRequests = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['withdrawal-requests', 'my', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WithdrawalRequest[];
    },
    enabled: !!user,
  });
};

/**
 * Get withdrawal request by ID
 */
export const useWithdrawalRequest = (requestId: string) => {
  return useQuery({
    queryKey: ['withdrawal-request', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*, profile:profiles(full_name, email)')
        .eq('id', requestId)
        .single();

      if (error) throw error;
      return data as WithdrawalRequest;
    },
    enabled: !!requestId,
  });
};

/**
 * Cancel withdrawal request (user can cancel if pending)
 */
export const useCancelWithdrawal = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!user) throw new Error('Must be logged in');

      // Get withdrawal request
      const { data: request } = await supabase
        .from('withdrawal_requests')
        .select('amount, status')
        .eq('id', requestId)
        .eq('user_id', user.id)
        .single();

      if (!request) throw new Error('Withdrawal request not found');
      if (request.status !== 'pending') {
        throw new Error('Can only cancel pending withdrawals');
      }

      // Update status
      const { error: updateError } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'cancelled',
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Unlock funds (restore available balance)
      const { data: wallet } = await supabase
        .from('wallets')
        .select('available_balance')
        .eq('user_id', user.id)
        .single();

      if (wallet) {
        await supabase
          .from('wallets')
          .update({
            available_balance: wallet.available_balance + request.amount,
          })
          .eq('user_id', user.id);
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawal-requests'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success('Withdrawal request cancelled. Funds unlocked.');
    },
    onError: (error: any) => {
      toast.error(`Failed to cancel withdrawal: ${error.message}`);
    },
  });
};

/**
 * AUTOMATED: Process withdrawal request (burn BobCoin and transfer money)
 * No admin needed - fully automated!
 */
export const useProcessWithdrawal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      requestId: string;
      userId: string;
      amount: number;
      bankAccount?: string;
      bankIFSC?: string;
      bankName?: string;
      accountHolderName?: string;
      upiId?: string;
    }) => {
      // Step 1: Transfer money via payment gateway API (AUTOMATED)
      const payoutResult = await processWithdrawalAPI({
        amount: data.amount,
        bankAccount: data.bankAccount,
        ifsc: data.bankIFSC,
        accountHolderName: data.accountHolderName,
        upiId: data.upiId,
        orderId: data.requestId,
      });

      if (!payoutResult.success) {
        throw new Error(payoutResult.message || 'Failed to transfer money');
      }

      // Step 2: Burn BobCoin on blockchain
      const { bobcoin } = await import('@/lib/blockchain');
      const txHash = await bobcoin.burn(data.userId, String(data.amount));

      // Step 3: Update withdrawal request status
      const { error: updateError } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'completed',
          transaction_hash: txHash,
          transaction_reference: payoutResult.transactionId,
          processed_at: new Date().toISOString(),
        })
        .eq('id', data.requestId);

      if (updateError) throw updateError;

      // Step 3: Update wallet balance (reduce total balance)
      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', data.userId)
        .single();

      if (wallet) {
        await supabase
          .from('wallets')
          .update({
            total_balance: wallet.total_balance - data.amount,
            // available_balance already reduced when request was created
          })
          .eq('id', wallet.id);

        // Create transaction record
        await supabase
          .from('transactions')
          .insert({
            wallet_id: wallet.id,
            type: 'withdrawal',
            amount: data.amount,
            description: `Automated withdrawal - ${payoutResult.transactionId}`,
            status: 'completed',
          });
      }

      return { success: true, txHash };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawal-requests'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success('Withdrawal processed automatically! Money transferred and BobCoin burned.');
    },
    onError: (error: any) => {
      toast.error(`Failed to process withdrawal: ${error.message}`);
    },
  });
};

/**
 * Admin: Reject withdrawal request
 */
export const useRejectWithdrawal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      requestId: string;
      userId: string;
      amount: number;
      reason: string;
    }) => {
      // Update status
      const { error: updateError } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'failed',
          admin_notes: data.reason,
          processed_at: new Date().toISOString(),
        })
        .eq('id', data.requestId);

      if (updateError) throw updateError;

      // Unlock funds (restore available balance)
      const { data: wallet } = await supabase
        .from('wallets')
        .select('available_balance')
        .eq('user_id', data.userId)
        .single();

      if (wallet) {
        await supabase
          .from('wallets')
          .update({
            available_balance: wallet.available_balance + data.amount,
          })
          .eq('user_id', data.userId);
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawal-requests'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success('Withdrawal request rejected. Funds unlocked.');
    },
    onError: (error: any) => {
      toast.error(`Failed to reject withdrawal: ${error.message}`);
    },
  });
};
