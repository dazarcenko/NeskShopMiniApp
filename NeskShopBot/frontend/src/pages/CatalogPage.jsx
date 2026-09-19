import { useState, useEffect } from 'react';
import axios from 'axios';

export default function CatalogPage({ mode = 'catalog' }) {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [favorites, setFavorites] = useState(JSON.parse(localStorage.getItem('nesk_favorites')) || []);
  
  const [view, setView] = useState(mode === 'catalog' ? 'main' : 'products'); 
  const [activeMainCat, setActiveMainCat] = useState(null);
  const [activeSubCat, setActiveSubCat] = useState(null);
  const [activeProduct, setActiveProduct] = useState(null);
  const [selectedFlavor, setSelectedFlavor] = useState(null);

  const tg = window.Telegram?.WebApp;
  const userId = String(tg?.initDataUnsafe?.user?.id);
  
  // ⚠️ СПИСОК АДМИНИСТРАТОРОВ (Здесь тоже впиши)
  const ADMIN_IDS = ['1044141986', '1067205524'];
  const isAdmin = ADMIN_IDS.includes(userId);

  useEffect(() => {
    setView(mode === 'catalog' ? 'main' : 'products');
    setActiveProduct(null);
    axios.get('/api/categories').then(res => setCategories(res.data)).catch(console.error);
    axios.get('/api/products').then(res => setProducts(res.data)).catch(console.error);
  }, [mode]);

  let displayProducts = [];
  if (mode === 'catalog') {
    const finalCat = activeSubCat ? `${activeMainCat?.name} | ${activeSubCat}` : activeMainCat?.name;
    displayProducts = products.filter(p => p.category === finalCat);
  } else if (mode === 'discounts') {
    displayProducts = products.filter(p => {
      const parts = (p.description || '').split('|||');
      return parts[2] && parts[2].trim() !== ''; 
    });
  } else if (mode === 'favorites') {
    displayProducts = products.filter(p => favorites.includes(p.id));
  }

  const toggleFavorite = (e, id) => {
    e.stopPropagation();
    let favs = [...favorites];
    if (favs.includes(id)) favs = favs.filter(fid => fid !== id);
    else favs.push(id);
    setFavorites(favs);
    localStorage.setItem('nesk_favorites', JSON.stringify(favs));
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
  };

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
    setSelectedFlavor(null);
    setView('detail');
  };

  const handleBack = () => {
    if (view === 'detail') {
      setView('products');
      setActiveProduct(null);
      setSelectedFlavor(null);
    } else if (mode === 'catalog' && view === 'products' && activeMainCat?.subcategories?.length > 0) {
      setView('sub');
      setActiveSubCat(null);
    } else if (mode === 'catalog') {
      setView('main');
      setActiveMainCat(null);
      setActiveSubCat(null);
    }
  };

  const addToCart = (product, flavor = null) => {
    let cart = JSON.parse(localStorage.getItem('nesk_cart')) || [];
    const cartItemId = flavor ? `${product.id}-${flavor}` : product.id;
    const cartItemTitle = flavor ? `${product.title} (${flavor})` : product.title;

    const existing = cart.find(item => item.id === cartItemId);
    if (existing) existing.quantity += 1;
    else cart.push({ ...product, id: cartItemId, title: cartItemTitle, quantity: 1 });
    
    localStorage.setItem('nesk_cart', JSON.stringify(cart));
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    if (tg?.showAlert) tg.showAlert(`Добавлено: ${cartItemTitle}`);
    handleBack();
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Точно удалить?')) return;
    try {
      const initData = tg?.initData; // ДАННЫЕ ДЛЯ БЕЗОПАСНОСТИ
      await axios.delete(`/api/admin/products/${id}`, { 
        headers: { 'x-telegram-id': userId, 'x-tg-init-data': initData } 
      });
      setProducts(products.filter(p => p.id !== id));
    } catch (err) { alert(err.response?.data?.error || 'Ошибка'); }
  };
  
  const getEmptyText = () => {
    if (mode === 'discounts') return "Скидок пока нет, но они скоро появятся! 🎁";
    if (mode === 'favorites') return "В избранном пока пусто ❤️";
    return "В этом разделе пока нет товаров";
  };

  return (
    <div className={view === 'detail' ? "pb-4" : "px-4 pt-4"}>
      {(view === 'products' || view === 'sub') && (
        <div className="flex items-center mb-6 mt-2">
          {(mode === 'catalog' && view !== 'main') && (
            <button onClick={handleBack} className="mr-3 bg-[#1a1a1a] p-2 rounded-xl text-white border border-gray-800 hover:bg-gray-800 transition active:scale-95">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          <h2 className="text-xl font-bold text-white border-l-4 border-[#FFD700] pl-2">
            {mode === 'discounts' ? '🔥 Горячие скидки' : mode === 'favorites' ? '❤️ Избранное' : view === 'sub' ? activeMainCat.name : activeSubCat || activeMainCat.name}
          </h2>
        </div>
      )}

      {view === 'main' && mode === 'catalog' && (
        <>
          <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-black border border-gray-800 shadow-[0_4px_20px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#FFD700] opacity-10 rounded-full blur-3xl"></div>
            <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 relative z-10">
              Выберите <span className="text-[#FFD700]">категорию</span>
            </h1>
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

      {view === 'sub' && (
        <div className="flex flex-col gap-3">
          {activeMainCat.subcategories.map(sub => (
            <button key={sub} onClick={() => handleSubClick(sub)} className="bg-[#1a1a1a] p-5 rounded-2xl border border-gray-800 text-[#FFD700] font-bold text-lg active:scale-[0.98] transition-all text-left flex justify-between items-center shadow-md">
              {sub} <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          ))}
        </div>
      )}

      {view === 'products' && (
        displayProducts.length === 0 ? (
          <div className="text-center text-gray-500 mt-16 font-medium px-4">{getEmptyText()}</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {displayProducts.map(p => {
               const [desc, flavs, oldPrice] = (p.description || '').split('|||');
               const isFav = favorites.includes(p.id);
               return (
                <div key={p.id} onClick={() => handleProductClick(p)} className="bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-lg flex flex-col border border-gray-800 relative active:scale-95 transition-transform cursor-pointer">
                  
                  <div className="absolute top-2 right-2 z-10">
                    <button onClick={(e) => toggleFavorite(e, p.id)} className="p-1.5 bg-black/50 rounded-full backdrop-blur-md">
                      <svg className={`w-5 h-5 transition-colors ${isFav ? 'text-red-500 fill-red-500' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    </button>
                  </div>

                  {isAdmin && (
                    <div className="absolute top-2 left-2 z-10">
                      <button onClick={(e) => handleDelete(p.id, e)} className="bg-red-600/90 text-white p-1.5 rounded-lg text-sm">🗑️</button>
                    </div>
                  )}
                  
                  <div className="h-40 relative">
                    <img src={p.imageUrl} alt={p.title} className="object-cover w-full h-full" />
                    {oldPrice && <span className="absolute bottom-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">- СКИДКА</span>}
                  </div>
                  
                  <div className="p-3 flex flex-col flex-grow text-left">
                    <h3 className="text-sm font-bold text-white leading-tight mb-1">{p.title}</h3>
                    <p className="text-xs text-gray-400 mb-2 line-clamp-1 flex-grow">{desc}</p>
                    
                    {oldPrice ? (
                      <div className="flex items-baseline gap-2 mb-2 mt-auto">
                        <p className="text-[#FFD700] font-extrabold text-lg">{p.price} ₽</p>
                        <p className="text-gray-500 line-through text-xs">{oldPrice} ₽</p>
                      </div>
                    ) : (
                      <p className="text-[#FFD700] font-extrabold text-lg mb-2 mt-auto">{p.price} ₽</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {view === 'detail' && activeProduct && (() => {
        const [desc, flavsString, oldPrice] = (activeProduct.description || '').split('|||');
        const flavorsList = flavsString ? flavsString.split(',').map(s => s.trim()).filter(Boolean) : [];
        const isFav = favorites.includes(activeProduct.id);

        return (
          <div className="animate-fade-in pb-10">
            <div className="relative h-80 w-full bg-black rounded-b-3xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] mb-5">
              <img src={activeProduct.imageUrl} className="w-full h-full object-cover opacity-90" />
              <button onClick={handleBack} className="absolute top-4 left-4 bg-black/60 p-2.5 rounded-full text-white backdrop-blur-md active:scale-90 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={(e) => toggleFavorite(e, activeProduct.id)} className="absolute top-4 right-4 bg-black/60 p-2.5 rounded-full backdrop-blur-md active:scale-90 transition-transform">
                <svg className={`w-6 h-6 ${isFav ? 'text-red-500 fill-red-500' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              </button>
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0a0a] to-transparent"></div>
            </div>

            <div className="px-5">
              <h1 className="text-3xl font-extrabold text-white mb-1 leading-tight">{activeProduct.title}</h1>
              
              <div className="flex items-end gap-3 mb-4">
                 <p className="text-[#FFD700] text-3xl font-black">{activeProduct.price} ₽</p>
                 {oldPrice && <p className="text-gray-500 line-through text-xl mb-1.5">{oldPrice} ₽</p>}
              </div>

              {desc && <p className="text-gray-400 text-sm mb-6 leading-relaxed bg-[#1a1a1a] p-4 rounded-2xl border border-gray-800">{desc}</p>}

              {flavorsList.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-white font-bold mb-3 text-lg">✨ Выберите вкус:</h3>
                  <div className="flex flex-wrap gap-2">
                    {flavorsList.map(f => (
                      <button
                        key={f} onClick={() => setSelectedFlavor(f)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedFlavor === f ? 'bg-[#FFD700] text-black shadow-[0_0_15px_rgba(255,215,0,0.3)] scale-105' : 'bg-[#1a1a1a] text-gray-300 border border-gray-700 active:scale-95'}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  if (flavorsList.length > 0 && !selectedFlavor) return alert('Пожалуйста, выберите вкус!');
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
