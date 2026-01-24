/**
 * Hyperledger Fabric Backend API Server
 * Mobile-Friendly API for Flutter and Web Clients
 * 
 * Features:
 * - Full CORS support for mobile apps
 * - Consistent error responses
 * - Request validation
 * - Auto-reconnection
 * - Health monitoring
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');

const app = express();

// ============================================
// Configuration
// ============================================
const PORT = process.env.PORT || 3002;
const CHANNEL = process.env.HL_CHANNEL || 'mychannel';
const CHAINCODES = {
  bobcoin: process.env.HL_BOBCOIN_CHAINCODE || 'bobcoin',
  escrow: process.env.HL_ESCROW_CHAINCODE || 'escrow',
  certificate: process.env.HL_CERTIFICATE_CHAINCODE || 'certificate-registry',
};

const API_VERSION = 'v1';
const API_PREFIX = `/api/${API_VERSION}`;

// ============================================
// Middleware Setup
// ============================================

// CORS Configuration - Allow all origins for mobile apps
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow all origins for mobile app development
    // In production, you can restrict this to specific domains
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// ============================================
// Connection State
// ============================================
let gateway = null;
let network = null;
let contracts = {};
let isConnecting = false;
let connectionPromise = null;
let lastConnectionError = null;
let connectionAttempts = 0;

// ============================================
// Fabric SDK Setup
// ============================================
let Gateway, Wallets, X509WalletMixin, grpc, fabricGatewayModule;
let useFabricGateway = false;

try {
  fabricGatewayModule = require('@hyperledger/fabric-gateway');
  const grpcLib = require('@grpc/grpc-js');
  Gateway = fabricGatewayModule.Gateway;
  Wallets = fabricGatewayModule.Wallets;
  grpc = grpcLib;
  useFabricGateway = true;
  console.log('✅ Using @hyperledger/fabric-gateway');
} catch (e) {
  try {
    const fabricNetwork = require('fabric-network');
    Gateway = fabricNetwork.Gateway;
    Wallets = fabricNetwork.Wallets;
    X509WalletMixin = fabricNetwork.X509WalletMixin;
    useFabricGateway = false;
    console.log('✅ Using fabric-network (legacy)');
  } catch (e2) {
    console.error('❌ Neither @hyperledger/fabric-gateway nor fabric-network found');
    console.error('Install one: npm install @hyperledger/fabric-gateway @grpc/grpc-js');
    console.error('Or: npm install fabric-network');
    process.exit(1);
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Load connection profile with path resolution
 */
function getConnectionProfile() {
  const explorerProfilePath = path.join(__dirname, '../blockchain-explorer/connection-profile/test-network.json');
  if (fs.existsSync(explorerProfilePath)) {
    let profile = JSON.parse(fs.readFileSync(explorerProfilePath, 'utf8'));
    console.log('✅ Loaded connection profile from:', explorerProfilePath);
    
    const fabricSamplesPath = (() => {
      const possiblePaths = [
        path.join(__dirname, '../fabric-samples'),
        path.join(__dirname, '../../fabric-samples'),
        path.join(os.homedir(), 'fabric-samples'),
      ];
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) return p;
      }
      return path.join(__dirname, '../fabric-samples');
    })();
    
    const replacePath = (obj) => {
      if (typeof obj === 'string') {
        if (obj.includes('/fabric-path/')) {
          return obj.replace('/fabric-path/fabric-samples', fabricSamplesPath);
        }
        if (obj.includes('grpcs://peer0.org1.example.com')) {
          return obj.replace('grpcs://peer0.org1.example.com', 'grpcs://localhost');
        }
        if (obj.includes('grpcs://peer0.org2.example.com')) {
          return obj.replace('grpcs://peer0.org2.example.com', 'grpcs://localhost');
        }
        if (obj.includes('grpcs://orderer.example.com')) {
          return obj.replace('grpcs://orderer.example.com', 'grpcs://localhost');
        }
      } else if (typeof obj === 'object' && obj !== null) {
        if (obj.path && typeof obj.path === 'string' && obj.path.includes('/fabric-path/')) {
          obj.path = obj.path.replace('/fabric-path/fabric-samples', fabricSamplesPath);
        }
        if (obj.url && typeof obj.url === 'string') {
          if (obj.url.includes('grpcs://peer0.org1.example.com')) {
            obj.url = obj.url.replace('grpcs://peer0.org1.example.com', 'grpcs://localhost');
          }
          if (obj.url.includes('grpcs://peer0.org2.example.com')) {
            obj.url = obj.url.replace('grpcs://peer0.org2.example.com', 'grpcs://localhost');
          }
          if (obj.url.includes('grpcs://orderer.example.com')) {
            obj.url = obj.url.replace('grpcs://orderer.example.com', 'grpcs://localhost');
          }
        }
        for (const key in obj) {
          replacePath(obj[key]);
        }
      }
    };
    replacePath(profile);
    
    // Ensure orderers exist in connection profile
    if (!profile.orderers || Object.keys(profile.orderers).length === 0) {
      console.log('⚠️  Adding default orderer configuration...');
      profile.orderers = {
        'orderer.example.com': {
          url: 'grpcs://localhost:7050',
          tlsCACerts: {
            path: (() => {
              const possiblePaths = [
                path.join(fabricSamplesPath, 'test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt'),
                path.join(__dirname, '../fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt'),
                path.join(__dirname, '../../fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt'),
              ];
              for (const p of possiblePaths) {
                if (fs.existsSync(p)) return p;
              }
              return possiblePaths[0];
            })()
          }
        }
      };
    }
    
    // Ensure all orderer URLs are localhost (critical for Docker networking)
    for (const ordererName in profile.orderers) {
      if (profile.orderers[ordererName].url) {
        profile.orderers[ordererName].url = profile.orderers[ordererName].url
          .replace('orderer.example.com', 'localhost')
          .replace('peer0.org1.example.com', 'localhost')
          .replace('peer0.org2.example.com', 'localhost');
      }
    }
    
    // Ensure channel has orderers configured (critical for committers)
    if (!profile.channels) {
      profile.channels = {};
    }
    if (!profile.channels[CHANNEL]) {
      profile.channels[CHANNEL] = {};
    }
    // Add orderers to channel configuration
    if (!profile.channels[CHANNEL].orderers) {
      profile.channels[CHANNEL].orderers = Object.keys(profile.orderers);
    }
    
    // Ensure channel has peers configured
    if (!profile.channels[CHANNEL].peers) {
      profile.channels[CHANNEL].peers = {};
      // Add all available peers
      if (profile.peers) {
        for (const peerName in profile.peers) {
          profile.channels[CHANNEL].peers[peerName] = {};
        }
      }
    }
    
    return profile;
  }

  const configPath = process.env.HL_NETWORK_CONFIG;
  if (configPath && fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  // Default configuration with proper channel orderer setup
  const defaultConfig = {
    name: 'test-network',
    version: '1.0.0',
    client: {
      organization: 'Org1MSP',
      connection: {
        timeout: {
          peer: {
            endorser: '300',
          },
        },
      },
    },
    organizations: {
      Org1MSP: {
        mspid: 'Org1MSP',
        peers: ['peer0.org1.example.com'],
      },
    },
    peers: {
      'peer0.org1.example.com': {
        url: 'grpcs://localhost:7051',
        tlsCACerts: {
          path: (() => {
            const possiblePaths = [
              path.join(__dirname, '../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt'),
              path.join(__dirname, '../../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt'),
              path.join(os.homedir(), 'fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt'),
            ];
            for (const p of possiblePaths) {
              if (fs.existsSync(p)) return p;
            }
            return possiblePaths[0];
          })()
        },
        grpcOptions: {
          'ssl-target-name-override': 'peer0.org1.example.com',
          'hostnameOverride': 'peer0.org1.example.com'
        }
      },
    },
    orderers: {
      'orderer.example.com': {
        url: 'grpcs://localhost:7050',
        tlsCACerts: {
          path: (() => {
            const possiblePaths = [
              path.join(__dirname, '../fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt'),
              path.join(__dirname, '../../fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt'),
              path.join(os.homedir(), 'fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt'),
            ];
            for (const p of possiblePaths) {
              if (fs.existsSync(p)) return p;
            }
            return possiblePaths[0];
          })()
        }
      },
    },
    channels: {
      [CHANNEL]: {
        orderers: ['orderer.example.com'],  // CRITICAL: Orderers must be in channel config
        peers: {
          'peer0.org1.example.com': {}
        }
      }
    }
  };
  
  return defaultConfig;
}

