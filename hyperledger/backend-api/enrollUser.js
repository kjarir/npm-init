/**
 * Helper script to enroll Admin user into wallet
 * Run this once before starting the server
 */

const { Wallets, X509WalletMixin } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const os = require('os');

async function enrollUser() {
  try {
    const walletPath = path.join(__dirname, 'wallet');
    const userId = process.env.HL_USER_ID || 'appUser';
    
    // Create wallet directory
    if (!fs.existsSync(walletPath)) {
      fs.mkdirSync(walletPath, { recursive: true });
    }
    
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    
    // Check if user already exists
    const userExists = await wallet.get(userId);
    if (userExists) {
      console.log(`✅ User "${userId}" already exists in wallet`);
      return;
    }
    
    // Check environment variables first
    let certPath = process.env.HL_ADMIN_CERT_PATH;
    let keyPath = process.env.HL_ADMIN_KEY_DIR;
    
    // If not set via env vars, try common locations
    if (!certPath || !keyPath) {
      const os = require('os');
      const possiblePaths = [
        path.join(__dirname, '../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp'),
        path.join(__dirname, '../../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp'),
        path.join(os.homedir(), 'fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp'),
      ];
      
      for (const mspPath of possiblePaths) {
        const testCertPath = path.join(mspPath, 'signcerts/Admin@org1.example.com-cert.pem');
        const testKeyPath = path.join(mspPath, 'keystore');
        
        if (fs.existsSync(testCertPath) && fs.existsSync(testKeyPath)) {
          certPath = testCertPath;
          keyPath = testKeyPath;
          console.log(`✅ Found Admin certificate at: ${certPath}`);
          break;
        }
      }
    } else {
      // Use env var paths (resolve relative paths)
      if (!path.isAbsolute(certPath)) {
        certPath = path.resolve(certPath);
      }
      if (!path.isAbsolute(keyPath)) {
        keyPath = path.resolve(keyPath);
      }
    }
    
    if (!certPath || !fs.existsSync(certPath)) {
      throw new Error(`Certificate not found. Set HL_ADMIN_CERT_PATH or ensure certificates are in default locations.\nTried: ${certPath || 'not set'}`);
    }
    
    if (!keyPath || !fs.existsSync(keyPath)) {
      throw new Error(`Key directory not found. Set HL_ADMIN_KEY_DIR or ensure certificates are in default locations.\nTried: ${keyPath || 'not set'}`);
    }
    
    // Find the private key file
    const keyFiles = fs.readdirSync(keyPath).filter(f => f.endsWith('_sk') || f === 'priv_sk');
    if (keyFiles.length === 0) {
      throw new Error(`No private key found in: ${keyPath}`);
    }
    
    const privateKeyPath = path.join(keyPath, keyFiles[0]);
    
    // Read certificate and private key
    const cert = fs.readFileSync(certPath).toString();
    const key = fs.readFileSync(privateKeyPath).toString();
    
    // Create identity
    const identity = X509WalletMixin.createIdentity('Org1MSP', cert, key);
    
    // Add to wallet
    await wallet.put(userId, identity);
    
    console.log(`✅ Successfully enrolled "${userId}" into wallet`);
    console.log(`   Certificate: ${certPath}`);
    console.log(`   Private Key: ${privateKeyPath}`);
    console.log(`\n💡 You can now start the server with: npm start`);
    
  } catch (error) {
    console.error('❌ Error enrolling user:', error.message);
    console.error('\n💡 Set environment variables:');
    console.error('   export HL_ADMIN_CERT_PATH=/path/to/Admin@org1.example.com-cert.pem');
    console.error('   export HL_ADMIN_KEY_DIR=/path/to/keystore');
    console.error('   export HL_USER_ID=appUser');
    process.exit(1);
  }
}

enrollUser();
