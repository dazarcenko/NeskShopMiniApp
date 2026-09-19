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

  // Фильтрация товаров по составной строке, например "Жидкости | 50 мг"
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
    <div>
      <div className="flex items-center mb-6">
        {view !== 'main' && (
          <button onClick={handleBack} className="mr-3 bg-[#1a1a1a] p-2 rounded-lg text-white border border-gray-800">⬅ Назад</button>
        )}
        <h2 className="text-xl font-bold text-white border-l-4 border-[#FFD700] pl-2">
          {view === 'main' ? 'Каталог' : view === 'sub' ? activeMainCat.name : activeSubCat || activeMainCat.name}
        </h2>
      </div>

      {/* ШАГ 1: ГЛАВНЫЕ КАТЕГОРИИ */}
      {view === 'main' && (
        <div className="grid grid-cols-2 gap-4 mb-10">
          {categories.map(c => (
            <div key={c.id} onClick={() => handleCategoryClick(c)} className="relative h-36 rounded-xl overflow-hidden shadow-lg border border-gray-800 active:scale-95 transition-transform cursor-pointer">
              <img src={c.image} alt={c.name} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-2 text-center">
                <span className="text-[#FFD700] font-bold text-lg drop-shadow-lg">{c.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ШАГ 2: ПОДКАТЕГОРИИ (Например: 20 мг, 50 мг) */}
      {view === 'sub' && (
        <div className="flex flex-col gap-3 mb-10">
          {activeMainCat.subcategories.map(sub => (
            <button key={sub} onClick={() => handleSubClick(sub)} className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-800 text-[#FFD700] font-bold text-lg active:bg-black transition-colors text-left pl-5">
              {sub}
            </button>
          ))}
        </div>
      )}

      {/* ШАГ 3: ТОВАРЫ */}
      {view === 'products' && (
        filteredProducts.length === 0 ? (
          <div className="text-center text-gray-500 mt-10 font-medium">В этом разделе пока нет товаров</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-10">
            {filteredProducts.map(p => (
              <div key={p.id} className="bg-[#1a1a1a] rounded-xl overflow-hidden shadow-lg flex flex-col border border-gray-800 relative">
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
                  <button onClick={() => addToCart(p)} className="w-full bg-[#FFD700] text-black font-bold py-2 rounded-lg active:bg-yellow-600">В корзину</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
