/**
 * Hyperledger Fabric Blockchain Integration
 * 
 * Secure connection to Hyperledger Fabric network
 */

import { isConnected, connectToFabric, invokeChaincodeAPI, queryChaincodeAPI } from './fabric-connection';

/**
 * Ensure connection before operations
 */
async function ensureConnection(): Promise<void> {
  if (!isConnected()) {
    try {
      await connectToFabric();
    } catch (error: any) {
      throw new Error(`Not connected to Fabric network: ${error.message}`);
    }
  }
}

/**
 * Base function to invoke chaincode
 */
async function invokeChaincode(
  contractName: 'bobcoin' | 'escrow' | 'certificate',
  functionName: string,
  args: string[]
): Promise<string> {
  await ensureConnection();
  console.log(`🔗 Invoking ${contractName}.${functionName} with args:`, args);
  try {
    const result = await invokeChaincodeAPI(contractName, functionName, args);
    console.log(`✅ ${contractName}.${functionName} successful. Result:`, result);
    return result;
  } catch (error: any) {
    console.error(`❌ ${contractName}.${functionName} failed:`, error);
    throw error;
  }
}

/**
 * Base function to query chaincode
 */
async function queryChaincode(
  contractName: 'bobcoin' | 'escrow' | 'certificate',
  functionName: string,
  args: string[]
): Promise<string> {
  await ensureConnection();
  return await queryChaincodeAPI(contractName, functionName, args);
}

// ==================== BOBCOIN TOKEN FUNCTIONS ====================

export const bobcoin = {
  /**
   * Mint BobCoin to an address
   * Used when user deposits real money → BobCoin minted
   */
  mint: async (to: string, amount: string): Promise<string> => {
    console.log('🪙 Minting BobCoin:', { to, amount });
    return await invokeChaincode('bobcoin', 'mint', [to, amount]);
  },

  /**
   * Transfer BobCoin
   */
  transfer: async (to: string, amount: string): Promise<string> => {
    return await invokeChaincode('bobcoin', 'transfer', [to, amount]);
  },

  /**
   * Burn BobCoin (transfer to admin wallet for burning)
   * Used when user redeems BobCoin → Real money transferred
   */
  burn: async (from: string, amount: string): Promise<string> => {
    console.log('🔥 Burning BobCoin:', { from, amount });
    // Transfer FROM user TO admin wallet (which acts as burn address)
    const adminWallet = import.meta.env.VITE_ADMIN_WALLET_ID || 'admin';
    // Transfer function signature: transfer(from, to, amount)
    return await invokeChaincode('bobcoin', 'transfer', [from, adminWallet, amount]);
  },

  /**
   * Get balance of an address (REAL blockchain query - not dummy!)
   */
  balanceOf: async (address: string): Promise<string> => {
    try {
      console.log('📊 Querying REAL BobCoin balance from blockchain (Chaincode v2.1+):', address);
      const balance = await queryChaincode('bobcoin', 'balanceOf', [address]);
      // Chaincode v2.1+ returns integer string (big.Int as string)
      const balanceStr = balance || '0';
      const balanceNum = parseFloat(balanceStr);
      
      // Chaincode v2.1+ should ALWAYS return integer (big.Int)
      if (!isNaN(balanceNum)) {
        // Check if it's a float (shouldn't happen with v2.1+)
        if (balanceNum % 1 !== 0) {
          console.error('❌❌❌ ERROR: Chaincode v2.1+ returned FLOAT balance!');
          console.error('   This should NOT happen with big.Int!');
          console.error('   Raw balance:', balanceStr);
          console.error('   Float value:', balanceNum);
          console.error('   Please verify chaincode v2.1 is deployed correctly!');
          // Round to integer as fallback
          const roundedBalance = Math.round(balanceNum).toString();
          console.warn('   Using rounded integer as fallback:', roundedBalance);
          return roundedBalance;
        }
        
        // It's an integer - return as string (big.Int format)
        const balanceInt = Math.round(balanceNum);
        console.log('✅✅✅ REAL BobCoin balance from blockchain (v2.1+):', balanceInt.toString());
        return balanceInt.toString();
      }
      
      // Fallback: return as string
      console.log('✅ REAL BobCoin balance from blockchain (v2.1+):', balanceStr);
      return balanceStr;
    } catch (error: any) {
      console.error('❌ Error fetching REAL BobCoin balance from blockchain:', error);
      return '0';
    }
  },

  /**
   * Get total supply
   */
  totalSupply: async (): Promise<string> => {
    return await queryChaincode('bobcoin', 'totalSupply', []);
  },
};

// ==================== PROJECT REGISTRY FUNCTIONS ====================

