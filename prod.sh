#!/bin/bash

# Everest Code - Production Start Script
set -euo pipefail

ROOT_DIR="/home/everest/Sites/everestcode.ru"
APP_DIR="$ROOT_DIR/everest-ai-editor"

echo "🏭 Starting Everest Code in PRODUCTION mode..."

cd "$ROOT_DIR"

# Stop existing processes first
echo "🔄 Stopping existing processes..."
pm2 stop everest-ai-editor 2>/dev/null || true
pm2 delete everest-ai-editor 2>/dev/null || true
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

export NODE_ENV=production
unset REACT_APP_API_URL

cd "$APP_DIR"

echo "🧹 Cleaning previous build & caches..."
rm -rf build node_modules/.cache 2>/dev/null || true

echo "📦 Installing deps (if needed)..."
if [ ! -d node_modules ]; then
  pnpm install --frozen-lockfile || npm ci || npm install
fi

echo "🔨 Building..."
pnpm run build || npm run build

echo "🚀 Starting with PM2..."
if pm2 list | grep -q "everest-ai-editor"; then
  pm2 restart everest-ai-editor
else
  pm2 start server.js --name "everest-ai-editor" --watch
fi

echo "🌐 Health check:"
sleep 2
curl -fsS https://everestcode.ru/api/health || true

echo "✅ Done. Logs: pm2 logs everest-ai-editor"


