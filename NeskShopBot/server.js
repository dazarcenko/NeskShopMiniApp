import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import fs from 'fs'; 
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const prisma = new PrismaClient();

// ОБА АДМИНА УЖЕ ВШИТЫ В КОД
const ADMIN_IDS = ['1044141986', '1067205524'];
const BOT_TOKEN = process.env.bot_token || process.env.BOT_TOKEN;

function checkTelegramAuth(initData) {
  if (!initData || !BOT_TOKEN) return false;
  try {
    const q = new URLSearchParams(initData);
    const hash = q.get('hash');
    q.delete('hash');
    const keys = Array.from(q.keys()).sort();
    const dataCheckString = keys.map(k => `${k}=${q.get(k)}`).join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    return hmac === hash;
  } catch (e) {
    return false;
  }
}

const adminOnly = (req, res, next) => {
  const tgId = req.headers['x-telegram-id'];
  const initData = req.headers['x-tg-init-data'];
  if (!ADMIN_IDS.includes(String(tgId))) return res.status(403).json({ error: 'Нет прав' });
  if (!checkTelegramAuth(initData)) return res.status(403).json({ error: 'Недействительная подпись Telegram' });
  next();
};

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const categoriesFile = path.join(uploadDir, 'categories.json');
if (!fs.existsSync(categoriesFile)) fs.writeFileSync(categoriesFile, JSON.stringify([]));

const reviewsFile = path.join(uploadDir, 'reviews.json');
if (!fs.existsSync(reviewsFile)) fs.writeFileSync(reviewsFile, JSON.stringify({}));

const pinnedFile = path.join(uploadDir, 'pinned.json');
if (!fs.existsSync(pinnedFile)) fs.writeFileSync(pinnedFile, JSON.stringify([]));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ 
  storage, limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) cb(null, true);
    else cb(new Error('Разрешены только картинки!'));
  }
});

app.use(express.json());
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// --- КАТЕГОРИИ ---
app.get('/api/categories', (req, res) => res.json(JSON.parse(fs.readFileSync(categoriesFile, 'utf8'))));

app.post('/api/admin/categories', adminOnly, upload.single('image'), (req, res) => {
  let cats = JSON.parse(fs.readFileSync(categoriesFile, 'utf8'));
  const newCat = {
    id: Date.now().toString(), name: req.body.name,
    image: req.file ? `/uploads/${req.file.filename}` : 'https://via.placeholder.com/400/1a1a1a/FFD700?text=' + req.body.name,
    subcategories: req.body.subcategories ? req.body.subcategories.split(',').map(s => s.trim()).filter(s => s) : []
  };
  cats.push(newCat);
  fs.writeFileSync(categoriesFile, JSON.stringify(cats, null, 2));
  res.json(newCat);
});

// ОБНОВЛЕНО: Умное редактирование категории с переносом товаров
app.put('/api/admin/categories/:id', adminOnly, upload.single('image'), async (req, res) => {
  let cats = JSON.parse(fs.readFileSync(categoriesFile, 'utf8'));
  const index = cats.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Не найдено' });

  const oldName = cats[index].name;
  const newName = req.body.name || cats[index].name;

  cats[index].name = newName;
  if (req.body.subcategories !== undefined) {
    cats[index].subcategories = req.body.subcategories ? req.body.subcategories.split(',').map(s => s.trim()).filter(s => s) : [];
  }
  if (req.file) cats[index].image = `/uploads/${req.file.filename}`;
  
  fs.writeFileSync(categoriesFile, JSON.stringify(cats, null, 2));

  // Если имя изменилось, перепривязываем все товары
  if (oldName !== newName) {
    const allProducts = await prisma.product.findMany();
    for (const p of allProducts) {
      const parts = (p.category || '').split(' | ');
      if (parts[0] === oldName) {
        // Сохраняем старую подкатегорию (если была)
        const finalCat = parts[1] ? `${newName} | ${parts[1]}` : newName;
        await prisma.product.update({
          where: { id: p.id },
          data: { category: finalCat }
        });
      }
    }
  }

  res.json(cats[index]);
});

app.delete('/api/admin/categories/:id', adminOnly, (req, res) => {
  let cats = JSON.parse(fs.readFileSync(categoriesFile, 'utf8'));
  fs.writeFileSync(categoriesFile, JSON.stringify(cats.filter(c => c.id !== req.params.id), null, 2));
  res.json({ success: true });
});

// --- ТОВАРЫ ---
app.get('/api/products', async (req, res) => res.json(await prisma.product.findMany()));

