import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Home, ShoppingCart, Settings } from 'lucide-react';
import CatalogPage from './pages/CatalogPage';
import CartPage from './pages/CartPage';
import AdminPage from './pages/AdminPage';

const tg = window.Telegram?.WebApp;

function Navigation({ isAdmin }) {
  const location = useLocation();
  const getIconColor = (path) => location.pathname === path ? 'text-[#FFD700]' : 'text-gray-400';

  return (
    <nav className="fixed bottom-0 w-full bg-[#111111] border-t border-gray-800 flex justify-around items-center py-3 z-50">
      <Link to="/" className={`flex flex-col items-center ${getIconColor('/')}`}>
        <Home size={24} />
        <span className="text-xs mt-1">Главная</span>
      </Link>
      <Link to="/cart" className={`flex flex-col items-center ${getIconColor('/cart')}`}>
        <ShoppingCart size={24} />
        <span className="text-xs mt-1">Корзина</span>
      </Link>
      {isAdmin && (
        <Link to="/admin" className={`flex flex-col items-center ${getIconColor('/admin')}`}>
          <Settings size={24} />
          <span className="text-xs mt-1">Админка</span>
        </Link>
      )}
    </nav>
  );
}

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#0a0a0a');
      
      // ВАЖНО: Замени 123456789 на свой реальный Telegram ID
      const ADMIN_ID = 123456789; 
      if (tg.initDataUnsafe?.user?.id === ADMIN_ID) {
        setIsAdmin(true);
      }
    }
  }, []);

  return (
    <Router>
      <div className="min-h-screen pb-20 bg-[#0a0a0a] text-white">
        <header className="flex items-center justify-center py-4 bg-[#111111] border-b border-[#FFD700]/20 shadow-md sticky top-0 z-40">
           <h1 className="text-2xl font-black italic tracking-wider flex items-center gap-2">
             <span className="text-white">Nesk</span><span className="text-[#FFD700]">Shop</span>
           </h1>
        </header>

        <main className="p-4">
          <Routes>
            <Route path="/" element={<CatalogPage />} />
            <Route path="/cart" element={<CartPage />} />
            {isAdmin && <Route path="/admin" element={<AdminPage />} />}
          </Routes>
        </main>
        
        <Navigation isAdmin={isAdmin} />
      </div>
    </Router>
  );
}