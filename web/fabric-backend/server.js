/**
 * Hyperledger Fabric Backend API Server
 * Connects to your localhost Fabric network
 * 
 * This uses @hyperledger/fabric-gateway (recommended) or fabric-network
 */

// Load environment variables from .env file
try {
  require('dotenv').config();
  console.log('✅ Environment variables loaded from .env');
} catch (e) {
  console.warn('⚠️ dotenv not installed. Install it: npm install dotenv');
  console.warn('   Or set environment variables manually');
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Webhook routers will be loaded later (after app setup)

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const CHANNEL = process.env.HL_CHANNEL || 'mychannel';
const CHAINCODES = {
  bobcoin: process.env.HL_BOBCOIN_CHAINCODE || 'bobcoin',
  escrow: process.env.HL_ESCROW_CHAINCODE || 'escrow',
  certificate: process.env.HL_CERTIFICATE_CHAINCODE || 'certificate-registry',
};

// Connection state
let gateway = null;
let network = null;
let contracts = {};

// Try to use fabric-network first (matches current code structure)
let Gateway, Wallets, grpc;
try {
  const fabricNetwork = require('fabric-network');
  Gateway = fabricNetwork.Gateway;
  Wallets = fabricNetwork.Wallets;
  console.log('✅ Using fabric-network');
} catch (e) {
  // Fallback to @hyperledger/fabric-gateway (newer, but requires different API)
  try {
    const fabricGateway = require('@hyperledger/fabric-gateway');
    const grpcLib = require('@grpc/grpc-js');
    // Note: @hyperledger/fabric-gateway has a different API
    // For now, we'll throw an error suggesting fabric-network
    console.error('❌ @hyperledger/fabric-gateway requires different API implementation');
    console.error('Please install fabric-network: npm install fabric-network');
    throw new Error('fabric-network is required for this implementation');
  } catch (e2) {
    console.error('❌ Neither fabric-network nor @hyperledger/fabric-gateway found');
    console.error('Install: npm install fabric-network');
    process.exit(1);
  }
}

// Helper function to find a file in multiple possible locations
function findFile(possiblePaths) {
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  return possiblePaths[0]; // Return first path as fallback (will show error if not found)
}

// Helper function to load connection profile
function getConnectionProfile() {
  // Try to load from explorer connection profile
  const explorerProfilePath = path.join(__dirname, '../blockchain-explorer/connection-profile/test-network.json');
  if (fs.existsSync(explorerProfilePath)) {
    const profile = JSON.parse(fs.readFileSync(explorerProfilePath, 'utf8'));
    console.log('✅ Loaded connection profile from:', explorerProfilePath);
    return profile;
  }

  // Try environment variable
  const configPath = process.env.HL_NETWORK_CONFIG;
  if (configPath && fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  // Try to find fabric-samples in multiple locations
  const basePaths = [
    path.join(__dirname, '../fabric-samples'),
    path.join(__dirname, '../../fabric-samples'),
    path.join(process.env.HOME || process.env.USERPROFILE || '', 'fabric-samples'),
    path.join(process.env.HOME || process.env.USERPROFILE || '', 'Desktop/fabric/fabric-samples'),
    process.env.HL_FABRIC_SAMPLES_PATH || '',
  ].filter(p => p && fs.existsSync(p));

  // Use first found base path, or default to relative path
  const fabricSamplesBase = basePaths[0] || path.join(__dirname, '../fabric-samples');
  
  if (basePaths.length > 0) {
    console.log(`✅ Found fabric-samples at: ${fabricSamplesBase}`);
  } else {
    console.warn(`⚠️  fabric-samples not found in common locations, using default: ${fabricSamplesBase}`);
  }

  // Build paths for TLS certificates
  const peerTlsPath = findFile([
    path.join(fabricSamplesBase, 'test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt'),
    path.join(__dirname, '../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt'),
  ]);

  const ordererTlsPath = findFile([
    path.join(fabricSamplesBase, 'test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt'),
    path.join(__dirname, '../fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt'),
  ]);

  // Default configuration for test-network
  return {
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
          path: peerTlsPath
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
          path: ordererTlsPath
        }
      },
    },
  };
}

