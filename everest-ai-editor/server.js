const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const prisma = require('./lib/prisma');
require('dotenv').config();
const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const axios = require('axios');
const https = require('https');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const TelegramBotService = require('./telegram-bot');

const app = express();
const server = http.createServer(app);

// =============================
// SIMPLE TIMESTAMPED LOGGER
// =============================
function log(...args) {
  const ts = new Date().toISOString();
  console.log(`[${ts}]`, ...args);
}

// =============================
// SANITIZATION & VALIDATION MIDDLEWARE
// =============================

/**
 * Sanitize string input to prevent SQL injection and XSS
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  
  // Remove SQL injection attempts
  const sqlPatterns = [
    /(\bOR\b|\bAND\b)\s*['"]?\s*1\s*=\s*1/gi,
    /(\bOR\b|\bAND\b)\s*['"]?\s*'?'?'?\s*=\s*['"]?\s*'?'?'?/gi,
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bEXEC\b|\bEXECUTE\b)\s+/gi,
    /;.*--/g,
    /\/\*[\s\S]*?\*\//g,
    /(\bCONCAT\b|\bCHAR\b|\bASCII\b)\(/gi,
    /xp_/gi,
    /sp_/gi,
    /@@version|@@hostname/gi,
    /SCRIPT\s+/gi,
    /\bLOAD_FILE\b/gi,
    /\bINTO\b\s+\bOUTFILE\b/gi,
    /\bINTO\b\s+\bDUMPFILE\b/gi
  ];
  
  let sanitized = str;
  sqlPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  // Remove HTML tags to prevent XSS
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Escape special characters
  sanitized = sanitized.replace(/['";\\]/g, '');
  
  return sanitized.trim();
}

/**
 * Validate email format
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 */
function validatePhone(phone) {
  // Russian phone format: +7XXXXXXXXXX
  const phoneRegex = /^\+7\d{10}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate Telegram ID format
 */
function validateTelegramId(id) {
  // Telegram IDs are numeric strings
  return /^\d+$/.test(String(id));
}

/**
 * Middleware to sanitize all request data
 */
function sanitizeInput(req, res, next) {
  try {
    // Sanitize req.body
    if (req.body) {
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = sanitizeString(req.body[key]);
        } else if (typeof req.body[key] === 'object' && req.body[key] !== null) {
          // Recursively sanitize nested objects
          req.body[key] = sanitizeObject(req.body[key]);
        }
      });
    }
    
    // Sanitize req.query
    if (req.query) {
      Object.keys(req.query).forEach(key => {
        if (typeof req.query[key] === 'string') {
          req.query[key] = sanitizeString(req.query[key]);
        }
      });
    }
    
    next();
  } catch (error) {
    console.error('Error in sanitization middleware:', error);
    res.status(500).json({ error: 'Invalid input data' });
  }
}

/**
 * Recursively sanitize objects
 */
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return typeof obj === 'string' ? sanitizeString(obj) : obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized = {};
  Object.keys(obj).forEach(key => {
    sanitized[key] = sanitizeObject(obj[key]);
  });
  
  return sanitized;
}

// Apply sanitization middleware to all routes
app.use(sanitizeInput);

// Инициализация Telegram бота
const telegramBot = new TelegramBotService();

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB лимит
  }
});

// Функция генерации реферального кода
function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Исключаем похожие символы (0, O, I, 1)
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Загрузка переменных окружения из config.env
const configPath = path.join(__dirname, 'config.env');
if (fs.existsSync(configPath)) {
  const envConfig = fs.readFileSync(configPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

const DEFAULT_PORT = 5005;
const port = process.env.PORT || DEFAULT_PORT;
const host = process.env.HOST || '0.0.0.0';

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS настройки
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5005',
      'https://everestcode.ru',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5005'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Разрешаем все для разработки
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Статическая раздача файлов из папки uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Инициализация Prisma
async function initializeDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Подключено к SQLite через Prisma');
    
    // Проверяем подключение
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ База данных готова к работе');
  } catch (error) {
    console.error('❌ Ошибка подключения к SQLite:', error.message);
    throw error;
  }
}

// =============================
// AI ФУНКЦИИ
// =============================

// Настройка российских сертификатов для GigaChat
const russianCertsPath = process.env.RUS_CERTS_DIR || path.join(__dirname, 'certs');
const rootCertPath = process.env.RUS_CERT_ROOT || path.join(russianCertsPath, 'russian_trusted_root_ca.crt');
const subCertPath = process.env.RUS_CERT_SUB || path.join(russianCertsPath, 'russian_trusted_sub_ca.crt');

// Проверка наличия российских сертификатов
let httpsAgent = null;
if (fs.existsSync(rootCertPath) && fs.existsSync(subCertPath)) {
  log('✅ Российские сертификаты НУЦ Минцифры найдены');
  // Создание HTTPS агента с российскими сертификатами
  httpsAgent = new https.Agent({
    ca: [fs.readFileSync(rootCertPath), fs.readFileSync(subCertPath)]
  });
} else {
  log('⚠️ Российские сертификаты не найдены, GigaChat может не работать');
  // Создаем обычный HTTPS агент без сертификатов
  httpsAgent = new https.Agent({
    rejectUnauthorized: false
  });
}

// GigaChat конфигурация
const gigachatConfig = {
  authUrl: process.env.GIGACHAT_AUTH_URL || 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth',
  clientId: process.env.GIGACHAT_CLIENT_ID,
  clientSecret: process.env.GIGACHAT_CLIENT_SECRET,
  scope: process.env.GIGACHAT_SCOPE || 'GIGACHAT_API_PERS'
};

log('GigaChat Config:', {
  authUrl: gigachatConfig.authUrl,
  clientId: gigachatConfig.clientId,
  clientSecret: gigachatConfig.clientSecret ? gigachatConfig.clientSecret.substring(0, 10) + '...' : 'не задан',
  scope: gigachatConfig.scope
});

// Получение токена GigaChat
async function getGigaChatToken() {
  try {
    log('🔐 Получение токена GigaChat...');
    const { v4: uuidv4 } = await import('uuid');
    const rqUid = uuidv4();
    
    // Создаем Basic Auth из Client ID и Secret
    const credentials = Buffer.from(`${gigachatConfig.clientId}:${gigachatConfig.clientSecret}`).toString('base64');
    
    const data = new URLSearchParams({
      'scope': gigachatConfig.scope,
      'grant_type': 'client_credentials'
    });

    const response = await axios.post(gigachatConfig.authUrl, data, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'RqUID': rqUid
      },
      httpsAgent: httpsAgent,
      timeout: 15000
    });

    log('🔐 Токен GigaChat получен успешно');
    return response.data.access_token;
  } catch (error) {
    log('❌ Ошибка получения токена GigaChat:', error.message, error.response?.status, error.response?.data);
    throw error;
  }
}

// Отправка запроса в GigaChat
async function sendToGigaChat(message, token, model = 'GigaChat:latest', maxTokens = 4000) {
  try {
    log('➡️ Запрос к GigaChat:', { model, messagePreview: String(message).slice(0, 80), maxTokens });
    const response = await axios.post('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
      model: model,
      messages: [{ role: 'user', content: message }],
      max_tokens: maxTokens,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      httpsAgent: httpsAgent
    });
    
    log('⬅️ Ответ от GigaChat получен');
    
    // Проверяем структуру ответа
    if (!response.data || !response.data.choices || !response.data.choices[0]) {
      log('⚠️ Неверная структура ответа от GigaChat:', JSON.stringify(response.data));
      throw new Error('Неверная структура ответа от GigaChat API');
    }
    
    const choice = response.data.choices[0];
    const content = choice.message?.content;
    const finishReason = choice.finish_reason;
    
    // Проверяем, был ли ответ обрезан из-за лимита токенов
    if (finishReason === 'length') {
      log('⚠️ Ответ был обрезан из-за достижения лимита max_tokens');
      // Можно добавить предупреждение в ответ, но пока просто логируем
    }
    
    if (!content || typeof content !== 'string') {
      log('⚠️ Пустой или неверный формат содержимого ответа:', content);
      throw new Error('Пустой или неверный формат содержимого ответа от GigaChat');
    }
    
    log('✅ Содержимое ответа получено, длина:', content.length, 'finish_reason:', finishReason);
    return content;
  } catch (error) {
    log('❌ Ошибка GigaChat:', error.message, error.response?.status, error.response?.data);
    throw error;
  }
}


