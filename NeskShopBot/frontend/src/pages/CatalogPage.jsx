import { useState, useEffect } from 'react';
import axios from 'axios';

export default function CatalogPage() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  
  // Навигация: 'main' (категории), 'sub' (выбор крепости), 'products' (список товаров)
  const [view, setView] = useState('main'); 
  const [activeMainCat, setActiveMainCat] = useState(null);
  const [activeSubCat, setActiveSubCat] = useState(null);

  // Для админа
  const tg = window.Telegram?.WebApp;
  const isAdmin = String(tg?.initDataUnsafe?.user?.id) === '1044141986';

  useEffect(() => {
    axios.get('/api/categories').then(res => setCategories(res.data)).catch(console.error);
    axios.get('/api/products').then(res => setProducts(res.data)).catch(console.error);
  }, []);

  const handleCategoryClick = (cat) => {
    setActiveMainCat(cat);
    if (cat.subcategories && cat.subcategories.length > 0) setView('sub');
    else setView('products');
  };

  const handleSubClick = (sub) => {
    setActiveSubCat(sub);
    setView('products');
  };

  const handleBack = () => {
    if (view === 'products' && activeMainCat?.subcategories?.length > 0) {
      setView('sub');
      setActiveSubCat(null);
    } else {
      setView('main');
      setActiveMainCat(null);
      setActiveSubCat(null);
    }
  };

  const finalTargetCategory = activeSubCat ? `${activeMainCat?.name} | ${activeSubCat}` : activeMainCat?.name;
  const filteredProducts = products.filter(p => p.category === finalTargetCategory);

  const addToCart = (product) => {
    let cart = JSON.parse(localStorage.getItem('nesk_cart')) || [];
    const existing = cart.find(item => item.id === product.id);
    if (existing) existing.quantity += 1;
    else cart.push({ ...product, quantity: 1 });
    localStorage.setItem('nesk_cart', JSON.stringify(cart));
    
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    if (tg?.showAlert) tg.showAlert(`Добавлено: ${product.title}`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Точно удалить?')) return;
    try {
      await axios.delete(`/api/admin/products/${id}`, { headers: { 'x-telegram-id': '1044141986' } });
      setProducts(products.filter(p => p.id !== id));
    } catch (err) { alert('Ошибка'); }
  };

  return (
    <div className="px-4 pt-4">
      
      {/* КРАСИВЫЙ БАННЕР НА ГЛАВНОЙ */}
      {view === 'main' ? (
        <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-black border border-gray-800 shadow-[0_4px_20px_rgba(0,0,0,0.5)] relative overflow-hidden">
          {/* Легкое свечение на фоне */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#FFD700] opacity-10 rounded-full blur-3xl"></div>
          
          <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 relative z-10">
            Выберите <span className="text-[#FFD700]">категорию</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1 relative z-10">Откройте для себя наш ассортимент</p>
        </div>
      ) : (
        <div className="flex items-center mb-6 mt-2">
          <button onClick={handleBack} className="mr-3 bg-[#1a1a1a] p-2 rounded-xl text-white border border-gray-800 hover:bg-gray-800 transition active:scale-95">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-xl font-bold text-white">
            {view === 'sub' ? activeMainCat.name : activeSubCat || activeMainCat.name}
          </h2>
        </div>
      )}

      {/* ШАГ 1: ГЛАВНЫЕ КАТЕГОРИИ */}
      {view === 'main' && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          {categories.map(c => (
            <div key={c.id} onClick={() => handleCategoryClick(c)} className="relative h-40 rounded-2xl overflow-hidden shadow-lg border border-gray-800 active:scale-95 transition-transform cursor-pointer">
              <img src={c.image} alt={c.name} className="absolute inset-0 w-full h-full object-cover" />
              {/* Градиент поверх картинки, чтобы текст всегда хорошо читался */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end justify-center pb-4">
                <span className="text-[#FFD700] font-bold text-lg drop-shadow-md">{c.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ШАГ 2: ПОДКАТЕГОРИИ */}
      {view === 'sub' && (
        <div className="flex flex-col gap-3">
          {activeMainCat.subcategories.map(sub => (
            <button key={sub} onClick={() => handleSubClick(sub)} className="bg-[#1a1a1a] p-5 rounded-2xl border border-gray-800 text-[#FFD700] font-bold text-lg active:scale-[0.98] transition-all text-left flex justify-between items-center shadow-md">
              {sub}
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          ))}
        </div>
      )}

      {/* ШАГ 3: ТОВАРЫ */}
      {view === 'products' && (
        filteredProducts.length === 0 ? (
          <div className="text-center text-gray-500 mt-16 font-medium">В этом разделе пока нет товаров</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map(p => (
              <div key={p.id} className="bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-lg flex flex-col border border-gray-800 relative">
                {isAdmin && (
                  <div className="absolute top-2 left-2 flex gap-1 z-10">
                    <button onClick={() => handleDelete(p.id)} className="bg-red-600/90 text-white p-1.5 rounded-lg text-sm">🗑️</button>
                  </div>
                )}
                <div className="h-40 relative">
                  <img src={p.imageUrl} alt={p.title} className="object-cover w-full h-full" />
                </div>
                <div className="p-3 flex flex-col flex-grow">
                  <h3 className="text-sm font-semibold text-white leading-tight mb-1">{p.title}</h3>
                  <p className="text-xs text-gray-400 mb-2 line-clamp-2 flex-grow">{p.description}</p>
                  <p className="text-[#FFD700] font-bold mb-2 text-lg">{p.price} ₽</p>
                  <button onClick={() => addToCart(p)} className="w-full bg-[#FFD700] text-black font-bold py-2.5 rounded-xl active:bg-yellow-600 transition-colors">В корзину</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