export const projectRegistry = {
  /**
   * Register a project on blockchain with IPFS certificate
   * Uses RegisterProject function (chaincode v2.0+)
   */
  registerProject: async (
    projectId: string,
    projectData: {
      title: string;
      description: string;
      category: string;
      clientId: string;
      totalBudget: number;
      deadline?: string;
      skillsRequired?: string[];
    },
    ipfsHash: string,
    ipfsGroupHash: string // NEW: IPFS group hash (required in chaincode v2.1+)
  ): Promise<string> => {
    if (!projectId || !ipfsHash || !ipfsGroupHash) {
      throw new Error('Project ID, IPFS hash, and IPFS group hash are required');
    }
    
    console.log('📝 Registering project on blockchain (v2.1+):', {
      projectId,
      ipfsHash,
      ipfsGroupHash,
    });
    
    // Use RegisterProject function (10 parameters in chaincode v2.1+)
    // Chaincode expects: functionName + 10 params = 11 total args
    // Parameters: projectId, title, description, category, clientId, totalBudget, deadline, skillsRequired (JSON), ipfsHash, ipfsGroupHash
    const skillsRequiredJSON = JSON.stringify(projectData.skillsRequired || []);
    
    // Ensure all parameters are non-null strings
    // Note: The SDK automatically adds functionName as args[0], so we send 10 params
    const params = [
      projectId || '',
      projectData.title || '',
      projectData.description || '',
      projectData.category || '',
      projectData.clientId || '',
      String(projectData.totalBudget || 0),
      projectData.deadline || '',
      skillsRequiredJSON,
      ipfsHash || '',
      ipfsGroupHash || '', // 10th parameter: IPFS group hash
    ];
    
    // Validate we have all 10 parameters
    if (params.length !== 10) {
      throw new Error(`Expected 10 parameters, got ${params.length}`);
    }
    
    console.log('📝 Registering project with params:', params);
    console.log('📝 Total params count:', params.length, '(function name will be added by SDK)');
    
    const txHash = await invokeChaincode('certificate', 'registerProject', params);
    
    if (!txHash || txHash.trim().length === 0) {
      throw new Error('Empty transaction hash received from blockchain');
    }
    
    return txHash;
  },

  /**
   * Get project data from blockchain (chaincode v2.0+)
   */
  getProject: async (projectId: string): Promise<any> => {
    const result = await queryChaincode('certificate', 'getProject', [projectId]);
    return JSON.parse(result);
  },
};

// ==================== ESCROW FUNCTIONS ====================

export const escrow = {
  /**
   * Create a new project contract
   */
  createContract: async (
    projectId: string,
    clientId: string,
    freelancerId: string,
    totalAmount: string,
    milestones: any[],
    ipfsHash?: string
  ): Promise<string> => {
    if (!projectId || !clientId || !freelancerId || !totalAmount) {
      throw new Error('Missing required contract parameters');
    }
    
    const milestonesJSON = JSON.stringify(milestones);
    const args = [
      projectId,
      clientId,
      freelancerId,
      totalAmount,
      milestonesJSON,
    ];
    if (ipfsHash) {
      args.push(ipfsHash);
    }
    
    console.log('📝 Creating escrow contract:', {
      projectId,
      clientId,
      freelancerId,
      totalAmount,
      milestoneCount: milestones.length,
      hasIPFS: !!ipfsHash,
    });
    
    const txHash = await invokeChaincode('escrow', 'createContract', args);
    
    if (!txHash || txHash.trim().length === 0) {
      throw new Error('Empty transaction hash received from blockchain');
    }
    
    return txHash;
  },

  /**
   * Lock funds for a project (transfers BobCoins from client to escrow)
   */
  lockFunds: async (projectId: string, amount: string, clientId: string): Promise<string> => {
    if (!clientId) {
      throw new Error('Client ID is required to lock funds');
    }
    
    console.log('🔒 Locking BobCoins in escrow:', { projectId, amount, clientId });
    
    // First, transfer BobCoins from client to escrow contract
    // Escrow contract address is typically the project ID or a dedicated escrow address
    const escrowAddress = `escrow-${projectId}`; // Escrow address format
    
    // Transfer BobCoins to escrow
    const transferTxHash = await bobcoin.transfer(escrowAddress, amount);
    console.log('✅ BobCoins transferred to escrow:', transferTxHash);
    
    // Then lock funds in escrow contract
    const lockTxHash = await invokeChaincode('escrow', 'lockFunds', [projectId, amount]);
    console.log('✅ Funds locked in escrow contract:', lockTxHash);
    
    return lockTxHash;
  },

  /**
   * Release milestone payment
   */
  releaseMilestone: async (
    projectId: string,
    milestoneId: string,
    amount: string
  ): Promise<string> => {
    return await invokeChaincode('escrow', 'releaseMilestone', [
      projectId,
      milestoneId,
      amount,
    ]);
  },

  /**
   * Refund project (if freelancer fails)
   */
  refundProject: async (projectId: string, reason: string): Promise<string> => {
    return await invokeChaincode('escrow', 'refundProject', [projectId, reason]);
  },

  /**
   * Get contract details
   */
  getContract: async (projectId: string): Promise<any> => {
    const result = await queryChaincode('escrow', 'getContract', [projectId]);
    return JSON.parse(result);
  },

  /**
   * Get locked amount for a project
   * NOTE: If escrow chaincode doesn't have this function, use database locked_funds instead
   */
  getLockedAmount: async (projectId: string): Promise<string> => {
    try {
      // Try to get from blockchain first
      const result = await queryChaincode('escrow', 'getLockedAmount', [projectId]);
      return result || '0';
    } catch (error: any) {
      // If function doesn't exist, return 0 (will use database fallback)
      console.warn(`getLockedAmount not available in escrow chaincode, using database fallback`);
      return '0';
    }
  },
};