// =============================
// СИСТЕМА ЛИМИТОВ ПОЛЬЗОВАТЕЛЕЙ
// =============================

// Функция проверки лимитов пользователя
async function checkUserLimits(userId, provider) {
  if (!userId) {
    return { allowed: true, message: null };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: String(userId) },
      select: {
        hasSubscription: true,
        tokensType1: true,
        tokensType2: true,
        tokensType3: true,
        usedTokensType1: true,
        usedTokensType2: true,
        usedTokensType3: true
      }
    });

    if (!user) {
      return { allowed: false, message: 'Пользователь не найден' };
    }

    let usedTokens, totalTokens;

    // Определяем тип токенов в зависимости от провайдера
    switch (provider) {
      case 'gigachat':
      case 'GigaChat-2':
        usedTokens = user.usedTokensType1;
        totalTokens = user.tokensType1;
        break;
      case 'gigachat-2':
      case 'GigaChat-2-Pro':
        usedTokens = user.usedTokensType2;
        totalTokens = user.tokensType2;
        break;
      case 'gigachat-3':
      case 'GigaChat-2-Max':
        usedTokens = user.usedTokensType3;
        totalTokens = user.tokensType3;
        break;
      default:
        return { allowed: false, message: 'Неизвестный провайдер' };
    }

    // Проверяем лимиты
    if (totalTokens === -1) {
      // Неограниченный доступ
      return { allowed: true, message: null };
    }

    if (totalTokens === 0) {
      return { 
        allowed: false, 
        message: 'У вас нет доступа к этой модели. Обновите подписку для получения доступа.' 
      };
    }

    if (usedTokens >= totalTokens) {
      return { 
        allowed: false, 
        message: `Лимит запросов исчерпан. Использовано: ${usedTokens}/${totalTokens}. Обновите подписку для увеличения лимитов.` 
      };
    }

    return { allowed: true, message: null };

  } catch (error) {
    console.error('Ошибка проверки лимитов:', error);
    return { allowed: true, message: null }; // В случае ошибки разрешаем запрос
  }
}

// Функция обновления использованных токенов
async function updateUsedTokens(userId, provider) {
  if (!userId) {
    return;
  }

  try {
    let updateData = {};
    switch (provider) {
      case 'gigachat':
      case 'GigaChat-2':
        updateData = { usedTokensType1: { increment: 1 } };
        break;
      case 'gigachat-2':
      case 'GigaChat-2-Pro':
        updateData = { usedTokensType2: { increment: 1 } };
        break;
      case 'gigachat-3':
      case 'GigaChat-2-Max':
        updateData = { usedTokensType3: { increment: 1 } };
        break;
      default:
        return;
    }

    await prisma.user.update({
      where: { id: String(userId) },
      data: updateData
    });

    console.log(`✅ Обновлен счетчик для провайдера ${provider} пользователя ${userId}`);
  } catch (error) {
    console.error('Ошибка обновления токенов:', error);
  }
}

// =============================
// ПРОСТОЙ ТЕРМИНАЛ КАК В CODESANDBOX
// =============================

const terminals = new Map();

// WebSocket сервер для терминала будет создан в startServer()
let wss = null;

class Terminal {
  constructor(ws, id) {
    this.ws = ws;
    this.id = id;
    this.process = null;
    this.workingDir = path.join(__dirname, 'sandbox', id);
    
    // Создаем изолированную папку для пользователя
    if (!fs.existsSync(this.workingDir)) {
      fs.mkdirSync(this.workingDir, { recursive: true });
      
      // Создаем приветственный файл
      const welcomeFile = path.join(this.workingDir, 'welcome.txt');
      fs.writeFileSync(welcomeFile, `Добро пожаловать в терминал!\nВы находитесь в изолированной среде.\nВремя создания: ${new Date().toLocaleString()}`);
    }

    this.startShell();
  }

  startShell() {
    console.log(`🐚 Запуск bash для терминала ${this.id}`);
    
    this.process = spawn('bash', ['--login', '--noprofile', '--norc'], {
      cwd: this.workingDir,
      env: {
        ...process.env,
        PS1: 'sandbox:\\w$ ',
        HOME: this.workingDir,
        TERM: 'xterm-256color',
        USER: 'sandbox',
        LOGNAME: 'sandbox',
        SHELL: '/bin/bash',
        PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.process.stdout.on('data', (data) => {
      this.send('output', data.toString());
    });

    this.process.stderr.on('data', (data) => {
      const output = data.toString();
      // Фильтруем предупреждения bash о группе процессов
      if (!output.includes('не удаётся задать группу процесса терминала') && 
          !output.includes('этот командный процессор не может управлять заданиями') &&
          !output.includes('Inappropriate ioctl for device') &&
          !output.includes('cannot manage jobs')) {
        this.send('output', output);
      }
    });

    this.process.on('close', (code) => {
      console.log(`🐚 Процесс терминала ${this.id} завершен с кодом ${code}`);
      this.cleanup();
    });

    // Отправляем команды для настройки bash и подавления предупреждений
    setTimeout(() => {
      this.process.stdin.write('set +m\n'); // Отключаем job control
      this.process.stdin.write('stty -ixon\n'); // Отключаем flow control
      this.process.stdin.write('clear\n'); // Очищаем экран
    }, 100);

    this.process.on('error', (error) => {
      console.error(`🐚 Ошибка процесса терминала ${this.id}:`, error);
      this.send('error', error.message);
    });

    console.log(`🐚 Bash запущен для терминала ${this.id}, PID: ${this.process.pid}`);
  }

  send(type, data) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type,
        data,
        id: this.id
      }));
    }
  }

  write(data) {
    if (this.process && this.process.stdin.writable) {
      this.process.stdin.write(data);
    }
  }

  resize(cols, rows) {
    if (this.process && this.process.pid) {
      try {
        this.process.kill('SIGWINCH');
      } catch (error) {
        console.error('Ошибка изменения размера:', error);
      }
    }
  }

  cleanup() {
    console.log(`🧹 Очистка терминала ${this.id}`);
    
    if (this.process) {
      try {
        this.process.kill('SIGTERM');
      } catch (error) {
        console.error('Ошибка завершения процесса:', error);
      }
      this.process = null;
    }

    terminals.delete(this.id);
    
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }
}

// Обработка WebSocket подключений будет настроена в startServer()

// =============================
// API ROUTES
// =============================

// Базовый роут
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    terminals: terminals.size
  });
});

// Получить список активных терминалов
app.get('/api/terminals', (req, res) => {
  const terminalList = Array.from(terminals.entries()).map(([id, terminal]) => ({
    id,
    pid: terminal.process?.pid,
    workingDir: path.basename(terminal.workingDir)
  }));
  
  res.json({
    count: terminals.size,
    terminals: terminalList
  });
});

// =============================
// Conversations API
// =============================

// Функция для преобразования строкового ID в числовой (для совместимости с фронтендом)
function stringToNumber(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Функция для генерации названия диалога из первых 3 слов
function generateConversationTitle(message) {
  if (!message || typeof message !== 'string') {
    return 'Новый диалог';
  }
  
  // Убираем лишние пробелы и разбиваем на слова
  const words = message.trim().split(/\s+/).filter(word => word.length > 0);
  
  // Если сообщение меньше 3 букв, возвращаем его целиком
  if (message.trim().length <= 3) {
    return message.trim() || 'Новый диалог';
  }
  
  // Берем первые 3 слова (или меньше, если их меньше 3)
  const titleWords = words.slice(0, 3);
  
  // Объединяем слова в название
  let title = titleWords.join(' ');
  
  // Если название слишком длинное, обрезаем до 50 символов
  if (title.length > 50) {
    title = title.substring(0, 47) + '...';
  }
  
  return title || 'Новый диалог';
}

// Получить все диалоги
app.get('/api/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const conversations = await prisma.conversation.findMany({
      where: { userId: String(userId) },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            content: true,
            role: true,
            createdAt: true
          }
        }
      }
    });
    
    // Преобразуем в формат, ожидаемый фронтендом
    const formatted = conversations.map(conv => ({
      id: stringToNumber(conv.id), // Преобразуем строковый ID в числовой через хеш
      title: conv.title,
      messages: conv.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.createdAt).getTime()
      }))
    }));
    
    res.json(formatted);
  } catch (error) {
    console.error('Ошибка загрузки диалогов:', error);
    res.status(500).json({ error: 'Ошибка загрузки диалогов' });
  }
});

