/**
 * Hyperledger Fabric Connection Manager (Browser-Compatible)
 * Uses backend API for actual Fabric connections
 */

interface ConnectionConfig {
  channelName: string;
  chaincodeNames: {
    bobcoin: string;
    escrow: string;
    certificate: string;
  };
  apiUrl?: string;
  userId?: string;
}

// Default configuration from environment
const defaultConfig: ConnectionConfig = {
  channelName: import.meta.env.VITE_HL_CHANNEL || 'mychannel',
  chaincodeNames: {
    bobcoin: import.meta.env.VITE_HL_BOBCOIN_CHAINCODE || 'bobcoin',
    escrow: import.meta.env.VITE_HL_ESCROW_CHAINCODE || 'escrow',
    certificate: import.meta.env.VITE_HL_CERTIFICATE_CHAINCODE || 'certificate-registry',
  },
  apiUrl: import.meta.env.VITE_HL_API_URL || 'http://localhost:3001/api/fabric',
  userId: import.meta.env.VITE_HL_USER_ID || 'appUser',
};

// Connection state
let isConnectedState: boolean = false;

/**
 * Initialize connection to Hyperledger Fabric network
 * Uses backend API for actual connection
 */
export async function connectToFabric(config: Partial<ConnectionConfig> = {}): Promise<void> {
  const finalConfig = { ...defaultConfig, ...config };

  try {
    console.log(`🔌 Connecting to Fabric API at: ${finalConfig.apiUrl}`);
    
    // Call backend API to connect
    const response = await fetch(`${finalConfig.apiUrl}/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channelName: finalConfig.channelName,
        chaincodeNames: finalConfig.chaincodeNames,
        userId: finalConfig.userId,
      }),
    });

    // Read response body once
    const responseText = await response.text();
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        if (responseText) {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        }
      } catch {
        // If response is not JSON, use text
        if (responseText) errorMessage = responseText;
      }
      throw new Error(errorMessage);
    }

    // Parse JSON response
    let result;
    try {
      if (!responseText) {
        throw new Error('Empty response from server');
      }
      result = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Invalid JSON response from server: ${responseText}`);
    }

    if (result.success !== false) {
      isConnectedState = true;
      console.log('✅ Successfully connected to Hyperledger Fabric network');
    } else {
      throw new Error(result.error || 'Connection failed');
    }
  } catch (error: any) {
    console.error('❌ Error connecting to Fabric network:', error);
    isConnectedState = false;
    
    // Provide helpful error messages
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('404')) {
      throw new Error(`Cannot connect to backend API at ${finalConfig.apiUrl}. Make sure the backend server is running on port 3001.`);
    }
    
    throw error;
  }
}

/**
 * Disconnect from Fabric network
 */
export async function disconnectFromFabric(): Promise<void> {
  if (isConnectedState) {
    try {
      const finalConfig = { ...defaultConfig };
      await fetch(`${finalConfig.apiUrl}/disconnect`, {
        method: 'POST',
      });
      isConnectedState = false;
      console.log('Disconnected from Fabric network');
    } catch (error: any) {
      console.error('Error disconnecting:', error);
    }
  }
}

/**
 * Get contract instance (for API calls)
 */
export function getContract(contractName: 'bobcoin' | 'escrow' | 'certificate'): string {
  return contractName;
}

/**
 * Check if connected to Fabric
 */
export function isConnected(): boolean {
  return isConnectedState;
}

/**
 * Invoke chaincode via API
 */
export async function invokeChaincodeAPI(
  contractName: string,
  functionName: string,
  args: string[]
): Promise<string> {
  const finalConfig = { ...defaultConfig };
  
  // Auto-connect if not connected
  if (!isConnectedState) {
    console.log('⚠️ Not connected to Fabric, attempting auto-connect...');
    try {
      await connectToFabric();
      console.log('✅ Auto-connected to Fabric');
    } catch (error: any) {
      console.error('❌ Auto-connect failed:', error);
      throw new Error(`Not connected to Fabric. ${error.message || 'Please connect first.'}`);
    }
  }
  
  try {
    const response = await fetch(`${finalConfig.apiUrl}/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contractName,
        functionName,
        args,
        channelName: finalConfig.channelName,
      }),
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        if (responseText) {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        }
      } catch {
        if (responseText) errorMessage = responseText;
      }
      throw new Error(errorMessage);
    }

    const result = JSON.parse(responseText);
    if (!result.success) {
      throw new Error(result.error || 'Transaction failed');
    }
    
    return result.transactionId || result.result || '';
  } catch (error: any) {
    if (error.message.includes('Failed to fetch')) {
      throw new Error(`Cannot connect to backend API. Is the server running at ${finalConfig.apiUrl}?`);
    }
    throw error;
  }
}

/**
 * Query chaincode via API
 */
export async function queryChaincodeAPI(
  contractName: string,
  functionName: string,
  args: string[]
): Promise<string> {
  const finalConfig = { ...defaultConfig };
  
  // Auto-connect if not connected
  if (!isConnectedState) {
    console.log('⚠️ Not connected to Fabric, attempting auto-connect...');
    try {
      await connectToFabric();
      console.log('✅ Auto-connected to Fabric');
    } catch (error: any) {
      console.error('❌ Auto-connect failed:', error);
      throw new Error(`Not connected to Fabric. ${error.message || 'Please connect first.'}`);
    }
  }
  
  try {
    const response = await fetch(`${finalConfig.apiUrl}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contractName,
        functionName,
        args,
        channelName: finalConfig.channelName,
      }),
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        if (responseText) {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        }
      } catch {
        if (responseText) errorMessage = responseText;
      }
      throw new Error(errorMessage);
    }

    const result = JSON.parse(responseText);
    if (!result.success) {
      throw new Error(result.error || 'Query failed');
    }
    
    return result.result || '';
  } catch (error: any) {
    if (error.message.includes('Failed to fetch')) {
      throw new Error(`Cannot connect to backend API. Is the server running at ${finalConfig.apiUrl}?`);
    }
    throw error;
  }
}
