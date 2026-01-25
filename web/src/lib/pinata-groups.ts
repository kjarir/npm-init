/**
 * Pinata Groups API Integration
 * 
 * Uses Pinata's native Groups feature to organize certificates:
 * - Project creation creates a Pinata Group
 * - Contract acceptance adds freelancer and contract certificate to group
 * - Milestone completions add certificates to the same group
 * - All certificates in one Pinata Group for easy rating/review
 */

import axios from 'axios';

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;
const PINATA_API_BASE = 'https://api.pinata.cloud';

export interface PinataGroup {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface PinataFile {
  id: string;
  ipfs_pin_hash: string;
  name: string;
  size: number;
  date_pinned: string;
}

/**
 * Create a Pinata Group
 * @param groupName - Name of the group
 * @param network - 'public' or 'private' (default: 'public')
 */
export async function createPinataGroup(groupName: string, network: 'public' | 'private' = 'public'): Promise<string> {
  try {
    if (!PINATA_JWT) {
      throw new Error('Pinata JWT not configured. Set VITE_PINATA_JWT in environment variables.');
    }

    // Sanitize group name (remove special characters, limit length)
    const sanitizedName = groupName
      .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special characters except spaces, hyphens, underscores
      .substring(0, 100) // Limit to 100 characters
      .trim();

    if (!sanitizedName) {
      throw new Error('Group name is required and must contain valid characters');
    }

    console.log('📁 Creating Pinata Group:', sanitizedName, 'on', network, 'network');

    // Use the correct v3 API endpoint with network parameter
    const response = await axios.post<{ 
      data: {
        id: string;
        name: string;
        public: boolean;
        created_at: string;
      }
    }>(
      `${PINATA_API_BASE}/v3/groups/${network}`,
      { name: sanitizedName },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${PINATA_JWT}`,
        },
      }
    );

    // Handle v3 API response format
    const groupId = response.data?.data?.id || response.data?.id;
    
    if (!groupId) {
      console.error('Invalid response structure:', response.data);
      throw new Error('Invalid response from Pinata Groups API - no group ID returned');
    }

    console.log('✅ Pinata Group created:', {
      groupId: groupId,
      groupName: sanitizedName,
      network,
    });

    return groupId;
  } catch (error: any) {
    console.error('❌ Error creating Pinata Group:', error);
    if (error.response) {
      console.error('Pinata API error response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
      
      // Provide more helpful error messages
      if (error.response.status === 400) {
        const errorMsg = error.response.data?.error?.message || error.response.data?.error || JSON.stringify(error.response.data);
        throw new Error(`Pinata Groups API error (400 Bad Request): ${errorMsg}. Check group name format and API credentials.`);
      } else if (error.response.status === 401) {
        throw new Error('Pinata Groups API error (401 Unauthorized): Invalid or missing JWT token. Check VITE_PINATA_JWT.');
      } else if (error.response.status === 403) {
        throw new Error('Pinata Groups API error (403 Forbidden): JWT token does not have Groups API access.');
      } else {
        throw new Error(`Pinata Groups API error (${error.response.status}): ${error.response.data?.error?.message || JSON.stringify(error.response.data)}`);
      }
    }
    throw new Error(`Failed to create Pinata Group: ${error.message}`);
  }
}

/**
 * Upload file to IPFS and add it to a Pinata Group
 */
export async function uploadToIPFSAndAddToGroup(
  file: File | Blob,
  groupId: string,
  fileName?: string
): Promise<{ ipfsHash: string; fileId: string }> {
  try {
    if (!PINATA_JWT) {
      throw new Error('Pinata JWT not configured. Set VITE_PINATA_JWT in environment variables.');
    }

    // Step 1: Upload file to IPFS
    const formData = new FormData();
    formData.append('file', file, fileName || 'file');

    const metadata = JSON.stringify({
      name: fileName || 'file',
      keyvalues: {
        timestamp: new Date().toISOString(),
        groupId: groupId,
      },
    });
    formData.append('pinataMetadata', metadata);

    const pinataOptions = JSON.stringify({
      cidVersion: 0,
    });
    formData.append('pinataOptions', pinataOptions);

    console.log('📤 Uploading file to IPFS...', { fileName, groupId });

    const uploadResponse = await axios.post<{
      IpfsHash: string;
      PinSize: number;
      Timestamp: string;
      id: string; // File ID for adding to group
    }>(
      `${PINATA_API_BASE}/pinning/pinFileToIPFS`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${PINATA_JWT}`,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    if (!uploadResponse.data || !uploadResponse.data.IpfsHash) {
      throw new Error('Invalid response from Pinata upload API');
    }

    const ipfsHash = uploadResponse.data.IpfsHash;
    const fileId = uploadResponse.data.id || uploadResponse.data.IpfsHash; // Use IPFS hash as file ID if id not provided

    console.log('✅ File uploaded to IPFS:', { ipfsHash, fileId });

    // Step 2: Add file to group (optional - file is already on IPFS)
    try {
      await addFileToGroup(groupId, fileId, 'public');
      console.log('✅ File added to Pinata Group:', { fileId, groupId });
    } catch (groupError: any) {
      console.warn('⚠️ Failed to add file to group (file still uploaded to IPFS):', groupError.message);
      // File is uploaded to IPFS, just not in group - continue
    }

    return { ipfsHash, fileId };
  } catch (error: any) {
    console.error('❌ Error uploading to IPFS:', error);
    if (error.response) {
      console.error('Pinata API error:', error.response.data);
      throw new Error(`Pinata API error: ${error.response.data?.error || error.message}`);
    }
    throw new Error(`Failed to upload to IPFS: ${error.message}`);
  }
}

/**
 * Add an existing file to a Pinata Group
 * @param groupId - Pinata Group ID
 * @param fileId - IPFS hash or file ID to add to the group
 * @param network - 'public' or 'private' (default: 'public')
 */
export async function addFileToGroup(groupId: string, fileId: string, network: 'public' | 'private' = 'public'): Promise<void> {
  try {
    if (!PINATA_JWT) {
      throw new Error('Pinata JWT not configured.');
    }

    if (!groupId || !fileId) {
      throw new Error('Group ID and File ID are required');
    }

    console.log('➕ Adding file to Pinata Group:', { fileId, groupId, network });

    // Use the correct v3 API endpoint
    const response = await axios.put(
      `${PINATA_API_BASE}/v3/groups/${network}/${groupId}/ids/${fileId}`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${PINATA_JWT}`,
        },
      }
    );

    console.log('✅ File added to group:', { fileId, groupId });
  } catch (error: any) {
    console.error('❌ Error adding file to group:', error);
    if (error.response) {
      console.error('Pinata API error response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
      
      if (error.response.status === 400) {
        const errorMsg = error.response.data?.error?.message || error.response.data?.error || JSON.stringify(error.response.data);
        throw new Error(`Pinata Groups API error (400): ${errorMsg}. Check file ID format and group ID.`);
      } else if (error.response.status === 404) {
        throw new Error(`Pinata Groups API error (404): Group or file not found. Group ID: ${groupId}, File ID: ${fileId}`);
      } else {
        throw new Error(`Pinata Groups API error (${error.response.status}): ${error.response.data?.error?.message || JSON.stringify(error.response.data)}`);
      }
    }
    throw new Error(`Failed to add file to group: ${error.message}`);
  }
}

/**
 * Get all files in a Pinata Group
 * @param groupId - Pinata Group ID
 * @param network - 'public' or 'private' (default: 'public')
 */
export async function getGroupFiles(groupId: string, network: 'public' | 'private' = 'public'): Promise<PinataFile[]> {
  try {
    if (!PINATA_JWT) {
      throw new Error('Pinata JWT not configured.');
    }

    if (!groupId) {
      throw new Error('Group ID is required');
    }

    const response = await axios.get<{ files: PinataFile[] } | { data: { files: PinataFile[] } }>(
      `${PINATA_API_BASE}/v3/groups/${network}/${groupId}/files`,
      {
        headers: {
          Authorization: `Bearer ${PINATA_JWT}`,
        },
      }
    );

    // Handle both response formats
    const files = (response.data as any).data?.files || (response.data as any).files || [];
    return files;
  } catch (error: any) {
    console.error('❌ Error getting group files:', error);
    if (error.response) {
      console.error('Pinata API error response:', {
        status: error.response.status,
        data: error.response.data,
      });
      throw new Error(`Pinata Groups API error: ${error.response.data?.error?.message || JSON.stringify(error.response.data)}`);
    }
    throw new Error(`Failed to get group files: ${error.message}`);
  }
}

/**
 * Get Pinata Group details
 * @param groupId - Pinata Group ID
 * @param network - 'public' or 'private' (default: 'public')
 */
export async function getPinataGroup(groupId: string, network: 'public' | 'private' = 'public'): Promise<PinataGroup> {
  try {
    if (!PINATA_JWT) {
      throw new Error('Pinata JWT not configured.');
    }

    if (!groupId) {
      throw new Error('Group ID is required');
    }

    // Use v3 API endpoint with network parameter
    const response = await axios.get<{ data: PinataGroup } | PinataGroup>(
      `${PINATA_API_BASE}/v3/groups/${network}/${groupId}`,
      {
        headers: {
          Authorization: `Bearer ${PINATA_JWT}`,
        },
      }
    );

    // Handle both response formats
    const group = (response.data as any).data || response.data;
    return group;
  } catch (error: any) {
    console.error('❌ Error getting Pinata Group:', error);
    if (error.response) {
      console.error('Pinata API error response:', {
        status: error.response.status,
        data: error.response.data,
      });
      throw new Error(`Pinata Groups API error: ${error.response.data?.error?.message || JSON.stringify(error.response.data)}`);
    }
    throw new Error(`Failed to get Pinata Group: ${error.message}`);
  }
}

/**
 * List all Pinata Groups
 * @param network - 'public' or 'private' (default: 'public')
 */
export async function listPinataGroups(network: 'public' | 'private' = 'public'): Promise<PinataGroup[]> {
  try {
    if (!PINATA_JWT) {
      throw new Error('Pinata JWT not configured.');
    }

    // Use v3 API endpoint with network parameter
    const response = await axios.get<{ groups: PinataGroup[] } | { data: { groups: PinataGroup[] } }>(
      `${PINATA_API_BASE}/v3/groups/${network}`,
      {
        headers: {
          Authorization: `Bearer ${PINATA_JWT}`,
        },
      }
    );

    // Handle both response formats
    const groups = (response.data as any).data?.groups || (response.data as any).groups || [];
    return groups;
  } catch (error: any) {
    console.error('❌ Error listing Pinata Groups:', error);
    if (error.response) {
      console.error('Pinata API error response:', {
        status: error.response.status,
        data: error.response.data,
      });
      throw new Error(`Pinata Groups API error: ${error.response.data?.error?.message || JSON.stringify(error.response.data)}`);
    }
    throw new Error(`Failed to list Pinata Groups: ${error.message}`);
  }
}