// OPTIONS для CORS
app.options('/api/conversations', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

app.options('/api/conversations/:id', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

// Создать новый диалог
app.post('/api/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { title } = req.body;
    
    const conversation = await prisma.conversation.create({
      data: {
        userId: String(userId),
        title: title || 'Новый диалог',
        messages: {
          create: []
        }
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            content: true,
            role: true,
            createdAt: true
          }
        }
      }
    });
    
    // Преобразуем в формат, ожидаемый фронтендом
    const formatted = {
      id: stringToNumber(conversation.id),
      title: conversation.title,
      messages: conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.createdAt).getTime()
      }))
    };
    
    res.json(formatted);
  } catch (error) {
    console.error('Ошибка создания диалога:', error);
    res.status(500).json({ error: 'Ошибка создания диалога' });
  }
});

// Получить конкретный диалог
app.get('/api/conversations/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    
    // Получаем все диалоги пользователя и ищем по числовому ID
    const allConversations = await prisma.conversation.findMany({
      where: { userId: String(userId) },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            content: true,
            role: true,
            createdAt: true
          }
        }
      }
    });
    
    // Ищем диалог по числовому ID (преобразованному из строкового)
    const conversation = allConversations.find(conv => stringToNumber(conv.id) === parseInt(id));
    
    if (!conversation) {
      return res.status(404).json({ error: 'Диалог не найден' });
    }
    
    // Преобразуем в формат, ожидаемый фронтендом
    const formatted = {
      id: stringToNumber(conversation.id),
      title: conversation.title,
      messages: conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.createdAt).getTime()
      }))
    };
    
    res.json(formatted);
  } catch (error) {
    console.error('Ошибка загрузки диалога:', error);
    res.status(500).json({ error: 'Ошибка загрузки диалога' });
  }
});


// Обновить диалог
app.put('/api/conversations/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { title } = req.body;
    
    // Получаем все диалоги пользователя и ищем по числовому ID
    const allConversations = await prisma.conversation.findMany({
      where: { userId: String(userId) }
    });
    
    const conversation = allConversations.find(conv => stringToNumber(conv.id) === parseInt(id));
    
    if (!conversation) {
      return res.status(404).json({ error: 'Диалог не найден' });
    }
    
    const updated = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        title: title || 'Новый диалог',
        updatedAt: new Date()
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            content: true,
            role: true,
            createdAt: true
          }
        }
      }
    });
    
    // Преобразуем в формат, ожидаемый фронтендом
    const formatted = {
      id: stringToNumber(updated.id),
      title: updated.title,
      messages: updated.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.createdAt).getTime()
      }))
    };
    
    res.json(formatted);
  } catch (error) {
    console.error('Ошибка обновления диалога:', error);
    res.status(500).json({ error: 'Ошибка обновления диалога' });
  }
});

// Удалить диалог
app.delete('/api/conversations/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    
    // Получаем все диалоги пользователя и ищем по числовому ID
    const allConversations = await prisma.conversation.findMany({
      where: { userId: String(userId) }
    });
    
    const conversation = allConversations.find(conv => stringToNumber(conv.id) === parseInt(id));
    
    if (!conversation) {
      return res.status(404).json({ error: 'Диалог не найден' });
    }
    
    // Удаляем все сообщения диалога
    await prisma.message.deleteMany({
      where: { conversationId: conversation.id }
    });
    
    // Удаляем диалог
    await prisma.conversation.delete({
      where: { id: conversation.id }
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Ошибка удаления диалога:', error);
    res.status(500).json({ error: 'Ошибка удаления диалога' });
  }
});

// =============================
// AUTHENTICATION MIDDLEWARE
// =============================

// Middleware для проверки JWT токена
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Токен доступа не предоставлен' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Ошибка проверки токена:', error);
    return res.status(403).json({ error: 'Недействительный токен' });
  }
}

// =============================
// TELEGRAM AUTH API
// =============================