/**
 * Ensure connection to Fabric network
 */
async function ensureConnected() {
  if (gateway && network) {
    return true;
  }

  if (isConnecting && connectionPromise) {
    await connectionPromise;
    return gateway !== null;
  }

  isConnecting = true;
  connectionAttempts++;
  connectionPromise = connectToFabric();
  
  try {
    await connectionPromise;
    connectionAttempts = 0;
    lastConnectionError = null;
    return gateway !== null;
  } catch (error) {
    lastConnectionError = error.message;
    console.error('❌ Auto-connection failed:', error);
    return false;
  } finally {
    isConnecting = false;
    connectionPromise = null;
  }
}

/**
 * Connect to Fabric network
 */
async function connectToFabric() {
  if (gateway) {
    return;
  }

  // Use the correct SDK based on what's available
  // Note: We're using fabric-network SDK (not @hyperledger/fabric-gateway) 
  // because it's more compatible with the connection profile format
  const fabricNetwork = require('fabric-network');
  if (!Gateway || Gateway !== fabricNetwork.Gateway) {
    Gateway = fabricNetwork.Gateway;
    Wallets = fabricNetwork.Wallets;
    X509WalletMixin = fabricNetwork.X509WalletMixin;
  }
  
  const walletPath = path.join(__dirname, 'wallet');
  
  if (!fs.existsSync(walletPath)) {
    fs.mkdirSync(walletPath, { recursive: true });
  }
  
  const wallet = await Wallets.newFileSystemWallet(walletPath);
  
  const userId = process.env.HL_USER_ID || 'appUser';
  const userExists = await wallet.get(userId);
  
  if (!userExists) {
    let adminCertPath = process.env.HL_ADMIN_CERT_PATH;
    let adminKeyPath = process.env.HL_ADMIN_KEY_DIR;
    
    if (!adminCertPath || !adminKeyPath) {
      const possiblePaths = [
        path.join(__dirname, '../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp'),
        path.join(__dirname, '../../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp'),
        path.join(os.homedir(), 'fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp'),
      ];
      
      for (const mspPath of possiblePaths) {
        const certPath = path.join(mspPath, 'signcerts/Admin@org1.example.com-cert.pem');
        const keyDir = path.join(mspPath, 'keystore');
        
        if (fs.existsSync(certPath) && fs.existsSync(keyDir)) {
          adminCertPath = certPath;
          adminKeyPath = keyDir;
          console.log(`✅ Found Admin certificate at: ${adminCertPath}`);
          break;
        }
      }
    } else {
      if (!path.isAbsolute(adminCertPath)) {
        adminCertPath = path.resolve(adminCertPath);
      }
      if (!path.isAbsolute(adminKeyPath)) {
        adminKeyPath = path.resolve(adminKeyPath);
      }
    }
    
    if (adminCertPath && adminKeyPath && fs.existsSync(adminCertPath) && fs.existsSync(adminKeyPath)) {
      const keyFiles = fs.readdirSync(adminKeyPath).filter(f => f.endsWith('_sk') || f === 'priv_sk');
      if (keyFiles.length > 0) {
        const keyPath = path.join(adminKeyPath, keyFiles[0]);
        const cert = fs.readFileSync(adminCertPath).toString();
        const key = fs.readFileSync(keyPath).toString();
        
        const identity = {
          credentials: {
            certificate: cert,
            privateKey: key
          },
          mspId: 'Org1MSP',
          type: 'X.509'
        };
        await wallet.put(userId, identity);
        console.log(`✅ Created identity for ${userId} from Admin certificate`);
      } else {
        throw new Error(`User ${userId} not found in wallet and no Admin key found in ${adminKeyPath}. Run: node enrollUser.js or set HL_ADMIN_KEY_DIR environment variable`);
      }
    } else {
      throw new Error(`User ${userId} not found in wallet and Admin cert not found. Set environment variables: HL_ADMIN_CERT_PATH and HL_ADMIN_KEY_DIR, or run: node enrollUser.js`);
    }
  }

  const ccp = getConnectionProfile();

  if (!Gateway || Gateway !== fabricNetwork.Gateway) {
    Gateway = fabricNetwork.Gateway;
  }
  gateway = new Gateway();
  
  // CRITICAL FIX: Try discovery first (auto-finds orderers), fallback to explicit config
  const connectionOptions = {
    wallet,
    identity: userId,
    discovery: { 
      enabled: true,  // ENABLE discovery - it will find orderers automatically from peers
      asLocalhost: true  // Convert Docker hostnames to localhost
    },
    eventHandlerOptions: {
      commitTimeout: 300,
      strategy: null
    }
  };
  
  // Ensure orderers are properly configured in connection profile
  if (!ccp.orderers || Object.keys(ccp.orderers).length === 0) {
    console.warn('⚠️  No orderers found in connection profile, adding default orderer...');
    ccp.orderers = {
      'orderer.example.com': {
        url: 'grpcs://localhost:7050',
        tlsCACerts: {
          path: (() => {
            const possiblePaths = [
              path.join(__dirname, '../fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt'),
              path.join(__dirname, '../../fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt'),
              path.join(os.homedir(), 'fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt'),
            ];
            for (const p of possiblePaths) {
              if (fs.existsSync(p)) return p;
            }
            return possiblePaths[0];
          })()
        }
      }
    };
  }
  
  // Ensure channel has orderers configured (CRITICAL for committers when discovery is disabled)
  if (!ccp.channels) {
    ccp.channels = {};
  }
  if (!ccp.channels[CHANNEL]) {
    ccp.channels[CHANNEL] = {};
  }
  
  // ALWAYS ensure orderers are in channel config (even with discovery enabled, this helps)
  if (!ccp.channels[CHANNEL].orderers || ccp.channels[CHANNEL].orderers.length === 0) {
    const availableOrderers = Object.keys(ccp.orderers || {});
    if (availableOrderers.length > 0) {
      ccp.channels[CHANNEL].orderers = availableOrderers;
      console.log(`✅ Configured orderers for channel ${CHANNEL}: ${ccp.channels[CHANNEL].orderers.join(', ')}`);
    } else {
      console.warn(`⚠️  No orderers found in connection profile for channel ${CHANNEL}`);
    }
  }
  
  // Ensure channel has peers configured
  if (!ccp.channels[CHANNEL].peers) {
    ccp.channels[CHANNEL].peers = {};
    if (ccp.peers) {
      for (const peerName in ccp.peers) {
        ccp.channels[CHANNEL].peers[peerName] = {};
      }
      console.log(`✅ Configured peers for channel ${CHANNEL}: ${Object.keys(ccp.channels[CHANNEL].peers).join(', ')}`);
    }
  }
  
  console.log('🔌 Connecting to Fabric network...');
  console.log(`   Channel: ${CHANNEL}`);
  console.log(`   Orderers: ${Object.keys(ccp.orderers || {}).join(', ')}`);
  console.log(`   Peers: ${Object.keys(ccp.peers || {}).join(', ')}`);
  console.log(`   Discovery: ${connectionOptions.discovery.enabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   AsLocalhost: ${connectionOptions.discovery.asLocalhost}`);
  
  // Debug: Print connection profile structure
  if (ccp.channels && ccp.channels[CHANNEL]) {
    console.log(`   Channel ${CHANNEL} config:`, JSON.stringify({
      orderers: ccp.channels[CHANNEL].orderers,
      peers: Object.keys(ccp.channels[CHANNEL].peers || {})
    }, null, 2));
  }
  
  try {
    await gateway.connect(ccp, connectionOptions);
    console.log('✅ Gateway connected successfully');
  } catch (connectError) {
    console.error('❌ Gateway connection error:', connectError);
    console.error('   Error details:', connectError.stack);
    
    // Try with discovery disabled if it failed with discovery enabled
    if (connectionOptions.discovery.enabled) {
      console.log('⚠️  Retrying with discovery disabled and explicit orderer config...');
      connectionOptions.discovery.enabled = false;
      
      // Ensure orderers are definitely in channel config
      if (ccp.channels && ccp.channels[CHANNEL]) {
        if (!ccp.channels[CHANNEL].orderers || ccp.channels[CHANNEL].orderers.length === 0) {
          ccp.channels[CHANNEL].orderers = Object.keys(ccp.orderers || {});
        }
      }
      
      try {
        await gateway.connect(ccp, connectionOptions);
        console.log('✅ Gateway connected successfully (with discovery disabled)');
      } catch (retryError) {
        throw new Error(`Failed to connect to Fabric gateway: ${retryError.message}. Original error: ${connectError.message}`);
      }
    } else {
      throw new Error(`Failed to connect to Fabric gateway: ${connectError.message}`);
    }
  }

  try {
    network = await gateway.getNetwork(CHANNEL);
  } catch (networkError) {
    console.error('❌ Network connection error:', networkError);
    throw new Error(`Failed to get network ${CHANNEL}: ${networkError.message}. Make sure channel exists and you have access.`);
  }
  
  // Verify network is connected
  if (!network) {
    throw new Error('Failed to get network from gateway');
  }
  
  try {
    contracts.bobcoin = network.getContract(CHAINCODES.bobcoin);
    contracts.escrow = network.getContract(CHAINCODES.escrow);
    contracts.certificate = network.getContract(CHAINCODES.certificate);
  } catch (contractError) {
    console.error('❌ Contract initialization error:', contractError);
    throw new Error(`Failed to initialize contracts: ${contractError.message}. Make sure chaincodes are deployed.`);
  }

  console.log('✅ Connected to Fabric network');
  console.log(`   ✅ Network: ${CHANNEL}`);
  console.log(`   ✅ Contracts initialized: ${Object.keys(contracts).join(', ')}`);
  
  // Test connection by querying a contract
  try {
    const testResult = await contracts.bobcoin.evaluateTransaction('TotalSupply');
    console.log(`   ✅ Connection verified - TotalSupply: ${testResult.toString()}`);
  } catch (testError) {
    console.warn('⚠️  Connection test query failed (this may be normal if chaincode not initialized):', testError.message);
  }
}

