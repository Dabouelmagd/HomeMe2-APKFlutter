import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import {
  TicketIcon,
  CheckBadgeIcon,
  XCircleIcon,
  ClockIcon,
  PhoneIcon,
  TruckIcon,
  HomeIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_META = {
  active: { txt: 'نشط - صالح', color: 'emerald', icon: CheckBadgeIcon },
  used: { txt: 'تم الاستخدام', color: 'blue', icon: CheckBadgeIcon },
  expired: { txt: 'منتهي الصلاحية', color: 'gray', icon: XCircleIcon },
  revoked: { txt: 'تم إلغاءه', color: 'rose', icon: XCircleIcon },
};

const fmt = (iso) => { if (!iso) return '—'; try { return new Date(iso).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return iso; } };

const PublicVisitorPassPage = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(`${API}/visitor-passes/public/${token}`)
      .then((r) => setData(r.data))
      .catch((e) => setError(e?.response?.data?.detail || 'الرابط غير صالح'));
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md text-center" data-testid="public-pass-error">
          <XCircleIcon className="w-16 h-16 text-rose-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900">رابط غير صالح</h1>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">جاري التحميل...</div>
      </div>
    );
  }

  const meta = STATUS_META[data.effective_status] || STATUS_META.active;
  const Icon = meta.icon;
  const colors = {
    emerald: 'from-emerald-500 to-green-600',
    blue: 'from-blue-500 to-indigo-600',
    gray: 'from-gray-500 to-slate-600',
    rose: 'from-rose-500 to-pink-600',
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-${meta.color}-50 to-${meta.color}-100 flex items-center justify-center p-4`}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden" data-testid="public-pass-page">
        <div className={`bg-gradient-to-br ${colors[meta.color]} text-white p-6 text-center`}>
          <Icon className="w-14 h-14 mx-auto mb-2 opacity-90" />
          <div className="text-xs uppercase tracking-wider opacity-80">تذكرة دخول زائر</div>
          <div className="text-2xl font-extrabold mt-1">{data.visitor_name}</div>
          <div className="inline-block bg-white/20 backdrop-blur-sm rounded-full px-3 py-0.5 text-[11px] font-bold mt-2">
            {meta.txt}
          </div>
        </div>

        <div className="p-6 space-y-3 text-sm">
          <div className="flex items-start gap-2 border-b border-gray-100 pb-2">
            <UserIcon className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <div className="text-[10px] text-gray-500">المضيف</div>
              <div className="font-bold text-gray-900">{data.resident_full_name || '—'}</div>
            </div>
          </div>
          {data.unit_number && (
            <div className="flex items-start gap-2 border-b border-gray-100 pb-2">
              <HomeIcon className="w-4 h-4 text-gray-400 mt-0.5" />
              <div><div className="text-[10px] text-gray-500">الوحدة</div><div className="font-bold text-gray-900">{data.unit_number}</div></div>
            </div>
          )}
          {data.visitor_phone && (
            <div className="flex items-start gap-2 border-b border-gray-100 pb-2">
              <PhoneIcon className="w-4 h-4 text-gray-400 mt-0.5" />
              <div><div className="text-[10px] text-gray-500">رقم الزائر</div><div className="font-mono text-gray-900" dir="ltr">{data.visitor_phone}</div></div>
            </div>
          )}
          {data.vehicle_plate && (
            <div className="flex items-start gap-2 border-b border-gray-100 pb-2">
              <TruckIcon className="w-4 h-4 text-gray-400 mt-0.5" />
              <div><div className="text-[10px] text-gray-500">السيارة</div><div className="font-mono text-gray-900">{data.vehicle_plate}</div></div>
            </div>
          )}
          {data.purpose && (
            <div className="flex items-start gap-2 border-b border-gray-100 pb-2">
              <span className="text-gray-400 mt-0.5">📝</span>
              <div><div className="text-[10px] text-gray-500">سبب الزيارة</div><div className="text-gray-900 italic">"{data.purpose}"</div></div>
            </div>
          )}
          <div className="flex items-start gap-2 border-b border-gray-100 pb-2">
            <ClockIcon className="w-4 h-4 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <div className="text-[10px] text-gray-500">صالح من</div>
              <div className="text-xs text-gray-700">{fmt(data.valid_from)}</div>
              <div className="text-[10px] text-gray-500 mt-1">صالح حتى</div>
              <div className="text-xs text-gray-700">{fmt(data.valid_until)}</div>
            </div>
          </div>
          <div className="text-center text-xs text-gray-500">
            استخدام: <strong>{data.used_count || 0}</strong> من <strong>{data.max_uses || 1}</strong>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 text-center text-[11px] text-gray-500 border-t">
          🔐 على الأمن مسح الرابط من تطبيق HomeMe لتفعيل الدخول
        </div>
      </div>
    </div>
  );
};

export default PublicVisitorPassPage;