// Авторизация через Telegram (новая версия с контактами)
app.post('/amura/auth/telegram-old', async (req, res) => {
  try {
    const { telegramId, phoneNumber } = req.body;
    
    if (!telegramId) {
      return res.status(400).json({ error: 'Telegram ID обязателен' });
    }

    // Ищем пользователя по Telegram ID
    let user = await prisma.user.findUnique({
      where: { telegramId: String(telegramId) }
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден. Сначала поделитесь контактом с ботом.' });
    }

    // Обновляем номер телефона если он предоставлен
    if (phoneNumber) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { phoneNumber }
      });
    }

    // Создаем JWT токен
    const token = jwt.sign(
      { userId: user.id, telegramId: user.telegramId, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        telegramId: user.telegramId,
        telegramUsername: user.telegramUsername,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Ошибка Telegram авторизации:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// API для проверки авторизации
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        username: true,
        role: true,
        telegramId: true,
        telegramUsername: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        referralCode: true,
        avatarUrl: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Ошибка проверки авторизации:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// API для авторизации по коду из Telegram
app.post('/api/auth/telegram-code', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Код авторизации обязателен' });
    }

    // Ищем код в файле auth-codes.json
    const authCodesPath = path.join(__dirname, 'temp', 'auth-codes.json');
    let authCodes = [];
    
    if (fs.existsSync(authCodesPath)) {
      const data = fs.readFileSync(authCodesPath, 'utf8');
      authCodes = JSON.parse(data);
    }

    // Ищем код
    const authCodeData = authCodes.find(item => item.code === code.toUpperCase());
    
    if (!authCodeData) {
      return res.status(400).json({ error: 'Неверный код авторизации' });
    }

    // Проверяем срок действия
    if (new Date() > new Date(authCodeData.expiresAt)) {
      return res.status(400).json({ error: 'Код авторизации истек' });
    }

    // Ищем пользователя по Telegram ID
    let user = await prisma.user.findUnique({
      where: { telegramId: String(authCodeData.telegramId) }
    });

    if (!user) {
      // Создаем нового пользователя
      user = await prisma.user.create({
        data: {
          username: `user_${authCodeData.telegramId}`,
          telegramId: String(authCodeData.telegramId),
          role: 'user'
        }
      });
    }

    // Создаем JWT токен
    const token = jwt.sign(
      { userId: user.id, telegramId: user.telegramId, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    // Удаляем использованный код
    const updatedCodes = authCodes.filter(item => item.code !== code.toUpperCase());
    fs.writeFileSync(authCodesPath, JSON.stringify(updatedCodes, null, 2));

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        telegramId: user.telegramId,
        telegramUsername: user.telegramUsername,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Ошибка авторизации по коду:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Проверка подписи Telegram согласно официальной документации
// https://core.telegram.org/widgets/login
function verifyTelegramHash(authData) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.log('⚠️ TELEGRAM_BOT_TOKEN не установлен, пропускаем проверку hash');
      return true;
    }

    const crypto = require('crypto');
    
    // Создаем data-check-string
    const dataCheckString = Object.keys(authData)
      .filter(key => key !== 'hash')
      .sort()
      .map(key => `${key}=${authData[key]}`)
      .join('\n');

    // Вычисляем секретный ключ (SHA256 бот токена)
    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    
    // Вычисляем HMAC-SHA256
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Сравниваем hash
    return calculatedHash === authData.hash;
  } catch (error) {
    console.error('Ошибка проверки Telegram hash:', error);
    return false;
  }
}

// API для авторизации через Telegram виджет
app.post('/api/auth/telegram', async (req, res) => {
  try {
    const { telegramData } = req.body;

    if (!telegramData) {
      return res.status(400).json({ error: 'Данные Telegram обязательны' });
    }

    const { id, first_name, last_name, username, photo_url, auth_date, hash } = telegramData;

    // Проверяем наличие обязательных полей
    if (!id || !first_name || !auth_date || !hash) {
      return res.status(400).json({ error: 'Неполные данные от Telegram' });
    }

    // Проверяем время авторизации (не старше 24 часов)
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime - auth_date > 86400) {
      return res.status(400).json({ error: 'Данные авторизации устарели' });
    }

    // Проверяем подпись hash
    if (!verifyTelegramHash(telegramData)) {
      console.error('❌ Неверная подпись Telegram данных');
      return res.status(400).json({ error: 'Неверная подпись данных' });
    }

    console.log(`🔐 Авторизация через Telegram виджет: ${first_name} (ID: ${id})`);

    // Ищем или создаем пользователя
    let user = await prisma.user.findUnique({
      where: { telegramId: String(id) }
    });

    if (!user) {
      // Создаем нового пользователя
      user = await prisma.user.create({
        data: {
          username: username || `user_${id}`,
          telegramId: String(id),
          telegramUsername: username,
          firstName: first_name,
          lastName: last_name,
          role: 'user',
          // Устанавливаем лимиты по умолчанию
          tokensType1: 10,   // GigaChat-2 - бесплатно
          tokensType2: 100,   // GigaChat-2-Pro - средняя модель
          tokensType3: 0      // GigaChat-2-Max - топовая модель (нет доступа)
        }
      });
      console.log(`✅ Создан новый пользователь: ${user.username} (Telegram ID: ${id})`);
    } else {
      // Обновляем существующего пользователя
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          telegramUsername: username,
          firstName: first_name,
          lastName: last_name
        }
      });
      console.log(`✅ Обновлен пользователь: ${user.username} (Telegram ID: ${id})`);
    }

    // Создаем JWT токен
    const token = jwt.sign(
      { userId: user.id, telegramId: user.telegramId, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        telegramId: user.telegramId,
        telegramUsername: user.telegramUsername,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Ошибка авторизации через Telegram виджет:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Функция для получения информации о пользователе Telegram
async function getTelegramUserInfo(telegramId) {
  try {
    // В реальном приложении здесь должен быть запрос к Telegram API
    // Для простоты возвращаем базовую информацию
    return {
      id: telegramId,
      username: `user_${telegramId}`,
      first_name: 'Telegram',
      last_name: 'User'
    };
  } catch (error) {
    console.error('Ошибка получения информации о пользователе Telegram:', error);
    return null;
  }
}

// =============================
// FILE SHARING API
// =============================

// Отправка файла в Telegram
app.post('/api/files/send-to-telegram', upload.single('file'), async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const userId = decoded.userId;

    if (!req.file) {
      return res.status(400).json({ error: 'Файл не предоставлен' });
    }

    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { id: String(userId) }
    });

    if (!user || !user.telegramId) {
      return res.status(400).json({ error: 'Пользователь не привязан к Telegram' });
    }

    // Отправляем файл в Telegram
    const message = await telegramBot.sendFileToUser(
      user.telegramId,
      req.file.path,
      req.file.originalname,
      `📁 Файл с сайта everestcode.ru\n\nФайл: ${req.file.originalname}\nРазмер: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`
    );

    // Сохраняем информацию о файле в базу данных
    const fileShare = await prisma.fileShare.create({
      data: {
        userId: String(userId),
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        telegramMessageId: message.message_id?.toString(),
        status: 'sent',
        sentAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Файл успешно отправлен в Telegram',
      fileShare: {
        id: fileShare.id,
        fileName: fileShare.fileName,
        fileSize: fileShare.fileSize,
        status: fileShare.status
      }
    });

  } catch (error) {
    console.error('Ошибка отправки файла в Telegram:', error);
    res.status(500).json({ error: 'Ошибка отправки файла' });
  }
});

// Отправка ZIP архива в Telegram
app.post('/api/files/send-zip-to-telegram', upload.single('file'), async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const userId = decoded.userId;

    if (!req.file) {
      return res.status(400).json({ error: 'Файл не предоставлен' });
    }

    // Получаем пользователя из базы данных
    const user = await prisma.user.findUnique({
      where: { id: String(userId) },
      select: {
        telegramId: true,
        telegramUsername: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Определяем куда отправлять: по telegramId или по username
    let recipient = user.telegramId;
    if (!recipient && user.telegramUsername) {
      recipient = user.telegramUsername; // Отправляем по username
    }

    if (!recipient) {
      return res.status(400).json({ error: 'Не указан Telegram ID или username. Пожалуйста, укажите ваш Telegram username в настройках.' });
    }

    // Отправляем ZIP архив в Telegram
    const result = await telegramBot.sendFileToUser(
      recipient,
      req.file.path,
      req.file.originalname || 'everest-ai-editor.zip',
      `📦 Каталог файлов с сайта everestcode.ru\n\nАрхив: ${req.file.originalname || 'everest-ai-editor.zip'}\nРазмер: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`
    );

    // Если получили chatId из результата (когда отправили по username), сохраняем его
    let messageId = null;
    let receivedChatId = null;
    
    if (result && typeof result === 'object' && result.chatId) {
      // Отправка была по username, получили chatId
      receivedChatId = result.chatId;
      messageId = result.message?.message_id?.toString();
      
      // Обновляем пользователя с полученным telegramId
      await prisma.user.update({
        where: { id: String(userId) },
        data: {
          telegramId: receivedChatId
        }
      });
    } else if (result && result.message_id) {
      messageId = result.message_id.toString();
    }

    // Сохраняем информацию о файле в базу данных
    const fileShare = await prisma.fileShare.create({
      data: {
        userId: String(userId),
        fileName: req.file.originalname || 'everest-ai-editor.zip',
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype || 'application/zip',
        telegramMessageId: messageId,
        status: 'sent',
        sentAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'ZIP архив успешно отправлен в Telegram',
      fileShare: {
        id: fileShare.id,
        fileName: fileShare.fileName,
        fileSize: fileShare.fileSize,
        status: fileShare.status
      },
      telegramId: receivedChatId || user.telegramId
    });

  } catch (error) {
    console.error('Ошибка отправки ZIP архива в Telegram:', error);
    
    // Более детальная обработка ошибок
    let errorMessage = 'Ошибка отправки ZIP архива';
    if (error.response) {
      // Ошибка от Telegram API
      if (error.response.statusCode === 403) {
        errorMessage = 'Пользователь заблокировал бота или не начал с ним диалог. Пожалуйста, начните диалог с ботом @Everest_AI_Codebot';
      } else if (error.response.statusCode === 400) {
        errorMessage = 'Неверный username или пользователь не найден. Проверьте правильность введенного username.';
      } else {
        errorMessage = `Ошибка Telegram API: ${error.response.body?.description || error.message}`;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ error: errorMessage });
  }
});

// Получение истории отправленных файлов
app.get('/api/files/history', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const userId = decoded.userId;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [files, totalCount] = await Promise.all([
      prisma.fileShare.findMany({
        where: { userId: String(userId) },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          status: true,
          createdAt: true,
          sentAt: true
        }
      }),
      prisma.fileShare.count({
        where: { userId: String(userId) }
      })
    ]);

    res.json({
      success: true,
      files: files.map(file => ({
        id: file.id,
        fileName: file.fileName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        status: file.status,
        createdAt: file.createdAt,
        sentAt: file.sentAt
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Ошибка получения истории файлов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// =============================
// AUTH API
// =============================

// Функция для получения IP адреса клиента
function getClientIP(req) {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.headers['x-forwarded-for']?.split(',')[0] ||
         'unknown';
}

// Функция проверки лимита регистраций с IP
async function checkIPRegistrationLimit(ip) {
  try {
    // Подсчитываем количество пользователей, зарегистрированных с этого IP за последние 24 часа
    const userCount = await prisma.user.count({
      where: {
        ipAddress: ip,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // За последние 24 часа
        }
      }
    });
    
    console.log(`📊 IP ${ip}: зарегистрировано ${userCount} пользователей за 24 часа`);
    return userCount < 5; // Лимит 5 регистраций
  } catch (error) {
    console.error('Ошибка проверки лимита IP:', error);
    return true; // В случае ошибки разрешаем регистрацию
  }
}

// Регистрация пользователя
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, username, referralCode } = req.body;
    
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }

    // Проверяем реферальный код, если он указан
    let referrerId = null;
    if (referralCode && referralCode.trim()) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: referralCode.trim().toUpperCase() },
        select: { id: true }
      });
      
      if (!referrer) {
        return res.status(400).json({ error: 'Неверный реферальный код' });
      }
      
      referrerId = referrer.id;
      console.log(`🎯 Регистрация по реферальному коду: ${referralCode} (реферер: ${referrerId})`);
    }

    // Получаем IP адрес клиента
    const clientIP = getClientIP(req);
    console.log(`🔍 Регистрация с IP: ${clientIP}`);

    // Проверяем лимит регистраций с IP
    const canRegister = await checkIPRegistrationLimit(clientIP);
    if (!canRegister) {
      return res.status(429).json({ 
        error: 'Превышен лимит регистраций с данного IP адреса',
        details: 'С одного IP адреса можно зарегистрировать не более 5 аккаунтов в сутки'
      });
    }

    // Проверяем, существует ли пользователь
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { username: username }
        ]
      }
    });
    
    if (existingUser) {
      return res.status(409).json({ error: 'Пользователь с таким email или именем уже существует' });
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Генерируем уникальный реферальный код
    let newReferralCode;
    let isUnique = false;
    while (!isUnique) {
      newReferralCode = generateReferralCode();
      const existing = await prisma.user.findUnique({
        where: { referralCode: newReferralCode }
      });
      if (!existing) {
        isUnique = true;
      }
    }
    
    // Определяем начальные лимиты (базовые + бонусы за реферальный код)
    let tokensType1 = 20;   // GigaChat-2 Lite - базовый лимит (БЫЛО: 10)
    let tokensType2 = 5;    // GigaChat-2-Pro - базовый лимит (БЫЛО: 100)
    let tokensType3 = 0;    // GigaChat-2-Max - базовый лимит
    
    // Если есть реферер, начисляем бонусные токены
    if (referrerId) {
      // Реферал (тот кто регистрируется по коду): получит +10, +5, +3
      tokensType1 += 10;
      tokensType2 += 5;
      tokensType3 += 3;
      console.log('🎁 Новому пользователю начислены бонусные токены за реферальный код: +10 Lite, +5 Pro, +3 MAX');
      // Владельцу кода начислить: +30, +15, +9
      await prisma.user.update({
        where: { id: referrerId },
        data: {
          tokensType1: { increment: 30 },
          tokensType2: { increment: 15 },
          tokensType3: { increment: 9 }
        }
      });
      console.log('🎉 Владельцу реферального кода начислено: +30 Lite, +15 Pro, +9 MAX');
    }
    
    // Создаем пользователя
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'user',
        ipAddress: clientIP, // Сохраняем IP адрес
        referralCode: newReferralCode, // Генерируем реферальный код
        referrerId: referrerId, // Сохраняем ID реферера, если есть
        // Устанавливаем лимиты (базовые + бонусы)
        tokensType1: tokensType1,
        tokensType2: tokensType2,
        tokensType3: tokensType3
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true
      }
    });
    
    // Создаем JWT токен
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Вход пользователя
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }
    
    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Некорректный формат email' });
    }
    
    // Validate password length
    if (password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: 'Пароль должен быть от 6 до 128 символов' });
    }

    // Ищем пользователя
    const user = await prisma.user.findUnique({
      where: { email: email },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        role: true,
        referralCode: true,
        avatarUrl: true
      }
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    
    // Проверяем пароль
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    
    // Создаем JWT токен
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        referralCode: user.referralCode,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Проверка токена
app.get('/api/auth/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Токен не предоставлен' });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    const user = await prisma.user.findUnique({
      where: { id: String(decoded.userId) },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        referralCode: true,
        avatarUrl: true
      }
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }
    
    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    console.error('Ошибка проверки токена:', error);
    res.status(401).json({ error: 'Недействительный токен' });
  }
});

