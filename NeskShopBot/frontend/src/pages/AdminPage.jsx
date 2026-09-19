import { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminPage() {
  const [tab, setTab] = useState('products'); 
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const tg = window.Telegram?.WebApp;
  const userId = String(tg?.initDataUnsafe?.user?.id);
  const initData = tg?.initData; // ДАННЫЕ ДЛЯ БЕЗОПАСНОЙ АВТОРИЗАЦИИ

  const [formData, setFormData] = useState({ title: '', price: '', oldPrice: '', mainCat: '', subCat: '', description: '', flavors: '' });
  const [image, setImage] = useState(null);
  const [catData, setCatData] = useState({ name: '', subcategories: '' });
  const [catImage, setCatImage] = useState(null);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/categories');
      setCategories(res.data);
      if (res.data.length > 0 && !formData.mainCat) updateFormCat(res.data[0].name, res.data);
    } catch (e) { console.error(e); }
  };

  const updateFormCat = (mainName, catList = categories) => {
    const cat = catList.find(c => c.name === mainName);
    const sub = (cat && cat.subcategories.length > 0) ? cat.subcategories[0] : '';
    setFormData(prev => ({ ...prev, mainCat: mainName, subCat: sub }));
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!image) return alert('Выберите картинку!');
    setLoading(true);
    
    const finalCategory = formData.subCat ? `${formData.mainCat} | ${formData.subCat}` : formData.mainCat;
    const data = new FormData();
    data.append('title', formData.title);
    data.append('price', formData.price);
    data.append('category', finalCategory);
    data.append('description', formData.description);
    data.append('flavors', formData.flavors);
    data.append('oldPrice', formData.oldPrice);
    data.append('image', image);

    try {
      await axios.post('/api/admin/products', data, { 
        headers: { 'x-telegram-id': userId, 'x-tg-init-data': initData } 
      });
      if(tg?.showAlert) tg.showAlert('Товар добавлен!');
      setFormData({ ...formData, title: '', price: '', oldPrice: '', description: '', flavors: '' });
      setImage(null);
      document.getElementById('fileInput').value = '';
    } catch (err) { alert(err.response?.data?.error || 'Ошибка'); } 
    finally { setLoading(false); }
  };

  const handleCatSubmit = async (e) => {
    e.preventDefault();
    if (!catImage) return alert('Выберите картинку!');
    setLoading(true);
    const data = new FormData();
    data.append('name', catData.name);
    data.append('subcategories', catData.subcategories);
    data.append('image', catImage);

    try {
      await axios.post('/api/admin/categories', data, { 
        headers: { 'x-telegram-id': userId, 'x-tg-init-data': initData } 
      });
      if(tg?.showAlert) tg.showAlert('Категория добавлена!');
      fetchCategories();
      setCatData({ name: '', subcategories: '' });
      setCatImage(null);
    } catch (err) { alert(err.response?.data?.error || 'Ошибка'); } 
    finally { setLoading(false); }
  };

  const handleDeleteCat = async (id) => {
    if (!window.confirm('Удалить категорию?')) return;
    try {
      await axios.delete(`/api/admin/categories/${id}`, { 
        headers: { 'x-telegram-id': userId, 'x-tg-init-data': initData } 
      });
      fetchCategories();
    } catch (err) { alert(err.response?.data?.error || 'Ошибка'); }
  };

  const activeCatObj = categories.find(c => c.name === formData.mainCat);

  return (
    <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-800 mb-10">
      <h2 className="text-xl font-bold mb-4 text-[#FFD700]">Панель Администратора</h2>
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('products')} className={`flex-1 py-2 font-bold rounded-lg ${tab === 'products' ? 'bg-[#FFD700] text-black' : 'bg-black text-white border border-gray-700'}`}>Добавить товар</button>
        <button onClick={() => setTab('categories')} className={`flex-1 py-2 font-bold rounded-lg ${tab === 'categories' ? 'bg-[#FFD700] text-black' : 'bg-black text-white border border-gray-700'}`}>Категории</button>
      </div>
      {tab === 'products' ? (
        <form onSubmit={handleProductSubmit} className="flex flex-col gap-3">
          <input type="text" placeholder="Название товара" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-[#FFD700]"/>
          <div className="flex gap-2">
            <input type="number" placeholder="Новая цена (₽)" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="flex-1 bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-[#FFD700]"/>
            <input type="number" placeholder="Старая цена (если скидка)" value={formData.oldPrice} onChange={e => setFormData({...formData, oldPrice: e.target.value})} className="flex-1 bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-[#FFD700]"/>
          </div>
          <select value={formData.mainCat} onChange={e => updateFormCat(e.target.value)} className="bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-[#FFD700]">
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          {activeCatObj?.subcategories?.length > 0 && (
            <select value={formData.subCat} onChange={e => setFormData({...formData, subCat: e.target.value})} className="bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-[#FFD700]">
              {activeCatObj.subcategories.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <input type="text" placeholder="Вкусы через запятую (необязательно)" value={formData.flavors} onChange={e => setFormData({...formData, flavors: e.target.value})} className="bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-[#FFD700]"/>
          <textarea placeholder="Описание" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="bg-black border border-gray-700 rounded-lg p-3 text-white min-h-[80px] outline-none focus:border-[#FFD700]"/>
          <div className="bg-black border border-gray-700 rounded-lg p-3">
            <label className="text-sm text-gray-400 block mb-2">Фото товара:</label>
            <input id="fileInput" type="file" accept="image/jpeg, image/png, image/webp" required onChange={e => setImage(e.target.files[0])} className="text-sm text-gray-400 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-[#FFD700] file:text-black file:font-bold"/>
          </div>
          <button type="submit" disabled={loading} className="bg-[#FFD700] text-black font-bold py-3 rounded-lg mt-2">{loading ? 'Загрузка...' : 'Добавить товар'}</button>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="bg-black border border-gray-700 rounded-lg p-3">
            <h3 className="text-white font-bold mb-3">Существующие категории:</h3>
            {categories.map(c => (
              <div key={c.id} className="flex justify-between items-center mb-2 bg-[#1a1a1a] p-2 rounded-lg">
                <span className="text-[#FFD700]">{c.name} {c.subcategories.length > 0 && <span className="text-xs text-gray-500">({c.subcategories.join(', ')})</span>}</span>
                <button onClick={() => handleDeleteCat(c.id)} className="bg-red-600 text-white px-2 py-1 rounded text-xs">Удалить</button>
              </div>
            ))}
          </div>
          <form onSubmit={handleCatSubmit} className="flex flex-col gap-3 mt-4 border-t border-gray-800 pt-4">
            <h3 className="text-white font-bold">Создать новую:</h3>
            <input type="text" placeholder="Название (например: Жидкости)" required value={catData.name} onChange={e => setCatData({...catData, name: e.target.value})} className="bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-[#FFD700]"/>
            <input type="text" placeholder="Подкатегории через запятую (20 мг, 50 мг)" value={catData.subcategories} onChange={e => setCatData({...catData, subcategories: e.target.value})} className="bg-black border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-[#FFD700]"/>
            <div className="bg-black border border-gray-700 rounded-lg p-3">
              <label className="text-sm text-gray-400 block mb-2">Обложка категории:</label>
              <input type="file" accept="image/jpeg, image/png, image/webp" required onChange={e => setCatImage(e.target.files[0])} className="text-sm text-gray-400 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-[#FFD700] file:text-black file:font-bold"/>
            </div>
            <button type="submit" disabled={loading} className="bg-[#FFD700] text-black font-bold py-3 rounded-lg mt-2">{loading ? 'Загрузка...' : 'Добавить категорию'}</button>
          </form>
        </div>
      )}
    </div>
  );
}
