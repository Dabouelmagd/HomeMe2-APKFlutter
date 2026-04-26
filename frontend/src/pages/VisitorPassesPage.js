import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import {
  TicketIcon,
  PlusIcon,
  ArrowPathIcon,
  XMarkIcon,
  ClockIcon,
  TruckIcon,
  PhoneIcon,
  UserIcon,
  ClipboardDocumentIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const STATUS = {
  active: { txt: 'نشط', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  used: { txt: 'مستخدم', cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  expired: { txt: 'منتهي', cls: 'bg-gray-100 text-gray-700 border-gray-200' },
  revoked: { txt: 'ملغي', cls: 'bg-rose-100 text-rose-800 border-rose-200' },
};

const FILTERS = [
  { k: 'all', t: 'الكل' },
  { k: 'active', t: 'نشطة' },
  { k: 'used', t: 'مستخدمة' },
  { k: 'expired', t: 'منتهية' },
  { k: 'revoked', t: 'ملغية' },
];

const fmt = (iso) => { if (!iso) return '—'; try { return new Date(iso).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return iso; } };

const PassCard = ({ p, onChange }) => {
  const [showQr, setShowQr] = useState(false);
  const url = `${window.location.origin}${p.public_url}`;
  const meta = STATUS[p.effective_status] || STATUS.active;

  const copy = async () => { try { await navigator.clipboard.writeText(url); toast.success('تم نسخ الرابط'); } catch { toast.error('فشل النسخ'); } };
  const share = () => window.open(`https://wa.me/?text=${encodeURIComponent(`رابط دخول الزائر:\n${url}`)}`, '_blank');
  const revoke = async () => {
    if (!window.confirm('إلغاء الرابط؟')) return;
    try { await axios.delete(`${API}/visitor-passes/${p.id}`, auth()); toast.success('تم الإلغاء'); onChange(); }
    catch (e) { toast.error(e?.response?.data?.detail || 'فشل'); }
  };
  const downloadQr = () => {
    const svg = document.querySelector(`[data-qr-${p.id}]`);
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: 'image/svg+xml' });
    const u = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024; canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1024, 1024);
      ctx.drawImage(img, 0, 0, 1024, 1024);
      canvas.toBlob((b) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = `visitor-${p.visitor_name}-${Date.now()}.png`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(a.href); URL.revokeObjectURL(u);
        toast.success('تم التنزيل');
      }, 'image/png');
    };
    img.src = u;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-md transition-shadow" data-testid={`pass-card-${p.id}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-base text-gray-900">{p.visitor_name}</span>
            <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.txt}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1 space-y-0.5">
            {p.visitor_phone && <div className="inline-flex items-center gap-1"><PhoneIcon className="w-3.5 h-3.5" />{p.visitor_phone}</div>}
            {p.vehicle_plate && <div className="inline-flex items-center gap-1 mr-3"><TruckIcon className="w-3.5 h-3.5" />{p.vehicle_plate}</div>}
            {p.purpose && <div className="text-xs italic mt-1">"{p.purpose}"</div>}
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className="bg-white p-1.5 rounded-lg border-2 border-gray-100">
            <QRCodeSVG value={url} size={70} level="M" includeMargin={false} {...{[`data-qr-${p.id}`]: ''}} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 border-t border-gray-100 pt-2">
        <div className="inline-flex items-center gap-1"><ClockIcon className="w-3.5 h-3.5" />من {fmt(p.valid_from)}</div>
        <div className="inline-flex items-center gap-1">إلى {fmt(p.valid_until)}</div>
        <div>الاستخدام: <strong>{p.used_count || 0} / {p.max_uses || 1}</strong></div>
        {p.used_by_security_name && <div className="text-emerald-700">✓ {p.used_by_security_name}</div>}
      </div>

      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
        <button onClick={copy} className="text-xs bg-gray-900 hover:bg-black text-white px-3 py-1.5 rounded-lg inline-flex items-center gap-1" data-testid={`vp-copy-${p.id}`}><ClipboardDocumentIcon className="w-3.5 h-3.5" />نسخ</button>
        <button onClick={share} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg inline-flex items-center gap-1" data-testid={`vp-share-${p.id}`}><ShareIcon className="w-3.5 h-3.5" />واتساب</button>
        <button onClick={downloadQr} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg inline-flex items-center gap-1" data-testid={`vp-dl-${p.id}`}><ArrowDownTrayIcon className="w-3.5 h-3.5" />PNG</button>
        {p.effective_status === 'active' && (
          <button onClick={revoke} className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg inline-flex items-center gap-1 mr-auto" data-testid={`vp-revoke-${p.id}`}><TrashIcon className="w-3.5 h-3.5" />إلغاء</button>
        )}
      </div>
    </div>
  );
};

const CreatePassModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({ visitor_name: '', visitor_phone: '', purpose: '', vehicle_plate: '', valid_hours: 24, max_uses: 1 });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!form.visitor_name.trim()) { toast.error('اسم الزائر مطلوب'); return; }
    setBusy(true);
    try {
      const r = await axios.post(`${API}/visitor-passes`, form, auth());
      toast.success('تم إنشاء الرابط');
      onCreated(r.data?.pass);
      onClose();
    } catch (e) { toast.error(e?.response?.data?.detail || 'فشل الإنشاء'); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[110] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()} data-testid="create-pass-modal">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <h3 className="text-lg font-bold text-gray-900 inline-flex items-center gap-2"><TicketIcon className="w-6 h-6 text-blue-500" />دعوة زائر جديدة</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">اسم الزائر *</label>
            <input value={form.visitor_name} onChange={(e) => setForm((p) => ({ ...p, visitor_name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="مثال: أحمد محمد" data-testid="vp-name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">رقم الموبايل</label>
              <input value={form.visitor_phone} onChange={(e) => setForm((p) => ({ ...p, visitor_phone: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="01xxxxxxxxx" data-testid="vp-phone" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">رقم السيارة</label>
              <input value={form.vehicle_plate} onChange={(e) => setForm((p) => ({ ...p, vehicle_plate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="س ب ل 1234" data-testid="vp-plate" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">سبب الزيارة</label>
            <input value={form.purpose} onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="مثال: زيارة عائلية" data-testid="vp-purpose" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">صلاحية بالساعات</label>
              <select value={form.valid_hours} onChange={(e) => setForm((p) => ({ ...p, valid_hours: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" data-testid="vp-hours">
                <option value={2}>ساعتين</option>
                <option value={6}>6 ساعات</option>
                <option value={12}>12 ساعة</option>
                <option value={24}>يوم كامل</option>
                <option value={72}>3 أيام</option>
                <option value={168}>أسبوع</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">عدد مرات الدخول</label>
              <select value={form.max_uses} onChange={(e) => setForm((p) => ({ ...p, max_uses: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" data-testid="vp-uses">
                {[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n} مرة</option>)}
              </select>
            </div>
          </div>
          <button onClick={submit} disabled={busy} className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-3 rounded-lg font-bold disabled:opacity-50" data-testid="vp-submit">
            {busy ? 'جاري الإنشاء...' : 'إنشاء الرابط ✨'}
          </button>
        </div>
      </div>
    </div>
  );
};

const VisitorPassesPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/visitor-passes/my`, auth());
      setItems(r.data?.passes || []);
    } catch { toast.error('فشل التحميل'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c = { all: items.length, active: 0, used: 0, expired: 0, revoked: 0 };
    items.forEach((p) => { c[p.effective_status] = (c[p.effective_status] || 0) + 1; });
    return c;
  }, [items]);

  const filtered = useMemo(() => filter === 'all' ? items : items.filter((p) => p.effective_status === filter), [items, filter]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen" data-testid="visitor-passes-page">
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 inline-flex items-center gap-2">
              <TicketIcon className="h-7 w-7 text-blue-500" />
              تذاكر الزوار
            </h1>
            <p className="text-sm text-gray-500 mt-1">أنشئي رابط دخول مؤقت لأي زائر — هيمسحه الأمن عند البوابة</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium" data-testid="vp-reload"><ArrowPathIcon className="w-4 h-4" />تحديث</button>
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg font-bold shadow-md" data-testid="vp-create-btn">
              <PlusIcon className="w-4 h-4" />دعوة زائر جديد
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-3 mb-4 flex flex-wrap items-center gap-2" data-testid="vp-filters">
        {FILTERS.map((f) => {
          const active = filter === f.k;
          return (
            <button key={f.k} onClick={() => setFilter(f.k)} className={`px-4 py-2 rounded-full text-sm font-medium ${active ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} data-testid={`vp-filter-${f.k}`}>
              {f.t}
              <span className={`ml-2 inline-flex items-center justify-center text-[10px] font-bold rounded-full w-5 h-5 ${active ? 'bg-white/25' : 'bg-gray-300 text-gray-700'}`}>{counts[f.k] || 0}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-32 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center" data-testid="vp-empty">
          <UserIcon className="w-14 h-14 text-gray-300 mx-auto mb-2" />
          <p className="text-base font-medium text-gray-700">لا توجد تذاكر زوار</p>
          <p className="text-xs text-gray-500 mt-1">اضغطي "دعوة زائر جديد" لإنشاء أول واحدة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((p) => <PassCard key={p.id} p={p} onChange={load} />)}
        </div>
      )}

      {showCreate && <CreatePassModal onClose={() => setShowCreate(false)} onCreated={() => load()} />}
    </div>
  );
};

export default VisitorPassesPage;
