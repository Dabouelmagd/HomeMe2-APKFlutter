import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import {
  LinkIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ShareIcon,
  TrashIcon,
  ClockIcon,
  UsersIcon,
  QrCodeIcon,
  ChartBarIcon,
  ArrowPathIcon,
  HomeIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const RELATIONSHIPS = {
  spouse: 'زوج / زوجة',
  child: 'ابن / ابنة',
  parent: 'أب / أم',
  sibling: 'أخ / أخت',
  driver: 'سائق',
  helper: 'خادم / مساعد',
  other: 'أخرى',
};

const STATUS_BADGE = {
  active: { txt: 'نشط', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  expired: { txt: 'منتهي', cls: 'bg-gray-100 text-gray-700 border-gray-200' },
  used_up: { txt: 'مستخدم', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  revoked: { txt: 'ملغي', cls: 'bg-rose-100 text-rose-800 border-rose-200' },
};

const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'active', label: 'نشطة' },
  { key: 'used_up', label: 'مستخدمة' },
  { key: 'expired', label: 'منتهية' },
  { key: 'revoked', label: 'ملغية' },
];

const buildJoinUrl = (relPath) => {
  if (!relPath) return '';
  if (/^https?:/i.test(relPath)) return relPath;
  return `${window.location.origin}${relPath}`;
};

/* ---------------- QR Modal (inline minimal) ---------------- */
const InviteQrModal = ({ url, title, subtitle, onClose }) => {
  const downloadPng = () => {
    const svg = document.querySelector('[data-qr-modal-svg]');
    if (!svg) { toast.error('تعذر تحضير الكود'); return; }
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 1024, 1024);
      ctx.drawImage(img, 0, 0, 1024, 1024);
      canvas.toBlob((b) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = `homeme_invite_${Date.now()}.png`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(a.href); URL.revokeObjectURL(svgUrl);
        toast.success('تم تنزيل QR بنجاح');
      }, 'image/png');
    };
    img.src = svgUrl;
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()} data-testid="invite-qr-modal">
        <div className="flex items-start justify-between mb-3">
          <div className="text-right flex-1">
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="bg-white p-4 rounded-2xl border-2 border-gray-100 inline-block">
          <QRCodeSVG value={url} size={240} level="M" includeMargin={false} data-qr-modal-svg="" />
        </div>
        <p className="mt-3 text-[11px] text-gray-500">امسح الكود بكاميرا الموبايل لفتح الرابط مباشرة</p>
        <button onClick={downloadPng} className="mt-4 w-full bg-gray-900 hover:bg-black text-white rounded-lg px-3 py-2 text-sm font-bold inline-flex items-center justify-center gap-2" data-testid="invite-qr-modal-download">
          <ArrowDownTrayIcon className="w-4 h-4" />
          تنزيل PNG
        </button>
      </div>
    </div>
  );
};

