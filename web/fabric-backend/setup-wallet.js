/**
 * Helper script to set up wallet identity from Admin certificate
 * Usage: node setup-wallet.js [certPath] [keyPath] [userId]
 */

const { Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

async function setupWallet() {
  // Get paths from command line args or environment variables
  const certPath = process.argv[2] || process.env.HL_ADMIN_CERT_PATH;
  const keyPath = process.argv[3] || process.env.HL_ADMIN_KEY_PATH;
  const userId = process.argv[4] || process.env.HL_USER_ID || 'appUser';
  const mspId = process.env.HL_MSP_ID || 'Org1MSP';

  if (!certPath || !keyPath) {
    console.error('❌ Missing certificate or key path');
    console.log('\nUsage:');
    console.log('  node setup-wallet.js <certPath> <keyPath> [userId]');
    console.log('\nOr set environment variables:');
    console.log('  HL_ADMIN_CERT_PATH=/path/to/cert.pem');
    console.log('  HL_ADMIN_KEY_PATH=/path/to/key.pem');
    console.log('  HL_USER_ID=appUser (optional)');
    console.log('\nExample paths:');
    console.log('  Cert: fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem');
    console.log('  Key:  fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/<key_file>');
    process.exit(1);
  }

  // Check if files exist
  if (!fs.existsSync(certPath)) {
    console.error(`❌ Certificate file not found: ${certPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(keyPath)) {
    console.error(`❌ Key file not found: ${keyPath}`);
    process.exit(1);
  }

  try {
    // Create wallet directory
    const walletPath = path.join(__dirname, 'wallet');
    if (!fs.existsSync(walletPath)) {
      fs.mkdirSync(walletPath, { recursive: true });
      console.log(`✅ Created wallet directory: ${walletPath}`);
    }

    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // Check if user already exists
    const userExists = await wallet.get(userId);
    if (userExists) {
      console.log(`⚠️  User ${userId} already exists in wallet`);
      console.log('   Delete the wallet directory to recreate, or use a different userId');
      return;
    }

    // Read certificate and key
    console.log(`📖 Reading certificate from: ${certPath}`);
    const cert = fs.readFileSync(certPath).toString();
    
    console.log(`📖 Reading key from: ${keyPath}`);
    const key = fs.readFileSync(keyPath).toString();

    // Create identity using fabric-network v2.x API (X509Identity format)
    console.log(`🔐 Creating identity for ${userId} with MSP ${mspId}...`);
    const identity = {
      credentials: {
        certificate: cert,
        privateKey: key,
      },
      mspId: mspId,
      type: 'X.509',
    };
    
    // Save to wallet
    await wallet.put(userId, identity);
    
    console.log(`✅ Successfully created wallet identity for ${userId}`);
    console.log(`   Wallet location: ${walletPath}`);
  } catch (error) {
    console.error('❌ Error setting up wallet:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

setupWallet().catch(console.error);
