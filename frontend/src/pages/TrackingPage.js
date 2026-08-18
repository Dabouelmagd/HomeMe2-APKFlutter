import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  MapPinIcon, UserGroupIcon, PlusIcon, XMarkIcon,
  SignalIcon, BoltIcon, TrashIcon, ShieldCheckIcon,
  TruckIcon, UserIcon, HomeIcon, EyeIcon, EyeSlashIcon,
  Cog6ToothIcon, ClockIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../App';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const tok = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const RELATION_CONFIG = {
  family:   { label: 'فرد عائلة', icon: UserGroupIcon, color: '#7c3aed', emoji: '👨‍👩‍👧' },
  driver:   { label: 'سائق',     icon: TruckIcon,    color: '#2563eb', emoji: '🚗' },
  helper:   { label: 'مساعد منزلي', icon: UserIcon,  color: '#059669', emoji: '👷' },
  security: { label: 'أمن',      icon: ShieldCheckIcon, color: '#dc2626', emoji: '🛡️' },
  car:      { label: 'سيارة',    icon: TruckIcon,    color: '#b45309', emoji: '🚙' },
  other:    { label: 'أخرى',     icon: UserIcon,     color: '#6b7280', emoji: '📍' },
};

const COLORS = ['#059669','#2563eb','#dc2626','#b45309','#7c3aed','#0284c7','#ea580c','#4f46e5'];

