# Chaincode Deployment Guide

This guide explains how to deploy the three smart contracts to your Hyperledger Fabric network.

## Prerequisites

1. Fabric network is running (`./start-network.sh`)
2. Channel `mychannel` exists
3. Go installed (for building chaincode)
4. `jq` installed (`brew install jq` on macOS)

## Quick Deployment

Run the automated deployment script:

```bash
cd /Users/mohammedjarirkhan/Desktop/fabric/chaincodes
./deploy-chaincodes.sh
```

This will:
- Package all 3 chaincodes
- Install them on both peers (Org1 and Org2)
- Approve them for both organizations
- Commit them to the channel
- Initialize each contract

## Manual Deployment Steps

If you prefer to deploy manually:

### 1. Package Chaincode

```bash
cd /Users/mohammedjarirkhan/Desktop/fabric/fabric-samples/test-network

# Set environment
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/configtx

# Package BobCoin
peer lifecycle chaincode package bobcoin.tar.gz \
  --path ../chaincodes/bobcoin \
  --lang golang \
  --label bobcoin_1.0

# Package Escrow
peer lifecycle chaincode package escrow.tar.gz \
  --path ../chaincodes/escrow \
  --lang golang \
  --label escrow_1.0

# Package Certificate Registry
peer lifecycle chaincode package certificate-registry.tar.gz \
  --path ../chaincodes/certificate-registry \
  --lang golang \
  --label certificate-registry_1.0
```

### 2. Install on Org1 Peer

```bash
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

peer lifecycle chaincode install bobcoin.tar.gz
peer lifecycle chaincode install escrow.tar.gz
peer lifecycle chaincode install certificate-registry.tar.gz
```

### 3. Install on Org2 Peer

```bash
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051

peer lifecycle chaincode install bobcoin.tar.gz
peer lifecycle chaincode install escrow.tar.gz
peer lifecycle chaincode install certificate-registry.tar.gz
```

### 4. Get Package IDs

```bash
# Get package IDs (save these)
peer lifecycle chaincode queryinstalled --output json | jq -r '.installed_chaincodes[] | select(.label=="bobcoin_1.0") | .package_id'
peer lifecycle chaincode queryinstalled --output json | jq -r '.installed_chaincodes[] | select(.label=="escrow_1.0") | .package_id'
peer lifecycle chaincode queryinstalled --output json | jq -r '.installed_chaincodes[] | select(.label=="certificate-registry_1.0") | .package_id'
```

### 5. Approve for Org1

```bash
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

# Replace PACKAGE_ID with actual package ID from step 4
peer lifecycle chaincode approveformyorg \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --channelID mychannel \
  --name bobcoin \
  --version 1.0 \
  --package-id <PACKAGE_ID> \
  --sequence 1 \
  --tls \
  --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

# Repeat for escrow and certificate-registry
```

### 6. Approve for Org2

```bash
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051

# Repeat approveformyorg commands for all three chaincodes
```

### 7. Commit to Channel

```bash
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

peer lifecycle chaincode commit \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --channelID mychannel \
  --name bobcoin \
  --version 1.0 \
  --sequence 1 \
  --tls \
  --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt

# Repeat for escrow and certificate-registry
```

### 8. Initialize Contracts

```bash
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  -C mychannel \
  -n bobcoin \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt \
  -c '{"function":"InitLedger","Args":[]}'

# Repeat for escrow and certificate-registry
```

## Verify Deployment

Check that chaincodes are committed:

```bash
peer lifecycle chaincode querycommitted --channelID mychannel --name bobcoin
peer lifecycle chaincode querycommitted --channelID mychannel --name escrow
peer lifecycle chaincode querycommitted --channelID mychannel --name certificate-registry
```

## Chaincode Information

After deployment, you'll have:

- **Chaincode Names:**
  - `bobcoin`
  - `escrow`
  - `certificate-registry`

- **Channel:** `mychannel`

- **Version:** `1.0`

- **Sequence:** `1`

## Testing the Contracts

### Test BobCoin

```bash
# Query balance
peer chaincode query -C mychannel -n bobcoin -c '{"function":"BalanceOf","Args":["user123"]}'

# Mint tokens
peer chaincode invoke -C mychannel -n bobcoin -c '{"function":"Mint","Args":["user123","1000.0"]}' \
  --peerAddresses localhost:7051 --tlsRootCertFiles ... \
  --peerAddresses localhost:9051 --tlsRootCertFiles ...
```

## Next Steps

1. Set up backend API (see `examples/backend-api-example.js`)
2. Integrate with your React/Flutter frontend
3. Test all contract functions
4. Deploy to production network
