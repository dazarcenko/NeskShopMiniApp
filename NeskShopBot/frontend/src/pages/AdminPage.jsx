import { useState } from 'react';
import axios from 'axios';

export default function AdminPage() {
  const [formData, setFormData] = useState({ title: '', price: '', category: 'Жидкости', description: '' });
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const tg = window.Telegram?.WebApp;
  // ВАЖНО: Тут тоже должен быть твой ID админа, как в App.jsx
  const tgId = tg?.initDataUnsafe?.user?.id || 123456789; 

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) return alert('Выберите картинку!');
    
    setLoading(true);
    const data = new FormData();
    data.append('title', formData.title);
    data.append('price', formData.price);
    data.append('category', formData.category);
    data.append('description', formData.description);
    data.append('image', image);

    try {
      await axios.post('/api/admin/products', data, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'x-telegram-id': tgId 
        }
      });
      if(tg && tg.showAlert) tg.showAlert('Товар успешно добавлен!');
      else alert('Успешно!');
      
      // Очистка формы после добавления
      setFormData({ title: '', price: '', category: 'Жидкости', description: '' });
      setImage(null);
      // Сброс поля file
      document.getElementById('fileInput').value = '';
    } catch (err) {
      alert('Ошибка при добавлении. Проверьте права.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-800 mb-10">
      <h2 className="text-xl font-bold mb-1 text-[#FFD700]">Панель Администратора</h2>
      <p className="text-xs text-gray-400 mb-4">Добавление нового товара в базу</p>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input 
          type="text" placeholder="Название (например, Husky Mint)" required
          value={formData.title}
          className="bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-[#FFD700]"
          onChange={e => setFormData({...formData, title: e.target.value})} 
        />
        <input 
          type="number" placeholder="Цена (₽)" required
          value={formData.price}
          className="bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-[#FFD700]"
          onChange={e => setFormData({...formData, price: e.target.value})} 
        />
        <select 
          value={formData.category}
          className="bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-[#FFD700]"
          onChange={e => setFormData({...formData, category: e.target.value})}
        >
          <option>Жидкости</option>
          <option>Pod-Системы</option>
          <option>Одноразки</option>
          <option>Расходники</option>
        </select>
        <textarea 
          placeholder="Описание вкуса или характеристик" 
          value={formData.description}
          className="bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-[#FFD700] min-h-[100px]"
          onChange={e => setFormData({...formData, description: e.target.value})} 
        />
        
        <div className="bg-black border border-gray-700 rounded-lg p-3">
          <label className="text-sm text-gray-400 block mb-2">Фото товара:</label>
          <input 
            id="fileInput"
            type="file" accept="image/*" required
            className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#FFD700] file:text-black"
            onChange={e => setImage(e.target.files[0])} 
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="bg-[#FFD700] text-black font-bold py-3 rounded-lg mt-2 disabled:opacity-50"
        >
          {loading ? 'Загрузка...' : 'Добавить товар'}
        </button>
      </form>
    </div>
  );
}