function PersonCard({ person, onDelete, onToggle, selected, onClick }) {
  const cfg = RELATION_CONFIG[person.relation] || RELATION_CONFIG.other;
  const lastLoc = person.last_location;
  const minsAgo = lastLoc
    ? Math.floor((Date.now() - new Date(lastLoc.created_at)) / 60000)
    : null;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${
        selected
          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-emerald-300'
      }`}
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 shadow-sm"
        style={{ backgroundColor: person.avatar_color + '22', border: `2px solid ${person.avatar_color}` }}>
        <span>{cfg.emoji}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{person.name}</p>
          {person.is_online && (
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-gray-500">{cfg.label}</p>
        {lastLoc && (
          <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
            <ClockIcon className="h-3 w-3" />
            {minsAgo === 0 ? 'الآن' : `منذ ${minsAgo} دقيقة`}
            {lastLoc.battery !== undefined && (
              <span className="mr-1 text-[10px]">
                🔋 {lastLoc.battery}%
              </span>
            )}
          </p>
        )}
      </div>

      <div className="flex gap-1 flex-shrink-0">
        <button onClick={e => { e.stopPropagation(); onToggle(person); }}
          className={`p-1.5 rounded-lg transition-colors ${person.tracking_enabled ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}
          title={person.tracking_enabled ? 'إيقاف التتبع' : 'تفعيل التتبع'}>
          {person.tracking_enabled ? <EyeIcon className="h-4 w-4" /> : <EyeSlashIcon className="h-4 w-4" />}
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(person.id); }}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function AddPersonModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: '', relation: 'family', phone: '',
    vehicle_plate: '', description: '', avatar_color: '#059669'
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) return toast.error('الاسم مطلوب');
    setSaving(true);
    try {
      const res = await axios.post(`${API}/tracking/persons`, form, tok());
      toast.success(`✅ تمت الإضافة — كود المشاركة: ${res.data.share_code}`);
      onSuccess(res.data.person, res.data.share_code);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل الإضافة');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()} dir="rtl">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 rounded-t-2xl flex justify-between items-center">
          <h3 className="font-black text-white">➕ إضافة شخص للتتبع</h3>
          <button onClick={onClose}><XMarkIcon className="h-5 w-5 text-white" /></button>
        </div>
        <div className="p-4 space-y-3">
          {/* Relation */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">نوع الشخص</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(RELATION_CONFIG).map(([key, cfg]) => (
                <button key={key} type="button" onClick={() => set('relation', key)}
                  className={`p-2 rounded-xl border-2 text-center transition-all ${
                    form.relation === key ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-600'
                  }`}>
                  <div className="text-lg mb-0.5">{cfg.emoji}</div>
                  <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{cfg.label}</p>
                </button>
              ))}
            </div>
          </div>

          {[
            ['الاسم *', 'name', 'text', 'اسم الشخص...'],
            ['رقم الهاتف', 'phone', 'tel', '01xxxxxxxxx'],
            ['رقم اللوحة (للسيارة)', 'vehicle_plate', 'text', 'أ ب ج 123'],
          ].map(([label, key, type, ph]) => (
            <div key={key}>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{label}</label>
              <input type={type} value={form[key]} onChange={e => set(key, e.target.value)}
                placeholder={ph}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none" />
            </div>
          ))}

          {/* Color picker */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">لون الأيقونة</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => set('avatar_color', c)}
                  className={`w-7 h-7 rounded-full border-2 ${form.avatar_color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300">
            📱 بعد الإضافة سيظهر كود QR — أعطه للشخص ليبدأ مشاركة موقعه
          </div>

          <button onClick={submit} disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl text-sm disabled:opacity-60">
            {saving ? 'جاري الإضافة...' : '✅ إضافة وتفعيل التتبع'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Simple map placeholder (real integration needs Google Maps or Leaflet)
function TrackingMap({ persons, selectedId }) {
  const selected = persons.find(p => p.id === selectedId);

  return (
    <div className="relative bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700" style={{ minHeight: 300 }}>
      {/* Map grid pattern */}
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg,#059669 0,#059669 1px,transparent 0,transparent 50%), repeating-linear-gradient(90deg,#059669 0,#059669 1px,transparent 0,transparent 50%)', backgroundSize: '40px 40px' }} />

      {/* Compound outline */}
      <div className="absolute inset-8 border-4 border-dashed border-emerald-300 dark:border-emerald-700 rounded-3xl" />

      {/* Person dots */}
      {persons.filter(p => p.last_location && p.tracking_enabled).map((p, i) => {
        const cfg = RELATION_CONFIG[p.relation] || RELATION_CONFIG.other;
        const angle = (i / persons.length) * 2 * Math.PI;
        const r = 35;
        const cx = 50 + r * Math.cos(angle);
        const cy = 50 + r * Math.sin(angle);
        return (
          <div key={p.id}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all ${selectedId === p.id ? 'scale-125 z-10' : 'z-0'}`}
            style={{ left: `${cx}%`, top: `${cy}%` }}
          >
            <div className="relative">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-lg border-2 ${p.is_online ? 'animate-pulse' : ''}`}
                style={{ background: p.avatar_color + '33', borderColor: p.avatar_color }}>
                {cfg.emoji}
              </div>
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded-full shadow text-[9px] font-bold whitespace-nowrap border border-gray-200">
                {p.name}
              </div>
              {p.is_online && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
              )}
            </div>
          </div>
        );
      })}

      {/* Center label */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-4 py-2 rounded-xl text-center shadow">
          <HomeIcon className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
          <p className="text-xs font-bold text-gray-700 dark:text-gray-300">الكمبوند</p>
        </div>
      </div>

      {/* Google Maps notice */}
      <div className="absolute bottom-3 right-3 bg-white/90 dark:bg-gray-800/90 rounded-lg px-2 py-1 text-[10px] text-gray-500 shadow">
        🗺️ خريطة تجريبية — سيتم ربط Google Maps
      </div>

      {/* Selected person info */}
      {selected?.last_location && (
        <div className="absolute top-3 left-3 bg-white dark:bg-gray-800 rounded-xl p-2 shadow border border-gray-200 dark:border-gray-700 text-xs">
          <p className="font-bold">{selected.name}</p>
          <p className="text-gray-500">📍 {selected.last_location.lat?.toFixed(4)}, {selected.last_location.lng?.toFixed(4)}</p>
          {selected.last_location.speed > 0 && <p className="text-blue-600">🚗 {selected.last_location.speed} km/h</p>}
        </div>
      )}
    </div>
  );
}

// Main Page
export default function TrackingPage() {
  const { user } = useAuth();
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [stats, setStats] = useState({});
  const wsRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        axios.get(`${API}/tracking/persons`, tok()),
        axios.get(`${API}/tracking/stats`, tok()).catch(() => ({ data: {} })),
      ]);
      setPersons(pRes.data.persons || []);
      setStats(sRes.data || {});
    } catch { toast.error('فشل تحميل بيانات التتبع'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // WebSocket for live updates
  useEffect(() => {
    const compound_id = user?.compound_id;
    if (!compound_id) return;
    const wsUrl = `${process.env.REACT_APP_BACKEND_URL?.replace('https','wss').replace('http','ws')}/api/tracking/ws/watch/${compound_id}`;
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'location_update') {
            setPersons(prev => prev.map(p => p.id === msg.tracker_id
              ? { ...p, is_online: true, last_location: { lat: msg.lat, lng: msg.lng, battery: msg.battery, created_at: msg.timestamp } }
              : p
            ));
          } else if (msg.type === 'tracker_online') {
            setPersons(prev => prev.map(p => p.id === msg.tracker_id ? { ...p, is_online: true } : p));
          } else if (msg.type === 'tracker_offline') {
            setPersons(prev => prev.map(p => p.id === msg.tracker_id ? { ...p, is_online: false } : p));
          }
        } catch {}
      };
      return () => ws.close();
    } catch {}
  }, [user?.compound_id]);

  const handleDelete = async (id) => {
    if (!window.confirm('إيقاف تتبع هذا الشخص؟')) return;
    await axios.delete(`${API}/tracking/persons/${id}`, tok());
    toast.success('تم الإيقاف');
    load();
  };

  const handleToggle = async (person) => {
    await axios.put(`${API}/tracking/persons/${person.id}`, { tracking_enabled: !person.tracking_enabled }, tok());
    load();
  };

  const onlineCount = persons.filter(p => p.is_online).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-8" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-4 pt-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-black text-white flex items-center gap-2">
                <MapPinIcon className="h-6 w-6" /> نظام التتبع الداخلي
              </h1>
              <p className="text-emerald-100/80 text-sm mt-1">تتبع أفراد العائلة والسواقين والمساعدين داخل الكمبوند</p>
            </div>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 bg-white text-emerald-700 font-black px-4 py-2 rounded-xl text-sm shadow-lg hover:bg-emerald-50">
              <PlusIcon className="h-4 w-4" /> إضافة
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'إجمالي المتتبّعين', v: persons.length, icon: UserGroupIcon, color: 'text-white' },
              { label: 'متصل الآن', v: onlineCount, icon: SignalIcon, color: 'text-emerald-200' },
              { label: 'المناطق', v: stats.zones || 0, icon: MapPinIcon, color: 'text-teal-200' },
            ].map(({ label, v, icon: Icon, color }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20">
                <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
                <p className="text-2xl font-black text-white">{v}</p>
                <p className="text-[10px] text-white/70">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 -mt-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Map */}
          <div className="md:col-span-2">
            <TrackingMap persons={persons} selectedId={selectedId} />
          </div>

          {/* Persons list */}
          <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">الأشخاص المتتبّعون</h3>
              <div className="flex items-center gap-2">
                {onlineCount > 0 && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full animate-pulse">
                    {onlineCount} متصل
                  </span>
                )}
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-400">جاري التحميل...</div>
            ) : persons.length === 0 ? (
              <div className="p-8 text-center">
                <MapPinIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-bold mb-1">لا يوجد أشخاص للتتبع</p>
                <p className="text-gray-400 text-sm mb-4">أضف أفراد عائلتك أو السواق أو المساعدين</p>
                <button onClick={() => setShowAdd(true)}
                  className="bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm">
                  + إضافة أول شخص
                </button>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {persons.map(p => (
                  <PersonCard key={p.id} person={p}
                    onDelete={handleDelete}
                    onToggle={handleToggle}
                    selected={selectedId === p.id}
                    onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Privacy notice */}
          <div className="md:col-span-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
            <h4 className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2 mb-2">
              🔒 الخصوصية وموافقة التتبع
            </h4>
            <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
              <li>• التتبع اختياري 100% — لا يمكن تفعيله بدون موافقة الشخص</li>
              <li>• الشخص المتتبَّع يتحكم في مشاركة موقعه من هاتفه</li>
              <li>• يمكن إيقاف التتبع في أي وقت من الطرفين</li>
              <li>• سجل المواقع يُحذف تلقائياً بعد 24 ساعة</li>
              <li>• المواقع لا تُشارك مع أي طرف خارجي</li>
            </ul>
          </div>
        </div>
      </div>

      {showAdd && (
        <AddPersonModal
          onClose={() => setShowAdd(false)}
          onSuccess={(person, code) => { setShowAdd(false); load(); toast.success(`كود القسم: ${code}`); }}
        />
      )}
    </div>
  );
}
