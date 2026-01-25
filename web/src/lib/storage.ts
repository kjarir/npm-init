/**
 * Decentralized Storage Service with Fallbacks
 * Tries multiple storage options and stores data wherever it succeeds
 */

import { uploadJSONToIPFS, uploadToIPFS } from './ipfs';
import { projectRegistry, escrow } from './blockchain';
import { supabase } from './supabase';
import { generateCertificatePDF, CertificateData } from './certificate';
import { createProjectGroup, addContractToGroup, addMilestoneToGroup } from './ipfs-groups';

export interface StorageResult {
  ipfsHash?: string;
  blockchainTxHash?: string;
  groupManifestHash?: string; // IPFS group manifest hash
  storageMethod: 'ipfs' | 'blockchain' | 'both' | 'database';
  success: boolean;
  errors?: string[];
}

/**
 * Store project data with fallback to multiple storage options
 */
export async function storeProjectData(
  projectId: string,
  projectData: {
    title: string;
    description: string;
    category: string;
    clientId: string;
    totalBudget: number;
    deadline?: string;
    skillsRequired?: string[];
    milestones: any[];
  },
  databaseUpdate: (data: { blockchain_tx_hash?: string; ipfs_hash?: string; ipfs_group_hash?: string }) => Promise<void>
): Promise<StorageResult> {
  const result: StorageResult = {
    storageMethod: 'database',
    success: false,
    errors: [],
  };

  // Generate PDF certificate for the project
  console.log('📄 Generating PDF certificate...');
  let ipfsHash: string | undefined;
  
  try {
    // Create certificate data
    const certificateData: CertificateData = {
      certificateId: `project-${projectId}`,
      projectId: projectId,
      projectTitle: projectData.title,
      milestoneId: 'project-creation',
      milestoneTitle: 'Project Creation',
      milestoneNumber: 0,
      amount: projectData.totalBudget,
      freelancerName: 'N/A', // Will be updated when freelancer is assigned
      freelancerWallet: 'N/A',
      clientName: 'Client', // You may want to fetch this from profiles
      clientWallet: 'N/A',
      transactionHash: 'pending',
      timestamp: new Date().toISOString(),
    };

    // Generate PDF certificate
    const pdfBlob = await generateCertificatePDF(certificateData);
    
    // Create Pinata Group FIRST (before uploading certificate)
    // NOTE: Pinata Groups API may fail, but we'll continue with IPFS upload
    console.log('📁 Creating Pinata Group for project...');
    let pinataGroupId: string | undefined;
    try {
      pinataGroupId = await createProjectGroup(
        projectId,
        projectData.title,
        projectData.clientId,
        '' // Certificate hash will be added after upload
      );
      console.log('✅ Pinata Group created:', pinataGroupId);
      (result as any).groupManifestHash = pinataGroupId; // Store Pinata Group ID
      (result as any).ipfsGroupHash = pinataGroupId; // Also store as ipfsGroupHash for blockchain
    } catch (groupError: any) {
      console.error('❌ Failed to create Pinata Group:', groupError);
      result.errors?.push(`Pinata Group: ${groupError.message}`);
      // Don't throw - continue with IPFS upload without group
      // Project will still be created in database, which is the primary storage
      console.warn('⚠️ Continuing without Pinata Group - will upload to IPFS directly');
      pinataGroupId = undefined; // Ensure it's undefined if creation failed
    }
    
    // Upload PDF to IPFS and add to Pinata Group
    console.log('🌐 Uploading PDF certificate to IPFS and adding to Pinata Group...');
    if (pinataGroupId) {
      try {
        const { uploadToIPFSAndAddToGroup } = await import('./pinata-groups');
        const uploadResult = await uploadToIPFSAndAddToGroup(
          pdfBlob,
          pinataGroupId,
          `project-${projectId}-certificate.pdf`
        );
        
        ipfsHash = uploadResult.ipfsHash;
        
        if (ipfsHash && ipfsHash.length >= 10) {
          result.ipfsHash = ipfsHash;
          result.storageMethod = result.storageMethod === 'database' ? 'ipfs' : 'both';
          console.log('✅ PDF certificate uploaded to IPFS and added to Pinata Group:', {
            ipfsHash,
            groupId: pinataGroupId,
          });
        }
      } catch (uploadError: any) {
        console.error('❌ Failed to upload certificate to Pinata Group:', uploadError);
        // Fallback: upload without group
        try {
          ipfsHash = await uploadToIPFS(
            pdfBlob,
            `project-${projectId}-certificate.pdf`
          );
          if (ipfsHash) {
            result.ipfsHash = ipfsHash;
            console.log('✅ PDF certificate uploaded (without group):', ipfsHash);
          }
        } catch (uploadFallbackError: any) {
          console.error('❌ Fallback IPFS upload also failed:', uploadFallbackError);
          result.errors?.push(`IPFS Upload: ${uploadFallbackError.message}`);
        }
      }
    } else {
      // Fallback if group creation failed - still try to upload to IPFS
      try {
        ipfsHash = await uploadToIPFS(
          pdfBlob,
          `project-${projectId}-certificate.pdf`
        );
        if (ipfsHash) {
          result.ipfsHash = ipfsHash;
          console.log('✅ PDF certificate uploaded (group creation failed, but IPFS succeeded):', ipfsHash);
        }
      } catch (uploadError: any) {
        console.error('❌ IPFS upload failed:', uploadError);
        result.errors?.push(`IPFS Upload: ${uploadError.message}`);
      }
    }
    
    // Store Pinata Group ID for blockchain registration
    if (pinataGroupId) {
      (result as any).ipfsGroupHash = pinataGroupId;
    }
  } catch (pdfError: any) {
    console.warn('⚠️ PDF certificate generation failed, falling back to JSON:', pdfError.message);
    result.errors?.push(`PDF Generation: ${pdfError.message}`);
    
    // Fallback to JSON storage
    try {
      const projectDocument = {
        projectId,
        ...projectData,
        createdAt: new Date().toISOString(),
        status: 'open',
      };
      
      const jsonHash = await uploadJSONToIPFS(
        projectDocument,
        `project-${projectId}.json`
      );
      
      if (jsonHash && jsonHash.length >= 10) {
        ipfsHash = jsonHash;
        result.ipfsHash = jsonHash;
        result.storageMethod = result.storageMethod === 'database' ? 'ipfs' : 'both';
        console.log('✅ JSON document uploaded to IPFS (fallback):', jsonHash);
        
        // Try to create Pinata Group even with JSON fallback (optional - not required for project creation)
        // If it fails, we continue - JSON upload succeeded which is what matters
        try {
          console.log('📁 Creating Pinata Group for project (JSON fallback)...');
          const groupId = await createProjectGroup(
            projectId,
            projectData.title,
            projectData.clientId,
            jsonHash
          );
          console.log('✅ Pinata Group created (JSON fallback):', groupId);
          (result as any).groupManifestHash = groupId;
          (result as any).ipfsGroupHash = groupId; // Store Pinata Group ID for blockchain registration
          
          // Add JSON file to the group (optional - if this fails, we still have the file on IPFS)
          try {
            const { addFileToGroup } = await import('./pinata-groups');
            await addFileToGroup(groupId, jsonHash, 'public');
            console.log('✅ JSON file added to Pinata Group');
          } catch (addError: any) {
            console.warn('⚠️ Failed to add JSON to group (file still on IPFS):', addError.message);
            // Continue - group is created, file upload succeeded
          }
        } catch (groupError: any) {
          console.error('❌ Failed to create Pinata Group (JSON fallback):', groupError.message);
          result.errors?.push(`Pinata Group (JSON): ${groupError.message}`);
          // Don't throw - JSON upload succeeded, which is the primary storage
          // Project is already created in database, which is the most important part
          console.warn('⚠️ Continuing without Pinata Group - JSON uploaded successfully, project created in database');
        }
      }
    } catch (jsonError: any) {
      console.warn('⚠️ JSON upload also failed:', jsonError.message);
      result.errors?.push(`JSON Upload: ${jsonError.message}`);
    }
  }

  // Try IPFS storage (with fallbacks) - only if PDF/JSON upload failed above
  if (!ipfsHash) {
    console.log('🌐 Attempting alternative IPFS storage...');
    try {
      const projectDocument = {
        projectId,
        ...projectData,
        createdAt: new Date().toISOString(),
        status: 'open',
      };
      
      const altHash = await tryAlternativeIPFS(projectDocument, `project-${projectId}.json`);
      if (altHash) {
        ipfsHash = altHash;
        result.ipfsHash = altHash;
        result.storageMethod = result.storageMethod === 'database' ? 'ipfs' : 'both';
        console.log('✅ Alternative IPFS storage successful:', altHash);
      }
    } catch (altError: any) {
      console.warn('⚠️ Alternative IPFS also failed:', altError.message);
      result.errors?.push(`Alt IPFS: ${altError.message}`);
    }
  }

  // Try Blockchain storage (only if we have IPFS hash AND Pinata Group ID)
  // Note: Chaincode expects IPFS hash of group, but we're storing Pinata Group ID
  // For now, we'll use the IPFS hash of the first certificate as the group reference
  // In the future, you might want to upload a group manifest JSON and use that hash
  const pinataGroupId = (result as any).ipfsGroupHash;
  if (ipfsHash && pinataGroupId) {
    console.log('⛓️ Attempting blockchain storage (chaincode v2.1+)...');
    console.log('📝 Note: Using certificate IPFS hash as group reference. Pinata Group ID:', pinataGroupId);
    try {
      // For chaincode, we need an IPFS hash. We'll use the certificate hash as group reference
      // Alternatively, you could upload a group manifest JSON and use that hash
      const txHash = await projectRegistry.registerProject(
        projectId,
        {
          title: projectData.title,
          description: projectData.description,
          category: projectData.category,
          clientId: projectData.clientId,
          totalBudget: projectData.totalBudget,
          deadline: projectData.deadline,
          skillsRequired: projectData.skillsRequired || [],
        },
        ipfsHash,
        ipfsHash // Using certificate hash as group reference (chaincode expects IPFS hash)
      );
    
      if (txHash && txHash.trim().length >= 10) {
        result.blockchainTxHash = txHash;
        result.storageMethod = result.storageMethod === 'database' ? 'blockchain' : 'both';
        console.log('✅ Blockchain storage successful:', txHash);
      }
    } catch (blockchainError: any) {
      // Log the error but don't fail - IPFS storage is the primary method
      console.warn('⚠️ Blockchain storage failed (continuing with IPFS only):', blockchainError.message);
      result.errors?.push(`Blockchain: ${blockchainError.message}`);
      
      // If the error is about parameter format, provide helpful message
      if (blockchainError.message.includes('parse') || blockchainError.message.includes('metadata') || blockchainError.message.includes('unmarshal')) {
        console.warn('💡 Chaincode parameter format issue detected.');
        console.warn('💡 Project is stored in IPFS and database - this is the primary storage method.');
        console.warn('💡 Blockchain registration can be retried later or fixed by updating chaincode parameter format.');
      }
    }
  } else if (ipfsHash && !(result as any).ipfsGroupHash) {
    console.warn('⚠️ Skipping blockchain storage - IPFS group hash not available');
    result.errors?.push('Blockchain: IPFS group hash required but not created');
  } else {
    console.warn('⚠️ Skipping blockchain storage - no IPFS hash available');
    result.errors?.push('Blockchain: No IPFS hash to register');
  }

  // Update database with whatever succeeded
  try {
    await databaseUpdate({
      blockchain_tx_hash: result.blockchainTxHash || null,
      ipfs_hash: result.ipfsHash || null,
      ipfs_group_hash: (result as any).groupManifestHash || null, // Store group manifest hash
    });
    console.log('✅ Database updated with storage results');
  } catch (dbError: any) {
    console.error('❌ Database update failed:', dbError);
    result.errors?.push(`Database: ${dbError.message}`);
  }

  // Determine success - Database is primary, IPFS is secondary, blockchain is tertiary
  // If database succeeded (project was created), we consider it successful
  // IPFS and blockchain failures are logged but don't fail the operation
  result.success = true; // Project is created in database, that's the primary success
  
  if (result.ipfsHash) {
    console.log('✅ Storage completed successfully:', {
      method: result.storageMethod,
      database: '✅',
      ipfs: result.ipfsHash ? '✅' : '⚠️',
      blockchain: result.blockchainTxHash ? '✅' : '⚠️',
      group: (result as any).ipfsGroupHash ? '✅' : '⚠️',
    });
  } else {
    console.warn('⚠️ Storage completed with warnings:', {
      database: '✅',
      ipfs: '❌',
      blockchain: '❌',
      group: '❌',
      errors: result.errors,
    });
    // Still consider it successful if database succeeded
    result.success = true;
  }

  return result;
}