/**
 * Standard success response
 */
function successResponse(data, message = 'Success', statusCode = 200) {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

/**
 * Standard error response
 */
function errorResponse(error, message = 'An error occurred', statusCode = 500) {
  return {
    success: false,
    message,
    error: error.message || error,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    timestamp: new Date().toISOString()
  };
}

// ============================================
// API Routes
// ============================================

/**
 * Health Check - Mobile-friendly
 */
app.get('/health', (req, res) => {
  res.json(successResponse({
    status: 'healthy',
    connected: gateway !== null,
    channel: CHANNEL,
    chaincodes: Object.keys(contracts),
    connectionAttempts,
    lastError: lastConnectionError
  }, 'API is running'));
});

/**
 * API Info
 */
app.get(`${API_PREFIX}/info`, (req, res) => {
  res.json(successResponse({
    version: API_VERSION,
    channel: CHANNEL,
    chaincodes: CHAINCODES,
    endpoints: {
      fabric: {
        connect: `POST ${API_PREFIX}/fabric/connect`,
        disconnect: `POST ${API_PREFIX}/fabric/disconnect`,
        status: `GET ${API_PREFIX}/fabric/status`,
        invoke: `POST ${API_PREFIX}/fabric/invoke`,
        query: `POST ${API_PREFIX}/fabric/query`
      },
      bobcoin: {
        totalSupply: `GET ${API_PREFIX}/bobcoin/totalSupply`,
        balance: `GET ${API_PREFIX}/bobcoin/balance/:address`,
        tokenInfo: `GET ${API_PREFIX}/bobcoin/tokenInfo`,
        transactions: `GET ${API_PREFIX}/bobcoin/transactions`,
        mint: `POST ${API_PREFIX}/bobcoin/mint`,
        burn: `POST ${API_PREFIX}/bobcoin/burn`,
        transfer: `POST ${API_PREFIX}/bobcoin/transfer`
      }
    }
  }, 'API Information'));
});

// ============================================
// Fabric Connection Routes
// ============================================

/**
 * Connect to Fabric
 */
app.post(`${API_PREFIX}/fabric/connect`, async (req, res) => {
  try {
    if (gateway) {
      return res.json(successResponse({
        connected: true,
        channel: CHANNEL,
        chaincodes: CHAINCODES
      }, 'Already connected'));
    }

    await connectToFabric();

    res.json(successResponse({
      connected: true,
      channel: CHANNEL,
      chaincodes: CHAINCODES
    }, 'Connected to Fabric'));
  } catch (error) {
    console.error('❌ Connection error:', error);
    gateway = null;
    network = null;
    contracts = {};
    res.status(500).json(errorResponse(error, 'Failed to connect to Fabric network'));
  }
});

/**
 * Disconnect from Fabric
 */
app.post(`${API_PREFIX}/fabric/disconnect`, async (req, res) => {
  try {
    if (gateway) {
      await gateway.disconnect();
      gateway = null;
      network = null;
      contracts = {};
      console.log('✅ Disconnected from Fabric');
    }
    res.json(successResponse({ connected: false }, 'Disconnected'));
  } catch (error) {
    res.status(500).json(errorResponse(error, 'Failed to disconnect'));
  }
});

/**
 * Get connection status
 */
app.get(`${API_PREFIX}/fabric/status`, (req, res) => {
  res.json(successResponse({
    connected: gateway !== null,
    channel: CHANNEL,
    chaincodes: CHAINCODES,
    availableContracts: Object.keys(contracts),
    connectionAttempts,
    lastError: lastConnectionError
  }, gateway ? 'Connected' : 'Not connected'));
});

// ============================================
// Generic Chaincode Routes
// ============================================

/**
 * Invoke chaincode transaction
 */
app.post(`${API_PREFIX}/fabric/invoke`, async (req, res) => {
  try {
    const connected = await ensureConnected();
    if (!connected) {
      return res.status(503).json(errorResponse(
        { message: 'Fabric network not available' },
        'Failed to connect to Fabric network. Please check if Fabric is running.',
        503
      ));
    }

    const { contractName, functionName, args = [] } = req.body;
    
    // Validation
    if (!contractName || !functionName) {
      return res.status(400).json(errorResponse(
        { message: 'Missing required fields' },
        'contractName and functionName are required',
        400
      ));
    }
    
    if (!contracts[contractName]) {
      return res.status(400).json(errorResponse(
        { message: `Contract ${contractName} not available` },
        `Contract ${contractName} not initialized. Available: ${Object.keys(contracts).join(', ')}`,
        400
      ));
    }
    
    console.log(`📤 Invoking ${contractName}.${functionName} with args:`, args);
    
    const result = await contracts[contractName].submitTransaction(functionName, ...args);
    const resultString = result.toString();
    
    console.log(`✅ Transaction successful. Result: ${resultString}`);
    
    res.json(successResponse({
      transactionId: resultString,
      result: resultString,
      contractName,
      functionName
    }, 'Transaction submitted successfully'));
  } catch (error) {
    console.error('❌ Invoke error:', error);
    res.status(500).json(errorResponse(error, 'Transaction failed'));
  }
});

/**
 * Query chaincode
 */
app.post(`${API_PREFIX}/fabric/query`, async (req, res) => {
  try {
    const connected = await ensureConnected();
    if (!connected) {
      return res.status(503).json(errorResponse(
        { message: 'Fabric network not available' },
        'Failed to connect to Fabric network. Please check if Fabric is running.',
        503
      ));
    }

    const { contractName, functionName, args = [] } = req.body;
    
    // Validation
    if (!contractName || !functionName) {
      return res.status(400).json(errorResponse(
        { message: 'Missing required fields' },
        'contractName and functionName are required',
        400
      ));
    }
    
    if (!contracts[contractName]) {
      return res.status(400).json(errorResponse(
        { message: `Contract ${contractName} not available` },
        `Contract ${contractName} not initialized. Available: ${Object.keys(contracts).join(', ')}`,
        400
      ));
    }
    
    console.log(`📥 Querying ${contractName}.${functionName} with args:`, args);
    
    const result = await contracts[contractName].evaluateTransaction(functionName, ...args);
    let resultString = result.toString();
    
    // Try to parse as JSON
    let parsedResult = resultString;
    try {
      parsedResult = JSON.parse(resultString);
    } catch (e) {
      // Not JSON, keep as string
    }
    
    console.log(`✅ Query result:`, parsedResult);
    
    res.json(successResponse({
      result: parsedResult,
      raw: resultString,
      contractName,
      functionName
    }, 'Query successful'));
  } catch (error) {
    console.error('❌ Query error:', error);
    res.status(500).json(errorResponse(error, 'Query failed'));
  }
});

// ============================================
// BobCoin Specific Routes
// ============================================

/**
 * Get total supply
 * Support both /api/v1/bobcoin/totalSupply and /api/bobcoin/totalSupply for Explorer compatibility
 */
app.get(`${API_PREFIX}/bobcoin/totalSupply`, async (req, res) => {
  try {
    const connected = await ensureConnected();
    if (!connected) {
      return res.status(503).json(errorResponse(
        { message: 'Fabric network not available' },
        'Failed to connect to Fabric network',
        503
      ));
    }

    if (!contracts.bobcoin) {
      return res.status(503).json(errorResponse(
        { message: 'BobCoin contract not available' },
        'BobCoin contract not initialized',
        503
      ));
    }

    const result = await contracts.bobcoin.evaluateTransaction('TotalSupply');
    const totalSupply = result.toString();
    
    res.json(successResponse({
      totalSupply,
      formatted: formatBobCoinAmount(totalSupply),
      result: totalSupply  // Add 'result' field for Explorer compatibility
    }, 'Total supply retrieved'));
  } catch (error) {
    console.error('❌ TotalSupply query error:', error);
    res.status(500).json(errorResponse(error, 'Failed to get total supply'));
  }
});

/**
 * Get total supply (without /v1 prefix for Explorer compatibility)
 * Explorer frontend calls /api/bobcoin/totalSupply
 */
app.get('/api/bobcoin/totalSupply', async (req, res) => {
  try {
    const connected = await ensureConnected();
    if (!connected) {
      return res.status(503).json({
        success: false,
        error: 'Fabric network not available'
      });
    }

    if (!contracts.bobcoin) {
      return res.status(503).json({
        success: false,
        error: 'BobCoin contract not initialized'
      });
    }

    const result = await contracts.bobcoin.evaluateTransaction('TotalSupply');
    const totalSupply = result.toString();
    
    // Return in format expected by Explorer frontend
    res.json({
      success: true,
      result: totalSupply
    });
  } catch (error) {
    console.error('❌ TotalSupply query error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get total supply'
    });
  }
});

