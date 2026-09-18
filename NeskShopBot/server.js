import express from 'express';
import cors from 'cors';
import { Telegraf } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Инициализация путей и переменных
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

const prisma = new PrismaClient();
const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

// Настройка папки для картинок
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Настройка сервера
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// --- API МАРШРУТЫ ---

// 1. Вывод каталога
app.get('/api/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 2. Оформление заказа и отправка в Телеграм
app.post('/api/orders', async (req, res) => {
  try {
    const { telegramId, username, items, totalAmount, deliveryInfo } = req.body;
    
    const adminId = process.env.ADMIN_TG_ID;
    const itemsList = items.map(i => `▪️ ${i.title} (x${i.quantity}) - ${i.price * i.quantity}₽`).join('\n');
    const message = `🔔 <b>Новый заказ!</b>\n\n👤 От: @${username} (ID: ${telegramId})\n📍 Доставка/Тел: ${deliveryInfo}\n\n📦 <b>Товары:</b>\n${itemsList}\n\n💰 <b>Итого:</b> ${totalAmount} ₽`;
    
    await bot.telegram.sendMessage(adminId, message, { parse_mode: 'HTML' });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка оформления заказа' });
  }
});

// 3. Добавление товара (Админка)
app.post('/api/admin/products', upload.single('image'), async (req, res) => {
  try {
    // Проверка на админа
    const tgId = req.headers['x-telegram-id'];
    if (String(tgId) !== String(process.env.ADMIN_TG_ID)) {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    const { title, price, category, description } = req.body;
    const imageUrl = `/uploads/${req.file.filename}`;

    const newProduct = await prisma.product.create({
      data: {
        title,
        price: parseFloat(price),
        category,
        description: description || '',
        imageUrl
      }
    });

    res.json(newProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при добавлении товара' });
  }
});

// Все остальные запросы отдают интерфейс магазина
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

// --- НАСТРОЙКА БОТА ---
bot.start((ctx) => {
  ctx.reply('Добро пожаловать в NeskShop! Нажмите кнопку ниже, чтобы открыть магазин.', {
    reply_markup: {
      inline_keyboard: [[{ text: '🛍 Открыть магазин', web_app: { url: process.env.WEB_APP_URL } }]]
    }
  });
});

// --- ЗАПУСК ---
app.listen(PORT, '0.0.0.0' () => {
  console.log(`[SERVER] Сервер запущен на порту ${PORT}`);
  bot.launch().then(() => console.log('[BOT] Бот успешно запущен')).catch(err => console.error('[BOT] Ошибка запуска:', err));
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
