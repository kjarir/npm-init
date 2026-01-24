# Hyperledger Fabric Blockchain Platform

A comprehensive blockchain platform built on Hyperledger Fabric featuring three smart contracts (chaincodes), a mobile-friendly backend API, and integration with Hyperledger Explorer for visualization.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Directory Structure](#directory-structure)
- [Quick Start](#quick-start)
- [Network Setup](#network-setup)
- [Chaincode Deployment](#chaincode-deployment)
- [Backend API](#backend-api)
- [Frontend Integration](#frontend-integration)
- [Blockchain Explorer](#blockchain-explorer)
- [Smart Contracts](#smart-contracts)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)
- [Performance & Consensus](#performance--consensus)
- [Security Notes](#security-notes)

---

## 🎯 Overview

This project implements a complete blockchain solution with:

- **BobCoin Token Contract**: ERC-20 equivalent token with mint, burn, and transfer functionality
- **Escrow Contract**: Project fund management with milestone-based payments
- **Certificate Registry**: IPFS-integrated certificate management for projects and milestones
- **Backend API**: RESTful API server with full mobile support (Flutter/React)
- **Blockchain Explorer**: Web UI for visualizing network activity and BobCoin statistics

### Key Features

✅ **Production-Ready**: Uses `big.Int` for precise financial calculations (no overflow)  
✅ **Mobile-Friendly**: Full CORS support, optimized for Flutter and React apps  
✅ **IPFS Integration**: Certificate registry supports IPFS groups for project collaboration  
✅ **Visualization**: Real-time BobCoin statistics in Blockchain Explorer  
✅ **Automated Deployment**: Scripts for network startup and chaincode deployment  
✅ **Comprehensive Documentation**: Guides for deployment, integration, and troubleshooting  

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Applications                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Flutter    │  │    React     │  │   Explorer   │    │
│  │   Mobile     │  │     Web      │  │     UI       │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
└─────────┼──────────────────┼──────────────────┼────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                    ┌────────▼─────────┐
                    │   Backend API    │
                    │  (Express.js)    │
                    │   Port: 3002     │
                    └────────┬─────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
    ┌─────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
    │  BobCoin   │   │   Escrow     │   │ Certificate │
    │ Chaincode  │   │  Chaincode   │   │  Chaincode  │
    └─────┬──────┘   └──────┬───────┘   └──────┬───────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                    ┌────────▼─────────┐
                    │ Hyperledger      │
                    │ Fabric Network   │
                    │                  │
                    │  ┌───────────┐   │
                    │  │  Org1     │   │
                    │  │  Peer     │   │
                    │  └───────────┘   │
                    │  ┌───────────┐   │
                    │  │  Org2     │   │
                    │  │  Peer     │   │
                    │  └───────────┘   │
                    │  ┌───────────┐   │
                    │  │  Orderer  │   │
                    │  │  (Raft)   │   │
                    │  └───────────┘   │
                    └──────────────────┘
```

### Components

1. **Hyperledger Fabric Network**: Private blockchain network with 2 organizations (Org1, Org2) and Raft consensus
2. **Smart Contracts (Chaincodes)**: Three Go-based chaincodes deployed on channel `mychannel`
3. **Backend API**: Node.js/Express server providing REST endpoints for chaincode interaction
4. **Blockchain Explorer**: Web-based UI for network visualization and monitoring
5. **Frontend Applications**: Flutter mobile apps and React web apps connect via Backend API

---

## 📦 Prerequisites

### Required Software

- **Docker & Docker Compose**: For running Fabric network and Explorer
  ```bash
  # Verify installation
  docker --version
  docker-compose --version
  ```

- **Go**: Version 1.18+ (for building chaincodes)
  ```bash
  go version
  ```

- **Node.js**: Version 14+ (for backend API)
  ```bash
  node --version
  npm --version
  ```

- **Hyperledger Fabric Binaries**: `peer`, `configtxgen`, etc.
  - Usually located in `fabric-samples/bin/`
  - Should be in your `PATH` or specified in deployment scripts

- **jq**: For JSON parsing in deployment scripts
  ```bash
  brew install jq  # macOS
  # or
  apt-get install jq  # Linux
  ```

### Required Directories

- `fabric-samples/`: Hyperledger Fabric samples repository
  - Should contain `test-network/` directory
  - Binaries in `fabric-samples/bin/`

---

## 📁 Directory Structure

```
fabric/
├── README.md                          # This file
├── START_NETWORK.md                   # Network startup guide
├── TRANSACTION_TIMING_AND_CONSENSUS.md # Performance documentation
├── SHOW_BOBCOIN_IN_EXPLORER.md        # Explorer integration guide
│
├── start-network.sh                   # Automated network startup
├── stop-network.sh                    # Network shutdown script
│
├── chaincodes/                        # Smart contracts
│   ├── bobcoin/                      # BobCoin token contract
│   │   ├── bobcoin.go
│   │   ├── go.mod
│   │   └── go.sum
│   ├── escrow/                        # Escrow contract
│   │   ├── escrow.go
│   │   ├── go.mod
│   │   └── go.sum
│   ├── certificate-registry/          # Certificate registry
│   │   ├── certificate.go
│   │   ├── go.mod
│   │   └── go.sum
│   ├── deploy-chaincodes.sh           # Deploy all chaincodes
│   ├── redeploy-bobcoin.sh            # Upgrade BobCoin
│   ├── redeploy-certificate.sh        # Upgrade Certificate Registry
│   ├── check-bobcoin-version.sh       # Version checker
│   ├── DEPLOYMENT_GUIDE.md            # Deployment instructions
│   ├── CERTIFICATE_UPGRADE.md         # Certificate upgrade guide
│   ├── IPFS_GROUP_FLOW.md             # IPFS groups documentation
│   └── examples/                       # Integration examples
│       ├── react-example.js
│       ├── flutter-example.dart
│       └── backend-api-example.js
│
├── backend-api/                       # Backend API server
│   ├── server.js                      # Main API server
│   ├── enrollUser.js                  # User enrollment helper
│   ├── package.json
│   ├── README.md                      # API documentation
│   ├── FLUTTER_INTEGRATION.md         # Flutter integration guide
│   └── CODE_REVIEW.md                 # Code review notes
│
├── blockchain-explorer/               # Hyperledger Explorer
│   ├── docker-compose.yaml
│   ├── config.json
│   ├── connection-profile/
│   │   └── test-network.json
│   ├── client/                        # React frontend
│   │   └── src/
│   │       └── components/
│   │           └── Charts/
│   │               └── BobCoinBalance.js
│   └── app/                           # Node.js backend
│
└── fabric-samples/                    # Fabric network (external)
    └── test-network/
        ├── network.sh
        ├── configtx/
        └── organizations/
```

---

## 🚀 Quick Start

### 1. Start the Network

```bash
# From project root
./start-network.sh
```

This will:
- Start the Fabric network (2 peers, 1 orderer)
- Create channel `mychannel`
- Start Blockchain Explorer
- Wait for services to initialize

**Access Explorer**: http://localhost:8080

### 2. Deploy Chaincodes

```bash
cd chaincodes
./deploy-chaincodes.sh
```

This deploys all three chaincodes:
- `bobcoin` (version 1.0)
- `escrow` (version 1.0)
- `certificate-registry` (version 1.0)

### 3. Start Backend API

```bash
cd backend-api
npm install
npm start
```

**API Base URL**: http://localhost:3002/api/v1

### 4. Test the System

```bash
# Get BobCoin total supply
curl http://localhost:3002/api/v1/bobcoin/totalSupply

# Mint BobCoins
curl -X POST http://localhost:3002/api/v1/bobcoin/mint \
  -H "Content-Type: application/json" \
  -d '{"to": "user123", "amount": "1000"}'
```

---

## 🌐 Network Setup

### Manual Network Startup

If you prefer manual control:

```bash
# 1. Start Fabric network
cd fabric-samples/test-network
./network.sh up

# 2. Create channel
./network.sh createChannel -c mychannel

# 3. Start Explorer
cd ../../blockchain-explorer
docker-compose up -d
```

### Network Configuration

- **Channel**: `mychannel`
- **Organizations**: Org1, Org2
- **Peers**: 
  - `peer0.org1.example.com` (port 7051)
  - `peer0.org2.example.com` (port 9051)
- **Orderer**: `orderer.example.com` (port 7050)
- **Consensus**: Raft (etcdraft)
- **BatchTimeout**: 2 seconds
- **MaxMessageCount**: 10 transactions per block

### Stopping the Network

```bash
# From project root
./stop-network.sh
```

Or manually:
```bash
# Stop Explorer
cd blockchain-explorer
docker-compose down

# Stop Fabric network
cd fabric-samples/test-network
./network.sh down
```

---

## 📝 Chaincode Deployment

### Automated Deployment

```bash
cd chaincodes
./deploy-chaincodes.sh
```

### Manual Deployment Steps

1. **Package Chaincode**
   ```bash
   cd fabric-samples/test-network
   export PATH=${PWD}/../bin:$PATH
   export FABRIC_CFG_PATH=${PWD}/configtx
   
   peer lifecycle chaincode package bobcoin.tar.gz \
     --path ../chaincodes/bobcoin \
     --lang golang \
     --label bobcoin_1.0
   ```

2. **Install on Peers**
   ```bash
   # Org1
   export CORE_PEER_LOCALMSPID="Org1MSP"
   export CORE_PEER_ADDRESS=localhost:7051
   peer lifecycle chaincode install bobcoin.tar.gz
   
   # Org2
   export CORE_PEER_LOCALMSPID="Org2MSP"
   export CORE_PEER_ADDRESS=localhost:9051
   peer lifecycle chaincode install bobcoin.tar.gz
   ```

3. **Approve & Commit**
   ```bash
   # Get package ID
   PACKAGE_ID=$(peer lifecycle chaincode queryinstalled --output json | jq -r '.installed_chaincodes[] | select(.label=="bobcoin_1.0") | .package_id')
   
   # Approve for Org1
   peer lifecycle chaincode approveformyorg \
     -o localhost:7050 \
     --channelID mychannel \
     --name bobcoin \
     --version 1.0 \
     --package-id $PACKAGE_ID \
     --sequence 1 \
     --tls \
     --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
   
   # Repeat for Org2, then commit
   ```

See [chaincodes/DEPLOYMENT_GUIDE.md](chaincodes/DEPLOYMENT_GUIDE.md) for complete instructions.

### Upgrading Chaincodes

**BobCoin Upgrade**:
```bash
cd chaincodes
./redeploy-bobcoin.sh
```

**Certificate Registry Upgrade**:
```bash
cd chaincodes
./redeploy-certificate.sh
```

---

## 🔌 Backend API

### Installation

```bash
cd backend-api
npm install
```

### Configuration

Environment variables (optional):
```bash
export PORT=3002
export HL_CHANNEL=mychannel
export HL_BOBCOIN_CHAINCODE=bobcoin
export HL_ESCROW_CHAINCODE=escrow
export HL_CERTIFICATE_CHAINCODE=certificate-registry
export HL_USER_ID=appUser
```

### Start Server

```bash
npm start          # Production
npm run dev        # Development (with auto-reload)
```

### API Endpoints

**Base URL**: `http://localhost:3002/api/v1`

#### Health & Info
```
GET  /health                    # Health check
GET  /api/v1/info              # API information
```

#### Fabric Connection
```
POST /api/v1/fabric/connect     # Connect to Fabric
GET  /api/v1/fabric/status      # Connection status
POST /api/v1/fabric/disconnect  # Disconnect
```

#### Generic Chaincode
```
POST /api/v1/fabric/query       # Query chaincode
POST /api/v1/fabric/invoke      # Invoke chaincode
```

#### BobCoin Endpoints
```
GET  /api/v1/bobcoin/totalSupply              # Get total supply
GET  /api/v1/bobcoin/balance/:address          # Get balance
GET  /api/v1/bobcoin/tokenInfo                 # Get token info
GET  /api/v1/bobcoin/transactions              # Get transaction history
POST /api/v1/bobcoin/mint                      # Mint tokens
POST /api/v1/bobcoin/burn                     # Burn tokens
POST /api/v1/bobcoin/transfer                  # Transfer tokens
```

### Response Format

**Success**:
```json
{
  "success": true,
  "message": "Success message",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error**:
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Example Requests

**Mint BobCoin**:
```bash
curl -X POST http://localhost:3002/api/v1/bobcoin/mint \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user123",
    "amount": "1000"
  }'
```

**Query Balance**:
```bash
curl http://localhost:3002/api/v1/bobcoin/balance/user123
```

**Generic Chaincode Query**:
```bash
curl -X POST http://localhost:3002/api/v1/fabric/query \
  -H "Content-Type: application/json" \
  -d '{
    "contractName": "bobcoin",
    "functionName": "BalanceOf",
    "args": ["user123"]
  }'
```

See [backend-api/README.md](backend-api/README.md) for complete API documentation.

---

## 📱 Frontend Integration

### Flutter Integration

**1. Add Dependencies** (`pubspec.yaml`):
```yaml
dependencies:
  http: ^1.1.0
```

**2. Create API Service**:
```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class FabricApiService {
  final String baseUrl = 'http://YOUR_IP:3002/api/v1';
  
  Future<Map<String, dynamic>> get(String endpoint) async {
    final response = await http.get(Uri.parse('$baseUrl$endpoint'));
    return jsonDecode(response.body);
  }
  
  Future<Map<String, dynamic>> post(String endpoint, Map<String, dynamic> body) async {
    final response = await http.post(
      Uri.parse('$baseUrl$endpoint'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    return jsonDecode(response.body);
  }
}
```

**3. Use in App**:
```dart
final api = FabricApiService();

// Get balance
final balance = await api.get('/bobcoin/balance/user123');

// Mint tokens
await api.post('/bobcoin/mint', {
  'to': 'user123',
  'amount': '1000',
});
```

See [backend-api/FLUTTER_INTEGRATION.md](backend-api/FLUTTER_INTEGRATION.md) for complete guide.

### React Integration

```javascript
const API_BASE = 'http://localhost:3002/api/v1';

// Get balance
const response = await fetch(`${API_BASE}/bobcoin/balance/user123`);
const data = await response.json();

// Mint tokens
await fetch(`${API_BASE}/bobcoin/mint`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'user123',
    amount: '1000',
  }),
});
```

See [chaincodes/examples/react-example.js](chaincodes/examples/react-example.js) for complete example.

---

## 🔍 Blockchain Explorer

### Access

**URL**: http://localhost:8080

### Features

- **Network Overview**: View peers, channels, chaincodes
- **Block Explorer**: Browse blocks and transactions
- **BobCoin Statistics**: Real-time total supply and transaction history
- **Transaction Details**: View transaction payloads and timestamps

### BobCoin Dashboard Component

The Explorer includes a custom BobCoin Balance component that displays:
- Total Supply (minted tokens)
- Mint/Burn transaction counts
- Recent transaction history

**Location**: Dashboard → Left column

**Requirements**:
- Backend API running on port 3002
- Component queries `/api/v1/bobcoin/totalSupply`

### Rebuilding Explorer UI

If you modify Explorer components:

```bash
cd blockchain-explorer/client
npm install
npm run build
cd ..
docker-compose restart
```

See [SHOW_BOBCOIN_IN_EXPLORER.md](SHOW_BOBCOIN_IN_EXPLORER.md) for details.

---

## 💼 Smart Contracts

### 1. BobCoin Token Contract

**Chaincode Name**: `bobcoin`  
**Version**: 2.2 (uses `big.Int` for precise calculations)

**Functions**:
- `InitLedger()`: Initialize token metadata
- `Mint(to, amount)`: Create new tokens
- `Burn(from, amount)`: Destroy tokens
- `Transfer(from, to, amount)`: Transfer tokens
- `BalanceOf(address)`: Get balance
- `TotalSupply()`: Get total supply
- `TokenInfo()`: Get token metadata

**Key Features**:
- ✅ Uses `math/big.Int` for overflow-safe arithmetic
- ✅ 18 decimal places
- ✅ Event emission for mint/burn/transfer
- ✅ Access control (placeholder for minter role)

**Example**:
```bash
# Mint 1000 tokens
curl -X POST http://localhost:3002/api/v1/bobcoin/mint \
  -H "Content-Type: application/json" \
  -d '{"to": "user123", "amount": "1000"}'

# Get balance
curl http://localhost:3002/api/v1/bobcoin/balance/user123
```

### 2. Escrow Contract

**Chaincode Name**: `escrow`  
**Version**: 1.0

**Functions**:
- `CreateContract(contractID, projectID, clientAddress, freelancerAddress, totalAmount, milestonesJSON)`: Create escrow
- `GetContract(contractID)`: Get contract details
- `FundContract(contractID, amount)`: Lock funds
- `ReleaseMilestone(contractID, milestoneID)`: Release milestone payment
- `RefundContract(contractID)`: Refund to client
- `GetContractsByProject(projectID)`: List contracts for project

**Contract States**:
- `CREATED`: Contract created, not funded
- `FUNDED`: Funds locked
- `IN_PROGRESS`: Work in progress
- `COMPLETED`: All milestones released
- `REFUNDED`: Funds returned to client

**Example**:
```bash
# Create contract
curl -X POST http://localhost:3002/api/v1/fabric/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "contractName": "escrow",
    "functionName": "CreateContract",
    "args": [
      "contract001",
      "project001",
      "client123",
      "freelancer456",
      "1000.0",
      "[{\"milestoneId\":\"m1\",\"description\":\"Design\",\"amount\":\"300.0\",\"status\":\"PENDING\"}]"
    ]
  }'
```

### 3. Certificate Registry

**Chaincode Name**: `certificate-registry`  
**Version**: 2.1 (with IPFS groups)

**Functions**:
- `RegisterProject(...)`: Register project and create IPFS group
- `GetProject(projectID)`: Get project details
- `RegisterContractCertificate(...)`: Register contract certificate
- `RegisterMilestoneCertificate(...)`: Register milestone certificate
- `GetIPFSGroup(projectID)`: Get IPFS group details
- `GetGroupMembers(projectID)`: Get group members
- `GetCertificatesByGroup(projectID)`: Get all certificates in group
- `GetCertificate(certificateID)`: Get certificate details

**IPFS Group Flow**:
1. `RegisterProject()` creates IPFS group with client as member
2. `RegisterContractCertificate()` adds freelancer to group
3. `RegisterMilestoneCertificate()` links milestone to group
4. `GetCertificatesByGroup()` retrieves all certificates for rating/review

See [chaincodes/IPFS_GROUP_FLOW.md](chaincodes/IPFS_GROUP_FLOW.md) for details.

**Example**:
```bash
# Register project
curl -X POST http://localhost:3002/api/v1/fabric/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "contractName": "certificate-registry",
    "functionName": "RegisterProject",
    "args": [
      "project001",
      "Web Development",
      "Build a modern web app",
      "Web Development",
      "client123",
      "5000.0",
      "2024-12-31",
      "[\"React\", \"Node.js\"]",
      "QmProjectHash...",
      "QmGroupHash..."
    ]
  }'
```

---

## 📖 Usage Examples

### Complete Workflow: Project with Escrow and Certificates

```bash
# 1. Register project (creates IPFS group)
curl -X POST http://localhost:3002/api/v1/fabric/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "contractName": "certificate-registry",
    "functionName": "RegisterProject",
    "args": ["project001", "Web App", "Description", "Web", "client123", "5000.0", "2024-12-31", "[]", "QmHash1", "QmGroup1"]
  }'

# 2. Create escrow contract
curl -X POST http://localhost:3002/api/v1/fabric/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "contractName": "escrow",
    "functionName": "CreateContract",
    "args": ["contract001", "project001", "client123", "freelancer456", "5000.0", "[{\"milestoneId\":\"m1\",\"description\":\"Design\",\"amount\":\"2000.0\",\"status\":\"PENDING\"}]"]
  }'

# 3. Fund contract
curl -X POST http://localhost:3002/api/v1/fabric/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "contractName": "escrow",
    "functionName": "FundContract",
    "args": ["contract001", "5000.0"]
  }'

# 4. Register contract certificate
curl -X POST http://localhost:3002/api/v1/fabric/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "contractName": "certificate-registry",
    "functionName": "RegisterContractCertificate",
    "args": ["cert001", "project001", "contract001", "QmHash2", "0xabc123", "freelancer456", "client123", "5000.0"]
  }'

# 5. Release milestone
curl -X POST http://localhost:3002/api/v1/fabric/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "contractName": "escrow",
    "functionName": "ReleaseMilestone",
    "args": ["contract001", "m1"]
  }'