/**
 * Get balance for address
 */
app.get(`${API_PREFIX}/bobcoin/balance/:address`, async (req, res) => {
  try {
    const connected = await ensureConnected();
    if (!connected) {
      return res.status(503).json(errorResponse(
        { message: 'Fabric network not available' },
        'Failed to connect to Fabric network',
        503
      ));
    }

    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json(errorResponse(
        { message: 'Address is required' },
        'Address parameter is required',
        400
      ));
    }

    const result = await contracts.bobcoin.evaluateTransaction('BalanceOf', address);
    const balance = result.toString();
    
    res.json(successResponse({
      address,
      balance,
      formatted: formatBobCoinAmount(balance)
    }, 'Balance retrieved'));
  } catch (error) {
    console.error('❌ BalanceOf query error:', error);
    res.status(500).json(errorResponse(error, 'Failed to get balance'));
  }
});

/**
 * Get token info
 */
app.get(`${API_PREFIX}/bobcoin/tokenInfo`, async (req, res) => {
  try {
    const connected = await ensureConnected();
    if (!connected) {
      return res.status(503).json(errorResponse(
        { message: 'Fabric network not available' },
        'Failed to connect to Fabric network',
        503
      ));
    }

    const result = await contracts.bobcoin.evaluateTransaction('GetTokenInfo');
    const tokenInfo = JSON.parse(result.toString());
    
    res.json(successResponse({
      ...tokenInfo,
      totalSupplyFormatted: formatBobCoinAmount(tokenInfo.totalSupply)
    }, 'Token info retrieved'));
  } catch (error) {
    console.error('❌ GetTokenInfo query error:', error);
    res.status(500).json(errorResponse(error, 'Failed to get token info'));
  }
});

