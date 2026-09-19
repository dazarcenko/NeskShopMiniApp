import { useState, useEffect } from 'react';
import axios from 'axios';

export default function CatalogPage() {
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const tg = window.Telegram?.WebApp;

  // Список категорий для кнопок
  const categories = ['Все', 'Жидкости', 'Pod-Системы', 'Расходники'];

  useEffect(() => {
    axios.get('/api/products')
      .then(res => setProducts(res.data))
      .catch(console.error);
  }, []);

  // Логика фильтрации: показываем все, либо только выбранную категорию
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
    
    if(tg && tg.showAlert) {
      tg.showAlert(`Товар "${product.title}" добавлен в корзину!`);
    } else {
      alert('Добавлено в корзину!');
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
        <div className="text-center text-gray-500 mt-10 font-medium">
          В этой категории пока нет товаров
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredProducts.map(p => (
            <div key={p.id} className="bg-[#1a1a1a] rounded-xl overflow-hidden shadow-lg flex flex-col border border-gray-800">
              <div className="h-40 relative">
                <img src={p.imageUrl} alt={p.title} className="object-cover w-full h-full" />
                <span className="absolute top-2 right-2 bg-black/80 text-[10px] px-2 py-1 rounded-full text-[#FFD700] font-bold">
                  {p.category}
                </span>
              </div>
              <div className="p-3 flex flex-col flex-grow">
                <h3 className="text-sm font-semibold truncate text-white">{p.title}</h3>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{p.description}</p>
                <p className="text-[#FFD700] font-bold mt-2 text-lg">{p.price} ₽</p>
                <button 
                  onClick={() => addToCart(p)}
                  className="mt-auto w-full bg-[#FFD700] text-black font-bold py-2 rounded-lg mt-3 active:bg-yellow-600 transition"
                >
                  В корзину
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
