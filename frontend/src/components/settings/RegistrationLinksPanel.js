import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../App';
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
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const ROLE_LABELS = {
  resident: 'مقيم',
  family_head: 'رب أسرة',
  manager: 'مدير',
  security: 'أمن',
};

const STATUS_BADGE = {
  active: { txt: 'نشط', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  expired: { txt: 'منتهي', cls: 'bg-gray-100 text-gray-700 border-gray-200' },
  used_up: { txt: 'مستخدم بالكامل', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  revoked: { txt: 'ملغي', cls: 'bg-rose-100 text-rose-800 border-rose-200' },
};

const buildJoinUrl = (relPath) => {
  // Backend returns "/join/{token}". Convert to absolute URL using current origin.
  if (!relPath) return '';
  if (/^https?:/i.test(relPath)) return relPath;
  return `${window.location.origin}${relPath}`;
};

/* ---------------- Create Link Modal ---------------- */
const CreateLinkModal = ({ compoundId, compoundOptions, onClose, onCreated }) => {
  const [role, setRole] = useState('resident');
  const [validity, setValidity] = useState(30);
  const [maxUses, setMaxUses] = useState('');
  const [note, setNote] = useState('');
  const [selectedCpd, setSelectedCpd] = useState(compoundId || (compoundOptions?.[0]?.id ?? ''));
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!selectedCpd) {
      toast.error('اختر مجمعاً أولاً');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        compound_id: selectedCpd,
        role,
        validity_days: Number(validity) || 30,
        max_uses: maxUses ? Number(maxUses) : null,
        note: note.trim() || null,
      };
      const res = await axios.post(`${API}/compound-invites`, payload, auth());
      toast.success('تم إنشاء الرابط');
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
        data-testid="create-invite-modal"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">إنشاء رابط دعوة</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">سيستطيع من يفتح الرابط التسجيل في المجمع المحدد.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" data-testid="close-create-modal">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Compound selector (only when caller passes options, e.g. for company/super admin) */}
        {compoundOptions && compoundOptions.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">المجمع</label>
            <select
              value={selectedCpd}
              onChange={(e) => setSelectedCpd(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
              data-testid="invite-compound-select"
            >
              {compoundOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">الدور</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
            data-testid="invite-role-select"
          >
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">صلاحية (أيام)</label>
            <input
              type="number" min={1} max={365}
              value={validity}
              onChange={(e) => setValidity(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
              data-testid="invite-validity-input"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">حد الاستخدام (اختياري)</label>
            <input
              type="number" min={1}
              placeholder="غير محدود"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
              data-testid="invite-maxuses-input"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">ملاحظة (اختياري)</label>
          <input
            type="text"
            placeholder="مثال: دفعة سكان أبراج 2026"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
            data-testid="invite-note-input"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={submit}
            disabled={busy}
            data-testid="invite-create-submit"
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

/* ---------------- One Invite Card ---------------- */
const InviteCard = ({ invite, onRevoke }) => {
  const [copied, setCopied] = useState(false);
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
        await navigator.share({ title: 'دعوة الانضمام لـ HomeMe', text: `مرحبا! انضم إلى ${invite.compound_name || 'المجمع'} عبر هذا الرابط.`, url });
      } catch { /* user cancelled */ }
    } else {
      copy();
    }
  };

  const revoke = async () => {
    if (!window.confirm('هل أنت متأكد من إلغاء هذا الرابط؟ لن يستطيع أحد استخدامه بعد ذلك.')) return;
    try {
      await axios.delete(`${API}/compound-invites/${invite.id}`, auth());
      toast.success('تم إلغاء الرابط');
      onRevoke(invite.id);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'فشل الإلغاء');
    }
  };

  const expiresShort = invite.expires_at ? new Date(invite.expires_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3" data-testid={`invite-card-${invite.id}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 dark:text-white text-sm">
              {ROLE_LABELS[invite.role] || invite.role}
            </span>
            <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.txt}</span>
          </div>
          {invite.note && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{invite.note}</p>}
        </div>
        {status === 'active' && (
          <button onClick={revoke} className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg p-1.5" title="إلغاء" data-testid={`invite-revoke-${invite.id}`}>
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* URL row */}
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          onClick={(e) => e.target.select()}
          className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-700 dark:text-gray-200 font-mono ltr:text-left rtl:text-left"
          dir="ltr"
          data-testid={`invite-url-${invite.id}`}
        />
        <button
          onClick={copy}
          className="bg-gray-900 hover:bg-black text-white rounded-lg px-3 py-2 text-xs font-bold inline-flex items-center gap-1"
          data-testid={`invite-copy-${invite.id}`}
        >
          {copied ? <CheckIcon className="w-4 h-4" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
          <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
        </button>
        <button
          onClick={share}
          className="bg-pink-500 hover:bg-pink-600 text-white rounded-lg px-3 py-2 text-xs font-bold inline-flex items-center gap-1"
          data-testid={`invite-share-${invite.id}`}
        >
          <ShareIcon className="w-4 h-4" />
          <span>مشاركة</span>
        </button>
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-1"><ClockIcon className="w-3.5 h-3.5" /> ينتهي {expiresShort}</span>
        <span className="inline-flex items-center gap-1">
          <UsersIcon className="w-3.5 h-3.5" />
          {invite.used_count || 0}{invite.max_uses ? ` / ${invite.max_uses}` : ''} مستخدم
        </span>
      </div>
    </div>
  );
};

/* ---------------- Main RegistrationLinks panel ---------------- */
const RegistrationLinksPanel = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const role = user?.active_role || user?.role;
  const compoundId = user?.compound_id;

  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [compoundOptions, setCompoundOptions] = useState(null);

  const isCompoundScope = role === 'admin' || role === 'manager';
  const isWideScope = role === 'app_owner' || role === 'super_admin' || role === 'company_admin';

  const fetchInvites = useCallback(async () => {
    setLoading(true);
    try {
      const params = isCompoundScope && compoundId ? { compound_id: compoundId } : {};
      const res = await axios.get(`${API}/compound-invites`, { ...auth(), params });
      setInvites(res.data?.invites || []);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'فشل تحميل الروابط');
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }, [isCompoundScope, compoundId]);

  // For wide-scope roles, preload compound options for the create modal
  const fetchCompoundOptions = useCallback(async () => {
    if (!isWideScope) return;
    try {
      const res = await axios.get(`${API}/compounds`, auth());
      const list = (res.data || []).map((c) => ({ id: c.id, name: c.name }));
      setCompoundOptions(list);
    } catch {
      setCompoundOptions([]);
    }
  }, [isWideScope]);

  useEffect(() => {
    fetchInvites();
    fetchCompoundOptions();
  }, [fetchInvites, fetchCompoundOptions]);

  const onCreated = (newInvite) => {
    if (newInvite) setInvites((prev) => [{ ...newInvite, effective_status: 'active' }, ...prev]);
    setOpenCreate(false);
    // background re-fetch to be safe
    fetchInvites();
  };

  const onRevoked = (id) => {
    setInvites((prev) => prev.map((i) => i.id === id ? { ...i, is_active: false, effective_status: 'revoked' } : i));
  };

  return (
    <div className="space-y-6">
      {/* Create button */}
      <button
        onClick={() => setOpenCreate(true)}
        data-testid="create-invite-btn"
        className="w-full flex items-center justify-center gap-3 p-4 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-pink-500/25"
      >
        <PlusIcon className="w-5 h-5" />
        <span>{t('create_new_link', 'إنشاء رابط جديد')}</span>
      </button>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : invites.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center" data-testid="invites-empty-state">
          <KeyIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-2">{t('no_links', 'لا توجد روابط تسجيل')}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">{t('create_link_desc', 'أنشئ رابطاً لدعوة سكان جدد')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invites.map((inv) => <InviteCard key={inv.id} invite={inv} onRevoke={onRevoked} />)}
        </div>
      )}

      {openCreate && (
        <CreateLinkModal
          compoundId={isCompoundScope ? compoundId : null}
          compoundOptions={isWideScope ? compoundOptions : null}
          onClose={() => setOpenCreate(false)}
          onCreated={onCreated}
        />
      )}
    </div>
  );
};

export default RegistrationLinksPanel;
