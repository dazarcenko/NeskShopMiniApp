import React, { useState, useEffect } from 'react';

export default function ProfilePage() {
  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;

  const [stats, setStats] = useState({ totalOrders: 0, totalSpent: 0 });
  const [orders, setOrders] = useState([]);
  const [view, setView] = useState('main'); // 'main' - профиль, 'history' - история заказов

  // --- ВАЖНО: Впиши сюда свой юзернейм без @ (например, 'durov') ---
  const MANAGER_USERNAME = 'ВСТАВЬ_СВОЙ_ЮЗЕРНЕЙМ_ЗДЕСЬ'; 

  useEffect(() => {
    // Подтягиваем статистику
    const savedStats = JSON.parse(localStorage.getItem('nesk_user_stats')) || {
      totalOrders: 0,
      totalSpent: 0
    };
    setStats(savedStats);

    // Подтягиваем историю заказов (она будет заполняться, когда мы сделаем корзину)
    const savedOrders = JSON.parse(localStorage.getItem('nesk_orders')) || [];
    setOrders(savedOrders.reverse()); // Переворачиваем, чтобы новые были сверху
  }, []);

  const firstName = user?.first_name || 'Гость';
  const lastName = user?.last_name || '';
  const username = user?.username ? `@${user.username}` : '';
  const photoUrl = user?.photo_url;

  const handleContactManager = () => {
    const link = `https://t.me/${MANAGER_USERNAME}`;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(link);
    } else {
      window.open(link, '_blank');
    }
  };

  return (
    <div className="px-4 pt-6 pb-10 animate-fade-in">
      
      {/* КНОПКА НАЗАД (Только для режима истории) */}
      {view === 'history' && (
        <div className="flex items-center mb-6">
          <button onClick={() => setView('main')} className="mr-3 bg-[#1a1a1a] p-2 rounded-xl text-white border border-gray-800 hover:bg-gray-800 transition active:scale-95">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-xl font-bold text-white border-l-4 border-[#FFD700] pl-2">История заказов</h2>
        </div>
      )}

      {/* --- РЕЖИМ 1: ГЛАВНЫЙ ПРОФИЛЬ --- */}
      {view === 'main' && (
        <>
          <h2 className="text-xl font-bold text-white border-l-4 border-[#FFD700] pl-2 mb-6">Личный кабинет</h2>

          <div className="bg-gradient-to-br from-[#1a1a1a] to-black border border-gray-800 rounded-3xl p-6 shadow-lg mb-6 flex items-center gap-5 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#FFD700] opacity-10 rounded-full blur-3xl"></div>
            <div className="w-20 h-20 rounded-full bg-gray-800 overflow-hidden border-2 border-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.3)] shrink-0">
              {photoUrl ? (
                <img src={photoUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl bg-neutral-900 text-[#FFD700] font-extrabold">
                  {firstName.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex flex-col z-10 flex-1 overflow-hidden">
              <span className="text-xl font-extrabold text-white leading-tight truncate">{firstName} {lastName}</span>
              {username && <span className="text-sm text-[#FFD700] mt-1 font-medium truncate">{username}</span>}
            </div>
          </div>

          <h3 className="text-white font-bold mb-3 px-1">Ваша статистика</h3>
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-md">
              <span className="text-gray-400 text-xs mb-1 font-medium">Всего заказов</span>
              <span className="text-3xl font-black text-white">{stats.totalOrders}</span>
            </div>
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-md">
              <span className="text-gray-400 text-xs mb-1 font-medium">Сумма покупок</span>
              <span className="text-2xl font-black text-[#FFD700]">{stats.totalSpent} ₽</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* Кнопка Истории Заказов */}
            <button onClick={() => setView('history')} className="bg-[#1a1a1a] p-4 rounded-2xl border border-gray-800 text-white font-bold text-left flex justify-between items-center active:scale-[0.98] transition-all shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xl">📦</span>
                История заказов
              </div>
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            
            {/* Кнопка Связи с Менеджером (Настройки убраны) */}
            <button onClick={handleContactManager} className="bg-[#1a1a1a] mt-2 p-4 rounded-2xl border border-gray-800 text-[#FFD700] font-bold text-left flex justify-between items-center active:scale-[0.98] transition-all shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xl">👨‍💻</span>
                Обратиться к менеджеру
              </div>
              <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </button>
          </div>
        </>
      )}

      {/* --- РЕЖИМ 2: ИСТОРИЯ ЗАКАЗОВ --- */}
      {view === 'history' && (
        <div className="flex flex-col gap-4">
          {orders.length === 0 ? (
            <div className="text-center text-gray-500 mt-16 font-medium">
              У вас пока нет заказов 🛒<br/>
              <span className="text-xs mt-2 block">Самое время это исправить!</span>
            </div>
          ) : (
            orders.map((order, index) => (
              <div key={index} className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-4 shadow-md">
                <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-3">
                  <span className="text-gray-400 text-xs font-medium">{order.date}</span>
                  <span className="text-green-500 text-xs font-bold px-2 py-1 bg-green-500/10 rounded-lg">Выполнен</span>
                </div>
                
                <div className="flex flex-col gap-2 mb-4">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-sm text-white font-medium truncate pr-4">
                        {item.quantity}x {item.title}
                      </span>
                      <span className="text-sm text-gray-400 shrink-0">{item.price * item.quantity} ₽</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center pt-3 border-t border-gray-800">
                  <span className="text-gray-400 font-medium text-sm">Итого:</span>
                  <span className="text-[#FFD700] font-black text-lg">{order.total} ₽</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
