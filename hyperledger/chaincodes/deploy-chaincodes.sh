#!/bin/bash

# Deploy Chaincodes to Hyperledger Fabric Network
# This script packages, installs, approves, and commits all three chaincodes

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
CHANNEL_NAME="mychannel"
CHAINCODE_VERSION="1.0"
SEQUENCE="1"

# Chaincode names
BOBCOIN_CC="bobcoin"
ESCROW_CC="escrow"
CERTIFICATE_CC="certificate-registry"

# Paths - Get absolute paths
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FABRIC_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FABRIC_NETWORK_DIR="$FABRIC_ROOT/fabric-samples/test-network"
FABRIC_BIN_DIR="$FABRIC_ROOT/fabric-samples/bin"
CHAINCODES_DIR="$SCRIPT_DIR"

# Check if network is running
echo -e "${BLUE}Checking if Fabric network is running...${NC}"
if ! docker ps | grep -q "peer0.org1.example.com"; then
    echo -e "${RED}Error: Fabric network is not running. Please start it first with ./start-network.sh${NC}"
    exit 1
fi

# Set environment variables - MUST be done before any peer commands
export PATH="$FABRIC_BIN_DIR:$PATH"
# FABRIC_CFG_PATH should point to config directory for peer commands
export FABRIC_CFG_PATH="$FABRIC_ROOT/fabric-samples/config"
export CORE_PEER_TLS_ENABLED=true

# Verify peer command is available
if [ ! -f "$FABRIC_BIN_DIR/peer" ]; then
    echo -e "${RED}Error: peer binary not found at $FABRIC_BIN_DIR/peer${NC}"
    echo -e "${YELLOW}Please ensure Fabric binaries are installed.${NC}"
    exit 1
fi

# Verify peer is in PATH
if ! command -v peer &> /dev/null; then
    echo -e "${RED}Error: peer command not found in PATH${NC}"
    echo -e "${YELLOW}Trying to use: $FABRIC_BIN_DIR/peer${NC}"
    export PATH="$FABRIC_BIN_DIR:$PATH"
fi

cd "$FABRIC_NETWORK_DIR"

