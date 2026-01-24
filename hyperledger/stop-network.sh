#!/bin/bash

# Hyperledger Fabric Network Shutdown Script
# This script stops the Fabric network and Blockchain Explorer

set -e

echo "=========================================="
echo "Stopping Hyperledger Fabric Network"
echo "=========================================="

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
EXPLORER_DIR="$SCRIPT_DIR/blockchain-explorer"
FABRIC_NETWORK_DIR="$SCRIPT_DIR/fabric-samples/test-network"

# Step 1: Stop Explorer
echo -e "${BLUE}Stopping Blockchain Explorer...${NC}"
cd "$EXPLORER_DIR"
docker-compose down

# Step 2: Stop Fabric Network
echo -e "${BLUE}Stopping Fabric Network...${NC}"
cd "$FABRIC_NETWORK_DIR"
./network.sh down

echo -e "${GREEN}=========================================="
echo "Network Stopped Successfully"
echo "==========================================${NC}"
