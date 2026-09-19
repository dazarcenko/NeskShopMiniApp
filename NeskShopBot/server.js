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

// Настройка "вечной" папки
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// --- НОВОЕ: УПРАВЛЕНИЕ КАТЕГОРИЯМИ В ФАЙЛЕ ---
const categoriesFile = path.join(uploadDir, 'categories.json');
// Если категорий еще нет, создаем стандартные (как ты просил)
if (!fs.existsSync(categoriesFile)) {
  const defaultCats = [
    { id: "1", name: "Жидкости", image: "https://via.placeholder.com/400/1a1a1a/FFD700?text=Жидкости", subcategories: ["20 мг", "50 мг", "70 мг"] },
    { id: "2", name: "Pod-Системы", image: "https://via.placeholder.com/400/1a1a1a/FFD700?text=Pod-Системы", subcategories: [] },
    { id: "3", name: "Расходники", image: "https://via.placeholder.com/400/1a1a1a/FFD700?text=Расходники", subcategories: [] }
  ];
  fs.writeFileSync(categoriesFile, JSON.stringify(defaultCats, null, 2));
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

app.use(express.json());
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// --- API КАТЕГОРИЙ ---
app.get('/api/categories', (req, res) => {
  const cats = JSON.parse(fs.readFileSync(categoriesFile, 'utf8'));
  res.json(cats);
});

app.post('/api/admin/categories', upload.single('image'), (req, res) => {
  const tgId = req.headers['x-telegram-id'];
  if (String(tgId) !== '1044141986') return res.status(403).json({ error: 'Нет доступа' });

  const { name, subcategories } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  let cats = JSON.parse(fs.readFileSync(categoriesFile, 'utf8'));
  
  const newCat = {
    id: Date.now().toString(),
    name,
    image: imageUrl || 'https://via.placeholder.com/400/1a1a1a/FFD700?text=' + name,
    subcategories: subcategories ? subcategories.split(',').map(s => s.trim()).filter(s => s) : []
  };
  cats.push(newCat);
  fs.writeFileSync(categoriesFile, JSON.stringify(cats, null, 2));
  res.json(newCat);
});

app.delete('/api/admin/categories/:id', (req, res) => {
  const tgId = req.headers['x-telegram-id'];
  if (String(tgId) !== '1044141986') return res.status(403).json({ error: 'Нет доступа' });

  let cats = JSON.parse(fs.readFileSync(categoriesFile, 'utf8'));
  cats = cats.filter(c => c.id !== req.params.id);
  fs.writeFileSync(categoriesFile, JSON.stringify(cats, null, 2));
  res.json({ success: true });
});

// --- API ТОВАРОВ ---
app.get('/api/products', async (req, res) => {
  const products = await prisma.product.findMany();
  res.json(products);
});

app.post('/api/admin/products', upload.single('image'), async (req, res) => {
  try {
    const tgId = req.headers['x-telegram-id'];
    if (String(tgId) !== '1044141986') return res.status(403).json({ error: 'Нет доступа' });
    const { title, price, category, description } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const product = await prisma.product.create({
      data: { title, price: Number(price), category, description: description || '', imageUrl: imageUrl || '' }
    });
    res.json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/products/:id', upload.single('image'), async (req, res) => {
  try {
    const tgId = req.headers['x-telegram-id'];
    if (String(tgId) !== '1044141986') return res.status(403).json({ error: 'Нет доступа' });
    const { title, price, category, description } = req.body;
    const updateData = { title, price: Number(price), category, description: description || '' };
    if (req.file) updateData.imageUrl = `/uploads/${req.file.filename}`;
    const product = await prisma.product.update({
      where: { id: isNaN(Number(req.params.id)) ? req.params.id : Number(req.params.id) },
      data: updateData
    });
    res.json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/products/:id', async (req, res) => {
  try {
    const tgId = req.headers['x-telegram-id'];
    if (String(tgId) !== '1044141986') return res.status(403).json({ error: 'Нет доступа' });
    await prisma.product.delete({
      where: { id: isNaN(Number(req.params.id)) ? req.params.id : Number(req.params.id) }
    });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'frontend/dist', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));

// --- БОТ ---
const BOT_TOKEN = process.env.bot_token || process.env.BOT_TOKEN; 
const WEB_APP_URL = 'https://neskshopminiapp-production.up.railway.app';
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