// Auto-connect on startup
async function autoConnect() {
  try {
    if (gateway) {
      console.log('✅ Already connected to Fabric');
      return;
    }

    gateway = new Gateway();
    const walletPath = path.join(__dirname, 'wallet');
    
    // Create wallet directory if it doesn't exist
    if (!fs.existsSync(walletPath)) {
      fs.mkdirSync(walletPath, { recursive: true });
    }
    
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    
    const userId = process.env.HL_USER_ID || 'appUser';
    const userExists = await wallet.get(userId);
    
    if (!userExists) {
      // Try to create identity from Admin certificate
      const possiblePaths = [
        process.env.HL_ADMIN_CERT_PATH ? {
          cert: process.env.HL_ADMIN_CERT_PATH,
          keyDir: process.env.HL_ADMIN_KEY_DIR || path.dirname(process.env.HL_ADMIN_CERT_PATH).replace('/signcerts', '/keystore')
        } : null,
        {
          cert: path.join(__dirname, '../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem'),
          keyDir: path.join(__dirname, '../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore')
        },
        {
          cert: path.join(__dirname, '../../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem'),
          keyDir: path.join(__dirname, '../../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore')
        },
        {
          cert: path.join(process.env.HOME || process.env.USERPROFILE || '', 'fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem'),
          keyDir: path.join(process.env.HOME || process.env.USERPROFILE || '', 'fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore')
        },
        {
          cert: path.join(process.env.HOME || process.env.USERPROFILE || '', 'Desktop/fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem'),
          keyDir: path.join(process.env.HOME || process.env.USERPROFILE || '', 'Desktop/fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore')
        }
      ].filter(p => p !== null);

      let identityCreated = false;

      for (const paths of possiblePaths) {
        const adminCertPath = paths.cert;
        const adminKeyPath = paths.keyDir;

        if (fs.existsSync(adminCertPath) && fs.existsSync(adminKeyPath)) {
          try {
            const keyFiles = fs.readdirSync(adminKeyPath).filter(f => f.endsWith('_sk') || f === 'priv_sk' || f.endsWith('.key'));
            if (keyFiles.length > 0) {
              const keyPath = path.join(adminKeyPath, keyFiles[0]);
              const cert = fs.readFileSync(adminCertPath).toString();
              const key = fs.readFileSync(keyPath).toString();
              
              const identity = {
                credentials: {
                  certificate: cert,
                  privateKey: key,
                },
                mspId: 'Org1MSP',
                type: 'X.509',
              };
              await wallet.put(userId, identity);
              console.log(`✅ Created identity for ${userId} from Admin certificate`);
              identityCreated = true;
              break;
            }
          } catch (err) {
            continue;
          }
        }
      }

      if (!identityCreated) {
        console.warn(`⚠️  User ${userId} not found in wallet and Admin certificate not found.`);
        console.warn('   You may need to call /api/fabric/connect manually with proper credentials.');
        return;
      }
    }

    // Load connection profile
    const ccp = getConnectionProfile();

    // Connect to gateway
    await gateway.connect(ccp, {
      wallet,
      identity: userId,
      discovery: { enabled: true, asLocalhost: true },
    });

    // Get network and contracts
    network = await gateway.getNetwork(CHANNEL);
    contracts.bobcoin = network.getContract(CHAINCODES.bobcoin);
    contracts.escrow = network.getContract(CHAINCODES.escrow);
    contracts.certificate = network.getContract(CHAINCODES.certificate);

    console.log('✅ Auto-connected to Fabric network');
  } catch (error) {
    console.error('❌ Auto-connect failed:', error.message);
    console.error('   You can manually connect via POST /api/fabric/connect');
  }
}

