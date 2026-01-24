#!/bin/bash

# Backend API Server Startup Script
# Automatically handles port conflicts and starts the server

PORT=3002
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Starting Fabric Backend API Server..."
echo ""

# Kill any process using port 3002
if lsof -ti:$PORT > /dev/null 2>&1; then
    echo "⚠️  Port $PORT is in use. Killing existing process..."
    lsof -ti:$PORT | xargs kill -9 2>/dev/null
    sleep 2
    echo "✅ Port cleared"
    echo ""
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Start the server
echo "▶️  Starting server on port $PORT..."
echo ""
npm start