/**
 * Mint BobCoin
 */
app.post(`${API_PREFIX}/bobcoin/mint`, async (req, res) => {
  try {
    const connected = await ensureConnected();
    if (!connected) {
      return res.status(503).json(errorResponse(
        { message: 'Fabric network not available' },
        'Failed to connect to Fabric network',
        503
      ));
    }

    const { to, amount } = req.body;
    
    // Validation
    if (!to || !amount) {
      return res.status(400).json(errorResponse(
        { message: 'Missing required fields' },
        'to and amount are required',
        400
      ));
    }

    if (typeof amount !== 'string' || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json(errorResponse(
        { message: 'Invalid amount' },
        'amount must be a positive number string',
        400
      ));
    }

    console.log(`📤 Minting ${amount} BobCoin to ${to}`);
    
    // Verify contract is available
    if (!contracts.bobcoin) {
      throw new Error('BobCoin contract not initialized. Please check Fabric connection.');
    }
    
    // Submit transaction with better error handling
    let result;
    try {
      result = await contracts.bobcoin.submitTransaction('Mint', to, amount);
    } catch (submitError) {
      console.error('❌ Transaction submission error:', submitError);
      
      // Check for specific error types
      if (submitError.message && submitError.message.includes('target committers')) {
        throw new Error('Unable to connect to orderer. Please ensure: 1) Fabric network is running, 2) Orderer is accessible on localhost:7050, 3) TLS certificates are correct.');
      }
      if (submitError.message && submitError.message.includes('endorsement')) {
        throw new Error('Endorsement failed. Please ensure peers are running and chaincode is deployed.');
      }
      throw submitError;
    }
    
    const txId = result.toString();
    
    console.log(`✅ Mint successful. Transaction ID: ${txId}`);
    
    res.json(successResponse({
      transactionId: txId,
      to,
      amount,
      formatted: formatBobCoinAmount(amount)
    }, 'BobCoin minted successfully'));
  } catch (error) {
    console.error('❌ Mint error:', error);
    
    // Provide more helpful error messages
    let errorMessage = 'Failed to mint BobCoin';
    if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json(errorResponse(error, errorMessage));
  }
});

/**
 * Burn BobCoin
 */
app.post(`${API_PREFIX}/bobcoin/burn`, async (req, res) => {
  try {
    const connected = await ensureConnected();
    if (!connected) {
      return res.status(503).json(errorResponse(
        { message: 'Fabric network not available' },
        'Failed to connect to Fabric network',
        503
      ));
    }

    const { from, amount } = req.body;
    
    // Validation
    if (!from || !amount) {
      return res.status(400).json(errorResponse(
        { message: 'Missing required fields' },
        'from and amount are required',
        400
      ));
    }

    if (typeof amount !== 'string' || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json(errorResponse(
        { message: 'Invalid amount' },
        'amount must be a positive number string',
        400
      ));
    }

    console.log(`📤 Burning ${amount} BobCoin from ${from}`);
    
    const result = await contracts.bobcoin.submitTransaction('Burn', from, amount);
    const txId = result.toString();
    
    console.log(`✅ Burn successful. Transaction ID: ${txId}`);
    
    res.json(successResponse({
      transactionId: txId,
      from,
      amount,
      formatted: formatBobCoinAmount(amount)
    }, 'BobCoin burned successfully'));
  } catch (error) {
    console.error('❌ Burn error:', error);
    res.status(500).json(errorResponse(error, 'Failed to burn BobCoin'));
  }
});

/**
 * Transfer BobCoin
 */
app.post(`${API_PREFIX}/bobcoin/transfer`, async (req, res) => {
  try {
    const connected = await ensureConnected();
    if (!connected) {
      return res.status(503).json(errorResponse(
        { message: 'Fabric network not available' },
        'Failed to connect to Fabric network',
        503
      ));
    }

    const { from, to, amount } = req.body;
    
    // Validation
    if (!from || !to || !amount) {
      return res.status(400).json(errorResponse(
        { message: 'Missing required fields' },
        'from, to, and amount are required',
        400
      ));
    }

    if (typeof amount !== 'string' || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json(errorResponse(
        { message: 'Invalid amount' },
        'amount must be a positive number string',
        400
      ));
    }

    if (from === to) {
      return res.status(400).json(errorResponse(
        { message: 'Invalid transfer' },
        'from and to addresses cannot be the same',
        400
      ));
    }

    console.log(`📤 Transferring ${amount} BobCoin from ${from} to ${to}`);
    
    const result = await contracts.bobcoin.submitTransaction('Transfer', from, to, amount);
    const txId = result.toString();
    
    console.log(`✅ Transfer successful. Transaction ID: ${txId}`);
    
    res.json(successResponse({
      transactionId: txId,
      from,
      to,
      amount,
      formatted: formatBobCoinAmount(amount)
    }, 'BobCoin transferred successfully'));
  } catch (error) {
    console.error('❌ Transfer error:', error);
    res.status(500).json(errorResponse(error, 'Failed to transfer BobCoin'));
  }
});

/**
 * Get transactions (mint/burn/transfer history)
 * Queries Explorer API for transaction history using correct endpoint
 */