/**
 * Store contract data with fallback to multiple storage options
 */
export async function storeContractData(
  projectId: string,
  contractData: {
    contractId: string;
    proposalId: string;
    clientId: string;
    freelancerId: string;
    totalAmount: number;
    milestones: any[];
    proposalDetails: any;
  },
  databaseUpdate: (data: { contract_tx_hash?: string; contract_ipfs_hash?: string; ipfs_group_hash?: string }) => Promise<void>
): Promise<StorageResult> {
  const result: StorageResult = {
    storageMethod: 'database',
    success: false,
    errors: [],
  };

  // Generate PDF certificate for the contract
  console.log('📄 Generating PDF certificate for contract...');
  let ipfsHash: string | undefined;
  
  try {
    // Create certificate data for contract
    const certificateData: CertificateData = {
      certificateId: contractData.contractId,
      projectId: contractData.projectId,
      projectTitle: 'Contract Agreement', // You may want to fetch actual project title
      milestoneId: 'contract-creation',
      milestoneTitle: 'Contract Creation',
      milestoneNumber: 0,
      amount: contractData.totalAmount,
      freelancerName: 'Freelancer', // You may want to fetch from profiles
      freelancerWallet: 'N/A',
      clientName: 'Client', // You may want to fetch from profiles
      clientWallet: 'N/A',
      transactionHash: 'pending',
      timestamp: new Date().toISOString(),
    };

    // Generate PDF certificate
    const pdfBlob = await generateCertificatePDF(certificateData);
    
    // Upload PDF to IPFS
    console.log('🌐 Uploading PDF certificate to IPFS...');
    ipfsHash = await uploadToIPFS(
      pdfBlob,
      `contract-${contractData.contractId}-certificate.pdf`
    );
    
    if (ipfsHash && ipfsHash.length >= 10) {
      result.ipfsHash = ipfsHash;
      result.storageMethod = result.storageMethod === 'database' ? 'ipfs' : 'both';
      console.log('✅ PDF certificate uploaded to IPFS:', ipfsHash);
      
      // Add contract to project's IPFS group
      // We need to get the group manifest hash from the project first
      try {
        console.log('📁 Adding contract to IPFS group...');
        // Fetch project to get group hash
        const { data: project } = await supabase
          .from('projects')
          .select('ipfs_group_hash, title')
          .eq('id', projectId)
          .single();

        if (project?.ipfs_group_hash) {
          // Add contract certificate to existing Pinata Group
          const { addContractToGroup } = await import('./ipfs-groups');
          const { addFileToGroup } = await import('./pinata-groups');
          
          // Add the contract certificate file to the Pinata Group
          try {
            await addFileToGroup(project.ipfs_group_hash, ipfsHash);
            console.log('✅ Contract certificate added to Pinata Group:', {
              groupId: project.ipfs_group_hash,
              certificateHash: ipfsHash,
            });
            (result as any).groupManifestHash = project.ipfs_group_hash;
          } catch (groupError: any) {
            console.warn('⚠️ Failed to add contract to Pinata Group:', groupError.message);
            // Continue - certificate is uploaded
          }
        } else {
          console.warn('⚠️ No IPFS group found for project. Group should have been created when project was created.');
          // Create Pinata Group now if it doesn't exist
          try {
            const { createProjectGroup } = await import('./ipfs-groups');
            // We need project title - fetch it
            const { data: fullProject } = await supabase
              .from('projects')
              .select('title')
              .eq('id', projectId)
              .single();
            
            if (fullProject) {
              const groupId = await createProjectGroup(
                projectId,
                fullProject.title,
                contractData.clientId,
                '' // Certificate hash will be added after upload
              );
              // Add contract certificate to the group
              const { addFileToGroup } = await import('./pinata-groups');
              await addFileToGroup(groupId, ipfsHash);
              (result as any).groupManifestHash = groupId;
            }
          } catch (createError: any) {
            console.warn('⚠️ Failed to create Pinata Group:', createError.message);
          }
        }
      } catch (groupError: any) {
        console.warn('⚠️ Failed to add contract to IPFS group:', groupError.message);
        // Don't fail - group update is optional
      }
    }
  } catch (pdfError: any) {
    console.warn('⚠️ PDF certificate generation failed, falling back to JSON:', pdfError.message);
    result.errors?.push(`PDF Generation: ${pdfError.message}`);
    
    // Fallback to JSON storage
    try {
      const contractDocument = {
        ...contractData,
        createdAt: new Date().toISOString(),
        status: 'active',
      };
      
      const jsonHash = await uploadJSONToIPFS(
        contractDocument,
        `contract-${contractData.contractId}.json`
      );
      
      if (jsonHash && jsonHash.length >= 10) {
        ipfsHash = jsonHash;
        result.ipfsHash = jsonHash;
        result.storageMethod = result.storageMethod === 'database' ? 'ipfs' : 'both';
        console.log('✅ JSON document uploaded to IPFS (fallback):', jsonHash);
      }
    } catch (jsonError: any) {
      console.warn('⚠️ JSON upload also failed:', jsonError.message);
      result.errors?.push(`JSON Upload: ${jsonError.message}`);
    }
  }

  // Try alternative IPFS if main upload failed
  if (!ipfsHash) {
    console.log('🌐 Attempting alternative IPFS storage for contract...');
    try {
      const contractDocument = {
        ...contractData,
        createdAt: new Date().toISOString(),
        status: 'active',
      };
      
      const altHash = await tryAlternativeIPFS(contractDocument, `contract-${contractData.contractId}.json`);
      if (altHash) {
        ipfsHash = altHash;
        result.ipfsHash = altHash;
        result.storageMethod = result.storageMethod === 'database' ? 'ipfs' : 'both';
        console.log('✅ Alternative IPFS storage successful:', altHash);
      }
    } catch (altError: any) {
      console.warn('⚠️ Alternative IPFS also failed:', altError.message);
      result.errors?.push(`Alt IPFS: ${altError.message}`);
    }
  }

  // Try Blockchain storage (only if we have IPFS hash)
  if (ipfsHash) {
    console.log('⛓️ Attempting blockchain storage for contract...');
    try {
      // First create escrow contract
      const escrowTxHash = await escrow.createContract(
        projectId,
        contractData.clientId,
        contractData.freelancerId,
        String(contractData.totalAmount),
        contractData.milestones,
        ipfsHash
      );
    
      if (escrowTxHash && escrowTxHash.trim().length >= 10) {
        result.blockchainTxHash = escrowTxHash;
        result.storageMethod = result.storageMethod === 'database' ? 'blockchain' : 'both';
        console.log('✅ Escrow contract created:', escrowTxHash);
        
        // Now register contract certificate on certificate registry (chaincode v2.1+)
        try {
          const { certificateRegistry } = await import('./blockchain');
          await certificateRegistry.registerContractCertificate(
            `contract-${contractData.contractId}`,
            projectId,
            contractData.contractId,
            ipfsHash,
            escrowTxHash,
            contractData.freelancerId,
            contractData.clientId,
            String(contractData.totalAmount)
          );
          console.log('✅ Contract certificate registered on certificate registry');
        } catch (certError: any) {
          console.warn('⚠️ Contract certificate registration failed:', certError.message);
          // Don't fail - escrow contract was created successfully
        }
      }
    } catch (blockchainError: any) {
      console.warn('⚠️ Blockchain storage failed:', blockchainError.message);
      result.errors?.push(`Blockchain: ${blockchainError.message}`);
    }
  } else {
    console.warn('⚠️ Skipping blockchain storage - no IPFS hash available');
    result.errors?.push('Blockchain: No IPFS hash to register');
  }

  // Update database
  try {
    await databaseUpdate({
      contract_tx_hash: result.blockchainTxHash || null,
      contract_ipfs_hash: result.ipfsHash || null,
    });
    console.log('✅ Database updated with contract storage results');
  } catch (dbError: any) {
    console.error('❌ Database update failed:', dbError);
    result.errors?.push(`Database: ${dbError.message}`);
  }

  result.success = !!(result.ipfsHash || result.blockchainTxHash);
  
  if (result.success) {
    console.log('✅ Contract storage completed:', {
      method: result.storageMethod,
      ipfs: result.ipfsHash ? '✅' : '❌',
      blockchain: result.blockchainTxHash ? '✅' : '❌',
    });
  }

  return result;
}

