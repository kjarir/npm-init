import axios from 'axios';

const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_API_SECRET = import.meta.env.VITE_PINATA_API_SECRET;
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;
const PINATA_GATEWAY = import.meta.env.VITE_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';

export interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

/**
 * Upload file to IPFS via Pinata
 */
export const uploadToIPFS = async (file: File | Blob, fileName?: string): Promise<string> => {
  try {
    if (!PINATA_JWT) {
      throw new Error('Pinata JWT not configured. Set VITE_PINATA_JWT in environment variables.');
    }
    
    const formData = new FormData();
    formData.append('file', file, fileName || 'file');

    const metadata = JSON.stringify({
      name: fileName || 'file',
      keyvalues: {
        timestamp: new Date().toISOString(),
      },
    });
    formData.append('pinataMetadata', metadata);

    const pinataOptions = JSON.stringify({
      cidVersion: 0,
    });
    formData.append('pinataOptions', pinataOptions);

    const response = await axios.post<PinataResponse>(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
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

    if (!response.data || !response.data.IpfsHash) {
      throw new Error('Invalid response from Pinata API');
    }

    return response.data.IpfsHash;
  } catch (error: any) {
    console.error('❌ Error uploading to IPFS:', error);
    if (error.response) {
      console.error('Pinata API error:', error.response.data);
      throw new Error(`Pinata API error: ${error.response.data?.error?.details || error.response.data?.error || error.message}`);
    }
    throw new Error(`Failed to upload to IPFS: ${error.message}`);
  }
};

/**
 * Upload JSON data to IPFS via Pinata
 */
export const uploadJSONToIPFS = async (data: any, fileName?: string): Promise<string> => {
  try {
    if (!PINATA_JWT) {
      throw new Error('Pinata JWT not configured. Set VITE_PINATA_JWT in environment variables.');
    }
    
    const jsonData = JSON.stringify(data);
    const blob = new Blob([jsonData], { type: 'application/json' });
    
    console.log('📤 Uploading to IPFS:', {
      fileName: fileName || 'data.json',
      size: blob.size,
      dataKeys: Object.keys(data),
    });
    
    const ipfsHash = await uploadToIPFS(blob, fileName || 'data.json');
    
    if (!ipfsHash || ipfsHash.length < 10) {
      throw new Error('Invalid IPFS hash received from Pinata');
    }
    
    console.log('✅ IPFS upload successful:', {
      hash: ipfsHash,
      url: `${PINATA_GATEWAY}${ipfsHash}`,
    });
    
    return ipfsHash;
  } catch (error: any) {
    console.error('❌ Error uploading JSON to IPFS:', error);
    throw new Error(`Failed to upload JSON to IPFS: ${error.message}`);
  }
};

/**
 * Get IPFS URL from hash
 */
export const getIPFSURL = (hash: string): string => {
  return `${PINATA_GATEWAY}${hash}`;
};

/**
 * Fetch data from IPFS
 */
export const fetchFromIPFS = async (hash: string): Promise<any> => {
  try {
    const url = getIPFSURL(hash);
    const response = await axios.get(url);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching from IPFS:', error);
    throw new Error(`Failed to fetch from IPFS: ${error.message}`);
  }
};