# 6. Register milestone certificate
curl -X POST http://localhost:3002/api/v1/fabric/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "contractName": "certificate-registry",
    "functionName": "RegisterMilestoneCertificate",
    "args": ["cert002", "project001", "contract001", "m1", "QmHash3", "0xdef456", "freelancer456", "client123", "2000.0"]
  }'

# 7. Get all certificates for rating
curl -X POST http://localhost:3002/api/v1/fabric/query \
  -H "Content-Type: application/json" \
  -d '{
    "contractName": "certificate-registry",
    "functionName": "GetCertificatesByGroup",
    "args": ["project001"]
  }'
```

### BobCoin Token Operations

```bash
# Initialize (first time only)
curl -X POST http://localhost:3002/api/v1/fabric/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "contractName": "bobcoin",
    "functionName": "InitLedger",
    "args": []
  }'

# Mint tokens
curl -X POST http://localhost:3002/api/v1/bobcoin/mint \
  -H "Content-Type: application/json" \
  -d '{"to": "user123", "amount": "1000"}'

# Transfer tokens
curl -X POST http://localhost:3002/api/v1/bobcoin/transfer \
  -H "Content-Type: application/json" \
  -d '{"from": "user123", "to": "user456", "amount": "100"}'

# Get balance
curl http://localhost:3002/api/v1/bobcoin/balance/user123

