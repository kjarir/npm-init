# Code Review: Backend API Server

## Issues Found in Original Code

### 1. **SDK Package Issue**
- **Problem**: Code imports `fabric-network` but doesn't handle the case where it might not be installed, or if the newer `@hyperledger/fabric-gateway` is preferred.
- **Fix**: Added fallback logic to try `@hyperledger/fabric-gateway` first (newer, recommended), then fall back to `fabric-network`.

### 2. **Connection Profile Structure**
- **Problem**: The default connection profile structure didn't match what `fabric-network` expects. Missing proper TLS configuration and peer/orderer structure.
- **Fix**: 
  - First tries to load from `blockchain-explorer/connection-profile/test-network.json` (which is already configured)
  - Falls back to a properly structured default profile with correct TLS paths

### 3. **TLS Configuration**
- **Problem**: Using `grpc://` instead of `grpcs://` for TLS connections. The test network uses TLS.
- **Fix**: Changed to `grpcs://` and added proper TLS certificate paths.

### 4. **Identity/Wallet Setup**
- **Problem**: Code assumes user exists in wallet but doesn't provide a way to create it initially.
- **Fix**: 
  - Automatically tries to create identity from Admin certificate if user doesn't exist
  - Created `enrollUser.js` helper script for manual enrollment
  - Handles both SDK identity formats

### 5. **Error Handling**
- **Problem**: Limited error messages, no helpful hints.
- **Fix**: Added better error messages with hints on how to fix issues.

### 6. **Connection Profile Path Resolution**
- **Problem**: Hardcoded paths might not work on all systems.
- **Fix**: Uses `path.join(__dirname, ...)` for proper path resolution.

### 7. **Missing Dependencies**
- **Problem**: No `package.json` file.
- **Fix**: Created `package.json` with all required dependencies.

## Key Improvements

1. ✅ **Dual SDK Support**: Works with both `@hyperledger/fabric-gateway` and `fabric-network`
2. ✅ **Auto Identity Creation**: Automatically creates wallet identity from Admin cert
3. ✅ **Better Connection Profile**: Loads from Explorer config or uses proper defaults
4. ✅ **Proper TLS**: Correctly configured for TLS connections
5. ✅ **Better Error Messages**: Helpful error messages with hints
6. ✅ **JSON Parsing**: Automatically parses JSON responses from chaincode
7. ✅ **Environment Variables**: Supports configuration via env vars

## Usage

1. **Install dependencies:**
   ```bash
   cd backend-api
   npm install
   ```

2. **Enroll user (optional - server will try to do this automatically):**
   ```bash
   node enrollUser.js
   ```

3. **Start server:**
   ```bash
   npm start
   ```

4. **Connect to Fabric:**
   ```bash
   curl -X POST http://localhost:3001/api/fabric/connect
   ```

## Testing

```bash
# Check status
curl http://localhost:3001/api/fabric/status

# Query BobCoin balance
curl -X POST http://localhost:3001/api/fabric/query \
  -H "Content-Type: application/json" \
  -d '{
    "contractName": "bobcoin",
    "functionName": "BalanceOf",
    "args": ["user123"]
  }'
```

## Notes

- Make sure Fabric network is running before connecting
- The server uses `localhost` for connections (asLocalhost: true)
- For production, you may want to disable `asLocalhost` and use proper hostnames
