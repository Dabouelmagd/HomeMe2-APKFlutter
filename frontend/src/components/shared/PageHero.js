import React from 'react';

/**
 * PageHero — الـ header الموحّد لكل صفحة إدارية.
 * - خلفية indigo→purple gradient مع glass-morphism overlay.
 * - يقبل icon (emoji أو lucide) + title + subtitle + actions (زر أو مجموعة أزرار).
 *
 * Usage:
 *   <PageHero
 *     icon="🏘️"
 *     title="إدارة المجمعات السكنية"
 *     subtitle="إدارة جميع المجمعات وتعيين أكواد الاشتراك"
 *     actions={<button>إضافة مجمع</button>}
 *   />
 */
export const PageHero = ({ icon, title, subtitle, actions, accent = 'indigo' }) => {
  const gradients = {
    indigo: 'from-indigo-600 via-purple-600 to-indigo-700',
    emerald: 'from-emerald-600 via-teal-600 to-emerald-700',
    rose: 'from-rose-600 via-pink-600 to-rose-700',
    amber: 'from-amber-500 via-orange-500 to-amber-600',
  };
  const g = gradients[accent] || gradients.indigo;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${g} p-6 sm:p-8 mb-6 shadow-xl`}
      dir="rtl"
      data-testid="page-hero"
    >
      {/* Decorative gradient orbs */}
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-4">
          {icon && (
            <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-3xl sm:text-4xl shadow-lg ring-1 ring-white/20">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-1">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm sm:text-base text-white/80 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="shrink-0 flex flex-wrap gap-2 items-start">{actions}</div>}
      </div>
    </div>
  );
};

export default PageHero;