app.get(`${API_PREFIX}/bobcoin/transactions`, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    let minted = [];
    let burned = [];
    let transfers = [];
    
    // Try to get transactions from Explorer API
    try {
      const explorerUrl = process.env.EXPLORER_URL || 'http://localhost:8080';
      
      // First, get channel info to get channel_genesis_hash
      let channelGenesisHash = null;
      try {
        const channelsUrl = `${explorerUrl}/api/channels/info`;
        const client = channelsUrl.startsWith('https:') ? https : http;
        
        const channelData = await new Promise((resolve, reject) => {
          const request = client.get(channelsUrl, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
              try {
                if (response.statusCode === 200) {
                  const jsonData = JSON.parse(data);
                  if (jsonData.channels && Array.isArray(jsonData.channels)) {
                    const channel = jsonData.channels.find(c => 
                      (c.channelName || c.channel_name) === CHANNEL
                    );
                    if (channel) {
                      channelGenesisHash = channel.channel_genesis_hash || channel.channelHash || channel.hash;
                    }
                  }
                }
                resolve();
              } catch (e) {
                resolve(); // Continue without channel hash
              }
            });
          });
          request.on('error', () => resolve());
          request.setTimeout(3000, () => {
            request.destroy();
            resolve();
          });
        });
      } catch (e) {
        console.warn('⚠️  Could not get channel hash:', e.message);
      }
      
      // If we have channel hash, query transactions
      if (channelGenesisHash) {
        // Use txList endpoint: /api/txList/:channel_genesis_hash/:blocknum/:txid
        // blocknum=0 and txid=0 means get all transactions
        const txListUrl = `${explorerUrl}/api/txList/${channelGenesisHash}/0/0?page=1&size=${limit * 3}`;
        const client = txListUrl.startsWith('https:') ? https : http;
        
        await new Promise((resolve, reject) => {
          const request = client.get(txListUrl, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
              try {
                if (response.statusCode === 200) {
                  const jsonData = JSON.parse(data);
                  // Explorer returns: { status: 200, rows: { txnsData: [...] } }
                  const transactions = jsonData.rows?.txnsData || jsonData.txnsData || jsonData.transactions || [];
                  
                  if (Array.isArray(transactions)) {
                    transactions.forEach(tx => {
                      const chaincodeName = (tx.chaincodename || tx.chaincode_name || tx.chaincodeName || '').toLowerCase();
                      
                      if (chaincodeName === 'bobcoin' || chaincodeName === CHAINCODES.bobcoin.toLowerCase()) {
                        const txId = tx.txhash || tx.tx_id || tx.txId || tx.id || 'N/A';
                        const timestamp = tx.createdt || tx.createdAt || tx.timestamp || new Date().toISOString();
                        const blockNumber = tx.blockid || tx.block_id || tx.blockId || tx.blockNumber || tx.blocknum || 0;
                        
                        // Try to get function name and args from write_set or other fields
                        let functionName = '';
                        let args = [];
                        
                        // Check write_set for function name
                        if (tx.write_set) {
                          try {
                            const writeSet = typeof tx.write_set === 'string' ? JSON.parse(tx.write_set) : tx.write_set;
                            if (writeSet && writeSet.chaincode_proposal_payload) {
                              const payload = writeSet.chaincode_proposal_payload;
                              if (payload.input && payload.input.chaincode_spec) {
                                const spec = payload.input.chaincode_spec;
                                if (spec.input && spec.input.args) {
                                  args = spec.input.args.map(a => Buffer.isBuffer(a) ? a.toString() : String(a));
                                  functionName = args[0] || '';
                                }
                              }
                            }
                          } catch (e) {
                            // Ignore parse errors
                          }
                        }
                        
                        // If we have function name, categorize the transaction
                        if (functionName === 'Mint' && args.length >= 3) {
                          minted.push({
                            txId,
                            timestamp,
                            blockNumber: parseInt(blockNumber) || 0,
                            to: String(args[1] || 'N/A'),
                            amount: String(args[2] || '0'),
                            type: 'Mint'
                          });
                        } else if (functionName === 'Burn' && args.length >= 3) {
                          burned.push({
                            txId,
                            timestamp,
                            blockNumber: parseInt(blockNumber) || 0,
                            from: String(args[1] || 'N/A'),
                            amount: String(args[2] || '0'),
                            type: 'Burn'
                          });
                        } else if (functionName === 'Transfer' && args.length >= 4) {
                          transfers.push({
                            txId,
                            timestamp,
                            blockNumber: parseInt(blockNumber) || 0,
                            from: String(args[1] || 'N/A'),
                            to: String(args[2] || 'N/A'),
                            amount: String(args[3] || '0'),
                            type: 'Transfer'
                          });
                        } else if (chaincodeName === 'bobcoin') {
                          // If we can't determine type but it's a bobcoin transaction, add as generic
                          console.log(`ℹ️  Found BobCoin transaction ${txId} but couldn't determine function type`);
                        }
                      }
                    });
                  }
                }
                resolve();
              } catch (parseError) {
                console.warn('⚠️  Failed to parse Explorer txList response:', parseError.message);
                resolve(); // Don't reject, continue without Explorer data
              }
            });
          });
          
          request.on('error', (err) => {
            console.warn('⚠️  Explorer txList API request failed:', err.message);
            resolve(); // Don't reject, continue without Explorer data
          });
          
          request.setTimeout(5000, () => {
            request.destroy();
            console.warn('⚠️  Explorer txList API request timeout');
            resolve(); // Don't reject, continue without Explorer data
          });
        });
      } else {
        console.warn('⚠️  Could not get channel genesis hash, skipping Explorer query');
      }
    } catch (explorerError) {
      console.warn('⚠️  Explorer API not available:', explorerError.message);
    }
    
    // If no transactions found, log helpful message
    if (minted.length === 0 && burned.length === 0 && transfers.length === 0) {
      console.log('ℹ️  No BobCoin transactions found. Make sure:');
      console.log('   1. Explorer is running and accessible at http://localhost:8080');
      console.log('   2. BobCoin transactions (Mint/Burn/Transfer) have been executed');
      console.log('   3. Explorer has synced the blocks');
    }
    
    // Sort by block number (newest first)
    minted.sort((a, b) => (b.blockNumber || 0) - (a.blockNumber || 0));
    burned.sort((a, b) => (b.blockNumber || 0) - (a.blockNumber || 0));
    transfers.sort((a, b) => (b.blockNumber || 0) - (a.blockNumber || 0));
    
    // Format amounts
    minted = minted.map(tx => ({
      ...tx,
      formattedAmount: formatBobCoinAmount(tx.amount)
    }));
    burned = burned.map(tx => ({
      ...tx,
      formattedAmount: formatBobCoinAmount(tx.amount)
    }));
    transfers = transfers.map(tx => ({
      ...tx,
      formattedAmount: formatBobCoinAmount(tx.amount)
    }));
    
    // Calculate totals
    let totalMintedAmount = BigInt(0);
    let totalBurnedAmount = BigInt(0);
    
    try {
      totalMintedAmount = minted.reduce((sum, tx) => {
        try {
          return sum + BigInt(tx.amount || '0');
        } catch {
          return sum;
        }
      }, BigInt(0));
    } catch (e) {
      // Ignore
    }
    
    try {
      totalBurnedAmount = burned.reduce((sum, tx) => {
        try {
          return sum + BigInt(tx.amount || '0');
        } catch {
          return sum;
        }
      }, BigInt(0));
    } catch (e) {
      // Ignore
    }
    
    res.json(successResponse({
      minted: minted.slice(0, limit),
      burned: burned.slice(0, limit),
      transfers: transfers.slice(0, limit),
      totalMinted: minted.length,
      totalBurned: burned.length,
      totalTransfers: transfers.length,
      summary: {
        totalTransactions: minted.length + burned.length + transfers.length,
        totalMintedAmount: totalMintedAmount.toString(),
        totalBurnedAmount: totalBurnedAmount.toString(),
        formattedTotalMinted: formatBobCoinAmount(totalMintedAmount.toString()),
        formattedTotalBurned: formatBobCoinAmount(totalBurnedAmount.toString())
      }
    }, 'Transactions retrieved successfully'));
  } catch (error) {
    console.error('❌ GetTransactions query error:', error);
    res.status(500).json(errorResponse(error, 'Failed to get transactions'));
  }
});