# Function to package chaincode
package_chaincode() {
    local CC_NAME=$1
    local CC_PATH=$2
    
    echo -e "${BLUE}Packaging $CC_NAME chaincode...${NC}"
    echo -e "${BLUE}Using path: $CC_PATH${NC}"
    
    # Download Go dependencies first
    echo -e "${BLUE}Downloading Go dependencies for $CC_NAME...${NC}"
    cd "$CC_PATH"
    go mod tidy
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to download dependencies for $CC_NAME${NC}"
        exit 1
    fi
    
    # Ensure we're in the network directory for packaging
    cd "$FABRIC_NETWORK_DIR"
    
    peer lifecycle chaincode package ${CC_NAME}.tar.gz \
        --path "$CC_PATH" \
        --lang golang \
        --label ${CC_NAME}_${CHAINCODE_VERSION}
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to package $CC_NAME${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ $CC_NAME packaged successfully${NC}"
}

# Function to install chaincode on peer
install_chaincode() {
    local CC_NAME=$1
    local ORG=$2
    
    echo -e "${BLUE}Installing $CC_NAME on $ORG...${NC}"
    
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="${ORG}MSP"
    
    if [ "$ORG" == "Org1" ]; then
        export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
        export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
        export CORE_PEER_ADDRESS=localhost:7051
    else
        export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
        export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
        export CORE_PEER_ADDRESS=localhost:9051
    fi
    
    peer lifecycle chaincode install ${CC_NAME}.tar.gz
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install $CC_NAME on $ORG${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ $CC_NAME installed on $ORG${NC}"
}

# Function to get package ID
get_package_id() {
    local CC_NAME=$1
    peer lifecycle chaincode queryinstalled --output json | jq -r '.installed_chaincodes[] | select(.label=="'${CC_NAME}_${CHAINCODE_VERSION}'") | .package_id'
}

# Function to approve chaincode
approve_chaincode() {
    local CC_NAME=$1
    local PACKAGE_ID=$2
    local ORG=$3
    
    echo -e "${BLUE}Approving $CC_NAME for $ORG...${NC}"
    
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="${ORG}MSP"
    
    if [ "$ORG" == "Org1" ]; then
        export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
        export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
        export CORE_PEER_ADDRESS=localhost:7051
    else
        export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
        export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
        export CORE_PEER_ADDRESS=localhost:9051
    fi
    
    peer lifecycle chaincode approveformyorg \
        -o localhost:7050 \
        --ordererTLSHostnameOverride orderer.example.com \
        --channelID $CHANNEL_NAME \
        --name $CC_NAME \
        --version $CHAINCODE_VERSION \
        --package-id $PACKAGE_ID \
        --sequence $SEQUENCE \
        --tls \
        --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to approve $CC_NAME for $ORG${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ $CC_NAME approved for $ORG${NC}"
}

# Function to commit chaincode
commit_chaincode() {
    local CC_NAME=$1
    
    echo -e "${BLUE}Committing $CC_NAME to channel...${NC}"
    
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="Org1MSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
    export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
    export CORE_PEER_ADDRESS=localhost:7051
    
    peer lifecycle chaincode commit \
        -o localhost:7050 \
        --ordererTLSHostnameOverride orderer.example.com \
        --channelID $CHANNEL_NAME \
        --name $CC_NAME \
        --version $CHAINCODE_VERSION \
        --sequence $SEQUENCE \
        --tls \
        --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
        --peerAddresses localhost:7051 \
        --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
        --peerAddresses localhost:9051 \
        --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to commit $CC_NAME${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ $CC_NAME committed to channel${NC}"
}

# Deploy BobCoin
echo -e "${YELLOW}=========================================="
echo "Deploying BobCoin Token Contract"
echo "==========================================${NC}"

package_chaincode $BOBCOIN_CC "$CHAINCODES_DIR/bobcoin"
install_chaincode $BOBCOIN_CC "Org1"
install_chaincode $BOBCOIN_CC "Org2"

BOBCOIN_PACKAGE_ID=$(get_package_id $BOBCOIN_CC)
echo -e "${BLUE}BobCoin Package ID: $BOBCOIN_PACKAGE_ID${NC}"

approve_chaincode $BOBCOIN_CC $BOBCOIN_PACKAGE_ID "Org1"
approve_chaincode $BOBCOIN_CC $BOBCOIN_PACKAGE_ID "Org2"
commit_chaincode $BOBCOIN_CC

# Initialize BobCoin
echo -e "${BLUE}Initializing BobCoin contract...${NC}"
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

peer chaincode invoke \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls \
    --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
    -C $CHANNEL_NAME \
    -n $BOBCOIN_CC \
    --peerAddresses localhost:7051 \
    --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
    --peerAddresses localhost:9051 \
    --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt \
    -c '{"function":"InitLedger","Args":[]}'

echo -e "${GREEN}✓ BobCoin initialized${NC}"

# Deploy Escrow
echo -e "${YELLOW}=========================================="
echo "Deploying Escrow Contract"
echo "==========================================${NC}"

package_chaincode $ESCROW_CC "$CHAINCODES_DIR/escrow"
install_chaincode $ESCROW_CC "Org1"
install_chaincode $ESCROW_CC "Org2"

ESCROW_PACKAGE_ID=$(get_package_id $ESCROW_CC)
echo -e "${BLUE}Escrow Package ID: $ESCROW_PACKAGE_ID${NC}"

approve_chaincode $ESCROW_CC $ESCROW_PACKAGE_ID "Org1"
approve_chaincode $ESCROW_CC $ESCROW_PACKAGE_ID "Org2"
commit_chaincode $ESCROW_CC

# Initialize Escrow
echo -e "${BLUE}Initializing Escrow contract...${NC}"
peer chaincode invoke \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls \
    --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
    -C $CHANNEL_NAME \
    -n $ESCROW_CC \
    --peerAddresses localhost:7051 \
    --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
    --peerAddresses localhost:9051 \
    --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt \
    -c '{"function":"InitLedger","Args":[]}'

echo -e "${GREEN}✓ Escrow initialized${NC}"

# Deploy Certificate Registry
echo -e "${YELLOW}=========================================="
echo "Deploying Certificate Registry Contract"
echo "==========================================${NC}"

package_chaincode $CERTIFICATE_CC "$CHAINCODES_DIR/certificate-registry"
install_chaincode $CERTIFICATE_CC "Org1"
install_chaincode $CERTIFICATE_CC "Org2"

CERTIFICATE_PACKAGE_ID=$(get_package_id $CERTIFICATE_CC)
echo -e "${BLUE}Certificate Registry Package ID: $CERTIFICATE_PACKAGE_ID${NC}"

approve_chaincode $CERTIFICATE_CC $CERTIFICATE_PACKAGE_ID "Org1"
approve_chaincode $CERTIFICATE_CC $CERTIFICATE_PACKAGE_ID "Org2"
commit_chaincode $CERTIFICATE_CC

# Initialize Certificate Registry
echo -e "${BLUE}Initializing Certificate Registry contract...${NC}"
peer chaincode invoke \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls \
    --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
    -C $CHANNEL_NAME \
    -n $CERTIFICATE_CC \
    --peerAddresses localhost:7051 \
    --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
    --peerAddresses localhost:9051 \
    --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt \
    -c '{"function":"InitLedger","Args":[]}'

echo -e "${GREEN}✓ Certificate Registry initialized${NC}"

# Summary
echo -e "${GREEN}=========================================="
echo "Deployment Complete!"
echo "==========================================${NC}"
echo -e "${GREEN}Chaincode Names:${NC}"
echo "  - BobCoin: $BOBCOIN_CC"
echo "  - Escrow: $ESCROW_CC"
echo "  - Certificate Registry: $CERTIFICATE_CC"
echo ""
echo -e "${GREEN}Channel: $CHANNEL_NAME${NC}"
echo -e "${GREEN}Version: $CHAINCODE_VERSION${NC}"
echo ""
echo -e "${YELLOW}Package IDs:${NC}"
echo "  - BobCoin: $BOBCOIN_PACKAGE_ID"
echo "  - Escrow: $ESCROW_PACKAGE_ID"
echo "  - Certificate Registry: $CERTIFICATE_PACKAGE_ID"
