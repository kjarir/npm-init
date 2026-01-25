import { createAndRegisterCertificate, CertificateData } from '@/lib/certificate';
import { escrow, bobcoin, certificateRegistry } from '@/lib/blockchain';
import { supabase } from '@/lib/supabase';
import { addMilestoneToGroup, getProjectGroupFromHash } from '@/lib/ipfs-groups';

export interface MilestonePaymentData {
  projectId: string;
  milestoneId: string;
  amount: number;
  freelancerId: string;
  freelancerWallet: string;
  clientId: string;
  clientWallet: string;
  projectTitle: string;
  milestoneTitle: string;
  milestoneNumber: number;
  verificationScore?: number;
  deliverablesHash?: string;
}

/**
 * Process milestone payment: Release funds, transfer BobCoin, generate certificate
 */
export const processMilestonePayment = async (data: MilestonePaymentData) => {
  try {
    // Step 1: Release milestone from escrow and transfer BobCoin
    const escrowTxHash = await escrow.releaseMilestone(
      data.projectId,
      data.milestoneId,
      data.amount.toString()
    );
    
    const transferTxHash = await bobcoin.transfer(
      data.freelancerWallet,
      data.amount.toString()
    );
    
    const paymentResult = {
      escrowTxHash,
      transferTxHash,
    };

    // Step 2: Generate certificate
    const certificateId = `cert-${data.projectId}-${data.milestoneId}-${Date.now()}`;
    
    const certificateData: CertificateData = {
      certificateId,
      projectId: data.projectId,
      projectTitle: data.projectTitle,
      milestoneId: data.milestoneId,
      milestoneTitle: data.milestoneTitle,
      milestoneNumber: data.milestoneNumber,
      amount: data.amount,
      freelancerName: '', // Will be fetched from profile
      freelancerWallet: data.freelancerWallet,
      clientName: '', // Will be fetched from profile
      clientWallet: data.clientWallet,
      verificationScore: data.verificationScore,
      transactionHash: paymentResult.transferTxHash,
      timestamp: new Date().toISOString(),
      deliverablesHash: data.deliverablesHash,
    };

    // Fetch names from profiles
    const { data: freelancerProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', data.freelancerId)
      .single();

    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', data.clientId)
      .single();

    certificateData.freelancerName = freelancerProfile?.full_name || freelancerProfile?.email || 'Freelancer';
    certificateData.clientName = clientProfile?.full_name || clientProfile?.email || 'Client';

    // Generate and register certificate
    const certificateResult = await createAndRegisterCertificate(certificateData);

    // Step 3: Register milestone certificate on blockchain (chaincode v2.1+)
    // Get contract ID from project
    const { data: project } = await supabase
      .from('projects')
      .select('contract_id')
      .eq('id', data.projectId)
      .single();
    
    const contractId = project?.contract_id || data.projectId; // Fallback to projectId if no contract_id
    
    await certificateRegistry.registerMilestoneCertificate(
      certificateResult.certificateId,
      data.projectId,
      contractId,
      data.milestoneId,
      certificateResult.ipfsHash,
      paymentResult.transferTxHash,
      freelancerProfile?.wallet_address || freelancerProfile?.id || data.freelancerId,
      clientProfile?.wallet_address || clientProfile?.id || data.clientId,
      String(data.amount)
    );

    // Step 4: Add milestone certificate to project's Pinata Group
    try {
      console.log('📁 Adding milestone certificate to Pinata Group...');
      // Get project to find Pinata Group ID
      const { data: project } = await supabase
        .from('projects')
        .select('ipfs_group_hash')
        .eq('id', data.projectId)
        .single();

      if (project?.ipfs_group_hash) {
        // Add milestone certificate file to the Pinata Group
        const { addFileToGroup } = await import('./pinata-groups');
        await addFileToGroup(project.ipfs_group_hash, certificateResult.ipfsHash);
        
        console.log('✅ Milestone certificate added to Pinata Group:', {
          groupId: project.ipfs_group_hash,
          certificateHash: certificateResult.ipfsHash,
        });
      } else {
        console.warn('⚠️ No Pinata Group found for project. Milestone certificate stored but not added to group.');
      }
    } catch (groupError: any) {
      console.warn('⚠️ Failed to add milestone to Pinata Group:', groupError.message);
      // Don't fail - milestone payment still succeeded
    }

    // Step 5: Update milestone status in database
    await supabase
      .from('milestones')
      .update({
        status: 'verified',
        verified_at: new Date().toISOString(),
        verification_score: data.verificationScore,
        certificate_id: certificateResult.certificateId,
        certificate_ipfs_hash: certificateResult.ipfsHash,
        payment_transaction_hash: paymentResult.transferTxHash,
      })
      .eq('id', data.milestoneId);

    return {
      success: true,
      certificateId: certificateResult.certificateId,
      ipfsHash: certificateResult.ipfsHash,
      transactionHash: paymentResult.transferTxHash,
      certificateURL: `https://gateway.pinata.cloud/ipfs/${certificateResult.ipfsHash}`,
    };
  } catch (error: any) {
    console.error('Error processing milestone payment:', error);
    throw new Error(`Failed to process payment: ${error.message}`);
  }
};