/**
 * Get BobCoin transactions (without /v1 prefix for Explorer compatibility)
 * This endpoint matches what the Explorer frontend expects
 */
app.get('/api/bobcoin/transactions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    let minted = [];
    let burned = [];
    let transfers = [];
    
    // Query Fabric blocks directly to get transaction history
    try {
      const connected = await ensureConnected();
      if (connected && network) {
        console.log('📊 Querying Fabric blocks directly for BobCoin transactions...');
        
        try {
          // Use qscc (Query System Chaincode) to get block info
          const qsccContract = network.getContract('qscc');
          
          // Get current block height using GetChainInfo
          let height = 100; // Default, will try to get actual height
          try {
            const chainInfo = await qsccContract.evaluateTransaction('GetChainInfo', CHANNEL);
            if (chainInfo) {
              const info = JSON.parse(chainInfo.toString());
              height = info.height || 100;
              console.log(`📦 Current block height: ${height}`);
            }
          } catch (e) {
            console.warn('⚠️  Could not get chain info, using default height 100');
          }
          
          // Query recent blocks (last 100 blocks should cover recent transactions)
          const blocksToQuery = Math.min(100, height);
          const startBlock = Math.max(1, height - blocksToQuery);
          
          console.log(`🔍 Scanning blocks ${startBlock} to ${height} for BobCoin transactions...`);
          
          // Note: Direct block parsing requires protobuf decoding which is complex
          // We'll rely on Explorer API which already does this properly
          // Skipping direct block query for now - Explorer API is more reliable
          console.log('ℹ️  Using Explorer API for transaction history (direct block parsing skipped)');
        } catch (queryError) {
          console.warn('⚠️  Could not query Fabric blocks:', queryError.message);
        }
      }
    } catch (fabricError) {
      console.warn('⚠️  Could not query Fabric directly:', fabricError.message);
    }
    
    // Try to get transactions from Explorer API
    try {
      const explorerUrl = process.env.EXPLORER_URL || 'http://localhost:8080';
      
      // First, get channel info to get channel_genesis_hash
      let channelGenesisHash = null;
      try {
        const channelsUrl = `${explorerUrl}/api/channels/info`;
        const client = channelsUrl.startsWith('https:') ? https : http;
        
        const channelData = await new Promise((resolve, reject) => {
          const request = client.get(channelsUrl, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
              try {
                if (response.statusCode === 200) {
                  const jsonData = JSON.parse(data);
                  if (jsonData.channels && Array.isArray(jsonData.channels)) {
                    const channel = jsonData.channels.find(c => 
                      (c.channelName || c.channel_name) === CHANNEL
                    );
                    if (channel) {
                      channelGenesisHash = channel.channel_genesis_hash || channel.channelHash || channel.hash;
                    }
                  }
                }
                resolve();
              } catch (e) {
                resolve(); // Continue without channel hash
              }
            });
          });
          request.on('error', () => resolve());
          request.setTimeout(3000, () => {
            request.destroy();
            resolve();
          });
        });
      } catch (e) {
        console.warn('⚠️  Could not get channel hash:', e.message);
      }
      
      // If we have channel hash, query transactions
      if (channelGenesisHash) {
        const txListUrl = `${explorerUrl}/api/txList/${channelGenesisHash}/0/0?page=1&size=${limit * 3}`;
        const client = txListUrl.startsWith('https:') ? https : http;
        
        await new Promise((resolve, reject) => {
          const request = client.get(txListUrl, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
              try {
                if (response.statusCode === 200) {
                  const jsonData = JSON.parse(data);
                  const transactions = jsonData.rows?.txnsData || jsonData.txnsData || jsonData.transactions || [];
                  
                  if (Array.isArray(transactions)) {
                    console.log(`📊 Found ${transactions.length} total transactions from Explorer`);
                    let bobcoinTxCount = 0;
                    
                    transactions.forEach(tx => {
                      const chaincodeName = (tx.chaincodename || tx.chaincode_name || tx.chaincodeName || tx.chaincode || '').toLowerCase();
                      
                      if (chaincodeName === 'bobcoin' || chaincodeName === CHAINCODES.bobcoin.toLowerCase()) {
                        bobcoinTxCount++;
                        const txId = tx.txhash || tx.tx_id || tx.txId || tx.id || 'N/A';
                        const timestamp = tx.createdt || tx.createdAt || tx.timestamp || tx.time || new Date().toISOString();
                        const blockNumber = tx.blockid || tx.block_id || tx.blockId || tx.blockNumber || tx.blocknum || tx.block || 0;
                        
                        let functionName = '';
                        let args = [];
                        
                        // Try multiple ways to extract function name and args
                        // Method 1: From write_set
                        if (tx.write_set) {
                          try {
                            const writeSet = typeof tx.write_set === 'string' ? JSON.parse(tx.write_set) : tx.write_set;
                            if (writeSet && writeSet.chaincode_proposal_payload) {
                              const payload = writeSet.chaincode_proposal_payload;
                              if (payload.input && payload.input.chaincode_spec) {
                                const spec = payload.input.chaincode_spec;
                                if (spec.input && spec.input.args) {
                                  args = spec.input.args.map(a => Buffer.isBuffer(a) ? a.toString() : String(a));
                                  functionName = args[0] || '';
                                }
                              }
                            }
                          } catch (e) {
                            // Ignore parse errors
                          }
                        }
                        
                        // Method 2: From chaincode_input
                        if (!functionName && tx.chaincode_input) {
                          try {
                            const input = typeof tx.chaincode_input === 'string' ? JSON.parse(tx.chaincode_input) : tx.chaincode_input;
                            if (input && input.args && Array.isArray(input.args)) {
                              args = input.args.map(a => Buffer.isBuffer(a) ? a.toString() : String(a));
                              functionName = args[0] || '';
                            }
                          } catch (e) {
                            // Ignore
                          }
                        }
                        
                        // Method 3: From function_name field directly
                        if (!functionName && tx.function_name) {
                          functionName = tx.function_name;
                        }
                        
                        // Method 4: From type field (some Explorers use this)
                        if (!functionName && tx.type) {
                          functionName = tx.type;
                        }
                        
                        // Check function name (case-insensitive)
                        const funcNameLower = functionName.toLowerCase();
                        if (funcNameLower === 'mint') {
                          const to = args[1] || tx.to || 'unknown';
                          const amount = args[2] || tx.amount || '0';
                          minted.push({
                            txId,
                            timestamp,
                            blockNumber,
                            to,
                            amount,
                            functionName: 'Mint'
                          });
                        } else if (funcNameLower === 'burn') {
                          const from = args[1] || tx.from || 'unknown';
                          const amount = args[2] || tx.amount || '0';
                          burned.push({
                            txId,
                            timestamp,
                            blockNumber,
                            from,
                            amount,
                            functionName: 'Burn'
                          });
                        } else if (funcNameLower === 'transfer') {
                          const from = args[1] || tx.from || 'unknown';
                          const to = args[2] || tx.to || 'unknown';
                          const amount = args[3] || tx.amount || '0';
                          transfers.push({
                            txId,
                            timestamp,
                            blockNumber,
                            from,
                            to,
                            amount,
                            functionName: 'Transfer'
                          });
                        } else if (functionName) {
                          // Log unknown function names for debugging
                          console.log(`⚠️  Unknown BobCoin function: ${functionName} in tx ${txId}`);
                        }
                      }
                    });
                    
                    console.log(`✅ Found ${bobcoinTxCount} BobCoin transactions: ${minted.length} minted, ${burned.length} burned, ${transfers.length} transfers`);
                  }
                }
                resolve();
              } catch (e) {
                console.warn('⚠️  Error parsing transaction data:', e.message);
                resolve();
              }
            });
          });
          request.on('error', () => resolve());
          request.setTimeout(5000, () => {
            request.destroy();
            resolve();
          });
        });
      }
    } catch (e) {
      console.warn('⚠️  Could not fetch transactions from Explorer:', e.message);
    }
    
    // Sort by block number (newest first)
    minted.sort((a, b) => (b.blockNumber || 0) - (a.blockNumber || 0));
    burned.sort((a, b) => (b.blockNumber || 0) - (a.blockNumber || 0));
    transfers.sort((a, b) => (b.blockNumber || 0) - (a.blockNumber || 0));
    
    // Calculate totals
    let totalMintedAmount = BigInt(0);
    let totalBurnedAmount = BigInt(0);
    
    try {
      totalMintedAmount = minted.reduce((sum, tx) => {
        try {
          return sum + BigInt(tx.amount || '0');
        } catch {
          return sum;
        }
      }, BigInt(0));
    } catch (e) {
      // Ignore
    }
    
    try {
      totalBurnedAmount = burned.reduce((sum, tx) => {
        try {
          return sum + BigInt(tx.amount || '0');
        } catch {
          return sum;
        }
      }, BigInt(0));
    } catch (e) {
      // Ignore
    }
    
    // Return in format expected by Explorer frontend
    res.json({
      success: true,
      result: {
        minted: minted.slice(0, limit),
        burned: burned.slice(0, limit),
        totalMinted: totalMintedAmount.toString(),
        totalBurned: totalBurnedAmount.toString()
      }
    });
  } catch (error) {
    console.error('❌ GetTransactions query error:', error);
    res.status(500).json(errorResponse(error, 'Failed to get transactions'));
  }
});

