#!/bin/bash

echo "🚀 Компиляция и запуск Everest AI Editor Backend"

# Устанавливаем переменные окружения
export PATH="/usr/local/bin:$PATH"
export NODE_ENV=production

echo "📦 Устанавливаем зависимости..."
pnpm install --production

echo "🔨 Компиляция TypeScript (если есть)..."
# Если есть TypeScript файлы в корне
if [ -f "tsconfig.json" ]; then
  npx tsc
fi

echo "📊 Настройка базы данных..."
# Создаем базу данных, если её нет
createdb everest_ai_editor 2>/dev/null || echo "База данных уже существует"

# Создаем пользователя, если его нет
psql -c "CREATE USER everest_user WITH PASSWORD '55dff8lt';" 2>/dev/null || echo "Пользователь уже существует"
psql -c "GRANT ALL PRIVILEGES ON DATABASE everest_ai_editor TO everest_user;" 2>/dev/null || echo "Привилегии уже установлены"

echo "⚙️ Устанавливаем PM2..."
pnpm add -g pm2

echo "🚀 Запускаем приложение с PM2..."
pm2 start server.js --name "everest-ai-editor"

echo "📊 Статус PM2 процессов:"
pm2 status

echo "🌐 Приложение доступно по адресу: http://localhost:5001"
echo "📈 Мониторинг: pm2 monit"
echo "📋 Логи: pm2 logs everest-ai-editor"
echo "🔄 Перезапуск: pm2 restart everest-ai-editor"
