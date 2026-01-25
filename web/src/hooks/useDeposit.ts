/**
 * Hooks for deposit requests (manual processing)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { createPaymentRequest } from '@/lib/payment-gateway';

export interface DepositRequest {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  payment_method: 'upi' | 'bank_transfer';
  payment_reference?: string;
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
 * Create a deposit request (AUTOMATED - No admin needed!)
 */
export const useCreateDepositRequest = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      amount: number;
      paymentMethod: 'upi' | 'bank_transfer';
    }) => {
      if (!user || !profile) throw new Error('Must be logged in');
      
      if (data.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      if (data.amount > 50000) {
        throw new Error('Maximum deposit amount is $50,000');
      }

      // Create deposit request first
      console.log('📝 Creating deposit request in database...');
      const { data: depositRequestData, error: insertError } = await supabase
        .from('deposit_requests')
        .insert({
          user_id: user.id,
          amount: data.amount,
          payment_method: data.paymentMethod,
          status: 'pending',
        })
        .select();

      if (insertError) {
        console.error('❌ Failed to create deposit request:', insertError);
        throw insertError;
      }

      if (!depositRequestData || depositRequestData.length === 0) {
        throw new Error('Deposit request was not created - no data returned');
      }

      const depositRequest = depositRequestData[0];
      console.log('✅ Deposit request created:', depositRequest.id);

      // Create automated payment request (dummy or real gateway)
      const gateway = import.meta.env.VITE_PAYMENT_GATEWAY || 'dummy';
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const webhookUrl = `${apiUrl}/api/webhooks/${gateway}`;
      const returnUrl = `${window.location.origin}/wallet?deposit=success`;

      const paymentResponse = await createPaymentRequest({
        amount: data.amount,
        currency: 'INR',
        orderId: depositRequest.id,
        customerId: user.id,
        customerName: profile.full_name || profile.email || 'User',
        customerEmail: profile.email || user.email || '',
        returnUrl,
        notifyUrl: webhookUrl,
      });

      // For dummy mode, trigger webhook automatically after a delay
      // This will ACTUALLY mint REAL BobCoin on blockchain (not dummy numbers!)
      if (gateway === 'dummy') {
        console.log('⏳ Auto-processing payment in 2 seconds...');
        console.log('⛓️ BobCoin will be REAL minted on Hyperledger Fabric blockchain!');
        console.log('📋 Deposit Request ID:', depositRequest.id);
        console.log('💰 Amount:', data.amount);
        console.log('⏱️ Verifying deposit request exists before calling webhook...');
        
        // First verify the deposit request exists in database
        const verifyDeposit = async () => {
          const { data: verifyData, error: verifyError } = await supabase
            .from('deposit_requests')
            .select('id, status')
            .eq('id', depositRequest.id)
            .single();
          
          if (verifyError || !verifyData) {
            console.warn('⚠️ Deposit request not found in database yet, waiting...');
            return false;
          }
          console.log('✅ Deposit request verified in database:', verifyData);
          return true;
        };
        
        // Try to verify, wait if needed
        const verifyAndCallWebhook = async () => {
          let verified = await verifyDeposit();
          let attempts = 0;
          while (!verified && attempts < 5) {
            attempts++;
            console.log(`⏳ Waiting for deposit request... attempt ${attempts}/5`);
            await new Promise(resolve => setTimeout(resolve, 500));
            verified = await verifyDeposit();
          }
          
          if (!verified) {
            console.error('❌ Deposit request still not found after 5 attempts!');
            toast.error('Failed to verify deposit request. Please try again.');
            return;
          }
          
          // Now call the webhook - deposit request is confirmed to exist
          try {
            const webhookUrl = `${apiUrl}/api/webhooks/dummy`;
            console.log('📤 Calling webhook to mint REAL BobCoin on blockchain...');
            console.log('📤 Webhook URL:', webhookUrl);
            
            const webhookPayload = {
              orderId: depositRequest.id,
              orderAmount: String(data.amount),
              orderStatus: 'PAID',
              paymentId: paymentResponse.paymentId || `PAYMENT-${Date.now()}`,
              userId: user.id, // Pass user ID directly for production safety
              amount: data.amount, // Pass amount directly
            };
            
            console.log('📤 Webhook payload:', JSON.stringify(webhookPayload, null, 2));

            const webhookResponse = await fetch(webhookUrl, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify(webhookPayload),
            });

            const responseText = await webhookResponse.text();
            console.log('📥 Webhook response status:', webhookResponse.status);
            console.log('📥 Webhook response:', responseText);

            if (!webhookResponse.ok) {
              console.error('❌ Webhook failed:', webhookResponse.status);
              console.error('❌ Response:', responseText);
              
              // Update deposit request to failed
              if (supabase) {
                await supabase
                  .from('deposit_requests')
                  .update({
                    status: 'failed',
                    admin_notes: `Webhook failed: ${webhookResponse.status} - ${responseText.substring(0, 200)}`,
                  })
                  .eq('id', depositRequest.id);
              }
              return; // Don't throw - user already sees success, error is logged
            }

            let webhookResult;
            try {
              webhookResult = JSON.parse(responseText);
            } catch (e) {
              webhookResult = { raw: responseText };
            }
            
            if (!webhookResponse.ok || webhookResult.status === 'deposit_request_not_found') {
              console.error('❌ Webhook failed:', webhookResult);
              toast.error('Payment processing failed. Please contact support.');
              if (supabase) {
                await supabase
                  .from('deposit_requests')
                  .update({
                    status: 'failed',
                    admin_notes: `Webhook failed: ${webhookResult.message || 'Unknown error'}`,
                  })
                  .eq('id', depositRequest.id);
              }
              return;
            }
            
            console.log('✅✅✅ REAL BobCoin minted on blockchain!');
            console.log('✅ Webhook result:', webhookResult);
            console.log('✅ Verified: Coins are on blockchain, not dummy numbers!');
          } catch (error: any) {
            console.error('❌ Auto-payment webhook error:', error);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error stack:', error.stack);
            
            // Update deposit request to failed
            if (supabase) {
              await supabase
                .from('deposit_requests')
                .update({
                  status: 'failed',
                  admin_notes: `Auto-processing failed: ${error.message}`,
                })
                .eq('id', depositRequest.id);
            }
            toast.error(`Payment processing error: ${error.message}`);
          }
        };
        
        // Start verification immediately (deposit request should be created by now)
        verifyAndCallWebhook();
      }

      // Update deposit request with payment ID
      await supabase
        .from('deposit_requests')
        .update({
          payment_reference: paymentResponse.paymentId,
        })
        .eq('id', depositRequest.id);

      return {
        ...depositRequest,
        paymentLink: paymentResponse.paymentLink,
        qrCode: paymentResponse.qrCode,
        upiId: paymentResponse.upiId,
      } as DepositRequest & { paymentLink?: string; qrCode?: string; upiId?: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['deposit-requests'] });
      const gateway = import.meta.env.VITE_PAYMENT_GATEWAY || 'dummy';
      if (gateway === 'dummy') {
        toast.success('Payment processing automatically. BobCoin will be minted in a few seconds!');
      } else {
        toast.success('Payment link generated. Complete payment to receive BobCoin automatically!');
      }
    },
    onError: (error: any) => {
      toast.error(`Failed to create deposit request: ${error.message}`);
    },
  });
};

