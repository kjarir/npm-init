# Hyperledger Fabric Network Startup Guide

This guide shows you how to start your private Hyperledger Fabric blockchain network and the Blockchain Explorer.

## Prerequisites

- Docker and Docker Compose installed
- Hyperledger Fabric binaries installed (peer, configtxgen, etc.)
- Network is stopped (if previously running)

## Step 1: Start the Fabric Network

Navigate to the test-network directory and start the network:

```bash
cd /Users/mohammedjarirkhan/Desktop/fabric/fabric-samples/test-network
./network.sh up
```

This will:
- Start 2 peer organizations (Org1 and Org2)
- Start the ordering service
- Create the necessary Docker containers

**Expected output:** You should see containers for `peer0.org1.example.com`, `peer0.org2.example.com`, and `orderer.example.com` running.

## Step 2: Create a Channel (if not already created)

```bash
cd /Users/mohammedjarirkhan/Desktop/fabric/fabric-samples/test-network
./network.sh createChannel -c mychannel
```

**Note:** If the channel already exists, you'll see an error message but that's okay - the channel is already there.

## Step 3: Deploy Chaincode (Optional - if you want to test transactions)

```bash
cd /Users/mohammedjarirkhan/Desktop/fabric/fabric-samples/test-network
./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/chaincode-javascript -ccl javascript
```

This deploys the basic asset transfer chaincode for testing.

## Step 4: Start the Blockchain Explorer

Navigate to the explorer directory and start it:

```bash
cd /Users/mohammedjarirkhan/Desktop/fabric/blockchain-explorer
docker-compose up -d
```

This will:
- Start the PostgreSQL database container
- Start the Explorer container
- Connect to the Fabric network

**Wait about 15-20 seconds** for the explorer to fully initialize and sync blocks.

## Step 5: Verify Everything is Running

Check all containers are running:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "explorer|peer|orderer"
```

You should see:
- `explorer.mynetwork.com` - Up and running on port 8080
- `explorerdb.mynetwork.com` - Up and healthy
- `peer0.org1.example.com` - Up
- `peer0.org2.example.com` - Up
- `orderer.example.com` - Up

## Step 6: Access the Explorer Web Interface

Open your web browser and navigate to:

```
http://localhost:8080
```

You should see the Hyperledger Explorer dashboard showing:
- Network overview
- Blocks and transactions
- Chaincode information
- Channel details

## Quick Start Script

If you want to start everything with one command, you can create a script:

```bash
#!/bin/bash
# Start Fabric Network
cd /Users/mohammedjarirkhan/Desktop/fabric/fabric-samples/test-network
./network.sh up
sleep 5

# Start Explorer
cd /Users/mohammedjarirkhan/Desktop/fabric/blockchain-explorer
docker-compose up -d

echo "Network and Explorer are starting..."
echo "Wait 20 seconds, then access http://localhost:8080"
```

## Stopping the Network

To stop everything:

```bash
# Stop Explorer
cd /Users/mohammedjarirkhan/Desktop/fabric/blockchain-explorer
docker-compose down

# Stop Fabric Network
cd /Users/mohammedjarirkhan/Desktop/fabric/fabric-samples/test-network
./network.sh down
```

## Troubleshooting

### Explorer not connecting?
- Make sure the Fabric network is running first
- Check logs: `docker logs explorer.mynetwork.com`
- Verify network exists: `docker network ls | grep fabric_test`

### Port 8080 already in use?
- Stop any service using port 8080
- Or change the port in `docker-compose.yaml` (line 56)

### Containers not starting?
- Check Docker is running: `docker ps`
- Check logs: `docker logs <container-name>`
- Ensure you're in the correct directory when running commands
