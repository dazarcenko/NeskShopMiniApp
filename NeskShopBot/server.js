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

const ADMIN_IDS = ['1044141986', 'ВСТАВЬ_ВТОРОЙ_ID_СЮДА'];
const BOT_TOKEN = process.env.bot_token || process.env.BOT_TOKEN;

// 1. ПРОВЕРКА ПОДЛИННОСТИ (Защита от подделки ID)
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

// Middleware для защиты админ-маршрутов
const adminOnly = (req, res, next) => {
  const tgId = req.headers['x-telegram-id'];
  const initData = req.headers['x-tg-init-data'];
  if (!ADMIN_IDS.includes(String(tgId))) return res.status(403).json({ error: 'Нет прав' });
  if (!checkTelegramAuth(initData)) return res.status(403).json({ error: 'Недействительная подпись Telegram (Попытка взлома)' });
  next();
};

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const categoriesFile = path.join(uploadDir, 'categories.json');
if (!fs.existsSync(categoriesFile)) {
  const defaultCats = [
    { id: "1", name: "Жидкости", image: "https://via.placeholder.com/400/1a1a1a/FFD700?text=Жидкости", subcategories: ["20 мг", "50 мг", "70 мг"] },
    { id: "2", name: "Pod-Системы", image: "https://via.placeholder.com/400/1a1a1a/FFD700?text=Pod-Системы", subcategories: [] },
    { id: "3", name: "Расходники", image: "https://via.placeholder.com/400/1a1a1a/FFD700?text=Расходники", subcategories: [] }
  ];
  fs.writeFileSync(categoriesFile, JSON.stringify(defaultCats, null, 2));
}

// 2. ЗАЩИТА ФАЙЛОВОЙ СИСТЕМЫ (Только картинки, макс 5 МБ)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Разрешены только изображения (jpg, png, webp)!'));
  }
});

app.use(express.json());
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, 'frontend/dist')));

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

app.delete('/api/admin/categories/:id', adminOnly, (req, res) => {
  let cats = JSON.parse(fs.readFileSync(categoriesFile, 'utf8'));
  fs.writeFileSync(categoriesFile, JSON.stringify(cats.filter(c => c.id !== req.params.id), null, 2));
  res.json({ success: true });
});

app.get('/api/products', async (req, res) => res.json(await prisma.product.findMany()));

app.post('/api/admin/products', adminOnly, upload.single('image'), async (req, res) => {
  try {
    const { title, price, category, description, flavors, oldPrice } = req.body;
    const finalDesc = `${description || ''}|||${flavors || ''}|||${oldPrice || ''}`;
    const product = await prisma.product.create({
      data: { title, price: Number(price), category, description: finalDesc, imageUrl: req.file ? `/uploads/${req.file.filename}` : '' }
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

app.post('/api/orders', async (req, res) => {
  try {
    const { items, totalAmount, buyerName, deliveryMethod, deliveryAddress, note, username } = req.body;
    if (!BOT_TOKEN) return res.status(500).json({ error: 'Токен бота не настроен' });

    const itemsText = items.map(item => `▪️ ${item.title} (x${item.quantity}) — ${item.price * item.quantity} ₽`).join('\n');
    const message = `🚨 <b>НОВЫЙ ЗАКАЗ!</b>\n\n👤 <b>Имя:</b> ${buyerName}\n💬 <b>Связь:</b> ${username ? '@' + username : 'Скрыт/Нет юзернейма'}\n🚚 <b>Способ:</b> ${deliveryMethod}\n${deliveryAddress ? `📍 <b>Адрес:</b> ${deliveryAddress}\n` : ''}📝 <b>Примечание:</b> ${note || 'Нет'}\n\n📦 <b>Товары:</b>\n${itemsText}\n\n💰 <b>Сумма к оплате:</b> ${totalAmount} ₽`;

    for (const adminId of ADMIN_IDS) {
      if (adminId && adminId !== 'ВСТАВЬ_ВТОРОЙ_ID_СЮДА') {
        fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: adminId, text: message, parse_mode: 'HTML' })
        }).catch(() => {});
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
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: update.message.chat.id, text: welcomeText,
              reply_markup: { inline_keyboard: [[{ text: '🛒 Открыть магазин', web_app: { url: WEB_APP_URL } }]] }
            })
          });
        }
      }
    }
  } catch (e) {}
  setTimeout(pollTelegram, 1000);
}
pollTelegram();
