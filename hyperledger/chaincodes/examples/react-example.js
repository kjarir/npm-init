// React/JavaScript Example - How to invoke chaincodes from frontend
// Note: In production, these calls should go through a backend API

// ============================================
// BOBCOIN TOKEN CONTRACT
// ============================================

// Query BobCoin balance
async function getBobCoinBalance(address) {
  const response = await fetch('http://localhost:3001/api/chaincode/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chaincodeName: 'bobcoin',
      function: 'BalanceOf',
      args: [address]
    })
  });
  return response.json();
}

// Mint BobCoin tokens
async function mintBobCoin(to, amount) {
  const response = await fetch('http://localhost:3001/api/chaincode/invoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chaincodeName: 'bobcoin',
      function: 'Mint',
      args: [to, amount]
    })
  });
  return response.json();
}

// Transfer BobCoin
async function transferBobCoin(from, to, amount) {
  const response = await fetch('http://localhost:3001/api/chaincode/invoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chaincodeName: 'bobcoin',
      function: 'Transfer',
      args: [from, to, amount]
    })
  });
  return response.json();
}

// Get total supply
async function getTotalSupply() {
  const response = await fetch('http://localhost:3001/api/chaincode/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chaincodeName: 'bobcoin',
      function: 'TotalSupply',
      args: []
    })
  });
  return response.json();
}

// ============================================
// ESCROW CONTRACT
// ============================================

// Create escrow contract
async function createEscrowContract(contractId, projectId, clientAddress, freelancerAddress, totalAmount, milestones) {
  const milestonesJSON = JSON.stringify(milestones);
  const response = await fetch('http://localhost:3001/api/chaincode/invoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chaincodeName: 'escrow',
      function: 'CreateContract',
      args: [contractId, projectId, clientAddress, freelancerAddress, totalAmount, milestonesJSON]
    })
  });
  return response.json();
}

// Lock funds in escrow
async function lockFunds(contractId, amount) {
  const response = await fetch('http://localhost:3001/api/chaincode/invoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chaincodeName: 'escrow',
      function: 'LockFunds',
      args: [contractId, amount]
    })
  });
  return response.json();
}

// Release milestone payment
async function releaseMilestone(contractId, milestoneId) {
  const response = await fetch('http://localhost:3001/api/chaincode/invoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chaincodeName: 'escrow',
      function: 'ReleaseMilestone',
      args: [contractId, milestoneId]
    })
  });
  return response.json();
}

// Get escrow contract details
async function getEscrowContract(contractId) {
  const response = await fetch('http://localhost:3001/api/chaincode/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chaincodeName: 'escrow',
      function: 'GetContract',
      args: [contractId]
    })
  });
  return response.json();
}

// Refund project
async function refundProject(contractId) {
  const response = await fetch('http://localhost:3001/api/chaincode/invoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chaincodeName: 'escrow',
      function: 'RefundProject',
      args: [contractId]
    })
  });
  return response.json();
}

// ============================================
// CERTIFICATE REGISTRY CONTRACT
// ============================================

// Register certificate
async function registerCertificate(certificateId, projectId, contractId, issuerAddress, recipientAddress, ipfsHash, description, metadata) {
  const metadataJSON = metadata ? JSON.stringify(metadata) : '{}';
  const response = await fetch('http://localhost:3001/api/chaincode/invoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chaincodeName: 'certificate-registry',
      function: 'RegisterCertificate',
      args: [certificateId, projectId, contractId, issuerAddress, recipientAddress, ipfsHash, description, metadataJSON]
    })
  });
  return response.json();
}

// Get certificate
async function getCertificate(certificateId) {
  const response = await fetch('http://localhost:3001/api/chaincode/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chaincodeName: 'certificate-registry',
      function: 'GetCertificate',
      args: [certificateId]
    })
  });
  return response.json();
}

// Verify certificate
async function verifyCertificate(certificateId, ipfsHash) {
  const response = await fetch('http://localhost:3001/api/chaincode/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chaincodeName: 'certificate-registry',
      function: 'VerifyCertificate',
      args: [certificateId, ipfsHash]
    })
  });
  return response.json();
}

// Get certificates by project
async function getCertificatesByProject(projectId) {
  const response = await fetch('http://localhost:3001/api/chaincode/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chaincodeName: 'certificate-registry',
      function: 'GetCertificatesByProject',
      args: [projectId]
    })
  });
  return response.json();
}

// ============================================
// USAGE EXAMPLES
// ============================================

// Example: Complete workflow
async function exampleWorkflow() {
  try {
    // 1. Mint tokens for client
    await mintBobCoin('client123', '1000.0');
    
    // 2. Create escrow contract
    const milestones = [
      { milestoneId: 'm1', description: 'Design', amount: '300.0', status: 'PENDING' },
      { milestoneId: 'm2', description: 'Development', amount: '500.0', status: 'PENDING' },
      { milestoneId: 'm3', description: 'Testing', amount: '200.0', status: 'PENDING' }
    ];
    
    await createEscrowContract(
      'contract001',
      'project001',
      'client123',
      'freelancer456',
      '1000.0',
      milestones
    );
    
    // 3. Lock funds
    await lockFunds('contract001', '1000.0');
    
    // 4. Release first milestone
    await releaseMilestone('contract001', 'm1');
    
    // 5. Register certificate when project completes
    await registerCertificate(
      'cert001',
      'project001',
      'contract001',
      'client123',
      'freelancer456',
      'QmHash123...',
      'Project Completion Certificate',
      { grade: 'A', completionDate: '2024-01-20' }
    );
    
    // 6. Verify certificate
    const isValid = await verifyCertificate('cert001', 'QmHash123...');
    console.log('Certificate valid:', isValid);
    
  } catch (error) {
    console.error('Error in workflow:', error);
  }
}

export {
  // BobCoin
  getBobCoinBalance,
  mintBobCoin,
  transferBobCoin,
  getTotalSupply,
  
  // Escrow
  createEscrowContract,
  lockFunds,
  releaseMilestone,
  getEscrowContract,
  refundProject,
  
  // Certificate
  registerCertificate,
  getCertificate,
  verifyCertificate,
  getCertificatesByProject
};
