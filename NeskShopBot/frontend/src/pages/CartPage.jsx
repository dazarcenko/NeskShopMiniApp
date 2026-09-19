import React, { useState, useEffect } from 'react';
import axios from 'axios';

// ⚠️ ВПИШИ СВОИ АДРЕСА САМОВЫВОЗА ВОТ ЗДЕСЬ (Вместо Пункт 1, 2 и тд):
const DELIVERY_OPTIONS = [
  "Самовывоз: Пункт 1 (Ул. Примерная, 10)",
  "Самовывоз: Пункт 2 (ТЦ Галерея)",
  "Самовывоз: Пункт 3 (Метро Центр)",
  "Самовывоз: Пункт 4 (Район Северный)",
  "Доставка курьером"
];

export default function CartPage() {
  const [cart, setCart] = useState([]);
  const [isCheckout, setIsCheckout] = useState(false); // Открыто ли меню заказа
  const [loading, setLoading] = useState(false);

  // Данные для оформления заказа
  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;
  
  const [buyerName, setBuyerName] = useState(user?.first_name || '');
  const [deliveryMethod, setDeliveryMethod] = useState(DELIVERY_OPTIONS[0]);
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('nesk_cart')) || [];
    setCart(savedCart);
  }, []);

  const updateCart = (newCart) => {
    setCart(newCart);
    localStorage.setItem('nesk_cart', JSON.stringify(newCart));
  };

  const changeQuantity = (id, delta) => {
    const newCart = cart.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : null;
      }
      return item;
    }).filter(Boolean);
    updateCart(newCart);
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
  };

  const removeItem = (id) => {
    updateCart(cart.filter(item => item.id !== id));
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
  };

  // Расчеты сумм
  const itemsSum = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const isDelivery = deliveryMethod === "Доставка курьером";
  const finalTotal = itemsSum + (isDelivery ? 3 : 0); // +3 рубля за доставку

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (isDelivery && !address.trim()) {
      return tg?.showAlert ? tg.showAlert('Укажите адрес доставки!') : alert('Укажите адрес доставки!');
    }
    
    setLoading(true);
    try {
      // 1. Отправляем заказ на сервер (админу в ТГ)
      await axios.post('/api/orders', {
        items: cart,
        totalAmount: finalTotal,
        buyerName,
        deliveryMethod: isDelivery ? "Доставка курьером (+3₽)" : deliveryMethod,
        deliveryAddress: isDelivery ? address : null,
        note,
        username: user?.username || ''
      });

      // 2. Обновляем статистику для Профиля
      const savedStats = JSON.parse(localStorage.getItem('nesk_user_stats')) || { totalOrders: 0, totalSpent: 0 };
      savedStats.totalOrders += 1;
      savedStats.totalSpent += finalTotal;
      localStorage.setItem('nesk_user_stats', JSON.stringify(savedStats));

      // 3. Сохраняем в Историю заказов
      const savedOrders = JSON.parse(localStorage.getItem('nesk_orders')) || [];
      const date = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
      savedOrders.push({
        date,
        items: cart.map(c => ({ title: c.title, price: c.price, quantity: c.quantity })),
        total: finalTotal
      });
      localStorage.setItem('nesk_orders', JSON.stringify(savedOrders));

      // 4. Очищаем корзину и радуем пользователя
      updateCart([]);
      setIsCheckout(false);
      
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      if (tg?.showAlert) tg.showAlert('🎉 Заказ успешно оформлен! Менеджер скоро свяжется с вами.');
      else alert('Заказ успешно оформлен!');

    } catch (err) {
      if (tg?.showAlert) tg.showAlert('Ошибка при оформлении заказа. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 pt-6 pb-10">
      <h2 className="text-xl font-bold text-white border-l-4 border-[#FFD700] pl-2 mb-6">Ваша корзина</h2>

      {cart.length === 0 ? (
        <div className="text-center mt-20">
          <span className="text-5xl block mb-4">🛒</span>
          <h3 className="text-white font-bold text-lg mb-2">Корзина пуста</h3>
          <p className="text-gray-500 text-sm">Перейдите в каталог, чтобы выбрать товары.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 mb-8">
            {cart.map(item => (
              <div key={item.id} className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-3 flex gap-4 items-center shadow-md">
                <div className="w-16 h-16 bg-black rounded-xl overflow-hidden shrink-0">
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                </div>
                
                <div className="flex-1 flex flex-col justify-center">
                  <h3 className="text-white font-bold text-sm leading-tight mb-1">{item.title}</h3>
                  <span className="text-[#FFD700] font-black text-sm">{item.price} ₽</span>
                </div>

                <div className="flex items-center gap-3 bg-black rounded-xl p-1 border border-gray-800">
                  <button onClick={() => changeQuantity(item.id, -1)} className="w-7 h-7 flex items-center justify-center text-white bg-gray-900 rounded-lg active:scale-95 transition-transform">
                    {item.quantity === 1 ? '🗑' : '−'}
                  </button>
                  <span className="text-white font-bold text-sm w-4 text-center">{item.quantity}</span>
                  <button onClick={() => changeQuantity(item.id, 1)} className="w-7 h-7 flex items-center justify-center text-black bg-[#FFD700] rounded-lg active:scale-95 transition-transform">
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={() => setIsCheckout(true)}
            className="w-full bg-[#FFD700] text-black font-extrabold py-4 rounded-2xl text-lg shadow-[0_5px_20px_rgba(255,215,0,0.2)] active:scale-95 transition-transform"
          >
            Оформить заказ на {itemsSum} ₽
          </button>
        </>
      )}

      {/* --- МЕНЮ ОФОРМЛЕНИЯ ЗАКАЗА (МОДАЛЬНОЕ ОКНО) --- */}
      {isCheckout && (
        <div className="fixed inset-0 bg-[#0a0a0a] z-50 overflow-y-auto pb-20 animate-slide-up">
          <div className="p-4 pt-6">
            
            <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
              <h2 className="text-2xl font-extrabold text-white">Новый заказ</h2>
              <button onClick={() => setIsCheckout(false)} className="bg-[#1a1a1a] p-2 rounded-xl text-white active:scale-95">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="bg-gradient-to-r from-[#1a1a1a] to-black border border-gray-800 rounded-2xl p-5 mb-6">
              <p className="text-gray-400 text-sm mb-1">Позиций: <b className="text-white">{itemsCount} шт.</b></p>
              <p className="text-gray-400 text-sm">Сумма товаров: <b className="text-white">{itemsSum} ₽</b></p>
            </div>

            <form onSubmit={handleOrderSubmit} className="flex flex-col gap-4">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-gray-400 px-1">Ваше имя</label>
                <input 
                  type="text" required value={buyerName} onChange={e => setBuyerName(e.target.value)}
                  className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-4 text-white outline-none focus:border-[#FFD700] transition-colors"
                  placeholder="Как к вам обращаться?"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-gray-400 px-1">Способ получения</label>
                <select 
                  value={deliveryMethod} onChange={e => setDeliveryMethod(e.target.value)}
                  className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-4 text-white outline-none focus:border-[#FFD700] transition-colors appearance-none"
                >
                  {DELIVERY_OPTIONS.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                </select>
              </div>

              {isDelivery && (
                <div className="flex flex-col gap-1.5 animate-fade-in">
                  <label className="text-sm font-bold text-[#FFD700] px-1">Адрес доставки (Стоимость: +3 ₽)</label>
                  <input 
                    type="text" required={isDelivery} value={address} onChange={e => setAddress(e.target.value)}
                    className="bg-neutral-900 border border-[#FFD700]/50 rounded-xl p-4 text-white outline-none focus:border-[#FFD700] transition-colors"
                    placeholder="Улица, дом, квартира..."
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-gray-400 px-1">Примечание к заказу</label>
                <textarea 
                  value={note} onChange={e => setNote(e.target.value)}
                  className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-4 text-white outline-none focus:border-[#FFD700] transition-colors min-h-[80px]"
                  placeholder="Дополнительные пожелания (необязательно)"
                />
              </div>

              <div className="mt-6">
                <div className="flex justify-between items-center mb-4 px-1">
                  <span className="text-gray-400 font-medium text-lg">Итого к оплате:</span>
                  <span className="text-[#FFD700] font-black text-3xl">{finalTotal} ₽</span>
                </div>
                
                <button 
                  type="submit" disabled={loading}
                  className="w-full bg-[#FFD700] text-black font-extrabold py-4 rounded-2xl text-lg active:scale-95 transition-transform"
                >
                  {loading ? 'Отправка...' : 'Сделать заказ'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