// Connect to Fabric
app.post('/api/fabric/connect', async (req, res) => {
  try {
    if (gateway) {
      return res.json({ success: true, message: 'Already connected' });
    }

    await autoConnect();
    
    if (gateway) {
      res.json({ 
        success: true, 
        message: 'Connected to Fabric',
        channel: CHANNEL,
        chaincodes: CHAINCODES
      });
    } else {
      res.status(500).json({ error: 'Failed to connect' });
    }
  } catch (error) {
    console.error('❌ Connection error:', error);
    res.status(500).json({ 
      error: error.message, 
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
});

// Disconnect
app.post('/api/fabric/disconnect', async (req, res) => {
  try {
    if (gateway) {
      await gateway.disconnect();
      gateway = null;
      network = null;
      contracts = {};
      console.log('✅ Disconnected from Fabric');
    }
    res.json({ success: true, message: 'Disconnected' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get connection status
app.get('/api/fabric/status', (req, res) => {
  res.json({
    connected: gateway !== null,
    channel: CHANNEL,
    chaincodes: CHAINCODES,
  });
});

// Health check endpoints (for Flutter app connection testing)
app.get('/api/fabric/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    connected: gateway !== null,
    channel: CHANNEL
  });
});

app.get('/api/fabric/ping', (req, res) => {
  res.json({ 
    status: 'pong', 
    timestamp: new Date().toISOString(),
    connected: gateway !== null
  });
});

// Create Project endpoint (for Flutter app)
app.post('/api/fabric/projects/create', async (req, res) => {
  try {
    if (!gateway || !network || !contracts.certificate) {
      // Try to auto-connect
      await autoConnect();
      if (!gateway || !network || !contracts.certificate) {
        return res.status(400).json({ 
          error: 'Not connected to Fabric. Call /api/fabric/connect first.',
          hint: 'Server will attempt auto-connect on next request'
        });
      }
    }

    const { 
      projectId, 
      title, 
      description, 
      category, 
      clientId, 
      totalBudget, 
      deadline, 
      skillsRequired, 
      ipfsHash,
      channel,
      userId 
    } = req.body;

    // Validate required fields
    if (!projectId || !title || !ipfsHash) {
      return res.status(400).json({ 
        error: 'Missing required fields: projectId, title, and ipfsHash are required' 
      });
    }

    console.log(`📤 Creating project on blockchain: ${projectId}`);
    console.log(`   Title: ${title}`);
    console.log(`   Client: ${clientId}`);
    console.log(`   IPFS Hash: ${ipfsHash}`);

    // Prepare arguments for RegisterProject chaincode function
    // Args: projectId, title, description, category, clientId, totalBudget, deadline, skillsRequired (JSON), ipfsHash
    const args = [
      projectId,
      title || '',
      description || '',
      category || 'general',
      clientId || '',
      totalBudget || '0',
      deadline || '',
      skillsRequired || '[]',
      ipfsHash
    ];

    console.log(`📤 Calling RegisterProject with ${args.length} arguments`);

    // Invoke chaincode
    const result = await contracts.certificate.submitTransaction('RegisterProject', ...args);
    const txId = contracts.certificate.getTransactionID();
    const resultString = result.toString();

    console.log(`✅✅✅ Project created on blockchain! TX ID: ${txId}`);
    console.log(`⛓️ This is REAL blockchain operation on Hyperledger Fabric!`);

    res.json({ 
      success: true,
      txId: txId,
      blockNumber: 'pending', // Fabric doesn't return block number directly
      message: 'Project registered on blockchain',
      result: resultString
    });
  } catch (error) {
    console.error('❌ Create project error:', error);
    res.status(500).json({ 
      error: error.message,
      details: {
        projectId: req.body.projectId,
        title: req.body.title
      },
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
});

// Register Certificate endpoint (for Flutter app)
app.post('/api/fabric/certificates/register', async (req, res) => {
  try {
    if (!gateway || !network || !contracts.certificate) {
      // Try to auto-connect
      await autoConnect();
      if (!gateway || !network || !contracts.certificate) {
        return res.status(400).json({ 
          error: 'Not connected to Fabric. Call /api/fabric/connect first.',
          hint: 'Server will attempt auto-connect on next request'
        });
      }
    }

    const { 
      certificateId, 
      projectId, 
      milestoneId, 
      ipfsHash, 
      transactionHash, 
      freelancerId, 
      clientId, 
      amount,
      channel,
      requestUserId 
    } = req.body;

    // Validate required fields
    if (!certificateId || !ipfsHash) {
      return res.status(400).json({ 
        error: 'Missing required fields: certificateId and ipfsHash are required' 
      });
    }

    console.log(`📤 Registering certificate on blockchain: ${certificateId}`);
    console.log(`   Project: ${projectId || 'N/A'}`);
    console.log(`   IPFS Hash: ${ipfsHash}`);

    // Prepare arguments for RegisterCertificate chaincode function
    // Args: certificateId, projectId, milestoneId, ipfsHash, transactionHash, freelancerId, clientId, amount
    const args = [
      certificateId,
      projectId || '',
      milestoneId || '',
      ipfsHash,
      transactionHash || '',
      freelancerId || '',
      clientId || '',
      amount || '0'
    ];

    console.log(`📤 Calling RegisterCertificate with ${args.length} arguments`);

    // Invoke chaincode
    const result = await contracts.certificate.submitTransaction('RegisterCertificate', ...args);
    const txId = contracts.certificate.getTransactionID();
    const resultString = result.toString();

    console.log(`✅✅✅ Certificate registered on blockchain! TX ID: ${txId}`);
    console.log(`⛓️ This is REAL blockchain operation on Hyperledger Fabric!`);

    res.json({ 
      success: true,
      txId: txId,
      message: 'Certificate registered on blockchain',
      result: resultString
    });
  } catch (error) {
    console.error('❌ Register certificate error:', error);
    res.status(500).json({ 
      error: error.message,
      details: {
        certificateId: req.body.certificateId,
        projectId: req.body.projectId
      },
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
});

// Invoke chaincode (generic endpoint)
app.post('/api/fabric/invoke', async (req, res) => {
  try {
    if (!gateway || !network) {
      return res.status(400).json({ error: 'Not connected to Fabric. Call /api/fabric/connect first.' });
    }

    const { contractName, functionName, args = [] } = req.body;
    
    if (!contracts[contractName]) {
      return res.status(400).json({ error: `Contract ${contractName} not initialized. Available: ${Object.keys(contracts).join(', ')}` });
    }
    
    console.log(`📤 Invoking ${contractName}.${functionName}`);
    console.log(`📤 Args count: ${args.length}`);
    
    if (!Array.isArray(args)) {
      return res.status(400).json({ error: 'Args must be an array' });
    }
    
    const result = await contracts[contractName].submitTransaction(functionName, ...args);
    const resultString = result.toString();
    const txId = contracts[contractName].getTransactionID();
    
    console.log(`✅✅✅ REAL Blockchain transaction successful! TX ID: ${txId}`);
    console.log(`⛓️ This is REAL blockchain operation on Hyperledger Fabric!`);
    
    res.json({ 
      success: true, 
      transactionId: txId,
      result: resultString 
    });
  } catch (error) {
    console.error('❌ Invoke error:', error);
    res.status(500).json({ 
      error: error.message,
      details: {
        contractName: req.body.contractName,
        functionName: req.body.functionName,
        args: req.body.args,
        argsLength: req.body.args?.length
      },
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
});

// Query chaincode
app.post('/api/fabric/query', async (req, res) => {
  try {
    if (!gateway || !network) {
      return res.status(400).json({ error: 'Not connected to Fabric. Call /api/fabric/connect first.' });
    }

    const { contractName, functionName, args = [] } = req.body;
    
    if (!contracts[contractName]) {
      return res.status(400).json({ error: `Contract ${contractName} not initialized. Available: ${Object.keys(contracts).join(', ')}` });
    }
    
    console.log(`📥 Querying ${contractName}.${functionName} with args:`, args);
    
    const result = await contracts[contractName].evaluateTransaction(functionName, ...args);
    let resultString = result.toString();
    
    // Try to parse as JSON if possible
    let parsedResult = resultString;
    try {
      parsedResult = JSON.parse(resultString);
    } catch (e) {
      // Not JSON, keep as string
    }
    
    console.log(`✅✅✅ REAL Blockchain query result:`, parsedResult);
    console.log(`⛓️ This is REAL data from Hyperledger Fabric blockchain!`);
    
    res.json({ 
      success: true, 
      result: parsedResult,
      raw: resultString
    });
  } catch (error) {
    console.error('❌ Query error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
});

// Payment webhooks (AUTOMATED - NO ADMIN NEEDED!)
console.log('📦 Loading webhooks module...');
let webhookRouterLoaded = false;
try {
  const webhookRouter = require('./webhooks');
  
  if (webhookRouter) {
    app.use('/api/webhooks', webhookRouter);
    webhookRouterLoaded = true;
    console.log('✅✅✅ Payment webhooks enabled (REAL blockchain minting!)');
    console.log('✅ Webhook endpoint: POST /api/webhooks/dummy');
    console.log('✅ Webhook endpoint: POST /api/webhooks/cashfree');
    console.log('✅ Webhook endpoint: POST /api/webhooks/instamojo');
  }
} catch (error) {
  console.error('❌❌❌ CRITICAL: Webhooks failed to load!');
  console.error('❌ Error message:', error.message);
  console.warn('⚠️ Payment processing will NOT work until this is fixed!');
}

// Add a test route to verify webhooks are working
app.get('/api/webhooks/test', (req, res) => {
  res.json({ 
    status: 'ok', 
    webhooksLoaded: webhookRouterLoaded,
    message: webhookRouterLoaded ? 'Webhooks are loaded and ready' : 'Webhooks failed to load'
  });
});

// Automated withdrawal processing
try {
  const withdrawalRouter = require('./withdrawals');
  app.use('/api/withdrawals', withdrawalRouter);
  console.log('✅ Automated withdrawal processing enabled');
} catch (error) {
  console.warn('⚠️ Withdrawal processing not available:', error.message);
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    connected: gateway !== null 
  });
});

// Start server - IMPORTANT: Listen on 0.0.0.0 for Android emulator access!
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Fabric API server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Channel: ${CHANNEL}`);
  console.log(`📦 Chaincodes: ${JSON.stringify(CHAINCODES, null, 2)}`);
  console.log(`\n💡 Endpoints:`);
  console.log(`   POST http://localhost:${PORT}/api/fabric/projects/create`);
  console.log(`   POST http://localhost:${PORT}/api/fabric/certificates/register`);
  console.log(`   GET  http://localhost:${PORT}/api/fabric/health`);
  console.log(`   GET  http://localhost:${PORT}/api/fabric/ping`);
  console.log(`\n💡 For Android emulator, use: http://10.0.2.2:${PORT}`);
  console.log(`💡 Make sure your Fabric network is running!`);
  
  if (webhookRouterLoaded) {
    console.log(`\n✅ Payment Webhooks Available:`);
    console.log(`   POST http://localhost:${PORT}/api/webhooks/dummy`);
    console.log(`   POST http://localhost:${PORT}/api/webhooks/cashfree`);
    console.log(`   POST http://localhost:${PORT}/api/webhooks/instamojo`);
  }
  console.log(`${'='.repeat(60)}\n`);
  
  // Auto-connect on startup
  autoConnect().catch(err => {
    console.error('❌ Auto-connect failed on startup:', err.message);
  });
});
