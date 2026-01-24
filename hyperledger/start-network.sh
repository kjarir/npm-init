#!/bin/bash

# Hyperledger Fabric Network Startup Script
# This script starts the Fabric network and Blockchain Explorer

set -e

echo "=========================================="
echo "Starting Hyperledger Fabric Network"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
FABRIC_NETWORK_DIR="$SCRIPT_DIR/fabric-samples/test-network"
EXPLORER_DIR="$SCRIPT_DIR/blockchain-explorer"

# Step 1: Start Fabric Network
echo -e "${BLUE}Step 1: Starting Fabric Network...${NC}"
cd "$FABRIC_NETWORK_DIR"
./network.sh up

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Warning: Network might already be running or there was an issue${NC}"
fi

# Wait a bit for network to stabilize
echo -e "${BLUE}Waiting for network to stabilize...${NC}"
sleep 5

# Step 2: Check if channel exists, create if not
echo -e "${BLUE}Step 2: Checking channel...${NC}"
cd "$FABRIC_NETWORK_DIR"
./network.sh createChannel -c mychannel 2>&1 | grep -q "already exists" && echo "Channel already exists" || echo "Channel created"

# Step 3: Start Explorer
echo -e "${BLUE}Step 3: Starting Blockchain Explorer...${NC}"
cd "$EXPLORER_DIR"
docker-compose up -d

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Warning: Explorer might already be running${NC}"
fi

# Wait for explorer to initialize
echo -e "${BLUE}Waiting for Explorer to initialize (this may take 15-20 seconds)...${NC}"
sleep 15

# Step 4: Verify status
echo -e "${GREEN}=========================================="
echo "Network Status Check"
echo "==========================================${NC}"

echo -e "\n${BLUE}Checking containers...${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "explorer|peer|orderer" || echo "No containers found"

echo -e "\n${BLUE}Checking Explorer logs...${NC}"
docker logs explorer.mynetwork.com --tail 5 2>&1 | grep -E "Please open|Server running|ERROR" || echo "Checking logs..."

echo -e "\n${GREEN}=========================================="
echo "Setup Complete!"
echo "==========================================${NC}"
echo -e "${GREEN}Access the Explorer at: http://localhost:8080${NC}"
echo -e "${YELLOW}Note: It may take 20-30 seconds for the Explorer to fully sync blocks${NC}"
