import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import CatalogPage from './pages/CatalogPage';
import CartPage from './pages/CartPage';
import AdminPage from './pages/AdminPage';

function Navigation() {
  const location = useLocation();
  const isAdmin = location.pathname === '/admin';

  // Получаем данные пользователя из Telegram
  const tg = window.Telegram?.WebApp;
  const userId = tg?.initDataUnsafe?.user?.id;
  const ADMIN_ID = 1044141986; // Ваш ID

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white">
      {/* Шапка */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#121212]">
        <Link to="/" className="text-xl font-bold tracking-wider">
          Nesk <span className="text-yellow-500">Shop</span>
        </Link>
        
        {/* Кнопка показывается ТОЛЬКО если ID совпадает с вашим */}
        {userId === ADMIN_ID && (
          <Link 
            to={isAdmin ? "/" : "/admin"} 
            className="text-xs px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-yellow-500 transition-colors"
          >
            {isAdmin ? 'Магазин' : 'Админка'}
          </Link>
        )}
      </header>

      {/* Основной контент */}
      <main className="flex-1 pb-20">
        <Routes>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>

      {/* Нижнее меню (скрываем в админке для удобства) */}
      {!isAdmin && (
        <nav className="fixed bottom-0 left-0 right-0 flex justify-around items-center bg-[#121212] border-t border-neutral-800 py-3">
          <Link to="/" className="flex flex-col items-center text-xs text-yellow-500">
            <span>Главная</span>
          </Link>
          <Link to="/cart" className="flex flex-col items-center text-xs text-neutral-400 hover:text-white">
            <span>Корзина</span>
          </Link>
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
