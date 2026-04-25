import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  PlusIcon,
  KeyIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  XMarkIcon,
  ShareIcon,
  TrashIcon,
  ClockIcon,
  UsersIcon,
  UserPlusIcon,
  QrCodeIcon,
} from '@heroicons/react/24/outline';
import QrCodeModal from '../shared/QrCodeModal';
import InviteStatsCard from '../shared/InviteStatsCard';

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

const buildJoinUrl = (relPath) => {
  if (!relPath) return '';
  if (/^https?:/i.test(relPath)) return relPath;
  return `${window.location.origin}${relPath}`;
};

/* ---------------- Create Family Invite Modal ---------------- */
const CreateFamilyInviteModal = ({ onClose, onCreated }) => {
  const [relationship, setRelationship] = useState('spouse');
  const [validity, setValidity] = useState(14);
  const [maxUses, setMaxUses] = useState(1);
  const [inviteeName, setInviteeName] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await axios.post(`${API}/family-invites`, {
        relationship,
        validity_days: Number(validity) || 14,
        max_uses: Number(maxUses) || 1,
        invitee_name: inviteeName.trim() || null,
        note: note.trim() || null,
      }, auth());
      toast.success('تم إنشاء رابط الدعوة');
      onCreated(res.data?.invite);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'فشل إنشاء الرابط');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
        data-testid="create-family-invite-modal"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">دعوة فرد للأسرة</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">سينضم الشخص تحت نفس الوحدة والمجمع تلقائياً.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" data-testid="close-create-family-invite">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">صلة القرابة</label>
          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
            data-testid="family-invite-relationship"
          >
            {Object.entries(RELATIONSHIPS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">اسم الشخص المدعو (اختياري)</label>
          <input
            type="text"
            placeholder="مثال: أحمد محمد"
            value={inviteeName}
            onChange={(e) => setInviteeName(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
            data-testid="family-invite-name"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">صلاحية (أيام)</label>
            <input
              type="number" min={1} max={90}
              value={validity}
              onChange={(e) => setValidity(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
              data-testid="family-invite-validity"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">عدد الاستخدامات</label>
            <input
              type="number" min={1} max={20}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
              data-testid="family-invite-maxuses"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">ملاحظة (اختياري)</label>
          <input
            type="text"
            placeholder="رسالة قصيرة"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
            data-testid="family-invite-note"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={submit}
            disabled={busy}
            data-testid="family-invite-submit"
            className="flex-1 bg-pink-500 hover:bg-pink-600 text-white rounded-lg px-4 py-2.5 font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {busy && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            <span>إنشاء الرابط</span>
          </button>
          <button onClick={onClose} className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------------- One Family Invite Card ---------------- */
const FamilyInviteCard = ({ invite, onRevoke }) => {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const url = buildJoinUrl(invite.join_url);
  const status = invite.effective_status || 'active';
  const badge = STATUS_BADGE[status] || STATUS_BADGE.active;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('تم نسخ الرابط');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('فشل النسخ');
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'دعوة للانضمام للأسرة على HomeMe',
          text: `مرحباً! تمت دعوتك للانضمام لأسرتي على HomeMe.`,
          url,
        });
      } catch { /* user cancelled */ }
    } else {
      copy();
    }
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

  const expiresShort = invite.expires_at ? new Date(invite.expires_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3" data-testid={`family-invite-card-${invite.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 dark:text-white text-sm">
              {RELATIONSHIPS[invite.relationship] || invite.relationship}
            </span>
            <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.txt}</span>
            {invite.invitee_name_hint && (
              <span className="text-[10px] text-gray-500 dark:text-gray-400">— {invite.invitee_name_hint}</span>
            )}
          </div>
          {invite.note && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">{invite.note}</p>}
        </div>
        {status === 'active' && (
          <button onClick={revoke} className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg p-1.5" title="إلغاء" data-testid={`family-invite-revoke-${invite.id}`}>
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          onClick={(e) => e.target.select()}
          className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-700 dark:text-gray-200 font-mono"
          dir="ltr"
          data-testid={`family-invite-url-${invite.id}`}
        />
        <button
          onClick={copy}
          className="bg-gray-900 hover:bg-black text-white rounded-lg px-3 py-2 text-xs font-bold inline-flex items-center gap-1"
          data-testid={`family-invite-copy-${invite.id}`}
        >
          {copied ? <CheckIcon className="w-4 h-4" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
          <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
        </button>
        <button
          onClick={share}
          className="bg-pink-500 hover:bg-pink-600 text-white rounded-lg px-3 py-2 text-xs font-bold inline-flex items-center gap-1"
          data-testid={`family-invite-share-${invite.id}`}
        >
          <ShareIcon className="w-4 h-4" />
          <span>مشاركة</span>
        </button>
        <button
          onClick={() => setShowQr(true)}
          className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg px-3 py-2 text-xs font-bold inline-flex items-center gap-1"
          data-testid={`family-invite-qr-${invite.id}`}
          title="QR Code"
        >
          <QrCodeIcon className="w-4 h-4" />
          <span>QR</span>
        </button>
      </div>

      <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-1"><ClockIcon className="w-3.5 h-3.5" /> ينتهي {expiresShort}</span>
        <span className="inline-flex items-center gap-1">
          <UsersIcon className="w-3.5 h-3.5" />
          {invite.used_count || 0}{invite.max_uses ? ` / ${invite.max_uses}` : ''}
        </span>
      </div>

      {showQr && (
        <QrCodeModal
          url={url}
          title="QR لدعوة الأسرة"
          subtitle={RELATIONSHIPS[invite.relationship] || invite.relationship}
          onClose={() => setShowQr(false)}
        />
      )}
    </div>
  );
};

/* ---------------- Main Family Invites Panel ---------------- */
const FamilyInvitesPanel = () => {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);

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

  const onCreated = (newInvite) => {
    if (newInvite) setInvites((prev) => [{ ...newInvite, effective_status: 'active' }, ...prev]);
    setOpenCreate(false);
    fetchInvites();
    window.dispatchEvent(new CustomEvent('inviteStatsRefresh'));
  };

  const onRevoked = (id) => {
    setInvites((prev) => prev.map((i) => i.id === id ? { ...i, is_active: false, effective_status: 'revoked' } : i));
    window.dispatchEvent(new CustomEvent('inviteStatsRefresh'));
  };

  return (
    <div className="space-y-4" data-testid="family-invites-panel">
      <InviteStatsCard />
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white inline-flex items-center gap-2">
            <UserPlusIcon className="w-5 h-5 text-pink-500" />
            <span>دعوة أفراد الأسرة</span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">أرسل رابط لكل فرد لينضم تحت وحدتك تلقائياً</p>
        </div>
        <button
          onClick={() => setOpenCreate(true)}
          data-testid="create-family-invite-btn"
          className="bg-pink-500 hover:bg-pink-600 text-white rounded-lg px-3 py-2 text-sm font-bold inline-flex items-center gap-2 shadow-md shadow-pink-500/25"
        >
          <PlusIcon className="w-4 h-4" />
          <span>دعوة جديدة</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : invites.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center" data-testid="family-invites-empty">
          <KeyIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">لا توجد دعوات بعد</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">أنشئ رابط دعوة لأول فرد في أسرتك</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invites.map((inv) => <FamilyInviteCard key={inv.id} invite={inv} onRevoke={onRevoked} />)}
        </div>
      )}

      {openCreate && (
        <CreateFamilyInviteModal
          onClose={() => setOpenCreate(false)}
          onCreated={onCreated}
        />
      )}
    </div>
  );
};

export default FamilyInvitesPanel;