// =============================
// USER DASHBOARD API
// =============================

// Получить статистику пользователя
app.get('/api/user/stats', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Токен не предоставлен' });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    // Получаем статистику пользователя через Prisma
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    
    // Получаем все запросы пользователя
    const allRequests = await prisma.aiRequest.findMany({
      where: { userId: String(decoded.userId) },
      orderBy: { createdAt: 'desc' }
    });
    
    // Подсчитываем статистику
    const totalRequests = allRequests.length;
    const todayRequests = allRequests.filter(req => req.createdAt >= today).length;
    const weekRequests = allRequests.filter(req => req.createdAt >= weekAgo).length;
    const monthRequests = allRequests.filter(req => req.createdAt >= monthAgo).length;
    const totalTokens = allRequests.reduce((sum, req) => sum + (req.tokens || 0), 0);
    
    // Получаем последние 10 запросов
    const recentRequests = allRequests.slice(0, 10);
    
    res.json({
      success: true,
      stats: {
        totalRequests,
        todayRequests,
        weekRequests,
        monthRequests,
        totalTokens
      },
      recentRequests: recentRequests.map(req => ({
          id: req.id,
          message: req.prompt.substring(0, 100) + (req.prompt.length > 100 ? '...' : ''),
          response: req.response ? req.response.substring(0, 100) + (req.response.length > 100 ? '...' : '') : '',
          provider: req.provider,
          tokensUsed: req.tokens,
          createdAt: req.createdAt
        }))
      });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить историю чата пользователя
app.get('/api/user/chat-history', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Токен не предоставлен' });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // Получаем историю запросов через Prisma
    const [history, totalCount] = await Promise.all([
      prisma.aiRequest.findMany({
        where: { userId: String(decoded.userId) },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          prompt: true,
          response: true,
          provider: true,
          tokens: true,
          createdAt: true
        }
      }),
      prisma.aiRequest.count({
        where: { userId: String(decoded.userId) }
      })
    ]);
    
    res.json({
      success: true,
      history: history.map(req => ({
        id: req.id,
        message: req.prompt,
        response: req.response,
        provider: req.provider,
        tokens_used: req.tokens,
        created_at: req.createdAt
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Ошибка получения истории чата:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить информацию о пользователе
app.get('/api/user/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Токен не предоставлен' });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    const user = await prisma.user.findUnique({
      where: { id: String(decoded.userId) },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        telegramId: true,
        telegramUsername: true,
        firstName: true,
        lastName: true,
        referralCode: true,
        avatarUrl: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить лимиты пользователя
app.get('/api/user/limits', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const userId = decoded.userId;

    const user = await prisma.user.findUnique({
      where: { id: String(userId) },
      select: {
        hasSubscription: true,
        tokensType1: true,
        tokensType2: true,
        tokensType3: true,
        usedTokensType1: true,
        usedTokensType2: true,
        usedTokensType3: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    // Формируем информацию о лимитах
    const limits = {
      subscription: {
        has_subscription: user.hasSubscription,
        type: user.hasSubscription ? 'PRO' : 'FREE'
      },
      models: {
        gigachat: {
          name: 'GigaChat-2',
          total: user.tokensType1,
          used: user.usedTokensType1,
          remaining: user.tokensType1 === -1 ? -1 : Math.max(0, user.tokensType1 - user.usedTokensType1),
          unlimited: user.tokensType1 === -1
        },
        'gigachat-2': {
          name: 'GigaChat-2-Pro',
          total: user.tokensType2,
          used: user.usedTokensType2,
          remaining: user.tokensType2 === -1 ? -1 : Math.max(0, user.tokensType2 - user.usedTokensType2),
          unlimited: user.tokensType2 === -1
        },
        'gigachat-3': {
          name: 'GigaChat-2-Max',
          total: user.tokensType3,
          used: user.usedTokensType3,
          remaining: user.tokensType3 === -1 ? -1 : Math.max(0, user.tokensType3 - user.usedTokensType3),
          unlimited: user.tokensType3 === -1
        }
      }
    };

    console.log('Отправка лимитов пользователю:', userId, limits);
    res.json(limits);
  } catch (error) {
    console.error('Ошибка получения лимитов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', details: error.message });
  }
});

// Получить список рефералов (пользователей, зарегистрированных по реферальному коду)
app.get('/api/user/referrals', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const userId = decoded.userId;

    // Находим всех пользователей, которые зарегистрировались по реферальному коду текущего пользователя
    const referrals = await prisma.user.findMany({
      where: {
        referrerId: String(userId)
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        firstName: true,
        lastName: true,
        telegramUsername: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      referrals: referrals.map(ref => ({
        id: ref.id,
        username: ref.username,
        email: ref.email,
        avatarUrl: ref.avatarUrl,
        firstName: ref.firstName,
        lastName: ref.lastName,
        telegramUsername: ref.telegramUsername,
        displayName: ref.firstName && ref.lastName 
          ? `${ref.firstName} ${ref.lastName}` 
          : ref.firstName || ref.username || ref.email || 'Пользователь',
        registeredAt: ref.createdAt
      })),
      count: referrals.length
    });
  } catch (error) {
    console.error('Ошибка получения списка рефералов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновить Telegram username пользователя
app.post('/api/user/update-telegram-username', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const userId = decoded.userId;

    const { telegramUsername } = req.body;
    if (!telegramUsername) {
      return res.status(400).json({ error: 'Telegram username обязателен' });
    }

    // Убираем @ если пользователь его ввел
    const cleanUsername = telegramUsername.trim().replace(/^@/, '');

    // Обновляем пользователя
    const user = await prisma.user.update({
      where: { id: String(userId) },
      data: {
        telegramUsername: cleanUsername
      },
      select: {
        id: true,
        username: true,
        email: true,
        telegramId: true,
        telegramUsername: true
      }
    });

    res.json({
      success: true,
      message: 'Telegram username успешно обновлен',
      user: user
    });
  } catch (error) {
    console.error('Ошибка обновления Telegram username:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Загрузка аватарки пользователя
app.post('/api/user/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const userId = decoded.userId;

    if (!req.file) {
      return res.status(400).json({ error: 'Файл не предоставлен' });
    }

    // Проверяем тип файла
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Файл должен быть изображением' });
    }

    // Обновляем пользователя с путем к аватарке
    const avatarUrl = `/uploads/${req.file.filename}`;
    await prisma.user.update({
      where: { id: String(userId) },
      data: {
        avatarUrl: avatarUrl
      }
    });

    res.json({
      success: true,
      avatarUrl: avatarUrl
    });
  } catch (error) {
    console.error('Ошибка загрузки аватарки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

app.post('/api/user/get-telegram-id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const userId = decoded.userId;

    const { telegramUsername } = req.body;
    if (!telegramUsername) {
      return res.status(400).json({ error: 'Telegram username обязателен' });
    }

    // Убираем @ если пользователь его ввел
    const cleanUsername = telegramUsername.trim().replace(/^@/, '');

    // Получаем пользователя из базы данных
    const user = await prisma.user.findUnique({
      where: { id: String(userId) },
      select: {
        telegramId: true,
        telegramUsername: true
      }
    });

    // Если у пользователя уже есть telegramId, возвращаем его
    if (user && user.telegramId) {
      return res.json({
        success: true,
        telegramId: user.telegramId
      });
    }

    // Пытаемся получить telegramId через Telegram Bot API
    // Примечание: это работает только если пользователь уже начал диалог с ботом
    try {
      if (!telegramBot.bot) {
        throw new Error('Telegram бот не инициализирован');
      }

      const chat = await telegramBot.bot.getChat(`@${cleanUsername}`);
      const telegramId = chat.id.toString();

      // Обновляем пользователя с полученным telegramId
      const updatedUser = await prisma.user.update({
        where: { id: String(userId) },
        data: {
          telegramId: telegramId,
          telegramUsername: cleanUsername
        },
        select: {
          id: true,
          username: true,
          email: true,
          telegramId: true,
          telegramUsername: true
        }
      });

      res.json({
        success: true,
        telegramId: telegramId,
        user: updatedUser
      });
    } catch (telegramError) {
      // Если не удалось получить через API, возвращаем ошибку
      console.error('Ошибка получения Telegram ID:', telegramError);
      res.status(400).json({ 
        error: 'Не удалось найти пользователя в Telegram. Убедитесь, что пользователь начал диалог с ботом @Everest_AI_Codebot' 
      });
    }
  } catch (error) {
    console.error('Ошибка получения Telegram ID:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// =============================
// AI API
// =============================

// AI чат эндпоинт
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, provider = 'gigachat', conversationId } = req.body;
    log('🧠 /api/ai/chat запрос', { provider, hasMessage: Boolean(message), conversationId });
    
    if (!message) {
      return res.status(400).json({ error: 'Сообщение не может быть пустым' });
    }

    // Проверяем авторизацию для GigaChat 2 и 3
    let userId = null;
    let isAuthenticated = false;
    
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        userId = decoded.userId;
        isAuthenticated = true;
      } catch (error) {
        // Токен недействителен, но продолжаем для GigaChat-2
      }
    }
    
    // Работа с диалогом (только для авторизованных пользователей)
    let currentConversationId = conversationId;
    if (isAuthenticated && userId) {
      // Если диалог не указан, создаем новый
      if (!currentConversationId) {
        const title = generateConversationTitle(message);
        const newConversation = await prisma.conversation.create({
          data: {
            userId: String(userId),
            title: title,
            messages: {
              create: []
            }
          }
        });
        currentConversationId = newConversation.id;
        log('✅ Создан новый диалог:', { id: currentConversationId, title });
      } else {
        // Проверяем, что диалог принадлежит пользователю
        const conversation = await prisma.conversation.findFirst({
          where: {
            id: String(currentConversationId),
            userId: String(userId)
          }
        });
        
        if (!conversation) {
          // Если диалог не найден, создаем новый
          const title = generateConversationTitle(message);
          const newConversation = await prisma.conversation.create({
            data: {
              userId: String(userId),
              title: title,
              messages: {
                create: []
              }
            }
          });
          currentConversationId = newConversation.id;
          log('✅ Создан новый диалог (старый не найден):', { id: currentConversationId, title });
        }
      }
    }

    // Ограничения по версиям GigaChat
    if (provider === 'gigachat-2' || provider === 'gigachat-3') {
      if (!isAuthenticated) {
        return res.status(401).json({ 
          error: 'Для использования GigaChat-2-Pro и GigaChat-2-Max требуется авторизация',
          details: 'Пожалуйста, войдите в систему'
        });
      }
    }

    // Проверяем наличие API ключей
    const hasGigaChat = gigachatConfig.clientId && gigachatConfig.clientSecret;

    // Если GigaChat не настроен, используем fallback ответы
    if (!hasGigaChat) {
      const fallbackResponses = [
        "Привет! Я AI-ассистент Everest Code Editor. К сожалению, GigaChat API не настроен, поэтому я могу предоставить только базовые ответы.",
        "Для полноценной работы AI-ассистента необходимо настроить API ключи GigaChat в конфигурации сервера.",
        "Я готов помочь с вопросами по программированию, но для сложных задач требуется подключение к GigaChat API.",
        "В настоящее время я работаю в ограниченном режиме. Обратитесь к администратору для настройки AI-сервисов.",
        "Я могу дать общие советы по программированию, но для глубокого анализа кода нужен полноценный AI-ассистент."
      ];
      
      const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      
      // Сохраняем запрос в базу данных для статистики
      if (isAuthenticated && userId) {
        try {
          await prisma.aiRequest.create({
            data: {
              userId: userId,
              provider: 'fallback',
              prompt: message,
              response: randomResponse,
              tokens: 0
            }
          });
        } catch (error) {
          console.error('Ошибка сохранения fallback запроса:', error);
        }
      }
      
      log('⚠️ GigaChat не настроен — используем fallback');
      return res.json({
        response: randomResponse,
        provider: 'fallback',
        model: 'Fallback Assistant',
        tokens: 0,
        warning: 'GigaChat API не настроен. Используется fallback режим.'
      });
    }

    // Проверяем лимиты пользователя
    if (isAuthenticated && userId) {
      const limitsCheck = await checkUserLimits(userId, provider);
      if (!limitsCheck.allowed) {
        return res.status(429).json({
          error: 'Превышен лимит запросов',
          message: limitsCheck.message,
          details: 'Обновите подписку для увеличения лимитов'
        });
      }
    }

    let response;
    let usedProvider = provider;

    try {
      // Определяем модель на основе переданного провайдера
      let modelName = 'GigaChat-2'; // По умолчанию
      let requiresAuth = false;
      
      if (provider === 'GigaChat-2') {
        modelName = 'GigaChat-2';
        requiresAuth = false;
      } else if (provider === 'GigaChat-2-Pro') {
        modelName = 'GigaChat-2-Pro';
        requiresAuth = true;
      } else if (provider === 'GigaChat-2-Max') {
        modelName = 'GigaChat-2-Max';
        requiresAuth = true;
      } else if (provider === 'gigachat') {
        // Обратная совместимость со старыми названиями
        modelName = 'GigaChat-2';
        requiresAuth = false;
      } else if (provider === 'gigachat-2') {
        modelName = 'GigaChat-2-Pro';
        requiresAuth = true;
      } else if (provider === 'gigachat-3') {
        modelName = 'GigaChat-2-Max';
        requiresAuth = true;
      }
      
      // Проверяем авторизацию для моделей, которые её требуют
      if (requiresAuth && !isAuthenticated) {
        return res.status(401).json({ 
          error: `Для использования ${modelName} требуется авторизация`,
          details: 'Пожалуйста, войдите в систему'
        });
      }
      
      if (hasGigaChat) {
        const token = await getGigaChatToken();
        response = await sendToGigaChat(message, token, modelName);
        usedProvider = modelName;
      } else {
        throw new Error('Нет доступных AI провайдеров');
      }
    } catch (aiError) {
      log('❌ Ошибка AI:', aiError.message, aiError.response?.status, aiError.response?.data);
      
      // Если это ошибка 429 (Too Many Requests), ждем и пробуем fallback
      if (aiError.response && aiError.response.status === 429) {
        log('⚠️ Превышен лимит запросов к GigaChat, пробуем fallback...');
        
        // Fallback на GigaChat
        try {
          if (hasGigaChat) {
            // Ждем немного перед повторной попыткой
            await new Promise(resolve => setTimeout(resolve, 2000));
            const token = await getGigaChatToken();
            response = await sendToGigaChat(message, token, 'GigaChat-2');
            usedProvider = 'GigaChat-2 (fallback)';
          } else {
            // Если нет других провайдеров, возвращаем простой ответ
            response = `Извините, AI сервисы временно недоступны из-за превышения лимита запросов. Ваш вопрос: "${message}". Попробуйте позже.`;
            usedProvider = 'Fallback';
          }
        } catch (fallbackError) {
          log('❌ Fallback AI ошибка:', fallbackError.message, fallbackError.response?.status, fallbackError.response?.data);
          response = `Извините, AI сервисы временно недоступны. Ваш вопрос: "${message}". Попробуйте позже.`;
          usedProvider = 'Fallback';
        }
      } else {
        // Для других ошибок пробуем fallback
        try {
          if (hasGigaChat) {
            const token = await getGigaChatToken();
            response = await sendToGigaChat(message, token, 'GigaChat-2');
            usedProvider = 'GigaChat-2 (fallback)';
          } else {
            response = `Извините, AI сервисы временно недоступны. Ваш вопрос: "${message}". Попробуйте позже.`;
            usedProvider = 'Fallback';
          }
        } catch (fallbackError) {
          log('❌ Fallback AI ошибка 2:', fallbackError.message, fallbackError.response?.status, fallbackError.response?.data);
          response = `Извините, AI сервисы временно недоступны. Ваш вопрос: "${message}". Попробуйте позже.`;
          usedProvider = 'Fallback';
        }
      }
    }

    // Обновляем счетчик использованных токенов
    if (isAuthenticated && userId) {
      await updateUsedTokens(userId, provider);
    }

    // Логируем запрос в базу данных
    if (userId) {
      try {
        // Примерный подсчет токенов (в реальности нужно использовать tiktoken или аналогичную библиотеку)
        const estimatedTokens = Math.ceil((message.length + response.length) / 4);
        
        await prisma.aiRequest.create({
          data: {
            userId: String(userId),
            prompt: message,
            response: response,
            provider: usedProvider,
            tokens: estimatedTokens
          }
        });
      } catch (dbError) {
        console.error('Ошибка сохранения запроса в БД:', dbError);
        // Не прерываем выполнение, просто логируем ошибку
      }
    }

    // Проверяем, что response - это строка
    if (typeof response !== 'string') {
      log('⚠️ Ответ не является строкой:', typeof response, response);
      response = String(response || 'Извините, произошла ошибка при получении ответа от AI.');
    }
    
    // Проверяем, что ответ не пустой
    if (!response || response.trim().length === 0) {
      log('⚠️ Получен пустой ответ, используем fallback');
      response = 'Извините, получен пустой ответ от AI. Попробуйте переформулировать вопрос.';
    }
    
    log('✅ /api/ai/chat ответ', { provider: usedProvider, responseLength: response.length, responsePreview: response.substring(0, 100) });
    
    // Сохраняем сообщения в диалог (только для авторизованных пользователей)
    if (isAuthenticated && userId && currentConversationId) {
      try {
        // Сохраняем сообщение пользователя
        await prisma.message.create({
          data: {
            conversationId: String(currentConversationId),
            role: 'user',
            content: message
          }
        });
        
        // Сохраняем ответ ассистента
        await prisma.message.create({
          data: {
            conversationId: String(currentConversationId),
            role: 'assistant',
            content: response
          }
        });
        
        // Обновляем время последнего обновления диалога
        await prisma.conversation.update({
          where: { id: String(currentConversationId) },
          data: { updatedAt: new Date() }
        });
        
        log('✅ Сообщения сохранены в диалог:', { conversationId: currentConversationId });
      } catch (dbError) {
        console.error('Ошибка сохранения сообщений в диалог:', dbError);
        // Не прерываем выполнение, просто логируем ошибку
      }
    }
    
    // Проверяем, был ли ответ обрезан (по косвенным признакам - если ответ обрывается на середине предложения или блока кода)
    const isTruncated = response.trim().endsWith('...') || 
                       (response.includes('```') && !response.match(/```[\s\S]*?```/g)?.some(block => block.endsWith('```'))) ||
                       response.trim().endsWith('while (!') || // Пример обрыва из пользовательского случая
                       (response.length > 3000 && !response.endsWith('.') && !response.endsWith('```'));
    
    res.json({
      response,
      provider: usedProvider,
      timestamp: new Date().toISOString(),
      tokensUsed: userId ? Math.ceil((message.length + response.length) / 4) : null,
      truncated: isTruncated, // Флаг, что ответ может быть обрезан
      conversationId: currentConversationId ? stringToNumber(currentConversationId) : null
    });

  } catch (error) {
    log('💥 Критическая ошибка AI обработчика:', error.message, error.stack);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера. Попробуйте еще раз.',
      details: error.message
    });
  }
});

// Функция для установки CORS заголовков
function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5005',
    'https://everestcode.ru',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5005'
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
}

// OPTIONS для /api/developer/contact
app.options('/api/developer/contact', (req, res) => {
  setCorsHeaders(req, res);
  res.sendStatus(200);
});

// API для связи с разработчиком
app.post('/api/developer/contact', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || !message.trim()) {
      setCorsHeaders(req, res);
      return res.status(400).json({ error: 'Сообщение не может быть пустым' });
    }

    const developerUsername = 'ever777st';
    // Chat ID разработчика (можно получить из переменной окружения или использовать напрямую)
    const developerChatId = process.env.DEVELOPER_CHAT_ID || '7918830838';
    const timestamp = new Date().toLocaleString('ru-RU');
    
    // Форматируем сообщение для Telegram
    const telegramMessage = `📨 <b>Новое сообщение от пользователя сайта</b>\n\n` +
      `⏰ <b>Время:</b> ${timestamp}\n\n` +
      `💬 <b>Сообщение:</b>\n${message.trim()}\n\n` +
      `🌐 <b>Источник:</b> everestcode.ru`;

    // Сразу возвращаем успешный ответ пользователю (не ждем Telegram)
    // Это предотвращает таймауты nginx на production
    setCorsHeaders(req, res);
    res.json({ 
      success: true, 
      message: 'Сообщение успешно отправлено разработчику' 
    });

    // Отправляем сообщение разработчику через Telegram бота асинхронно (в фоне)
    // Не ждем ответа от Telegram, чтобы не блокировать ответ пользователю
    setImmediate(async () => {
      try {
        if (!telegramBot || !telegramBot.isRunning) {
          log(`⚠️ Telegram бот не инициализирован, сообщение не отправлено`);
          console.error('Telegram бот недоступен. Проверьте TELEGRAM_BOT_TOKEN и инициализацию бота.');
          return;
        }

        log(`📤 Попытка отправить сообщение разработчику (Chat ID: ${developerChatId}, Username: @${developerUsername})...`);

        // Сначала пробуем отправить по chat_id (надежнее)
        const sendWithTimeout = async () => {
          try {
            // Пробуем отправить по chat_id
            return await Promise.race([
              telegramBot.sendMessageToUser(developerChatId, telegramMessage),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Таймаут отправки в Telegram (15 секунд)')), 15000)
              )
            ]);
          } catch (chatIdError) {
            log(`⚠️ Отправка по chat_id не удалась, пробуем по username...`);
            // Если не получилось по chat_id, пробуем по username
            return await Promise.race([
              telegramBot.sendMessageToUsername(developerUsername, telegramMessage),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Таймаут отправки в Telegram (15 секунд)')), 15000)
              )
            ]);
          }
        };

        await sendWithTimeout();
        log(`✅ Сообщение от пользователя успешно отправлено разработчику`);
      } catch (telegramError) {
        console.error('❌ Ошибка отправки в Telegram:', telegramError);
        log(`⚠️ Не удалось отправить сообщение в Telegram: ${telegramError.message}`);
        
        // Детальное логирование ошибки для отладки
        if (telegramError.response) {
          log(`📋 Детали ошибки Telegram API:`, {
            status: telegramError.response.statusCode,
            body: telegramError.response.body,
            description: telegramError.response.body?.description
          });
        }
        
        // Логируем, но не блокируем ответ пользователю
      }
    });
  } catch (error) {
    log('💥 Ошибка обработки сообщения разработчику:', error.message);
    log('📋 Stack trace:', error.stack);
    
    setCorsHeaders(req, res);
    
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера. Попробуйте позже.' 
    });
  }
});

