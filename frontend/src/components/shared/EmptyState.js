import React from 'react';

/**
 * EmptyState — Unified "nothing here yet" block with consistent visuals.
 *
 * Usage:
 *   <EmptyState icon="🏗️" title="لا توجد مجمعات بعد"
 *               subtitle="ابدأ بإنشاء أول مجمع لإدارته"
 *               cta={<button>+ إضافة</button>} />
 */
const EmptyState = ({
  icon = '📭', title = 'لا توجد بيانات', subtitle, cta, variant = 'dark', className = '', testId,
}) => {
  const isLight = variant === 'light';
  const base = isLight
    ? 'bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl'
    : 'bg-gray-800/30 border-2 border-dashed border-gray-700 rounded-2xl';
  const titleCls = isLight ? 'text-gray-800' : 'text-white';
  const subCls = isLight ? 'text-gray-500' : 'text-gray-400';
  return (
    <div className={`text-center py-12 px-4 ${base} ${className}`} data-testid={testId || 'empty-state'}>
      <div className="text-5xl mb-3 opacity-80">{icon}</div>
      <h3 className={`text-lg font-bold mb-1 ${titleCls}`}>{title}</h3>
      {subtitle && <p className={`text-sm ${subCls} max-w-md mx-auto`}>{subtitle}</p>}
      {cta && <div className="mt-5 flex justify-center">{cta}</div>}
    </div>
  );
};

export default EmptyState;