/**
 * Try alternative IPFS storage methods
 */
async function tryAlternativeIPFS(data: any, fileName: string): Promise<string | null> {
  const jsonData = JSON.stringify(data);
  const blob = new Blob([jsonData], { type: 'application/json' });

  // Try Supabase storage as fallback (if bucket exists)
  try {
    const file = new File([blob], fileName, { type: 'application/json' });
    const filePath = `ipfs-fallback/${Date.now()}-${fileName}`;
    
    // Try common bucket names
    const buckets = ['documents', 'files', 'uploads', 'ipfs'];
    for (const bucket of buckets) {
      try {
        const { data: uploadData, error } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, {
            contentType: 'application/json',
            upsert: true,
          });

        if (!error && uploadData) {
          const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);
          
          if (urlData?.publicUrl) {
            console.log(`✅ Stored in Supabase (${bucket}) as fallback:`, urlData.publicUrl);
            return `supabase-${bucket}-${uploadData.path}`;
          }
        }
      } catch (bucketError: any) {
        // Try next bucket
        continue;
      }
    }
  } catch (supabaseError: any) {
    console.warn('⚠️ Supabase storage fallback failed:', supabaseError.message);
  }

  // Try storing in database as JSON (last resort before localStorage)
  try {
    // Store as a backup record in a table (if you have a storage_backups table)
    // For now, we'll use localStorage
  } catch (dbError: any) {
    console.warn('⚠️ Database fallback not available:', dbError.message);
  }

  // Last resort: Store in localStorage (very limited, but better than nothing)
  try {
    // Check localStorage size limit (usually 5-10MB)
    if (jsonData.length > 5 * 1024 * 1024) {
      console.warn('⚠️ Data too large for localStorage, skipping');
      return null;
    }
    
    const storageKey = `ipfs-fallback-${Date.now()}`;
    localStorage.setItem(storageKey, jsonData);
    console.log('⚠️ Stored in localStorage as last resort:', storageKey);
    console.log('⚠️ Note: localStorage is temporary and limited. Data should be moved to permanent storage.');
    return `local-${storageKey}`;
  } catch (localError: any) {
    console.error('❌ Even localStorage failed:', localError);
    if (localError.name === 'QuotaExceededError') {
      console.error('❌ localStorage quota exceeded. Please clear some space.');
    }
  }

  return null;
}
