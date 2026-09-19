import { useState, useEffect } from 'react';
import axios from 'axios';

export default function CatalogPage() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  
  // Навигация: 'main', 'sub', 'products', 'detail' (страница одного товара)
  const [view, setView] = useState('main'); 
  const [activeMainCat, setActiveMainCat] = useState(null);
  const [activeSubCat, setActiveSubCat] = useState(null);
  
  // Состояния для открытого товара
  const [activeProduct, setActiveProduct] = useState(null);
  const [selectedFlavor, setSelectedFlavor] = useState(null);

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

  const handleProductClick = (product) => {
    setActiveProduct(product);
    setSelectedFlavor(null); // Сбрасываем выбранный вкус при открытии нового товара
    setView('detail');
  };

  const handleBack = () => {
    if (view === 'detail') {
      setView('products');
      setActiveProduct(null);
      setSelectedFlavor(null);
    } else if (view === 'products' && activeMainCat?.subcategories?.length > 0) {
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

  const addToCart = (product, flavor = null) => {
    let cart = JSON.parse(localStorage.getItem('nesk_cart')) || [];
    
    // Делаем уникальный ID для каждого вкуса, чтобы в корзине они не смешивались
    const cartItemId = flavor ? `${product.id}-${flavor}` : product.id;
    const cartItemTitle = flavor ? `${product.title} (${flavor})` : product.title;

    const existing = cart.find(item => item.id === cartItemId);
    if (existing) existing.quantity += 1;
    else cart.push({ ...product, id: cartItemId, title: cartItemTitle, quantity: 1 });
    
    localStorage.setItem('nesk_cart', JSON.stringify(cart));
    
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    if (tg?.showAlert) tg.showAlert(`Добавлено: ${cartItemTitle}`);
    else alert(`Добавлено: ${cartItemTitle}`);
    
    // Возвращаемся в каталог после добавления
    handleBack();
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation(); // Чтобы при клике на удаление не открывалась карточка товара
    if (!window.confirm('Точно удалить?')) return;
    try {
      await axios.delete(`/api/admin/products/${id}`, { headers: { 'x-telegram-id': '1044141986' } });
      setProducts(products.filter(p => p.id !== id));
    } catch (err) { alert('Ошибка'); }
  };

  return (
    <div className={view === 'detail' ? "pb-4" : "px-4 pt-4"}>
      
      {/* КНОПКА НАЗАД (Скрываем на главной и внутри карточки товара, там своя) */}
      {view !== 'main' && view !== 'detail' && (
        <div className="flex items-center mb-6 mt-2">
          <button onClick={handleBack} className="mr-3 bg-[#1a1a1a] p-2 rounded-xl text-white border border-gray-800 hover:bg-gray-800 transition active:scale-95">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-xl font-bold text-white">
            {view === 'sub' ? activeMainCat.name : activeSubCat || activeMainCat.name}
          </h2>
        </div>
      )}

      {/* ШАГ 1: ГЛАВНАЯ СТРАНИЦА */}
      {view === 'main' && (
        <>
          <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-black border border-gray-800 shadow-[0_4px_20px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#FFD700] opacity-10 rounded-full blur-3xl"></div>
            <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 relative z-10">
              Выберите <span className="text-[#FFD700]">категорию</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1 relative z-10">Откройте для себя наш ассортимент</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {categories.map(c => (
              <div key={c.id} onClick={() => handleCategoryClick(c)} className="relative h-40 rounded-2xl overflow-hidden shadow-lg border border-gray-800 active:scale-95 transition-transform cursor-pointer">
                <img src={c.image} alt={c.name} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end justify-center pb-4">
                  <span className="text-[#FFD700] font-bold text-lg drop-shadow-md">{c.name}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ШАГ 2: ВЫБОР КРЕПОСТИ (ПОДКАТЕГОРИИ) */}
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

      {/* ШАГ 3: СПИСОК ТОВАРОВ В КАТЕГОРИИ */}
      {view === 'products' && (
        filteredProducts.length === 0 ? (
          <div className="text-center text-gray-500 mt-16 font-medium">В этом разделе пока нет товаров</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map(p => {
               // Достаем описание для карточки, отсекая скрытые вкусы
               const [desc] = (p.description || '').split('|||');
               return (
                <div key={p.id} onClick={() => handleProductClick(p)} className="bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-lg flex flex-col border border-gray-800 relative active:scale-95 transition-transform cursor-pointer">
                  {isAdmin && (
                    <div className="absolute top-2 left-2 flex gap-1 z-10">
                      <button onClick={(e) => handleDelete(p.id, e)} className="bg-red-600/90 text-white p-1.5 rounded-lg text-sm">🗑️</button>
                    </div>
                  )}
                  <div className="h-40 relative">
                    <img src={p.imageUrl} alt={p.title} className="object-cover w-full h-full" />
                  </div>
                  <div className="p-3 flex flex-col flex-grow text-center">
                    <h3 className="text-sm font-bold text-white leading-tight mb-1">{p.title}</h3>
                    <p className="text-xs text-gray-400 mb-2 line-clamp-1 flex-grow">{desc}</p>
                    <p className="text-[#FFD700] font-extrabold text-lg">{p.price} ₽</p>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ШАГ 4: КАРТОЧКА КОНКРЕТНОГО ТОВАРА (С ВЫБОРОМ ВКУСОВ) */}
      {view === 'detail' && activeProduct && (() => {
        // Достаем текст и список вкусов из нашей склеенной строки
        const [descText, flavsString] = (activeProduct.description || '').split('|||');
        const flavorsList = flavsString ? flavsString.split(',').map(s => s.trim()).filter(Boolean) : [];

        return (
          <div className="animate-fade-in pb-10">
            {/* Большая картинка */}
            <div className="relative h-80 w-full bg-black rounded-b-3xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] mb-5">
              <img src={activeProduct.imageUrl} className="w-full h-full object-cover opacity-90" />
              {/* Красивая кнопка назад прямо на картинке */}
              <button onClick={handleBack} className="absolute top-4 left-4 bg-black/60 p-2.5 rounded-full text-white backdrop-blur-md active:scale-90 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              </button>
              {/* Градиент снизу картинки */}
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0a0a] to-transparent"></div>
            </div>

            <div className="px-5">
              <h1 className="text-3xl font-extrabold text-white mb-1 leading-tight">{activeProduct.title}</h1>
              <p className="text-[#FFD700] text-2xl font-black mb-4">{activeProduct.price} ₽</p>

              {descText && <p className="text-gray-400 text-sm mb-6 leading-relaxed bg-[#1a1a1a] p-4 rounded-2xl border border-gray-800">{descText}</p>}

              {/* БЛОК С ВЫБОРОМ ВКУСОВ */}
              {flavorsList.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-white font-bold mb-3 text-lg flex items-center gap-2">
                    <span className="text-xl">✨</span> Выберите вкус:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {flavorsList.map(f => (
                      <button
                        key={f}
                        onClick={() => setSelectedFlavor(f)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                          selectedFlavor === f 
                            ? 'bg-[#FFD700] text-black shadow-[0_0_15px_rgba(255,215,0,0.3)] scale-105' 
                            : 'bg-[#1a1a1a] text-gray-300 border border-gray-700 active:scale-95'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* КНОПКА ДОБАВИТЬ В КОРЗИНУ */}
              <button
                onClick={() => {
                  if (flavorsList.length > 0 && !selectedFlavor) {
                    if (tg?.showAlert) tg.showAlert('⚠️ Пожалуйста, выберите вкус перед добавлением в корзину!');
                    else alert('Пожалуйста, выберите вкус!');
                    return;
                  }
                  addToCart(activeProduct, selectedFlavor);
                }}
                className="w-full bg-[#FFD700] text-black font-extrabold py-4 rounded-2xl text-lg active:scale-95 transition-transform shadow-[0_5px_20px_rgba(255,215,0,0.2)]"
              >
                Добавить в корзину
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
