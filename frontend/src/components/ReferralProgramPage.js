import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ShareIcon,
  ClipboardDocumentIcon,
  GiftIcon,
  UsersIcon,
  CheckCircleIcon,
  TicketIcon,
} from '@heroicons/react/24/outline';
import PageHeader from './shared/PageHeader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Referral Program page. Renders the user's referral code, progress toward
 * the next free-month coupon (5 invites = 1 month free), and the list of
 * the 10 most recent invitees.
 *
 * Backend lives in routes/referrals.py — this UI is read-only for the user
 * (the only mutating action is "Copy" + share). Code generation happens
 * lazily on first GET request server-side.
 */
const ReferralProgramPage = () => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API}/referral/my-code`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setData(res.data);
      } catch {
        if (!cancelled) toast.error(t('referral_load_failed', 'فشل تحميل برنامج الإحالة'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [t]);

  if (loading || !data) {
    return (
      <div className="p-6 max-w-5xl mx-auto animate-pulse space-y-4">
        <div className="h-24 bg-gray-200 rounded-2xl" />
        <div className="h-40 bg-gray-100 rounded-2xl" />
        <div className="h-60 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  const { code, total_invited, coupons_earned, remaining_for_coupon, invited_users = [] } = data;
  const progress = Math.min(100, ((5 - remaining_for_coupon) / 5) * 100);
  const inviteUrl = `${window.location.origin}/register?ref=${code}`;

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('copied', 'تم النسخ') + ` — ${label}`);
    } catch {
      toast.error(t('copy_failed', 'فشل النسخ'));
    }
  };

  const share = async () => {
    const text = t('referral_share_text', 'انضمي إلى HomeMe! استخدمي كود الإحالة الخاص بي');
    if (navigator.share) {
      try {
        await navigator.share({ title: 'HomeMe', text: `${text}: ${code}`, url: inviteUrl });
      } catch { /* user cancelled */ }
    } else {
      copy(`${text} ${inviteUrl}`, 'الرابط');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto" data-testid="referral-program-page">
      <PageHeader
        theme="pink"
        icon={GiftIcon}
        badge={t('referral_badge', 'برنامج إحالة')}
        title={t('referral_title', 'ادعي أصدقاءك واكسبي مكافآت')}
        subtitle={t('referral_subtitle', 'كل 5 أشخاص يسجلون عبر رابطك → شهر مجاني تلقائي على اشتراكك. لا حد لعدد الشهور.')}
      />

      {/* Stats triple */}
      <div className="grid grid-cols-3 gap-3 mt-6">
        <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-4 shadow-md">
          <UsersIcon className="h-6 w-6 mb-2 opacity-80" />
          <div className="text-3xl font-black">{total_invited}</div>
          <div className="text-xs text-white/80 mt-0.5">{t('total_invites', 'إحالات ناجحة')}</div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-4 shadow-md">
          <TicketIcon className="h-6 w-6 mb-2 opacity-80" />
          <div className="text-3xl font-black">{coupons_earned}</div>
          <div className="text-xs text-white/80 mt-0.5">{t('coupons_earned', 'كوبونات مكتسبة')}</div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white p-4 shadow-md">
          <GiftIcon className="h-6 w-6 mb-2 opacity-80" />
          <div className="text-3xl font-black">{remaining_for_coupon}</div>
          <div className="text-xs text-white/80 mt-0.5">{t('remaining_for_coupon', 'متبقي لكوبون جديد')}</div>
        </div>
      </div>

      {/* Code card */}
      <div className="mt-6 rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white p-6 shadow-2xl" data-testid="referral-code-card">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold opacity-90">{t('your_referral_code', 'كود الإحالة الخاص بك')}</div>
          <ShareIcon className="h-5 w-5 opacity-70" />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-white/15 backdrop-blur rounded-2xl px-4 py-3 font-mono text-2xl font-black tracking-wider" data-testid="referral-code-value">
            {code}
          </div>
          <button
            onClick={() => copy(code, t('code', 'الكود'))}
            className="px-4 py-3 bg-white text-violet-700 rounded-2xl font-bold hover:scale-105 transition-transform flex items-center gap-1.5"
            data-testid="referral-copy-code"
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
            {t('copy', 'نسخ')}
          </button>
        </div>

        <div className="mt-4">
          <div className="text-xs opacity-90 mb-1.5 flex items-center justify-between">
            <span>{t('referral_progress', 'تقدم نحو الكوبون التالي')}</span>
            <span className="font-bold">{5 - remaining_for_coupon}/5</span>
          </div>
          <div className="h-2 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-300 to-amber-300 transition-all duration-700"
              style={{ width: `${progress}%` }}
              data-testid="referral-progress-bar"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => copy(inviteUrl, t('invite_link', 'رابط الدعوة'))}
            className="flex-1 px-4 py-2.5 bg-white/15 hover:bg-white/25 rounded-xl text-sm font-bold transition flex items-center justify-center gap-1.5"
            data-testid="referral-copy-link"
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
            {t('copy_invite_link', 'نسخ رابط الدعوة')}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${t('referral_share_text', 'انضمي إلى HomeMe — منصة إدارة المجمعات السكنية الرائدة')} 🏘️\n\n${t('referral_whatsapp_perk', 'احصلي على خصم 15% على أول اشتراك عبر رابطي:')}\n${inviteUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-4 py-2.5 bg-[#25D366] hover:bg-[#1ebe57] text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-1.5"
            data-testid="referral-whatsapp-btn"
            title={t('share_on_whatsapp', 'مشاركة على واتساب')}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
            {t('whatsapp', 'واتساب')}
          </a>
          <button
            onClick={share}
            className="flex-1 px-4 py-2.5 bg-white text-violet-700 rounded-xl text-sm font-bold hover:scale-[1.02] transition-transform flex items-center justify-center gap-1.5"
            data-testid="referral-share-btn"
          >
            <ShareIcon className="h-4 w-4" />
            {t('share', 'مشاركة')}
          </button>
        </div>
      </div>

      {/* How it works */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-3">{t('how_it_works', 'كيف يعمل؟')}</h3>
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          {[
            { num: '1', t: t('how_step_1', 'انسخي رابط الدعوة أو الكود'), e: '📋' },
            { num: '2', t: t('how_step_2', 'شاركيه مع أصدقائك أو على وسائل التواصل'), e: '📣' },
            { num: '3', t: t('how_step_3', 'عند تسجيل 5 منهم → شهر مجاني فوراً'), e: '🎁' },
          ].map((s) => (
            <div key={s.num} className="rounded-xl bg-gray-50 border border-gray-100 p-3 flex items-start gap-3">
              <div className="text-2xl">{s.e}</div>
              <div className="flex-1">
                <div className="font-bold text-violet-700">{t('step', 'خطوة')} {s.num}</div>
                <div className="text-xs text-gray-600 mt-0.5">{s.t}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invitees list */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm" data-testid="referral-invitees-section">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900">{t('your_invitees', 'الأشخاص الذين سجلوا برابطك')}</h3>
          {invited_users.length > 0 && (
            <span className="text-xs text-gray-500">{invited_users.length} {t('shown_latest', 'الأحدث')}</span>
          )}
        </div>
        {invited_users.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">
            <UsersIcon className="h-10 w-10 mx-auto text-gray-300 mb-2" />
            {t('no_invitees_yet', 'لا توجد إحالات بعد — ابدئي بمشاركة رابطك!')}
          </div>
        ) : (
          <div className="space-y-2">
            {invited_users.map((u, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-violet-50 transition" data-testid={`referral-invitee-${i}`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 text-white flex items-center justify-center text-xs font-black">
                    {(u.full_name || u.username || '?').charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-800">{u.full_name || u.username}</div>
                    <div className="text-[10px] text-gray-400">
                      {u.joined_at ? new Date(u.joined_at).toLocaleDateString('ar-EG') : ''}
                    </div>
                  </div>
                </div>
                <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralProgramPage;
