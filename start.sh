#!/bin/bash

# Everest Code Website Start Script
echo "🚀 Запуск Everest Code website..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "everest-ai-editor/package.json" ]; then
    echo -e "${RED}❌ Ошибка: everest-ai-editor/package.json не найден. Запустите скрипт из корня проекта.${NC}"
    exit 1
fi

# Parse command line arguments
MODE="production"
if [ "$1" = "dev" ] || [ "$1" = "development" ]; then
    MODE="development"
fi

echo -e "${BLUE}📋 Режим запуска: ${MODE}${NC}"

# Stop existing processes first
echo -e "${YELLOW}🔄 Остановка существующих процессов...${NC}"
pm2 stop everest-ai-editor 2>/dev/null || true
pm2 delete everest-ai-editor 2>/dev/null || true
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

# Navigate to the project directory
cd everest-ai-editor

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Установка зависимостей...${NC}"
    npm install
fi

if [ "$MODE" = "development" ]; then
    echo -e "${YELLOW}🔧 Запуск в режиме разработки...${NC}"
    
    # Start API server in background
    echo -e "${YELLOW}🚀 Запуск API сервера...${NC}"
    npm run server &
    API_PID=$!
    
    # Wait a moment for API server to start
    sleep 3
    
    # Check if API server is running
    if curl -s http://localhost:5005/api/health > /dev/null; then
        echo -e "${GREEN}✅ API сервер запущен на порту 5005${NC}"
    else
        echo -e "${RED}❌ Ошибка запуска API сервера${NC}"
        kill $API_PID 2>/dev/null || true
        exit 1
    fi
    
    # Start Vite dev server
    echo -e "${YELLOW}🚀 Запуск Vite dev сервера...${NC}"
    npm run dev &
    VITE_PID=$!
    
    # Wait for Vite to start
    sleep 5
    
    echo -e "${GREEN}✅ Сайт запущен в режиме разработки!${NC}"
    echo -e "${GREEN}🌐 Доступен по адресам:${NC}"
    echo -e "${GREEN}   - Frontend: https://everestcode.ru${NC}"
    echo -e "${GREEN}   - API: https://everestcode.ru/api/*${NC}"
    echo -e "${GREEN}   - WebSocket: wss://everestcode.ru/terminal${NC}"
    echo -e "${GREEN}📊 Hot Module Replacement активен${NC}"
    echo -e "${YELLOW}📝 Для остановки нажмите Ctrl+C или запустите ./stop.sh${NC}"
    
    # Keep script running and handle Ctrl+C
    trap 'echo -e "\n${YELLOW}🛑 Остановка серверов...${NC}"; kill $API_PID $VITE_PID 2>/dev/null || true; exit 0' INT
    wait
    
else
    echo -e "${YELLOW}🏭 Запуск в продакшн режиме...${NC}"
    
    # Ensure clean env and clean build before compiling
    echo -e "${YELLOW}🧹 Очистка предыдущей сборки и кэшей...${NC}"
    export NODE_ENV=production
    unset REACT_APP_API_URL
    rm -rf build node_modules/.cache 2>/dev/null || true

    # Build the project
    echo -e "${YELLOW}🔨 Сборка проекта...${NC}"
    npm run build
    
    # Check if build was successful
    if [ ! -d "build" ]; then
        echo -e "${RED}❌ Ошибка сборки. Папка build не найдена.${NC}"
        exit 1
    fi
    
    # Start with PM2
    echo -e "${YELLOW}🚀 Запуск с PM2...${NC}"
    # Start (or restart if already exists) with PM2
    if pm2 list | grep -q "everest-ai-editor"; then
        pm2 restart everest-ai-editor
    else
        pm2 start server.js --name "everest-ai-editor" --watch
    fi
    
    # Check if PM2 process is running
    sleep 2
    if pm2 list | grep -q "everest-ai-editor.*online"; then
        echo -e "${GREEN}✅ Сайт запущен в продакшн режиме!${NC}"
        echo -e "${GREEN}🌐 Доступен по адресам:${NC}"
        echo -e "${GREEN}   - HTTP: http://everestcode.ru${NC}"
        echo -e "${GREEN}   - HTTPS: https://everestcode.ru${NC}"
        echo -e "${GREEN}📊 Проверить статус: pm2 status${NC}"
        echo -e "${GREEN}📝 Просмотр логов: pm2 logs everest-ai-editor${NC}"
        echo -e "${GREEN}🔎 Проверка health: curl -sSf https://everestcode.ru/api/health${NC}"
        
        # Start Prisma Studio for database browser
        echo -e "${YELLOW}🗄️  Запуск Prisma Studio для просмотра базы данных...${NC}"
        sleep 1
        
        # Start Prisma Studio in background (only if not already running)
        if ! pgrep -f "prisma studio" > /dev/null; then
            cd prisma && npx prisma studio > /dev/null 2>&1 &
            PRISMA_PID=$!
            cd ..
            echo $PRISMA_PID > /tmp/prisma-studio.pid
        fi
        
        # Wait for Prisma Studio to start
        sleep 3
        
        echo -e "${GREEN}🗄️  База данных доступна: http://localhost:5555${NC}"
        echo -e "${GREEN}   Откройте браузер и перейдите по ссылке${NC}"
    else
        echo -e "${RED}❌ Ошибка запуска сайта${NC}"
        echo -e "${YELLOW}📝 Проверить логи: pm2 logs everest-ai-editor${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}🏁 Скрипт запуска завершен${NC}"