# Burn tokens
curl -X POST http://localhost:3002/api/v1/bobcoin/burn \
  -H "Content-Type: application/json" \
  -d '{"from": "user123", "amount": "50"}'

# Get total supply
curl http://localhost:3002/api/v1/bobcoin/totalSupply
```

---

## 🔧 Troubleshooting

### Network Issues

**Problem**: `peer` command not found  
**Solution**: Ensure Fabric binaries are in PATH:
```bash
export PATH=$PATH:/path/to/fabric-samples/bin
export FABRIC_CFG_PATH=/path/to/fabric-samples/config
```

**Problem**: Explorer not connecting  
**Solution**: 
1. Verify Fabric network is running: `docker ps | grep peer`
2. Check Explorer logs: `docker logs explorer.mynetwork.com`
3. Restart Explorer: `cd blockchain-explorer && docker-compose restart`

**Problem**: Port already in use  
**Solution**: 
- Backend API (3002): `lsof -ti:3002 | xargs kill -9`
- Explorer (8080): Change port in `docker-compose.yaml`

### Chaincode Issues

**Problem**: Chaincode installation fails  
**Solution**: 
1. Ensure Go dependencies are downloaded: `cd chaincodes/bobcoin && go mod tidy`
2. Check network is running
3. Verify paths in deployment script

**Problem**: `go.sum` missing  
**Solution**: Run `go mod tidy` in each chaincode directory before packaging

**Problem**: Chaincode upgrade fails  
**Solution**: 
- Increment version and sequence in redeploy script
- Ensure all peers have new version installed

### Backend API Issues

**Problem**: `Failed to connect to Fabric network`  
**Solution**:
1. Verify network is running
2. Check connection profile path in `server.js`
3. Ensure Admin certificates exist
4. Check wallet directory permissions

**Problem**: CORS errors in browser  
**Solution**: API allows all origins by default. If issues persist:
- Check server logs
- Verify `cors` middleware is enabled
- Check browser console for specific error

**Problem**: `Cannot convert to BigInt`  
**Solution**: This was fixed in BobCoin v2.2. Ensure you're using the latest version:
```bash
cd chaincodes
./redeploy-bobcoin.sh
```

### Explorer Issues

**Problem**: BobCoin component not showing  
**Solution**:
1. Rebuild Explorer client: `cd blockchain-explorer/client && npm run build`
2. Restart Explorer: `docker-compose restart`
3. Verify backend API is running on port 3002
4. Check browser console for errors

**Problem**: 401 Unauthorized errors  
**Solution**: Disable authentication in `blockchain-explorer/config.json`:
```json
{
  "enableAuthentication": false
}
```

### Mobile App Issues

**Problem**: Connection refused  
**Solution**:
1. Find your computer's IP: `ifconfig | grep "inet "`
2. Update API base URL in app: `http://YOUR_IP:3002/api/v1`
3. Ensure firewall allows port 3002
4. Verify backend API is running