// Получение списка доступных моделей GigaChat
app.get('/api/ai/models', async (req, res) => {
  try {
    // Проверяем наличие GigaChat API ключей
    if (!gigachatConfig.clientId || !gigachatConfig.clientSecret) {
      return res.status(503).json({ 
        error: 'GigaChat API не настроен',
        models: []
      });
    }

    // Получаем токен доступа
    const token = await getGigaChatToken();
    
    // Запрашиваем список моделей у GigaChat API
    const modelsResponse = await fetch('https://gigachat.devices.sberbank.ru/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      // Игнорируем SSL сертификаты для GigaChat API
      agent: new (require('https').Agent)({
        rejectUnauthorized: false
      })
    });

    if (!modelsResponse.ok) {
      throw new Error(`GigaChat API вернул ошибку: ${modelsResponse.status}`);
    }

    const modelsData = await modelsResponse.json();
    
    // Фильтруем только модели для чата
    const chatModels = modelsData.data?.filter(model => 
      model.type === 'chat' && 
      model.id && 
      !model.id.includes('preview') // Исключаем preview модели для стабильности
    ).map(model => ({
      id: model.id,
      name: model.id.replace('GigaChat:', 'GigaChat '),
      type: model.type,
      owned_by: model.owned_by
    })) || [];

    res.json({
      success: true,
      models: chatModels,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    log('❌ Ошибка получения моделей GigaChat:', error.message, error.response?.status, error.response?.data);
    
    // Возвращаем базовые модели как fallback
    const fallbackModels = [
      { id: 'GigaChat-2-Max', name: 'GigaChat-2-Max', type: 'chat', owned_by: 'salutedevices' },
      { id: 'GigaChat-2-Pro', name: 'GigaChat-2-Pro', type: 'chat', owned_by: 'salutedevices' },
      { id: 'GigaChat-2', name: 'GigaChat-2', type: 'chat', owned_by: 'salutedevices' }
    ];

    res.json({
      success: false,
      models: fallbackModels,
      error: 'Не удалось загрузить актуальный список моделей',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================
// GLOBAL ERROR HANDLERS
// =============================
process.on('unhandledRejection', (reason) => {
  log('🚨 Unhandled Rejection:', reason?.message || reason, reason?.stack || '');
});

process.on('uncaughtException', (err) => {
  log('🚨 Uncaught Exception:', err.message, err.stack);
});

// Telegram webhook
app.post('/api/telegram/webhook', (req, res) => {
  telegramBot.handleWebhook(req, res);
});

// Статический контент (React приложение)
// Кэшируем статические ассеты, но index.html всегда без кэша, чтобы подтянуть новый бандл
app.use(express.static(path.join(__dirname, 'build'), {
  maxAge: '1y',
  etag: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Fallback для React Router
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Запуск сервера
async function startServer() {
  try {
    await initializeDatabase();
    
    // Инициализируем Telegram бота
    const botInitialized = await telegramBot.initialize();
    if (botInitialized) {
      console.log('🤖 Telegram бот инициализирован');
    } else {
      console.log('⚠️ Telegram бот не инициализирован (проверьте TELEGRAM_BOT_TOKEN)');
    }
    
    // Создаем WebSocket сервер после инициализации HTTP сервера
    wss = new WebSocket.Server({ 
      server, 
      path: '/terminal'
    });
    
    console.log('🖥️ WebSocket сервер терминала создан');
    
    // Обработка WebSocket подключений
    wss.on('connection', (ws, req) => {
      const terminalId = Math.random().toString(36).substring(7);
      console.log(`🔌 Новое подключение терминала: ${terminalId}`);

      const terminal = new Terminal(ws, terminalId);
      terminals.set(terminalId, terminal);

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          
          switch (data.type) {
            case 'input':
              terminal.write(data.data);
              break;
            case 'resize':
              terminal.resize(data.cols, data.rows);
              break;
            default:
              console.log('Неизвестный тип сообщения:', data.type);
          }
        } catch (error) {
          console.error('Ошибка обработки сообщения:', error);
        }
      });

      ws.on('close', () => {
        console.log(`🔌 Терминал ${terminalId} отключен`);
        terminal.cleanup();
      });

      ws.on('error', (error) => {
        console.error(`🔌 Ошибка WebSocket для терминала ${terminalId}:`, error);
        terminal.cleanup();
      });

      // Отправляем подтверждение подключения
      terminal.send('connected', `Терминал ${terminalId} подключен`);
    });
    
    server.listen(port, host, () => {
      console.log(`🚀 Сервер запущен на http://${host}:${port}`);
      console.log(`🖥️ WebSocket терминал: ws://${host}:${port}/terminal`);
    });
  } catch (error) {
    console.error('❌ Ошибка запуска сервера:', error);
    process.exit(1);
  }
}

// Обработка сигналов завершения
process.on('SIGTERM', async () => {
  console.log('🛑 Получен SIGTERM, завершаем сервер...');
  
  // Останавливаем Telegram бота
  await telegramBot.stop();
  
  // Закрываем все терминалы
  terminals.forEach(terminal => terminal.cleanup());
  
  server.close(() => {
    console.log('🛑 Сервер остановлен');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('🛑 Получен SIGINT, завершаем сервер...');
  
  // Останавливаем Telegram бота
  await telegramBot.stop();
  
  // Закрываем все терминалы
  terminals.forEach(terminal => terminal.cleanup());
  
  server.close(() => {
    console.log('🛑 Сервер остановлен');
    process.exit(0);
  });
});

startServer();
