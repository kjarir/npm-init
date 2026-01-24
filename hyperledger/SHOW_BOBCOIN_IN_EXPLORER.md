# How to See BobCoin Balance in Hyperledger Explorer

## 🔍 Problem
The BobCoin balance component was added to the code, but you're running Explorer from a **pre-built Docker image** that doesn't include our custom component yet.

## ✅ Solution: Rebuild Explorer with BobCoin Component

You have **2 options**:

---

## Option 1: Build Custom Docker Image (Recommended for Docker Setup)

### Step 1: Build the Explorer with BobCoin Component

```bash
cd /Users/mohammedjarirkhan/Desktop/fabric/blockchain-explorer

# Build the client UI with our BobCoin component
cd client
npm install
npm run build
cd ..

# Build the Docker image
docker build -t hyperledger-explorer-custom .
```

### Step 2: Update docker-compose.yaml

Edit `blockchain-explorer/docker-compose.yaml`:

```yaml
explorer.mynetwork.com:
  image: hyperledger-explorer-custom  # Changed from ghcr.io/hyperledger-labs/explorer:latest
  # ... rest stays the same
```

### Step 3: Restart Explorer

```bash
cd /Users/mohammedjarirkhan/Desktop/fabric/blockchain-explorer
docker-compose down
docker-compose up -d
```

---

## Option 2: Run Explorer Locally (Easier for Development)

### Step 1: Stop Docker Explorer

```bash
cd /Users/mohammedjarirkhan/Desktop/fabric/blockchain-explorer
docker-compose down
```

### Step 2: Build and Run Locally

```bash
# Install dependencies (if not done)
cd /Users/mohammedjarirkhan/Desktop/fabric/blockchain-explorer
npm install

# Build the client UI
cd client
npm install
npm run build
cd ..

# Start the Explorer (make sure PostgreSQL is running)
npm start
```

**Note**: Make sure PostgreSQL is running. You can keep the database container running:
```bash
docker-compose up -d explorerdb.mynetwork.com
```

### Step 3: Access Explorer

Open: `http://localhost:8080`

---

## Option 3: Quick Check - Use Backend API Directly

While you rebuild, you can check your BobCoin balance directly via the API:

### Step 1: Make sure backend API is running

```bash
cd /Users/mohammedjarirkhan/Desktop/fabric/backend-api
npm start
```

### Step 2: Query BobCoin balance

```bash
# Get total supply (total minted)
curl http://localhost:3001/api/bobcoin/totalSupply

# Get balance for a specific address
curl http://localhost:3001/api/bobcoin/balance/YOUR_ADDRESS

# Get token info
curl http://localhost:3001/api/bobcoin/tokenInfo
```

Or open in browser:
- `http://localhost:3001/api/bobcoin/totalSupply`
- `http://localhost:3001/api/bobcoin/tokenInfo`

---

## 📍 Where to Find BobCoin Balance in Explorer

Once rebuilt, the BobCoin balance will appear on the **Dashboard**:

1. Open Explorer: `http://localhost:8080`
2. Go to **DASHBOARD** tab (should be default)
3. Look in the **left column** (above "Peer Name" section)
4. You'll see a card titled **"BobCoin Statistics"** showing:
   - **Total Supply (Minted)**: Total BobCoins minted
   - **Last Updated**: Timestamp

---

## 🔧 Troubleshooting

### Component not showing?

1. **Check browser console** (F12) for errors
2. **Verify backend API is running** on port 3001
3. **Check network tab** - is the API call failing?
4. **Make sure you rebuilt** the client UI (`npm run build` in `client/` directory)

### Backend API connection error?

The component tries to connect to `http://localhost:3001/api/bobcoin/totalSupply`

If your backend API is on a different port or host, edit:
```
blockchain-explorer/client/src/components/Charts/BobCoinBalance.js
```

Change line ~60:
```javascript
const response = await fetch('http://localhost:3001/api/bobcoin/totalSupply', {
```

To your API URL.

---

## 🚀 Quick Start (Recommended)

**Fastest way to see BobCoin balance:**

```bash
# 1. Stop Docker Explorer
cd /Users/mohammedjarirkhan/Desktop/fabric/blockchain-explorer
docker-compose down

# 2. Build client UI
cd client
npm install
npm run build
cd ..

# 3. Keep database running
docker-compose up -d explorerdb.mynetwork.com

# 4. Start backend API (in another terminal)
cd /Users/mohammedjarirkhan/Desktop/fabric/backend-api
npm start

# 5. Start Explorer locally
cd /Users/mohammedjarirkhan/Desktop/fabric/blockchain-explorer
npm start
```

Then open: `http://localhost:8080` and check the Dashboard!

---

## 📝 Summary

- ✅ Component is added to code
- ⚠️ Need to rebuild Explorer UI to see it
- 🔧 Use Option 2 (local) for fastest setup
- 🌐 Or use API directly: `http://localhost:3001/api/bobcoin/totalSupply`
