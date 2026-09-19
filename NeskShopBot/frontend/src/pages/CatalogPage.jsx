import { useState, useEffect } from 'react';
import axios from 'axios';

export default function CatalogPage() {
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Все');
  
  // Состояния для редактирования
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', price: '', category: '', description: '' });
  const [editImage, setEditImage] = useState(null);

  const tg = window.Telegram?.WebApp;
  const userId = tg?.initDataUnsafe?.user?.id;
  const isAdmin = String(userId) === '1044141986'; // Проверка на админа

  const categories = ['Все', 'Жидкости', 'Pod-Системы', 'Расходники'];

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = () => {
    axios.get('/api/products')
      .then(res => setProducts(res.data))
      .catch(console.error);
  };

  const filteredProducts = selectedCategory === 'Все' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  const addToCart = (product) => {
    let cart = JSON.parse(localStorage.getItem('nesk_cart')) || [];
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }
    localStorage.setItem('nesk_cart', JSON.stringify(cart));
    
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    if (tg && tg.showAlert) tg.showAlert(`Товар "${product.title}" добавлен в корзину!`);
    else alert('Добавлено в корзину!');
  };

  // --- ФУНКЦИИ АДМИНА ---

  const handleDelete = async (id) => {
    if (!window.confirm('Точно удалить этот товар?')) return;
    try {
      await axios.delete(`/api/admin/products/${id}`, {
        headers: { 'x-telegram-id': '1044141986' }
      });
      setProducts(products.filter(p => p.id !== id));
      if (tg?.showAlert) tg.showAlert('Товар удален!');
    } catch (err) {
      alert('Ошибка при удалении');
    }
  };

  const openEditModal = (p) => {
    setEditingProduct(p);
    setEditForm({ title: p.title, price: p.price, category: p.category, description: p.description });
    setEditImage(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('title', editForm.title);
    data.append('price', editForm.price);
    data.append('category', editForm.category);
    data.append('description', editForm.description);
    if (editImage) data.append('image', editImage);

    try {
      const res = await axios.put(`/api/admin/products/${editingProduct.id}`, data, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'x-telegram-id': '1044141986' 
        }
      });
      setProducts(products.map(p => p.id === editingProduct.id ? res.data : p));
      setEditingProduct(null);
      if (tg?.showAlert) tg.showAlert('Товар успешно обновлен!');
    } catch (err) {
      alert('Ошибка при редактировании');
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-white border-l-4 border-[#FFD700] pl-2">Каталог товаров</h2>
      
      {/* МЕНЮ КАТЕГОРИЙ */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-colors ${
              selectedCategory === category
                ? 'bg-[#FFD700] text-black' 
                : 'bg-[#1a1a1a] text-gray-400 border border-gray-800'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* СПИСОК ТОВАРОВ */}
      {filteredProducts.length === 0 ? (
        <div className="text-center text-gray-500 mt-10 font-medium">В этой категории пока нет товаров</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-10">
          {filteredProducts.map(p => (
            <div key={p.id} className="bg-[#1a1a1a] rounded-xl overflow-hidden shadow-lg flex flex-col border border-gray-800 relative">
              
              {/* КНОПКИ УПРАВЛЕНИЯ ТОЛЬКО ДЛЯ АДМИНА */}
              {isAdmin && (
                <div className="absolute top-2 left-2 flex gap-1 z-10">
                  <button onClick={() => openEditModal(p)} className="bg-blue-600/90 text-white p-1.5 rounded-lg text-sm shadow-md active:scale-95">✏️</button>
                  <button onClick={() => handleDelete(p.id)} className="bg-red-600/90 text-white p-1.5 rounded-lg text-sm shadow-md active:scale-95">🗑️</button>
                </div>
              )}

              <div className="h-40 relative">
                <img src={p.imageUrl} alt={p.title} className="object-cover w-full h-full" />
                <span className="absolute top-2 right-2 bg-black/80 text-[10px] px-2 py-1 rounded-full text-[#FFD700] font-bold">
                  {p.category}
                </span>
              </div>
              <div className="p-3 flex flex-col flex-grow">
                <h3 className="text-sm font-semibold text-white leading-tight mb-1">{p.title}</h3>
                <p className="text-xs text-gray-400 mb-2 line-clamp-2 flex-grow">{p.description}</p>
                <p className="text-[#FFD700] font-bold mb-2 text-lg">{p.price} ₽</p>
                <button 
                  onClick={() => addToCart(p)}
                  className="w-full bg-[#FFD700] text-black font-bold py-2 rounded-lg active:bg-yellow-600 transition"
                >
                  В корзину
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ (Показывается только если нажали на ✏️) */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/90 z-50 flex justify-center items-center p-4">
          <div className="bg-[#1a1a1a] p-5 rounded-xl border border-gray-800 w-full max-w-sm">
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">Редактирование</h2>
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-3">
              <input 
                type="text" placeholder="Название" required
                value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})}
                className="bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-[#FFD700]"
              />
              <input 
                type="number" placeholder="Цена" required
                value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})}
                className="bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-[#FFD700]"
              />
              <select 
                value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})}
                className="bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-[#FFD700]"
              >
                <option>Жидкости</option>
                <option>Pod-Системы</option>
                <option>Одноразки</option>
                <option>Расходники</option>
              </select>
              <textarea 
                placeholder="Описание" 
                value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})}
                className="bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-[#FFD700] min-h-[80px]"
              />
              <div className="bg-black border border-gray-700 rounded-lg p-3">
                <label className="text-xs text-gray-400 block mb-1">Новое фото (необязательно):</label>
                <input 
                  type="file" accept="image/*"
                  onChange={e => setEditImage(e.target.files[0])} 
                  className="text-xs text-gray-400 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:bg-[#FFD700] file:text-black file:font-bold"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button type="submit" className="flex-1 bg-[#FFD700] text-black font-bold py-3 rounded-lg">Сохранить</button>
                <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 bg-gray-800 text-white font-bold py-3 rounded-lg">Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
