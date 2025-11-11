const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
const prisma = require('./lib/prisma');

class TelegramBotService {
  constructor() {
    this.bot = null;
    this.isRunning = false;
    this.webhookUrl = process.env.TELEGRAM_WEBHOOK_URL || `https://everestcode.ru/api/telegram/webhook`;
  }

  async initialize() {
    try {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) {
        console.log('⚠️ TELEGRAM_BOT_TOKEN не установлен, бот не будет запущен');
        return false;
      }

      this.bot = new TelegramBot(token, { polling: false });
      
      // Устанавливаем webhook
      await this.bot.setWebHook(this.webhookUrl);
      console.log(`✅ Telegram бот инициализирован, webhook: ${this.webhookUrl}`);
      
      this.isRunning = true;
      return true;
    } catch (error) {
      console.error('❌ Ошибка инициализации Telegram бота:', error);
      return false;
    }
  }

  async handleWebhook(req, res) {
    try {
      if (!this.bot || !this.isRunning) {
        return res.status(503).json({ error: 'Telegram бот не инициализирован' });
      }

      const update = req.body;
      
      if (update.message) {
        await this.handleMessage(update.message);
      } else if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query);
      }

      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Ошибка обработки webhook:', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  async handleMessage(message) {
    try {
      const chatId = message.chat.id;
      const text = message.text || '';
      const user = message.from;

      console.log(`📨 Получено сообщение от ${user.username || user.first_name}: ${text}`);

      // Обработка команды /start
      if (text.startsWith('/start')) {
        // Проверяем, есть ли параметр link_username (для автоматической связи аккаунта)
        const startMatch = text.match(/^\/start\s+link_(.+)$/);
        if (startMatch) {
          const siteUsername = startMatch[1];
          
          try {
            // Ищем пользователя на сайте по username
            const siteUser = await prisma.user.findFirst({
              where: {
                username: siteUsername,
                telegramId: null // Только пользователи без telegramId
              }
            });
            
            if (!siteUser) {
              await this.bot.sendMessage(chatId,
                `❌ Пользователь "${siteUsername}" не найден на сайте или уже связан с другим Telegram аккаунтом.\n\n` +
                `Убедитесь, что:\n` +
                `1. Вы указали правильный username с сайта\n` +
                `2. Вы уже авторизованы на сайте\n\n` +
                `💡 Если вы еще не вводили Telegram username на сайте, сделайте это сначала.`
              );
              return;
            }
            
            // Обновляем пользователя с telegramId
            await prisma.user.update({
              where: { id: siteUser.id },
              data: {
                telegramId: String(user.id),
                telegramUsername: user.username || undefined,
                firstName: user.first_name || undefined,
                lastName: user.last_name || undefined
              }
            });
            
            await this.bot.sendMessage(chatId,
              `✅ Аккаунт успешно связан!\n\n` +
              `Теперь вы можете получать файлы с сайта everestcode.ru прямо в этот чат!\n\n` +
              `Попробуйте отправить файлы с сайта через кнопку "Скачать в Telegram".`
            );
            
            console.log(`✅ Аккаунт ${siteUsername} связан с Telegram ID ${user.id} (username: ${user.username}) через QR-код`);
            return;
          } catch (error) {
            console.error('Ошибка связывания аккаунта через /start:', error);
            try {
              await this.bot.sendMessage(chatId,
                `❌ Ошибка при связывании аккаунта. Попробуйте позже или используйте команду /link ${siteUsername}`
              );
            } catch (err) {
              console.error('Ошибка отправки сообщения об ошибке:', err.message);
            }
            return;
          }
        }
        
        // Обычная обработка /start (без параметра link_)
        // Сохраняем или обновляем пользователя с telegramId и username
        await this.createOrUpdateUser({
          telegramId: String(user.id),
          telegramUsername: user.username,
          firstName: user.first_name,
          lastName: user.last_name
        });
        
        try {
          await this.bot.sendMessage(chatId, 
            `👋 Добро пожаловать!\n\n` +
            `Я бот для сайта everestcode.ru.\n\n` +
            `💡 Для связи аккаунта на сайте с Telegram используйте команду /link ваш_username\n\n` +
            `После связывания аккаунта вы сможете получать файлы с сайта прямо в этот чат!`
          );
          console.log(`✅ Приветствие отправлено пользователю ${user.username || user.first_name} (ID: ${user.id})`);
        } catch (error) {
          console.error(`❌ Ошибка отправки сообщения пользователю ${user.username || user.first_name} (ID: ${user.id}):`, error.message);
        }
        return;
      }

      // Обработка команды /link для связывания аккаунта на сайте
      if (text.startsWith('/link')) {
        const parts = text.split(' ');
        const siteUsername = parts[1];
        
        if (!siteUsername) {
          try {
            await this.bot.sendMessage(chatId,
              `❌ Укажите ваш username с сайта.\n\n` +
              `Использование: /link ваш_username_с_сайта\n\n` +
              `Пример: /link d`
            );
          } catch (error) {
            console.error(`Ошибка отправки сообщения:`, error.message);
          }
          return;
        }
        
        try {
          // Ищем пользователя на сайте по username (username сайта, не Telegram username)
          const siteUser = await prisma.user.findFirst({
            where: {
              username: siteUsername,
              telegramId: null // Только пользователи без telegramId
            }
          });
          
          if (!siteUser) {
            await this.bot.sendMessage(chatId,
              `❌ Пользователь "${siteUsername}" не найден на сайте или уже связан с другим Telegram аккаунтом.\n\n` +
              `Убедитесь, что:\n` +
              `1. Вы указали правильный username с сайта (тот, который вы видите в профиле на сайте)\n` +
              `2. Вы уже авторизованы на сайте\n\n` +
              `💡 Если вы еще не вводили Telegram username на сайте, сделайте это сначала.`
            );
            return;
          }
          
          // Обновляем пользователя с telegramId
          await prisma.user.update({
            where: { id: siteUser.id },
            data: {
              telegramId: String(user.id),
              telegramUsername: user.username || undefined,
              firstName: user.first_name || undefined,
              lastName: user.last_name || undefined
            }
          });
          
          await this.bot.sendMessage(chatId,
            `✅ Аккаунт успешно связан!\n\n` +
            `Теперь вы можете получать файлы с сайта everestcode.ru прямо в этот чат!\n\n` +
            `Попробуйте отправить файлы с сайта через кнопку "Скачать в Telegram".`
          );
          
          console.log(`✅ Аккаунт ${siteUsername} связан с Telegram ID ${user.id} (username: ${user.username})`);
        } catch (error) {
          console.error('Ошибка связывания аккаунта:', error);
          try {
            await this.bot.sendMessage(chatId,
              `❌ Ошибка при связывании аккаунта. Попробуйте позже.`
            );
          } catch (err) {
            console.error('Ошибка отправки сообщения об ошибке:', err.message);
          }
        }
        return;
      }

      // Обработка команды /help
      if (text === '/help') {
        try {
          await this.bot.sendMessage(chatId,
            `📋 Доступные команды:\n\n` +
            `/start - Начать работу с ботом\n` +
            `/link <username> - Связать аккаунт на сайте с Telegram\n` +
            `/help - Показать это сообщение\n\n` +
            `💡 Для связи аккаунта на сайте everestcode.ru используйте команду /link ваш_username\n\n` +
            `После связывания аккаунта вы сможете получать файлы с сайта прямо в этот чат!`
          );
          console.log(`✅ Справка отправлена пользователю ${user.username || user.first_name} (ID: ${user.id})`);
        } catch (error) {
          console.error(`❌ Ошибка отправки справки пользователю ${user.username || user.first_name} (ID: ${user.id}):`, error.message);
        }
        return;
      }

      // Если пользователь авторизован, показываем информацию о статусе
      const userRecord = await this.getUserByTelegramId(user.id);
      if (userRecord) {
        try {
          await this.bot.sendMessage(chatId,
            `✅ Вы авторизованы как ${userRecord.username}\n\n` +
            `Теперь вы можете отправлять файлы с сайта everestcode.ru прямо в этот чат!`
          );
          console.log(`✅ Статус отправлен авторизованному пользователю ${user.username || user.first_name} (ID: ${user.id})`);
        } catch (error) {
          console.error(`❌ Ошибка отправки статуса пользователю ${user.username || user.first_name} (ID: ${user.id}):`, error.message);
        }
      } else {
        try {
          await this.bot.sendMessage(chatId,
            `❌ Вы не авторизованы на сайте.\n\n` +
            `Для связи аккаунта используйте команду /link ваш_username\n\n` +
            `Авторизация на сайте происходит через Telegram виджет.`
          );
          console.log(`✅ Сообщение о неавторизованности отправлено пользователю ${user.username || user.first_name} (ID: ${user.id})`);
        } catch (error) {
          console.error(`❌ Ошибка отправки сообщения о неавторизованности пользователю ${user.username || user.first_name} (ID: ${user.id}):`, error.message);
        }
      }

    } catch (error) {
      console.error('Ошибка обработки сообщения:', error);
    }
  }


  async handleCallbackQuery(callbackQuery) {
    try {
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data;

      // Обработка callback query если нужно
      await this.bot.answerCallbackQuery(callbackQuery.id);
    } catch (error) {
      console.error('Ошибка обработки callback query:', error);
    }
  }


  async getUserByTelegramId(telegramId) {
    try {
      return await prisma.user.findUnique({
        where: { telegramId: String(telegramId) }
      });
    } catch (error) {
      console.error('Ошибка получения пользователя по Telegram ID:', error);
      return null;
    }
  }

  async createOrUpdateUser(userData) {
    try {
      const { telegramId, telegramUsername, firstName, lastName, phoneNumber } = userData;
      
      // Проверяем, существует ли пользователь
      let user = await prisma.user.findUnique({
        where: { telegramId: String(telegramId) }
      });

      if (user) {
        // Обновляем существующего пользователя
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            telegramUsername,
            firstName,
            lastName,
            phoneNumber
          }
        });
      } else {
        // Создаем нового пользователя
        user = await prisma.user.create({
          data: {
            username: telegramUsername || `user_${telegramId}`,
            telegramId: String(telegramId),
            telegramUsername,
            firstName,
            lastName,
            phoneNumber,
            role: 'user',
            // Устанавливаем лимиты по умолчанию
            tokensType1: 10,
            tokensType2: 100,
            tokensType3: 0
          }
        });
      }

      console.log(`✅ Пользователь ${user.username} создан/обновлен`);
      return user;
    } catch (error) {
      console.error('Ошибка создания/обновления пользователя:', error);
      return null;
    }
  }

  async sendFileToUser(telegramIdOrUsername, filePath, fileName, caption = '') {
    try {
      if (!this.bot || !this.isRunning) {
        throw new Error('Telegram бот не инициализирован');
      }

      const fileStream = fs.createReadStream(filePath);
      const stats = fs.statSync(filePath);
      
      // Определяем тип файла
      const ext = path.extname(fileName).toLowerCase();
      let fileType = 'document';
      
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
        fileType = 'photo';
      } else if (['.mp4', '.avi', '.mov', '.mkv'].includes(ext)) {
        fileType = 'video';
      } else if (['.mp3', '.wav', '.ogg', '.m4a'].includes(ext)) {
        fileType = 'audio';
      }

      // Определяем, это ID или username
      const isUsername = typeof telegramIdOrUsername === 'string' && (telegramIdOrUsername.startsWith('@') || !/^\d+$/.test(telegramIdOrUsername));
      const chatId = isUsername ? (telegramIdOrUsername.startsWith('@') ? telegramIdOrUsername : `@${telegramIdOrUsername}`) : telegramIdOrUsername;

      let message;
      
      if (fileType === 'photo') {
        message = await this.bot.sendPhoto(chatId, fileStream, {
          caption: caption || `📁 ${fileName}`,
          parse_mode: 'HTML'
        });
      } else if (fileType === 'video') {
        message = await this.bot.sendVideo(chatId, fileStream, {
          caption: caption || `📁 ${fileName}`,
          parse_mode: 'HTML'
        });
      } else if (fileType === 'audio') {
        message = await this.bot.sendAudio(chatId, fileStream, {
          caption: caption || `📁 ${fileName}`,
          parse_mode: 'HTML'
        });
      } else {
        message = await this.bot.sendDocument(chatId, fileStream, {
          caption: caption || `📁 ${fileName}`,
          parse_mode: 'HTML'
        });
      }

      console.log(`✅ Файл ${fileName} отправлен пользователю ${chatId}`);
      
      // Если отправили по username, сохраняем полученный chat_id для будущего использования
      if (isUsername && message && message.chat) {
        return {
          message: message,
          chatId: message.chat.id.toString()
        };
      }
      
      return message;
      
    } catch (error) {
      console.error('Ошибка отправки файла:', error);
      throw error;
    }
  }

  async sendMessageToUser(telegramId, text) {
    try {
      if (!this.bot || !this.isRunning) {
        throw new Error('Telegram бот не инициализирован');
      }

      // Преобразуем chat_id в число, если это строка
      const chatId = typeof telegramId === 'string' ? parseInt(telegramId, 10) : telegramId;
      
      // Отправляем с таймаутом (7 секунд)
      const sendWithTimeout = () => {
        return Promise.race([
          this.bot.sendMessage(chatId, text, { parse_mode: 'HTML' }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Таймаут отправки сообщения (7 секунд)')), 7000)
          )
        ]);
      };

      await sendWithTimeout();
      console.log(`✅ Сообщение отправлено пользователю ${chatId}`);
      return true;
    } catch (error) {
      console.error(`❌ Ошибка отправки сообщения пользователю ${telegramId}:`, error);
      
      // Детальная обработка ошибок Telegram API
      if (error.response) {
        const statusCode = error.response.statusCode;
        const description = error.response.body?.description || error.message;
        
        if (statusCode === 403) {
          throw new Error(`Пользователь ${telegramId} заблокировал бота или не начал с ним диалог.`);
        } else if (statusCode === 400) {
          throw new Error(`Неверный запрос к Telegram API: ${description}`);
        } else if (statusCode === 429) {
          throw new Error(`Превышен лимит запросов к Telegram API. Попробуйте позже.`);
        } else {
          throw new Error(`Ошибка Telegram API (${statusCode}): ${description}`);
        }
      }
      
      throw error;
    }
  }

  async sendMessageToUsername(username, text) {
    try {
      if (!this.bot || !this.isRunning) {
        throw new Error('Telegram бот не инициализирован');
      }

      // Убираем @ если есть
      const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
      
      console.log(`📤 Попытка отправить сообщение пользователю @${cleanUsername}...`);
      
      // Сначала пробуем отправить напрямую по username (работает если пользователь начал диалог с ботом)
      const sendDirectWithTimeout = () => {
        return Promise.race([
          this.bot.sendMessage(`@${cleanUsername}`, text, { parse_mode: 'HTML' }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Таймаут отправки сообщения (7 секунд)')), 7000)
          )
        ]);
      };

      try {
        const result = await sendDirectWithTimeout();
        console.log(`✅ Сообщение успешно отправлено пользователю @${cleanUsername} напрямую`);
        return result;
      } catch (directError) {
        console.log(`⚠️ Прямая отправка по username не удалась, пробуем получить chat_id...`);
        console.log(`📋 Ошибка: ${directError.message}`);
        
        // Если прямая отправка не сработала, пробуем получить chat_id
        const getChatWithTimeout = () => {
          return Promise.race([
            this.bot.getChat(`@${cleanUsername}`),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Таймаут получения chat_id (7 секунд)')), 7000)
            )
          ]);
        };

        let chat;
        try {
          chat = await getChatWithTimeout();
          const chatId = chat.id;
          console.log(`✅ Chat ID получен для @${cleanUsername}: ${chatId}`);

          // Отправляем сообщение по chat_id
          const sendWithTimeout = () => {
            return Promise.race([
              this.bot.sendMessage(chatId, text, { parse_mode: 'HTML' }),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Таймаут отправки сообщения (7 секунд)')), 7000)
              )
            ]);
          };

          const result = await sendWithTimeout();
          console.log(`✅ Сообщение успешно отправлено пользователю @${cleanUsername} (ID: ${chatId})`);
          return result;
        } catch (chatError) {
          console.error(`❌ Ошибка получения chat_id для @${cleanUsername}:`, chatError.message);
          
          // Детальная обработка ошибок Telegram API
          if (directError.response) {
            const statusCode = directError.response.statusCode;
            const description = directError.response.body?.description || directError.message;
            
            if (statusCode === 403) {
              throw new Error(`Пользователь @${cleanUsername} заблокировал бота или не начал с ним диалог.`);
            } else if (statusCode === 400) {
              throw new Error(`Неверный запрос к Telegram API: ${description}`);
            } else if (statusCode === 429) {
              throw new Error(`Превышен лимит запросов к Telegram API. Попробуйте позже.`);
            } else {
              throw new Error(`Ошибка Telegram API (${statusCode}): ${description}`);
            }
          }
          
          throw new Error(`Не удалось отправить сообщение пользователю @${cleanUsername}. Убедитесь, что пользователь начал диалог с ботом.`);
        }
      }
    } catch (error) {
      console.error(`❌ Критическая ошибка отправки сообщения пользователю @${username}:`, error);
      throw error;
    }
  }

  async stop() {
    try {
      if (this.bot) {
        await this.bot.stopPolling();
        await this.bot.deleteWebHook();
        this.isRunning = false;
        console.log('🛑 Telegram бот остановлен');
      }
    } catch (error) {
      console.error('Ошибка остановки бота:', error);
    }
  }
}

module.exports = TelegramBotService;
