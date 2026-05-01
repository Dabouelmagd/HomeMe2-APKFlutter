import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import PageHeader from '../components/shared/PageHeader';
import StatCard from '../components/shared/StatCard';
import SectionCard from '../components/shared/SectionCard';
import EmptyState from '../components/shared/EmptyState';

/**
 * DesignSystemPage — Living style guide for the HomeMe unified UI.
 *
 * Shows every shared component (PageHeader, StatCard, SectionCard, EmptyState)
 * in every theme/color so developers can pick the right one at a glance.
 *
 * Access: any authenticated user. Route: /app/design-system.
 */
const THEMES = ['indigo', 'rose', 'emerald', 'blue', 'amber', 'slate'];
const ROLE_MAP = {
  indigo:  'company_admin / admin',
  rose:    'app_owner',
  emerald: 'compound / finance',
  blue:    'resident / security',
  amber:   'alerts / incidents',
  slate:   'super_admin / system',
};

const STAT_COLORS = ['indigo', 'rose', 'emerald', 'amber', 'blue', 'purple', 'pink', 'slate', 'red'];

const CodeBlock = ({ code }) => (
  <pre className="bg-gray-900 text-gray-200 rounded-lg p-3 text-[11px] overflow-x-auto leading-relaxed" dir="ltr">
    <code>{code}</code>
  </pre>
);