app.post('/api/admin/products', adminOnly, upload.single('image'), async (req, res) => {
  try {
    const { title, price, category, description, flavors, oldPrice } = req.body;
    const product = await prisma.product.create({
      data: { title, price: Number(price), category, description: `${description || ''}|||${flavors || ''}|||${oldPrice || ''}`, imageUrl: req.file ? `/uploads/${req.file.filename}` : '' }
    });
    res.json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/products/:id', adminOnly, upload.single('image'), async (req, res) => {
  try {
    const { title, price, category, description, flavors, oldPrice } = req.body;
    const updateData = { title, price: Number(price), category, description: `${description || ''}|||${flavors || ''}|||${oldPrice || ''}` };
    if (req.file) updateData.imageUrl = `/uploads/${req.file.filename}`;
    const product = await prisma.product.update({
      where: { id: isNaN(Number(req.params.id)) ? req.params.id : Number(req.params.id) },
      data: updateData
    });
    res.json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/products/:id', adminOnly, async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: isNaN(Number(req.params.id)) ? req.params.id : Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- МЕТАДАННЫЕ (ОТЗЫВЫ И ЗАКРЕПЫ) ---
app.get('/api/product-meta', (req, res) => {
  const reviews = JSON.parse(fs.readFileSync(reviewsFile, 'utf8'));
  const pinned = JSON.parse(fs.readFileSync(pinnedFile, 'utf8'));
  res.json({ reviews, pinned });
});

app.post('/api/reviews', (req, res) => {
  const { productId, user, rating, text } = req.body;
  let reviews = JSON.parse(fs.readFileSync(reviewsFile, 'utf8'));
  if (!reviews[productId]) reviews[productId] = [];
  
  const newReview = {
    id: Date.now().toString(),
    user: user || 'Покупатель',
    rating: Number(rating),
    text: text || '',
    date: new Date().toLocaleDateString('ru-RU')
  };
  
  reviews[productId].push(newReview);
  fs.writeFileSync(reviewsFile, JSON.stringify(reviews, null, 2));
  res.json(reviews[productId]);
});

app.post('/api/admin/pin/:id', adminOnly, (req, res) => {
  const { id } = req.params;
  let pinned = JSON.parse(fs.readFileSync(pinnedFile, 'utf8'));
  
  if (pinned.includes(id)) {
    pinned = pinned.filter(p => p !== id); // Открепить
  } else {
    pinned.push(id); // Закрепить
  }
  
  fs.writeFileSync(pinnedFile, JSON.stringify(pinned, null, 2));
  res.json(pinned);
});

// --- ЗАКАЗЫ И БОТ ---
app.post('/api/orders', async (req, res) => {
  try {
    const { items, totalAmount, buyerName, deliveryMethod, deliveryAddress, note, username } = req.body;
    if (!BOT_TOKEN) return res.status(500).json({ error: 'Токен бота не настроен' });
    const itemsText = items.map(item => `▪️ ${item.title} (x${item.quantity}) — ${item.price * item.quantity} ₽`).join('\n');
    const message = `🚨 <b>НОВЫЙ ЗАКАЗ!</b>\n\n👤 <b>Имя:</b> ${buyerName}\n💬 <b>Связь:</b> ${username ? '@' + username : 'Скрыт/Нет юзернейма'}\n🚚 <b>Способ:</b> ${deliveryMethod}\n${deliveryAddress ? `📍 <b>Адрес:</b> ${deliveryAddress}\n` : ''}📝 <b>Примечание:</b> ${note || 'Нет'}\n\n📦 <b>Товары:</b>\n${itemsText}\n\n💰 <b>Сумма к оплате:</b> ${totalAmount} ₽`;
    
    // Рассылаем всем админам
    for (const adminId of ADMIN_IDS) {
      if (adminId) {
        fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: adminId, text: message, parse_mode: 'HTML' }) }).catch(() => {});
      }
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'frontend/dist', 'index.html')));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));

let lastUpdateId = 0;
async function pollTelegram() {
  if (!BOT_TOKEN) return;
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`);
    if (!response.ok) return setTimeout(pollTelegram, 5000);
    const data = await response.json();
    if (data.ok && data.result.length > 0) {
      for (const update of data.result) {
        lastUpdateId = update.update_id;
        if (update.message && update.message.text === '/start') {
          const welcomeText = `Добро пожаловать в NeskShop! 🛍\n\nЗдесь вы можете выбрать и заказать наш товар:\n💨 Жидкости\n🔋 Pod-системы\n🚬 Одноразки\n⚙️ Расходники\n\nНажмите кнопку ниже, чтобы открыть каталог магазина!👇`;
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: update.message.chat.id, text: welcomeText, reply_markup: { inline_keyboard: [[{ text: '🛒 Открыть магазин', web_app: { url: WEB_APP_URL } }]] } })
          });
        }
      }
    }
  } catch (e) {}
  setTimeout(pollTelegram, 1000);
}
pollTelegram();
