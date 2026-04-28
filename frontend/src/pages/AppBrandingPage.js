import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../App';

const API = process.env.REACT_APP_BACKEND_URL;

export default function AppBrandingPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  const load = async () => {
    try {
      const res = await axios.get(`${API}/api/app-branding`);
      setData(res.data);
      setDraft(res.data || {});
    } catch (e) { toast.error('فشل تحميل الإعدادات'); }
  };

  useEffect(() => { load(); }, []);

  if (user?.role !== 'app_owner' && user?.role !== 'super_admin') {
    return <div className="p-8 text-center text-gray-600 dark:text-gray-300">هذه الصفحة متاحة للمالك فقط.</div>;
  }

  const save = async () => {
    setBusy(true);
    try {
      const payload = {};
      ['app_name_ar','app_name_en','tagline_ar','tagline_en','primary_color','secondary_color','accent_color'].forEach(k => {
        if (draft[k] !== undefined && draft[k] !== data?.[k]) payload[k] = draft[k];
      });
      if (!Object.keys(payload).length) { toast.info('لا توجد تغييرات للحفظ'); setBusy(false); return; }
      const res = await axios.put(`${API}/api/app-branding`, payload, { headers: headers() });
      setData(res.data);
      setDraft(res.data);
      toast.success('تم حفظ التغييرات');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل الحفظ');
    } finally { setBusy(false); }
  };

  const uploadLogo = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await axios.post(`${API}/api/app-branding/logo`, fd, {
        headers: { ...headers(), 'Content-Type': 'multipart/form-data' }
      });
      toast.success('تم رفع اللوجو بنجاح');
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل رفع اللوجو');
    } finally { setBusy(false); }
  };

  const update = (k, v) => setDraft(prev => ({ ...prev, [k]: v }));

  const logoSrc = data?.logo_url ? `${API}${data.logo_url}` : null;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto" data-testid="app-branding-page">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">لوجو وألوان هوم مي</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">الإعدادات الافتراضية للتطبيق — تظهر في صفحة الدخول، sidebar المالك، تقارير PDF العامة، والإيميلات التلقائية.</p>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Preview */}
        <div className="rounded-2xl p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">معاينة مباشرة</h3>
          <div className="rounded-xl p-6 text-white text-center" style={{
            background: `linear-gradient(135deg, ${draft.primary_color || '#e11d48'}, ${draft.secondary_color || '#7c3aed'})`
          }}>
            {logoSrc ? (
              <img src={logoSrc} alt="logo" className="mx-auto h-20 w-20 rounded-2xl object-cover bg-white/20 backdrop-blur-sm border-2 border-white/30 mb-3" data-testid="branding-preview-logo" />
            ) : (
              <div className="mx-auto h-20 w-20 rounded-2xl bg-white/20 flex items-center justify-center text-4xl font-extrabold mb-3">
                {(draft.app_name_ar || 'ه').charAt(0)}
              </div>
            )}
            <div className="text-2xl font-extrabold" data-testid="branding-preview-name">{draft.app_name_ar || 'هوم مي'}</div>
            <div className="text-sm opacity-90 mt-1">{draft.tagline_ar || 'إدارة المجتمعات السكنية بسهولة'}</div>
            <div className="mt-4 inline-flex px-4 py-1.5 rounded-full text-xs font-bold" style={{ background: draft.accent_color || '#f59e0b', color: '#000' }}>
              تجربة لون التمييز
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button onClick={() => fileRef.current?.click()} disabled={busy}
                    className="flex-1 px-3 py-2 rounded-lg border-2 border-dashed border-rose-300 hover:border-rose-500 text-rose-700 font-semibold text-sm" data-testid="logo-upload-btn">
              📤 رفع لوجو جديد (PNG/JPG/SVG ≤2MB)
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden"
                   onChange={(e) => uploadLogo(e.target.files?.[0])} data-testid="logo-file-input" />
          </div>
        </div>

        {/* Form */}
        <div className="rounded-2xl p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-200">اسم التطبيق (عربي)</label>
            <input type="text" value={draft.app_name_ar || ''} onChange={(e)=>update('app_name_ar', e.target.value)}
                   className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                   data-testid="input-app-name-ar"/>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-200">App Name (English)</label>
            <input type="text" value={draft.app_name_en || ''} onChange={(e)=>update('app_name_en', e.target.value)}
                   className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-gray-800 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-200">الشعار (Tagline)</label>
            <input type="text" value={draft.tagline_ar || ''} onChange={(e)=>update('tagline_ar', e.target.value)}
                   className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-gray-800 dark:text-gray-100" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { k: 'primary_color', label: 'أساسي' },
              { k: 'secondary_color', label: 'ثانوي' },
              { k: 'accent_color', label: 'تمييز' },
            ].map(({ k, label }) => (
              <div key={k}>
                <label className="block text-xs font-bold mb-1 text-gray-700 dark:text-gray-200">{label}</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={draft[k] || '#000000'} onChange={(e)=>update(k, e.target.value)}
                         className="h-9 w-9 rounded cursor-pointer" data-testid={`color-${k}`}/>
                  <input type="text" value={draft[k] || ''} onChange={(e)=>update(k, e.target.value)}
                         className="flex-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-xs font-mono"/>
                </div>
              </div>
            ))}
          </div>

          <button onClick={save} disabled={busy}
                  className="w-full px-4 py-2.5 rounded-xl text-white font-bold bg-gradient-to-r from-rose-600 to-purple-700 hover:opacity-90 disabled:opacity-50"
                  data-testid="branding-save-btn">
            {busy ? 'جاري الحفظ...' : '💾 حفظ التغييرات'}
          </button>
        </div>
      </div>
    </div>
  );
}