**Problem**: Timeout errors  
**Solution**:
- Increase HTTP client timeout
- Check network connectivity
- Verify Fabric network is running

---

## ⚡ Performance & Consensus

### Transaction Timing

**Current Configuration**:
- **BatchTimeout**: 2 seconds
- **MaxMessageCount**: 10 transactions per block
- **Consensus**: Raft (etcdraft)

**Typical Transaction Time**: 2-5 seconds

### How to Speed Up Transactions

**Option 1**: Reduce BatchTimeout (fastest)
```yaml
# Edit fabric-samples/test-network/configtx/configtx.yaml
Orderer:
  BatchTimeout: 500ms  # Changed from 2s
```

**Option 2**: Reduce MaxMessageCount
```yaml
Orderer:
  BatchSize:
    MaxMessageCount: 5  # Changed from 10
```

**Trade-offs**:
- Faster transactions = more blocks = slightly higher overhead
- Smaller batches = faster block creation but lower throughput

### Consensus Mechanism

**Raft (etcdraft)**:
- ✅ Fault tolerant (can lose 1 node out of 3)
- ✅ Fast (no external dependencies)
- ✅ Deterministic ordering
- ⚠️ Requires majority of nodes online

**Transaction Flow**:
1. **Endorsement** (~100-500ms): Peers validate transaction
2. **Ordering** (~0-2000ms): Orderer batches transactions
3. **Validation & Commitment** (~200-1000ms): Peers validate and commit block

