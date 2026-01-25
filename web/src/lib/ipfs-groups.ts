/**
 * IPFS Group Management (Using Pinata Groups)
 * 
 * Organizes certificates into Pinata Groups for projects:
 * - Project creation creates a Pinata Group
 * - Contract acceptance adds freelancer and contract certificate to group
 * - Milestone completions add certificates to the same group
 * - All certificates in one Pinata Group for easy rating/review
 */

import axios from 'axios';
import { uploadToIPFS, uploadJSONToIPFS, getIPFSURL } from './ipfs';
import { 
  createPinataGroup, 
  uploadToIPFSAndAddToGroup, 
  addFileToGroup, 
  getGroupFiles,
  getPinataGroup 
} from './pinata-groups';

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;
const PINATA_GATEWAY = import.meta.env.VITE_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';

export interface IPFSGroup {
  groupId: string; // projectId
  projectId: string;
  projectTitle: string;
  clientId: string;
  freelancerId?: string;
  createdAt: string;
  certificates: GroupCertificate[];
  contractHash?: string;
  groupManifestHash: string; // IPFS hash of this manifest
}

export interface GroupCertificate {
  certificateId: string;
  certificateType: 'project' | 'contract' | 'milestone';
  ipfsHash: string;
  milestoneId?: string;
  milestoneNumber?: number;
  uploadedAt: string;
  transactionHash?: string;
}

/**
 * Create a new Pinata Group for a project
 * Returns the Pinata Group ID (not an IPFS hash)
 */
export async function createProjectGroup(
  projectId: string,
  projectTitle: string,
  clientId: string,
  projectCertificateHash: string
): Promise<string> {
  // Create Pinata Group
  // Sanitize project title for group name
  const sanitizedTitle = projectTitle
    .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special characters
    .substring(0, 30) // Limit length
    .trim() || 'Project'; // Fallback if empty
  
  const groupName = `project-${projectId}-${sanitizedTitle}`;
  const pinataGroupId = await createPinataGroup(groupName, 'public');

  console.log('✅ Created Pinata Group:', {
    groupId: pinataGroupId,
    groupName,
    projectId,
  });

  // Note: The project certificate should already be uploaded
  // We'll add it to the group using the file ID
  // For now, we'll return the group ID - the certificate can be added later if needed
  
  return pinataGroupId;
}

/**
 * Add contract certificate to Pinata Group
 * The certificate file should be uploaded first, then added to the group
 * @param projectId - Project ID
 * @param freelancerId - Freelancer ID
 * @param contractCertificateHash - IPFS hash of the contract certificate
 * @param pinataGroupId - Pinata Group ID
 * @param transactionHash - Optional blockchain transaction hash
 * @param network - 'public' or 'private' (default: 'public')
 */
export async function addContractToGroup(
  projectId: string,
  freelancerId: string,
  contractCertificateHash: string,
  pinataGroupId: string,
  transactionHash?: string,
  network: 'public' | 'private' = 'public'
): Promise<string> {
  // Add the contract certificate file to the Pinata Group
  // Use the IPFS hash as the file ID (Pinata uses IPFS hash as file identifier)
  try {
    await addFileToGroup(pinataGroupId, contractCertificateHash, network);
    console.log('✅ Added contract certificate to Pinata Group:', {
      projectId,
      freelancerId,
      groupId: pinataGroupId,
      certificateHash: contractCertificateHash,
      network,
    });
  } catch (error: any) {
    console.warn('⚠️ Failed to add contract to group:', error.message);
    // Continue - group ID is still valid
  }

  return pinataGroupId;
}

/**
 * Add milestone certificate to Pinata Group
 * @param projectId - Project ID
 * @param milestoneId - Milestone ID
 * @param milestoneNumber - Milestone number
 * @param milestoneCertificateHash - IPFS hash of the milestone certificate
 * @param pinataGroupId - Pinata Group ID
 * @param transactionHash - Optional blockchain transaction hash
 * @param network - 'public' or 'private' (default: 'public')
 */
export async function addMilestoneToGroup(
  projectId: string,
  milestoneId: string,
  milestoneNumber: number,
  milestoneCertificateHash: string,
  pinataGroupId: string,
  transactionHash?: string,
  network: 'public' | 'private' = 'public'
): Promise<string> {
  // Add the milestone certificate file to the Pinata Group
  try {
    await addFileToGroup(pinataGroupId, milestoneCertificateHash, network);
    console.log('✅ Added milestone certificate to Pinata Group:', {
      projectId,
      milestoneId,
      milestoneNumber,
      groupId: pinataGroupId,
      certificateHash: milestoneCertificateHash,
      network,
    });
  } catch (error: any) {
    console.warn('⚠️ Failed to add milestone to group:', error.message);
    // Continue - group ID is still valid
  }

  return pinataGroupId;
}

/**
 * Get Pinata Group by ID
 * @param pinataGroupId - Pinata Group ID
 * @param network - 'public' or 'private' (default: 'public')
 */
export async function getProjectGroupFromId(pinataGroupId: string, network: 'public' | 'private' = 'public') {
  return await getPinataGroup(pinataGroupId, network);
}

/**
 * Get project group (requires Pinata Group ID from database)
 * @param projectId - Project ID (for logging)
 * @param pinataGroupId - Pinata Group ID from database
 * @param network - 'public' or 'private' (default: 'public')
 */
export async function getProjectGroup(projectId: string, pinataGroupId?: string, network: 'public' | 'private' = 'public') {
  if (!pinataGroupId) {
    throw new Error('Pinata Group ID required. Get it from projects.ipfs_group_hash in database.');
  }
  return await getPinataGroup(pinataGroupId, network);
}

/**
 * Get all certificates from a Pinata Group (for rating/review)
 * @param pinataGroupId - Pinata Group ID
 * @param network - 'public' or 'private' (default: 'public')
 */
export async function getGroupCertificates(pinataGroupId: string, network: 'public' | 'private' = 'public') {
  const { getGroupFiles } = await import('./pinata-groups');
  return await getGroupFiles(pinataGroupId, network);
}

/**
 * Get all certificates organized for rating
 * Returns all files in the Pinata Group
 * @param pinataGroupId - Pinata Group ID
 * @param network - 'public' or 'private' (default: 'public')
 */
export async function getCertificatesForRating(pinataGroupId: string, network: 'public' | 'private' = 'public'): Promise<{
  allCertificates: any[];
  groupInfo: any;
}> {
  const { getGroupFiles, getPinataGroup } = await import('./pinata-groups');
  
  const [files, groupInfo] = await Promise.all([
    getGroupFiles(pinataGroupId, network),
    getPinataGroup(pinataGroupId, network),
  ]);

  // Sort files by date (oldest first)
  const sortedFiles = files.sort((a, b) => 
    new Date(a.date_pinned).getTime() - new Date(b.date_pinned).getTime()
  );

  return {
    allCertificates: sortedFiles,
    groupInfo,
  };
}
