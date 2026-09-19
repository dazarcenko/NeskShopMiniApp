import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import fs from 'fs'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const prisma = new PrismaClient();

// АВТОМАТИЧЕСКОЕ СОЗДАНИЕ ПАПКИ uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Настройка папки для загрузки картинок
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.use(express.json());
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Получение списка товаров
app.get('/api/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (error) {
    console.error('Ошибка получения товаров:', error);
    res.status(500).json({ error: error.message });
  }
});

// Добавление товара (Админка)
app.post('/api/admin/products', upload.single('image'), async (req, res) => {
  try {
    const tgId = req.headers['x-telegram-id'];
    if (String(tgId) !== '1044141986') {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    const { title, price, category, description } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const product = await prisma.product.create({
      data: {
        title,
        price: Number(price),
        category,
        description: description || '',
        imageUrl: imageUrl || 'https://via.placeholder.com/300'
      }
    });
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SPA fallback для React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// ==========================================
// --- ЛОГИКА ТЕЛЕГРАМ БОТА (Ответ на /start)
// ==========================================

// Сервер автоматически подтянет токен из переменных Railway
const BOT_TOKEN = process.env.bot_token || process.env.BOT_TOKEN; 

// Ссылка на твой Web App
const WEB_APP_URL = 'https://neskshopminiapp-production.up.railway.app';

let lastUpdateId = 0;
async function pollTelegram() {
  // Если переменной в Railway нет, сервер выдаст ошибку в логи и не будет запускать бота
  if (!BOT_TOKEN) {
    console.error('ВНИМАНИЕ: Токен бота не найден! Проверьте переменные (Variables) в Railway.');
    return;
  }
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`);
    if (!response.ok) return setTimeout(pollTelegram, 5000);
    
    const data = await response.json();
    if (data.ok && data.result.length > 0) {
      for (const update of data.result) {
        lastUpdateId = update.update_id;
        
        // Отлавливаем команду /start
        if (update.message && update.message.text === '/start') {
          const chatId = update.message.chat.id;
          
          const welcomeText = 
`Добро пожаловать в NeskShop! 🛍

Здесь вы можете выбрать и заказать наш товар:
💨 Жидкости
🔋 Pod-системы
🚬 Одноразки
⚙️ Расходники

Нажмите кнопку ниже, чтобы открыть каталог магазина!👇`;
          
          // Отправляем сообщение с кнопкой Web App
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: welcomeText,
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🛒 Открыть магазин', web_app: { url: WEB_APP_URL } }]
                ]
              }
            })
          });
        }
      }
    }
  } catch (e) {
    console.error('Ошибка работы бота:', e.message);
  }
  
  // Бесконечный цикл опроса серверов Telegram
  setTimeout(pollTelegram, 1000);
}
pollTelegram();
