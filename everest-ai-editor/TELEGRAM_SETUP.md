# Настройка Telegram авторизации и бота

## Что было реализовано

✅ **Авторизация через Telegram**
- Компонент `TelegramAuth` для ввода кода авторизации
- API эндпоинт `/api/auth/telegram` для обработки кодов
- Интеграция с существующей системой авторизации

✅ **Telegram бот**
- Класс `TelegramBotService` для управления ботом
- Webhook обработка сообщений
- Команды: `/start`, `/auth`, `/help`
- Автоматическая генерация кодов авторизации

✅ **Отправка файлов в Telegram**
- Компонент `FileSender` с drag & drop интерфейсом
- API эндпоинт `/api/files/send-to-telegram`
- Поддержка всех типов файлов до 50MB
- История отправленных файлов

✅ **Интеграция с сайтом**
- Обновлен `AuthModal` с поддержкой Telegram
- Добавлена страница `/files` для отправки файлов
- Обновлена схема базы данных для Telegram пользователей

## Настройка

### 1. Создание Telegram бота

1. Найдите [@BotFather](https://t.me/botfather) в Telegram
2. Отправьте команду `/newbot`
3. Следуйте инструкциям для создания бота
4. Сохраните полученный токен

### 2. Настройка переменных окружения

Отредактируйте файл `config.env`:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN="YOUR_BOT_TOKEN_HERE"
TELEGRAM_WEBHOOK_URL="https://everestcode.ru/api/telegram/webhook"

# JWT Secret (измените на случайную строку)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
```

### 3. Установка зависимостей

```bash
cd /home/everest/Sites/everestcode.ru/everest-ai-editor
pnpm install
```

### 4. Обновление базы данных

```bash
npx prisma db push --accept-data-loss
```

### 5. Запуск сервера

```bash
pnpm run dev
```

## Использование

### Для пользователей

1. **Авторизация через Telegram:**
   - Перейдите на сайт everestcode.ru
   - Нажмите "Войти" → вкладка "Telegram"
   - Найдите бота @your_bot_name в Telegram
   - Отправьте команду `/auth`
   - Введите полученный код на сайте

2. **Отправка файлов:**
   - Перейдите на страницу `/files`
   - Перетащите файлы в область загрузки или нажмите для выбора
   - Нажмите "Отправить все файлы"
   - Файлы будут отправлены в ваш Telegram чат

### Для разработчиков

**API эндпоинты:**

- `POST /api/auth/telegram` - авторизация через Telegram
- `POST /api/files/send-to-telegram` - отправка файла в Telegram
- `GET /api/files/history` - история отправленных файлов
- `POST /api/telegram/webhook` - webhook для Telegram бота

**Компоненты:**

- `TelegramAuth` - форма авторизации через Telegram
- `FileSender` - интерфейс для отправки файлов
- `FileSharingPage` - страница отправки файлов

## Структура базы данных

Добавлены поля в таблицу `User`:
- `telegramId` - ID пользователя в Telegram
- `telegramUsername` - username в Telegram
- `firstName` - имя пользователя
- `lastName` - фамилия пользователя

Добавлена таблица `FileShare`:
- `userId` - ID пользователя
- `fileName` - имя файла
- `filePath` - путь к файлу на сервере
- `fileSize` - размер файла
- `mimeType` - MIME тип файла
- `telegramMessageId` - ID сообщения в Telegram
- `status` - статус отправки (pending/sent/failed)
- `createdAt` - дата создания
- `sentAt` - дата отправки

## Безопасность

- Коды авторизации действительны 10 минут
- JWT токены действительны 7 дней
- Лимит размера файла: 50MB
- Все API эндпоинты требуют авторизации (кроме webhook)

## Мониторинг

Логи бота и отправки файлов выводятся в консоль сервера. Для продакшена рекомендуется настроить логирование в файлы.

## Troubleshooting

1. **Бот не отвечает:**
   - Проверьте правильность токена в `config.env`
   - Убедитесь, что webhook URL доступен из интернета
   - Проверьте логи сервера

2. **Ошибка авторизации:**
   - Проверьте подключение к базе данных
   - Убедитесь, что JWT_SECRET установлен
   - Проверьте логи сервера

3. **Файлы не отправляются:**
   - Проверьте, что пользователь авторизован через Telegram
   - Убедитесь, что папка `uploads` существует и доступна для записи
   - Проверьте размер файла (лимит 50MB)
