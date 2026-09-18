import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const prisma = new PrismaClient();

// Настройка папки для загрузки картинок
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
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
    // Проверка прав закомментирована для удобства
    // const tgId = req.headers['x-telegram-id'];
    // if (String(tgId) !== String(process.env.ADMIN_TG_ID)) {
    //   return res.status(403).json({ error: 'Нет доступа' });
    // }

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
    console.error('Ошибка добавления товара:', error);
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
