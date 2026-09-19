import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import CatalogPage from './pages/CatalogPage';
import CartPage from './pages/CartPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';

// Заглушки для пустых страниц
const ProfilePage = () => <div className="p-4 text-center text-gray-400 mt-20 font-medium">Личный кабинет в разработке 👤</div>;

function Navigation() {
  const location = useLocation();
  const isAdmin = location.pathname === '/admin';
  const currentPath = location.pathname;

  const tg = window.Telegram?.WebApp;
  const userId = tg?.initDataUnsafe?.user?.id;
  const ADMIN_ID = 1044141986;

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#121212]">
        <Link to="/" className="text-xl font-bold tracking-wider">
          Nesk <span className="text-[#FFD700]">Shop</span>
        </Link>
        {userId === ADMIN_ID && (
          <Link to={isAdmin ? "/" : "/admin"} className="text-xs px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[#FFD700] transition-colors">
            {isAdmin ? 'Магазин' : 'Админка'}
          </Link>
        )}
      </header>

      <main className="flex-1 pb-28">
        <Routes>
          {/* ИСПРАВЛЕНИЕ ЗДЕСЬ: Добавлены свойства key. Теперь страницы не будут конфликтовать! */}
          <Route path="/" element={<CatalogPage key="catalog" mode="catalog" />} />
          <Route path="/discounts" element={<CatalogPage key="discounts" mode="discounts" />} />
          <Route path="/favorites" element={<CatalogPage key="favorites" mode="favorites" />} />
          
          <Route path="/cart" element={<CartPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>

      {!isAdmin && (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#121212]/95 backdrop-blur-lg border-t border-neutral-800 pb-2 pt-2 z-50">
          <div className="flex justify-around items-end px-2">
            
            <Link to="/discounts" className={`flex flex-col items-center gap-1.5 w-16 ${currentPath === '/discounts' ? 'text-[#FFD700]' : 'text-gray-500 hover:text-gray-300'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
              <span className="text-[10px] font-medium">Скидки</span>
            </Link>

            <Link to="/favorites" className={`flex flex-col items-center gap-1.5 w-16 ${currentPath === '/favorites' ? 'text-[#FFD700]' : 'text-gray-500 hover:text-gray-300'}`}>
              <svg className="w-6 h-6" fill={currentPath === '/favorites' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              <span className="text-[10px] font-medium">Избранное</span>
            </Link>

            <Link to="/" className={`flex flex-col items-center gap-1 w-16 -mt-6 relative`}>
              <div className={`p-3.5 rounded-full flex items-center justify-center transition-all ${currentPath === '/' ? 'bg-[#FFD700] text-black shadow-[0_0_15px_rgba(255,215,0,0.4)]' : 'bg-[#1a1a1a] border border-gray-700 text-gray-400'}`}>
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              </div>
              <span className={`text-[10px] font-bold ${currentPath === '/' ? 'text-[#FFD700]' : 'text-gray-500'}`}>Главная</span>
            </Link>

            <Link to="/cart" className={`flex flex-col items-center gap-1.5 w-16 ${currentPath === '/cart' ? 'text-[#FFD700]' : 'text-gray-500 hover:text-gray-300'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 0a2 2 0 100 4 2 2 0 000-4z" /></svg>
              <span className="text-[10px] font-medium">Корзина</span>
            </Link>

            <Link to="/profile" className={`flex flex-col items-center gap-1.5 w-16 ${currentPath === '/profile' ? 'text-[#FFD700]' : 'text-gray-500 hover:text-gray-300'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              <span className="text-[10px] font-medium">Профиль</span>
            </Link>
            
          </div>
        </nav>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Navigation />
    </BrowserRouter>
  );
}
