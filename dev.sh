#!/bin/bash

# Everest Code - Development Start Script
set -euo pipefail

ROOT_DIR="/home/everest/Sites/everestcode.ru"
APP_DIR="$ROOT_DIR/everest-ai-editor"

echo "🔧 Starting Everest Code in DEVELOPMENT mode..."

cd "$ROOT_DIR"

# Stop existing processes first
echo "🔄 Stopping existing processes..."
pm2 stop everest-ai-editor 2>/dev/null || true
pm2 delete everest-ai-editor 2>/dev/null || true
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

export NODE_ENV=development

cd "$APP_DIR"

if [ ! -d node_modules ]; then
  echo "📦 Installing dependencies..."
  pnpm install || npm install
fi

echo "🚀 Launching dev servers (backend + frontend) ..."
pnpm run dev || npm run dev