// ============================================
// Helper Functions
// ============================================

/**
 * Format BobCoin amount from wei-like string to decimal
 */
function formatBobCoinAmount(amountStr) {
  if (!amountStr || amountStr === '0') return '0';
  
  try {
    // If it's already a decimal string, return as is
    if (amountStr.includes('.')) {
      return amountStr;
    }
    
    // Convert from wei-like format (18 decimals)
    const amount = BigInt(amountStr);
    const divisor = BigInt('1000000000000000000'); // 10^18
    const whole = amount / divisor;
    const remainder = amount % divisor;
    
    if (remainder === BigInt(0)) {
      return whole.toString();
    }
    
    const decimalStr = remainder.toString().padStart(18, '0');
    const trimmedDecimal = decimalStr.replace(/0+$/, '');
    
    return trimmedDecimal ? `${whole}.${trimmedDecimal}` : whole.toString();
  } catch (error) {
    return amountStr; // Return original if parsing fails
  }
}

// ============================================
// Error Handling Middleware
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json(errorResponse(
    { message: 'Endpoint not found' },
    `Route ${req.method} ${req.path} not found`,
    404
  ));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(err.status || 500).json(errorResponse(
    err,
    err.message || 'Internal server error',
    err.status || 500
  ));
});

// ============================================
// Server Startup
// ============================================

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(60));
  console.log(`🚀 Fabric API Server Started`);
  console.log('='.repeat(60));
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📡 Channel: ${CHANNEL}`);
  console.log(`📦 Chaincodes: ${JSON.stringify(CHAINCODES, null, 2)}`);
  console.log(`📱 API Version: ${API_VERSION}`);
  console.log(`🔗 API Base: ${API_PREFIX}`);
  console.log('');
  console.log('💡 Features:');
  console.log('   ✅ Auto-connect enabled');
  console.log('   ✅ CORS enabled for mobile apps');
  console.log('   ✅ Consistent error responses');
  console.log('   ✅ Request validation');
  console.log('');
  console.log('📚 API Documentation:');
  console.log(`   GET  ${API_PREFIX}/info - API information`);
  console.log(`   GET  /health - Health check`);
  console.log('');
  console.log('🔌 Fabric Connection:');
  console.log(`   POST ${API_PREFIX}/fabric/connect - Connect to Fabric`);
  console.log(`   GET  ${API_PREFIX}/fabric/status - Connection status`);
  console.log('');
  console.log('💰 BobCoin Endpoints:');
  console.log(`   GET  ${API_PREFIX}/bobcoin/totalSupply`);
  console.log(`   GET  ${API_PREFIX}/bobcoin/balance/:address`);
  console.log(`   POST ${API_PREFIX}/bobcoin/mint`);
  console.log(`   POST ${API_PREFIX}/bobcoin/transfer`);
  console.log('');
  console.log('='.repeat(60));
  console.log('✅ Server is ready to accept requests!');
  console.log('='.repeat(60));
});

// Handle server errors gracefully
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('='.repeat(60));
    console.error('❌ ERROR: Port already in use!');
    console.error('='.repeat(60));
    console.error(`Port ${PORT} is already being used by another process.`);
    console.error('');
    console.error('To fix this, run one of these commands:');
    console.error(`  lsof -ti:${PORT} | xargs kill -9`);
    console.error(`  Or find and kill the process manually`);
    console.error('');
    process.exit(1);
  } else {
    console.error('='.repeat(60));
    console.error('❌ Server Error:');
    console.error('='.repeat(60));
    console.error(err);
    console.error('');
    process.exit(1);
  }
});

// Handle process termination gracefully
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Handle server errors gracefully
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('='.repeat(60));
    console.error('❌ ERROR: Port already in use!');
    console.error('='.repeat(60));
    console.error(`Port ${PORT} is already being used by another process.`);
    console.error('');
    console.error('To fix this, run one of these commands:');
    console.error(`  lsof -ti:${PORT} | xargs kill -9`);
    console.error(`  Or find and kill the process manually`);
    console.error('');
    process.exit(1);
  } else {
    console.error('='.repeat(60));
    console.error('❌ Server Error:');
    console.error('='.repeat(60));
    console.error(err);
    console.error('');
    process.exit(1);
  }
});

// Handle process termination gracefully
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
