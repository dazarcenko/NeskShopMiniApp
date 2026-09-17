import { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2 } from 'lucide-react';

export default function CartPage() {
  const [cart, setCart] = useState([]);
  const [deliveryInfo, setDeliveryInfo] = useState('');
  const tg = window.Telegram?.WebApp;

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('nesk_cart')) || [];
    setCart(savedCart);
  }, []);

  const saveCart = (newCart) => {
    setCart(newCart);
    localStorage.setItem('nesk_cart', JSON.stringify(newCart));
  };

  const removeFromCart = (id) => {
    saveCart(cart.filter(item => item.id !== id));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (!deliveryInfo.trim()) {
      if(tg && tg.showAlert) tg.showAlert("Введите адрес доставки или телефон");
      else alert("Введите адрес доставки или телефон");
      return;
    }

    try {
      const orderData = {
        telegramId: tg?.initDataUnsafe?.user?.id || 12345,
        username: tg?.initDataUnsafe?.user?.username || 'Guest',
        items: cart,
        totalAmount,
        deliveryInfo
      };

      await axios.post('/api/orders', orderData);
      saveCart([]); 
      setDeliveryInfo('');
      
      if(tg && tg.showAlert) {
        tg.HapticFeedback.notificationOccurred('success');
        tg.showAlert('Заказ успешно оформлен! Менеджер свяжется с вами.');
      } else {
        alert('Заказ успешно оформлен!');
      }
    } catch (error) {
      console.error(error);
      if(tg && tg.showAlert) tg.showAlert('Ошибка при оформлении заказа');
    }
  };

  if (cart.length === 0) {
    return <div className="text-center text-gray-500 mt-20">Корзина пуста</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-white mb-2 border-l-4 border-[#FFD700] pl-2">Ваш заказ</h2>
      {cart.map((item) => (
        <div key={item.id} className="flex bg-[#1a1a1a] p-3 rounded-xl items-center border border-gray-800">
          <img src={item.imageUrl} className="w-16 h-16 object-cover rounded-md" alt={item.title}/>
          <div className="ml-3 flex-grow">
            <h3 className="text-sm font-semibold text-white">{item.title}</h3>
            <p className="text-xs text-gray-400">{item.price} ₽ x {item.quantity}</p>
          </div>
          <p className="font-bold text-[#FFD700] mr-4">{item.price * item.quantity} ₽</p>
          <button onClick={() => removeFromCart(item.id)} className="text-red-500 p-2">
            <Trash2 size={20} />
          </button>
        </div>
      ))}

      <div className="mt-4 p-4 bg-[#111111] rounded-xl border border-gray-800">
        <div className="flex justify-between mb-4 text-lg font-bold">
          <span className="text-white">Итого:</span>
          <span className="text-[#FFD700]">{totalAmount} ₽</span>
        </div>
        
        <input 
          type="text" 
          placeholder="Адрес доставки / номер телефона" 
          className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white mb-4 outline-none focus:border-[#FFD700]"
          value={deliveryInfo}
          onChange={(e) => setDeliveryInfo(e.target.value)}
        />

        <button 
          onClick={handleCheckout}
          className="w-full bg-[#FFD700] text-black font-black text-lg py-3 rounded-lg active:bg-yellow-600 transition"
        >
          Оформить заказ
        </button>
      </div>
    </div>
  );
}