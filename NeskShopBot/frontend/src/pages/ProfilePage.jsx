import React, { useState, useEffect } from 'react';

export default function ProfilePage() {
  // Достаем данные пользователя прямо из самого Телеграма
  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;

  // Состояния для статистики
  const [stats, setStats] = useState({ totalOrders: 0, totalSpent: 0 });

  useEffect(() => {
    // Читаем статистику из памяти устройства (сохранится при оформлении заказа)
    const savedStats = JSON.parse(localStorage.getItem('nesk_user_stats')) || {
      totalOrders: 0,
      totalSpent: 0
    };
    setStats(savedStats);
  }, []);

  // Если зашли не через ТГ (в браузере), покажем дефолтные данные
  const firstName = user?.first_name || 'Гость';
  const lastName = user?.last_name || '';
  const username = user?.username ? `@${user.username}` : '';
  const photoUrl = user?.photo_url; // Аватарка из ТГ

  return (
    <div className="px-4 pt-6 pb-10 animate-fade-in">
      <h2 className="text-xl font-bold text-white border-l-4 border-[#FFD700] pl-2 mb-6">Личный кабинет</h2>

      {/* КРАСИВАЯ КАРТОЧКА ПРОФИЛЯ */}
      <div className="bg-gradient-to-br from-[#1a1a1a] to-black border border-gray-800 rounded-3xl p-6 shadow-lg mb-6 flex items-center gap-5 relative overflow-hidden">
        {/* Желтое свечение на фоне */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#FFD700] opacity-10 rounded-full blur-3xl"></div>

        {/* Аватарка */}
        <div className="w-20 h-20 rounded-full bg-gray-800 overflow-hidden border-2 border-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.3)] shrink-0">
          {photoUrl ? (
            <img src={photoUrl} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl bg-neutral-900 text-[#FFD700] font-extrabold">
              {firstName.charAt(0)}
            </div>
          )}
        </div>

        {/* Имя и Username */}
        <div className="flex flex-col z-10 flex-1 overflow-hidden">
          <span className="text-xl font-extrabold text-white leading-tight truncate">
            {firstName} {lastName}
          </span>
          {username && (
            <span className="text-sm text-[#FFD700] mt-1 font-medium truncate">{username}</span>
          )}
        </div>
      </div>

      {/* БЛОК СТАТИСТИКИ */}
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

      {/* МЕНЮ ДЕЙСТВИЙ */}
      <div className="flex flex-col gap-3">
        <button className="bg-[#1a1a1a] p-4 rounded-2xl border border-gray-800 text-white font-bold text-left flex justify-between items-center active:scale-[0.98] transition-all shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xl">📦</span>
            История заказов
          </div>
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
        
        <button className="bg-[#1a1a1a] p-4 rounded-2xl border border-gray-800 text-white font-bold text-left flex justify-between items-center active:scale-[0.98] transition-all shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚙️</span>
            Настройки
          </div>
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>

        <button className="bg-[#1a1a1a] mt-2 p-4 rounded-2xl border border-gray-800 text-red-500 font-bold text-left flex justify-between items-center active:scale-[0.98] transition-all shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎧</span>
            Служба поддержки
          </div>
        </button>
      </div>
    </div>
  );
}
