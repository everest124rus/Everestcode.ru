# 🚀 Настройка параллельной разработки

## Идея
Держать **стабильную версию в production** и **разрабатывать новое на localhost** параллельно.

---

## 📁 Вариант 1: Две папки (Простой способ)

### Структура:
```
/home/everest/Sites/
├── everestcode.ru/              # Production (стабильная версия)
│   └── everest-ai-editor/
│       ├── server.js
│       └── ...
│
└── everestcode-dev/             # Development (разработка)
    └── everest-ai-editor/
        ├── server.js
        └── ...
```

### Шаги:

1. **Создайте папку для разработки:**
```bash
cd /home/everest/Sites
cp -r everestcode.ru everestcode-dev
cd everestcode-dev/everest-ai-editor
```

2. **Настройте порты для dev версии:**
   - Откройте `package.json` в dev папке
   - Измените порты (чтобы не конфликтовали с production):
     ```json
     {
       "scripts": {
         "client": "PORT=3001 react-scripts start",
         "server": "PORT=5006 node server.js"
       }
     }
     ```

3. **Запуск:**
   - **Production:** `cd /home/everest/Sites/everestcode.ru/everest-ai-editor && pnpm dev`
   - **Development:** `cd /home/everest/Sites/everestcode-dev/everest-ai-editor && pnpm dev`

---

## 🌿 Вариант 2: Git ветки (Рекомендуемый)

### Структура веток:
- `main` или `master` - стабильная версия (production)
- `develop` или `dev` - версия для разработки

### Шаги:

1. **Создайте ветку для разработки:**
```bash
cd /home/everest/Sites/everestcode.ru/everest-ai-editor
git checkout -b develop
```

2. **Настройте разные порты для dev:**
   - Создайте файл `.env.development`:
     ```
     PORT=3001
     REACT_APP_API_URL=http://localhost:5006
     ```

3. **Работа с ветками:**

   **Переключиться на разработку:**
   ```bash
   git checkout develop
   pnpm dev  # Запустится на localhost:3001
   ```

   **Переключиться на production:**
   ```bash
   git checkout main
   # Запустите production сервер
   ```

   **Когда готово - перенести изменения в production:**
   ```bash
   git checkout main
   git merge develop
   # Протестируйте на production
   git push origin main
   ```

---

## 🔄 Вариант 3: PM2 (Профессиональный)

PM2 позволяет запускать несколько версий одновременно.

### Установка:
```bash
npm install -g pm2
```

### Настройка:

1. **Создайте файл `ecosystem.config.js` в корне проекта:**
```javascript
module.exports = {
  apps: [
    {
      name: 'everest-production',
      script: 'server.js',
      cwd: '/home/everest/Sites/everestcode.ru/everest-ai-editor',
      env: {
        NODE_ENV: 'production',
        PORT: 5005
      }
    },
    {
      name: 'everest-development',
      script: 'server.js',
      cwd: '/home/everest/Sites/everestcode-dev/everest-ai-editor',
      env: {
        NODE_ENV: 'development',
        PORT: 5006
      }
    }
  ]
};
```

2. **Управление:**
```bash
# Запустить production
pm2 start ecosystem.config.js --only everest-production

# Запустить development
pm2 start ecosystem.config.js --only everest-development

# Посмотреть статус
pm2 status

# Остановить
pm2 stop everest-production
pm2 stop everest-development

# Логи
pm2 logs everest-development
```

---

## 📝 Рекомендации

### Для начинающих:
✅ **Вариант 1 (Две папки)** - самый простой, не требует знания Git

### Для продвинутых:
✅ **Вариант 2 (Git ветки)** - правильный подход, позволяет отслеживать изменения

### Для продакшена:
✅ **Вариант 3 (PM2)** - профессиональный подход, автоматический перезапуск при сбоях

---

## ⚠️ Важно

1. **Не редактируйте production напрямую** - всегда тестируйте в dev
2. **Делайте бэкапы** перед переносом изменений в production
3. **Тестируйте на dev** перед деплоем в production
4. **Используйте Git** для отслеживания изменений

---

## 🎯 Типичный workflow

1. **Разработка:**
   ```bash
   cd /home/everest/Sites/everestcode-dev/everest-ai-editor
   # Вносите изменения
   pnpm dev  # Тестируйте на localhost:3001
   ```

2. **Когда готово:**
   ```bash
   # Скопируйте изменения в production
   cp -r src/ /home/everest/Sites/everestcode.ru/everest-ai-editor/
   # Или используйте Git merge
   ```

3. **Деплой в production:**
   ```bash
   cd /home/everest/Sites/everestcode.ru/everest-ai-editor
   # Перезапустите сервер
   ```

---

## 🔧 Быстрая настройка (Вариант 1)

Выполните эти команды для создания dev версии:

```bash
# Создайте папку для разработки
cd /home/everest/Sites
cp -r everestcode.ru everestcode-dev

# Настройте порты в dev версии
cd everestcode-dev/everest-ai-editor
# Откройте package.json и измените порты на 3001 и 5006

# Установите зависимости
pnpm install

# Готово! Теперь у вас две версии:
# - Production: /home/everest/Sites/everestcode.ru/everest-ai-editor
# - Development: /home/everest/Sites/everestcode-dev/everest-ai-editor
```

