import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * AdvertiserRegister — صفحة تسجيل عامة للمعلنين
 */
const AdvertiserRegister = () => {
  const [form, setForm] = useState({
    full_name: '', company_name: '', username: '', email: '', password: '', phone: '',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.username || !form.email || !form.password) {
      toast.error('كل الحقول المميّزة بنجمة مطلوبة');
      return;
    }
    if (form.password.length < 6) { toast.error('كلمة المرور 6 أحرف على الأقل'); return; }
    setLoading(true);
    try {
      await axios.post(`${API}/advertiser/register`, form);
      toast.success('تم إنشاء حسابك. سجّل الدخول الآن.');
      navigate('/login?redirect=/app/advertiser');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'فشل التسجيل');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-gray-900 to-pink-950 flex items-center justify-center p-4" dir="rtl" data-testid="advertiser-register-page">
      <div className="bg-gray-900/80 backdrop-blur rounded-2xl p-8 w-full max-w-md border border-purple-500/30 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">📢</div>
          <h1 className="text-2xl font-bold text-white">سجّل كمعلن على هوم-مي</h1>
          <p className="text-xs text-gray-400 mt-1">أنشئ حسابك وابدأ إعلاناتك في دقائق</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">الاسم الكامل *</label>
            <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 outline-none" data-testid="adreg-fullname" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">اسم الشركة / العلامة التجارية</label>
            <input value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 outline-none" data-testid="adreg-company" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">اسم المستخدم *</label>
              <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" data-testid="adreg-username" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">كلمة المرور *</label>
              <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" data-testid="adreg-password" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">البريد الإلكتروني *</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" data-testid="adreg-email" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">الهاتف</label>
            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" data-testid="adreg-phone" />
          </div>
          <button type="submit" disabled={loading} className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-bold shadow-lg disabled:opacity-50" data-testid="adreg-submit">
            {loading ? '⏳ جاري التسجيل...' : '📢 ابدأ الإعلان الآن'}
          </button>
        </form>
        <div className="mt-4 text-center text-xs text-gray-400">
          لديك حساب بالفعل؟ <Link to="/login" className="text-purple-400 hover:underline">تسجيل الدخول</Link>
        </div>
      </div>
    </div>
  );
};

export default AdvertiserRegister;
