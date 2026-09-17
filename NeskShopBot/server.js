import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { Telegraf } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_TG_ID = parseInt(process.env.ADMIN_TG_ID, 10);
const WEB_APP_URL = process.env.WEB_APP_URL;

// Проверка наличия папки uploads
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
});
const upload = multer({ storage });

const isAdmin = (req, res, next) => {
  const tgId = parseInt(req.headers['x-telegram-id'], 10);
  if (tgId !== ADMIN_TG_ID) return res.status(403).json({ error: 'Access denied' });
  next();
};

// --- API КЛИЕНТА ---
app.get('/api/products', async (req, res) => {
  const products = await prisma.product.findMany({ where: { isAvailable: true } });
  res.json(products);
});

app.post('/api/orders', async (req, res) => {
  const { telegramId, username, items, totalAmount, deliveryInfo } = req.body;
  
  try {
    let user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) user = await prisma.user.create({ data: { telegramId, username } });

    const order = await prisma.order.create({
      data: { userId: user.id, items, totalAmount, deliveryInfo }
    });

    let itemsText = items.map(i => `- ${i.title} (x${i.quantity})`).join('\n');
    const orderText = `🛒 <b>Новый заказ #${order.id}</b>\n👤 Пользователь: @${username || telegramId}\n📦 Инфо: ${deliveryInfo}\n💰 Сумма: ${totalAmount} ₽\n\n<b>Товары:</b>\n${itemsText}`;

    await bot.telegram.sendMessage(ADMIN_TG_ID, orderText, { parse_mode: 'HTML' });
    await bot.telegram.sendMessage(telegramId, `✅ Спасибо за заказ #${order.id}!\nСумма: ${totalAmount} ₽. Менеджер скоро свяжется с вами для уточнения деталей оплаты и доставки.`);

    res.json({ success: true, orderId: order.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Order failed' });
  }
});

// --- API АДМИНА ---
app.post('/api/admin/products', isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { title, description, price, category } = req.body;
    const imageUrl = `/uploads/${req.file.filename}`;
    const product = await prisma.product.create({
      data: { title, description, price: parseFloat(price), category, imageUrl }
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Product creation failed' });
  }
});

// --- ТЕЛЕГРАМ БОТ ---
bot.start((ctx) => {
  ctx.reply('Добро пожаловать в NeskShop! 🔥\nНажми кнопку ниже, чтобы открыть магазин.', {
    reply_markup: { inline_keyboard: [[{ text: '🛒 Открыть магазин', web_app: { url: WEB_APP_URL } }]] }
  });
});
bot.launch();

// --- РАЗДАЧА REACT (FRONTEND) ДЛЯ RAILWAY ---
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'frontend/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

// ... твои API роуты (app.get, app.post и т.д.) ...

// Раздача статики React-приложения (Фронтенд)
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Любой неизвестный роут отправляем на index.html (нужно для React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

// Запуск сервера (Railway сам выдает порт через process.env.PORT)
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));