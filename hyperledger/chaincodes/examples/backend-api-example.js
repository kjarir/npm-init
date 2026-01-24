// Backend API Example (Node.js/Express)
// This is what your backend should look like to interact with Fabric

const express = require('express');
const { Gateway, Wallets } = require('@hyperledger/fabric-gateway');
const grpc = require('@grpc/grpc-js');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// Configuration
const CHANNEL_NAME = 'mychannel';
const CHAINCODE_NAMES = {
  BOBCOIN: 'bobcoin',
  ESCROW: 'escrow',
  CERTIFICATE: 'certificate-registry'
};

let gateway;
let network;

// Initialize Fabric connection
async function initFabric() {
  // Load wallet
  const walletPath = path.join(process.cwd(), 'wallet');
  const wallet = await Wallets.newFileSystemWallet(walletPath);
  
  // Check if identity exists
  const identity = await wallet.get('appUser');
  if (!identity) {
    throw new Error('Identity "appUser" not found in wallet');
  }
  
  // Create gRPC connection
  const peerTlsCert = fs.readFileSync(
    '../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt'
  );
  
  const peerEndpoint = 'localhost:7051';
  const peerTlsCertPath = peerTlsCert;
  
  const client = grpc.Client(peerEndpoint, {
    'grpc.ssl_target_name_override': 'peer0.org1.example.com',
    'grpc.default_authority': 'peer0.org1.example.com'
  });
  
  // Create gateway
  gateway = new Gateway();
  await gateway.connect({
    client,
    identity,
    discovery: { enabled: true, asLocalhost: true }
  });
  
  // Get network
  network = await gateway.getNetwork(CHANNEL_NAME);
  
  console.log('Connected to Fabric network');
}

// Helper function to get contract
function getContract(chaincodeName) {
  return network.getContract(chaincodeName);
}

// ============================================
// API ROUTES
// ============================================

// Generic query endpoint
app.post('/api/chaincode/query', async (req, res) => {
  try {
    const { chaincodeName, function: functionName, args } = req.body;
    
    const contract = getContract(chaincodeName);
    const result = await contract.evaluateTransaction(functionName, ...args);
    
    res.json({
      success: true,
      result: JSON.parse(result.toString())
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generic invoke endpoint
app.post('/api/chaincode/invoke', async (req, res) => {
  try {
    const { chaincodeName, function: functionName, args } = req.body;
    
    const contract = getContract(chaincodeName);
    await contract.submitTransaction(functionName, ...args);
    
    res.json({
      success: true,
      message: 'Transaction submitted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// BOBCOIN ENDPOINTS
// ============================================

app.get('/api/bobcoin/balance/:address', async (req, res) => {
  try {
    const contract = getContract(CHAINCODE_NAMES.BOBCOIN);
    const result = await contract.evaluateTransaction('BalanceOf', req.params.address);
    res.json({ balance: result.toString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bobcoin/mint', async (req, res) => {
  try {
    const { to, amount } = req.body;
    const contract = getContract(CHAINCODE_NAMES.BOBCOIN);
    await contract.submitTransaction('Mint', to, amount);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bobcoin/transfer', async (req, res) => {
  try {
    const { from, to, amount } = req.body;
    const contract = getContract(CHAINCODE_NAMES.BOBCOIN);
    await contract.submitTransaction('Transfer', from, to, amount);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ESCROW ENDPOINTS
// ============================================

app.post('/api/escrow/create', async (req, res) => {
  try {
    const { contractId, projectId, clientAddress, freelancerAddress, totalAmount, milestones } = req.body;
    const milestonesJSON = JSON.stringify(milestones);
    const contract = getContract(CHAINCODE_NAMES.ESCROW);
    await contract.submitTransaction(
      'CreateContract',
      contractId,
      projectId,
      clientAddress,
      freelancerAddress,
      totalAmount,
      milestonesJSON
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/escrow/:contractId', async (req, res) => {
  try {
    const contract = getContract(CHAINCODE_NAMES.ESCROW);
    const result = await contract.evaluateTransaction('GetContract', req.params.contractId);
    res.json(JSON.parse(result.toString()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/escrow/release', async (req, res) => {
  try {
    const { contractId, milestoneId } = req.body;
    const contract = getContract(CHAINCODE_NAMES.ESCROW);
    await contract.submitTransaction('ReleaseMilestone', contractId, milestoneId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CERTIFICATE ENDPOINTS
// ============================================

app.post('/api/certificate/register', async (req, res) => {
  try {
    const {
      certificateId,
      projectId,
      contractId,
      issuerAddress,
      recipientAddress,
      ipfsHash,
      description,
      metadata
    } = req.body;
    
    const metadataJSON = metadata ? JSON.stringify(metadata) : '{}';
    const contract = getContract(CHAINCODE_NAMES.CERTIFICATE);
    await contract.submitTransaction(
      'RegisterCertificate',
      certificateId,
      projectId,
      contractId,
      issuerAddress,
      recipientAddress,
      ipfsHash,
      description,
      metadataJSON
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/certificate/:certificateId', async (req, res) => {
  try {
    const contract = getContract(CHAINCODE_NAMES.CERTIFICATE);
    const result = await contract.evaluateTransaction('GetCertificate', req.params.certificateId);
    res.json(JSON.parse(result.toString()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/certificate/verify', async (req, res) => {
  try {
    const { certificateId, ipfsHash } = req.body;
    const contract = getContract(CHAINCODE_NAMES.CERTIFICATE);
    const result = await contract.evaluateTransaction('VerifyCertificate', certificateId, ipfsHash);
    res.json({ valid: result.toString() === 'true' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3001;

initFabric()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend API server running on port ${PORT}`);
      console.log(`Chaincode Names:`);
      console.log(`  - BobCoin: ${CHAINCODE_NAMES.BOBCOIN}`);
      console.log(`  - Escrow: ${CHAINCODE_NAMES.ESCROW}`);
      console.log(`  - Certificate: ${CHAINCODE_NAMES.CERTIFICATE}`);
      console.log(`Channel: ${CHANNEL_NAME}`);
    });
  })
  .catch(error => {
    console.error('Failed to initialize Fabric:', error);
    process.exit(1);
  });
