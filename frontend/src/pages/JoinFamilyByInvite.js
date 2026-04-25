import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useParams, useNavigate, Link } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RELATIONSHIP_LABELS = {
  spouse: '💍 زوج / زوجة',
  child: '👶 ابن / ابنة',
  parent: '👵 أب / أم',
  sibling: '👯 أخ / أخت',
  driver: '🚗 سائق',
  helper: '🧹 خادم / مساعد',
  other: '🤝 أخرى',
};

/**
 * JoinFamilyByInvite — public page mounted at /join-family/:token
 * Mirrors the JoinViaInvite flow but for family-scoped invites:
 *   - validate token → GET /family-invites/token/:token
 *   - on submit → POST /family-invites/token/:token/accept (creates user
 *     under inviter's family_id + unit_number + compound_id)
 */
const JoinFamilyByInvite = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: '', username: '', email: '', password: '', phone: '',
  });

  useEffect(() => {
    let alive = true;
    axios.get(`${API}/family-invites/token/${token}`)
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
      await axios.post(`${API}/family-invites/token/${token}/accept`, form);
      toast.success('تم إنشاء حسابك بنجاح! يمكنك تسجيل الدخول الآن.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'فشل التسجيل');
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-pink-950 via-rose-900 to-gray-950 flex items-center justify-center text-pink-200" dir="rtl">
      جاري التحقق من الرابط...
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 via-gray-900 to-black flex items-center justify-center p-6" dir="rtl">
      <div className="bg-gray-900/80 rounded-2xl p-8 max-w-md text-center border border-red-500/30" data-testid="join-family-error">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-white mb-2">رابط غير صالح</h1>
        <p className="text-sm text-red-300 mb-6">{error}</p>
        <Link to="/login" className="inline-block px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold">الذهاب لتسجيل الدخول</Link>
      </div>
    </div>
  );

  const compound = invite?.compound || {};
  const inviter = invite?.inviter;
  const relText = RELATIONSHIP_LABELS[invite?.relationship] || invite?.relationship;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-950 via-rose-900 to-gray-950 flex items-center justify-center p-4" dir="rtl" data-testid="join-family-page">
      <div className="w-full max-w-lg bg-gray-900/90 backdrop-blur rounded-2xl shadow-2xl border border-pink-500/30 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-600/40 to-rose-600/40 p-6 border-b border-pink-500/20">
          <div className="text-[10px] text-pink-300 uppercase tracking-wider mb-1">دعوة عائلية</div>
          <h1 className="text-2xl font-bold text-white">👨‍👩‍👧‍👦 انضم لأسرتك على HomeMe</h1>
          {inviter?.full_name && (
            <p className="text-sm text-pink-100 mt-2">من: <span className="font-bold">{inviter.full_name}</span></p>
          )}
          {compound.name && (
            <p className="text-xs text-gray-300 mt-1">🏘️ {compound.name}{invite?.unit_number ? ` — وحدة ${invite.unit_number}` : ''}</p>
          )}
          <div className="flex items-center gap-2 mt-3 text-[11px]">
            <span className="bg-emerald-600/30 text-emerald-300 px-2 py-0.5 rounded-full">{relText}</span>
            {invite?.remaining_uses !== null && invite?.remaining_uses !== undefined && (
              <span className="bg-amber-600/30 text-amber-300 px-2 py-0.5 rounded-full">متبقي: {invite.remaining_uses}</span>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="p-6 space-y-3">
          {invite?.note && <div className="bg-pink-900/30 border border-pink-700/40 rounded-lg p-2 text-[11px] text-pink-200 italic">💬 {invite.note}</div>}
          {invite?.invitee_name_hint && (
            <div className="bg-blue-900/30 border border-blue-700/40 rounded-lg p-2 text-[11px] text-blue-200">
              تمت دعوتك باسم: <span className="font-bold">{invite.invitee_name_hint}</span>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-400 mb-1">الاسم الكامل *</label>
            <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-pink-500 outline-none" data-testid="join-family-fullname" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">اسم المستخدم *</label>
              <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" data-testid="join-family-username" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">كلمة المرور *</label>
              <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" data-testid="join-family-password" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">البريد الإلكتروني *</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" data-testid="join-family-email" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">الهاتف</label>
            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <button type="submit" disabled={submitting} className="w-full mt-2 px-4 py-3 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-lg font-bold shadow-lg disabled:opacity-50" data-testid="join-family-submit">
            {submitting ? '⏳ جاري التسجيل...' : '✨ انضمّ للأسرة'}
          </button>
        </form>
        <div className="text-center text-[11px] text-gray-500 pb-4">
          لديك حساب؟ <Link to="/login" className="text-pink-300 hover:underline">تسجيل الدخول</Link>
        </div>
      </div>
    </div>
  );
};

export default JoinFamilyByInvite;