// ==================== CERTIFICATE REGISTRY FUNCTIONS ====================

export const certificateRegistry = {
  /**
   * Register a contract certificate on-chain (chaincode v2.1+)
   * Adds freelancer to IPFS group automatically
   */
  registerContractCertificate: async (
    certificateId: string,
    projectId: string,
    contractId: string,
    ipfsHash: string,
    transactionHash: string,
    freelancerId: string,
    clientId: string,
    amount: string
  ): Promise<string> => {
    // RegisterContractCertificate expects 8 parameters
    const params = [
      certificateId || '',
      projectId || '',
      contractId || '',
      ipfsHash || '',
      transactionHash || '',
      freelancerId || '',
      clientId || '',
      amount || '0',
    ];
    
    console.log('📝 Registering contract certificate with params:', params);
    
    return await invokeChaincode('certificate', 'registerContractCertificate', params);
  },

  /**
   * Register a milestone certificate on-chain (chaincode v2.1+)
   */
  registerMilestoneCertificate: async (
    certificateId: string,
    projectId: string,
    contractId: string,
    milestoneId: string,
    ipfsHash: string,
    transactionHash: string,
    freelancerId: string,
    clientId: string,
    amount: string
  ): Promise<string> => {
    // RegisterMilestoneCertificate expects 9 parameters
    const params = [
      certificateId || '',
      projectId || '',
      contractId || '',
      milestoneId || '',
      ipfsHash || '',
      transactionHash || '',
      freelancerId || '',
      clientId || '',
      amount || '0',
    ];
    
    console.log('📝 Registering milestone certificate with params:', params);
    
    return await invokeChaincode('certificate', 'registerMilestoneCertificate', params);
  },

  /**
   * Register a certificate on-chain (DEPRECATED - use registerContractCertificate or registerMilestoneCertificate)
   * Kept for backward compatibility
   */
  registerCertificate: async (
    certificateId: string,
    projectId: string,
    milestoneId: string,
    ipfsHash: string,
    transactionHash: string,
    freelancerId?: string,
    clientId?: string,
    amount?: string
  ): Promise<string> => {
    console.warn('⚠️ registerCertificate is deprecated. Use registerContractCertificate or registerMilestoneCertificate');
    // Fallback to milestone certificate for backward compatibility
    return await certificateRegistry.registerMilestoneCertificate(
      certificateId,
      projectId,
      '', // contractId - empty for backward compatibility
      milestoneId,
      ipfsHash,
      transactionHash,
      freelancerId || '',
      clientId || '',
      amount || '0'
    );
  },

  /**
   * Get certificate data
   */
  getCertificate: async (certificateId: string): Promise<any> => {
    const result = await queryChaincode('certificate', 'getCertificate', [certificateId]);
    return JSON.parse(result);
  },

  /**
   * Verify certificate authenticity
   */
  verifyCertificate: async (certificateId: string, ipfsHash: string): Promise<boolean> => {
    const result = await queryChaincode('certificate', 'verifyCertificate', [
      certificateId,
      ipfsHash,
    ]);
    return result === 'true';
  },

  /**
   * Get all certificates for a project
   */
  getCertificatesByProject: async (projectId: string): Promise<any[]> => {
    const result = await queryChaincode('certificate', 'getCertificatesByProject', [projectId]);
    return JSON.parse(result);
  },

  /**
   * Get IPFS group for a project (chaincode v2.1+)
   */
  getIPFSGroup: async (projectId: string): Promise<any> => {
    const result = await queryChaincode('certificate', 'getIPFSGroup', [projectId]);
    return JSON.parse(result);
  },

  /**
   * Get group members (chaincode v2.1+)
   */
  getGroupMembers: async (projectId: string): Promise<string[]> => {
    const result = await queryChaincode('certificate', 'getGroupMembers', [projectId]);
    return JSON.parse(result);
  },

  /**
   * Get all certificates in an IPFS group (for rating/review) (chaincode v2.1+)
   */
  getCertificatesByGroup: async (projectId: string): Promise<any[]> => {
    const result = await queryChaincode('certificate', 'getCertificatesByGroup', [projectId]);
    return JSON.parse(result);
  },

  /**
   * Get all certificates (chaincode v2.0+)
   */
  getAllCertificates: async (): Promise<any[]> => {
    const result = await queryChaincode('certificate', 'getAllCertificates', []);
    return JSON.parse(result);
  },

  /**
   * Update certificate status (chaincode v2.0+)
   */
  updateCertificateStatus: async (
    certificateId: string,
    status: string
  ): Promise<string> => {
    return await invokeChaincode('certificate', 'updateCertificateStatus', [
      certificateId,
      status,
    ]);
  },

  /**
   * Delete certificate (chaincode v2.0+)
   */
  deleteCertificate: async (certificateId: string): Promise<string> => {
    return await invokeChaincode('certificate', 'deleteCertificate', [certificateId]);
  },
};
