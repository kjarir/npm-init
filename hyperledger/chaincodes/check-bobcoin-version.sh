#!/bin/bash

# Check BobCoin chaincode version
# This script sets up the environment and queries the committed chaincode version

# Paths
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FABRIC_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FABRIC_NETWORK_DIR="$FABRIC_ROOT/fabric-samples/test-network"
FABRIC_BIN_DIR="$FABRIC_ROOT/fabric-samples/bin"

# Set environment variables
export PATH="$FABRIC_BIN_DIR:$PATH"
export FABRIC_CFG_PATH="$FABRIC_ROOT/fabric-samples/config"
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${FABRIC_NETWORK_DIR}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${FABRIC_NETWORK_DIR}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

cd "$FABRIC_NETWORK_DIR"

echo "Checking BobCoin chaincode version..."
peer lifecycle chaincode querycommitted --channelID mychannel --name bobcoin