/* ---------------- Single Invite Card ---------------- */
const InviteCard = ({ invite, onRevoke }) => {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const url = buildJoinUrl(invite.join_url);
  const status = invite.effective_status || 'active';
  const badge = STATUS_BADGE[status] || STATUS_BADGE.active;

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); toast.success('تم نسخ الرابط'); }
    catch { toast.error('فشل النسخ'); }
  };

  const share = () => {
    const txt = encodeURIComponent(`أهلاً! 👋 رابط الانضمام:\n${url}`);
    window.open(`https://wa.me/?text=${txt}`, '_blank');
  };

  const revoke = async () => {
    if (!window.confirm('هل أنت متأكد من إلغاء هذا الرابط؟')) return;
    try {
      await axios.delete(`${API}/family-invites/${invite.id}`, auth());
      toast.success('تم إلغاء الرابط');
      onRevoke(invite.id);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'فشل الإلغاء');
    }
  };

  const expiresShort = invite.expires_at
    ? new Date(invite.expires_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
    : '-';

  const targetLine = invite.target_user_full_name || invite.invitee_name_hint;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3 hover:shadow-md transition-shadow" data-testid={`my-invite-card-${invite.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 text-sm">{RELATIONSHIPS[invite.relationship] || invite.relationship}</span>
            <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.txt}</span>
            {invite.unit_number && (
              <span className="text-[10px] inline-flex items-center gap-1 text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                <HomeIcon className="w-3 h-3" /> الوحدة {invite.unit_number}
              </span>
            )}
            {targetLine && <span className="text-[10px] text-gray-500">— {targetLine}</span>}
          </div>
          {invite.note && <p className="text-xs text-gray-500 mt-1 italic">{invite.note}</p>}
        </div>
        {status === 'active' && (
          <button onClick={revoke} className="text-rose-500 hover:bg-rose-50 rounded-lg p-1.5" title="إلغاء" data-testid={`my-invite-revoke-${invite.id}`}>
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          onClick={(e) => e.target.select()}
          className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 font-mono"
          dir="ltr"
          data-testid={`my-invite-url-${invite.id}`}
        />
        <button onClick={copy} className="bg-gray-900 hover:bg-black text-white rounded-lg px-3 py-2 text-xs font-bold inline-flex items-center gap-1" data-testid={`my-invite-copy-${invite.id}`}>
          {copied ? <CheckIcon className="w-4 h-4" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
          <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
        </button>
        <button onClick={share} className="bg-pink-500 hover:bg-pink-600 text-white rounded-lg px-3 py-2 text-xs font-bold inline-flex items-center gap-1" data-testid={`my-invite-share-${invite.id}`}>
          <ShareIcon className="w-4 h-4" />
          <span>مشاركة</span>
        </button>
        <button onClick={() => setShowQr(true)} className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg px-3 py-2 text-xs font-bold inline-flex items-center gap-1" data-testid={`my-invite-qr-${invite.id}`} title="QR Code">
          <QrCodeIcon className="w-4 h-4" />
          <span>QR</span>
        </button>
      </div>

      <div className="flex items-center justify-between text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1"><ClockIcon className="w-3.5 h-3.5" /> ينتهي {expiresShort}</span>
        <span className="inline-flex items-center gap-1">
          <UsersIcon className="w-3.5 h-3.5" />
          {invite.used_count || 0}{invite.max_uses ? ` / ${invite.max_uses}` : ''}
        </span>
      </div>

      {showQr && (
        <InviteQrModal
          url={url}
          title="QR لرابط الدعوة"
          subtitle={RELATIONSHIPS[invite.relationship] || invite.relationship}
          onClose={() => setShowQr(false)}
        />
      )}
    </div>
  );
};

/* ---------------- Stat Tile ---------------- */
const StatTile = ({ label, value, gradient, testId }) => (
  <div className={`rounded-xl p-4 text-white shadow-sm ${gradient}`} data-testid={testId}>
    <div className="text-3xl font-extrabold">{value}</div>
    <div className="text-xs mt-1 opacity-90">{label}</div>
  </div>
);

/* ---------------- Main Page ---------------- */
const MyInvitesPage = () => {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchInvites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/family-invites`, auth());
      setInvites(res.data?.invites || []);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'فشل تحميل الدعوات');
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvites(); }, [fetchInvites]);

  const onRevoked = (id) => {
    setInvites((prev) => prev.map((i) => (i.id === id ? { ...i, is_active: false, effective_status: 'revoked' } : i)));
  };

  const stats = useMemo(() => {
    const s = { total: invites.length, active: 0, used_up: 0, expired: 0, revoked: 0, pending_active: 0, accepted_total: 0 };
    for (const inv of invites) {
      const st = inv.effective_status || 'active';
      if (st in s) s[st] += 1;
      s.accepted_total += inv.used_count || 0;
      if (st === 'active' && (inv.used_count || 0) === 0) s.pending_active += 1;
    }
    return s;
  }, [invites]);

  const filteredInvites = useMemo(() => {
    if (filter === 'all') return invites;
    return invites.filter((inv) => (inv.effective_status || 'active') === filter);
  }, [invites, filter]);

  const counts = useMemo(() => ({
    all: invites.length,
    active: stats.active,
    used_up: stats.used_up,
    expired: stats.expired,
    revoked: stats.revoked,
  }), [invites, stats]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen" data-testid="my-invites-page">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 inline-flex items-center gap-2">
              <LinkIcon className="h-7 w-7 text-rose-500" />
              إدارة دعواتي
            </h1>
            <p className="text-sm text-gray-500 mt-1">كل روابط الدعوات اللي بعتيها — مع إحصائيات وإمكانية الإلغاء</p>
          </div>
          <button
            onClick={fetchInvites}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
            data-testid="my-invites-refresh"
          >
            <ArrowPathIcon className="w-4 h-4" />
            تحديث
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
          <StatTile label="إجمالي الدعوات" value={stats.total} gradient="bg-gradient-to-br from-slate-700 to-slate-900" testId="stat-total" />
          <StatTile label="نشطة" value={stats.active} gradient="bg-gradient-to-br from-emerald-500 to-green-600" testId="stat-active" />
          <StatTile label="قُبلت (إجمالي)" value={stats.accepted_total} gradient="bg-gradient-to-br from-blue-500 to-indigo-600" testId="stat-accepted" />
          <StatTile label="بانتظار القبول" value={stats.pending_active} gradient="bg-gradient-to-br from-amber-500 to-orange-600" testId="stat-pending" />
          <StatTile label="ملغية / منتهية" value={stats.revoked + stats.expired} gradient="bg-gradient-to-br from-rose-500 to-pink-600" testId="stat-inactive" />
        </div>
      </div>

      {/* Filter pills */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 flex flex-wrap items-center gap-2" data-testid="my-invites-filters">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                active
                  ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              data-testid={`filter-pill-${f.key}`}
            >
              {f.label}
              <span className={`ml-2 inline-flex items-center justify-center text-[10px] font-bold rounded-full w-5 h-5 ${active ? 'bg-white/25' : 'bg-gray-300 text-gray-700'}`}>
                {counts[f.key] || 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-white rounded-2xl border border-gray-200 animate-pulse" />)}
        </div>
      ) : filteredInvites.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center" data-testid="my-invites-empty">
          <ChartBarIcon className="w-14 h-14 text-gray-300 mx-auto mb-3" />
          <p className="text-base font-medium text-gray-700">لا توجد دعوات في هذا التصنيف</p>
          <p className="text-xs text-gray-500 mt-1">جرّبي تصنيف مختلف، أو اعملي دعوة جديدة من صفحة "إضافة فرد للوحدة"</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInvites.map((inv) => <InviteCard key={inv.id} invite={inv} onRevoke={onRevoked} />)}
        </div>
      )}
    </div>
  );
};

export default MyInvitesPage;
