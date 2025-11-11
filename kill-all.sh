#!/bin/bash

# Полная остановка всех процессов проекта
echo "🛑 Полная остановка всех процессов..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Stop PM2 processes
echo -e "${YELLOW}🔄 Остановка PM2 процессов...${NC}"
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Stop all Node.js processes related to the project
echo -e "${YELLOW}🔄 Остановка Node.js процессов...${NC}"
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "node.*everest-ai-editor" 2>/dev/null || true
pkill -f "pnpm.*dev" 2>/dev/null || true
pkill -f "pnpm.*start" 2>/dev/null || true
pkill -f "concurrently" 2>/dev/null || true
pkill -f "react-scripts" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true
pkill -f "npm.*start" 2>/dev/null || true

# Stop Prisma Studio
echo -e "${YELLOW}🔄 Остановка Prisma Studio...${NC}"
pkill -f "prisma.*studio" 2>/dev/null || true

# Kill processes on specific ports
echo -e "${YELLOW}🔄 Освобождение портов...${NC}"
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5005 | xargs kill -9 2>/dev/null || true
lsof -ti:5555 | xargs kill -9 2>/dev/null || true

# Wait a moment
sleep 2

# Check if processes are stopped
echo -e "${YELLOW}🔍 Проверка процессов...${NC}"
REMAINING=$(ps aux | grep -E "(pnpm|node.*server|react-scripts|concurrently|vite)" | grep -v grep | wc -l)

if [ "$REMAINING" -eq 0 ]; then
    echo -e "${GREEN}✅ Все процессы остановлены успешно!${NC}"
else
    echo -e "${RED}⚠️  Остались процессы:${NC}"
    ps aux | grep -E "(pnpm|node.*server|react-scripts|concurrently|vite)" | grep -v grep
    echo -e "${YELLOW}📝 Для принудительной остановки запустите:${NC}"
    echo -e "${YELLOW}   pkill -9 -f 'pnpm|node.*server|react-scripts|concurrently|vite'${NC}"
fi

echo -e "${GREEN}🏁 Скрипт завершен${NC}"
