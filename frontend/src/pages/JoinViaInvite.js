import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useParams, useNavigate, Link } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * JoinViaInvite — صفحة عامة لاستقبال رابط الدعوة /join/:token
 * Flow:
 *   - validate token → GET /compound-invites/token/:token
 *   - show compound info + registration form
 *   - submit → POST /compound-invites/token/:token/accept
 *   - on success redirect to login
 */
const JoinViaInvite = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: '', username: '', email: '', password: '',
    phone: '', unit_number: '',
  });

  useEffect(() => {
    let alive = true;
    axios.get(`${API}/compound-invites/token/${token}`)
      .then(res => { if (alive) setInvite(res.data); })
      .catch(err => { if (alive) setError(err.response?.data?.detail || 'رابط الدعوة غير صالح'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.username || !form.email || !form.password) {
      toast.error('كل الحقول المميّزة بنجمة مطلوبة'); return;
    }
    if (form.password.length < 6) { toast.error('كلمة المرور 6 أحرف على الأقل'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API}/compound-invites/token/${token}/accept`, form);
      toast.success('تم إنشاء حسابك بنجاح! يمكنك تسجيل الدخول الآن.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'فشل التسجيل');
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center text-gray-400" dir="rtl">
      جاري التحقق من الرابط...
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 via-gray-900 to-black flex items-center justify-center p-6" dir="rtl">
      <div className="bg-gray-900/80 rounded-2xl p-8 max-w-md text-center border border-red-500/30" data-testid="join-error">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-white mb-2">رابط غير صالح</h1>
        <p className="text-sm text-red-300 mb-6">{error}</p>
        <Link to="/login" className="inline-block px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold">الذهاب لتسجيل الدخول</Link>
      </div>
    </div>
  );

  const compound = invite?.compound || {};
  const company = invite?.company;
  const roleLabels = {
    resident: '🏠 ساكن', family_head: '👨‍👩‍👧 رب أسرة',
    manager: '👔 إداري', security: '🛡 أمن',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-gray-950 flex items-center justify-center p-4" dir="rtl" data-testid="join-page">
      <div className="w-full max-w-lg bg-gray-900/90 backdrop-blur rounded-2xl shadow-2xl border border-indigo-500/30 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600/40 to-purple-600/40 p-6 border-b border-indigo-500/20">
          <div className="text-[10px] text-indigo-300 uppercase tracking-wider mb-1">دعوة للانضمام</div>
          <h1 className="text-2xl font-bold text-white">🏘️ {compound.name || '—'}</h1>
          {compound.location && <p className="text-xs text-gray-400 mt-1">📍 {compound.location}</p>}
          {company && <p className="text-xs text-indigo-200 mt-2">🏢 تابع لـ: {company.name}</p>}
          <div className="flex items-center gap-2 mt-3 text-[11px]">
            <span className="bg-emerald-600/30 text-emerald-300 px-2 py-0.5 rounded-full">{roleLabels[invite?.role] || invite?.role}</span>
            {invite?.remaining_uses !== null && invite?.remaining_uses !== undefined && (
              <span className="bg-amber-600/30 text-amber-300 px-2 py-0.5 rounded-full">متبقي: {invite.remaining_uses}</span>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="p-6 space-y-3">
          {invite?.note && <div className="bg-blue-900/30 border border-blue-700/40 rounded-lg p-2 text-[11px] text-blue-200 italic">💬 {invite.note}</div>}
          <div>
            <label className="block text-xs text-gray-400 mb-1">الاسم الكامل *</label>
            <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" data-testid="join-fullname" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">اسم المستخدم *</label>
              <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" data-testid="join-username" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">كلمة المرور *</label>
              <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" data-testid="join-password" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">البريد الإلكتروني *</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" data-testid="join-email" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">الهاتف</label>
              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">رقم الوحدة</label>
              <input value={form.unit_number} onChange={e => setForm({...form, unit_number: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" data-testid="join-unit" />
            </div>
          </div>
          <button type="submit" disabled={submitting} className="w-full mt-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-bold shadow-lg disabled:opacity-50" data-testid="join-submit">
            {submitting ? '⏳ جاري التسجيل...' : '✨ انضمّ الآن'}
          </button>
        </form>
        <div className="text-center text-[11px] text-gray-500 pb-4">
          لديك حساب؟ <Link to="/login" className="text-indigo-300 hover:underline">تسجيل الدخول</Link>
        </div>
      </div>
    </div>
  );
};

export default JoinViaInvite;
