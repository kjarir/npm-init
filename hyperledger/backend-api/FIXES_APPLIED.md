# Backend API Fixes Applied

## ✅ Issues Fixed

### 1. Port Conflict Error (EADDRINUSE)
**Problem**: Port 3002 already in use  
**Fix**: 
- Added error handling in `server.js` to detect and report port conflicts
- Created `start-server.sh` script that automatically kills processes on port 3002
- Added graceful shutdown handlers

**Solution**: Use the startup script:
```bash
cd /Users/mohammedjarirkhan/Desktop/fabric/backend-api && ./start-server.sh
```

Or manually clear port:
```bash
lsof -ti:3002 | xargs kill -9
cd /Users/mohammedjarirkhan/Desktop/fabric/backend-api && npm start
```

### 2. BobCoin Transactions Not Visible
**Problem**: `/api/v1/bobcoin/transactions` endpoint not returning transactions  
**Fix**:
- Updated to use correct Explorer API endpoint: `/api/txList/:channel_genesis_hash/:blocknum/:txid`
- Added channel genesis hash lookup from `/api/channels/info`
- Improved transaction parsing from Explorer's `write_set` field
- Added support for Mint, Burn, and Transfer transactions
- Added better error handling and fallbacks

**How it works now**:
1. Gets channel genesis hash from Explorer
2. Queries `/api/txList/` endpoint with proper parameters
3. Parses `write_set` to extract function name and arguments
4. Categorizes transactions as Mint/Burn/Transfer
5. Returns formatted transaction data

## 🚀 How to Start Server (No Errors)

### Option 1: Use Startup Script (Recommended)
```bash
cd /Users/mohammedjarirkhan/Desktop/fabric/backend-api
./start-server.sh
```

### Option 2: Manual Start
```bash
# Clear port first
lsof -ti:3002 | xargs kill -9 2>/dev/null

# Start server
cd /Users/mohammedjarirkhan/Desktop/fabric/backend-api
npm start
```

## 📊 Testing BobCoin Transactions

### 1. Make sure you have executed some BobCoin transactions:
```bash
# Mint some coins
curl -X POST http://localhost:3002/api/v1/bobcoin/mint \
  -H "Content-Type: application/json" \
  -d '{"to": "user123", "amount": "1000"}'

# Transfer coins
curl -X POST http://localhost:3002/api/v1/bobcoin/transfer \
  -H "Content-Type: application/json" \
  -d '{"from": "user123", "to": "user456", "amount": "100"}'
```

### 2. Query transactions:
```bash
curl http://localhost:3002/api/v1/bobcoin/transactions
```

### 3. Check in browser:
Open: `http://localhost:3002/api/v1/bobcoin/transactions`

## 🔍 Troubleshooting

### If transactions still don't show:

1. **Check Explorer is running**:
   ```bash
   docker ps | grep explorer
   ```

2. **Check Explorer API is accessible**:
   ```bash
   curl http://localhost:8080/api/channels/info
   ```

3. **Verify BobCoin transactions exist**:
   - Go to Explorer UI: http://localhost:8080
   - Navigate to TRANSACTIONS tab
   - Filter by chaincode: `bobcoin`
   - If no transactions, execute some Mint/Burn/Transfer operations first

4. **Check server logs**:
   Look for messages like:
   - `⚠️  Explorer API not available` - Explorer might be down
   - `⚠️  Could not get channel genesis hash` - Channel not found in Explorer
   - `ℹ️  No BobCoin transactions found` - No transactions to display

## 📝 API Endpoints

### BobCoin Transactions
```
GET /api/v1/bobcoin/transactions?limit=50
```

**Response**:
```json
{
  "success": true,
  "message": "Transactions retrieved successfully",
  "data": {
    "minted": [...],
    "burned": [...],
    "transfers": [...],
    "totalMinted": 5,
    "totalBurned": 2,
    "totalTransfers": 10,
    "summary": {
      "totalTransactions": 17,
      "totalMintedAmount": "5000",
      "totalBurnedAmount": "1000",
      "formattedTotalMinted": "5000.0",
      "formattedTotalBurned": "1000.0"
    }
  }
}
```

## ✅ All Fixed!

The server should now:
- ✅ Start without port conflicts (auto-handled)
- ✅ Show BobCoin transactions from Explorer
- ✅ Handle errors gracefully
- ✅ Provide helpful error messages