See [TRANSACTION_TIMING_AND_CONSENSUS.md](TRANSACTION_TIMING_AND_CONSENSUS.md) for details.

---

## 🔒 Security Notes

### Development vs Production

**Current Setup**: Development/Testing

**For Production**:
1. **Enable TLS**: Use HTTPS for backend API
2. **Authentication**: Implement JWT or OAuth
3. **Access Control**: Implement proper minter/admin roles in chaincodes
4. **Network Security**: Use proper MSP configuration
5. **Certificate Management**: Secure certificate storage
6. **Input Validation**: Validate all inputs (already done in API)
7. **Rate Limiting**: Implement rate limiting on API endpoints
8. **Monitoring**: Set up logging and monitoring

### Access Control

**BobCoin Contract**: Currently has placeholder access control. In production:
- Implement proper minter role checking
- Use MSP-based identity verification
- Add admin-only functions

**Escrow Contract**: No access control (all users can create contracts). In production:
- Verify client/freelancer identities
- Implement role-based access

**Certificate Registry**: No access control. In production:
- Verify issuer identity
- Implement certificate revocation
- Add access control for sensitive operations

### Best Practices

1. **Never commit private keys** to version control
2. **Use environment variables** for sensitive configuration
3. **Validate all inputs** before processing
4. **Implement proper error handling** (already done)
5. **Monitor network activity** via Explorer
6. **Regular backups** of wallet and certificates
7. **Keep dependencies updated** for security patches

