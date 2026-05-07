import { useEffect, useState } from 'react';

const STORAGE_KEY = 'app_changelog_pending';

/**
 * ChangelogModal — shown once after a successful auto-update reload.
 *
 * Trigger: AppVersionGuard writes the changelog array to localStorage under
 * `app_changelog_pending` right before hard-reloading. On the next mount,
 * this component picks it up, displays a friendly modal, then clears the key.
 *
 * The modal is read-only — no API calls — so it's safe to mount at app root.
 */
const ChangelogModal = () => {
  const [items, setItems] = useState(null);
  const [lang, setLang] = useState('ar');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      // Read-once pattern: clear immediately so that any re-mount
      // (route change, tab focus, React StrictMode double-mount, etc.)
      // doesn't re-trigger the modal. The user's "close" button click
      // will simply hide the React state.
      localStorage.removeItem(STORAGE_KEY);
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setItems(parsed.slice(0, 6));
        // Detect language: prefer i18next, fallback to <html lang>.
        const i18nLang = (localStorage.getItem('i18nextLng') || '').slice(0, 2).toLowerCase();
        const htmlLang = (document.documentElement.lang || '').slice(0, 2).toLowerCase();
        const detected = ['ar', 'en', 'fr'].includes(i18nLang)
          ? i18nLang
          : (['ar', 'en', 'fr'].includes(htmlLang) ? htmlLang : 'ar');
        setLang(detected);
      }
    } catch { /* malformed payload — ignore */ }
  }, []);

  const close = () => {
    // Already cleared on read; just hide the modal.
    setItems(null);
  };

  if (!items) return null;

  const isRTL = lang === 'ar';
  const HEADINGS = {
    ar: { title: 'تم تحديث التطبيق بنجاح', subtitle: 'إيه الجديد في الإصدار ده؟', cta: 'يلا نبدأ 🎉' },
    en: { title: 'App updated successfully', subtitle: "What's new in this version?", cta: "Let's go 🎉" },
    fr: { title: 'Application mise à jour avec succès', subtitle: 'Quoi de neuf dans cette version ?', cta: 'C\'est parti 🎉' },
  };
  const H = HEADINGS[lang] || HEADINGS.ar;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      data-testid="changelog-modal"
      dir={isRTL ? 'rtl' : 'ltr'}
      onClick={close}
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — purple gradient to match the update banner */}
        <div className="px-6 pt-6 pb-5 text-white bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 relative">
          <div
            className="absolute inset-0 opacity-25 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.5), transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.3), transparent 50%)',
            }}
          />
          <div className="relative flex items-start gap-3">
            <div className="text-3xl shrink-0" aria-hidden>✨</div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-extrabold">{H.title}</h2>
              <p className="text-xs md:text-sm text-violet-100 mt-0.5">{H.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={close}
              className="shrink-0 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 transition flex items-center justify-center"
              aria-label="إغلاق"
              data-testid="changelog-close-x"
            >
              <span className="text-lg">×</span>
            </button>
          </div>
        </div>

        {/* Body — bullet list */}
        <ul className="px-6 py-5 space-y-3 max-h-[55vh] overflow-y-auto" data-testid="changelog-list">
          {items.map((it, i) => {
            const text = it?.[lang] || it?.ar || it?.en || '';
            if (!text) return null;
            return (
              <li key={i} className="flex items-start gap-3" data-testid={`changelog-item-${i}`}>
                <span className="shrink-0 mt-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[11px] font-bold">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">{text}</span>
              </li>
            );
          })}
        </ul>

        {/* Footer */}
        <div className="px-6 pb-5">
          <button
            type="button"
            onClick={close}
            className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 transition shadow-lg"
            data-testid="changelog-close-btn"
          >
            {H.cta}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangelogModal;