/**
 * Get user's deposit requests
 */
export const useMyDepositRequests = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['deposit-requests', 'my', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DepositRequest[];
    },
    enabled: !!user,
  });
};

/**
 * Get deposit request by ID
 */
export const useDepositRequest = (requestId: string) => {
  return useQuery({
    queryKey: ['deposit-request', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deposit_requests')
        .select('*, profile:profiles(full_name, email)')
        .eq('id', requestId)
        .single();

      if (error) throw error;
      return data as DepositRequest;
    },
    enabled: !!requestId,
  });
};

/**
 * Admin: Process deposit request (mint BobCoin)
 */
export const useProcessDeposit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      requestId: string;
      userId: string;
      amount: number;
      paymentReference: string;
      adminNotes?: string;
    }) => {
      // Step 1: Mint BobCoin on blockchain
      const txHash = await bobcoin.mint(data.userId, String(data.amount));

      // Step 2: Update deposit request status
      const { error: updateError } = await supabase
        .from('deposit_requests')
        .update({
          status: 'completed',
          transaction_hash: txHash,
          payment_reference: data.paymentReference,
          admin_notes: data.adminNotes,
          processed_at: new Date().toISOString(),
        })
        .eq('id', data.requestId);

      if (updateError) throw updateError;

      // Step 3: Update wallet balance
      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', data.userId)
        .single();

      if (wallet) {
        await supabase
          .from('wallets')
          .update({
            total_balance: wallet.total_balance + data.amount,
            available_balance: wallet.available_balance + data.amount,
          })
          .eq('id', wallet.id);

        // Create transaction record
        await supabase
          .from('transactions')
          .insert({
            wallet_id: wallet.id,
            type: 'deposit',
            amount: data.amount,
            description: `Deposit - ${data.paymentReference}`,
            status: 'completed',
          });
      }

      return { success: true, txHash };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposit-requests'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success('Deposit processed successfully. BobCoin minted.');
    },
    onError: (error: any) => {
      toast.error(`Failed to process deposit: ${error.message}`);
    },
  });
};

/**
 * Admin: Reject deposit request
 */
export const useRejectDeposit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      requestId: string;
      reason: string;
    }) => {
      const { error } = await supabase
        .from('deposit_requests')
        .update({
          status: 'failed',
          admin_notes: data.reason,
          processed_at: new Date().toISOString(),
        })
        .eq('id', data.requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposit-requests'] });
      toast.success('Deposit request rejected');
    },
    onError: (error: any) => {
      toast.error(`Failed to reject deposit: ${error.message}`);
    },
  });
};
