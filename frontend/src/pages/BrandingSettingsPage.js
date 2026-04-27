import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Palette, Save, Image as ImageIcon, Loader2, Eye, Upload } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PRESETS = [
  { name: 'إنديغو (افتراضي)', primary: '#4338ca', secondary: '#6366f1', accent: '#eef2ff' },
  { name: 'زمردي', primary: '#10b981', secondary: '#14b8a6', accent: '#ecfdf5' },
  { name: 'ذهبي ملكي', primary: '#b45309', secondary: '#d97706', accent: '#fef3c7' },
  { name: 'أزرق محيطي', primary: '#0369a1', secondary: '#0891b2', accent: '#e0f2fe' },
  { name: 'وردي عصري', primary: '#be185d', secondary: '#db2777', accent: '#fce7f3' },
  { name: 'أرجواني فاخر', primary: '#6b21a8', secondary: '#9333ea', accent: '#f3e8ff' },
];

export default function BrandingSettingsPage() {
  const [user, setUser] = useState(null);
  const [compounds, setCompounds] = useState([]);
  const [compoundId, setCompoundId] = useState('');
  const [branding, setBranding] = useState({});
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      toast.error('حجم الملف يتجاوز 2 ميجابايت');
      return;
    }
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const r = await axios.post(`${API}/compounds/${compoundId}/branding/logo`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const fullUrl = `${BACKEND_URL}${r.data.logo_url}`;
      setBranding({ ...branding, logo_url: fullUrl });
      toast.success('تم رفع الشعار بنجاح');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'فشل رفع الشعار');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    setUser(u);
    if (u?.compound_id) setCompoundId(u.compound_id);
    if (u?.role === 'app_owner' || u?.role === 'super_admin') {
      axios.get(`${API}/compounds`).then((r) => {
        const list = Array.isArray(r.data) ? r.data : (r.data?.compounds || []);
        setCompounds(list);
        if (!u?.compound_id && list[0]?.id) setCompoundId(list[0].id);
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!compoundId) return;
    axios.get(`${API}/compounds/${compoundId}/branding`)
      .then((r) => setBranding(r.data.branding || {}))
      .catch((e) => toast.error(e.response?.data?.detail || 'فشل التحميل'));
  }, [compoundId]);

  const updateField = (key, value) => setBranding({ ...branding, [key]: value });

  const applyPreset = (p) => {
    setBranding({ ...branding, primary_color: p.primary, secondary_color: p.secondary, accent_color: p.accent });
  };

  const save = async () => {
    setLoading(true);
    try {
      const r = await axios.put(`${API}/compounds/${compoundId}/branding`, branding);
      setBranding(r.data.branding || {});
      toast.success('تم حفظ التخصيصات');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const previewPdf = async () => {
    setPreviewing(true);
    try {
      const today = new Date();
      const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const res = await axios.get(`${API}/reports/compound/${compoundId}/summary?month=${month}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل المعاينة');
    } finally {
      setPreviewing(false);
    }
  };

  const role = user?.role;
  const isOwner = role === 'app_owner' || role === 'super_admin';

  return (
    <div className="min-h-screen p-6" data-testid="branding-page">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white">
            <Palette className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">تخصيص قالب التقارير</h1>
            <p className="text-gray-600 dark:text-gray-300 text-sm">شعار، ألوان، وتوقيع للظهور في كل تقارير PDF لمجمعك.</p>
          </div>
        </div>

        {/* Compound select for owners */}
        {isOwner && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md mb-6 border border-gray-100 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">المجمع</label>
            <select
              value={compoundId}
              onChange={(e) => setCompoundId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
              data-testid="branding-compound-select"
            >
              <option value="">— اختر مجمع —</option>
              {compounds.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        {compoundId && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-indigo-600" /> العلامة التجارية
              </h3>
              <Field label="رابط الشعار (URL)" testid="logo-url-input">
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="https://example.com/logo.png"
                    value={branding.logo_url || ''}
                    onChange={(e) => updateField('logo_url', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm"
                    data-testid="branding-logo-url-input"
                  />
                  <div className="flex items-center gap-2">
                    <label
                      className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm font-medium border-2 border-dashed ${uploadingLogo ? 'opacity-50 pointer-events-none' : 'border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}
                      data-testid="upload-logo-btn"
                    >
                      {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploadingLogo ? 'جارِ الرفع…' : 'رفع شعار من الجهاز (PNG/JPG/WEBP/SVG ≤ 2MB)'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                        onChange={handleLogoUpload}
                        className="hidden"
                        data-testid="branding-logo-file-input"
                      />
                    </label>
                    {branding.logo_url && (
                      <img src={branding.logo_url} alt="logo preview" className="w-12 h-12 object-contain border border-gray-200 rounded" />
                    )}
                  </div>
                </div>
              </Field>
              <Field label="اسم العلامة التجارية" testid="brand-label-input">
                <input
                  type="text"
                  placeholder="مثال: HomeMe — رويال سيتي"
                  value={branding.brand_label || ''}
                  onChange={(e) => updateField('brand_label', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm"
                  data-testid="branding-brand-label-input"
                />
              </Field>
              <Field label="الشعار الفرعي (Tagline)">
                <input
                  type="text"
                  placeholder="مثال: حياة فاخرة، مجتمع راقٍ"
                  value={branding.tagline || ''}
                  onChange={(e) => updateField('tagline', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm"
                  data-testid="branding-tagline-input"
                />
              </Field>
              <Field label="نص التوقيع (يظهر في تذييل كل التقارير)">
                <textarea
                  rows={2}
                  placeholder="إدارة المجمع — للتواصل: 19999"
                  value={branding.signature_text || ''}
                  onChange={(e) => updateField('signature_text', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm"
                  data-testid="branding-signature-input"
                />
              </Field>

              <h3 className="font-semibold text-gray-900 dark:text-white mt-6 mb-3 flex items-center gap-2">
                <Palette className="w-5 h-5 text-indigo-600" /> الألوان
              </h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <ColorField label="أساسي" value={branding.primary_color || ''} onChange={(v) => updateField('primary_color', v)} testid="primary-color-input" />
                <ColorField label="ثانوي" value={branding.secondary_color || ''} onChange={(v) => updateField('secondary_color', v)} testid="secondary-color-input" />
                <ColorField label="مساعد" value={branding.accent_color || ''} onChange={(v) => updateField('accent_color', v)} testid="accent-color-input" />
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">قوالب جاهزة:</div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => applyPreset(p)}
                    className="text-xs px-3 py-2 rounded-lg border hover:shadow flex items-center gap-2"
                    data-testid={`preset-${p.name}`}
                  >
                    <div className="flex gap-1">
                      <span className="w-3 h-3 rounded-full" style={{ background: p.primary }} />
                      <span className="w-3 h-3 rounded-full" style={{ background: p.secondary }} />
                      <span className="w-3 h-3 rounded-full" style={{ background: p.accent }} />
                    </div>
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={save}
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:opacity-90 disabled:opacity-50"
                  data-testid="save-branding-btn"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  حفظ التخصيصات
                </button>
                <button
                  onClick={previewPdf}
                  disabled={previewing}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-indigo-600 text-indigo-700 font-medium hover:bg-indigo-50 disabled:opacity-50"
                  data-testid="preview-pdf-btn"
                >
                  {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                  معاينة PDF
                </button>
              </div>
            </div>

            {/* Live Preview */}
            <div
              className="rounded-2xl p-6 shadow-lg overflow-hidden relative"
              style={{
                background: `linear-gradient(135deg, ${branding.accent_color || '#eef2ff'} 0%, white 100%)`,
                border: `2px solid ${branding.secondary_color || '#6366f1'}`,
              }}
            >
              <div className="border-b-4 pb-3 mb-4" style={{ borderColor: branding.primary_color || '#4338ca' }}>
                {branding.logo_url && (
                  <img src={branding.logo_url} alt="logo" className="h-12 mb-2 object-contain" />
                )}
                <div className="text-2xl font-bold" style={{ color: branding.primary_color || '#4338ca' }}>
                  {branding.brand_label || 'HomeMe'}
                </div>
                <div className="text-xs text-gray-500">{branding.tagline || 'منصة إدارة المجمعات السكنية'}</div>
              </div>
              <div className="text-2xl font-extrabold text-gray-900 mb-2">التقرير الشامل للمجمع</div>
              <div className="text-sm text-gray-600 mb-4">معاينة شكل ترويسة التقرير</div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'الوحدات', value: '120' },
                  { label: 'المشغولة', value: '108' },
                  { label: 'الإشغال', value: '90%' },
                ].map((k, i) => (
                  <div key={i} className="rounded-lg p-3" style={{ background: branding.accent_color || '#eef2ff' }}>
                    <div className="text-[10px] text-gray-500">{k.label}</div>
                    <div className="text-lg font-bold" style={{ color: branding.primary_color || '#4338ca' }}>{k.value}</div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-500 border-t pt-3" style={{ borderColor: branding.secondary_color }}>
                {branding.signature_text || ''}
                <div className="mt-1">© {branding.brand_label || 'HomeMe'} 2026</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const Field = ({ label, children }) => (
  <div className="mb-3">
    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    {children}
  </div>
);

const ColorField = ({ label, value, onChange, testid }) => (
  <div>
    <label className="block text-[10px] font-medium text-gray-500 mb-1">{label}</label>
    <div className="flex items-center gap-2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700">
      <input
        type="color"
        value={value || '#4338ca'}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 cursor-pointer border-0 bg-transparent"
        data-testid={testid}
      />
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#4338ca"
        className="flex-1 text-xs font-mono bg-transparent dark:text-white outline-none"
      />
    </div>
  </div>
);
