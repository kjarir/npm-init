# Hyperledger Fabric Backend API

Backend API server to interact with your Hyperledger Fabric chaincodes.

**✅ Mobile-Friendly**: Fully supports Flutter and other mobile apps with CORS enabled.

**📱 See [FLUTTER_INTEGRATION.md](./FLUTTER_INTEGRATION.md) for Flutter integration guide.**

## Installation

```bash
cd /Users/mohammedjarirkhan/Desktop/fabric/backend-api
npm install
```

## Configuration

The server uses environment variables (optional):

```bash
# Server Configuration
export PORT=3002
export HL_CHANNEL=mychannel
export HL_BOBCOIN_CHAINCODE=bobcoin
export HL_ESCROW_CHAINCODE=escrow
export HL_CERTIFICATE_CHAINCODE=certificate-registry
export HL_USER_ID=appUser

# Certificate Paths (if not in default locations)
export HL_ADMIN_CERT_PATH=/path/to/Admin@org1.example.com-cert.pem
export HL_ADMIN_KEY_DIR=/path/to/keystore
export HL_NETWORK_CONFIG=/path/to/connection-profile.json
```

### Set Up Wallet Identity (First Time Only)

The server will automatically try to create a wallet identity from Admin certificates if the user doesn't exist. However, if the certificates aren't found in the default locations, you can set them up manually.

#### Option A: Automatic Setup (Recommended)
The server will automatically look for Admin certificates in common locations:
- `../fabric-samples/test-network/...`
- `../../fabric-samples/test-network/...`
- `~/fabric-samples/test-network/...`

If your certificates are in a different location, set environment variables:
```bash
export HL_ADMIN_CERT_PATH=/path/to/Admin@org1.example.com-cert.pem
export HL_ADMIN_KEY_DIR=/path/to/keystore
export HL_USER_ID=appUser
```

#### Option B: Manual Setup
Run the enrollment script:
```bash
node enrollUser.js
```

## Start Server

```bash
npm start
```

Or with auto-reload:
```bash
npm run dev
```

## API Endpoints

**Base URL**: `http://localhost:3002/api/v1`

### Health & Info
```bash
GET  /health                    # Health check
GET  /api/v1/info              # API information
```

### Fabric Connection
```bash
POST /api/v1/fabric/connect     # Connect to Fabric
GET  /api/v1/fabric/status      # Connection status
POST /api/v1/fabric/disconnect  # Disconnect
```

### Generic Chaincode
```bash
POST /api/v1/fabric/query       # Query chaincode
POST /api/v1/fabric/invoke      # Invoke chaincode
```

### BobCoin Endpoints
```bash
GET  /api/v1/bobcoin/totalSupply              # Get total supply
GET  /api/v1/bobcoin/balance/:address          # Get balance
GET  /api/v1/bobcoin/tokenInfo                 # Get token info
GET  /api/v1/bobcoin/transactions              # Get transaction history
POST /api/v1/bobcoin/mint                      # Mint tokens
POST /api/v1/bobcoin/burn                     # Burn tokens
POST /api/v1/bobcoin/transfer                 # Transfer tokens
```

### Example: Query Chaincode
```bash
POST http://localhost:3002/api/v1/fabric/query
Content-Type: application/json

{
  "contractName": "bobcoin",
  "functionName": "BalanceOf",
  "args": ["user123"]
}
```

### Example: Invoke Chaincode
```bash
POST http://localhost:3002/api/v1/fabric/invoke
Content-Type: application/json

{
  "contractName": "bobcoin",
  "functionName": "Mint",
  "args": ["user123", "1000"]
}
```

### Example: Mint BobCoin (Direct Endpoint)
```bash
POST http://localhost:3002/api/v1/bobcoin/mint
Content-Type: application/json

{
  "to": "user123",
  "amount": "1000"
}
```

## Example Usage

### BobCoin (Using Direct Endpoints)
```bash
# Get balance
GET /api/v1/bobcoin/balance/user123

# Mint tokens
POST /api/v1/bobcoin/mint
{
  "to": "user123",
  "amount": "1000"
}

# Transfer tokens
POST /api/v1/bobcoin/transfer
{
  "from": "user123",
  "to": "user456",
  "amount": "100"
}

# Get total supply
GET /api/v1/bobcoin/totalSupply
```

### BobCoin (Using Generic Endpoints)
```bash
# Query balance
POST /api/v1/fabric/query
{
  "contractName": "bobcoin",
  "functionName": "BalanceOf",
  "args": ["user123"]
}

# Mint tokens
POST /api/v1/fabric/invoke
{
  "contractName": "bobcoin",
  "functionName": "Mint",
  "args": ["user123", "1000"]
}
```

### Escrow
```javascript
// Create contract
POST /api/fabric/invoke
{
  "contractName": "escrow",
  "functionName": "CreateContract",
  "args": [
    "contract001",
    "project001",
    "client123",
    "freelancer456",
    "1000.0",
    '[{"milestoneId":"m1","description":"Design","amount":"300.0","status":"PENDING"}]'
  ]
}

// Get contract
POST /api/fabric/query
{
  "contractName": "escrow",
  "functionName": "GetContract",
  "args": ["contract001"]
}
```

### Certificate Registry
```bash
POST /api/v1/fabric/invoke
{
  "contractName": "certificate",
  "functionName": "RegisterCertificate",
  "args": [
    "cert001",
    "project001",
    "contract001",
    "issuer123",
    "recipient456",
    "QmHash123...",
    "Project Completion",
    "{}"
  ]
}
```

## Features

✅ **Mobile-Friendly**: Full CORS support for Flutter and other mobile apps  
✅ **Auto-Connect**: Automatically connects to Fabric when needed  
✅ **Consistent Responses**: Standardized success/error response format  
✅ **Request Validation**: Validates all inputs before processing  
✅ **Error Handling**: Comprehensive error handling with detailed messages  
✅ **Health Monitoring**: Health check endpoint for monitoring  
✅ **API Versioning**: Versioned API endpoints (`/api/v1/`)  

## Response Format

All API responses follow a consistent format:

**Success:**
```json
{
  "success": true,
  "message": "Success message",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Mobile App Integration

See **[FLUTTER_INTEGRATION.md](./FLUTTER_INTEGRATION.md)** for complete Flutter integration guide with code examples.

## Notes

- Make sure Fabric network is running before connecting
- The server automatically loads connection profile from `blockchain-explorer/connection-profile/test-network.json`
- Uses Admin@org1.example.com certificate for authentication
- Supports both `@hyperledger/fabric-gateway` (newer) and `fabric-network` (legacy)
- Server listens on `0.0.0.0` to accept connections from mobile devices on the same network