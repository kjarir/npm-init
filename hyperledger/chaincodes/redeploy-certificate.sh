#!/bin/bash

# Redeploy Certificate Registry Chaincode
# This script upgrades the certificate-registry chaincode to version 2.0

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
CHANNEL_NAME="mychannel"
CHAINCODE_VERSION="2.1"
SEQUENCE="3"  # Increment sequence for upgrade
CHAINCODE_NAME="certificate-registry"

# Paths
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FABRIC_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FABRIC_NETWORK_DIR="$FABRIC_ROOT/fabric-samples/test-network"
FABRIC_BIN_DIR="$FABRIC_ROOT/fabric-samples/bin"
CHAINCODE_PATH="$SCRIPT_DIR/certificate-registry"

# Check if network is running
echo -e "${BLUE}Checking if Fabric network is running...${NC}"
if ! docker ps | grep -q "peer0.org1.example.com"; then
    echo -e "${RED}Error: Fabric network is not running. Please start it first with ./start-network.sh${NC}"
    exit 1
fi

# Set environment variables
export PATH="$FABRIC_BIN_DIR:$PATH"
export FABRIC_CFG_PATH="$FABRIC_ROOT/fabric-samples/config"
export CORE_PEER_TLS_ENABLED=true

cd "$FABRIC_NETWORK_DIR"

# Download Go dependencies
echo -e "${BLUE}Downloading Go dependencies...${NC}"
cd "$CHAINCODE_PATH"
go mod tidy
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to download dependencies${NC}"
    exit 1
fi

cd "$FABRIC_NETWORK_DIR"

# Package chaincode
echo -e "${BLUE}Packaging $CHAINCODE_NAME chaincode (version $CHAINCODE_VERSION)...${NC}"
peer lifecycle chaincode package ${CHAINCODE_NAME}.tar.gz \
    --path "$CHAINCODE_PATH" \
    --lang golang \
    --label ${CHAINCODE_NAME}_${CHAINCODE_VERSION}

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to package $CHAINCODE_NAME${NC}"
    exit 1
fi

echo -e "${GREEN}✓ $CHAINCODE_NAME packaged successfully${NC}"

# Install on Org1
echo -e "${BLUE}Installing $CHAINCODE_NAME on Org1...${NC}"
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

peer lifecycle chaincode install ${CHAINCODE_NAME}.tar.gz

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install $CHAINCODE_NAME on Org1${NC}"
    exit 1
fi

echo -e "${GREEN}✓ $CHAINCODE_NAME installed on Org1${NC}"

# Install on Org2
echo -e "${BLUE}Installing $CHAINCODE_NAME on Org2...${NC}"
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051

peer lifecycle chaincode install ${CHAINCODE_NAME}.tar.gz

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install $CHAINCODE_NAME on Org2${NC}"
    exit 1
fi

echo -e "${GREEN}✓ $CHAINCODE_NAME installed on Org2${NC}"

# Get package ID
PACKAGE_ID=$(peer lifecycle chaincode queryinstalled --output json | jq -r '.installed_chaincodes[] | select(.label=="'${CHAINCODE_NAME}_${CHAINCODE_VERSION}'") | .package_id')
echo -e "${BLUE}Package ID: $PACKAGE_ID${NC}"

# Approve for Org1
echo -e "${BLUE}Approving $CHAINCODE_NAME for Org1...${NC}"
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

peer lifecycle chaincode approveformyorg \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --channelID $CHANNEL_NAME \
    --name $CHAINCODE_NAME \
    --version $CHAINCODE_VERSION \
    --package-id $PACKAGE_ID \
    --sequence $SEQUENCE \
    --tls \
    --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to approve $CHAINCODE_NAME for Org1${NC}"
    exit 1
fi

echo -e "${GREEN}✓ $CHAINCODE_NAME approved for Org1${NC}"

# Approve for Org2
echo -e "${BLUE}Approving $CHAINCODE_NAME for Org2...${NC}"
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051

peer lifecycle chaincode approveformyorg \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --channelID $CHANNEL_NAME \
    --name $CHAINCODE_NAME \
    --version $CHAINCODE_VERSION \
    --package-id $PACKAGE_ID \
    --sequence $SEQUENCE \
    --tls \
    --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to approve $CHAINCODE_NAME for Org2${NC}"
    exit 1
fi

echo -e "${GREEN}✓ $CHAINCODE_NAME approved for Org2${NC}"

# Commit (upgrade)
echo -e "${BLUE}Committing (upgrading) $CHAINCODE_NAME to channel...${NC}"
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

peer lifecycle chaincode commit \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --channelID $CHANNEL_NAME \
    --name $CHAINCODE_NAME \
    --version $CHAINCODE_VERSION \
    --sequence $SEQUENCE \
    --tls \
    --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
    --peerAddresses localhost:7051 \
    --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
    --peerAddresses localhost:9051 \
    --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to commit $CHAINCODE_NAME${NC}"
    exit 1
fi

echo -e "${GREEN}✓ $CHAINCODE_NAME upgraded to version $CHAINCODE_VERSION${NC}"

# Summary
echo -e "${GREEN}=========================================="
echo "Certificate Registry Upgrade Complete!"
echo "==========================================${NC}"
echo -e "${GREEN}Chaincode: $CHAINCODE_NAME${NC}"
echo -e "${GREEN}Version: $CHAINCODE_VERSION${NC}"
echo -e "${GREEN}Sequence: $SEQUENCE${NC}"
echo -e "${GREEN}Channel: $CHANNEL_NAME${NC}"
echo -e "${GREEN}Package ID: $PACKAGE_ID${NC}"
echo ""
echo -e "${YELLOW}New Functions Available:${NC}"
echo "  - RegisterProject (updated - creates IPFS group)"
echo "  - RegisterContractCertificate (new - adds freelancer to group)"
echo "  - RegisterMilestoneCertificate (new - links to group)"
echo "  - GetIPFSGroup (new)"
echo "  - GetGroupMembers (new)"
echo "  - GetCertificatesByGroup (new - for rating/review)"
echo "  - GetProject"
echo "  - GetAllCertificates"
echo "  - UpdateCertificateStatus"
echo "  - DeleteCertificate"
echo ""
echo -e "${YELLOW}IPFS Group Flow:${NC}"
echo "  1. Project posted -> IPFS group created, client added"
echo "  2. Contract signed -> Freelancer added to group, contract cert issued"
echo "  3. Milestones completed -> Milestone certs added to same group"
echo "  4. End of project -> GetCertificatesByGroup() for rating/review"
echo ""
echo -e "${YELLOW}Note: RegisterProject now requires ipfsGroupHash as 10th argument${NC}"
echo -e "${YELLOW}      See IPFS_GROUP_FLOW.md for detailed documentation${NC}"
