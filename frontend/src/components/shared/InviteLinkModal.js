import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getToken = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

/**
 * InviteLinkModal — manages compound self-registration invite links.
 * Props:
 *   compound: { id, name }
 *   onClose: () => void
 */
const InviteLinkModal = ({ compound, onClose }) => {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ role: 'resident', validity_days: 30, max_uses: '', note: '' });
  const [refreshKey, setRefreshKey] = useState(0);

  const baseUrl = window.location.origin;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    axios.get(`${API}/compound-invites?compound_id=${compound.id}`, getToken())
      .then(res => { if (alive) setInvites(res.data.invites || []); })
      .catch(err => { if (alive) toast.error(err.response?.data?.detail || 'فشل التحميل'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [compound.id, refreshKey]);

  const create = async () => {
    setCreating(true);
    try {
      const body = {
        compound_id: compound.id,
        role: form.role,
        validity_days: parseInt(form.validity_days) || 30,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        note: form.note,
      };
      await axios.post(`${API}/compound-invites`, body, getToken());
      toast.success('تم إنشاء رابط الدعوة');
      setForm({ role: 'resident', validity_days: 30, max_uses: '', note: '' });
      setRefreshKey(k => k + 1);
    } catch (err) { toast.error(err.response?.data?.detail || 'فشل الإنشاء'); }
    finally { setCreating(false); }
  };

  const revoke = async (inv) => {
    if (!window.confirm('إلغاء هذا الرابط نهائيًا؟')) return;
    try {
      await axios.delete(`${API}/compound-invites/${inv.id}`, getToken());
      toast.success('تم الإلغاء');
      setRefreshKey(k => k + 1);
    } catch (err) { toast.error(err.response?.data?.detail || 'فشل'); }
  };

  const copyLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('تم النسخ ✓');
    } catch { toast.error('تعذّر النسخ'); }
  };

  const shareWhatsApp = (url, roleLabel) => {
    const msg = encodeURIComponent(`دعوة للانضمام إلى ${compound.name} كـ ${roleLabel} — ${url}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const roleLabels = {
    resident: '🏠 ساكن', family_head: '👨‍👩‍👧 رب أسرة',
    manager: '👔 إداري', security: '🛡 أمن',
  };
  const statusColors = {
    active: 'emerald', expired: 'red', used_up: 'amber', revoked: 'gray',
  };
  const statusLabels = {
    active: '✅ نشط', expired: '⏱ منتهي', used_up: '📛 استُخدم كلياً', revoked: '🚫 ملغى',
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl w-full max-w-2xl p-6 space-y-4 border border-indigo-500/30 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="invite-modal">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-white">🔗 روابط دعوة الانضمام</h3>
            <p className="text-[11px] text-gray-400 mt-1">{compound.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        {/* Create form */}
        <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-4 space-y-3">
          <div className="text-[11px] text-gray-400 uppercase tracking-wider">➕ إنشاء رابط جديد</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">الدور</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white"
                data-testid="invite-role">
                <option value="resident">🏠 ساكن</option>
                <option value="family_head">👨‍👩‍👧 رب أسرة</option>
                <option value="manager">👔 إداري</option>
                <option value="security">🛡 أمن</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">مدة الصلاحية (أيام)</label>
              <input type="number" min="1" max="365" value={form.validity_days} onChange={e => setForm({...form, validity_days: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white"
                data-testid="invite-validity" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">حد الاستخدام (اختياري)</label>
              <input type="number" min="1" placeholder="∞" value={form.max_uses} onChange={e => setForm({...form, max_uses: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white"
                data-testid="invite-max-uses" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">ملاحظة (اختيارية)</label>
              <input value={form.note} onChange={e => setForm({...form, note: e.target.value})} placeholder="مثلاً: سكان مبنى A"
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white" />
            </div>
          </div>
          <button onClick={create} disabled={creating}
            className="w-full px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-xs font-bold disabled:opacity-50"
            data-testid="invite-create-btn">
            {creating ? '⏳' : '🔗 إنشاء الرابط'}
          </button>
        </div>

        {/* Existing invites list */}
        <div className="space-y-2">
          <div className="text-[11px] text-gray-400 uppercase tracking-wider">📋 الروابط الموجودة ({invites.length})</div>
          {loading ? <div className="text-center text-gray-500 py-6 text-sm">جاري التحميل...</div>
            : invites.length === 0 ? <div className="text-center text-gray-500 py-6 text-sm bg-gray-900/40 rounded-lg border border-dashed border-gray-700">لا توجد روابط بعد</div>
            : invites.map(inv => {
              const fullUrl = `${baseUrl}${inv.join_url}`;
              const color = statusColors[inv.effective_status] || 'gray';
              const isUsable = inv.effective_status === 'active';
              return (
                <div key={inv.id} className="bg-gray-900/60 border border-gray-700 rounded-lg p-3 space-y-2" data-testid={`invite-row-${inv.id}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full bg-${color}-900/40 text-${color}-300 border border-${color}-700/40`}>{statusLabels[inv.effective_status]}</span>
                      <span className="text-[10px] text-emerald-300">{roleLabels[inv.role] || inv.role}</span>
                      <span className="text-[10px] text-gray-500">
                        {inv.used_count || 0}/{inv.max_uses ?? '∞'} استخدام
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {isUsable && (
                        <>
                          <button onClick={() => copyLink(fullUrl)} title="نسخ" className="px-2 py-1 text-[10px] bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 rounded" data-testid={`invite-copy-${inv.id}`}>📋</button>
                          <button onClick={() => shareWhatsApp(fullUrl, roleLabels[inv.role])} title="واتساب" className="px-2 py-1 text-[10px] bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 rounded" data-testid={`invite-wa-${inv.id}`}>📱</button>
                        </>
                      )}
                      {inv.is_active && (
                        <button onClick={() => revoke(inv)} title="إلغاء" className="px-2 py-1 text-[10px] bg-red-600/30 hover:bg-red-600/50 text-red-200 rounded" data-testid={`invite-revoke-${inv.id}`}>🚫</button>
                      )}
                    </div>
                  </div>
                  <div className="bg-black/40 border border-gray-800 rounded px-2 py-1 text-[10px] text-indigo-300 font-mono truncate" title={fullUrl}>
                    {fullUrl}
                  </div>
                  {inv.note && <div className="text-[10px] text-gray-500 italic">💬 {inv.note}</div>}
                  {inv.expires_at && <div className="text-[10px] text-gray-500">⏱ حتى: {new Date(inv.expires_at).toLocaleDateString('ar-EG')}</div>}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default InviteLinkModal;