---

## 📚 Additional Documentation

- [Network Startup Guide](START_NETWORK.md)
- [Chaincode Deployment Guide](chaincodes/DEPLOYMENT_GUIDE.md)
- [Backend API Documentation](backend-api/README.md)
- [Flutter Integration Guide](backend-api/FLUTTER_INTEGRATION.md)
- [Certificate Upgrade Guide](chaincodes/CERTIFICATE_UPGRADE.md)
- [IPFS Group Flow](chaincodes/IPFS_GROUP_FLOW.md)
- [Transaction Timing & Consensus](TRANSACTION_TIMING_AND_CONSENSUS.md)
- [BobCoin in Explorer](SHOW_BOBCOIN_IN_EXPLORER.md)

---

## 🛠️ Development

### Project Structure

- **Chaincodes**: Go-based smart contracts
- **Backend API**: Node.js/Express REST API
- **Explorer**: React frontend + Node.js backend
- **Scripts**: Bash scripts for automation

### Key Technologies

- **Hyperledger Fabric**: Blockchain framework
- **Go**: Chaincode language
- **Node.js**: Backend API
- **React**: Explorer UI
- **Docker**: Containerization
- **PostgreSQL**: Explorer database

### Version Information

- **BobCoin**: v2.2 (big.Int implementation)
- **Escrow**: v1.0
- **Certificate Registry**: v2.1 (IPFS groups)
- **Backend API**: v1.0.0
- **Fabric Network**: v2.x

---

## 📝 License

SPDX-License-Identifier: Apache-2.0

---

## 🤝 Support

For issues or questions:

1. Check relevant documentation files
2. Review troubleshooting section
3. Check Docker logs: `docker logs <container-name>`
4. Verify network status: `docker ps`
5. Test API endpoints with curl/Postman

---

## 🎉 Getting Started Checklist

- [ ] Install prerequisites (Docker, Go, Node.js)
- [ ] Clone/download project
- [ ] Start network: `./start-network.sh`
- [ ] Deploy chaincodes: `cd chaincodes && ./deploy-chaincodes.sh`
- [ ] Start backend API: `cd backend-api && npm install && npm start`
- [ ] Access Explorer: http://localhost:8080
- [ ] Test API: `curl http://localhost:3002/api/v1/bobcoin/totalSupply`
- [ ] Integrate with Flutter/React app

---

**Happy Coding! 🚀**
