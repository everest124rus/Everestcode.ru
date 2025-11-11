#!/bin/bash

# Everest Code - Stop All Processes
set -euo pipefail

echo "🛑 Stopping Everest Code processes..."

# Stop PM2 process
pm2 stop everest-ai-editor 2>/dev/null || true
pm2 delete everest-ai-editor 2>/dev/null || true

# Kill node servers & dev servers
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "prisma studio" 2>/dev/null || true

# Free common ports (ignore errors if already free)
kill -9 $(lsof -ti -sTCP:LISTEN -i:5005) 2>/dev/null || true
kill -9 $(lsof -ti -sTCP:LISTEN -i:3000) 2>/dev/null || true
kill -9 $(lsof -ti -sTCP:LISTEN -i:5555) 2>/dev/null || true

echo "✅ All processes stopped."

#!/bin/bash

# Everest Code Website Stop Script
echo "🛑 Остановка Everest Code website..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Stop PM2 processes
echo -e "${YELLOW}🔄 Остановка PM2 процессов...${NC}"
pm2 stop everest-ai-editor 2>/dev/null || true
pm2 delete everest-ai-editor 2>/dev/null || true
pm2 stop prisma-studio 2>/dev/null || true
pm2 delete prisma-studio 2>/dev/null || true

# Stop Prisma Studio processes
echo -e "${YELLOW}🔄 Остановка Prisma Studio...${NC}"
if [ -f "/tmp/prisma-studio.pid" ]; then
    kill $(cat /tmp/prisma-studio.pid) 2>/dev/null || true
    rm /tmp/prisma-studio.pid 2>/dev/null || true
fi
pkill -f "prisma studio" 2>/dev/null || true
pkill -f "npx prisma" 2>/dev/null || true

# Stop any running Node.js processes on port 5005
echo -e "${YELLOW}🔄 Остановка процессов на порту 5005...${NC}"
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "node.*everest-ai-editor" 2>/dev/null || true

# Stop any running Vite dev processes
echo -e "${YELLOW}🔄 Остановка Vite dev процессов...${NC}"
pkill -f "vite" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true

# Check if processes are stopped
sleep 2
if ! pgrep -f "node.*server.js" > /dev/null && ! pgrep -f "vite" > /dev/null; then
    echo -e "${GREEN}✅ Все процессы остановлены успешно!${NC}"
else
    echo -e "${RED}⚠️  Некоторые процессы могут быть еще активны${NC}"
    echo -e "${YELLOW}📝 Проверьте процессы вручную:${NC}"
    echo -e "${YELLOW}   pm2 list${NC}"
    echo -e "${YELLOW}   ps aux | grep -E '(node|vite)'${NC}"
fi

echo -e "${GREEN}🏁 Скрипт остановки завершен${NC}"