const Tag = ({ children, color = 'indigo' }) => {
  // Static map so Tailwind JIT picks up classes at build time
  const colorMap = {
    indigo:  'bg-indigo-100 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    blue:    'bg-blue-100 text-blue-700 border-blue-200',
    amber:   'bg-amber-100 text-amber-700 border-amber-200',
    rose:    'bg-rose-100 text-rose-700 border-rose-200',
  };
  return (
    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ml-1 ${colorMap[color] || colorMap.indigo}`}>
      {children}
    </span>
  );
};

const DesignSystemPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');

  // Gate: only app_owner / super_admin see the living style-guide in production
  const role = user?.role;
  const canView = ['app_owner', 'super_admin'].includes(role);
  if (!canView) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-indigo-950 p-6" dir="rtl">
        <div className="text-center bg-gray-800/70 backdrop-blur border border-gray-700 rounded-2xl p-8 max-w-md" data-testid="ds-forbidden">
          <div className="text-5xl mb-3">🔒</div>
          <h1 className="text-xl font-extrabold text-white mb-2">الصفحة مخصصة للفريق الداخلي</h1>
          <p className="text-sm text-gray-400 mb-5">دليل المكونات متاح لمالك التطبيق والمدير الأعلى فقط.</p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg font-bold" data-testid="ds-forbidden-back">
            ← رجوع
          </button>
        </div>
      </div>
    );
  }

  const sections = [
    { id: 'overview',   label: '🏠 نظرة عامة' },
    { id: 'headers',    label: '📐 PageHeaders' },
    { id: 'stats',      label: '📊 StatCards' },
    { id: 'sections',   label: '📦 SectionCards' },
    { id: 'empty',      label: '📭 EmptyStates' },
    { id: 'tokens',     label: '🎨 Tokens' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-indigo-950 p-6" dir="rtl" data-testid="design-system-page">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero */}
        <PageHeader
          theme="indigo"
          iconEmoji="🎨"
          badge="Design System — HomeMe"
          title="دليل المكونات الموحدة"
          subtitle="living style-guide لكل المكونات المشتركة في المنصة"
          actions={
            <button
              onClick={() => navigate(-1)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg"
              data-testid="ds-back-btn"
            >
              ← رجوع
            </button>
          }
          testId="ds-page-header"
        />

        {/* Nav chips */}
        <div className="bg-gray-800/60 rounded-2xl p-3 flex flex-wrap gap-2 sticky top-4 z-10 backdrop-blur border border-gray-700/60">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setActiveSection(s.id);
                document.getElementById(`ds-sec-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              data-testid={`ds-nav-${s.id}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeSection === s.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/70'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        <div id="ds-sec-overview">
          <SectionCard
            title="🏠 نظرة عامة"
            subtitle="كيف تستخدم هذا الدليل"
            variant="light"
            testId="ds-overview-card"
          >
            <div className="prose prose-sm max-w-none text-gray-700 space-y-3" dir="rtl">
              <p>
                هذه الصفحة تعرض كل المكونات المشتركة (PageHeader, StatCard, SectionCard, EmptyState) بكل ألوانها
                وثيماتها المتاحة. اختر المكون المناسب لدورك (مثلاً <code>company_admin</code> → ثيم <code>indigo</code>).
              </p>
              <p className="text-xs text-gray-500">
                📄 القواعد الكاملة للنظام: <code>/app/design_guidelines.md</code>
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                {THEMES.map((th) => (
                  <div key={th} className="text-xs p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                    <code className="font-bold text-indigo-700">{th}</code>
                    <div className="text-[10px] text-gray-500 mt-0.5">{ROLE_MAP[th]}</div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>

        {/* PageHeaders preview */}
        <div id="ds-sec-headers" className="space-y-4">
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            📐 PageHeader
            <Tag color="indigo">6 themes</Tag>
          </h2>
          {THEMES.map((th) => (
            <div key={th} data-testid={`ds-header-${th}`}>
              <div className="text-xs text-gray-400 mb-1 font-mono">theme="{th}" — {ROLE_MAP[th]}</div>
              <PageHeader
                theme={th}
                iconEmoji="🏢"
                badge={`${th.toUpperCase()} THEME`}
                title="عنوان الصفحة"
                subtitle="وصف قصير للصفحة أو الدور"
                meta={
                  <>
                    <span>📧 contact@example.com</span>
                    <span>📱 +20 100 123 4567</span>
                  </>
                }
                actions={
                  <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg">
                    + إجراء
                  </button>
                }
              />
            </div>
          ))}
          <CodeBlock
            code={`<PageHeader\n  theme="indigo"\n  iconEmoji="🏢"\n  badge="Co./Admin"\n  title={company.name}\n  subtitle="وصف"\n  meta={<><span>📧 …</span><span>📱 …</span></>}\n  actions={<button>+ جديد</button>}\n/>`}
          />
        </div>

        {/* StatCards preview */}
        <div id="ds-sec-stats" className="space-y-4">
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            📊 StatCard
            <Tag color="emerald">9 colors × 2 variants</Tag>
          </h2>

          {/* Dark variant */}
          <div>
            <div className="text-xs text-gray-400 mb-2 font-mono">variant="dark" (default)</div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3" data-testid="ds-stats-dark">
              {STAT_COLORS.map((c) => (
                <StatCard
                  key={c}
                  icon="📊"
                  label={c}
                  value={Math.floor(Math.random() * 900 + 100)}
                  hint="+12% هذا الشهر"
                  color={c}
                  variant="dark"
                />
              ))}
            </div>
          </div>

          {/* Light variant */}
          <div>
            <div className="text-xs text-gray-400 mb-2 font-mono">variant="light"</div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3" data-testid="ds-stats-light">
              {STAT_COLORS.map((c) => (
                <StatCard
                  key={c}
                  icon="📈"
                  label={c}
                  value={Math.floor(Math.random() * 900 + 100)}
                  hint="آخر 30 يوم"
                  color={c}
                  variant="light"
                />
              ))}
            </div>
          </div>

          {/* Clickable */}
          <div>
            <div className="text-xs text-gray-400 mb-2 font-mono">onClick={'{...}'} → becomes clickable button</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatCard
                icon="🖱️"
                label="قابل للنقر"
                value="Click me"
                color="indigo"
                variant="light"
                onClick={() => alert('Clicked!')}
                testId="ds-clickable-stat"
              />
            </div>
          </div>

          <CodeBlock
            code={`<StatCard\n  icon="👥"\n  label="سكان"\n  value={230}\n  hint="+12 هذا الشهر"\n  color="indigo"   // 9 options\n  variant="light"  // 'dark' | 'light'\n  onClick={...}    // optional\n/>`}
          />
        </div>

        {/* SectionCards preview */}
        <div id="ds-sec-sections" className="space-y-4">
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            📦 SectionCard
            <Tag color="blue">2 variants</Tag>
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard
              title="🏘️ مجمعاتي"
              subtitle="إدارة كل المجمعات"
              icon={null}
              variant="dark"
              actions={<button className="text-xs px-2 py-1 bg-indigo-600 text-white rounded">+</button>}
              testId="ds-section-dark"
            >
              <div className="text-sm text-gray-300">محتوى القسم (dark variant).</div>
            </SectionCard>

            <SectionCard
              title="📊 الإحصائيات"
              subtitle="آخر 30 يوم"
              variant="light"
              actions={<button className="text-xs px-2 py-1 bg-emerald-600 text-white rounded">تحديث</button>}
              testId="ds-section-light"
            >
              <div className="text-sm text-gray-700">محتوى القسم (light variant).</div>
            </SectionCard>
          </div>

          <CodeBlock
            code={`<SectionCard\n  title="🏘️ مجمعاتي"\n  subtitle="إدارة كل المجمعات"\n  actions={<button>+ جديد</button>}\n  variant="light"  // or "dark"\n>\n  …content…\n</SectionCard>`}
          />
        </div>

        {/* EmptyStates preview */}
        <div id="ds-sec-empty" className="space-y-4">
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            📭 EmptyState
            <Tag color="amber">2 variants</Tag>
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <EmptyState
              icon="🏗️"
              title="لا توجد مجمعات بعد"
              subtitle="ابدأ بإضافة أول مجمع تحت إدارة شركتك"
              variant="dark"
              cta={<button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold">+ إنشاء</button>}
              testId="ds-empty-dark"
            />
            <EmptyState
              icon="📊"
              title="لا توجد بيانات"
              subtitle="جرب فترة زمنية أخرى"
              variant="light"
              testId="ds-empty-light"
            />
          </div>

          <CodeBlock
            code={`<EmptyState\n  icon="🏗️"\n  title="لا توجد مجمعات بعد"\n  subtitle="ابدأ بإضافة أول مجمع"\n  cta={<button>+ إنشاء</button>}\n  variant="dark"  // or "light"\n/>`}
          />
        </div>

        {/* Tokens */}
        <div id="ds-sec-tokens" className="space-y-4">
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">🎨 Tokens</h2>

          <SectionCard title="المسافات (Spacing)" variant="light">
            <ul className="text-sm space-y-1 text-gray-700">
              <li><code className="bg-gray-100 px-1.5 py-0.5 rounded">p-6</code> — حشو الصفحة</li>
              <li><code className="bg-gray-100 px-1.5 py-0.5 rounded">space-y-6</code> — المسافة بين الأقسام</li>
              <li><code className="bg-gray-100 px-1.5 py-0.5 rounded">space-y-3</code> — داخل قسم</li>
              <li><code className="bg-gray-100 px-1.5 py-0.5 rounded">max-w-7xl mx-auto</code> — أقصى عرض للمحتوى</li>
            </ul>
          </SectionCard>

          <SectionCard title="النصوص (Typography)" variant="light">
            <div className="space-y-2">
              <div>
                <div className="text-2xl md:text-3xl font-extrabold text-gray-900">عنوان الصفحة — 3xl extrabold</div>
                <code className="text-[10px] text-gray-500">text-2xl md:text-3xl font-extrabold</code>
              </div>
              <div>
                <div className="text-base font-extrabold text-gray-900">عنوان قسم — base extrabold</div>
                <code className="text-[10px] text-gray-500">text-base font-extrabold</code>
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-extrabold text-indigo-700">1,234 — KPI</div>
                <code className="text-[10px] text-gray-500">text-2xl md:text-3xl font-extrabold</code>
              </div>
              <div>
                <div className="text-sm text-gray-700">نص عادي — sm</div>
                <code className="text-[10px] text-gray-500">text-sm</code>
              </div>
              <div>
                <div className="text-[10px] font-bold tracking-wider uppercase text-indigo-700">BADGE — 10px bold tracking-wider</div>
                <code className="text-[10px] text-gray-500">text-[10px] font-bold tracking-wider uppercase</code>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="استيراد سريع" variant="light">
            <CodeBlock
              code={`import PageHeader from 'components/shared/PageHeader';\nimport StatCard from 'components/shared/StatCard';\nimport SectionCard from 'components/shared/SectionCard';\nimport EmptyState from 'components/shared/EmptyState';`}
            />
          </SectionCard>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-gray-500 py-4">
          HomeMe Design System v1 •
          القواعد الكاملة في <code className="text-indigo-400">/app/design_guidelines.md</code>
        </div>
      </div>
    </div>
  );
};

export default DesignSystemPage;
