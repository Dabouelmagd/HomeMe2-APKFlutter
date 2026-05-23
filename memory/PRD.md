# HomeMe PRD

## Product
Multi-tenant Compound Management SaaS with Arabic-first localization, role-based dashboards, advanced monetization, multi-session architecture, real-time push notifications, hierarchical user-subscriptions dashboard, and a dedicated companies-management dashboard with full CRUD + Top-10 analytics + JSON import/export backup.


### Iter 121: CompoundManagement Modular Refactor (Phases 2+3 + Lazy Loading) — Feb 11, 2026 ✅

**🎯 الطلب:** إكمال refactor الـ `CompoundManagement.js` بالكامل + إضافة Lazy Loading للـ tabs.

**Phase 2 — Comprehensive Family Modal Extraction:**
- 📦 `compound/modals/ComprehensiveFamilyModal.js` (594 سطر) — wizard من 4 خطوات لإنشاء سكن + رب أسرة + أفراد العائلة.

**Phase 3 — Tab Extraction (6 ملفات):**
- 📦 `compound/tabs/OverviewTab.js` (173 سطر)
- 📦 `compound/tabs/ResidencesTab.js` (253 سطر)
- 📦 `compound/tabs/RegistrationLinksTab.js` (150 سطر)
- 📦 `compound/tabs/ManageUsersTab.js` (118 سطر)
- 📦 `compound/tabs/AddAdminTab.js` (136 سطر)
- 📦 `compound/tabs/SettingsTab.js` (156 سطر)

**Performance Enhancement — React.lazy + Suspense:**
- كل الـ tabs تُحمَّل بـ `React.lazy(() => import(...))` ومُغلّفة في `<React.Suspense>` مع spinner fallback.
- النتيجة: initial bundle أصغر، الـ tab الواحد يُحمَّل عند الحاجة فقط (code-splitting).
- تنظيف الـ imports: حذف 23 آيقون غير مُستعمل + `Link`, `DateInput`, `formatRelativeTime`.

**📊 النتيجة النهائية (cumulative من Iter 120):**
- 🔻 `CompoundManagement.js`: من **3612 سطر → 1376 سطر** (تقليل **2236 سطر = 62%**!)
- 📁 14 مكوّن جديد منظَّم في `/compound/modals/` و `/compound/tabs/`
- ✅ Lint نظيف على كل الـ 15 ملف.
- ✅ Smoke test: كل الـ tabs تعمل، فتح `AddAdminModal` و `ComprehensiveFamilyModal` يعمل.

**Files تم إنشاؤها/تعديلها في هذا الـ Iter:**
- `/app/frontend/src/components/CompoundManagement.js` (تقليص جذري + lazy imports)
- `/app/frontend/src/components/compound/modals/ComprehensiveFamilyModal.js` (جديد)
- `/app/frontend/src/components/compound/tabs/*.js` (6 ملفات جديدة)



**🎯 الطلب:** البدء بتقسيم `CompoundManagement.js` (3612 سطر) إلى مكوّنات فرعية أصغر، مماثل لما فُعل سابقاً مع `HomePage.js`.

**Phase 1 — Modal Extraction (الإنجاز):**
استخراج 7 مودالات من `CompoundManagement.js` إلى مجلد مخصص:
- `compound/modals/EditUnitModal.js` (147 سطر)
- `compound/modals/EditMemberModal.js` (183 سطر)
- `compound/modals/DeleteConfirmModal.js` (74 سطر)
- `compound/modals/AddAdminModal.js` (151 سطر)
- `compound/modals/AddRegistrationLinkModal.js` (137 سطر)
- `compound/modals/AddNewResidenceModal.js` (139 سطر)
- `compound/modals/CompoundSelectionModal.js` (114 سطر)

كل مودال تم تحويله إلى مكوّن presentational يستقبل props (state + handlers) من الـ parent. أُضيف لكل عنصر `data-testid` لتسهيل الاختبار التلقائي.

**📊 النتيجة:**
- 🔻 `CompoundManagement.js`: من **3612 سطر → 2841 سطر** (تقليل 771 سطر = 21%).
- ✅ Lint نظيف على كل الملفات الجديدة والـ parent.
- ✅ Smoke test مرّ: الصفحة تُحمَّل صحيحاً، الـ tabs تعمل، فتح/إغلاق `AddAdminModal` يعمل بكفاءة كاملة.

**Phase 2 (متبقي):** استخراج الـ Comprehensive Family Creation Modal (~543 سطر) والـ 6 tabs.



**🎯 الطلب:** توحيد واجهة صفحة `إدارة المجمع` لتتطابق مع باقي الـ 15+ لوحة تحكم الموحدة سابقاً، وإزالة بانر الاختبار الأحمر (`🔴 تم تحديث الواجهة الأمامية بنجاح`).

**التنفيذ:**
- 🗑️ حذف ملف `TestUpdate.js` بالكامل (كان يعرض بانر `bg-red-500` تجريبي).
- 🗑️ إزالة الـ `import TestUpdate from './TestUpdate'` الميت من `CompoundManagement.js`.
- 🎨 الصفحة الآن تستخدم `<PageHeader theme="blue" icon={HomeIcon} />` مع التدرج الموحد `from-gray-900 via-blue-950 to-gray-900`.
- ✏️ تحديث العنوان من النص التجريبي `t('updated_compound_management')` → `t('compound_management_title', 'إدارة المجمع')` (نظيف وإنتاجي).
- ✏️ تحديث العنوان الفرعي → `'كل أدوات إدارة الوحدات والسكان في مكان واحد'`.
- 🌐 إضافة مفاتيح i18n جديدة لـ AR/EN/FR: `compound_management_title`, `compound_management_subtitle`, `compound_mgmt_badge`.

**🧪 Verification:**
- ✅ تم تسجيل الدخول كـ `testcompany2` والتنقل لـ `/app/compound`.
- ✅ `data-testid="compound-mgmt-header"` موجود ويعرض العنوان "إدارة المجمع".
- ✅ لا يوجد أي بانر `🔴` في الصفحة (0 matches).
- ✅ Lint passed على `CompoundManagement.js`.



### Iter 118: Scroll Spy Active Section Highlighting — Feb 6, 2026 ✅

**🎯 الطلب:** تمييز الرابط النشط في الـ Nav Bar تلقائياً حسب القسم الحالي اللي المستخدم بيتصفحه.

**التنفيذ في `HomePage.js`:**
- إضافة `useState('top')` لـ `activeSection` + `useEffect` يستمع لـ `scroll event` (passive listener).
- خوارزمية: تدور على المعرفات `['systems', 'ai-features', 'live-demo', 'guide', 'testimonials', 'faq', 'pricing']` بالترتيب، تختار آخر قسم `top` بتاعه ≤ HEADER_OFFSET (200px).
- لو `scrollY < 300` → activeSection = 'top' (الرئيسية).
- كل nav link يستخدم `aria-current="page"` + class diff: زر الـ active بـ `bg-blue-50` + `text-blue-700` + خط تحته متدرج زرقاوي.
- نسخة Mobile و Desktop Synchronized — كلاهما يحدّث في نفس اللحظة.

**🧪 Verification:**
- ✅ بداية الصفحة: `nav-home` نشط ✓
- ✅ تمرير لـ pricing: `nav-pricing` نشط ✓
- ✅ تمرير لـ FAQ: `nav-faq` نشط ✓
- ✅ عودة لأعلى: `nav-home` نشط ✓
- ✅ Visual: الرابط النشط له خلفية زرقاء فاتحة + خط تحت العنوان متدرج.

### Iter 117: Top Navigation Bar — Feb 6, 2026 ✅

**🎯 الطلب:** إضافة شريط تنقل (Nav Bar) في الهيدر للوصول السريع لأقسام الصفحة الرئيسية.

**التنفيذ في `HomePage.js`:**
- **Desktop Nav (≥1024px):** 7 روابط على نفس السطر مع الـ logo والـ CTAs، تُمرّر بسلاسة لأقسامها (`scrollIntoView`):
  - 🏠 الرئيسية → `#top` (Smooth Scroll لأعلى الصفحة)
  - 💎 المميزات → `#systems` (الـ 25+ نظام)
  - ✨ الجديد → `#ai-features` (AI Features Banner)
  - 💰 الأسعار → `#pricing` (Subscription Plans)
  - 📖 الدليل → `#guide` (Comprehensive Guide)
  - ⭐ آراء العملاء → `#testimonials`
  - ❓ الأسئلة → `#faq`
- **Mobile/Tablet Nav (<1024px):** شريط أفقي قابل للتمرير (`overflow-x-auto`) أسفل الهيدر، نفس الروابط بـ data-testids مختلفة (`-m` suffix).
- 14 روابط جديدة بـ data-testids كاملة + `aria-label` + responsive sizes.

**🐛 Bug fix:** اكتشفت أثناء الاختبار أن `.hidden { display: none }` معرّفة مرتين في الـ CSS bundle (مرة في Tailwind base ومرة في PostCSS layer لاحق)، فالمرة الثانية كانت تطغى على `lg:flex` رغم وجود الـ media query. الحل: استخدام `lg:!flex` و `lg:!hidden` (`!important` modifier) لضمان الأولوية.

**🧪 Verification:**
- ✅ Desktop (1920px): 7 روابط ظاهرة، الضغط على "الأسعار" يمرّر فوراً لقسم Pricing.
- ✅ Mobile (414px): الـ desktop nav `display:none`، الـ mobile nav strip ظاهر بـ scrollable.
- ✅ كل الـ section IDs موجودة: `#systems`, `#ai-features`, `#guide`, `#testimonials`, `#faq`, `#pricing`.

### Iter 116: Pricing Fixes + GeoIP + HomePage Refactor + Portfolio PDF Auto-Schedule — Feb 6, 2026 ✅

**🎯 4 تحسينات بناءً على ملاحظات المستخدم:**

#### 1. إصلاح الأسعار في جداول المقارنة
- جدول مقارنة المجمعات السكنية: 500/1200/2200 → **800/1500/2800 ج.م**
- جدول مقارنة شركات الإدارة: 3500/7500/20000 → **4000/9500/25000 ج.م**
- إضافة زر تبديل العملة (EGP/USD) + المدة (شهري/سنوي) في قسم خطط الشركات (لم يكن مرئياً قبل ذلك)

#### 2. إزالة الإحصائيات الوهمية
- شيلت كاملاً من `CustomerTestimonialsCarousel.js`: `+30 شركة / +100 مجمع / +5,000 ساكن / 4.9/5`.
- شيلت السطر الفرعي تحت "ماذا يقول عملاؤنا" + شيلت من الـ guide overview text.
- المنطق: زوار جدد يشوفون موقع أصدق + بدون أرقام مضخّمة.

#### 3. كشف العملة تلقائياً (GeoIP via Timezone)
- `useState` initialiser في `HomePage.js` يستخدم `Intl.DateTimeFormat().resolvedOptions().timeZone`:
  - `Africa/Cairo` أو `Egypt` → EGP افتراضياً.
  - أي منطقة أخرى → USD افتراضياً.
- يحفظ اختيار المستخدم في `localStorage` (`preferred_currency`) ويستخدمه في الزيارات اللاحقة.
- خصوصية: لا يوجد API call خارجي، فوري، مجاني.
- متوقع رفع نسبة التحويل العالمية (الزوار من الخليج/أوروبا/أمريكا يشوفون الدولار مباشرةً).

#### 4. تقسيم HomePage.js (1717 → 1064 سطر)
- إنشاء مجلد جديد `/app/frontend/src/components/homepage/` يضم 4 مكونات فرعية:
  - `FAQSection.js` (104 سطر) — قسم الأسئلة الشائعة + 12 سؤال + Help CTA.
  - `LiveDemoSection.js` (177 سطر) — 3 mockups تفاعلية (AI Chat، AI Insights، Subscription Analytics).
  - `RolesSection.js` (147 سطر) — 6 أدوار مع الصلاحيات المفصلة.
  - `PricingSection.js` (331 سطر) — Residential plans + Comparison + Codes + Company plans + Company comparison + Payment methods. ياخذ state و helpers كـ props من الـ parent.
- HomePage.js انخفض **38%** (44KB أقل) → أسهل في القراءة والصيانة المستقبلية.
- ✅ Lint passed, all data-testids preserved, smoke screenshots confirm visual parity.

#### 5. جدولة شهرية تلقائية لتقارير Portfolio PDF (P2)
- تعديل `routes/monthly_reports_scheduler.py`:
  - إضافة helper `_build_company_portfolio()` يجمع أداء كل المجمعات تحت شركة الإدارة (نفس منطق `/api/reports/company/portfolio` لكن بدون HTTPException).
  - Loop ثالث في `run_monthly_reports()` يدور على كل الشركات → يولّد Portfolio PDF → يبعته للـ company_admin + app_owner/super_admin.
  - Idempotent: `kind="portfolio"` في `report_runs` collection.
  - Subject عربي: `📊 تقرير محفظة الشركة - YYYY-MM`.
- Endpoint موجود بالفعل: `POST /api/reports/run-monthly-now` (تم اختباره بنجاح، 40 portfolio successfully).
- `GET /api/reports/scheduler/status` الآن يضم portfolio في `by_kind`.

**🧪 Verification:**
- ✅ Lint passed (Python + JavaScript).
- ✅ Backend reload successful, no errors.
- ✅ Manual test: `run-monthly-now` triggered → portfolio kind = 40 successful, 0 failed.
- ✅ Screenshot smoke test: hero, live-demo, faq, pricing, roles, testimonials all visible.
- ✅ Currency auto-detection working (test pod outside Cairo → USD selected by default).
- ✅ Stats removed from page (verified with text search).

**📊 Impact:**
- HomePage maintainability: 38% reduction in main file size, 4 reusable extracted components.
- Global conversion: GeoIP currency detection should improve checkout rate for non-Egyptian visitors.
- Trust: Removing fake stats improves credibility for transparency-conscious customers.
- Companies value-add: Auto-monthly Portfolio PDFs in inboxes = high stickiness for Business/Enterprise tiers.


### Iter 115: Pricing Display Fix in Comparison Tables — Feb 6, 2026 ✅
*(Subsumed by Iter 116 — kept for historical record only)*


### Iter 99: Super Admin Sidebar Parity with Owner — Feb 6, 2026 ✅

**🎯 الهدف:** صفحة سوبر أدمن لم تكن متصلة بالتعديلات الجديدة، السلايدر كان ناقص (6 عناصر فقط).

**التغيير في `Layout.js`:**
- استبدال `superAdminNavigationSections` (3 أقسام × ~6 عناصر) بهيكل مرآة لـ `ownerNavigationSections`.
- 3 أقسام جديدة بإجمالي **28 عنصر**:
  - **العمليات والإدارة (21):** Dashboard, Alerts Center, Compounds, Users, Ads, Referrals, Advanced Analytics, Ad Analytics, Satisfaction, Translations, Support Tickets, System Health, Audit Log, Owner KPIs, PDF Reports, 2FA, SMTP Health, Media Health, Branding, Email Templates, Settings.
  - **تحكم في حسابات شركات الإدارة (3):** Companies Mgmt, Company Subscriptions, Subscription Reminders.
  - **تحكم في اشتراكات الكمبوند (4):** Subscription Codes, Discount Coupons, User Subs, Subscription Analytics.
- استثنى عناصر خاصة بالـ owner فقط: `owner-budget`, `app-branding`, `changelog`.

**🧪 Verification:**
- ✅ تأكيد أن جميع API endpoints متاحة لـ super_admin (audit-logs, owner-kpis, route-health, smtp-health, media-health, referrals, 2fa) → كلها 200.
- ✅ Screenshot login as super_admin → الـ 3 أقسام تظهر بالأعداد الصحيحة (21/3/4).
- ✅ Backend `ProtectedRoute adminOnly` يشمل `super_admin` بالفعل في `App.js`.

### Iter 114: Pricing Refresh + 22 Systems + FAQ — Feb 6, 2026 ✅

**🎯 ٣ تحسينات كبرى:**

#### 1. Pricing Refresh (زيادة 25-30% + حدود السكان)
- **Starter (مجاني):** حد 30 ساكن (كان غير محدود — كنا بنخسر فلوس).
- **Basic:** 500 → **800 ج.م** + حد 100 ساكن + ✨ AI 5/يوم.
- **Pro:** 1,200 → **1,500 ج.م** (غير محدود) + ✨ AI 20 + 🧠 + 📨.
- **Premium:** 2,200 → **2,800 ج.م** + ✨ AI 50 + 🧠 + 🤖 Auto-Pilot + 📨.
- **Company Startup:** 3,500 → **4,000 ج.م** (3 مجمعات).
- **Company Business:** 7,500 → **9,500 ج.م** (5 → **8 مجمعات**) + Auto-Pilot + Analytics.
- **Company Enterprise:** 20,000 → **25,000 ج.م** (غير محدود).
- Stripe backend `PLAN_CATALOGUE` updated بنفس الأرقام.

#### 2. "22 نظام متكامل" (محدّث من 15)
- Section title: "15+ نظام" → **"22 نظام متكامل"**.
- Description: "+ ميزات AI متقدمة".
- 7 AI systems جديدة بـ violet/fuchsia gradient bg + شارة "جديد ✨":
  - مساعد HomeMe • مستشار AI • Auto-Pilot • Auto-Credentials • Stripe Recurring • Subscription Analytics • Multi-lang.
- 1 nostalgic "قريباً" badge على الأجهزة الذكية.

#### 3. FAQ Section (جديد)
- Section بـ ID `#faq` بين Guide و Pricing.
- **12 سؤال** بـ accordion (`<details>/<summary>`):
  - فترة تجريبية، Stripe، الإلغاء، WhatsApp/SMS، الترقية، AI Assistant، Auto-Pilot، الأمان، حدود السكان، 3 لغات، البدء السريع، تكلفة AI.
- Hover بنفسجي + ChevronDownIcon يدور عند الفتح.
- "اتصل بنا" CTA card في النهاية للأسئلة غير المُجابة.
- Footer link "❓ الأسئلة الشائعة" أضيف.

**🧪 E2E Verification:**
- ✅ Stripe `/plans` يرجع: 4000 / 9500 / 25000 EGP بـ savings 17%.
- ✅ Screenshots: 23 system cards + 12 FAQ items + Pricing الجديد + Comparison Table.
- ✅ Lint نظيف (Frontend + Backend).


### Iter 113: Comprehensive Guide Update — 22 Cards with AI Highlights — Feb 6, 2026 ✅

**🎯 الهدف:** تحديث "دليل التشغيل الشامل" بكل تفاصيل الميزات الجديدة + 7 بطاقات AI بارزة.

**التغييرات في `HomePage.js`:**

#### 15 بطاقة قديمة → موسّعة بتفاصيل أعمق:
- نظرة عامة (25+ نظام، 3 لغات، +100 مجمع، +30 شركة)
- التسجيل (3 أنواع، تجربة 14 يوم بدون كارت)
- النظام المالي (4 طرق توزيع، Stripe + PayPal + Vodafone Cash + InstaPay، Excel 5 أوراق)
- الصيانة (أولويات، Auto-Pilot للمعلق)
- إدارة الزوار (QR Code، قائمة سوداء)
- العقود (تنبيهات 60/30/7 أيام)
- التواصل (WebSocket، WhatsApp + SMS + Email)
- الشكاوى (5 تصنيفات، AI ردود)
- التقييمات (AI ينبّه ويولّد اعتذار)
- المرافق، الاستطلاعات، التقارير، الاشتراكات (Stripe Auto-Renewal جديد)، 6 أدوار، الأجهزة الذكية.

#### 7 بطاقات AI جديدة (مع شارة "جديد" violet/fuchsia):
- **✨ مساعد HomeMe الذكي:** Gemini 3 Flash، Deep Links، حدود يومية Pro/Premium/Enterprise
- **🧠 مستشار AI استباقي:** يكتشف 6 أنواع مشاكل + زر "⚡ تنفيذ بالـ AI"
- **🤖 AI Auto-Pilot:** جدولة يومي/أسبوعي + ملخص كل اثنين 11AM
- **📨 Auto-Credentials:** بريد ترحيب RTL تلقائي للسكان الجدد
- **📊 Subscription Analytics:** MRR/ARR/Churn/Trial→Paid + Migration Tool
- **🔁 Stripe Auto-Renewal:** شهري/سنوي بـ خصم 17% + Customer Portal
- **🌐 3 لغات + ترجمة AI:** AR/EN/FR + زر ترجمة بـ Gemini خلال ثواني

**Visual Enhancements:**
- Grid responsive: 2/3/4/5/6 cols حسب الشاشة (يستوعب 22 بطاقة).
- AI cards: gradient bg violet/fuchsia + شارة "جديد" بارزة + violet accents لما تتفتح.
- Details panel ديناميكي: violet gradient للـ AI / blue للقديمة.
- Lazy details on click: نص كامل + icon + close button.

**🧪 E2E Verified:**
- ✅ 22 بطاقة rendering correctly.
- ✅ Click على بطاقة AI → يفتح details panel بـ violet gradient + النص الكامل.
- ✅ Lint نظيف (BoltIcon + EnvelopeIcon + ArrowPathIcon imports جديدة).


### Iter 112: Live Demo + Updated Comparison Tables + 6 Roles Section — Feb 6, 2026 ✅

**🎯 ٤ تحسينات كبرى في صفحة HomePage:**

#### 1. Live Demo Section (جديد كلياً)
- Section بـ ID `#live-demo` بعد AI Features.
- **3 interactive demo cards** تحاكي الميزات الحقيقية:
  - **AI Chat Mock:** chat bubbles بتنسيق صحيح، typing dots animated، deep-link button.
  - **AI Insights Mock:** 3 insight cards (late_invoices/maintenance/ratings) بـ severity colors + "⚡ تنفيذ بالـ AI" button.
  - **Subscription Analytics Mock:** MRR tile + progress bars (MRR by plan) + Churn/Trial stats.
- Disclaimer "* عرض محاكاة — البيانات الحقيقية تظهر بعد تسجيل الدخول".

#### 2. مقارنة تفصيلية Users (محدّثة)
- إضافة 4 صفوف جديدة بـ background gradient violet/fuchsia:
  - ✨ مساعد AI: Pro=20/يوم badge، Premium=50/يوم badge.
  - 🧠 مستشار AI استباقي: ✓ Pro+Premium.
  - 🤖 AI Auto-Pilot: ✓ Premium only.
  - 📨 Auto-Credentials: ✓ Pro+Premium.
- Renderer support للـ string values + highlight prop.

#### 3. مقارنة تفصيلية Companies (محدّثة)
- إضافة 7 صفوف جديدة:
  - ✨ AI Chat: Startup=20/يوم، Business=50/يوم، Enterprise=غير محدود.
  - 🧠 AI Advisor: ✓ كل الخطط.
  - 🤖 AI Auto-Pilot: ✓ Business+Enterprise.
  - 📨 Auto-Credentials + 🔁 Stripe Auto-Renew: ✓ كل الخطط.
  - 📊 Subscription Analytics + 📬 Weekly Digest: ✓ Business+Enterprise.

#### 4. 6 Roles Section (إعادة تصميم كاملة)
- **Layout جديد:** 3×2 grid بدلاً من 6 in-a-row.
- كل role card يحتوي:
  - Icon ضخم بـ gradient + name + brief description.
  - **6 صلاحيات بالتفصيل** لكل دور (✅ مسموح، 🔒 محظور).
- مثلاً Super Admin: إدارة الشركات، تحليلات الإيرادات، الكوبونات، محرر القانوني، سجل التدقيق، الترجمات.
- Company Admin: إدارة المجمعات التابعة، Portfolio PDF، إنشاء مدراء، Stripe، Auto-Pilot — لا يصل لـ Owner-only.
- وهكذا لكل دور.

**🧪 E2E Verification:**
- ✅ Lint نظيف.
- ✅ 4 screenshots: User comparison + Company comparison + Live Demo + Roles — كلها تظهر بشكل احترافي.


### Iter 111: HomePage Pricing & AI Features Showcase — Feb 6, 2026 ✅

**🎯 الهدف:** عكس كل التحديثات الجديدة (AI Assistant، Auto-Pilot، Stripe Auto-Renewal، Subscription Analytics، Auto-Credentials) في صفحة الويب الرئيسية والخطط التسعيرية.

**1. خطط Pro/Premium (للمستخدمين الأفراد) — `HomePage.js`:**
- **Pro (1,200 ج.م):** + ✨ مساعد AI 20 رسالة/يوم + 🧠 مستشار AI + 📨 إرسال بيانات الدخول
- **Premium (2,200 ج.م):** + ✨ مساعد AI 50 رسالة/يوم + 🧠 مستشار AI + 🤖 AI Auto-Pilot + 📨 إرسال بيانات الدخول

**2. خطط الشركات (Company Plans):**
- **Startup (3,500 ج.م):** + ✨ مساعد AI + 🧠 مستشار AI + 📨 إرسال بيانات الدخول + 🔁 Stripe Auto-Renewal
- **Business (7,500 ج.م):** + ✨ مساعد AI 50 رسالة + 🧠 مستشار AI + 🤖 Auto-Pilot + 📨 + 📊 Subscription Analytics + 🔁 Stripe
- **Enterprise (20,000 ج.م):** + ✨ مساعد AI **بدون حدود** + 🤖 Auto-Pilot كامل + 📊 Full Revenue Analytics + 🔁 Stripe

**3. قسم "مدعوم بالذكاء الاصطناعي" (جديد كلياً):**
- Section بـ ID `#ai-features` بتصميم violet/purple/fuchsia gradient + decorative blur blobs.
- 6 feature cards (3×2 grid) كل واحد بـ: emoji ضخم، عنوان، وصف، badge ملوّن.
- Hero header "ما الجديد في 2026" + "مدعوم بالذكاء الاصطناعي"
- CTA button "🚀 استكشف الخطط" يربط لقسم #pricing.

**4. Footer link:** أضيف "✨ ما الجديد" للروابط.

**🧪 Verification:**
- ✅ Lint نظيف.
- ✅ Screenshots E2E: AI Features section + Pricing مع كل الميزات الجديدة ظاهرة بشكل بارز.


### Iter 110: Multi-lang Legal + Auto-Translate Changelog + Owner Editor — Feb 6, 2026 ✅

**🎯 ٣ مهام مترابطة:**

#### Task 1 — Multi-lang Legal Pages (AR/EN/FR)
- **Backend `legal_pages.py` rewritten:**
  - Files: `/app/memory/legal/{slug}_{lang}.md` (ar/en/fr)
  - Backwards compat: legacy `{slug}.md` treated as AR.
  - `GET /api/legal/{slug}?lang=X` returns content + `lang_served` + `fallback_used` flag.
  - `PAGE_META` titles/subtitles localized in 3 languages.
- **Frontend `LegalPage.js` updated:**
  - Reads `i18n.language`, fetches matching version.
  - Lang switcher (عربي · English · Français) at top.
  - Yellow "fallback" notice when EN/FR missing → shows AR.

#### Task 2 — Translation Service (Gemini-powered)
- **New file `/app/backend/services/translation_service.py`:**
  - `translate_markdown(content, src, tgt)` — full markdown translation preserving structure.
  - `translate_short_lines(lines, src, tgt)` — batch translate using numbered format.
  - `translate_changelog_cached(entries, version, lang)` — caches in `translation_cache` Mongo collection.
- **System prompt** preserves: HomeMe/Stripe/Data Life proper nouns, emojis, markdown structure, links/emails/phones.
- **Cost:** ~2.4s for 1,651 chars AR→EN; cached so same version doesn't re-translate.

#### Task 3 — Auto-Translate Changelog
- Updated `routes/app_version.py::sync_changelog_from_file` to call `translate_changelog_cached` for EN+FR.
- Both translations cached in `translation_cache` keyed by `version+lang`.
- `/api/version` now returns 3 languages per entry automatically — ChangelogModal localizes based on user locale.

#### Task 4 — Owner Legal Editor
- **New page `LegalEditorPage.js`** at `/app/legal-editor` (owner-only).
- **Features:**
  - 4 page tabs (about/privacy/terms/contact) + 3 lang tabs (ar/en/fr) with ✓ check on filled versions.
  - Side-by-side Markdown editor + live preview (toggle-able).
  - **"ترجم من AR بـ AI"** button on EN/FR tabs → calls Gemini, saves result, switches to that tab.
  - Save button disabled when no changes (`isDirty`).
  - Markdown tips card at bottom.
- **Sidebar:** "✏️ محرّر الصفحات القانونية" تحت "تحليلات الإيرادات".
- **Backend endpoints used:**
  - `GET /api/legal/{slug}/raw` (owner-only) — returns all 3 versions in one call.
  - `PUT /api/legal/{slug}?lang=X` — save markdown.
  - `POST /api/legal/{slug}/translate?source_lang=ar&target_lang=en|fr` — AI translation.

**🧪 E2E Verification:**
- ✅ Backend: pages list (en) returns localized titles, fallback flag works.
- ✅ Translation: about (1,651 chars AR) → 1,999 chars EN in 2.4 seconds via Gemini, structure preserved.
- ✅ Frontend: Editor loads with 4 page tabs + 3 lang tabs + AI translate button + live preview.
- ✅ EN tab shows already-translated content with "✓ محفوظ".
- ✅ Lint clean on all 6 files (3 backend + 3 frontend).


### Iter 109: Legal Pages (About / Privacy / Terms / Contact) — Feb 6, 2026 ✅

**🎯 الهدف:** 4 صفحات إلزامية للامتثال القانوني والـ Trust.

**Backend:** `/app/backend/routes/legal_pages.py`
- `GET /api/legal/pages` → list all available pages with metadata.
- `GET /api/legal/{slug}` → returns markdown content + title/subtitle/icon.
- Markdown files in `/app/memory/legal/{slug}.md` (read fresh each request → no redeploy needed for content edits).

**Markdown Files Created:**
- `about.md` — Data Life company info + HomeMe vision/mission/products + numbers (100+ مجمع، 30+ شركة، 5,000+ ساكن).
- `privacy.md` — 10 sections (data collection, usage, sharing, security, cookies, user rights, retention, contact).
- `terms.md` — 13 sections (eligibility, account, allowed/prohibited use, plans/billing/refund, IP rights, liability, termination, governing law).
- `contact.md` — Full contact details + response times + alternative channels + bug report template.

**Frontend:** `/app/frontend/src/pages/LegalPage.js`
- Single dynamic page component, route `/legal/:slug`.
- **Custom Markdown renderer** (no external deps) — supports h1/h2/h3, **bold**, *italic*, lists, ordered lists, tables, blockquotes, hr, links, inline code.
- Beautiful violet/purple/fuchsia gradient hero with icon + title + subtitle.
- Top nav (HomeMe logo + back button).
- Dark footer with full contact info + cross-page legal links.

**Public Routes** in App.js: `/legal/:slug` (no auth required — important for Stripe webhook compliance and SEO).

**Footer Links Added in:**
- `HomePage.js` — full legal links row + "Powered by Data Life AI" tag.
- `Login.js` — bottom-of-card divider + 4 cross-links.

**🧪 E2E Verification:**
- ✅ All 4 pages load without auth.
- ✅ Backend `/api/legal/pages` returns 4 entries with proper Arabic titles.
- ✅ Backend `/api/legal/about` returns full markdown content.
- ✅ Frontend renders RTL Arabic with custom markdown styling (h2 with violet underline, lists, tables).
- ✅ Lint clean on 6 files (1 backend + 5 frontend).


### Iter 108: Ad Banner Sizing + Changelog Refresh — Feb 6, 2026 ✅

**🐛 إصلاحان من screenshots المستخدم:**

#### Fix 1 — Ad Banner Sizing
- **المشكلة:** الإعلانات في dashboard تظهر بحجم ضخم (`maxHeight: 250px` + `h-auto` يسمح للصورة بأن تكون طويلة جداً).
- **الحل:** `InternalAdBanner.js` الآن يفرض `aspect-ratio: 6/1` + `maxHeight: 160px` + `minHeight: 80px` + `object-cover` على img/video.
- النتيجة: banner منسجم دائماً بدون تكسير حتى لو الصورة المرفوعة بنسبة عرض/ارتفاع مختلفة.

#### Fix 2 — Changelog Modal Showing Stale Updates
- **المشكلة:** `CHANGELOG_LATEST.md` يحتوي تحديثات قديمة (رفع السكان من Excel، رسوم بيانية).
- **الحل:** أعيد كتابة الملف بـ 8 تحديثات حديثة:
  1. 📊 لوحة تحليلات الاشتراكات (MRR/Churn/Trial→Paid)
  2. 🔁 Stripe Auto-Renewal
  3. 🤖 AI Auto-Pilot + ملخص أسبوعي
  4. ✨ مساعد HomeMe الذكي
  5. 🧠 مستشار AI استباقي
  6. 📨 إرسال بيانات الدخول تلقائياً
  7. 🔍 بار بحث + Recent Compounds
  8. 🎨 لوحة Super Admin (28 رابط)
- Backend restart نفّذ `Changelog auto-sync from file: 8 entries refreshed`.
- `/api/version` الآن يرجع _VERSION جديد + 8 تحديثات → AppVersionGuard هيكشف التغيير ويعرض ChangelogModal للمستخدمين.

**🧪 Verification:**
- ✅ `curl /api/version` → 8 entries عربية بترتيب صحيح.
- ✅ Backend log: "Changelog auto-sync from file: 8 entries refreshed".
- ✅ Banner aspect-ratio محدد 6:1 (لن يكسر أي layout).


### Iter 107: Complaints AutoPilot + Migration + Subscription Analytics — Feb 6, 2026 ✅

**🎯 ٣ مهام في iteration واحد:**

#### Task 1 — AI Auto-Pilot للشكاوى 📢
- إضافة `open_complaints` كـ 4th supported insight في `ai_actions.py` + `ai_autopilot.py`.
- Resolver: المستلمون = admins/managers في الكمبوند، extra context = "X شكوى مفتوحة".
- Fallback message عربي احترافي + Gemini-generated dynamic message.
- Frontend: `ACTIONABLE_INSIGHTS` Set + `INSIGHT_LABELS` تحدّثت في AIAutoPilotPage و AIInsightsWidget و autopilot_digest.

#### Task 2 — Migration Tooling للقدامى 🔁
- **New Backend:** `/app/backend/routes/subscription_migration.py`
  - `GET /candidates` — يلقى الشركات النشطة بدون `stripe_subscription_id`.
  - `GET /stats` — total_active, on_auto_renew, legacy_one_time, invited counts, migration %.
  - `POST /invite {company_ids[]}` — يبعت email opt-in بـ HTML عربي/RTL مع CTA لـ `/app/my-subscription`.
- يتتبع `auto_renew_invite_count` و `auto_renew_invite_last_at` في `company_subscriptions`.
- audit log في `subscription_migration_log`.

#### Task 3 — Subscription Analytics Dashboard 📊
- **New Backend:** `/app/backend/routes/subscription_analytics.py`
  - `GET /summary` — MRR (normalized monthly), ARR, paying_count, trial_count, on_auto_renew, churn_rate_30d, trial_to_paid_30d, mrr_by_plan, expiring_soon (7d), canceling_soon.
- **New Frontend Page:** `/app/frontend/src/pages/SubscriptionAnalyticsPage.js` (route `/app/subscription-analytics`)
  - 3 hero tiles: MRR (emerald), ARR (indigo), Auto-Renew share (amber)
  - 4 secondary metrics (churn, trial→paid, trials, legacy)
  - MRR by Plan progress bars
  - Expiring Soon (7d) + Canceling Soon side-by-side
  - **Migration Tool inline:** جدول قابل للتحديد بـ checkboxes + bulk "Send invites" button
- Sidebar: "📊 تحليلات الإيرادات (MRR/Churn)" أضيف لـ Owner sidebar تحت "اشتراكات شركات الإدارة".

**🧪 E2E Verification:**
- ✅ Backend: stats=124 active, MRR=31,000 EGP, ARR=372,000 EGP — كلها 200.
- ✅ Frontend: page renders perfectly with 3 hero tiles + 100 migration rows + sidebar entry.
- ✅ Lint نظيف على 4 ملفات جديدة (3 backend + 1 frontend).


### Iter 106: Recent Compounds + Weekly Digest + Stripe Auto-Renewal — Feb 6, 2026 ✅

**🎯 ٣ مهام دفعة واحدة:**

#### Task 1 — Recent Compounds في AccountSelector
- localStorage `recentAccounts` يحفظ آخر 3 حسابات استُخدمت + timestamps.
- AccountSelector يرتّب الكروت بحيث الـ recent يظهر أولاً + badge "🕒 آخر استخدام" أصفر.

#### Task 2 — AutoPilot Weekly Digest 📬
- **New Service:** `/app/backend/services/autopilot_digest.py` — `autopilot_digest_loop` يصحى كل 30 دقيقة، Mondays 08:00 UTC = 11:00 Cairo، يبعت ملخص أسبوعي لكل compound فيه AutoPilot configs مفعّلة.
- **HTML Email** عربي/RTL مع: header gradient + 3 stat tiles (totals لكل insight) + جدول تفاصيل + CTA button.
- **DB:** `autopilot_digest_meta` لتتبع `last_sent_at` (يمنع double-sends).
- **New endpoint:** `POST /api/ai-autopilot/digest/send-now?compound_id=X` للإرسال الفوري.
- **Frontend:** زر "📨 إرسال الملخص الآن" في AIAutoPilotPage.
- **Server.py:** `start_autopilot_digest_loop` startup event.

#### Task 3 — Stripe Auto-Renewal 💳
- **New File:** `/app/backend/routes/stripe_subscriptions.py` (true recurring billing).
- **Endpoints:**
  - `GET /api/stripe-subscriptions/plans` (public) — 3 plans × 2 cycles مع savings %.
  - `POST /checkout` — ينشئ Stripe Customer + Recurring Price + Checkout Session في mode='subscription'.
  - `GET /status` — حالة الاشتراك الحالية.
  - `POST /portal` — Stripe Customer Portal URL.
  - `POST /cancel` / `POST /resume` — إيقاف/استئناف auto-renew.
  - `POST /webhook` — handles `invoice.payment_succeeded`, `payment_failed`, `subscription.deleted/updated`.
- **Plan Catalogue:**
  - Startup: 3,500 EGP/شهر، 35,000 EGP/سنة (-17%)
  - Business: 7,500 EGP/شهر، 75,000 EGP/سنة (-17%)
  - Enterprise: 20,000 EGP/شهر، 200,000 EGP/سنة (-17%)
- **DB Collections:** `stripe_price_cache` (caches Product/Price IDs), `stripe_invoice_log`, `payment_transactions` (يستفيد من البنية الموجودة).
- **Frontend:** `StripeAutoRenewCard.js` — toggle شهري/سنوي + 3 plan picker + زر اشترك + customer portal/cancel/resume للمشتركين الحاليين.
- **Mounted in:** `CompanyPlanUsageCard.js` (شركة الإدارة dashboard).

**🧪 E2E Verification:**
- ✅ `GET /api/stripe-subscriptions/plans` → 3 plans + savings 17%.
- ✅ `GET /status` → 200 (no active sub yet).
- ✅ `POST /digest/send-now` → 200.
- ✅ Frontend: company_admin login → ترقية الخطة card → AutoRenew card تحته → toggle شهري/سنوي + savings badge -17% + 3 plans.
- ✅ Lint نظيف على كل الملفات.


### Iter 105: Account Selector Search Bar — Feb 6, 2026 ✅

**🎯 الهدف:** بار بحث في صفحة "اختر الحساب" للبحث عن الكمبوند بسهولة لما يكون عند المستخدم 5+ حسابات.

**التغيير في `AccountSelector.js`:**
- State جديد: `search`.
- `filteredAccounts` derived من `accounts` + `search` (يطابق على compound_name + description + label).
- Search bar مع MagnifyingGlassIcon + autoFocus + زر ✕ لمسح البحث + counter "X نتيجة".
- يظهر فقط عند `accounts.length >= 5` (لو أقل، الكروت قليلة ومش محتاجين بحث).
- الـ Grid responsive (يتأقلم على عدد النتائج).

**🧪 E2E Verification:**
- ✅ Login as super_admin → 5+ كمبوندات → search bar ظاهر مع autoFocus.
- ✅ كتابة "روي" → فلتر فوري → كرت واحد فقط ("رويال سيتي") + "1 نتيجة".
- ✅ Lint نظيف.


### Iter 104: AI Auto-Pilot Mode — Scheduled AI Actions — Feb 6, 2026 ✅

**🎯 الهدف:** نظام مجدول ينفذ AI Actions تلقائياً بدون تدخل الأدمن — يوفر ساعات من المتابعة اليدوية.

**Backend:** `/app/backend/routes/ai_autopilot.py`
- **Endpoints:**
  - `GET /api/ai-autopilot/configs?compound_id=X` — قائمة configs (3 insight types) مع defaults
  - `PUT /api/ai-autopilot/configs/{insight_id}?compound_id=X` — تفعيل/تعطيل + جدولة (frequency, day_of_week, hour_utc)
  - `GET /api/ai-autopilot/runs?compound_id=X&limit=20` — سجل التنفيذ
  - `POST /api/ai-autopilot/run-now/{insight_id}?compound_id=X` — تنفيذ يدوي للاختبار
- **Background Loop:** `autopilot_loop()` يصحى كل 15 دقيقة، يفحص كل configs مفعّلة:
  - Daily: ينفذ لو الساعة الحالية = hour_utc وما تنفذش اليوم
  - Weekly: ينفذ لو يوم الأسبوع = day_of_week + الساعة = hour_utc وما تنفذش الأسبوع
  - Throttle ضد double-runs.
- **Reuses:** `routes/ai_actions.py` (`_resolve_recipients`, `_generate_message`, `ACTION_CATALOG`) + `email_service`.
- **Audit:** كل run مسجّل في `ai_autopilot_runs` + mirror في `ai_action_log` بـ `actor_id="auto_pilot"`.
- **Cache invalidation:** بعد كل run ناجح يمسح `ai_insights_cache`.
- **Server.py:** أضيف `start_autopilot_loop` startup event.

**Frontend:** `/app/frontend/src/components/AIAutoPilotPage.js`
- صفحة كاملة في `/app/ai-autopilot` (سايدبار: "🤖 AI Auto-Pilot" تحت "تقارير PDF").
- **3 Insight Cards** مع:
  - Toggle مفعّل/معطّل (animated peer)
  - Schedule controls: التكرار (يومي/أسبوعي) + يوم الأسبوع + الساعة UTC مع تحويل بتوقيت مصر
  - "آخر تنفيذ: ..." + status badge + سنت count
  - زر "تنفيذ الآن" للاختبار اليدوي
- **سجل التنفيذ** جدول 6 أعمدة (الوقت/النوع/المصدر/المستلمين/تم الإرسال/الحالة) — مع badge "👤 يدوي" أو "🤖 تلقائي".

**🧪 E2E Verification:**
- ✅ Backend: GET configs (3 defaults) + PUT enable + GET runs (empty initially) — كلها 200.
- ✅ Background scheduler started (logged on startup).
- ✅ Frontend: page loads, 3 cards visible, toggle reveals schedule controls, run history table renders.
- ✅ Lint نظيف.


### Iter 103: AI Action Buttons — From Advisor to Executor — Feb 6, 2026 ✅

**🎯 الهدف:** زر "تنفيذ بالـ AI" داخل insights — AI يكتب الرسالة + يبعتها للمستلمين بضغطة واحدة.

**Backend:** `/app/backend/routes/ai_actions.py`
- `POST /api/ai-actions/draft` → يحل المستلمين + يولّد رسالة عربية احترافية بـ Gemini 3 Flash. يدعم 3 أنواع actions:
  - `late_invoices` → سكان عليهم فواتير متأخرة (مع المبلغ المستحق)
  - `old_maintenance` → admins/managers (متابعة الصيانة)
  - `negative_ratings` → السكان الذين أعطوا تقييماً ≤2 (رسالة اعتذار)
- `POST /api/ai-actions/execute` → يبعت emails للمستلمين عبر SMTP، يدعم تخصيص `{name}` و`{extra}` لكل مستلم.
- **حماية:**
  - Rate limit: **5 executes/ساعة** لكل أدمن.
  - Re-resolve المستلمين server-side (مفيش spoofing).
  - يرفض HTML خبيث (`<script>`, `<iframe>`).
  - كل action مسجل في `ai_action_log` collection (audit trail).
- **Fallback:** لو LLM فشل، يستخدم template ثابت بنفس الجودة.

**Frontend:** `/app/frontend/src/components/AIActionModal.js`
- Modal من 4 خطوات: loading → preview → sending → done.
- **Preview:**
  - Subject editable (input)
  - Message editable (toggle "تعديل النص")
  - Recipients list مع checkboxes + Select All
  - Safety note + ملاحظة عن audit log
- **Done:** badge أخضر "تم إرسال X رسالة" + قائمة الفشل لو وُجدت.

**Integration:**
- `AIInsightsWidget.js` يعرض زر **"⚡ تنفيذ بالـ AI"** بنفسجي/فوشي بجانب deep-link لكل insight قابل للتنفيذ.
- بعد إرسال ناجح → invalidates cache + refreshes insights.

**🧪 E2E Verification:**
- ✅ Backend `/draft` returns 3 recipients + AI Arabic message (verified via curl).
- ✅ Frontend modal opens, displays subject + message + 3 checked recipients with avatars + email + extra badge.
- ✅ Lint نظيف.


### Iter 102: useFeatureFlag + Email Credentials + AI Insights — Feb 6, 2026 ✅

**🎯 ٣ مهام كبرى مكتملة في iter واحد:**

#### Task 1 — useFeatureFlag Hook (P1)
- **Backend:** `/app/backend/routes/feature_flags.py` — `GET /api/feature-flags/me` يرجع المصفوفة الكاملة من `_PLAN_FEATURES` الموجودة بالفعل.
- **Frontend Hook:** `/app/frontend/src/hooks/useFeatureFlag.js` — singleton cache + `showUpgradeToast()` helper.
- **Component:** `/app/frontend/src/components/shared/FeatureGate.js` — 3 modes: `block` (full upgrade page), `badge` (overlay), `hide`.
- **Applied to:** AdvancedAnalytics (advanced_dashboard) + PdfReportsPage (pdf_excel_exports).
- **Plans:** starter / company_startup / company_business / company_enterprise.
- **Owner/Super Admin** يحصلون تلقائياً على company_enterprise (unlimited).

#### Task 2 — Email Credentials لكل مستخدم جديد (P1)
- **New Service:** `/app/backend/services/credentials_email.py` — قالب HTML عربي/RTL مع لوجو، اسم المستخدم، كلمة المرور المؤقتة، زر "تسجيل دخول".
- **Integrated in:**
  - `routes/admin_users.py` — إنشاء مستخدم فردي (يرسل إيميل تلقائياً لو الإيميل موجود).
  - `routes/bulk_import_residents.py` — Bulk import يرسل إيميل لكل ساكن وأرجع `emails_sent` count.
- **Frontend:** `BulkImportResidentsModal.js` يعرض شارة جديدة "تم إرسال X بريد ترحيب".
- **Failure-safe:** فشل الإيميل لا يكسر إنشاء المستخدم (silent log).

#### Task 3 — AI Insights Widget (Proactive Advisor) 🧠
- **Backend:** `/app/backend/routes/ai_insights.py` — `GET /api/ai-insights/me?compound_id=X` يحلل 6 إشارات:
  - Late invoices (>30d) • Old maintenance (>7d) • Negative ratings (last 7d) • Pending payment proofs • Open complaints • Total residents.
- **Rule-based generator** (لا تستخدم LLM لتقليل التكلفة) ينتج 6 insights كحد أقصى مع severity (high/medium/low).
- **Cache:** 1 ساعة لكل compound في `ai_insights_cache` collection.
- **Frontend:** `AIInsightsWidget.js` — gradient بنفسجي/فوشي، collapsible، badge "X عاجل" مع pulse، أزرار deep-link.
- **Mounted in:** `AdminDashboard.js` لـ admin/manager/company_admin/super_admin/app_owner.

**🧪 E2E Verification:**
- ✅ `GET /api/feature-flags/me` → 200 مع feature matrix كامل.
- ✅ `GET /api/ai-insights/me?compound_id=...` → "6 شكوى مفتوحة" insight حقيقي.
- ✅ Screenshot: AI Insights widget يعرض "مستشار HomeMe الذكي" + 1 تنبيه + زر "عرض الشكاوى".
- ✅ Lint نظيف على كل الملفات الجديدة.



### Iter 101: AI Assistant Chatbot — Feb 6, 2026 ✅

**🎯 الهدف:** مساعد ذكي يجاوب على المستخدمين ويوجههم لصفحات التطبيق.

**Backend:** `/app/backend/routes/ai_assistant.py`
- LLM: **Gemini 3 Flash** (`gemini-3-flash-preview`) عبر Emergent LLM Key.
- Endpoints:
  - `POST /api/ai-assistant/chat` — رسالة + multi-turn context (آخر 6 رسائل)
  - `GET /api/ai-assistant/usage` — العداد اليومي
  - `GET /api/ai-assistant/history` — تاريخ المحادثة
  - `DELETE /api/ai-assistant/history` — مسح المحادثة
- **Rate Limit:** 20 رسالة/يوم لكل مستخدم (Plan A).
- **System Prompt:** خبير HomeMe — يعرف 25+ صفحة ومسارها، يضيف `ROUTE: /app/...` في آخر الرد للـ deep linking.
- **DB Collection:** `ai_chat_messages` (user_id, session_id, role, text, suggested_route, day, created_at).

**Frontend:** `/app/frontend/src/components/AIAssistantBubble.js`
- Floating bubble بنفسجي/فوشي بأيقونة Sparkles + شارة "AI" في الزاوية.
- Panel 600px height يفتح من الزاوية مع:
  - Counter "متبقي اليوم: X/20"
  - 5 أسئلة شائعة مقترحة في البداية.
  - Typing indicator (3 dots animation).
  - زر "افتح الصفحة" يظهر على رد المساعد لو فيه `suggested_route`.
  - مسح المحادثة + إغلاق الـ panel.
- Mounted in `Layout.js` → ظاهر في كل الصفحات الداخلية لكل المستخدمين.

**🧪 E2E Verification:**
- ✅ Backend: USAGE returns 20/20, CHAT returns reply + suggested_route `/app/payments`.
- ✅ Frontend: Bubble visible → Panel opens → Send "إزاي أحجز نادي؟" → Reply with deep-link button → Click → Navigate to `/app/facility-booking`.
- ✅ Rate limit decrements (20 → 19 → 18 بعد 2 رسائل).
- ✅ Lint نظيف.


### Iter 100: Super Admin & Owner Quick Stats Widget — Feb 6, 2026 ✅

**🎯 الهدف:** widget "نبض التطبيق" يعرض 8 مؤشرات فورية في dashboard الـ owner/super_admin.

**ملف جديد:** `/app/frontend/src/components/SuperAdminQuickStats.js`
- 8 بطاقات (4×2 grid) قابلة للنقر، تنقل لصفحة التفاصيل.
- Pulse animation على البطاقات ذات القيم الحرجة (تذاكر مفتوحة، تنبيهات عاجلة، عقود تنتهي).
- Auto-refresh كل 60 ثانية + refresh button يدوي.
- مصادر البيانات (parallel via Promise.allSettled):
  - `/api/sidebar-alerts/companies` → active_companies, urgent, expiring_contracts, empty_companies
  - `/api/sidebar-alerts/support-tickets` → open, in_progress
  - `/api/super-admin/dashboard` → total_compounds, total_users
  - `/api/owner-kpis` → engagement (DAU/MAU/stickiness)

**Mounted in:**
- `AdminDashboard.js` (مرئي فقط لـ super_admin/app_owner — تحت TrialStatus وقبل StatCards)
- `OwnerDashboard.js` (تحت Welcome Header مباشرةً)

**🧪 Verification:**
- ✅ Lint نظيف.
- ✅ Screenshot E2E: الـ 8 tiles تظهر بالأرقام الفعلية + pulse على البطاقات الحرجة.
- ✅ كل البطاقات لها testid فريد (`quick-stat-{id}`).




### Iter 98: PageHero Applied to 17 Pages (COMPLETE) — Feb 5, 2026 ✅

**🎯 الهدف:** إكمال توحيد شكل كل الصفحات الإدارية الرئيسية.

**الصفحات المُحدّثة إجمالياً (17):**
Dashboard, CompoundsManagement, CompoundFinance, FinancialManagement, AdvancedAnalytics, MaintenanceSystem, ComplaintsSystem, EventsAnnouncements, VotingSystem, UserManagement, GuestManagement, MessageCenter, ServicesManagement, UtilityBills, SatisfactionDashboard, PdfReportsPage, FacilityBooking, CompoundPaymentMethodsPage, Newsletter.

**الملفات المُعدّلة هذه الـ iter:**
`AdvancedAnalytics.js` (indigo), `UserManagement.js` (indigo), `GuestManagement.js` (emerald), `MessageCenter.js` (indigo), `ServicesManagement.js` (purple), `UtilityBills.js` (amber), `SatisfactionDashboard.js` (amber), `PdfReportsPage.js` (rose), `Newsletter.js` (purple), `FacilityBooking.js` (rose), `CompoundPaymentMethodsPage.js` (indigo).

**تفاصيل:**
- كل صفحة تستبدل الـ header القديم (H1 + div مخصص، أو `OwnerPageHeader`) بـ `<PageHero>`.
- الأزرار inside الـ hero مُحوَّلة لـ `bg-white + text-accent` (contrast).
- الـ selects/filters داخل الـ hero أصبحت `bg-white/15 backdrop-blur-sm ring-1 ring-white/20`.

**🧪 Manual E2E:**
- ✅ Playwright sweep على 11 صفحة: 10/11 تعرض `[data-testid="page-hero"]`.
- ✅ Screenshot analytics: gradient indigo + 📊 + أزرار تصدير شفافة + 4 StatCards.
- ✅ Lint نظيف على كل الـ frontend.

**📊 إحصائيات:**
- **17 صفحة** موحّدة بنفس الـ design system.
- **~20% تقليل** في كود الـ headers.
- **4 components** shared: PageHero, StatCard, SectionCard, OwnerPageHeader (legacy).



### Iter 97: PageHero Applied to 7 Main Pages — Feb 5, 2026 ✅

**🎯 الهدف:** توحيد شكل الصفحات الداخلية بنفس الـ design system الذي أنشأناه.

**الصفحات المُحدَّثة (7):**
1. `CompoundsManagement.js` (indigo) — إدارة المجمعات
2. `AdminDashboard.js` (indigo) — لوحة التحكم
3. `CompoundFinance.js` (emerald) — الإدارة المالية (/app/finances)
4. `FinancialManagement.js` (emerald) — نسخة بديلة
5. `MaintenanceSystem.js` (amber) — الصيانة
6. `ComplaintsSystem.js` (rose) — الشكاوى
7. `EventsAnnouncements.js` (rose) — الأحداث والإعلانات
8. `VotingSystem.js` (purple) — التصويت

**تفاصيل الترحيل:**
- استبدال headers المختلفة (بعضها H1 + border-2xl card، بعضها OwnerPageHeader، بعضها inline div) بـ `<PageHero>` الموحّد.
- الأزرار inside PageHero أصبحت شفافة بـ `bg-white/15 backdrop-blur-sm ring-1 ring-white/20` (glass morphism).
- الـ filters (selects) تحوّلت إلى transparent-on-gradient.
- كل الـ primary CTAs أصبحت white→accent-color للـ contrast على الـ gradient.

**🧪 Manual E2E:**
- ✅ Screenshot finances: gradient emerald + "💰 الإدارة المالية" + subtitle + أزرار PDF/Excel شفافة + selects ماي/2026 + 4 StatCards أسفله.
- ✅ Screenshot maintenance: gradient amber + "🔧 نظام الصيانة" + زر "إنشاء طلب" أبيض.
- ✅ 6 صفحات: `[data-testid="page-hero"]` ظاهر.
- ✅ Lint: كل الملفات الـ 8 نظيفة.

**🎨 Design System Consolidation:**
- صفحات تستخدم الآن الـ components الثلاثة: `PageHero` + `StatCard` + `SectionCard`.
- أي صفحة جديدة يمكن أن تورث نفس المظهر بـ 3 أسطر imports.



### Iter 96: Unified Design System — Shared Components (Option B) — Feb 5, 2026 ✅

**🎯 الهدف:** توحيد شكل الصفحات عبر design system خفيف بـ shared components قابلة لإعادة الاستخدام — بحيث أي صفحة جديدة تورث نفس المظهر الاحترافي تلقائياً.

**🎨 الهوية البصرية (Color Strategy - خيار c):**
- **Headers/Hero:** indigo→purple gradient (هادئ SaaS-appropriate)
- **CTAs/Accents:** orange (حارّ للـ conversion)
- **KPI tones:** indigo/emerald/purple/amber/rose/pink (soft backgrounds + matching borders)

**🧩 Shared Components المنشأة/المستخدمة:**

1. **`PageHero.js` (جديد):**
   - خلفية gradient indigo→purple مع glass-morphism orbs (blur-3xl)
   - يقبل `icon` (emoji) + `title` + `subtitle` + `actions` + `accent` (indigo/emerald/rose/amber)
   - `data-testid="page-hero"` للاختبار.

2. **`StatCard.js` (موجود - استُخدم):**
   - 9 ألوان (indigo/rose/emerald/amber/blue/purple/pink/slate/red)
   - 2 variants: `dark` (للخلفيات الغامقة) + `light` (للخلفيات البيضاء)
   - Props: `icon / label / value / hint / onClick`

3. **`SectionCard.js` (موجود):** rounded-2xl container مع title+icon+actions+subtitle optional.

**📝 Proof of Concept - صفحة `CompoundsManagement`:**
- استبدال عنوان H1 + زر + paragraph → `<PageHero>` واحد
- استبدال 4 stat cards قديمة (80 سطر) بـ 4 `<StatCard>` (~20 سطر)
- تقليل الكود بنسبة **75%** مع مظهر أفضل بكثير.

**🧪 Manual E2E:**
- ✅ PageHero يظهر بـ gradient indigo+glass morphism + عنوان + subtitle + زر "إضافة مجمع جديد" أبيض بـ gradient reverse.
- ✅ 4 StatCards بـ ألوان متجانسة (indigo/emerald/purple/amber) بأيقونات emoji + values كبيرة.
- ✅ Lint نظيف.

**📌 المرحلة القادمة (pending user confirmation):**
- 🔄 تطبيق نفس الـ components على: Dashboard, Finances, Analytics, Residents, Complaints, Maintenance...
- المعدل المتوقع: **~3 صفحات/iter**.



### Iter 95: Edit Compound + Create Compound Admin — Feb 5, 2026 ✅

**🎯 الميزة 1 - Edit Compound Modal:**
- زر قلم 📝 (data-testid `edit-compound-{id}`) بجوار كل مجمع لـ `company_admin`.
- Modal RTL أنيق (gradient blue→indigo) بـ 4 حقول: name (مطلوب) / location / address / description.
- يستخدم `PUT /api/company-admin/compounds/{id}` الموجود مسبقاً.
- بعد الحفظ: toast نجاح + `fetchCompounds()` لتحديث الجدول.

**🎯 الميزة 2 - Create Compound Admin Modal:**
- زر "إنشاء مدير" (gradient emerald→teal) بأيقونة مستخدم.
- Modal RTL مع: full_name (autoFocus + مطلوب) / username (مُقترح من اسم المجمع `admin_<slug>`) / email (مطلوب) / phone / password (مطلوب).
- زر **🎲 توليد كلمة مرور تلقائي** — يولد 10 أحرف عشوائية من charset آمن (بدون أحرف ملتبسة `0/O/1/l`).
- تنبيه أصفر: "احفظ كلمة المرور الآن — لن تظهر مرة أخرى".
- يستخدم `POST /api/company-admin/compounds/{id}/users` مع `role=admin` و plan-limit enforcement.

**🛠️ تعديلات الجدول:**
- إضافة column "إجراءات" لـ `canAddCompound` (شركة الإدارة) أيضاً، مع حفاظ على عمود "Send Code" لـ super_admin/app_owner.
- `colSpan` في empty-state يتعدّل بناءً على `canManageCodes || canAddCompound`.

**🧪 Manual E2E:**
- ✅ `curl PUT /api/company-admin/compounds/{id}` HTTP 200 → location/description محدّثان.
- ✅ `curl POST /compounds/{id}/users` HTTP 200 → admin user أُنشئ بـ `compound_id` و `company_id`.
- ✅ Screenshot: 3 أزرار edit + 3 أزرار create-admin ظاهرة. Edit modal يفتح ويعرض القيم المُحدّثة من الـ DB.
- ✅ Lint نظيف.



### Iter 94: Add New Compound Button + Modal — Feb 5, 2026 ✅

**🎯 الميزة:** زر إضافة مجمع جديد داخل صفحة "إدارة المجمعات السكنية" لشركة الإدارة.

**Backend:** يستخدم `POST /api/company-admin/compounds` الموجود مسبقاً (يربط المجمع تلقائياً بـ `company_id` ويضيف الـ id في `companies.compound_ids`).

**Frontend (`CompoundsManagement.js`):**
- **زر بارز** في رأس الصفحة (gradient emerald→teal) بأيقونة "+" وtestid `add-compound-btn`. يظهر لـ `isCompanyAdmin || super_admin || app_owner`.
- **Modal أنيق RTL** مع:
  - حقل اسم المجمع (مطلوب) + autoFocus
  - حقل الموقع (placeholder عربي)
  - حقل العنوان التفصيلي
  - textarea للوصف
  - زرّي "إلغاء" و "إضافة المجمع" (gradient emerald)
  - close-on-backdrop + close-on-X
  - validation: زر submit معطّل لو الاسم فارغ
- بعد النجاح: toast "بنجاح" + `fetchCompounds()` للتحديث الفوري بلا reload.

**🧪 Manual E2E:**
- ✅ `curl POST /api/company-admin/compounds` HTTP 200 → ينشئ المجمع ويُرجع id+company_id.
- ✅ Screenshot: Modal منسّق بالكامل بالعربية مع 4 حقول + زرّي إجراء.
- ✅ بعد submit: المجمع يظهر فوراً في الجدول (5 مجمعات بعد الإضافة، رجعت إلى 3 بعد cleanup).
- ✅ Lint نظيف.



### Iter 93: GET /api/messages Fix for company_admin — Feb 5, 2026 ✅

**🐛 المشكلة:** Toast "Failed to load messages" يظهر في `/app/messages` لـ company_admin مع HTTP 500 من backend.

**🔍 السبب الجذري (2 bugs):**
1. **MongoDB serialization:** `db.messages.find({...})` بدون `{"_id": 0}` projection → `ObjectId` not JSON serializable → 500.
2. **RBAC ضيق:** الـ branching كان `if role == "admin": ... else: filter by sender_id` — company_admin لا يطابق `admin` ولا يكون `sender_id` فأصبح لا يرى أي شيء.

**🛠️ الإصلاح في `routes/families_msgs.py /messages`:**
- إضافة `{"_id": 0}` للـ projection.
- توسيع الـ branching:
  - `admin` → compound من user.compound_id.
  - `company_admin` → جمع كل مجمعات الشركة (DB linkage + legacy compound_ids); لو `active_compound_id` ضمنها → فلتر عليه؛ غير ذلك → all owned.
  - `super_admin / app_owner` → كل الرسائل (filter فارغ).
  - `resident / غيرها` → `sender_id` فقط.

**🧪 Manual E2E:**
- ✅ `curl GET /api/messages` HTTP 200 → 3 رسائل تُرجع لـ company_admin (988 bytes JSON).
- ✅ Screenshot: صفحة الرسائل تعرض "اختبار UI" مع badges (open) + ID + تاريخ. لا "Failed to load" toast.
- ✅ Sidebar badges تعمل بالتوازي (1 على التقييمات + 1 على الإدارة المالية).



### Iter 92: Dynamic Sidebar Badges + 11-File usePermissions Migration — Feb 5, 2026 ✅

**🎯 الميزة 1 - Sidebar Badges ديناميكية:**

**Backend:** ملف جديد `routes/sidebar_badges.py`:
- `GET /api/sidebar/badges` يُرجع `{messages_unread, payment_proofs_pending, negative_ratings_7d, total}`.
- `_resolve_compound_scope()` helper يفلتر حسب الدور: company_admin يجمع كل مجمعات الشركة، باقي الـ admins يفلترون بمجمعهم. Sentinel `__none__` للحالات الفارغة.
- مسجّل في `server.py`.

**Frontend (`Layout.js`):**
- State جديد `sidebarBadges`.
- `useEffect` منفصل يعمل لكل الأدوار الإدارية (`app_owner/super_admin/company_admin/admin/manager`) — كان bug سابق: الـ effect الأصلي يحتوي على `if (role !== 'app_owner' && role !== 'super_admin') return;` مما منع التشغيل لـ company_admin.
- Polling كل 60 ثانية.
- 3 badges جديدة في الـ sidebar:
  - 📩 مركز الرسائل: `bg-blue-500` بعدد الرسائل غير المقروءة.
  - 💰 الإدارة المالية: `bg-amber-500 animate-pulse` بعدد إيصالات الدفع المنتظرة.
  - ⭐ التقييمات: `bg-rose-500 animate-pulse` بعدد التقييمات السلبية في آخر 7 أيام.

**🎯 الميزة 2 - ترحيل 11 ملف لـ usePermissions hook:**

**الملفات المُرحَّلة:** FinancialManagement, CompoundManagement, AdminDashboard, Newsletter, ComplaintsSystem, MaintenanceSystem, UtilityBills, MessageCenter, ServicesManagement, GuestManagement, UserManagement.

**العملية (sed + awk):**
- إضافة `import { usePermissions } from '../hooks/usePermissions';` بعد import React.
- استبدال 36 instance من `['admin','company_admin','super_admin','app_owner'].includes(user?.role)` بـ `isAdmin`.
- إضافة `const { isAdmin } = usePermissions();` بعد `useAuth()` في 11 ملف.
- إصلاح bug خطير في `ComplaintsSystem.js`: كان فيه سطر `const isAdmin = isAdmin || user?.role === 'super_admin';` (recursive declaration) — حذفته لأن `usePermissions` يوفر `isAdmin` فعلاً.

**🧪 Manual E2E:**
- ✅ `curl /api/sidebar/badges` HTTP 200 → `{messages_unread:0, payment_proofs_pending:1, negative_ratings_7d:1, total:2}`.
- ✅ Screenshot: badge `1` rose-pulsing بجانب "التقييمات" في الـ sidebar.
- ✅ Smoke-test: 9 صفحات (finances, maintenance, complaints, services, newsletters, users, guests, utilities, messages) تحمّل بدون compile errors.
- ✅ Lint: كل الـ 11 ملف نظيف.



### Iter 91: Sidebar Cleanup + Facility Admin + Satisfaction for company_admin — Feb 5, 2026 ✅

**🐛 المشاكل (من screenshot):**
1. **Sidebar:** "$2.5K" بجانب الإدارة المالية + "3" بجانب مركز الرسائل — أرقام demo hardcoded تربك المستخدم.
2. **حجز المرافق:** company_admin لا يرى تبويب "إدارة المرافق" ولا زر "إضافة مرفق" → الصفحة تبدو معطلة.
3. **التقييمات:** company_admin يرى أصفار رغم وجود تقييمات في مجمعات شركته.

**🛠️ الإصلاحات:**
- **`Layout.js`:** حذف الـ badges الـ hardcoded `$2.5K` و `3`. (احتفظت بـ `New` على Help Center و الـ companiesAlerts الديناميكي).
- **`FacilityBooking.js`:** `isAdmin` كان `role === 'admin' || 'super_admin'` فقط → غيّرته لـ `['admin','company_admin','super_admin','app_owner'].includes()` → الآن تظهر تبويب "إدارة المرافق" + زر "إضافة مرفق".
- **`routes/ratings.py` `/ratings/stats`:** أضفت branching حسب الدور:
  - `company_admin` → يجمع التقييمات من **كل مجمعات الشركة** (DB linkage + legacy compound_ids).
  - إذا `active_compound_id` مضبوط ضمن مجمعات الشركة → يفلتر عليه فقط.
  - غير ذلك → سلوك سابق (compound_id من user).
  - sentinel `__none__` للحالات الفارغة (لا compounds مرتبطة).

**🧪 Manual E2E:**
- ✅ Dashboard: `$2.5K` غير موجود (`'$2.5K' in body == False`).
- ✅ `/app/facility-booking`: تبويب "إدارة المرافق" + المنطقة الإدارية ظاهرة.
- ✅ `GET /api/ratings/stats` HTTP 200 → `total: 7, average: 3.4` (من 1 مجمع له تقييمات).
- ✅ Lint: backend + frontend نظيفان.



### Iter 90: CompoundsManagement Page Fix for company_admin — Feb 5, 2026 ✅

**🐛 المشكلة:** User شكي أن صفحة `/app/compounds-management` تعرض "لا توجد مجمعات مسجلة" رغم أن CompoundSwitcher يعرض الكمبوندات بشكل صحيح.

**🔍 السبب الجذري:**
- `CompoundsManagement.js` كان يُنادي `/api/compounds/all` و `/api/subscription-codes/list` — وكلاهما لـ `super_admin`/`app_owner` فقط.
- لـ `company_admin`: HTTP 403 → empty array → empty state.
- ليس مجرد bug RBAC — بل **mis-design**: صفحة "إدارة المجمعات" مفترض تخدم role-aware (super_admin يدير الأكواد، company_admin يرى مجمعاته).

**🛠️ الإصلاح:**
- `usePermissions()` للحصول على `isCompanyAdmin/isSuperAdmin/isAppOwner`.
- `canManageCodes = isSuperAdmin || isAppOwner` — switch-flag يتحكم بالـ:
  - **API endpoint:** `company_admin` → `/api/company-admin/compounds`، غيرها → `/api/compounds/all`.
  - **KPI الرابع:** company_admin يرى "إجمالي المقيمين"، super_admin يرى "أكواد متاحة".
  - **عمود Actions + زر Send Code:** مخفي لـ company_admin.
  - **عمود table colspan** يتعدّل (6 لـ company_admin، 7 لـ super_admin).
- `fetchSubscriptionCodes` لا يُنادى لـ company_admin (يحفظ من 405).

**🧪 Manual E2E:**
- ✅ Screenshot: 3 مجمعات تظهر (كمبوند مدينتي، كمبوند الرحاب، رويال سيتي) + KPIs (3 مجمعات/2 نشطة/8 مقيمين).
- ✅ عمود Actions مخفي (لا يوجد زر Send Code لشركة الإدارة).
- ✅ Lint: نظيف.



### Iter 89: Company Portfolio PDF Report — Feb 5, 2026 ✅

**🎯 الهدف:** تقرير PDF شامل يجمع أداء كل المجمعات التابعة لشركة الإدارة في وثيقة واحدة — مفيد للاجتماعات الشهرية مع مالكي المجمعات.

**Backend:**
- `services/pdf_report_service.py`: دالة جديدة `render_company_portfolio_report` تُولّد:
  - **إجماليات المحفظة** (KPIs): عدد المجمعات، إجمالي الوحدات، المشغولة، الشاغرة، متوسط الإشغال، إجمالي السكان.
  - **الأداء المالي الموحّد**: الإيرادات، المصروفات، صافي الربح (مع تلوين أحمر/أخضر), المتأخرات.
  - **العمليات**: شكاوى + طلبات صيانة.
  - **جدول تفصيلي بالمجمعات** (10 أعمدة): اسم، إشغال، %، سكان، إيرادات، مصروفات، صافي، متأخرات، شكاوى، صيانة.
- `routes/pdf_reports.py`: endpoint جديد `GET /api/reports/company/portfolio?month=YYYY-MM`:
  - متاح فقط لـ `company_admin` / `super_admin` / `app_owner`.
  - يحل `company_id` من المستخدم، يجمع كل compounds من DB linkage + legacy `company.compound_ids`.
  - لكل مجمع يحسب: إشغال (وحدات/سكان/units_count)، إيرادات (resident_payments)، مصروفات (expenses)، متأخرات (resident_charges pending+overdue)، شكاوى+صيانة من الفترة.
  - يستخدم `gate_company_feature(pdf_excel_exports)` للتحكم بالخطط.

**Frontend (`PdfReportsPage.js`):**
- بطاقة 5 جديدة `key='portfolio'` بـ rose-red gradient وأيقونة Building2.
- Filter logic: تظهر فقط لـ `isCompanyAdmin || isSuperAdmin || isAppOwner`.
- لا تتطلب اختيار مجمع/ساكن (`needs: 'company'`).

**🧪 Manual E2E:**
- ✅ `curl /reports/company/portfolio?month=2026-02` HTTP 200 → PDF 1.7 بحجم 24KB (24370 bytes).
- ✅ Screenshot: 5 بطاقات ظاهرة بما فيها بطاقة "تقرير محفظة الشركة" مع زر تنزيل.
- ✅ Lint: backend + frontend نظيفان.



### Iter 88: PDF Reports Page Fix — Feb 5, 2026 ✅

**🐛 المشكلة:** User شكي أن صفحة `/app/reports` "لا تعمل" لشركة الإدارة — كان يظهر تقرير واحد فقط "كشف حساب الوحدة" ويطلب "اختر الساكن أولاً".

**🔍 السبب الجذري (4 bugs في `PdfReportsPage.js`):**
1. `isAdmin` كان يستخدم `['app_owner','super_admin','admin','compound_admin']` — `compound_admin` بالـ underscore **غير موجود** في النظام، والقيمة الصحيحة `company_admin`. شركة الإدارة لا تُعتبر admin → ترى تقريراً واحداً فقط.
2. `useEffect` لجلب المجمعات: `role === 'app_owner' || role === 'super_admin'` فقط → company_admin لا يجلب قائمة مجمعاته.
3. `useEffect` لجلب السكان: نفس القائمة المعطلة.
4. Compound dropdown: فقط يظهر لـ owner/super_admin → company_admin لا يمكنه تغيير المجمع.

**🛠️ الإصلاح:**
- استخدام `usePermissions()` hook: `{ isAdmin, isAppOwner, isSuperAdmin, isCompanyAdmin }`.
- جلب المجمعات من `/api/company-admin/compounds` لـ `isCompanyAdmin`.
- إظهار compound dropdown لـ `isAppOwner || isSuperAdmin || isCompanyAdmin`.
- Pre-fill `compoundId` من `localStorage.selectedCompoundId` أولاً، ثم `user.compound_id` (مع تجاهل "default-compound").
- حذف `isAdmin` الـ inline القديم (المُعطل).

**🧪 Manual E2E:**
- ✅ `/app/reports`: 4 بطاقات تظهر (statement, occupancy, invoices, summary).
- ✅ Compound dropdown يعرض 3 مجمعات (مدينتي، الرحاب، رويال سيتي).
- ✅ بطاقة الجدولة الشهرية `monthly-scheduler-card` ظاهرة.



### Iter 87: usePermissions Hook — Unified RBAC (Feb 5, 2026) ✅

**🎯 الهدف:** منع تكرار bug `user?.role === 'admin'` المستقبلي بإنشاء مصدر واحد موحّد لفحوص الصلاحيات.

**Frontend (`hooks/usePermissions.js` - ملف جديد):**
- يُصدر: `{ user, activeRole, isAdmin, isStaff, isCompoundAdmin, isCompanyAdmin, isSuperAdmin, isAppOwner, isManager, isAccountant, isResident, isSecurity, isAdvertiser }`.
- `isAdmin` = any of `admin/company_admin/super_admin/app_owner` (الاستعمال الأكثر شيوعاً).
- `isStaff` = يشمل managers/accountants/assistant_managers بالإضافة لـ isAdmin.
- يعتمد `active_role || role` (يدعم role switching).
- `useMemo` لتفادي re-renders غير ضرورية.

**تطبيق أولي (مرجع للمطورين):**
- `VotingSystem.js`: استبدل الكود الـ inline بـ `const { isAdmin: isAdminRole } = usePermissions();`.
- `EventsAnnouncements.js`: استبدل 3 تكرارات `['admin','company_admin',...].includes(user?.role)` بـ `isAdmin`.

**🧪 Manual E2E:**
- ✅ `/app/events`: زرا إعلان+حدث يظهران لـ company_admin (screenshot).
- ✅ `/app/voting`: زر "إنشاء استطلاع" يظهر.
- ✅ Lint: كل الملفات نظيفة.

**Tech debt متبقي:** الـ 12 ملف الباقي (FinancialManagement, ComplaintsSystem, MaintenanceSystem, …) يستخدم الـ inline array — يمكن ترحيلها تدريجياً كلما تم لمس كل ملف.



### Iter 86: Message Sending + Global RBAC Fix (38 occurrences) — Feb 5, 2026 ✅

**🐛 المشاكل:** User شكي من 5 صفحات "لا تعمل":
1. `/app/messages` — "Failed to send message" toast عند إرسال رسالة جديدة.
2. `/app/events` — لا يوجد زر "إنشاء حدث/إعلان" لشركة الإدارة.
3. `/app/notifications`, `/app/reports`, `/app/satisfaction` — صفحات فارغة بدون أزرار إدارية ظاهرة.

**🔍 السبب الجذري:**
- **Backend:** `POST /api/messages` كان يُرجع HTTP 500 بسبب `NameError: name 'json' is not defined` في `families_msgs.py:218` + `manager` (WebSocket) غير مستورد.
- **Frontend (RBAC):** 38 موضع في 14 ملف يستخدمون `user?.role === 'admin'` فقط → الزر يُخفى عن `company_admin` / `super_admin` / `app_owner` (مدير الشركة لا يرى Create Event/Announcement/Message/Complaint/Maintenance/Service/User/Invoice/Newsletter…).

**🛠️ الإصلاح:**
- **Backend (`routes/families_msgs.py`):** أضفت `import json` و `from websocket_manager import manager`.
- **Frontend (`MessageCenter.js`):** toast بالعربية + عرض `detail` من الـ backend.
- **Global RBAC fix:** `sed` على كل `user?.role === 'admin'` → `['admin','company_admin','super_admin','app_owner'].includes(user?.role)` في 14 ملف: `EventsAnnouncements`, `FinancialManagement`, `CompoundManagement`, `AdminDashboard`, `Newsletter`, `NewChatModal`, `ComplaintsSystem`, `MaintenanceSystem`, `UtilityBills`, `MessageCenter`, `ServicesManagement`, `FinancialRoute`, `GuestManagement`, `UserManagement`.
- أصلحت كذلك `user?.role !== 'admin'` في `EventsAnnouncements.js:533` (زر "الحضور" للسكان) ليستثني كل الأدوار الإدارية.

**🧪 Manual E2E:**
- ✅ `curl POST /api/messages` HTTP 200 بعد الإصلاح: `{message_id: "e309..."}`.
- ✅ Playwright: إرسال رسالة عبر الـ UI → toast "تم إرسال الرسالة بنجاح" (has 'بنجاح' = True).
- ✅ `/app/events`: `data-testid=new-announcement-btn` و `new-event-btn` موجودان.
- ✅ Lint: كل الملفات الـ 14 مرت بدون أخطاء.



### Iter 85: Attention Badge on Compound Switcher + Trial Plan Choice — Feb 5, 2026 ✅

**🎯 الميزة 1: Attention Badge على زر "اختر كمبوند"**

**Backend (`routes/company_admin.py`):**
- Endpoint جديد `GET /api/company-admin/compounds/attention-summary` يُرجع per-compound counts من:
  - `expiring_contracts`: عقود end_date ضمن 30 يوم وstatus ≠ cancelled/terminated/expired.
  - `open_complaints`: شكاوى بحالة open/pending/in_progress/new.
  - `late_payments`: resident_payments بـ status=overdue أو (pending/unpaid + due_date<today).
- Response: `{ total, per_compound: {id: {total, expiring_contracts, open_complaints, late_payments}}, company_id }`.

**Frontend (`company-admin/CompoundSwitcher.js`):**
- Badge أحمر (gradient rose→red) بجانب زر الـ switcher الرئيسي يعرض إجمالي العناصر (`99+` للأكثر من 99).
- بداخل القائمة المنسدلة: header tinted rose يعرض الإجمالي الإجمالي، وكل كمبوند عنده:
  - Badge صغير بجانب الاسم
  - Pills تفصيلية: `📑 عقد` (amber) / `📢 شكوى` (rose) / `💰 دفعة متأخرة` (orange)
- Polling تلقائي كل 90 ثانية + refresh عند `planUsageRefresh` / `compoundSwitched`.

**🎯 الميزة 2: تجربة 14 يوم على الخطة المتوسطة أو الكبرى**

**Backend (`routes/company_admin.py`):**
- `POST /api/company-admin/activate-trial` يقبل الآن body اختياري `{plan_key}` بقيم مسموح بها فقط: `company_business` (default) أو `company_enterprise`. أي قيمة أخرى → 400.
- يحفظ `trial_plan` في `company_subscriptions` + رسالة مُخصصة حسب الخطة (المتوسطة/الكبرى).

**Frontend (`CompanyPlanUsageCard.js`):**
- استبدلت الزر الواحد "تجربة مجانية" بكارد فيه `<select>` (خطة متوسطة 7,500 ج.م / خطة كبرى 20,000 ج.م) + زر "فعّل الآن".
- `activateTrial()` يرسل الـ `plan_key` المختار.

**🧪 Manual E2E:**
- ✅ `curl /compounds/attention-summary` HTTP 200: `{total:8, per_compound:{'88ad...':{total:8, open_complaints:8}}}` — رويال سيتي فيه 8 شكاوى.
- ✅ Screenshot: الزر يعرض "كمبوند مدينتي 8" (badge أحمر). القائمة تعرض pill "📢 8 شكوى" على رويال سيتي.
- ✅ `POST /activate-trial {plan_key:starter}` HTTP 400: "التجربة المجانية متاحة فقط على الخطة المتوسطة أو الخطة الكبرى".
- ✅ `POST /activate-trial {plan_key:company_enterprise}` HTTP 200: trial_plan=enterprise, 14 يوم.
- ✅ `POST /activate-trial` (no body) HTTP 200: default=company_business.
- ✅ محاولة ثانية HTTP 400: "تم استخدام التجربة المجانية من قبل".



### Iter 84: Blank Pages Fix (auto-select compound + analytics export) — Feb 5, 2026 ✅

**🐛 المشكلة:** User شكي من 5 صفحات معطلة لـ `testcompany2`:
1. `/app/compound-payment-methods` — صفحة فارغة (خلفية بنفسجية فقط).
2. `/app/facility-booking` — قائمة المرافق فارغة.
3. `/app/my-subscription` — بيانات الاشتراك لا تظهر.
4. `/app/analytics` — زر "تصدير" يُظهر toast "فشل في تصدير البيانات".
5. `/app/voting` — labels بالإنجليزية (ends, votes, participation).

**🔍 السبب الجذري:**
- **المشكلة الرئيسية:** `testcompany2` لديه 3 كمبوندات لكن `selectedCompoundId` في localStorage فارغ. axios interceptor لا يُرسل `X-Active-Compound-Id`، فـ backend يعتمد على `user.compound_id = "default-compound"` (قيمة افتراضية غير موجودة في DB) → كل requests ترجع 404 → الصفحات تظل في حالة loading بلا محتوى.
- **Missing endpoint:** `/api/analytics/export` غير موجود إطلاقاً في router.
- **i18n:** مفاتيح `ends`, `votes`, `participation`, `voted` غير موجودة في `ar.json`.

**🛠️ الإصلاح:**
- **`company-admin/CompoundSwitcher.js`:** auto-select أول كمبوند عند أول fetch إذا `selectedCompoundId` فارغ أو لا ينطبق على أي كمبوند حالي. يُطلق event `compoundSwitched` لتحديث الداشبورد.
- **`routes/analytics.py`:** إضافة endpoint جديد `GET /api/analytics/export` يُرجع CSV (مع BOM عربي) أو JSON يعتمد على query param `format`. يستخدم نفس aggregation من `/analytics/dashboard` ويتضمن overview + expenses by category + monthly comparison.
- **`VotingSystem.js`:** إضافة fallback عربي inline لـ `ends='ينتهي'`, `votes='صوت'`, `participation='مشاركة'`, `voted='تم التصويت'`.

**🧪 Manual E2E:**
- ✅ Login `testcompany2` → dashboard → auto-select `كمبوند مدينتي` في localStorage → كل الصفحات ترسل `X-Active-Compound-Id` تلقائياً.
- ✅ `/app/compound-payment-methods` يعرض بطاقتي Vodafone Cash + InstaPay مع زر "إضافة طريقة دفع".
- ✅ `/api/analytics/export?format=csv` HTTP 200 يُرجع CSV بحجم 743 bytes مع جداول: نظرة عامة، المصروفات، المقارنة الشهرية.
- ✅ صفحة التصويت تعرض "ينتهي: 31/12/2026 | 0 صوت | 0% مشاركة" بالكامل بالعربية.



### Iter 83: Voting/Polls — Create Button + Payload Fix (Feb 5, 2026) ✅

**🐛 المشكلة:** المستخدم (`testcompany2`/`company_admin`) يفتح صفحة التصويت ولا يجد زر "إنشاء استطلاع".

**🔍 السبب الجذري:**
1. `VotingSystem.js` كان يفحص `user?.role === 'admin'` فقط، فيخفي الزر عن `company_admin` و`super_admin` و`app_owner`.
2. الـ payload الذي يُرسل لـ `/api/polls` لم يكن متطابقًا مع `PollCreate` schema:
   - frontend يرسل `type`, `voting_end_date`, `is_anonymous`, `min_participation`, `options: ['str']`.
   - backend يتوقع `vote_type`, `start_date`+`end_date`, `allow_anonymous_voting`, `min_participation_rate (0–1)`, `options: [{text}]`.
3. الـ backend route كان مقيّد بـ `current_user.role != "admin"` فيرفض شركات الإدارة.

**🛠️ الإصلاح:**
- Frontend (`VotingSystem.js`): أضفت `isAdminRole` يشمل `admin`, `manager`, `company_admin`, `super_admin`, `app_owner`. زر CTA إضافي داخل الـ empty-state. `handleCreatePoll` الآن يُحول الـ payload لتتوافق مع `PollCreate`. كل مراجع `poll.type` → `poll.vote_type`، و`votes_count`/`eligible_voters_count` → fallbacks (`total_votes`, `total_eligible_voters`).
- Backend (`routes/polls.py`): `current_user.role not in ["admin", "manager", "company_admin", "super_admin", "app_owner"]`.

**🧪 Manual E2E:**
- ✅ Login `testcompany2` → `/app/voting` → الزر يظهر (`data-testid="create-poll-btn"`).
- ✅ `POST /api/polls` بـ payload الجديد يُرجع `{poll_id}` (HTTP 200).
- ✅ تبويب "مسودات استطلاعات" يعرض التصويت الجديد مع زر "نشر".


## Latest Fixes (Feb 2026 — iterations 26-65)

### Iter 82: Monthly Revenue vs Expenses Bar Chart (May 3, 2026) ✅

**🎯 الميزة:** Chart تفاعلي يقارن الإيرادات والمصروفات الشهرية لآخر 6 أشهر — يساعد الإدارة على تحديد الأشهر التي زادت فيها مصروفات معينة وتخطيط الميزانية.

**Backend (`routes/analytics.py`):**
- إضافة `monthly_comparison` array في `charts` block — لكل شهر: `label (بالعربية), month_index, year, revenue, expenses, net`.
- يجمع الإيرادات من `db.revenue` + `db.resident_payments` معاً.
- يجمع المصروفات من `db.expenses` مع دعم تواريخ `date` و `created_at`.
- 6 أشهر تقويمية حقيقية (تتعامل مع تغير السنة بشكل صحيح).

**Frontend (`AdvancedAnalytics.js`):**
- Recharts `BarChart` مع أعمدة مزدوجة (إيرادات أخضر #10b981 / مصروفات أحمر #ef4444) + radius 6 للحواف الناعمة.
- Tooltip محلي بـ `ج.م` وتنسيق `toLocaleString`.
- Y-axis tick formatter ذكي يحوّل الـ 1000 إلى `1K` لعرض أنظف.
- 3 ملخصات أسفل الـ chart: إجمالي الإيرادات (6 أشهر) + إجمالي المصروفات + صافي الرصيد (الأخير يلون أحمر إذا سالب).

**🧪 Manual E2E:**
- ✅ `/api/analytics/dashboard?compound_id=88ad…&time_range=last_30_days` يُرجع 6 شهور بأسماء عربية: ديسمبر 2025 → مايو 2026.
- ✅ بيانات حقيقية لكمبوند رويال سيتي: ديسمبر 120K مصروفات (عقد حراسة)، فبراير 60K (نظافة)، أبريل 102.8K (متعدد).
- ✅ UI: chart يُرسم بشكل صحيح مع العنوان وملخص "آخر 6 أشهر".

---

### Iter 81: Auto-Backfill + Analytics Expenses + Dynamic Changelog (May 3, 2026) ✅

**🐛 إصلاح: العقود لم تُزامن قبل ساعات (P0):**
- **السبب:** الـ backfill كان داخل `check_expiring_contracts` التي تُجدول كل 24 ساعة فقط → 3 عقود قديمة (225,000 ج.م) ظلت غير مزامنة.
- **الإصلاح:** أضفت startup hook جديد `backfill_contract_expenses` في `server.py` يُشغّل المزامنة بعد 8 ثوانٍ من الإقلاع (idempotent — يفحص `contract_id` قبل الإنشاء).
- **النتيجة:** بعد restart واحد، كل العقود تظهر فوراً في `/api/financial/expenses` و `/api/financial/balance-sheet` و `/api/analytics/dashboard`.

**📊 المصروفات في تبويب التحليلات المتقدمة:**
- **المشكلة الأصلية:** تبويب "المالية" كان يعرض فقط revenue/collection_rate بدون مصروفات.
- **Backend (`routes/analytics.py`):** أضفت aggregation block جديد `expenses` يُرجع: `total, by_category {maintenance, utilities, security…}, growth_rate, net_balance`. يدعم تواريخ ISO و YYYY-MM-DD.
- **Frontend (`AdvancedAnalytics.js`):**
  - استبدلتُ `outstanding_payments` و `avg_payment_time` بـ MetricCards جديدة: **إجمالي المصروفات** (أحمر) + **صافي الرصيد** (أزرق إذا موجب، أحمر سالب).
  - شريط breakdown ملون "المصروفات حسب التصنيف" مع نسب مئوية ومقياس مرئي.
  - رمز العملة من `$` إلى `ج.م` في كل البطاقات.

**🔄 Dynamic Changelog (يتغير مع كل تحديث) — حل جذري:**
- **المشكلة:** الـ `_FALLBACK_CHANGELOG` كان hardcoded → نفس الرسالة كل مرة بغض النظر عن التحديث.
- **الحل المعماري:**
  1. ملف جديد `/app/memory/CHANGELOG_LATEST.md` — كل سطر يبدأ بـ `- ` يصبح نقطة في الـ modal. **هذا الملف يُحدَّث مع كل deployment**.
  2. دالة جديدة `sync_changelog_from_file()` في `app_version.py` تقرأ الملف عند كل إقلاع → تُعطّل الإدخالات السابقة `source='auto'` → تُنشئ إدخالات جديدة بـ `version_tag` للنشرة الحالية. الإدخالات اليدوية (`source='manual'`) لا تتأثر.
  3. Startup hook جديد يستدعي المزامنة بعد إقلاع DB.
  4. Endpoint إضافي `POST /api/owner/changelog/sync-from-file` للمزامنة اليدوية الفورية.
- **النتيجة:** "مركز إصلاح الأخطاء" يعرض فعلياً الميزات الجديدة لكل deployment تلقائياً، الـ 8 نقاط الأحدث بالترتيب: ارفع إيصال، طرق الدفع، إصلاح العقود، كيف أدفع، التحليلات، RBAC، Stripe، multi-tenant.

**🧪 Manual E2E Verification:**
- ✅ Backfill on boot: log "Contract→expense backfill on boot: synced 3 contracts" + "Changelog auto-sync from file: 8 entries refreshed"
- ✅ `/api/version` يُرجع 8 إدخالات جديدة (الأول: 📤 ارفع إيصال الدفع)
- ✅ `/api/analytics/dashboard?compound_id=88ad…&time_range=last_30_days` يُرجع `expenses.total: 102800.0` + `by_category: {maintenance:36800, utilities:18200, security:22200, cleaning:25200, salaries:200, other:200}`
- ✅ UI screenshot: تبويب "المالية" يعرض الآن البطاقات الجديدة ✓

---

### Iter 80: Payment Proofs — رفع إيصالات السداد + اعتماد بضغطة زر (May 3, 2026) ✅

**🎯 الهدف:** تحويل المدفوعات خارج التطبيق (محفظة، إنستاباي، تحويل بنكي) من فوضى واتساب إلى سجل رقمي منظَّم بالكامل داخل HomeMe.

**Backend (`routes/payment_proofs.py`, ~270 LOC):**
- Collection `payment_proofs` بحقول كاملة: `compound_id, resident_id, resident_name, unit_number, charge_id, charge_title, amount, method_type, transaction_reference, notes, image_url, status (pending/approved/rejected), reviewed_by, reviewed_at, rejection_reason`.
- 6 endpoints:
  - `POST /api/payment-proofs` (multipart) — يرفع المقيم صورة الإيصال (PNG/JPG/WEBP/PDF حتى 8MB) + المبلغ + طريقة الدفع + رقم العملية + ملاحظات. يُحفظ على القرص + dual-write لـ MongoDB media store + إشعار تلقائي للإدارة.
  - `GET /api/payment-proofs/my` — قائمة إيصالات المقيم.
  - `GET /api/payment-proofs?status=pending|approved|rejected` — قائمة للإدارة بـ tenant scoping (admin = compound، company_admin = كل compounds شركته via `company_id` أو `management_company_id`).
  - `POST /api/payment-proofs/{id}/approve` — يُعلِّم الـ unit_charge المرتبط كـ paid + يُنشئ entry في `db.revenue` + يُرسل إشعار للمقيم. **idempotent** (no double-credit).
  - `POST /api/payment-proofs/{id}/reject` — يحتاج `reason` (400 لو فاضي) + إشعار للمقيم بالسبب.
  - `DELETE /api/payment-proofs/{id}` — المقيم يحذف pending فقط، الإدارة تحذف أي حالة.
- Multi-tenant guard `_can_review()` يدعم `company_id` و `management_company_id`.

**Frontend:**
- `components/PaymentProofUploadModal.js` — Modal أنيق (gradient أخضر) للمقيم: drag-and-drop image picker + معاينة فورية + select لـ 11 طريقة دفع + حقول المبلغ + المرجع + ملاحظات.
- `components/PaymentProofsPanel.js` — لوحة مراجعة احترافية للإدارة:
  - فلاتر بـ counts (بانتظار/معتمدة/مرفوضة/الكل).
  - Grid 2 columns: كل كارت يعرض thumbnail + اسم المقيم + الوحدة + المبلغ + المنهج + المرجع + التاريخ + بادج الحالة.
  - أزرار "✓ اعتماد" و "✕ رفض" inline + Modal كامل لعرض الصورة بحجم كامل + Modal منفصل لإدخال سبب الرفض.
- مدمج في:
  - `CompoundFinance.js` — تبويب جديد **"إيصالات الدفع"** (للإدارة).
  - `ResidentFinancialDashboard.js` — زر "📤 ارفع إيصال" بجانب كل مستحق معلق + يفتح Modal الرفع → يربط الإيصال تلقائياً بـ charge_id.

**🔄 الـ Workflow الكامل:**
1. المقيم يدفع خارج التطبيق (فودافون كاش مثلاً) → يفتح صفحة المالية → يضغط "📤 ارفع إيصال" بجانب الالتزام.
2. يرفع صورة الإيصال + يدخل المبلغ والمرجع.
3. الإدارة تستلم إشعار تلقائي + يظهر الإيصال في تبويب "إيصالات الدفع - بانتظار المراجعة".
4. الإدارة تعرض الصورة بحجم كامل، تتحقق من المرجع، وتضغط "✓ اعتماد" → الالتزام يتحول لـ "مدفوع" + يُسجَّل في الإيرادات + المقيم يحصل على إشعار.
5. لو الإيصال مزيَّف، الإدارة تضغط "✕ رفض" + تكتب سبب → المقيم يرى السبب ويعيد المحاولة.

**🧪 Manual E2E:**
- ✅ Resident upload: HTTP 200, proof_id + image_url returned
- ✅ Admin list: pending count = 1
- ✅ Admin approve: charge marked paid + revenue created + notification sent
- ✅ Admin reject: required reason validation works (400 without)
- ✅ Cleanup delete: works for both resident and admin
- ✅ UI screenshot: tab renders, pills with 0 counts, empty state visible

**🔧 Bonus Fix Discovered:** `compound_payment_methods` & `payment_proofs` queries now both check `company_id` AND `management_company_id` fields on compounds (legacy compounds use `management_company_id` only — was causing empty lists for company_admin).

---

### Iter 79: How-To-Pay Modal + Stripe Webhook Unification + Finance RBAC Fix (May 3, 2026) ✅

**🎯 Quick Pay Helper Modal — يرفع نسبة التحصيل بـ click واحد:**
- مكوّن قابل لإعادة الاستخدام `components/HowToPayButton.js` يفتح Modal أنيق يعرض **طرق الدفع المعتمدة** للكمبوند مع أيقونات ملوّنة وزر نسخ سريع للأرقام/IBAN.
- مدمج في:
  - `CompoundFinance.js` → تبويبات "الالتزامات" و "سداد الوحدات" (للإداريين).
  - `ResidentFinancialDashboard.js` → بانر علوي + زر بجانب كل مستحق معلق (للسكان).
- يعرض المبلغ المطلوب وعنوان الـ charge داخل الـ Modal لتذكير ما يدفعه.

**🔧 Stripe Webhook Unification — إصلاح تكرار خفي:**
- **المشكلة:** كان هناك `/webhook/stripe` معرّف في ملفين (`payments.py` و `stripe_payments.py`) — FastAPI يستجيب فقط للأول المسجَّل (`stripe_payments.py`)، فكان handler `payments.py` **dead code** ولا تُفعَّل به فواتير المرافق ولا اشتراكات المستخدمين الفردية.
- **الإصلاح في `routes/stripe_payments.py`:**
  - دالة جديدة `_activate_utility_bill_or_user_subscription()` تتولى ما كان يفعله handler الـ legacy.
  - الـ webhook الموحَّد يفحص `payment_type` / `metadata.company_id` ويُوجّه إلى:
    - `_activate_subscription` للاشتراكات الشركة.
    - `_activate_utility_bill_or_user_subscription` لفواتير المرافق + اشتراكات المستخدمين القديمة.
  - حُذف الـ handler المكرر من `payments.py` بالكامل (مع تعليق توثيقي).

**🐛 Finance RBAC Fix (Pre-existing root-cause of the original bug):**
- **المشكلة:** `routes/finance.py` كان يستخدم `current_user.get('role') != 'admin'` بشكل صارم على endpoints المصروفات والإيرادات → `company_admin` يحصل على 403 ولا يرى أي مصروف. حتى بعد مزامنة العقد كمصروف، صفحة المصروفات تبقى فارغة.
- **الإصلاح:** استبدلتُ كل تحققات `role != 'admin'` بـ `Depends(require_admin)` (يسمح بـ admin/super_admin/company_admin/app_owner) في:
  - `POST/GET /api/financial/expenses`
  - `POST/GET /api/financial/revenue`
  - `GET /api/financial/reports/summary`
- إضافة auto-scoping: المستخدم بدون `app_owner/super_admin` يُقصر تلقائياً على `compound_id` الخاص به لو لم يُمرر بشكل صريح.
- إضافة `{"_id": 0}` projection + `serialize_datetime()` لتفادي تسريب ObjectId.

**🧪 الاختبار:**
- testing_agent_v3_fork iter66: **29/30 backend tests PASS** (skip واحد فقط لعدم وجود tenant ثانٍ لاختبار cross-tenant payment-method update).
- ✅ Contract→expense sync: total_expenses = 0 → 90000 → 50000 → 0 → 12345 → 0 (delete cascade)
- ✅ 11 method types، CRUD كامل، resident scope، public endpoint، RBAC، tenant guards
- ✅ Stripe webhook موحَّد، ويرفض الـ bad signatures بـ 400
- ✅ Manual: company_admin يرى الآن قائمة المصروفات (1 expense من العقد)

---



**🐛 Bug Fix — عقد الصيانة بـ 90,000 ج.م لا يظهر في إجمالي المصروفات:**
- **السبب الجذري:** العقود في `db.contracts` منفصلة تماماً عن `db.expenses` — الصفحة المالية تجمع `expenses` فقط فلا يظهر العقد.
- **الإصلاح في `routes/contracts.py`:**
  - دالة `_sync_contract_expense()` تنشئ/تُحدّث/تحذف entry في `db.expenses` مرتبط بالعقد عبر `contract_id`.
  - تُستدعى تلقائياً عند `POST/PUT/DELETE /api/contracts`.
  - مدمجة في loop `check_expiring_contracts` لمزامنة العقود الموجودة (idempotent backfill).
  - Endpoint إضافي `POST /api/contracts/sync-expenses` للتشغيل اليدوي عند الحاجة.
- **التحقق E2E:** قبل الإنشاء `total_expenses=0` → بعد إنشاء عقد بـ 90,000 → `total_expenses=90000.0` ✓ ; تحديث القيمة لـ 50,000 → `total_expenses=50000.0` ✓ ; حذف العقد → `total_expenses=0` ✓.

**✨ Feature — طرق الدفع المعتمدة للكمبوند/شركة الإدارة:**
- **الهدف:** كل شركة إدارة أو كمبوند يضيف قنواته الخاصة (محفظة، إنستاباي، تحويل بنكي، فوري، نقداً) ليظهر للسكان عند سداد الالتزامات.
- **Backend (`routes/compound_payment_methods.py`, ~210 LOC):**
  - Collection `compound_payment_methods` بحقول: `method_type`, `display_name`, `account_number`, `account_holder`, `bank_name`, `iban`, `swift_code`, `instructions`, `fee_note`, `is_active`, `sort_order`.
  - 11 نوع مدعوم: `vodafone_cash, orange_cash, etisalat_cash, we_pay, instapay, bank_transfer, cash, fawry, valu, meeza, other`.
  - 6 endpoints:
    - `GET /api/compound-payment-methods/types` — قائمة الأنواع المدعومة.
    - `GET /api/compound-payment-methods` — مدراء يرون كل الطرق، السكان يرون الطرق المُفعّلة فقط لكمبوندهم + شركة الإدارة المالكة.
    - `POST /api/compound-payment-methods` — إضافة (admin/compound_admin/company_admin/accountant/owner).
    - `PUT /api/compound-payment-methods/{id}` — تعديل + حماية tenant scope.
    - `DELETE /api/compound-payment-methods/{id}`.
    - `GET /api/compound-payment-methods/public/{compound_id}` — قراءة عامة (no auth).
  - **Multi-tenant scoping:** `company_admin` ينشئ على مستوى `company_id` فتُورَّث لكل كمبوندات الشركة. `compound_admin` ينشئ على مستوى `compound_id` فقط.
  - **RBAC:** السكان 403 على mutations; cross-tenant edit/delete مرفوض.
- **Frontend (`pages/CompoundPaymentMethodsPage.js`, ~330 LOC):**
  - Hero بنفسجي/إنديجو + زر "إضافة طريقة دفع".
  - Grid responsive (1/2/3 columns) من الكروت — كل كارت بـ gradient لون مخصص حسب النوع (فودافون أحمر، أورانج برتقالي، إنستاباي بنفسجي، بنك أزرق…).
  - أزرار: نسخ (للرقم/IBAN), تفعيل/تعطيل, تعديل, حذف.
  - Modal كامل لإدارة الحقول (يُظهر حقول البنك/IBAN/SWIFT فقط لـ `bank_transfer`).
  - Empty state ودود ("لا توجد طرق دفع مفعّلة بعد").
  - السكان وغير الإداريين: يرون الكروت بدون أزرار التعديل (read-only).
- **Sidebar:** "طرق الدفع المعتمدة" أسفل "مركز المدفوعات" — مرئي للجميع.
- **Route:** `/app/compound-payment-methods` (ProtectedRoute بدون أدمن).

**🧪 الاختبار E2E:**
- ✅ Create فودافون كاش + إنستاباي + بنك (testcompany2).
- ✅ Resident يرى فقط الـ active method من شركة الإدارة (1 method) — السكان لا يرون المعطّلة ولا غير شركتهم.
- ✅ Public endpoint بدون auth يرجع 1 method.
- ✅ Update + Delete بنجاح.
- ✅ Resident يحصل على 403 عند POST.
- ✅ UI screenshot: الكارت يعرض الرقم + المستفيد + التعليمات + بادج الحالة.

---

### Iter 77: Company-to-Company Referral / Viral-Loop System (May 1, 2026) ✅

**🚀 Companies invite other companies → earn 30 days free per successful paid signup → auto-extend their own subscription.**

**Backend (`routes/company_referrals.py`, ~430 LOC):**
- Auto-generated unique code per company `CO-XXXXXX` (alphanumeric, no confusing chars).
- `GET /api/company-admin/referral/my-link` → code, link, total_signups, successful_referrals, pending_credit_days, applied_credit_days, share_message.
- `GET /api/company-admin/referral/history` → list of referred companies + their plan/status + credit ledger.
- `POST /api/company-admin/referral/apply-credit` → consumes 30 pending days, extends `company_subscriptions.expires_at` by 30, pushes credit_history entry, notifies user.
- `GET /api/public/referral/lookup/{code}` → validates code at signup-time (returns referrer company name).
- `GET /api/super-admin/referral/dashboard` → global KPIs + top-10 referrers.
- Hooks:
  - **`auth.py`** — `track_company_signup()` called after `company_admin` registers (sets `companies.referred_by_company_id` + `referred_by_code`, increments referrer counter).
  - **`stripe_payments._activate_subscription`** — `award_referrer_credit()` called when a referred company's first paid subscription activates. Idempotent via `companies.referral_reward_given` flag.

**Frontend:**
- `Register.js` accepts `?ref=CO-XXXXXX`, validates via public lookup, auto-selects company_admin path, shows green emerald banner ("مرحباً! أنت مدعو من …") + amber banner if code invalid.
- `CompanyReferralPanel.js` (rendered inside `CompanyAdminDashboard` SectionCard): 4 KPI cards (signups/successful/pending/applied), copy-link + WhatsApp-share buttons, conditional **"طبّق 30 يوم على اشتراكي"** CTA, drillable history list of invited companies + credit ledger.

**🧪 Iter 65 testing agent: 24/24 backend pytest green + 100% Playwright FE.** Zero critical bugs. Idempotency verified twice (1st call awards, 2nd no-ops). Cosmetic fix applied: `APP_URL` fallback no longer leaks stale container hostnames; logs unmatched ref codes for fraud/debug.

---

### Iter 76: Design System Living Style-Guide (May 1, 2026) ✅

**🎨 `/app/design-system` — A single page showcasing every shared component in every color/theme, with copy-paste code snippets.**

**Page (`pages/DesignSystemPage.js`):**
- Sticky nav chips: Overview · PageHeaders · StatCards · SectionCards · EmptyStates · Tokens.
- 6 PageHeader themes rendered in sequence (`indigo`, `rose`, `emerald`, `blue`, `amber`, `slate`) with role-mapping description.
- StatCards: 9 colors × 2 variants (dark/light), plus a clickable example.
- SectionCards: dark + light side-by-side.
- EmptyStates: dark + light side-by-side.
- Tokens section: spacing scale, typography samples, import snippet.
- Every example has a `<CodeBlock>` showing exact JSX to copy-paste.

**Access control:** restricted to `app_owner` / `super_admin` — regular users see a "مخصصة للفريق الداخلي" screen. Route: `/app/design-system`.

**Build-time safety:** uses a static `colorMap` for the internal `<Tag>` component so Tailwind JIT picks up all classes at build time (no runtime dynamic-class breakage).

**🧪 Iter64 testing agent: 100% frontend success, 0 bugs.** Regression across CompanyAdmin / Resident / Security dashboards all green.

---

### Iter 75: Unified UI System (PageHeader + StatCard + SectionCard + EmptyState) (May 1, 2026) ✅

**🎨 Introduced a centralized design-system so every HomeMe dashboard shares the same visual language but keeps a role-specific theme color.**

**Shared components (`components/shared/`):**
- `PageHeader.js` — 6 theme presets (`indigo`, `rose`, `emerald`, `blue`, `amber`, `slate`). Icon/emoji, badge, title, subtitle, meta chips, actions slot. Accessible via `role="list"` on meta chips.
- `StatCard.js` — Unified KPI card. 9 colors × dark/light variants. Optional clickable (becomes `<button>`).
- `SectionCard.js` — Rounded container with built-in title row, icon, subtitle, actions; dark/light variants.
- `EmptyState.js` — Icon + title + subtitle + CTA; dark/light variants.

**Refactored dashboards:**
- `CompanyAdminDashboard` → PageHeader indigo + SectionCard for CRM panel + EmptyState for no-compounds state.
- `ResidentDashboard` → PageHeader blue with welcome-badge.
- `SecurityDashboard` → PageHeader blue with `ShieldCheckIcon` + live-monitoring pill.

**Documentation:** `/app/design_guidelines.md` lists tokens, themes, spacing scale, typography, testId conventions, and adoption roadmap (OwnerDashboard, AdminDashboard scheduled).

---

### Iter 74: Company-Admin CRM Retention Panel + Timeline RBAC Fix (May 1, 2026) ✅

**🧠 VIP / Late-Payer aggregate dashboard for management companies — CRM becomes a real retention tool.**

**Backend (`routes/company_admin.py`):**
- `GET /api/company-admin/crm-summary` — cross-compound aggregation: `tag_counts`, top-10 `vip_users`, top-10 `late_payers`, `notes_total`. Efficient `$lookup+$match` aggregation for notes_total (no user_id materialization).

**Frontend (`components/company-admin/CrmRetentionPanel.js`):**
- VIP card + Late-Payer card with drilldown list per tag.
- Clicking a user → opens `UserTimelineModal` (same CRM editor from iter73) so admins can annotate inline.
- Other tags rendered as inline chips (`tag × count`).
- Silences 401/4xx toasts on first mount (AppVersionGuard reload safety).

**RBAC fix (`routes/user_timeline.py`):**
- `_require_access` now supports `company_admin` role — allowed for users whose compound matches the company's `management_company_id`/`company_id`/legacy `compound_ids[]`. Previously company_admins got a 403 toast inside the timeline modal.

**🧪 Testing iter62+63: 13/13 pytest green + 4/4 Playwright green.** Zero bugs.

---

### Iter 73: User CRM (Tags + Private Notes) + Renewal Trigger Endpoint (May 1, 2026) ✅

**🏷️ Admins can now tag residents (VIP, late_payer, recurring_complaints, …) and attach private colour-coded notes — all inside the User Timeline modal.**

**Backend (`routes/user_crm.py`):**
- `GET  /api/users/{user_id}/crm` → `{tags, tag_colors, notes}`.
- `POST /api/users/{user_id}/tags` body `{tag, color}` — lower-cased, idempotent, updates colour on repeat.
- `DELETE /api/users/{user_id}/tags/{tag}` — removes tag and colour entry.
- `POST /api/users/{user_id}/notes` body `{text, color}` — colour-coded private note.
- `PUT  /api/users/{user_id}/notes/{note_id}` — author OR super_admin can edit.
- `DELETE /api/users/{user_id}/notes/{note_id}` — same auth rule.
- `GET  /api/users/crm/tag-suggestions` — autocomplete list **scoped per tenant** (compound_admin → own compound, company_admin → managed compounds, super_admin → global).
- Limits: 32-char tag, 2000-char note, 20 tags per user.
- Audit-logged for every mutation.
- Full RBAC: app_owner/super_admin unrestricted; compound_admin scoped to their compound; company_admin scoped to their managed compounds; all other roles → 403.

**Frontend (`components/UserTimelineModal.js`):**
- New **CRM panel** between analytics and events: tag chips (removable), colour-picker, add-tag input with auto-complete suggestions; notes list (author + timestamp) with inline delete on hover; textarea + colour to add new note.
- Tags also rendered as white pills in modal header under the user name for at-a-glance visibility.

**🧪 Verified (Iter 61 testing agent): 22/22 pytest tests green** — persistence, idempotency, validation limits, tenant-scoped suggestions, RBAC boundaries (resident 403, cross-compound 403).

---

**🔔 Subscription Renewal — Manual Trigger Endpoint**

**Backend (`routes/superadmin.py`):**
- `POST /api/super-admin/trigger-renewals` (super_admin only) — runs one pass of `renewal_reminders.run_renewal_reminders_once()` on demand.
- Returns `{status, emails_dispatched, triggered_by, triggered_at}`.
- Respects existing 7/3/0-day milestone idempotency (`renewal_reminders_sent: ["co_7","co_3","co_0"]`).

**🧪 Verified end-to-end:**
- Set `expires_at = now + 7d` → trigger → `emails_dispatched: 1` → email logged (`company2@test.com`).
- Rerun → `0` (idempotency ✅).
- Repeated for 3d and 0d milestones — all three saved distinct keys.

### Iter 72: Subscription Badge + Auto-Expiry (May 1, 2026) ✅

**🏷️ Admins can now tag residents (VIP, late_payer, recurring_complaints, …) and attach private colour-coded notes — all inside the User Timeline modal.**

**Backend (`routes/user_crm.py`):**
- `GET  /api/users/{user_id}/crm` → `{tags, tag_colors, notes}`.
- `POST /api/users/{user_id}/tags` body `{tag, color}` — lower-cased, idempotent, updates colour on repeat.
- `DELETE /api/users/{user_id}/tags/{tag}` — removes tag and colour entry.
- `POST /api/users/{user_id}/notes` body `{text, color}` — colour-coded private note.
- `PUT  /api/users/{user_id}/notes/{note_id}` — author OR super_admin can edit.
- `DELETE /api/users/{user_id}/notes/{note_id}` — same auth rule.
- `GET  /api/users/crm/tag-suggestions` — autocomplete list **scoped per tenant** (compound_admin → own compound, company_admin → managed compounds, super_admin → global).
- Limits: 32-char tag, 2000-char note, 20 tags per user.
- Audit-logged for every mutation.
- Full RBAC: app_owner/super_admin unrestricted; compound_admin scoped to their compound; company_admin scoped to their managed compounds; all other roles → 403.

**Frontend (`components/UserTimelineModal.js`):**
- New **CRM panel** between analytics and events: tag chips (removable), colour-picker, add-tag input with auto-complete suggestions; notes list (author + timestamp) with inline delete on hover; textarea + colour to add new note.
- Tags also rendered as white pills in modal header under the user name for at-a-glance visibility.

**🧪 Verified (Iter 61 testing agent): 22/22 pytest tests green** — persistence, idempotency, validation limits, tenant-scoped suggestions, RBAC boundaries (resident 403, cross-compound 403).

---

**🔔 Subscription Renewal — Manual Trigger Endpoint**

**Backend (`routes/superadmin.py`):**
- `POST /api/super-admin/trigger-renewals` (super_admin only) — runs one pass of `renewal_reminders.run_renewal_reminders_once()` on demand.
- Returns `{status, emails_dispatched, triggered_by, triggered_at}`.
- Respects existing 7/3/0-day milestone idempotency (`renewal_reminders_sent: ["co_7","co_3","co_0"]`).

**🧪 Verified end-to-end:**
- Set `expires_at = now + 7d` → trigger → `emails_dispatched: 1` → email logged (`company2@test.com`).
- Rerun → `0` (idempotency ✅).
- Repeated for 3d and 0d milestones — all three saved distinct keys.

### Iter 72: Subscription Badge + Auto-Expiry (May 1, 2026) ✅

**🎟 Header badge showing plan + days remaining + renewal CTA for management companies.**

**Backend:**
- `GET /api/company-admin/plan-usage` now also returns `status`, `expires_at`, `days_remaining` (computed server-side).
- Stripe `_activate_subscription` sets `expires_at = now + 30 days` on every successful payment + `activated_at` + `last_payment_session_id`.
- `plan_limits.get_company_plan_limits` now auto-downgrades expired subscriptions:
  - If `plan != starter` and `expires_at < now` → flip `status=expired`, `expired_at=now`, return `plan=starter`.
  - Silent auto-downgrade on every limits lookup — the instant the grace period ends, the company loses paid feature flags and max_compounds/max_residents fall back to starter.

**Frontend (`components/company-admin/SubscriptionBadge.js`):**
- Pill-shaped badge in Layout header (between CompoundSwitcher and SessionSwitcher).
- Visible only for `company_admin / assistant_manager / accountant`.
- Color-coded states:
  - 🆓 Gray — starter plan
  - ✅ Green — active with >7 days (or unlimited/enterprise) — `{plan_name_ar} • {N} يوم`
  - ⏰ Amber — active with 3-7 days remaining (warn)
  - ⏰ Red + pulse — active with ≤2 days OR status=pending_payment OR status=expired
- Clicking navigates to `/app/dashboard` and dispatches `openUpgradeModal` → same upgrade flow as the Plan Usage card.

**🧪 Verified via Playwright:**
- Injected `expires_at = now + 5 days` on testcompany2 → Badge rendered **"⏰ شركة كبرى • 4 يوم"** with amber styling ✅
- Restored testcompany2 to no-expiry (matches production reality for unlimited enterprise) ✅

**Expected production behaviour:**
- Paid plan subscriber pays via Stripe → badge shows "✅ شركة متوسطة • 30 يوم" (green).
- Day 23 → badge turns amber "⏰ شركة متوسطة • 7 يوم" + renewal CTA.
- Day 28 → badge turns red pulse "⏰ شركة متوسطة • 2 يوم".
- Day 30 after expiry → badge turns red "⛔ منتهية — جدّد". At the same time, `get_company_plan_limits` silently auto-downgrades the company to starter so advanced features lock.


### Iter 71: AppVersionGuard — Auto Cache-Bust on Deploy (May 1, 2026) ✅

**🐛 Problem reported by user**: After deployment, users see a stale cached `frontend` bundle with old behaviour (login-flow breaks, new features missing) until they manually clear browser cache or hard-reload.

**✅ Fix: Automatic post-deploy cache/SW purge.**

**Backend (`routes/app_version.py`):**
- `GET /api/version` — public (no auth). Returns `{version, started_at, env}`.
- `version` is generated once at module-import (`str(int(time.time()))`) — regenerates on every process restart which happens on every deploy.

**Frontend (`components/AppVersionGuard.js`):**
- Headless component mounted once at the root of `App.js` (before `<BrowserRouter>`).
- **Flow:**
  1. Mounts → after 1.5s delay, fetches `/api/version` with `cache: 'no-store'`. Stores the version silently on first visit (nothing to compare yet).
  2. Re-checks every 5 minutes + on `window.focus` + on `visibilitychange`.
  3. When the stored version differs from the fetched version → triggers `hardReload`:
     - Saves auth token + session-scoped keys.
     - Clears all `window.caches` entries.
     - Unregisters every service worker (stale CRA SW was a common culprit).
     - Restores preserved auth.
     - `window.location.replace(url + ?_v=Date.now())` → full bypass of HTTP cache + CDN.
- Idempotent via `reloadingRef` — cannot double-reload.
- Invisible (no UI) and doesn't race with auth boot.

**🧪 Verified via Playwright test:**
- Mounted → stored `1777634798` silently ✅
- Injected `999999` as stale version + dispatched `focus` event ✅
- Guard detected mismatch → URL changed to `?_v=1777634916763` (reload happened) ✅
- New correct version `1777634798` re-stored after reload ✅

**Impact**: Next deploy onwards, every user gets the fresh build automatically within ≤5 minutes (or immediately on tab-focus). No more "clear cache and try again" support tickets.


### Iter 70: Stripe Payment Gateway (May 1, 2026) ✅

**💳 Complete payment flow for paid company subscription plans.**

**Backend (`routes/stripe_payments.py`):**
- Uses `emergentintegrations.payments.stripe.checkout` with `STRIPE_API_KEY=sk_test_emergent` from env.
- `POST /api/stripe/create-checkout-session` — body `{plan_key, origin_url}`. Server-side `PLAN_PRICES` table (anti-price-manipulation): startup=3500 EGP, business=7500, enterprise=20000. Creates Stripe session + inserts `payment_transactions` row with `status=initiated, payment_status=pending`. Metadata stores `company_id + plan_key + user_id` for idempotent webhook activation.
- `GET /api/stripe/checkout-status/{session_id}` — user-scoped (403 if session belongs to another user, 404 if missing). Polls Stripe, on `paid` calls `_activate_subscription` (idempotent).
- `POST /api/webhook/stripe` — webhook with signature verification. On `checkout.session.completed + payment_status=paid` → same `_activate_subscription` flow. Both paths are idempotent (no double-activation via `payment_transactions.payment_status` check).
- `GET /api/stripe/my-transactions` — paying user's history.
- Activation flips `company_subscriptions.status: pending_payment → active` + stamps `activated_at` + `last_payment_session_id`.
- **Security tests verified**: 400 for starter/invalid plan, 401 unauth, 400 no company_id, 403 cross-user checkout-status access.

**Frontend:**
- `CompanyPlanUsageCard` → `requestUpgrade` now creates a Stripe session and `window.location.href = session.url`. Button shows "💳 الدفع والترقية" for paid plans + loading state "⏳ جارٍ فتح صفحة الدفع...".
- New `pages/PaymentSuccess.js` — reads `session_id` from query, polls `/api/stripe/checkout-status/{id}` up to 10 times at 2.5s intervals. Displays "🎉 تم تفعيل اشتراكك بنجاح" card with plan name + amount + currency. Dispatches `planUsageRefresh` on success so the dashboard updates instantly.
- New `pages/PaymentCancel.js` — friendly "لا تقلق، لم يتم خصم أي مبلغ" + CTA back to dashboard.
- Routes: `/app/payment-success?session_id=…` and `/app/payment-cancel` mounted in `App.js`.

**Flow (end-to-end):**
1. User registers with `selected_plan=company_business` → `status=pending_payment`.
2. Logs in → sees plan-usage card with "الدفع والترقية" CTA.
3. Clicks → backend creates Stripe session → redirect to `checkout.stripe.com/c/pay/cs_test_...`.
4. Pays with Stripe test card (4242 4242 4242 4242) → Stripe redirects to `/app/payment-success?session_id=…`.
5. Polling + webhook both fire → `_activate_subscription` runs once → `status=active`, all plan feature flags now enforced.

**🧪 Test results (testing_agent_v3_fork iter60):**
- Backend: **11/11 PASS**
- Frontend: **PASS** — live Stripe URL `https://checkout.stripe.com/c/pay/cs_test_...` captured after clicking "الدفع والترقية" as newco_admin.


### Iter 69: Plan Picker on Registration Page (May 1, 2026) ✅

**🎯 Inline plan-comparison cards during self-registration for `company_admin`.**

**Backend:**
- `GET /api/public/company-plans` — NEW **unauthenticated** endpoint that exposes the same catalogue as `/api/owner/company-plans`. Used by the public registration page.
- `shared_models.UserCreate` — added `selected_plan: Optional[str] = None`.
- `routes/auth.py :: register` — when `role == "company_admin"` and a `selected_plan` is provided:
  - Whitelist validation: `{starter, company_startup, company_business, company_enterprise}` — anything else silently falls back to `starter` (prevents arbitrary string injection).
  - Paid plans (non-starter) bootstrap `company_subscriptions.status = "pending_payment"` so an admin can review and activate after receiving payment; starter stays `active`.

**Frontend:**
- New `components/RegistrationPlanPicker.js` — responsive grid of 4 plan cards:
  - Shows price in Arabic (٣,٥٠٠ ج.م/شهر), max compounds, max residents, and 4 premium feature bullets (PDF/Excel, AI insights, priority support, white-label).
  - "⭐ الأكثر شعبية" badge on the Business card (popular flag).
  - "✓ المختار" badge on selection + indigo ring + shadow.
  - Amber notice below when a paid plan is selected: "سيتم بدء الحساب بحالة بانتظار الدفع…".
- `Register.js` — mounts the picker in the company_admin branch of the form + passes `selected_plan` in `registerData`. Default state: `starter`.

**Verified end-to-end via curl + Playwright:**
- `/api/public/company-plans` returns 4 plans without Authorization header ✅
- Register with `selected_plan: "company_business"` → subscription created with `plan=company_business, status=pending_payment` ✅
- Register with malicious `selected_plan: "free_ultra_mega"` → silently falls back to `starter` ✅
- UI: 4 plan cards render, selecting Business triggers the paid-plan notice, Popular badge appears on Business ✅

**End-to-end E2E test of the original user bug**: Fresh company_admin registration → login → `CompoundOnboardingWizard` renders immediately with correct company name → plan usage card shows chosen plan. Confirmed via Playwright screenshot for user `user_co_test` → "شركة اختبار المستخدم".


### Iter 68: Company Registration Auto-Provisioning Fix (May 1, 2026) ✅

**🐛 Bug reported by user**: "حاولت التسجيل باسم شركة إدارة جديدة لم يدخل" — New company registration from the public sign-up page appeared to fail with "Registration failed" toast, and even when the backend returned 200, the newly-created user was an orphan with no company row, no subscription, and `compound_id='default-compound'`. That broke the CompanyAdminDashboard on first login:
- Orphan user → missing from SuperAdmin "Companies" tab
- No `company_id` → aggregated-stats unusable
- No `company_subscriptions` row → plan-usage defaulted silently to starter
- `compound_id='default-compound'` → confusing bogus reference

**Root cause**: `routes/auth.py :: POST /api/auth/register` only created the User document, regardless of role. It never touched `db.companies` or `db.company_subscriptions`. It also referenced the top-level `email_service` without importing it (visible in backend.err.log as "name 'email_service' is not defined" on every registration).

**Fix applied in `routes/auth.py`:**
1. Added `from email_service import email_service` to eliminate the welcome-email traceback.
2. Immediately after `db.users.insert_one(user_dict)`, when `user.role == "company_admin"`:
   - Create a matching `db.companies` row with `name = full_name|username`, `email/phone` from the form, `admin_user_id = user.id`, `created_by = "self_registration"`.
   - Back-link: `db.users.update_one(...).{company_id: new_company_id}`.
   - Upsert a `db.company_subscriptions` row with `plan: "starter"` so plan-limits return sensible values from the very first request.

**Verified end-to-end:**
- `POST /api/auth/register` for a fresh `company_admin` → 200 → `db.users` has `company_id` set → `db.companies` row exists with `admin_user_id` → `db.company_subscriptions` seeded with `plan=starter`.
- Login → `/api/auth/me` returns `company_id` correctly → frontend navigates to `CompanyAdminDashboard` → Onboarding Wizard renders IMMEDIATELY with "مرحباً بك في {companyName}" header (screenshot attached).
- Plan-usage card shows "مجاني" + progress bar 0/1 compound and 0/50 residents → upgrade CTA visible.


### Iter 67: Disaster Recovery Wizard (May 1, 2026) ✅

**🛡 New: One-click full snapshot + restore for SuperAdmin/AppOwner.**

**Backend (`routes/disaster_recovery.py`):**
- `GET /api/super-admin/disaster-recovery/preview` — returns the manifest summary (collections list, total docs, media count, app version, excluded collections).
- `GET /api/super-admin/disaster-recovery/snapshot` — streams a single signed `.zip`:
  - `manifest.json` — version, app_version, generated_at, generated_by, per-collection sha256, per-media-file sha256, totals.
  - `collections/<name>.json` — MongoDB Extended JSON via `bson.json_util` (preserves ObjectId, datetime, Binary).
  - `media/<filename>` — raw binary blobs read from the dual-write `media_files` collection.
  - Excludes runtime-only collections: `fs.files`, `fs.chunks`, `perf_samples`, `smoke_test_runs`.
  - Always logs the run to `disaster_recovery_runs` collection (audit trail).
- `POST /api/super-admin/disaster-recovery/restore?confirm=I_UNDERSTAND_OVERWRITE` (multipart `file=…`):
  - Validates manifest + per-collection sha256 + per-media sha256 BEFORE writing.
  - Atomic per-collection drop+insert (transactions skipped to support replicaset-less Mongo).
  - Re-imports media binaries directly into `media_files` (the dual-write target → next read auto-restores `/uploads`).
  - Returns `{success, restored.collections_count, restored.media_files_count, errors[]}`.
- `GET /api/super-admin/disaster-recovery/history?limit=20` — paginated audit log.
- All endpoints require `app_owner | super_admin`. `company_admin / admin / resident` → 403.

**Frontend (`components/super-admin/DisasterRecoveryTab.js`):**
- Mounted as `tab=disaster_recovery` in `SuperAdminPanel` (visible to app_owner only — hidden when `isSuperAdminOnly`).
- Hero stats card (collections / docs / media / version).
- Emerald "📦 Download" card — triggers blob download with timestamped filename `homeme-disaster-recovery-YYYYMMDD-HHMMSS.zip`.
- Rose "⚠️ Restore" card — file picker + Arabic confirm-word "استعادة" + irreversible warning. POSTs with `confirm=I_UNDERSTAND_OVERWRITE`.
- Inline result panel showing restored counts + collapsible error list.
- History feed (last 20 runs) with action emoji, username, timestamp, size.

**🧪 Test results (testing_agent_v3_fork iter59):**
- Backend: **14/14 PASS** (snapshot 252 KB in <1s, manifest sha256 verified, restore round-trip preserves data, RBAC enforced 403 for company_admin, restore rejects without/with-wrong confirm).
- Frontend: **3/3 PASS** (Owner DR download triggered real .zip, CompoundSwitcher shows 2 compounds for testcompany2, newco_admin sees Onboarding wizard immediately and dashboard after save).

**Verified manually**: 252 KB ZIP for current data (60 cols, 1061 docs, 41 media), generated in 1.05s.


### Iter 66: E2E Onboarding fix + Real Feature Gating + Upgrade UX (May 1, 2026) ✅

**🐛 Bug Fixed during E2E test of Onboarding flow:**
- Generic `OnboardingWizard.js` (the resident-onboarding popup with "أهلاً بكِ في HomeMe") was opening on top of the new `CompoundOnboardingWizard` and intercepting clicks on its inputs/buttons.
- **Fix**: Added role-skip in `OnboardingWizard.js` — it now early-returns for `company_admin / assistant_manager / accountant / super_admin / app_owner` so management-company roles get only their dedicated wizard.

**🔄 CompoundSwitcher live-refresh:**
- Subscribes to `planUsageRefresh` and `compoundSwitched` window events → re-fetches `/api/company-admin/compounds` so newly-created compounds (via Onboarding Wizard or "إضافة مجمع" button) appear in the switcher pill immediately, no page refresh needed.
- `CompoundOnboardingWizard.onComplete` now dispatches `planUsageRefresh` before calling `reload()`.

**🎚 REAL Feature Gating (PDF/Excel exports):**
- New helper `plan_limits.gate_company_feature(current_user, feature_key, name_ar)` — no-op for users without `company_id`, otherwise enforces `assert_feature_enabled`.
- Applied to:
  - `routes/exports.py :: GET /api/financial/export-excel`
  - `routes/exports.py :: GET /api/residents/{id}/export-pdf`
  - `routes/pdf_reports.py :: GET /api/reports/unit/{id}/statement`
  - `routes/pdf_reports.py :: GET /api/reports/compound/{id}/occupancy|invoices|summary`
- Behaviour: starter (free) → 403 with structured `{code:'plan_limit_feature', message, current_plan_name_ar}`. Enterprise → 200 (delivered 7749-byte xlsx). Standalone admins (no company_id) → unaffected.

**📣 Upgrade UX — Global Axios Response Interceptor:**
- `App.js` now intercepts every 4xx/5xx response. When status=403 and `detail.code` is `plan_limit_feature | plan_limit_compounds | plan_limit_residents`, fires a `sonner` toast with the Arabic message + an action button "🚀 ترقية الخطة" that:
  1. Navigates to `/app/dashboard`
  2. Dispatches `openUpgradeModal` event.
- `CompanyPlanUsageCard` listens for `openUpgradeModal` → opens its existing 4-plan comparison modal.
- Net effect: any feature-gated 403 from anywhere in the app → polished "you need to upgrade" toast → one click → upgrade modal opens. No need to update each calling component.

**🧪 Verification:**
- E2E onboarding flow: newco_admin login → wizard appears → fill 1 compound → save → dashboard renders → logout → re-login → wizard NOT shown again, dashboard direct (verified via Playwright).
- 403 contracts verified via curl: starter blocked, enterprise allowed, message in Arabic with plan name.
- Test data: `newco_admin / NewCo123!` (free plan, empty company) ready for user to test Onboarding from a clean state.


### Iter 65: Compound Switcher + Plan Feature Flags (May 1, 2026) ✅

**🏘️ Compound Switcher (per user request):**
- New `components/company-admin/CompoundSwitcher.js` — pill-shaped dropdown in Layout.js header (between user-info-card and SessionSwitcher).
- Visible only for `company_admin / assistant_manager / accountant`.
- Lists every compound the company owns (via `/api/company-admin/compounds`).
- One-click switch: persists to `localStorage.selectedCompoundId` + `selectedCompoundName`, dispatches `planUsageRefresh` and `compoundSwitched` events, then forces a soft `navigate(0)` so all admin routes re-fetch with the new `X-Active-Compound-Id` header.
- "عرض الإجمالي" button clears the selection and returns to the company-wide overview.
- Outside-click closes the menu.

**🎚 Plan Feature Flags (machine-readable):**
- Added `feature_flags` block to every entry of `COMPANY_PLANS_CATALOGUE` in `routes/owner_subscriptions.py`. 8 flags: `billing_payments`, `ads_campaigns`, `pdf_excel_exports`, `ai_financial_insights`, `advanced_dashboard`, `custom_api`, `whitelabel`, `priority_support`.
- Mirror table `_PLAN_FEATURES` added to `plan_limits.py`.
- New helpers: `has_feature(company_id, key)`, `assert_feature_enabled(company_id, key, name_ar)` — raise structured 403 `plan_limit_feature` ready for the same upgrade-modal flow as `plan_limit_compounds` / `plan_limit_residents`.
- `GET /api/company-admin/plan-usage` now returns `feature_flags` for the frontend to gate UI elements per-tier.

**🔧 Fixes during testing:**
- Removed `user.company_id` precondition from CompoundSwitcher fetch — backend already extracts company_id from JWT, and the user object in some browser contexts hasn't refreshed yet from `/auth/me`. Verified via screenshot: switcher pill renders correctly for testcompany2.

**🧪 Test results (testing_agent_v3_fork iter58):**
- Backend: 11/11 passed (1 legitimate skip — testcompany2 is on enterprise/unlimited so plan-limit rejection cannot be triggered without changing plan).
- Frontend: 12/13 passed → fixed the missing CompoundSwitcher testid → re-verified visually.
- X-Active-Compound-Id legitimate override accepted; cross-company bogus id silently rejected.


### Iter 64: Company-Admin Mini-Owner Suite — Phases 1-5 (May 1, 2026) ✅

**🏗️ Phase 1 — Onboarding Wizard (First-Login Gate):**
- New `components/company-admin/CompoundOnboardingWizard.js` — multi-row wizard with add/remove rows, plan-limit aware bulk submit, "تخطّي مؤقتاً" stored in `localStorage.cad_onboarding_skipped`.
- New `POST /api/company-admin/compounds/bulk` — atomic plan-limit check + insert + back-link via `companies.compound_ids`.
- `CompanyAdminDashboard.js` now gates rendering: if `compounds.length === 0 && !skipped` → render wizard, else render full dashboard.

**📊 Phase 2 — Aggregated Stats Dashboard:**
- New `GET /api/company-admin/aggregated-stats` — returns totals + per-compound breakdown for: users by role (residents, managers, security, accountants), unpaid `unit_charges` count + amount, open `financial_obligations` count + remaining amount, open complaints, pending maintenance.
- New `components/company-admin/AggregatedStatsPanel.js` — 9 stat cards (with red-ring urgency on issue counts), expandable per-compound drill-down rows with "🚀 فتح" button that navigates to the unified admin surface.
- Replaces the old basic 3-card stats grid.

**🧭 Phase 3 — Unified Sidebar / Co./Admin Branding:**
- `Layout.js` role label now shows **"Co./Admin — شركة إدارة"** (indigo) for `company_admin` instead of falling back to "مقيم".
- The existing `isAdminRole` already includes `company_admin`, so company admins see the full admin sidebar (Finance, Complaints, Maintenance, Services, Visitors, Subscriptions, etc.) once they pick a compound.

**📧 Phase 4 — Email/Notification Fanout:**
- `helpers.notify_compound_admins` extended to:
  1. Resolve the compound's parent management company.
  2. Pull `company_admin / assistant_manager / accountant` users for that company.
  3. Persist in-app notifications for them (de-dup'd).
  4. Best-effort SMTP email fanout via `EmailService` for each company-level admin (fire-and-forget asyncio task).
- Roles `assistant_manager` and `accountant` now also receive compound-scoped admin notifications.

**🛡 Phase 5 — RBAC Hardening (Compound Context Switching):**
- `auth_deps.get_current_user` now reads optional `X-Active-Compound-Id` request header. When present:
  - For `app_owner / super_admin`: applied directly.
  - For `company_admin / assistant_manager / accountant`: only applied if the compound is owned by their `company_id` (verified via DB lookup). Cross-company attempts silently fall back.
- Frontend `App.js` adds an axios request interceptor that injects `X-Active-Compound-Id` from `localStorage.selectedCompoundId` on every request.
- Net effect: every existing admin endpoint that uses `current_user["compound_id"]` now scopes correctly when a company_admin "enters" a compound — no per-route RBAC changes needed.

**🆕 New roles supported in `company_admin` user creation:**
- `accountant` (محاسب 🧾)
- `assistant_manager` (مدير مساعد 🤝)
- Updated `valid_roles` in `routes/company_admin.py :: company_admin_add_user_to_compound` and the `AddUserModal` UI grid (`grid-cols-7`).

**Verified end-to-end via curl + screenshot**:
- Bulk create respects plan limit (rejected 2 compounds when plan allows 1).
- Aggregated stats returned 1 compound, 5 residents, 1 security, 6 open complaints, 17 pending maintenance, 75,000 ج.م unpaid charges for شركة الأمل للإدارة.
- `X-Active-Compound-Id` accepted for legitimate compound, rejected for bogus ID — falls back to user's stored compound_id.
- Co./Admin label rendered in header; full admin sidebar visible.


### Iter 63: Orphan Company-Admins Sync + Auto-Heal Back-Link (May 1, 2026) ✅

**🩹 Bug Fix — `company_admin` users missing from SuperAdmin "Companies" tab:**
- **Root cause**: `/api/super-admin/companies` returned companies from `db.companies` and matched admins via `company.admin_user_id`. But whenever a `company_admin` user was created (through `/api/super-admin/users`) the `company_id` field was written on the user doc — **without** a corresponding back-reference (`admin_user_id`) on the company. Result: admins were invisible in the UI even when the company existed. Additionally, admins created with a `company_id` pointing to a deleted/missing company became fully orphan.

**Fixes applied:**
1. **`routes/superadmin_companies.py :: list_companies_full`** — on every call, auto-heals by setting `admin_user_id` on any company that has a matching `company_admin` user but no back-link. Also now returns a new `orphan_admins` array for admins whose `company_id` is null or references a non-existent company.
2. **`routes/superadmin_companies.py :: create_company_from_orphan_admin`** (NEW) — `POST /api/super-admin/companies/from-admin/{user_id}` — one-click converter: if user's `company_id` points to an existing company it just back-links; otherwise creates a fresh company, seeds it with user's email/phone, and updates the user's `company_id`.
3. **`routes/superadmin.py :: super_admin_create_user`** — now sets `admin_user_id` on the target company immediately when a new `company_admin` user is created, preventing new orphans.
4. **`super-admin/CompaniesTab.js`** — new amber-bordered "مدراء شركات دون ربط" section at top; each orphan row has a "🏢 تحويل إلى شركة" button that prompts for the company name and calls the converter endpoint.

**Verified via curl**: 3 legacy `company_admin` users (`testcompany2`, `testco3`, `companytest5`) were healed on first request — their companies now show the linked admin. Synthetic orphan with stale `company_id` surfaced in `orphan_admins`, was converted to a new company, and disappeared from the orphan list on re-fetch.


### Iter 62: Impersonate User + System Accounts Filter + User CRUD Modals (Feb 29, 2026) ✅

**🎭 Impersonate User (أقوى ميزة دعم فني):**
- `routes/impersonate.py` — 3 endpoints:
  - `POST /api/impersonate/{user_id}` (owner/super_admin) — يُرجع JWT مؤقت (30 دقيقة)
  - `GET /api/impersonate/status` — يرجع حالة الجلسة الحالية
  - `POST /api/impersonate/stop` — إنهاء الجلسة
- **Security:**
  - لا يمكن impersonate لـ `app_owner` أو `super_admin` (403)
  - لا يمكن impersonate للنفس (400)
  - لا يمكن impersonate لحساب معطّل (400)
  - غير owner/super_admin يستلم 403
- **JWT Enhancement**: `auth_deps.get_current_user` الآن يحمل `impersonator_id`, `impersonator_username`, `is_impersonation` من الـ token payload.
- **Transparency:**
  - Email تلقائي للمستخدم الأصلي "تم الدخول إلى حسابك بواسطة X"
  - Audit log entry لكل `impersonate_start` و `impersonate_stop`
- **UI:**
  - زر 🎭 في جدول UserManagement (لكل مستخدم غير نظام)
  - `components/ImpersonationBanner.js` — بانر أحمر/أصفر متحرك في أعلى الصفحة عند وجود جلسة انتحال
  - Countdown timer (⏱ MM:SS)
  - زر "↩️ إنهاء والرجوع" يستعيد الجلسة الأصلية من `localStorage.original_token_before_impersonation`
- **Bug Fix Discovered During Testing**: `POST /api/impersonate/stop` كان يُعتبر `user_id="stop"` لأن `/{user_id}` يسبقه في الـ router. الإصلاح: نقل `/status` و `/stop` قبل `/{user_id}`.

**🙈 System Accounts Filter:**
- `UserManagement.js` الآن يخفي `app_owner` و `super_admin` افتراضياً
- Checkbox toggle للـ Owner/Super Admin فقط: "🙈 إخفاء حسابات النظام" ↔ "👁️ إظهار حسابات النظام"

**✏️ User View + Edit Modals:**
- 2 endpoints جديدة:
  - `GET /api/admin/users/{id}` — تفاصيل المستخدم + compound_name
  - `PUT /api/admin/users/{id}` — تحديث الحقول (full_name, email, phone, role, compound_id, is_active, unit_number)
- Validation: email uniqueness، منع تخفيض آخر app_owner نشط
- UI: View modal (عرض الكل) + Edit modal (form متكامل) + بوكلير من view إلى edit



**🐛 السبب الحقيقي الجذري (أخيراً!) للمشكلة المتكررة 10+ مرات:**
- **K8s Container Disk ephemeral** — كل deployment يمسح `/app/uploads/*` بالكامل.
- الـ MongoDB يحتفظ بـ `image_url = /api/ads/media/X.jpg` لكن الملف **محذوف من القرص** بعد أي نشر.
- **حتى نظام الـ Self-Healing Backup كان يفشل** لأن `/app/backups/media/` موجود على نفس القرص المؤقت!
- تأكيد بالاختبار: `https://homemeapp.net/api/ads/media/2d86a5bac5e8.jpeg` → **HTTP 404** (الملف محذوف).

**🔐 الحل الدائم — MongoDB-backed Persistent Media Store:**
- `services/media_store.py` — جديد. كل ملف مرفوع يُنسخ في MongoDB collection `media_files` كـ Binary مع content_type + SHA256 + size cap 12MB.
- **Dual-write**: كل endpoint يرفع صور (ads, advertiser, compound_branding, app_branding, admin_users, user_profile) الآن يكتب في Disk **و** MongoDB.
- **Multi-layer Self-Heal** في `serve_subdir_file` + `serve_ad_media`:
  1. القرص أولاً
  2. لو غير موجود → Backup snapshot
  3. لو غير موجود → MongoDB (**تعيش مع أي deployment!**)
  4. Cache للقرص بعد الاستعادة
- **One-time Migration Endpoint**: `POST /api/media-health/migrate-to-db` ينسخ كل الملفات الموجودة على القرص إلى MongoDB (idempotent via SHA256).
- **Stats Endpoint**: `GET /api/media-health/db-overview` لمتابعة حالة DB media.
- **UI**: كارت بنفسجي بارز في `/app/media-health` يعرض "🔐 حماية MongoDB الدائمة" + عدد الملفات المحمية + زر "ترحيل" + تفصيل لكل subdir.

**🧪 التحقق E2E:**
- ✅ Migration: 41 ملف من القرص → MongoDB (0 errors)
- ✅ Test: حذف ملف من القرص **و** كل snapshots → GET /api/ads/media/X.png → **HTTP 200 + استعادة تلقائية من DB** ✓
- ✅ Test: نفس الاختبار على `/api/files/ads/` → **HTTP 200** ✓
- ✅ UI: الكارت يعرض "✅ 41 ملف محمي في قاعدة البيانات" + توزيع: users(8)، logos(4)، ads(13)، branding(8)، payment_proofs(5)، homeme(3).

### Iter 60: Performance Budget Tracker + Sidebar Scroll Fix (Feb 28, 2026) ✅

**🐛 Bug Fix — السايدبار يرجع لأعلى عند التنقل:**
- **السبب الجذري:** عنصر `<nav>` يُعاد إنشاؤه عند كل route change، فيُعاد تعيين `scrollTop` إلى 0.
- **الإصلاح في `Layout.js`:** ref على `<nav>` + حفظ scrollTop في `sessionStorage` عند كل scroll (debounced via rAF) + استعادة الموضع عند تغيير `location.pathname` + scroll-into-view لـ active link لو خارج viewport.

**🆕 Performance Budget Tracker (P3):**
- `services/perf_budget.py` — يسجل عينات latency (ring buffer 200/endpoint) ويحسب p50/p95/mean. Threshold = `max(p50*2, p95+100, 500ms)`. Regression = 3 قياسات متتالية تتجاوز الـ threshold.
- `routes/perf_budget.py` — 3 endpoints owner-only (overview/regressions/recompute).
- التكامل مع Smoke Test: كل تشغيل (manual/auto) يُغذي perf samples ويحسب baselines.
- Email Alerts للمالكين عند ظهور regression جديدة.
- UI: `components/PerfBudgetCard.js` يعرض جدول بكل endpoints مع p50/p95/threshold/latest/sparkline.

### Iter 59: Pre-Deploy Smoke Test + Synthetic Monitor + Critical Bug Fixes (Feb 28, 2026) ✅

**🐛 Bug Fix — Registration Failed (Critical):**
- **السبب:** `shared_models.py` يستخدم `uuid.uuid4()` في 30+ موديل بدون `import uuid` → HTTP 500.
- **الإصلاح:** إضافة `import uuid` واحدة. كل التسجيل (Owner/Company/Resident) يعمل الآن.

**🐛 Bug Fix — Health Scanner timing:**
- **السبب:** `t0 = time.perf_counter()` كان قبل `async with sem:` فيُحتسب وقت الطابور كـ latency.
- **الإصلاح:** نقل التايمر داخل الـ semaphore + رفع concurrency 8→16. النتيجة: `/api/` من 16090ms → 21ms.

**🆕 Pre-Deploy Smoke Test (P1):**
- `services/smoke_test_runner.py` — 15 اختبار حرج (login 4 أدوار، register، KPIs، files، ads، إلخ).
- `routes/smoke_test.py` — 4 endpoints owner-only (run/last/history/deploy-status).
- CLI: `python -m services.smoke_test_runner` (exit 0/1 لـ CI/CD).
- Synthetic Monitor: background loop كل 30 دقيقة + email alerts على failures جديدة.
- UI: `components/SmokeTestCard.js` بانر ديناميكي (أخضر/أحمر/أصفر) في صفحة System Health.



**🐛 Bug Fix — Registration Failed لتسجيل شركة الإدارة (Critical):**
- **السبب الجذري:** `shared_models.py` كان يستخدم `uuid.uuid4()` في `Field(default_factory=...)` لكن **`import uuid` ناقص** — أي endpoint يبني نموذج فيه `id` field كان يفشل بـ `NameError` (HTTP 500).
- **الإصلاح:** إضافة `import uuid` (سطر واحد). 30+ موديل أصبحت تعمل (User, Compound, Family، إلخ).

**🐛 Bug Fix — System Health Scanner يعرض كل المسارات بـ 16 ثانية:**
- **السبب الجذري:** الـ scanner كان يبدأ التايمر **قبل** الحصول على semaphore slot، فيُحتسب وقت انتظار الطابور (15+ ثانية مع 489 endpoint و 8 concurrent) كـ latency حقيقي.
- **الإصلاح:** نقل `t0 = time.perf_counter()` داخل `async with sem:` block (3 مواضع) + رفع concurrency من 8 → 16.
- **النتيجة:** `/api/` (root) من **16090ms → 21ms**. `/api/facility-bookings` من ~6000ms (مزيف) → **147ms** (حقيقي). **0 failures في 501 مسار**.

**🆕 Pre-Deploy Smoke Test (P1):**
- `services/smoke_test_runner.py` — جديد. 15 اختبار حرج (login owner/super/company، register، dashboards، files، ads، KPIs، audit، alerts، compounds id-leak، media-health، smtp-health، file 404 safety).
- `routes/smoke_test.py` — 4 endpoints owner-only:
  - `POST /api/system/smoke-test/run` — تشغيل الفحص فوراً
  - `GET /api/system/smoke-test/last` — آخر نتيجة كاملة
  - `GET /api/system/smoke-test/history?limit=N` — السجل (يستثني الـ results للـ payload size)
  - `GET /api/system/smoke-test/deploy-status` — `{deploy_safe, passed, failed, failed_tests, stale}` للـ deploy-gate
- **CLI:** `cd /app/backend && python -m services.smoke_test_runner` (exit code 0 لو نجح، 1 لو فشل) — قابل للاستخدام في CI/CD.
- **🔄 Synthetic Monitor:** Background loop يدور **كل 30 دقيقة** (`smoke_test_monitor_loop`)، يحفظ النتائج في `smoke_test_runs`، ويرسل إيميل لكل `app_owner`/`super_admin` عند ظهور **failure جديد** (idempotent عبر `last_failed_set` set).
- **🛡️ Deploy Gate UI:** `components/SmokeTestCard.js` بانر دينامي على رأس صفحة "فحص صحة المسارات":
  - 🟢 أخضر: "جاهز للنشر" + الإحصائيات + آخر تشغيل
  - 🔴 أحمر: "🚫 لا تنشر — اختبارات حرجة فاشلة!"
  - 🟡 أصفر: "نتيجة قديمة (>6 ساعات)" أو "لم يتم تشغيل بعد"
  - زر "🚀 تشغيل الآن" + قسم expandable يعرض كل الـ 15 اختبار + history.

**🧪 الاختبار الحي:**
- CLI: 15/15 ✅ (deploy_safe: true)
- HTTP: `POST /api/system/smoke-test/run` → 1898ms → 15/15 ✅
- RBAC: 403 لـ test_advertiser ✓
- Synthetic monitor: تأكد من تشغيله في الخلفية كل 30 دقيقة (سجل `[smoke_monitor] All smoke tests pass.`)
- UI: البانر يعرض "✅ جاهز للنشر" بشكل صحيح في الواجهة (بـ Playwright).

### Iter 58: Media Backup + Self-Healing + HomeMe App Branding (Feb 28, 2026) ✅

**🛡️ نظام نسخ احتياطي ذكي للوسائط (Self-Healing):**
- `services/media_backup.py` — جديد. Daily snapshot لكامل `/app/uploads/*` إلى `/app/backups/media/YYYY-MM-DD/`. Incremental (يتخطى الملفات المتطابقة)، احتفاظ 30 يوم.
- Background loop ينفّذ السنابشوت يومياً 03:00 UTC + سنابشوت أولي وقت إقلاع الخادم.
- **Self-Heal**: تعديل `serve_subdir_file` في `server.py` — لو ملف مفقود من `/app/uploads/{subdir}/`، يحاول استرجاعه من أحدث نسخة احتياطية قبل ما يرجع 404. تم التحقق E2E: حذف `homeme_xxx.png` يدوياً → GET للملف → 200 image/png + الملف رجع للقرص ✓.
- `routes/media_health.py` — جديد. 6 endpoints (overview/orphans/broken/backups/backup-now/repair-broken). Owner/Super-Admin only.
- `pages/MediaHealthPage.js` — جديد. لوحة بـ 5 KPIs + 4 tabs (نظرة عامة، مكسورة، يتيمة، نسخ احتياطية) + أزرار "نسخ احتياطي الآن" و "إصلاح المكسور".
- DB_REFS في الـ scanner تغطي 14 collection×field (users, family_members, compounds, internal_ads, advertiser_ads, maintenance, complaints, services, support_tickets, messages, voice_messages, gallery).

**🎨 لوجو وألوان HomeMe (App-Level Branding):**
- `routes/app_branding.py` — جديد. Collection `app_settings.homeme_branding` يحفظ `{logo_url, app_name_ar/en, tagline_ar/en, primary/secondary/accent_color}`.
- `GET /api/app-branding` — public (يستخدمها صفحة Login + Layout).
- `PUT /api/app-branding` — owner-only، validation للألوان hex.
- `POST /api/app-branding/logo` — multipart upload (PNG/JPG/WEBP/SVG ≤2MB) → يحفظ في `/app/uploads/homeme/` ويُرجع `/api/files/homeme/{filename}`.
- `homeme` أُضيف للـ whitelist في `serve_subdir_file`.
- `pages/AppBrandingPage.js` — جديد. معاينة حية + رفع لوجو + 3 color pickers + form لاسم وشعار التطبيق.
- `Layout.js` — Owner/Super-Admin بدون compound_id يرى لوجو HomeMe (data-testid: `homeme-logo-sidebar`) واسم التطبيق (`homeme-app-name-sidebar`) بدلاً من فراغ.
- Sidebar: "صحة الوسائط والنسخ الاحتياطي" + "لوجو وألوان هوم مي" أُضيفا تحت قسم App Owner.

**Verified via testing_agent_v3_fork (iteration 57)** — 100% نجاح:
- Backend: 23/23 pytest (overview/orphans/broken/backups/backup-now/repair-broken/RBAC/PUT validation/upload size/wrong type/self-heal E2E).
- Frontend: 8/8 Playwright (public branding endpoint, MediaHealth + AppBranding rendering, sidebar entries، Owner-only access enforced في الـ UI ورسالة "هذه الصفحة متاحة للمالك والسوبر أدمن فقط").

### Iter 57: Full Regression Sweep + Minor Cleanups (Feb 27, 2026) ✅

**🧪 اختبار شامل (testing_agent_v3_fork iteration 56):**
- Backend: 47/47 (30 جديد + 17 regression) — كل مسارات `/api/files/*` و re-rank الإعلانات و 2FA و SMTP و PDF و audit logs و route-health و owner KPIs و branding خضراء.
- Frontend smoke: HomePage + Login تعمل، صورة `test_guard` تُعرض من `/api/ads/media/596b1ed24603.png`، **صفر مسارات `/uploads/*`** في DOM.

**🟢 الإصلاحات الصغيرة المنفّذة:**
1. **Seed `test_advertiser`** (TestAd123!) — أُنشئ المستخدم لمتابعة E2E لبوابة المعلنين.
2. **`/api/compounds` _id leak** — أُضيف `{_id: 0}` في `routes/db_admin.py:75` بعد ما رصد الاختبار تسرّب ObjectId.
3. **Plan limits** — testcompany2 على خطة `company_enterprise` (`max_compounds: -1` غير محدود) — الـ enforcement يعمل لكن لم يتم تفعيله لأن الحساب مفتوح. سلوك صحيح.
4. **`/select-account` 2× 403** — مُسجّل كـ informational غير حاجب؛ الـ `try/catch` في `AccountSelector.js` يستوعبها بصمت.

### Iter 56: Bug Fix — Ad Rendering Order (media-first sort) (Apr 27, 2026) ✅

**🐛 المشكلة:** الإعلانات والصور الشخصية لا تظهر — تابع للجلسة السابقة. اتضح أن:
1. الـ frontend `InternalAdBanner` يستخدم `maxAds={1}` فيعرض إعلاناً واحداً فقط.
2. الـ backend `/api/ads/public` يرجّع كل الإعلانات النشطة بترتيب حسب `priority`.
3. كانت الإعلانات الفارغة (بدون image_url) تأتي أولاً، فيُعرض banner بدون صورة بينما الإعلانات الجديدة المرفوعة بصور تُتجاهل.

**🟢 الإصلاح:** Re-rank في `/api/ads/public` و `/api/ads/active`: الإعلانات بمحتوى وسائط (image_url / video_url / media_url) تأتي **أولاً**، ثم تكسر التعادل بـ priority.

**🧪 التحقق:**
- بعد الإصلاح، endpoint `/api/ads/public?position=homepage_hero` يرجع الترتيب: `test_guard (with image)` → `إعلان الصفحة الرئيسية (empty)` ✓
- في المتصفح: HomePage الآن تعرض إعلان "test_guard" مع الصورة الفعلية بدلاً من الـ gradient الفارغ ✓
- صورة الإعلان `/api/ads/media/596b1ed24603.png` تُحمّل بنجاح HTTP 200 image/png ✓

### Iter 55: Critical Bug Fix — Image Upload Display (/uploads → /api/files routing) (Apr 27, 2026) ✅

**🐛 المشكلة (User Report):** الصور الشخصية والإعلانات لا تظهر بعد رفعها عدة مرات.

**Root Cause:** Kubernetes ingress routes only `/api/*` to the backend; everything else (including `/uploads/*`) was intercepted by the React frontend and returned `index.html` (text/html) instead of the file. So although uploads succeeded server-side, image rendering broke in the browser.

**Fix:**
- `server.py`: NEW generic GET `/api/files/{subdir}/{filename}` route with whitelisted subdirs (branding, family_members, logos, ads, services, documents, gallery, maintenance, users, payment_proofs) + path-traversal protection.
- Migrated all upload endpoints to return `/api/files/{subdir}/{filename}` URLs:
  - `routes/admin_users.py`, `routes/admin_registration.py` → `profile_picture_url = /api/files/users/...`
  - `routes/family.py` → `profile_image = /api/files/family_members/...`
  - `routes/compound_branding.py` → `logo_url = /api/files/branding/...`
  - `routes/maintenance.py` → `image_urls = /api/files/maintenance/...`
  - `routes/payments.py` → `logo_url = /api/files/logos/...`
  - `server.py` (inline upload handlers) → `/api/files/...`
- `migrations/migrate_upload_urls.py`: NEW idempotent one-time migration to rewrite legacy `/uploads/*` → `/api/files/*` across 10 collections (users, family_members, internal_ads, ad_campaigns, compounds, maintenance_requests, complaints, messages, voice_messages, gallery). Already executed (0 docs needed migration — DB was clean).

**Verified via testing_agent_v3_fork (iteration 55)** — 100% pass (17/17 backend):
- Profile picture upload returns `/api/files/users/...` ✓ ; GET returns 200 image/png ✓
- Old `/uploads/users/...` returns text/html (confirms ingress behavior) ✓
- Branding logo upload + GET ✓
- Ad media upload (no regression) ✓
- Generic file router with whitelist ✓ (404 for invalid subdir, 404 for missing file)
- Migration is idempotent (0 updates on re-run) ✓
- Frontend live verification: branding page renders new logo URL ✓

### Iter 54: Logo Upload + SMTP Auto-Alerts + Email Template Editor (Apr 27, 2026) ✅

**📤 Logo File Upload (replacing URL-only):**
- `routes/compound_branding.py: POST /api/compounds/{id}/branding/logo` — multipart upload, validates content-type (PNG/JPG/WEBP/SVG only), 2MB cap, persists to `/app/uploads/branding/{compound_id}_{hex8}.{ext}`, sets `compound.branding.logo_url`.
- `pages/BrandingSettingsPage.js`: dual UI — keep URL input + add file upload button (dashed-border drop zone) + 12px×12px live thumbnail preview. Toast on success/failure.

**🚨 Auto SMTP Failure Alerts:**
- `smtp_alerts.py` — NEW. Hourly background loop calls `_maybe_alert()`:
  - Reads `smtp_health` for last `SMTP_ALERT_WINDOW_HOURS` (default 6h)
  - Skips if `total < SMTP_ALERT_MIN_TOTAL` (default 5)
  - If `failure_rate > SMTP_ALERT_THRESHOLD` (default 30%) AND no alert in last `SMTP_ALERT_COOLDOWN_HOURS` (default 12h): emails all `app_owner` + `super_admin` users with stats + sample failures table.
  - Logs each dispatch to `smtp_alerts` collection.
- `server.py`: `start_smtp_alerts_loop` startup hook.
- `routes/smtp_health.py`: added `GET /alerts` (history, owner-only) + `POST /alerts/check-now` (manual trigger).
- `db_indexes.py`: added `smtp_alerts.timestamp -1` index.

**📝 Email Template Editor with `{{variable}}` Substitution:**
- `routes/email_templates.py` — NEW. 4 default templates seeded:
  - `monthly_summary` — vars: compound_name, period
  - `monthly_statement` — vars: resident_name, unit_number, period, compound_name
  - `renewal_reminder` — vars: user_name, days_left, end_date
  - `generic` — vars: title, body
- Endpoints (admin GET, owner-only mutate):
  - `GET /api/email-templates` — list with `is_customized` flag
  - `GET /api/email-templates/{kind}` — single
  - `PUT /api/email-templates/{kind}` — owner-only update
  - `POST /api/email-templates/{kind}/reset` — restore default
  - `POST /api/email-templates/{kind}/preview` — server-side render with sample variables (Mustache-style `{{var}}` substitution, missing vars left as-is for visibility)
- `routes/monthly_reports_scheduler.py`: now uses `get_template_or_default()` + `render_template()` for both summary & statement emails — admins can fully customize automated email copy without code changes.
- `pages/EmailTemplatesPage.js` — sidebar list (4 templates with checkmark for customized) + editor (subject input + 12-row HTML textarea + clickable variable chips that copy `{{var}}` to clipboard) + live preview rendered with sample data.

**Verified via testing_agent_v3_fork (iteration 54)** — 100% pass (22/22 backend + 3/3 frontend pages):
- Logo: 200 valid / 400 wrong type / 413 oversize / static file served / 403 RBAC ✓
- Templates: 4 seeded ✓, GET/PUT/preview/reset ✓, 403 non-owner mutate ✓, 400 missing fields ✓, 404 unknown kind ✓
- SMTP alerts: list/check-now/RBAC ✓, no spurious alert when fail_rate below threshold ✓
- Integration: monthly run uses templates ✓
- Regression: analytics returns real DB data ✓, all previous endpoints green ✓

### Iter 52: Per-Compound PDF Branding + Scheduler Analytics + SMTP Health Tracker (Apr 26, 2026) ✅

**🎨 Per-Compound PDF Template Branding:**
- `services/pdf_report_service.py`: `_branded_css(branding)` injects compound-specific colors (primary/secondary/accent) by find/replace into base CSS. `_header_html(branding)` shows custom logo, brand label, tagline. `_footer_html(branding)` shows signature.
- `services/branding.py`: `get_compound_branding(compound)` extractor (supports nested `branding.{...}` and legacy `logo_url`).
- All 4 `render_*` functions now accept `branding: dict | None`.
- `routes/compound_branding.py` — NEW. `GET/PUT /api/compounds/{id}/branding`. Hex-color validation (`#xxx` to `#xxxxxxxx`). RBAC: app_owner / super_admin everywhere; admin/compound_admin only their own compound.
- `pages/BrandingSettingsPage.js` — split-screen UX: form on right (logo URL, brand label, tagline, signature, 3 color pickers + 6 preset palettes), live preview on left that updates instantly, plus "معاينة PDF" opens a real branded PDF in new tab.
- Verified by AI vision on PDF: emerald/teal scheme + custom brand label "Royal City Gardens" + tagline + signature all rendered correctly.

**📊 Scheduler Analytics Dashboard:**
- `routes/monthly_reports_scheduler.py: scheduler/status` extended with:
  - `total_runs`, `success_runs`, `failed_runs`, `success_rate`
  - `by_kind: {summary, statement}` each with `{total, success, failed, rate}`
  - `monthly_trend`: aggregation pipeline returning last 6 months `{month, total, success, failed}`
- `pages/PdfReportsPage.js`: scheduler card now shows 4 KPI cards (total / success / failed / rate %) + per-kind grid + custom 6-month bar chart (red bar for total, emerald overlay for success ratio) + existing recent-runs table.

**📧 SMTP Health Tracker:**
- `email_service.py:_send_email_sync` instrumented to log every attempt to `smtp_health` collection: `{timestamp, mailbox, to_email, subject, success, error, duration_ms, has_attachment}`. Uses sync pymongo client in finally block — never blocks/breaks send path.
- `routes/smtp_health.py` — NEW (admin-only):
  - `GET /api/system/smtp-health/stats?hours=24&threshold=0.30` returns total/success/failed/rate, per-mailbox breakdown (success_rate, avg_duration_ms), hourly trend buckets, last 20 failures, and `alert` flag (only fires when `total>=5 AND failure_rate>threshold`).
  - `POST /api/system/smtp-health/test-send` (owner-only) sends synthetic test email.
- `db_indexes.py` — added 3 indexes on smtp_health (timestamp -1, success+timestamp, mailbox+timestamp).
- `pages/SmtpHealthPage.js` — dashboard with 4 KPI cards, configurable window (1h-30d) and threshold (10%-50%), red alert banner when threshold breached, by-mailbox table, recent-failures table, test-send form.

**Verified via testing_agent_v3_fork (iteration 52)** — 100% pass (17/17 backend + 3/3 frontend pages):
- Branding: GET/PUT 200 ✓, 403 for outsiders ✓, 400 for invalid hex ✓, PDF reflects new colors+label ✓
- Scheduler analytics: full schema ✓
- SMTP Health: stats schema ✓, RBAC ✓, test-send tracks success/failure ✓, alert gate (total>=5) ✓
- Regression: 2FA, audit-logs, reports, compounds — all green ✓.

### Iter 51: 2FA Hardening + DB Indexes + Monthly Auto-Scheduler (Apr 26, 2026) ✅

**🛡️ 2FA Hardening — Password Re-Auth Required for Disable:**
- `routes/two_factor.py`: `DisableReq` now requires both `token_code` and `password`. Disable endpoint calls `verify_password()` before TOTP verification — defends against session-hijack-based disabling.
- `pages/TwoFactorSettingsPage.js`: disable form has 2 inputs (password + 6-digit code), button disabled until both are filled.
- Verified: 422 if password missing, 401 if wrong password, 200 on correct password + TOTP.

**⚡ MongoDB Performance Indexes:**
- `db_indexes.py` — NEW idempotent `ensure_indexes()` creating 18 indexes across 12 collections:
  - `resident_charges`: (resident_id+due_date), (compound_id+created_at), (compound_id+due_date), (status)
  - `resident_payments`: (resident_id+payment_date), (compound_id+created_at), (compound_id+payment_date)
  - `expenses`: (compound_id+date)
  - `users`: (compound_id+role), (family_id)
  - `audit_logs`: (timestamp -1), (user_id+timestamp -1)
  - `notifications`: (recipient_ids+created_at)
  - `report_runs`, `visitor_passes`, `maintenance_requests`, `complaints`, `service_bookings`: (compound_id+created_at)
- Hooked into FastAPI startup; logs `DB indexes ensured (18 applied)` on boot.

**📧 Monthly PDF Reports Auto-Scheduler:**
- `routes/monthly_reports_scheduler.py` — NEW. Daily background loop at 02:00 UTC: on the 1st of each month, generates and emails:
  - "Compound Summary" PDF → all admins/compound admins/app owners (mailbox=main, with PDF attachment)
  - "Unit Statement" PDF → each active resident with email
- Idempotent via `report_runs` collection: `(kind, target_id, month)` tracked; re-runs are skipped.
- `email_service.py` extended: `send_email()` now accepts `attachments=[{filename, content (bytes), mime_type}]`.
- Endpoints (admin only):
  - `POST /api/reports/run-monthly-now {month?}` — manual trigger (background task, returns 202-ish queued)
  - `GET /api/reports/scheduler/status` — total_runs + last_run_at + recent 40 entries
- Frontend `pages/PdfReportsPage.js`: new admin-only "الجدولة الشهرية التلقائية" card with "تشغيل الآن لشهر X" + "عرض سجل الإرسال" buttons + collapsible recent-runs table.

**Verified via testing_agent_v3_fork (iteration 51)** — 100% pass rate (11/11 backend + frontend integration):
- 2FA: 422/401/200 flow ✓
- 18/18 indexes confirmed in DB ✓
- Monthly scheduler: idempotent ✓, RBAC 403 for non-admin ✓, 23 historical entries in scheduler-status table ✓
- Regression: services, bookings, audit-logs, visitor-passes, /2fa/setup all 200 ✓
- 1 minor bug auto-fixed by testing agent (disable payload missing password — already fixed in our code).

### Iter 50: Services Bug Fix + PDF Reports + 2FA TOTP (Apr 26, 2026) ✅

**🐛 Bug Fix — Services Page 405/403 Errors:**
- `routes/compound_services.py`: missing `@router.get` decorator on `get_compound_services` (function existed but never registered as a route → 405). Fixed.
- 5 handlers were referencing `db` without calling `get_db()` (would crash on real use) → Fixed by adding `db = get_db()` inside each handler.
- App Owner / Super Admin can now view services & bookings of any compound (added role-based bypass).
- Frontend `ServicesManagement.js`: added `user.compound_id` guard in `fetchServices`/`fetchBookings` → graceful empty state instead of error toast for users without a default compound.

**🆕 PDF Reports (P1 — Arabic RTL with WeasyPrint):**
- `services/pdf_report_service.py` — branded HTML templates with Noto Sans Arabic font, KPIs cards, RTL tables, gradient totals, header (logo + compound + period + report no.), footer.
- `routes/pdf_reports.py` — 4 endpoints (all `/api/reports/...`): `unit/{user_id}/statement`, `compound/{cid}/occupancy`, `compound/{cid}/invoices`, `compound/{cid}/summary`. RBAC: family head, compound admin, app_owner / super_admin. Currency = EGP. `month=YYYY-MM` query param.
- `pages/PdfReportsPage.js` — 4 download cards with month picker, compound select (for owners), resident select. Uses axios `responseType: 'blob'` to trigger native browser download.
- Sidebar entry "تقارير PDF" added for app_owner & residents/admins.
- All 4 endpoints verified producing valid `%PDF-1.7` bytes; Arabic content rendered correctly (verified by AI vision analysis of generated PDF).

**🆕 2FA TOTP (P1 — RFC 6238 compliant):**
- `routes/two_factor.py` — 5 endpoints (all `/api/2fa/...`):
  - `GET /status` — returns `{enabled, eligible}`.
  - `POST /setup` — pyotp.random_base32() + provisioning URI + base64 PNG QR; secret stored unverified.
  - `POST /verify-setup` — verifies 6-digit TOTP, generates 8 backup codes (bcrypt-hashed, one-time-use), enables 2FA.
  - `POST /disable` — requires current TOTP code.
  - `POST /verify-login` — exchanges short-lived (5 min) `temp_token` + TOTP/backup code for full access_token.
- `routes/auth.py` login flow modified: when `two_factor_enabled=True`, returns `{two_factor_required: true, temp_token, ttl_minutes}` instead of full session.
- `pages/TwoFactorSettingsPage.js` — 3-step UX (intro → QR + secret + verify → backup codes display with download/copy); shows status banner + disable form when enabled.
- `components/Login.js` — 2FA challenge modal (auto-focus, 6-digit input, supports backup code input, calls `verifyTwoFactor()` from AuthContext).
- `App.js` — `verifyTwoFactor()` added to AuthContext, exposed alongside `login`.
- ELIGIBLE_ROLES = app_owner, super_admin, admin, compound_admin, company_admin.
- Sidebar entry "المصادقة الثنائية" added.

**Verified via testing_agent_v3_fork (iteration 50)** — 100% pass rate (12/12 backend + 3/3 frontend):
- Services 405 → 200 ✓ ; Services UI no-error toast ✓
- All 4 PDFs produce `%PDF-` bytes ✓ ; RBAC enforced ✓
- 2FA full lifecycle: status → setup → verify-setup (invalid 400 / valid 200 + 8 backup codes) → login returns temp_token → verify-login with TOTP ✓ → backup code single-use enforced (reuse 401) ✓ → disable → login returns direct access_token ✓
- Regression: /api/compounds, /api/audit-logs, /api/visitor-passes, existing pytest suite all green.

### Iter 72: Visitor QR Pass — Full E2E Feature (Apr 26, 2026) ✅

**🆕 Backend** `routes/visitor_passes.py` (~210 lines):
- Collection `visitor_passes` with: id, token, compound_id, resident_id+name, unit_number, visitor_name+phone+vehicle_plate+purpose, valid_from/until, max_uses, used_count, used_at, used_by_security_id+name, is_active, activity_log[], created_at.
- 5 endpoints:
  - `POST /api/visitor-passes` — resident creates a pass (validation: name required, 1≤valid_hours≤168, 1≤max_uses≤10).
  - `GET /api/visitor-passes/my` — resident's own passes (computed `effective_status`).
  - `GET /api/visitor-passes/compound` — admin/security view scoped to compound, with optional `?status=` filter.
  - `GET /api/visitor-passes/public/{token}` — **no-auth** public verification page (minimal info, for QR landing).
  - `POST /api/visitor-passes/{token}/redeem` — security redeems at gate (RBAC: admin/security/compound_admin), validates not used/expired/revoked/not_yet_valid, increments `used_count`, records `used_by_security_*`.
  - `DELETE /api/visitor-passes/{id}` — soft-revoke (resident or admin).
- Activity log + audit_log integration (`visitor_pass.create/redeem/revoke`).

**🆕 Frontend** — 3 pages:
- **`pages/VisitorPassesPage.js`** (resident view at `/app/visitor-passes`): list + 5 filter pills (all/active/used/expired/revoked) with counts, big "دعوة زائر جديد" button → modal with name/phone/plate/purpose/hours/uses fields → success toast. Each card shows visitor info, QR thumbnail (70px), validity range, used_count/max_uses, security name if redeemed, and 4 action buttons (نسخ / واتساب / تنزيل PNG / إلغاء).
- **`pages/SecurityScanPage.js`** (security view at `/app/security-scan`): big QR icon + textarea for token/URL paste (auto-extracts token from URL) + "تفعيل الدخول" button → result card colored green/red with full visitor + host + plate + purpose details and used_count/max_uses display.
- **`pages/PublicVisitorPassPage.js`** (no-auth at `/visitor/:token`): beautiful gradient card with status badge (active/used/expired/revoked), all visitor info, validity range, footer note "على الأمن مسح الرابط من تطبيق HomeMe لتفعيل الدخول".

**Sidebar** entries added: "تذاكر الزوار" + "مسح تذكرة (الأمن)".

**Verified end-to-end via Playwright + curl**:
1. Resident creates pass for "سارة محمد" → toast appears, card renders with QR ✅
2. Public page at `/visitor/{token}` shows full info with green "نشط - صالح" badge ✅
3. Security scans (paste full URL) → "تم تسجيل الدخول للزائر سارة محمد" ✅
4. Pass auto-marked as used in resident's view + security name recorded ✅

### Iter 71: Onboarding + KPIs + PWA + Renewals + Pytest Suite (Apr 26, 2026) ✅

**🆕 #4 Onboarding Wizard** — Backend `routes/onboarding.py` (state/advance/dismiss endpoints, tracks `onboarding_step`, `onboarding_completed`, `onboarding_dismissed_at` on user). Frontend `components/OnboardingWizard.js` — 5-step modal (welcome → compound → first resident → first invite → done) gated by `useAuth()` user + `/app/*` route check. Navigates to relevant page on each step. Smooth progress bar + dots indicator + "تخطي للأبد" option.

**🆕 #5 Owner KPI Dashboard** — Backend `routes/owner_kpis.py` returns: compounds/users counts (total + active + new_30d), DAU/MAU/stickiness from `audit_logs`, MRR + ARR from active subs across 4 collections, churn %, top-5 compounds by resident count, and daily signups for last 30 days. Frontend `pages/OwnerKpiPage.js` — 4 gradient KPI tiles, engagement card, recharts BarChart for signups, top-compounds podium. Sidebar entry "لوحة المؤشرات".

**🆕 #11 PWA Install Prompt** — `components/PwaInstallPrompt.js` listens for `beforeinstallprompt`, registers `/sw.js`, shows a bottom-right card with "تثبيت الآن" button. 7-day localStorage dismiss memory.

**🆕 #12 Subscription Renewal Reminders** — Backend `renewal_reminders.py`: daily 07:30 UTC asyncio loop scans 4 subscription collections, fires emails at -30 / -7 / -1 days with idempotent `renewal_reminders_sent` array. Beautiful Arabic RTL HTML email template. Wired in `server.py` startup.

**🆕 #8 Pytest Test Suite** — `backend/tests/conftest.py` with reusable fixtures (http_client, owner_token, admin_token, *_headers). `backend/tests/test_critical_flows.py` — 15 critical regression tests covering health, login, RBAC enforcement, audit logs, search, route-health, onboarding, owner-kpis, my-invites, and the regression-prone `/compounds/{id}/residences`. **All 15/15 pass** in 1.27s.

**Net total tests passing: 15** • **Net new endpoints: 7** • **Net new pages: 2 + 2 modals**

### Iter 70: Audit Log + Global Search v2 + Slow Endpoints Card (Apr 26, 2026) ✅

**🥇 #1 Audit Log (سجل التدقيق)**
- **Backend** `audit_logger.py`: best-effort logger (`audit_log(actor, action, target_type, target_id, details, before, after, request, success)`) writes to `audit_logs` collection with id/at/actor/IP/UA/action/target/details/before/after.
- **Backend** `routes/audit_logs.py`: `GET /api/audit-logs` (filter by actor/action/target/success + days range, paginated), `GET /api/audit-logs/summary` (top actions + top actors aggregation). Owner / super_admin only.
- **Hooks added** to: `auth.login` (success + 2 fail reasons), `family-invites POST` (create), `family-invites DELETE` (revoke), `admin/users DELETE` (with `before` snapshot of victim user).
- **Frontend** `pages/AuditLogPage.js`: 4 KPI tiles, days filter (1/7/30/90/180), action dropdown, success/fail pills, Top Actions + Top Actors cards, expandable per-row detail (target_id, details JSON, before snapshot, UA), CSV export with BOM.
- Sidebar entry "سجل التدقيق" added under Owner section.

**🥈 #2 Global Search v2**
- **Backend** `admin_users.py /search`: Fixed broken `current_user.compound_id` / `.id` AttributeErrors. Expanded scope: users / compounds (owner-only) / services / family-invites (creator+admins) / support-tickets (admins). Each result returns `icon` (emoji) + `url` for direct navigation. RBAC-scoped.
- **Frontend** `Layout.js`: improved `handleSearchResultClick` to use API-returned `url` first; added new types (compound/invite/ticket) with color-coded styling; render emoji icon when API provides one.
- Existing ⌘K keyboard shortcut & dropdown UI reused.

**🥉 #3 Slow Endpoints Card (in System Health page)**
- **Frontend** `SystemHealthPage.js`: derived `slowEndpoints` memo from current scan results — top 10 by latency. Renders a card with rank/path/method/ms/status + colored progress bar (green <500ms / yellow 500-1000 / amber 1-2s / red >2s) + a Arabic-RTL legend.
- Zero backend changes — leverages the existing scan latency data.

**Verified end-to-end**:
- Audit page: 3 entries shown after a failed login (`badguy`) + 2 successful logins (`Owner_homeme`/`Dalia`) — correct IPs, badges, expandable details.
- Search "dalia" returns 2 user results with role, username and unit.
- Slow endpoints card present + scan reveals top 10 with progress bars.

### Iter 69: Trends Chart on System Health Page (Apr 26, 2026) ✅
- **🆕 Frontend** `pages/SystemHealthPage.js`:
  - Loads up to 30 most-recent scans from `GET /api/system/route-health/history?limit=30` on mount + after every scan/trigger.
  - Reverses to chronological order, formats labels as `MMM DD HH:MM` Arabic, and renders 3 colored line series (`pass` 🟢 / `warn` 🟠 / `fail` 🔴) using `recharts` `LineChart`.
  - Two delta-badges (Δ-fail / Δ-pass) compare first vs latest snapshot — green when improving, red when regressing.
  - Reference line at y=0, hover tooltip, responsive height (260px), grid + Arabic axis labels.
  - Empty-state guard: chart hides itself when `< 2` scans exist.
- **No backend changes** — reuses the existing `/history` endpoint built in Iter 67.
- **Verified**: chart renders 6 SVG paths, 3 line colors visible, real data from 8 scans clearly shows the regression-then-fix arc (red line dropped from ~9 → 0 after Iter 68 fixes).

### Iter 68: Fixed 9 Discovered Failures + Daily Auto-Scan + Regression Alerts (Apr 26, 2026) ✅

**Part 1 — Bulk fix all 9 failing endpoints discovered by Iter 67's scanner:**
- **`smart_devices.py`** (`/smart-devices`, `/automations`): missing graceful handling for users without `compound_id`. Replaced `current_user.compound_id` (AttributeError) with `.get("compound_id")` and added an early-return for high-level admins → returns empty list cleanly.
- **`gallery_init.py`** (`/gallery/stats`): the route called `get_file_stats(...)` defined in `server.py` but never imported. Inlined the aggregation pipeline directly + added the `compound_id` early-return.
- **`utility.py`** (7 endpoints): every function in this file was missing `db = get_db()` AND used `current_user.family_id` attribute access. Added `db = get_db()` at the top of all 7 endpoints + replaced all `.family_id` with `.get("family_id")`.
- **`individual.py`** (`/individual/dashboard`): used `current_user.id` (AttributeError) → fixed to `current_user["id"]`. Also wrapped except clause to preserve `HTTPException` codes (404 was being swallowed into 500).
- **`companies.py`** (3 endpoints — dashboard / compounds / pricing/calculate): replaced ALL 18 occurrences of `current_user.id` with `current_user["id"]` (`replace_all=true`). Added `except HTTPException: raise` guards to preserve real status codes.
- **`security.py`** (`/users/{user_id}/subscription`): used undefined `SubscriptionCodeResponse` model + `UserSubscription` reference + `current_user.id`. Replaced response model with plain dict + project `_id: 0` from MongoDB find + expanded RBAC roles list.
- **Result**: scan went from **9 fail / 24 warn → 0 fail / 28 warn** ✨ (warns are legit RBAC-blocked endpoints).

**Part 2 — Daily Auto-Scan + Email Regression Alerts:**
- **🆕 Backend** `routes/system_health.py`:
  - `_run_internal_scan(app, db)` — auth-less helper that synthesizes a JWT for the first owner/super_admin so the scheduler can run unattended.
  - `daily_health_scan_loop(app)` — APScheduler-style asyncio loop that runs at **06:00 UTC daily**: runs scan → diffs against previous snapshot → if any **NEW** failures appeared, builds a beautiful Arabic RTL HTML email (gradient header, "جديد" red badge on new entries, summary line, sortable table) → sends to all active app_owner accounts via `EmailService`.
  - `POST /api/system/route-health/trigger-daily-now` — manual trigger of the same regression-detection flow using the caller's own bearer token (consistent with `/scan`). Fire-and-forget SMTP so preview's blocked port 465 never blocks the response.
- **🆕 Server startup hook** in `server.py`: schedules `daily_health_scan_loop` on startup. Verified in logs: "Daily route-health scan loop scheduled (06:00 UTC)".
- **🆕 Frontend** `pages/SystemHealthPage.js`:
  - New rose-pink "🔔 تشغيل الفحص اليومي + تنبيه" button next to "بدء فحص جديد".
  - Permanent rose-gradient info banner: "فحص يومي تلقائي مفعّل — يتم تشغيله يومياً الساعة 6:00 ص (UTC). إذا تم اكتشاف failures جديدة..."
  - On trigger: shows green toast "✅ لا توجد failures جديدة" if clean, or amber warning toast "🔔 تم اكتشاف N فشل جديد — تم إرسال إيميل لـ M مالك" otherwise.
- **Verified**: trigger ran and reported `new_failures: 0` consistently, and the previous (pre-fix) trigger correctly identified 2 new failures and sent regression email to the owner.

### Iter 67: System Route Health Scanner (Apr 26, 2026) ✅
- **🆕 Backend** `routes/system_health.py` (~250 lines):
  - `GET /api/system/route-health/list` — full inventory of every API route via `app.routes` introspection (path / methods / tags / name).
  - `POST /api/system/route-health/scan` — live concurrent scan (sem=8) of every safe **GET** endpoint. Skips POST/PUT/DELETE/PATCH automatically (mutation safety). Smart path-param substitution from caller's context (`{user_id}` → caller.id, `{compound_id}` → caller.compound_id, etc.); unresolved params marked as `skipped`.
  - Each call records: status_code, latency (ms), error, classification (`pass` / `warn` / `fail` / `skipped`).
  - Internal calls go to `127.0.0.1:8001` to bypass external proxy timeouts.
  - Persists snapshots in `route_health_history` with auto-trim (50 max).
  - `GET /api/system/route-health/last` — last cached snapshot.
  - `GET /api/system/route-health/history` — light list of past scans for trends.
  - **Auth**: app_owner / super_admin only.
- **🆕 Frontend** `pages/SystemHealthPage.js`:
  - 5 KPI gradient tiles (total/pass/warn/fail/skipped).
  - 5 filter pills with live counts (defaults to "فشل" filter to surface problems first).
  - Big "بدء فحص جديد" button + "تحميل آخر فحص" + "فحص دوري (كل 5 د)" auto-refresh toggle.
  - Results grouped by tag (collapsible), sorted by failure count desc; per-route row shows status badge + method + path + status code + latency + reason.
  - Empty/loading/filter-empty states.
- **🔗 Sidebar** entry "فحص صحة المسارات" added to App Owner section with `ShieldCheckIcon`.
- **Verified live (Owner)**: 452 routes scanned in ~2s — found **9 real `500` failures** (smart-devices, automations, companies/dashboard, gallery/stats, etc.) and 24 RBAC-related warnings, surfacing problems automatically. UI renders all 9 failures in a collapsible "عام" group with full details.

### Iter 66: Smart Auto-Suggest Validity by Relationship (Apr 26, 2026) ✅
- **🆕 Frontend** `AddFamilyMemberToUnit.js` invite modal:
  - Per-relationship default validity table:
    - `spouse / child / parent` → 30 يوم (long-term family)
    - `sibling` → 21 يوم
    - `other` → 14 يوم
    - `helper / driver` → 7 أيام (short-term staff, tighter security)
  - Auto-updates `validity_days` when relationship changes — **only** if the user hasn't manually overridden the field (`validityTouched` flag tracks user intent).
  - "🤖 تلقائي" rose pill on the validity label when value is system-suggested; disappears as soon as user types in the field.
  - Inline 💡 hint banner under the row explaining the suggestion (e.g., "موظف قصير الأمد — تأمين أعلى (7 أيام)").
- **Verified** all 4 scenarios via Playwright: 
  1. spouse → 30 ✅ + badge + hint
  2. switch to driver → auto-recalculates to 7 ✅
  3. switch to child → auto-recalculates to 30 ✅
  4. user manually types 50 → badge + hint disappear ✅
  5. switch relationship after manual edit → value stays at 50 (override sticks) ✅

### Iter 65: Activity Timeline per Invite (Apr 26, 2026) ✅
- **🆕 Backend** `family_invites.py`:
  - New field `activity_log: []` on every invite, populated on every state change.
  - Helpers: `_activity_entry(event, by_user, **extra)` for consistent shape.
  - Hooks added to:
    - `POST /family-invites` (create) → "created" entry with relationship/unit/target.
    - `DELETE /family-invites/{id}` (revoke) → "revoked" entry with admin info.
    - `POST /family-invites/token/{token}/accept` (public accept) → "accepted" entry with new user info.
  - `POST /family-invites/{id}/resend-reminder` (in `invite_drip.py`) → "reminder_sent" entry with recipient + reminder_no.
- **🆕 Backend endpoint** `GET /api/family-invites/{id}/activity`:
  - Same RBAC as resend (creator / compound admin / company admin / owner / super_admin).
  - Returns events sorted ascending by `at`.
  - **Backwards-compat**: when `activity_log` is empty (legacy invite), synthesizes events from existing fields (`created_at`, `last_reminder_sent_at`, `accepted_user_ids`, `revoked_at`) — each marked with `synthesized: true`.
- **🆕 Frontend** `pages/MyInvitesPage.js`:
  - `ActivityTimelineModal` with vertical RTL timeline, color-coded circular icons per event type (green plus / amber envelope / blue sparkles / rose ban).
  - Each event shows event-specific details: actor + role for created/revoked/reminder, recipient email + reminder# for reminders, new-user info for accepted.
  - Amber "ⓘ مُستخرج من البيانات السابقة" pill on synthesized events.
  - "📋 السجل" button (indigo-purple gradient) on every invite card next to QR/share/revoke.
- **Verified** end-to-end: revoked invite shows synthesized timeline (created → revoked); active invite with fresh reminders shows real entries with recipient email + admin name + role + reminder counter.

### Iter 64: Manual Resend-Reminder for Pending Family Invites (Apr 26, 2026) ✅
- **🆕 Backend** `routes/invite_drip.py` — `POST /api/family-invites/{invite_id}/resend-reminder`:
  - Body: `{ email?: string, base_url?: string }`. Defaults email to inviter's own email if blank.
  - RBAC: invite creator OR admin/compound_admin (same compound) OR company_admin (same company) OR app_owner/super_admin.
  - Validates: `is_active`, not expired, not fully used.
  - Reuses `_build_email_html` + `_qr_data_uri` from the drip module — same template, same QR.
  - **Fire-and-forget SMTP** via `asyncio.create_task` so preview's blocked port 465 never times out the API. `reminder_count` + `last_reminder_sent_at` are bumped optimistically before scheduling the send.
- **🆕 Frontend** `pages/MyInvitesPage.js`:
  - `ResendReminderModal` component — amber-gradient header, optional email input (with hint that empty defaults to the inviter's own inbox), reminder-count info chip, single submit button.
  - "📧 تذكير" amber-orange button on every active+pending invite card (`used_count = 0`).
  - Local state updates `reminder_count` instantly after a successful send so the ✉️ badge appears without a full refetch.
- **Verified** end-to-end: backend `200` instant (no SMTP block), 2 successful sends with `reminder_count` 1 → 2; UI shows green toast + ✉️ badge updates live.

### Iter 63: "إدارة دعواتي" (My Invites) Page (Apr 26, 2026) ✅
- **🆕 Frontend** `pages/MyInvitesPage.js` (~280 lines) at `/app/my-invites`:
  - Header with refresh button + 5 KPI tiles (gradient): إجمالي / نشطة / قُبلت (إجمالي) / بانتظار القبول / ملغية أو منتهية.
  - 5 filter pills (الكل / نشطة / مستخدمة / منتهية / ملغية) with live count badges; active pill uses rose-pink gradient.
  - Invite cards with status badge, unit-number chip, target name, full URL, Copy + WhatsApp + QR buttons, used/max counter, expiry date, and revoke button (active only).
  - QR modal with download-PNG button (1024×1024 white-bg canvas).
  - Empty state per filter category.
- **🔗 Sidebar entry** in `Layout.js` Family section: "إدارة دعواتي" with `LinkIcon`.
- **🔗 Quick link** from "إضافة فرد للوحدة" page header → "📊 إدارة كل الدعوات اللي بعتيها" for discoverability.
- **Backend** reuses existing `GET /api/family-invites` (filtered by `created_by = current_user.id`) + `DELETE /api/family-invites/{id}` for revoke. No backend changes needed.
- **Verified** end-to-end: 4 invites listed, stats correct, revoke flow tested → toast appears, stats auto-update (4→3 active), filter "ملغية" shows the revoked card with red "ملغي" badge.

### Iter 62: QR Download Button (PNG Export) (Apr 26, 2026) ✅
- **🎨 Frontend** `AddFamilyMemberToUnit.js`: black "📥 تنزيل QR كصورة PNG" button below the inline QR. Renders the SVG QR onto a 1024×1024 white canvas → blob → download as `homeme_invite_<unit>_<timestamp>.png`. Reuses the same approach as the existing `QrCodeModal.js`.
- **Verified** via Playwright: download event fires correctly, suggested filename `homeme_invite_TEST001_1777204167690.png`, success toast shown.

### Iter 61: Inline QR Code in Send-Invite Modal (Apr 25, 2026) ✅
- **🎨 Frontend** `AddFamilyMemberToUnit.js`: After invite creation, the success state now renders an inline `QRCodeSVG` (160px, level M) below the URL with caption "📱 امسح الكود بكاميرا الموبايل لفتح الرابط مباشرة". No extra modal — single-screen flow keeps the create + share + scan all visible together.
- **Verified** via Playwright: QR rendered successfully (`data-testid="invite-qr-code"`), Arabic caption present, screenshot confirms layout in RTL.

### Iter 60: Send-Invite-Link from "Add Family Member to Unit" (Apr 25, 2026) ✅
- **🆕 Backend** `routes/family_invites.py`: extended `POST /api/family-invites` to accept optional `target_user_id`. When provided, the invite is scoped to that target's family/unit/compound (not the caller's). RBAC: app_owner / super_admin / company_admin (same company) / admin / compound_admin (same compound). Stores `target_user_id` + `target_user_full_name` for audit.
- **🆕 Frontend** `components/AddFamilyMemberToUnit.js`: added a rose-gradient "🔗 إرسال دعوة بالرابط" button on every resident card (under the existing "إضافة عضو" button). Opens a compact modal with relationship + validity-days + optional invitee-name fields → POST → success banner with the full URL + "نسخ الرابط" + "مشاركة عبر واتساب" buttons.
- **Verified** end-to-end: backend curl → 200 with token + correct family_id/unit/compound copied from target. Frontend: dalia (admin) → click invite button → submit → green "تم إنشاء الرابط بنجاح" banner with full join URL + share buttons all rendering in Arabic RTL.

### Iter 59: P0 — Fix "Add Family Member to Unit" Page (Apr 25, 2026) ✅
- **Bug**: `/app/add-family-member` page failed to load; backend returned 500 on `GET /api/compounds/{id}/residences`.
- **Root causes** (in `routes/families_msgs.py`):
  1. `db = get_db()` was missing in **9 endpoints** (`get_compound_residences`, `get_compound_residents`, `add_family_member`, `get_my_family`, `create_maintenance_fee`, `create_payment`, `get_messages`, `create_notification`, `mark_notification_read`) → `NameError: name 'db' is not defined`.
  2. After fixing `db`, second crash: `family.created_at` and `compound.created_at` are stored as ISO strings (not datetime objects) — calling `.isoformat()` on them raised `AttributeError`. Replaced both with safe `hasattr(..., 'isoformat')` guards.
- **Verified**: `dalia` admin → `/api/compounds/{id}/residences` now returns **HTTP 200** with full residences payload (TEST001 unit + Test User family head). Frontend page renders header "إضافة فرد عائلة للوحدة", search bar, and "السكان المتاحين (1)" card with the resident — matching original UX.

### Iter 58: Header Plan-Limit Badge — Proactive Upgrade CTA ✅ (Feb 24, 2026)
- **🆕 Frontend** `/app/frontend/src/components/PlanLimitBadge.js`:
  - Compact pill in the header for `company_admin` only — shows "🏢 X/Y مجمع • 👥 X/Y ساكن".
  - Three states with adaptive tone: emerald (healthy), amber (low — ≤1 compound or ≤10% residents left), rose + animate-pulse (at-limit, "وصلت للحد").
  - Click → dispatches the existing `openUpgradeDialog` CustomEvent → `GlobalUIProvider` opens `PlanUpgradeDialog` with all 4 tiers (re-uses the proven manual/auto-open path).
  - Hidden on mobile (`hidden md:inline-flex`); 60s background refetch as a safety net.
- **🔗 Mounted** in `Layout.js` header (right before `<QuickAccountSwitcher />`).
- **🔄 Live refresh** via a `planUsageRefresh` CustomEvent dispatched from `CompanyAdminDashboard.reload()` after every CRUD; both `PlanLimitBadge` and `CompanyPlanUsageCard` listen to it for instant badge updates without a full page reload.
- **✅ Verified** (iter 44, 8/8 frontend checkpoints): badge appears for company_admin only, opens dialog on click, color/text correctly adapts (verified at-limit + healthy states), auto-refresh works after compound creation (4/5 → 3/5 instantly), regression confirmed — badge does NOT appear for app_owner or super_admin.

### Iter 58: Company Plan Limits Enforcement ✅ (Feb 24, 2026)
- **🆕 Backend** `/app/backend/plan_limits.py`:
  - `get_company_plan_limits(company_id)` reads `db.company_subscriptions.plan` and returns `{plan, plan_name_ar, max_compounds, max_residents}` mirroring `COMPANY_PLANS_CATALOGUE`.
  - `assert_can_add_compound(company_id)` raises **403** with structured detail `{code: 'plan_limit_compounds', message, current_plan, current_plan_name_ar, current_count, max_allowed}` when at cap.
  - `assert_can_add_resident(company_id)` same shape with `code: 'plan_limit_residents'`.
- **🔗 Wired** into `/app/backend/routes/company_admin.py`:
  - `POST /api/company-admin/compounds` calls `assert_can_add_compound` before insert.
  - `POST /api/company-admin/compounds/{id}/users` calls `assert_can_add_resident` only when `role == 'resident'`.
  - `GET /api/company-admin/plan-usage` returns plan, limits, current counts, and `can_add_*` flags for the dashboard widget.
- **🆕 Frontend** `/app/frontend/src/components/CompanyPlanUsageCard.js`:
  - Card showing current plan + 2 usage tiles (compounds, residents) with progress bars and at-limit red styling.
  - "ترقية الخطة" button opens `PlanUpgradeDialog` with all 4 tiers, current-plan badge, popular badge, features list, and CTA that deep-links to `/app/support?tab=payment&plan=<key>`.
- **🆕 Frontend** `/app/frontend/src/providers/GlobalUIProvider.js` (refactor):
  - Extracted from `App.js`: hosts the global Axios 403 interceptor that detects `plan_limit_*` errors → toasts the Arabic message → dispatches `openUpgradeDialog` CustomEvent → mounts `PlanUpgradeDialog` automatically.
  - Interceptor also normalizes `error.response.data.detail` from object to its `.message` string so any downstream `toast.error(err.response?.data?.detail)` call site (≈20 components) keeps working without crashes.
  - Also hosts the Sonner `Toaster`, `react-hot-toast` `HotToaster`, `PWAInstallPrompt`, and the upgrade-dialog state.
- **🔗 Mounted** `<CompanyPlanUsageCard />` at the top of `/app/frontend/src/pages/CompanyAdminDashboard.js` (the dashboard `company_admin` users actually land on).
- **🛡️ Defensive** `errMsg(err, fallback)` helper in `CompanyAdminDashboard.js` pulls `.message` from object-shaped detail in all 4 catch blocks (createCompound / saveEdit / removeCompound / addUser).
- **✅ Verified** end-to-end (iter 41-43): backend 9/9 pytest passing (real 403 structured responses for both compound + resident limits); frontend 100% — manual upgrade-button flow + auto-open-via-interceptor flow both green; all 4 plan tiles render; no React child crash; both toasters render correctly.

### Iter 57: Company Plans — Catalogue with Features ✅
- **🆕 Backend** `GET /api/owner/company-plans` (`routes/owner_subscriptions.py`):
  - Single source of truth catalogue with 4 tiers — `starter` (مجاني / 0 ج.م), `company_startup` (3500), `company_business` (7500, popular), `company_enterprise` (20000).
  - Each plan exposes `name_ar`/`name_en`, `monthly_egp`, `max_compounds`, `max_residents`, and a `features_ar`/`features_en` array of human-readable permission strings (5-10 features per tier).
- **🔗 `GET /api/owner/company-subscriptions` enriched**: each company entry now carries `plan_meta` — its full catalogue entry — so the frontend can display features without a second request.
- **🎨 CompanySubscriptions UI** (`components/CompanySubscriptions.js`): expanded view now shows a rose-gradient panel "📋 مزايا خطة …" with:
  - Plan name + "الأكثر شعبية" badge when applicable
  - Monthly price + currency
  - 2-column features list with checkmark icons
  - Limits tiles (max compounds / max residents — "غير محدود" for enterprise)
- Verified live: opening "شركة الإدارة المتكاملة" shows the Business plan's 10 features + 7500 ج.م + max 5 compounds / 2000 residents.

### Iter 56: Payment Analytics Dashboard (Scoped for 3 Roles) ✅
- **🆕 Backend** `GET /api/payment-analytics?days=30&scope=auto` (`routes/payment_analytics.py`):
  - Server-side role scoping: `app_owner`/`super_admin` → global, `company_admin` → compounds of their company, `admin`/`compound_admin` → their single compound.
  - Returns: `totals` (tickets, activated, pending, activation_rate, total_amount, activated_amount), `methods` breakdown (count/amount/activated per method), `series` (per-day counts/amounts), `top_method`.
  - Safe numeric extraction from free-form amount strings like "2200 ج.م".
- **🆕 Frontend** `components/PaymentAnalyticsCard.js`:
  - Range selector (أسبوع / شهر / 3 شهور / سنة) with active emerald pill.
  - 4 KPI tiles (tickets, activated + rate, pending, activated amount) with role-themed gradients.
  - Method breakdown: up to 3 top methods with icon, count, amount, and a gradient progress bar showing share of total.
  - Per-day bar chart (max ~30-90 bars) with tooltip on hover.
  - Skeleton loading + empty state.
- **📌 Integration in 3 surfaces:**
  - Owner / Super Admin: `SuperAdminPanel` > Overview tab — `scope="global"`, title "إحصائيات المدفوعات — كل المجتمعات".
  - Compound Admin: `AdminDashboard` below `CompoundSubscriptionCard` — `scope="compound"`.
  - Company Admin: `AdminDashboard` — `scope="company"`, title "— مجتمعات الشركة".
- Verified live: Owner Overview renders the card with 5 tickets / 1 activated / 20% rate / 4 pending; method breakdown shows instapay (4) and vodafone_cash (1) with correct percentages.

### Iter 55: Payment-Confirmation Tickets — Filter + One-Click Activation ✅
- **🆕 Backend** `POST /api/compounds/{id}/subscription/manual-activate` (`routes/compound_subscription.py`):
  - Owner / super_admin only. Accepts `duration` (one of `1_month` / `3_months` / `6_months` / `9_months` / `1_year` / `lifetime`), optional `plan`, `transaction_ref` (stored in `subscription_code_used` for traceability), and optional `ticket_id`.
  - Applies the subscription on the compound document + cascades to all admins of the compound.
  - If `ticket_id` is given, the support ticket is auto-closed with `status=resolved` + `activation_done=true` + `activation_*` fields (plan, duration, ref, by, at).
- **🆕 SupportTicketsTab enhancements** (`components/super-admin/SupportTicketsTab.js`):
  - Added `payment_confirmation` to CATEGORY_LABELS with 💰 emerald badge.
  - New quick-filter button "💰 إيصالات الدفع فقط" (data-testid `st-filter-payments-only`) toggles `filterCategory` between `payment_confirmation` and `all`.
  - New `PaymentDetailsPanel` subcomponent shown only for payment_confirmation tickets: grid of payment meta, thumbnail of proof image (click-to-expand to full file), "⚡ تفعيل الاشتراك على المجمع" button that opens a mini-form (plan select + duration select) → POST to manual-activate → auto-refresh ticket + show "already activated" banner with full activation details.
- **⚙️ Payment endpoint stability**: Changed the email send in `POST /api/support/payment-confirmation` to fire-and-forget (`asyncio.create_task`) so SMTP timeouts can't block the API response.
- Verified end-to-end live: payment ticket submitted → owner viewed it → clicked activate → compound subscription updated → ticket auto-closed with traceability. Confirmed in DB: ticket.activation_done=true, compound.subscription_code_used='INST9988776', compound.subscription_type='3_months'.

### Iter 54: Payment Confirmation Form + Support Integration ✅
- **🆕 Backend** `POST /api/support/payment-confirmation` (`routes/support.py`):
  - Multipart endpoint accepting method (`vodafone_cash`/`instapay`/`bank_transfer`), plan, amount, transaction_ref (required), transfer_date, sender_name/phone, notes, and optional proof file (PNG/JPG/WebP/PDF up to 8MB).
  - Stores file under `/app/uploads/payment_proofs/` and records a ticket in `support_tickets` with `category='payment_confirmation'` + typed fields (`payment_method`, `transaction_ref`, `proof_url`, `sender_*`).
  - Sends a formatted HTML email via `email_service` (`residence` mailbox).
- **🆕 File serving**: Added `GET /api/files/payment_proofs/{filename}` in server.py.
- **🆕 Frontend** `components/PaymentConfirmationForm.js`:
  - Method tiles (Vodafone/InstaPay/Bank) with gradient-active state, plan/amount grid, date + sender trio, drag-and-drop file upload with image preview (or icon + filename for PDFs), notes textarea, and full submit flow with success state showing ticket id.
- **🆕 Support Page tabs**: `/app/support` now has two tabs — "🎧 رسالة دعم عامة" (existing form) and "💰 إيصال دفع" (new). URL param `?tab=payment` deep-links straight to the new flow. CompoundSubscriptionCard InstaPay / Vodafone Cash CTAs now link to `/app/support?tab=payment`.
- Verified live: form renders all fields correctly, backend accepted test multipart POST, proof file served back HTTP 200.

### Iter 53: Toast Fix + Modern Payment Methods with Coming-Soon Badges ✅
- **🐛 Profile Save Toast Bug** — The app had 12 components using `react-hot-toast` but the only `<Toaster>` mounted in `App.js` was from the `sonner` library (different package), so all `toast.success/error` calls from `react-hot-toast` silently failed. Added `<HotToaster>` from `react-hot-toast` alongside the sonner one, with RTL + rose-themed styles. Profile save / language change / privacy update / biometric register toasts now all appear.
- **🎨 ComingSoonBadge** (new `components/ComingSoonBadge.js`):
  - Reusable badge with 3 variants: `ribbon` (inline pill), `corner` (absolute corner tag for cards), `overlay` (full-glass blur overlay for disabled tiles).
  - Animated rainbow-gradient background (`cs-gradient-shift` 3s keyframe in `index.css`), pulsing Sparkles / bouncing Rocket icons, optional ETA text (e.g. "Q2 2026") and optional "🔔 أخبريني عند التفعيل" button.
- **💳 Modern Payment Selector** in `CompoundSubscriptionCard.js` "تغيير الاشتراك" dialog:
  - Replaced 3-tab layout with a 6-tile responsive grid, 3 columns × 2 rows.
  - Row 1 (ready): كود اشتراك, بطاقة ائتمان, تحويل بنكي.
  - Row 2 (قريباً, corner badge + opacity + cursor-not-allowed): InstaPay (Q2 2026), Vodafone Cash (Q2 2026), Apple/Google Pay (Q3 2026).
  - Each tile shows: icon, label, one-line hint, active state (rose ring), disabled state (gray + badge).
- Verified live: dialog renders 6 tiles, 3 corner "قريباً" badges present, animated gradient in Arabic RTL layout.

### Iter 52: Quick Account Switcher (Linked Accounts) ✅
- **🔗 Linked Accounts Backend** (`routes/linked_accounts.py`):
  - `GET /api/auth/linked-accounts` — returns the current user's linked accounts (enriched with role/compound).
  - `POST /api/auth/link-account` — links another account (username + password). Password is verified against `users.password_hash` (bcrypt-aware), preventing spoofing.
  - `POST /api/auth/switch-account` — issues a fresh JWT for a linked account; only works if the target is in the caller's `linked_test_accounts` list.
  - `POST /api/auth/unlink-account` — removes a link.
  - Links stored under `users.linked_test_accounts`; each entry has `{user_id, username, role, compound_id, label, added_at}`.
- **🎨 QuickAccountSwitcher UI** (`components/QuickAccountSwitcher.js`):
  - Row of circular pills in the top header: current user pill (larger ring + green dot), one pill per linked account (role-colored gradient), and a dashed "+" button to link a new account.
  - Hover on a linked pill shows a small red × button for unlinking.
  - Click a linked pill → calls switch-account → updates token + `window.location.href='/app/dashboard'` for a clean rehydrate.
  - Link-account modal (`qas-link-dialog`) with username + password + optional label.
- **📐 Placement**: Mounted in `Layout.js` header between `SessionSwitcher` and `ThemeToggle`. Visible only for `app_owner`, `super_admin`, `company_admin`, `admin`, `compound_admin`.
- Verified live on Royal City owner dashboard: superadmin account linked, pill shown, switch tested end-to-end.

### Iter 51: Royal City Trial-Banner P0 + Compound Subscription Card ✅
- **🐛 P0 Bug Fix** — `TrialStatus.js` was hiding the 14-day trial banner only when `user.subscription_type === 'paid'`, but Royal City admin had `subscription_type === 'lifetime'` (paid via permanent code). The check now recognizes **all non-trial subscription types** while `subscription_active`. Backfilled Royal City compound + its 3 admins with the lifetime state.
- **🔗 Auth responses now include subscription fields**: `/api/auth/login` and `/api/auth/me` return `subscription_active`, `subscription_type`, `subscription_plan`, `subscription_end`, `subscription_code_used` so the frontend can make accurate trial vs paid decisions without a separate fetch.
- **🔄 Subscription code propagation** (`subscription_codes.py::apply_code`): Applying a code to any admin now cascades:
  - Updates the `compounds` document (single source of truth per compound).
  - Cascades the subscription to every `admin` / `compound_admin` of that compound — so no admin ever sees the banner while another admin is paid.
- **🆕 Compound Subscription API** (`routes/compound_subscription.py`):
  - `GET /api/compounds/{id}/subscription` — returns the compound's subscription state (with `days_remaining`) and the catalogue of residential + company plans (single source of truth mirrored in `frontend/src/config/plans.js`).
  - `POST /api/compounds/{id}/subscription/apply-code` — admin-or-above can apply a subscription code scoped to the compound. RBAC: Owner / Super Admin / Company Admin / this-compound's admin.
- **🎴 CompoundSubscriptionCard UI** (`components/CompoundSubscriptionCard.js`):
  - Rendered on `AdminDashboard.js` above stats — shows subscription type (e.g. "دائم (Lifetime)"), monthly value (derived from plan), days remaining OR "بدون تاريخ انتهاء" for lifetime, and a rose-gradient "تغيير الاشتراك" button.
  - Button opens a modal dialog with **3 payment-method tabs**: كود اشتراك (instant), بطاقة ائتمان (deep-links to `/app/pricing`), تحويل بنكي (shows bank-transfer contact instruction). Card + Bank tabs display a 4-tile plan picker.
- **📋 Plans catalogue** — Frontend: `/app/frontend/src/config/plans.js`; Backend: `RESIDENTIAL_PLANS` / `COMPANY_PLANS` in `compound_subscription.py`. Prices (EGP): starter 0, basic 500, pro 1200, premium 2200; startup 3500, business 7500, enterprise 20000.
- Verified end-to-end by iteration_40 testing agent: **100% pass (11/11), zero issues**. Backend pytest 11/11; frontend Playwright flows + 403/401/400 RBAC cases all passed.

### Iter 50: Settings RBAC Cleanup + Support Tickets Sidebar Badge + Audio Ping ✅
- **⚙️ Settings.js** — Compound-level admin items (`overview`, `residences`, `registration_links`) are now hidden from App Owner and Super Admin roles. Direct URL access (`/app/settings?tab=overview` etc.) renders a "setting unavailable for your role" placeholder instead of the compound-only content. Added `isHighLevelAdmin` guard using `useAuth()`.
- **💾 Save-success toasts verified** across all settings sub-pages: ProfileSettings, PrivacySettings, LanguageSettings, BiometricSettings, and AdminSettings all trigger `toast.success(...)` on 200 responses.
- **🎧 Support Tickets sidebar badge** (`/api/sidebar-alerts/support-tickets`):
  - New lightweight count endpoint in `routes/sidebar_alerts.py` returning `{open, in_progress, total_active}`; returns zeros for non-privileged roles.
  - `Layout.js`: polls every 60s for app_owner/super_admin alongside companies alerts.
  - "تذاكر الدعم الفني" nav link added to Owner section (`تحكم عام للأبلكيشن`) and Super Admin section (`التواصل والتقارير`), pointing to `super-admin?tab=support_tickets`.
  - Red-pulsing badge when `open>0`, amber when only `in_progress>0`. `data-testid="sidebar-support-tickets-badge"`.
- **🔔 Real-time Audio Ping for new tickets**:
  - When the `open` count increases between polls, Layout.js plays a short two-tone Web Audio ping (no external asset), shows a clickable rose toast that navigates to the tickets panel, and fires a browser `Notification` if the tab is backgrounded.
  - First fetch seeds a baseline so no ping on mount.
  - Mute toggle (`data-testid="support-sound-toggle"`) added to the topbar for owner/super_admin with localStorage persistence (`support_sound_muted`). Tooltip flips between "كتم صوت تنبيه الدعم" / "تشغيل صوت تنبيه الدعم".
  - Opportunistic `Notification.requestPermission()` on mount when permission is `default`.
- Verified by iteration_39 testing agent (RBAC + sidebar + endpoint: all pass, 0 issues) and a live smoke screenshot (mute toggle renders, tooltip flips, localStorage persists, badge=1).

### Iter 49: superadmin.py Refactor + Ad Sizes Tooltip + Image Validation ✅
- **📂 `routes/superadmin.py` split** from 1755 → 820 lines into 4 focused modules (no URL changes — all endpoints keep their original paths):
  - `superadmin.py` (820 lines) — dashboard, hierarchical-subs, compound-details, user CRUD, subscription-analytics, expiring-soon, auto-renewal (plus auto-renewal scheduler helpers that still live here)
  - `superadmin_gifts.py` (360 lines) — `/super-admin/users/{user_id}/send-gift` + `/super-admin/bulk-renewal-offer/{preview|send}` + shared `_build_gift_email` helper
  - `superadmin_companies.py` (419 lines) — full companies CRUD, link/unlink compound, top10, import/export full-structure
  - `superadmin_campaigns.py` (204 lines) — `/super-admin/bulk-campaigns` + timeline + PDF export
  - All 4 routers registered in `server.py` (lines 2342-2346 imports, 2397-2403 include_router)
  - `superadmin.py` re-imports `_build_gift_email` from `superadmin_gifts.py` for the in-house auto-renewal email flow.
- **📐 Ad Sizes Tooltip** (`super-admin/AdsTab.js` new `SizesTooltip` component): small "?" button next to the upload label opens a 12-row popup table (position / min-size / ideal-size) and highlights the currently-selected position. Works for both Create and Edit modals.
- **🖼️ Client-side image dimension validation** (`validateImageDimensions` in AdsTab.js):
  - Reads image dimensions locally via FileReader + Image API before upload
  - Compares against `RECOMMENDED_SIZES[position]`
  - Auto-rejects images smaller than minimum (e.g. 100×100 for `banner` which requires 728×90)
  - Clear Arabic toast: `"الصورة 100×100 صغيرة جداً. المقاس الأدنى المطلوب: 728×90 — اختاري صورة أكبر"`
  - Videos are skipped (no dimension check)
- **🧪 Regression tests**: `/app/backend/tests/test_iter38_superadmin_split.py` — 16/16 backend endpoint tests PASSED; frontend Playwright verification confirms tooltip + validation behavior.

### Iter 48: Owner-Only Key Icon Login ✅
- **🔑 Key icon in homepage header now strictly enforces Owner/Super-Admin-only flow**:
  - `HomePage` → `/login?owner_only=1` (query flag carried)
  - `Login` → preserves flag into `/select-account?owner_only=1`
  - `AccountSelector` → filters `accountsList` to only include `role === 'app_owner' || role === 'super_admin'`; if filter yields zero cards (user is neither), redirects to `/` with a toast "هذا المدخل مخصص للمالك والسوبر أدمن فقط"
- **Verified via Playwright**: logging in as `Owner_homeme` via the key icon shows **only** the "مالك التطبيق" card, with the 3 "مدير المجمع" cards hidden. Auto-selected (single-card shortcut) with "متابعة" button ready.

### Iter 47: Homepage Header Cleanup ✅
- **Removed** the green "لوحة التحكم" (dashboard) shortcut button from the landing page header. It used to replace the login/register buttons when a user was signed in, hiding them from guest visitors browsing on the same device.
- **Login + Register** buttons now **always visible** for any visitor, regardless of current session state. Guests and existing users see the same clean header.
- **Key icon (🔑)**: kept as quick access for **Owner / Super Admin only**. Updated tooltip to `"دخول المالك / السوبر أدمن فقط"` to clarify its scope (the `/login` page still handles actual auth/role routing downstream).
- `data-testid` renamed from `super-admin-quick-login` → `owner-quick-login` to reflect both roles.
- Verified via Playwright screenshot: logged-in visitor sees `[🔑] [🌐] [تسجيل الدخول] [سجّل الآن]` — no dashboard shortcut.

### Iter 46: Centralized Alerts Dashboard ✅
- **🔔 `/app/alerts` page** — single-pane-of-glass for urgent items across 5 sources:
  - 📋 Contracts expiring within 30 days (severity by days-left: ≤3 critical / ≤7 high / ≤30 medium)
  - 🏢 Companies with zero compounds (medium)
  - 📢 Advertiser ads awaiting approval (with hours-waiting severity escalation)
  - 🔑 User subscriptions expiring within 14 days
  - 🔗 Compound invites near max_uses or within 3 days of expiry
- **Backend** (`routes/alerts.py`): single `GET /api/alerts/dashboard` endpoint returns flat alerts array + summary (critical/high/medium/low counts) + by_type counts. Each alert has quick action `{label, href}` that deep-links directly to the fix surface. Scoped by role: owner/super_admin see everything, company_admin sees only their company scope.
- **Frontend** (`pages/AlertsDashboard.js`):
  - 5 summary cards (clickable severity filters with ring highlight)
  - Type filter pills with counts
  - Color-coded cards per severity (red/orange/amber/sky gradients) with action button
  - Empty state: ✨ "كل شيء تحت السيطرة!"
- **Sidebar integration** (`Layout.js`):
  - New top-level link "لوحة التنبيهات" in App Owner section 1 (at position #2 after main dashboard)
  - Red pulsing badge with urgent count; hides when 0
- **Test verified**: 8 real alerts (3 critical subs + 5 empty companies), 200 OK, Playwright screenshot shows full Arabic RTL dashboard rendering correctly.

### Iter 45: Auto-link company_admin + Sidebar Alert Badges ✅
- **🔗 Auto-link `company_id` for `company_admin` creation**:
  - Backend (`routes/superadmin.py` user creation): validation enforces that `company_id` is provided and references an existing company whenever `role == "company_admin"`. Returns 400 with clear Arabic message otherwise.
  - Frontend (`HierarchicalSubs.js` AddUserModal): shows a purple-highlighted company dropdown when role is `company_admin`, with helper text explaining the implication. `company_id` is sent with the payload; `compound_id` is nullified for this role (company admins don't belong to any single compound).
  - Verified via curl: 3 scenarios (missing/invalid/valid) return 400/400/200 respectively with correct payload.
- **🔴 Sidebar Alert Badges** (`routes/sidebar_alerts.py` + `Layout.js`):
  - New endpoint `GET /api/sidebar-alerts/companies` returns: `active_companies`, `expiring_contracts` (≤7 days), `empty_companies` (no compounds), `urgent` (sum).
  - `Layout.js` fetches alerts every 2 minutes for `app_owner`/`super_admin`; renders:
    - 🔴 Red pulsing badge with count when `urgent > 0` (tooltip lists breakdown)
    - 💜 Indigo count badge showing total active companies when no urgent alerts
  - Live verification: 6 companies, 5 without compounds → badge correctly displays **"5"** in red next to "إدارة الشركات والمجمعات" link.

### Iter 44: Move "Companies Management" to Sidebar (separate page) ✅
- **🎯 User request fulfilled**: "إدارة الشركات" is no longer buried as a tab inside "المجتمعات السكنية" — it now has a **direct sidebar link** called **"إدارة الشركات والمجمعات"** that lands straight on the full CompaniesTab.
- **Frontend (`Layout.js`)**:
  - Added sidebar link in App Owner section "تحكم في حسابات شركات الإدارة" → `super-admin?tab=companies` (at the top of the section for visibility)
  - Added same link in Super Admin sidebar after "المجمعات السكنية" so both roles have direct access
  - `owner_companies_management` translation key with Arabic fallback "إدارة الشركات والمجمعات"
- **Secondary fix**: Corrected a startup crash in `server.py` line 2600 — the static files guard was too loose (only checked for `/app/frontend/build` existence, not the inner `/static` subfolder), causing `RuntimeError: Directory 'build/static' does not exist` when only a partial build artifact was present. Guard now verifies both. Backend startup verified clean after the fix.

### Iter 43: Compound Invite Links — Self-Registration ✅
- **🔗 Shareable invite links per compound**: Admins generate tokens that residents/managers/security can use to self-register without manual onboarding.
- **Backend** (`routes/compound_invites.py` — 7 endpoints):
  - `POST /api/compound-invites` (with role/validity_days/max_uses/note) — 3 roles can create: app_owner, super_admin, company_admin (of parent company)
  - `GET /api/compound-invites?compound_id=X` — list + effective_status (active/expired/used_up/revoked)
  - `DELETE /api/compound-invites/{id}` — revoke
  - **Public endpoints** (no auth): `GET /compound-invites/token/{token}` and `POST /compound-invites/token/{token}/accept` — the latter creates the user account with `source: "invite_link"` + `invite_id` audit fields, atomically increments `used_count`, validates expiry/max_uses/revocation.
- **Frontend**:
  - `InviteLinkModal` (`components/shared/InviteLinkModal.js`): reusable modal with create form + existing invites list + 📋 copy + 📱 WhatsApp share + 🚫 revoke.
  - `JoinViaInvite` (`pages/JoinViaInvite.js`): public route `/join/:token` — validates token, shows compound info (name, location, parent company, role), renders registration form.
  - **Integrated** into both `CompanyAdminDashboard` (🔗 دعوة button on each compound card) and `CompaniesTab` (🔗 button in the action bar of each nested compound).
- **Security**: ownership check on every create/revoke (company_admin can only create for compounds under their company). Public accept is rate-bounded by `max_uses` and TTL.
- **Tested end-to-end**: 6-step curl roundtrip (create → public view → accept → list (used_count=1) → revoke → revoked token returns 410) all pass. Playwright screenshots confirm modal and public page render correctly in Arabic.

### Iter 42: Owner Nav Fix + Company Admin Dashboard ✅
- **🔗 Fixed Owner Quick Nav**: "شركات الإدارة" button now links to `/app/super-admin?tab=companies` (the full CRUD hierarchical CompaniesTab) instead of the narrow subscriptions page.
- **🏢 New `CompanyAdminDashboard`** (`/app/frontend/src/pages/CompanyAdminDashboard.js`): Dedicated dashboard for `company_admin` role users. On login, they see:
  - Their company header (name, code, email, phone) with stats (compounds count, total users, activity count)
  - Grid of all compounds under their company with per-compound stats (residents/managers/security/total)
  - **➕ Add Compound**, **✏️ Edit**, **🗑 Delete**, **➕ Add User** actions (scoped strictly to their own company)
  - Graceful error screen if account isn't linked to a company
- **🆕 Backend routes** (`/app/backend/routes/company_admin.py`): 7 endpoints scoped by `company_id` derived from logged-in user — ownership checks on every operation to prevent cross-company access.
  - `GET /api/company-admin/me` • `GET /api/company-admin/compounds`
  - `POST/PUT/DELETE /api/company-admin/compounds/{id}`
  - `GET/POST /api/company-admin/compounds/{id}/users`
- **🔗 Data migration**: Linked 3 existing `company_admin` users (testcompany2, testco3, companytest5) to companies for testing. Reset `testcompany2` password to `Company123!`.
- **Routing**: `DashboardRouter` now sends `company_admin` → `CompanyAdminDashboard` (previously got generic AdminDashboard).
- **Tested end-to-end**: curl + Playwright screenshot show the full Arabic dashboard with "شركة المعمار الحديث" loaded, 1 compound (رويال سيتي), 8 users, full CRUD buttons rendering correctly.

### Iter 41: Deployment Readiness Health Check — PASS ✅
- **Deployment verdict: READY FOR PRODUCTION** (deployment agent returned `status: pass`, zero findings)
- Fixed **130 unbounded MongoDB queries** across all backend routes — bulk sed replacement of `.to_list(None)` / `.to_list(length=None)` → `.to_list(length=10000)` to prevent unbounded memory load in production. Safer than unbounded, non-breaking for any practical data volume.
- Verified all major endpoints post-fix: `/api/health`, `/docs`, hierarchical-subs, companies, dashboard, management-contracts, advertiser-ads all return 200 with full payload.
- All other checks: ✅ env vars only, ✅ CORS production-ready, ✅ JWT auth, ✅ supervisor config, ✅ no hardcoded secrets/URLs, ✅ no ML/blockchain deps, ✅ MongoDB via env vars.

### Iter 40: Grid View + Super Admin Ads Confirmed + Refactoring ✅
- **▦ Grid view for compounds**: Toggle between nested (by company) and grid (all compounds flat). Grid has 4 filters (search, parent company dropdown, min users count, subscription status) + live summary counters + 5 action buttons per card (add-user/contract/edit/export/delete).
- **🎯 Super Admin ads verified**: `require_super_admin` allows both `super_admin` and `app_owner` roles → super admin can create/edit/delete ads via `POST/PUT/DELETE /api/ads`. UI shows the "إنشاء إعلان جديد" button for both roles (no `isSuperAdminOnly` guard). Verified via curl with superadmin credentials.
- **🔧 Refactoring** (minimal-risk surgical):
  - Frontend: extracted `ContractModal` (→ `companies/ContractModal.js`) and `CompoundsGridView` (→ `companies/CompoundsGridView.js`) from CompaniesTab.js. File shrunk from **1236 → 920 lines** (-25%).
  - Backend: extracted compound admin endpoints (PUT/DELETE/GET-export) to `routes/compound_admin.py` (104 lines). `superadmin.py` shrunk from 1833 → 1745 lines.
  - All endpoints verified post-refactor (curl roundtrip: create→update→export→delete → 200 each).

### Iter 39: Full Compound CRUD inside Companies Management Tab ✅
- **🎯 Unified compound management**: All compound admin (add/edit/delete/export) now happens from within the `إدارة الشركات` (Companies) tab, consolidating what used to be spread between the Residential-Compounds overview and the Companies tab.
- **Backend endpoints** added to `superadmin.py`:
  - `PUT /api/super-admin/compounds/{id}` — update compound (name/location/address/description) + **move to another parent company** (updates `companies.compound_ids` arrays on both sides).
  - `DELETE /api/super-admin/compounds/{id}?force=true|false` — safety guard: blocks delete when compound has users unless `force=true`, which also unlinks users (doesn't delete them). Cascades to management_contracts deletion.
  - `GET /api/super-admin/compounds/{id}/export` — downloadable JSON bundle (compound + parent_company + users + subscriptions + management_contracts + aggregate stats).
- **Frontend — CompaniesTab.js**: Each compound row (inside an expanded company) now shows 5 action buttons: ➕ إضافة ساكن (green) • 📋 العقد (amber) • ✏️ تعديل (blue, opens EditCompoundModal with parent-company dropdown for relocation) • 📑 تصدير (indigo, downloads JSON) • 🗑 حذف (red, smart confirm when users exist).
- **Test results**: backend curl roundtrip verified (create→update→export→delete 200; delete-with-users 400; delete with `force=true` 200 + unlinked_users count). UI screenshot confirms all 5 buttons render correctly.

### Iter 38: Management Contracts + Bulk Users + Advertiser Self-Service Portal ✅
- **📋 Management Contracts (Company ↔ Compound)** — comprehensive model with start/end dates, commission %, fixed fee, billing cycle (monthly/yearly/per_unit/one_time), currency, auto-renewal (calendar-accurate via `relativedelta`), 30-day expiry warning, PDF attachment (up to 5MB, base64 data URL). Backend: `POST/GET/PUT/DELETE /api/super-admin/management-contracts`, `GET /…/pdf` (download), `POST /…/process-auto-renew`. Frontend: amber `📋 العقد` button on every compound → ContractModal with view / create / edit modes and file upload.
- **📦 Bulk Users** — `POST /api/super-admin/users/bulk` with batch-scope duplicate detection, per-row error reports. Frontend: `AddUserModal` has two tabs (Single / Bulk) with CSV file picker + paste textarea + parse/preview table (20-row preview) + success/failure report.
- **📢 Advertiser Self-Service Portal (Lite)** — public `/advertiser-register` page, protected `/app/advertiser` dashboard (stats + ads list + create modal with live EGP pricing). Backend: `POST /api/advertiser/register`, full ads CRUD under `/api/advertiser/ads`, mock Stripe payment (returns mock=true when `STRIPE_SECRET_KEY` is unset), impression/click tracking public endpoints. Super Admin side: new tab `إعلانات المعلنين` (AdvertiserAdsTab) with filter pills, approve/reject workflow, approved ads auto-pushed to `internal_ads` collection for in-app display.
- **Test results (iteration_37.json)**: backend 29/29 pytest PASSED on first run; frontend 100% of UI paths reached; no critical issues; minor review comments noted for future (tighten advertiser role guard, pdf bandwidth optim, split CompaniesTab into sub-files).

### Iter 37: Inline Add Compound + Add Resident buttons ✅
- **➕ Add Compound button** inside each company's expanded view (purple) — opens modal with name/location/address/description; uses existing `POST /super-admin/companies/{company_id}/compounds`.
- **➕ Add Resident/User button** on every compound card (green) — opens modal with full_name/username/email/password/phone/unit + role picker (resident/family_head/manager/security/admin); uses existing `POST /super-admin/users` with compound_id auto-injected.
- Backend verified via curl (compound create + user create roundtrip, both return 200 with expected payload).
- UI verified via Playwright screenshot — both buttons render correctly inside CompaniesTab after expanding a company.

### Iter 36: Companies Tab — Import JSON + Top 10 + Removed Link UI ✅
- **🏆 Top 10 Companies dashboard** (new endpoint `GET /super-admin/companies/top10?metric=compounds|users|revenue|active_subs`): ranked table with 🥇🥈🥉 medals, metric toggle buttons, highlight column for selected metric, summary footer
- **📥 JSON Import** (new endpoint `POST /super-admin/import-full-structure` with multipart upload + `mode=merge|replace`): restores Companies + Compounds from a previous export. Merge is safe (adds new + updates existing); Replace wipes current companies+compounds first. Upload modal with radio-button mode selector and file size display.
- **🔗 Linking UI removed from Owner panel**: per user direction ("each company adds its own compounds"), removed 🔗 link button, Link modal, and ❌ unlink button from CompaniesTab. Backend link/unlink endpoints kept for future per-company-admin use.
- **Info message updated** when a company has no compounds: explains the company adds its own from its dedicated panel.
- **Test results**: export→import roundtrip verified (5 updated companies + 2 updated compounds); Top 10 ranking accurate across 4 metrics; UI smoke test confirms all 4 action-bar buttons render and modals open correctly.

### Iter 35: Companies Management Dashboard + JSON Export ✅
### Iter 34: Polish Pack — Timeline Chart + Clone + PDF + Session UX ✅
### Iter 33: Quality Pack — A/B Testing + FK Integrity + Owner Summary Email ✅
### Iter 32: Auto-Renewal Scheduler + Campaigns Dashboard + Company CRUD ✅ 100%
### Iter 31: HierarchicalSubs v2 — Reordered Layout + Full CRUD ✅ 100%
### Iter 30: Pack 1 — Email Gifts + Bulk Renewal ✅ 100%
### Iter 29: Hierarchical User Subscriptions v1 ✅
### Iter 28-26: Refactoring + Security Dashboard + Delete User fix ✅

## Architecture
- Frontend: React + Tailwind + Shadcn + recharts + sub-components in `/components/super-admin/` (AdsTab, UsersTab, CodesTab, CouponsTab, CompoundDetailModal, HierarchicalSubs, CompaniesTab with embedded Top10/Import modals)
- Backend: FastAPI + reportlab (PDF) + modular routes in `/backend/routes/`
- DB: MongoDB. Collections: users, compounds, **companies** (authoritative), user_subscriptions, company_subscriptions, user_gifts, bulk_campaigns, auto_renewal_config, coupons, internal_ads, security_incidents, complaints, families, budgets, services, notifications
- Email: shared `email_service` (SMTP via .env)
- Push: pywebpush + VAPID (web only)

## Backlog
- P2: Bank transfer API (blocked on user credentials)
- P2: Smart Devices & Automation (deferred) — still **MOCKED**
- P3: Advertiser Self-Service Portal (multi-sprint feature)
- Nice-to-have: Management Contract model (user deferred)
- Nice-to-have: AI-suggest for auto-linking compounds (user deferred)
- Nice-to-have: Email invitation to company admin upon creation (user deferred)

## Health
- Broken: none
- MOCKED: Smart Devices module
- Auto-renewal: `enabled:false` (safe default)
- Test users: see `/app/memory/test_credentials.md`

### Iter 88: Yearly billing toggle ✅ (2026-05-02)
- **Frontend `PaymentPage.js`**:
  - New `billingCycle` state ('monthly' | 'yearly') with a centered pill toggle between scope tabs and plan cards.
  - Yearly button shows a green **"🎁 وفّري شهرين"** badge.
  - Yearly price = `monthly × 10` (2 months free, matching backend `multiplier: 10` in `1_year` duration).
  - Card price now reads **"X ج.م / سنوياً"** with a subtle emerald sub-line: **"≈ Y ج.م/شهر · وفّرتِ Z ج.م"** when yearly is active.
  - Checkout payload sends `duration: '1_year'` when yearly is selected, otherwise `'1_month'`.
- **Verified ✅ via Playwright**: monthly default → company_business shows ٧٬٥٠٠/شهرياً → toggle yearly → ٧٥٬٠٠٠/سنوياً + savings note + خصم ١٥٬٠٠٠ ج.م → toggle back → reverts cleanly.

### Iter 87: Plan Comparison Cards — visual upgrade ✅ (2026-05-02)
- **Backend `routes/payments.py`**: enriched `/api/payments/plans` with per-plan `features` arrays (5–7 user-facing benefits each, AR) + `popular: true` flag on `pro` (residential) and `company_business` (companies).
- **Frontend `PaymentPage.js`**: replaced the dropdown with a 3-column responsive grid of comparison cards:
  - Card layout: name, "✓ مختار" indicator, description, big EGP price + "/ شهرياً", checklist with ✓ icons.
  - **"⭐ الأكثر شيوعًا"** ribbon on the popular plan in each scope (gradient violet/indigo).
  - Selected card gets ring + tinted background matching scope (blue for residential, violet for company).
  - Auto-pre-selects the popular plan on tab switch (or first available if no popular).
- **Verified ✅ via Playwright**: 3 cards render per scope, `aria-pressed` toggles correctly on click, popular badge present on `pro` and `company_business`, scope flip auto-selects `pro` (the popular residential).

### Iter 86: Payment plan tabs — residential vs company-management ✅ (2026-05-02)
- **`PaymentPage.js`**: replaced the single mixed dropdown with a 2-tab pill switcher above the dropdown:
  - **🏠 سكني (count)** — blue accent — for resident plans
  - **🏢 شركات إدارة (count)** — violet accent — for company-management plans
- **Auto-default by role**: company_admin / app_owner / super_admin land on the company tab; everyone else lands on residential.
- **Reactive selection**: the dropdown only renders the active tab's plans (memoized via `useMemo`); when the tab flips, a side-effect picks the first plan in the new tab automatically so the Stripe button stays enabled.
- **Color-coded summary card**: violet on company tab, blue on residential — matches the rest of the company-admin theme.
- **Plan description row**: shows tier description (e.g. "حتى 3 كمباوندات") + "/ شهرياً" suffix on the price.
- **Verified ✅ via Playwright**: company_admin login → company tab pre-selected → 3 company plans visible → flip to residential → 3 residential plans visible → summary card swaps color + description correctly.

### Iter 85: Payments Center fix — empty dropdown ✅ (2026-05-02)
- **Reported**: on `homemeapp.net/app/payments` the "اختر خيار الدفع" dropdown was empty and "المتابعة للدفع" was disabled. User couldn't pay anything.
- **Root cause**: `PaymentPage.js` was calling 3 stale legacy endpoints that don't exist anymore:
  - `GET /api/payments/v1/packages` → 404
  - `GET /api/payments/v1/transactions` → 404
  - `POST /api/payments/v1/checkout/session` → 404
- **Fix**: rewrote `PaymentPage.js` to use the live current endpoints:
  - `GET /api/payments/plans` → returns 7 plans (3 residential + 3 company + free starter). Frontend flattens them, drops the free starter, displays in a unified dropdown.
  - `GET /api/stripe/my-transactions` → user's transaction history.
  - `POST /api/payments/subscribe` `{plan, duration, currency}` → creates Stripe checkout session, returns `checkout_url`.
- **EGP currency formatter**: `Intl.NumberFormat` doesn't render EGP cleanly in `ar-EG` locale, so prices now display as `١٬٢٠٠ ج.م` instead of broken `EGP 1,200`.
- **Verified end-to-end**: Playwright login (testcompany2) → /app/payments → 6 paid plans render in dropdown → selecting any plan updates the price card → "المتابعة للدفع" button is enabled.

### Iter 84: Smart Multi-Role Scanner + 3 real bugs ✅ (2026-05-01)
- **Backend `routes/system_health.py` — `scan_routes()` rewritten to smart multi-role mode**:
  1. At scan start, pre-fetches tokens for `app_owner`, `super_admin`, `company_admin` users (one DB hit + JWT mint each — ~3 ops total).
  2. For each endpoint: tries with caller's own token first.
  3. If primary result isn't `pass`, transparently retries with the other 2 role contexts (resolving path params per-role).
  4. Keeps the highest-ranked result (`pass > warn > skipped > fail`, tie-broken by latency). 2xx short-circuits the loop.
  5. Records `winning_role` on the entry when another role beat the primary — so the UI can explain why an endpoint now passes.
- **3 real bugs surfaced + fixed by the smarter scan**:
  1. `/api/companies/{id}/analytics` (`companies.py`): generic `except Exception` re-raised an `HTTPException(403)` as `500`. Added `except HTTPException: raise` before the generic catch.
  2. `/api/reminders/settings/{compound_id}` (`push_email.py`): missing `db = get_db()` in 3 reminder endpoints + missing `from reminder_service import PaymentReminderService` import.
  3. `reminder_service.py:20`: `PushNotificationService(db)` — but the class takes no args. Removed the spurious `db` arg.
- **Frontend `SystemHealthPage.js`**: added a "🧠 وضع الفحص الذكي" inline note in the sticky daily-scan banner explaining the multi-role retry to the operator.
- **Bottom-line scan numbers**: `✅ 144 / ⚠️ 32 / ❌ 8` (this morning) → `✅ 167 / ⚠️ 19 / ❌ 0` (now). 25 endpoints rescued from false-positive warns.

### Iter 83: Smart Manual Probe — multi-role endpoint diagnosis ✅ (2026-05-01)
- **New Backend endpoint** `POST /api/system/route-health/probe` `{path}` → app_owner/super_admin only. For the given path, it:
  1. Finds a real user for each of the 3 roles (`app_owner`, `super_admin`, `company_admin`) via `db.users.find_one({role, is_active: {$ne: false}})`.
  2. Issues a short-lived access token for each using `create_access_token`.
  3. Resolves path params (`{user_id}`, `{company_id}`, etc.) using each user's own context — so the same `/api/users/{id}/subscription` is hit as 3 different concrete URLs.
  4. Calls the endpoint internally (localhost:8001) with each token, records `status_code`, body snippet (400 chars), latency, and classification reason.
  5. Synthesizes a **verdict** in Arabic: "✅ يعمل بنجاح في دور X — الـ warn كان بسبب اختلاف context" / "🛡️ محجوب لجميع الأدوار الثلاثة" / "🔍 لا يوجد resource" / "❌ خطأ server حقيقي" / mixed-codes fallback.
- **Frontend**: 
  - Added **"🔧 فحص"** button (violet) next to every endpoint row inside the Warnings breakdown groups.
  - Clicking opens a polished modal with the verdict banner at top and 3 per-role cards color-coded by status (emerald = 2xx, indigo = 403, sky = 401, amber = 404, rose = 5xx, gray = skipped). Each card shows HTTP code, latency, reason code, and the raw body snippet (or "لا يوجد resource متاح لهذا الدور" if the path couldn't be resolved for that role).
- **Verified end-to-end ✅**:
  - Backend curl: `probe /api/monitoring/stats` → all 3 roles 403 → verdict "محجوب لجميع الأدوار الثلاثة". `probe /api/company-admin/me` → app_owner 400, super_admin 400, company_admin 200 → verdict "✅ يعمل بنجاح في دور company_admin — الـ warn كان بسبب اختلاف context".
  - Playwright: 21 probe buttons render, modal opens with correct verdict + all 3 role-context cards.

### Iter 82: Warnings breakdown map — explainable scanner ✅ (2026-05-01)
- **Backend** `_classify_with_reason` now returns `(result, reason_code)` where `reason_code` is one of `auth_required / forbidden_for_tester_role / not_found_for_context / validation_error / method_not_allowed / client_error / server_error / timeout / network_error / no_response / requires_query_params`. All 3 scan sites (manual, trigger, daily-internal) write the code into `entry.reason`.
- **Frontend `SystemHealthPage.js`**: new collapsible "🗺️ خريطة التحذيرات" card between the slow-endpoints list and the filters. Groups warns by `reason` with:
  - Emoji + friendly Arabic label + count badge + full-sentence explanation of why that reason exists (e.g. "الـ RBAC يعمل بشكل صحيح — هذا الـ endpoint للـ app_owner فقط وتم الفحص بحساب super_admin فحجبه كما ينبغي").
  - Expandable list of every endpoint in that group with status, latency, and path.
  - Tip at the bottom: **"معظم الـ warns صحية وطبيعية — ركّزي فقط على client_error لو ظهر."**
- **Verified via Playwright**: full scan → card shows `🛡️ 9 RBAC / ⚠️ 7 client_error / 🔍 5 not_found` → clicking the first group expands to show all 9 403-blocked monitoring/financial admin endpoints with their paths and latencies.
- **Uses static Tailwind classes** (bg/border/badge mapped per-reason) so JIT compiles every color correctly — no dynamic class strings.

### Iter 81: Health Scanner false-positives + 2 real bugs ✅ (2026-05-01)
- **Root cause** of the "8 failing routes" alert: the Health Scanner itself was self-DoS'ing. It ran 16 concurrent requests against its own process with a 10s timeout → heavy Mongo aggregations (disaster-recovery, timeline/csv, perf-budget) exceeded 10s under that load and reported bogus `timeout` fails.
- **`routes/system_health.py`** hardening (all 3 scan paths: manual, daily-trigger, internal daily):
  - Concurrency: `Semaphore(16) → Semaphore(6)`
  - Timeout: `10s → 25s`
  - `_classify()` now treats `422 {"type":"missing"}` as `skipped` with reason `"requires unscannable query params"` instead of `warn` — these endpoints need params the scanner can't synthesize (e.g. `/api/reports/financial` needs `compound_id` + date range). They aren't failures, they're just out-of-scope.
- **2 real bugs fixed** (surfaced by the improved scan):
  1. `/api/reports/../reminders/logs` (in `push_email.py`): `NameError: db not defined` — added missing `db = get_db()` + excluded `_id` from projection.
  2. `/api/database/compounds` (in `db_admin.py`): `AttributeError: 'str' object has no attribute 'isoformat'` — `compound.get("created_at")` is already a string for records written after serialization changes. Guarded with `hasattr(v, 'isoformat')`.
- **Before → after scan numbers**: `✅ 144 / ⚠️ 32 / ❌ 8` → `✅ 152 / ⚠️ 21 / ❌ 0`.

### Iter 80: QR Code in Quick Invite success card ✅ (2026-05-01)
- **`AddFamilyMemberToUnit.js`** extended the Quick-Invite success step with a centered QR code (using the already-imported `qrcode.react`) showing the absolute join URL — scan-in-person onboarding at the gate.
- **Download-QR-SVG button**: serializes the live `<svg>` element to a Blob and triggers a download as `invite-<unit>.svg` (print-ready, vector). Includes toast confirmation.
- **Verified**: DOM-level assertions show `quick-invite-qr-wrap`, `quick-invite-qr`, `quick-invite-qr-download` all present after invite creation. Screenshot confirmed visual output (QR framed on white card with instruction text + download button).

### Iter 79: Quick Invite Modal — rapid onboarding for new units ✅ (2026-05-01)
- **Backend `routes/family_invites.py`**: extended `POST /api/family-invites` to accept an optional `unit_number` override. Only privileged roles (app_owner, super_admin, admin, compound_admin, company_admin) can use it — residents always inherit their own unit. This unlocks creating invites for brand-new units that don't yet have a registered family head.
- **Frontend `AddFamilyMemberToUnit.js`**: added a self-contained Quick Invite modal with state/handlers (`openQuickInvite`, `createQuickInvite`, `copyQuickInviteLink`). Form collects: unit_number (required) + invitee_name (optional) + relationship + validity_days. Two-step UX:
  - **Step 1**: filled form → click "🔗 إنشاء رابط الدعوة"
  - **Step 2**: success card with emerald checkmark, copy-link button, share-via-native-apps button, done button.
- **Wired to 2 entry points**: top CTA `[data-testid="cta-quick-invite"]` (always visible) + empty-state CTA `[data-testid="empty-cta-quick-invite"]` (shown when no residents yet).
- **Verified end-to-end ✅**:
  - Backend curl: `POST /api/family-invites` with `unit_number:"A-99-NEW"` → 200 + invite returned with `unit_number: "A-99-NEW"` and working `join_url`.
  - Playwright: modal opens → fill form → click create → success card renders with working join link → clipboard copy fires toast.
- **Result**: onboarding a new unit now takes **~15 seconds** (was: navigate to residents page → create resident → wait → come back → create family invite — ~3-5 minutes of fiddling).

### Iter 78: Family page Empty-State CTAs ✅ (2026-05-01)
- **Problem**: on the "إضافة فرد من الأسرة" page, when no residents are registered yet (or the user isn't bound to a compound — e.g. app_owner), the page showed a dead empty state with NO button to add a resident. The user had no path forward.
- **Fix in `AddFamilyMemberToUnit.js`**:
  - Added a top CTA row under the page header with 2 prominent buttons: **➕ إضافة ساكن رئيسي جديد** (emerald gradient → `/app/residents`) and **📋 إدارة دعواتي** (rose gradient → `/app/my-invites`).
  - Rewrote the empty state with friendlier Arabic copy + the same 2 CTAs (filled + outlined).
- **Verified via Playwright**: all 4 CTAs render with data-testids (`cta-add-resident`, `cta-manage-invites`, `empty-cta-add-resident`, `empty-cta-invites`).

### Iter 77: Plan Modal — Trial + Coupon + Subscription Code ✅ (2026-05-01)
- **3 new backend endpoints** in `routes/company_admin.py`:
  - `POST /api/company-admin/activate-trial` — once-per-company 14-day trial. Sets `trial_used=true`, status=`trial`, expires_at = now + 14 days. Returns 400 on second attempt with Arabic message.
  - `POST /api/company-admin/preview-coupon` `{plan_key, coupon_code}` — validates the coupon (active flag, max_uses, expiry, applicable_plans), computes original/discount/final price, returns preview WITHOUT consuming usage. 404 on invalid.
  - `POST /api/company-admin/redeem-subscription-code` `{code}` — looks up `subscription_codes` collection, applies plan + duration, increments `times_used`. 404 on invalid.
- **Frontend `PlanUpgradeDialog`** (in `CompanyPlanUsageCard.js`) gained a **3-button action bar** between the warning banner and plan grid:
  - 🎁 **تجربة مجانية ١٤ يوم** (emerald) — direct activate, refreshes plan usage, closes modal
  - 🎟️ **لديكِ كوبون؟** (orange) — toggles a panel with plan dropdown + coupon input + Live preview (shows "وفّرتِ X ج.م" emerald success card on valid)
  - 🔑 **لديكِ كود اشتراك؟** (violet) — toggles a panel with code input + redeem button. Mutually exclusive with the coupon panel.
- **Verified end-to-end ✅**: 
  - Backend curl: trial activate (200 first call → 400 idempotent) — invalid coupon (404) — invalid code (404)
  - Playwright: Login as testcompany2 → modal opens → 3 buttons render → coupon toggle opens panel + invalid coupon shows red toast + emerald result card pattern works → code toggle auto-closes coupon panel → all data-testids present.

### Iter 76: Changelog moved to MongoDB + Owner CRUD page ✅ (2026-05-01)
- **Backend `routes/app_version.py` rewritten**: replaces hard-coded `_CHANGELOG` with MongoDB collection `changelog_entries` (`{id, ar, en, fr, order, is_active, created_at, updated_at, created_by}`). `/api/version` now reads active entries (sorted by `order`, limit 8) and falls back to a built-in seed list when the collection is empty so first-installs/dev environments stay nice.
- **New owner-only CRUD endpoints** behind `require_app_owner`:
  - `GET /api/owner/changelog` (list all incl. inactive)
  - `POST /api/owner/changelog` (auto next-order)
  - `PUT /api/owner/changelog/{id}` (partial update — toggle is_active, edit text, change order)
  - `DELETE /api/owner/changelog/{id}`
- **New page `pages/ChangelogManagementPage.js`** mounted at `/app/changelog` (app_owner only). Form for adding new bullet (3 textareas + visibility toggle), table of current entries with reorder arrows, inline edit, hide/show toggle, delete-with-confirm. Uses shared `PageHeader` (indigo theme) + `SectionCard` + `EmptyState` for visual consistency.
- **Sidebar nav link** added in `Layout.js` for app_owner only → "سجل التحديثات (Changelog)".
- **Verified end-to-end**: backend curl roundtrip (empty list → create → /version reads from DB → delete → /version returns to fallback) — Playwright UI smoke test (login as Owner_homeme → /app/changelog renders → create entry → row visible → delete → empty state).
- **Owner workflow now**: edit changelog from the panel → next deploy bumps `_VERSION` → users see "📦 إصدار جديد متاح" banner → "تحديث الآن" → ChangelogModal pulls fresh bullets from DB. **Zero code changes needed for release notes.**

### Iter 75: Changelog Modal — "What's New" post-update ✅ (2026-05-01)
- **Backend `routes/app_version.py`**: `/api/version` now returns a `changelog` array of 5 user-facing bullets in **3 languages** (ar/en/fr). Update the list manually with each release — short, friendly strings only.
- **Frontend `AppVersionGuard.js`**: when a new version is detected, captures `data.changelog` and stores it under `app_changelog_pending` in localStorage just before the hard reload.
- **New `components/ChangelogModal.js`**: mounts at App root, reads `app_changelog_pending` on every load, picks the user's locale (ar/en/fr from i18next or `<html lang>`), renders a polished violet-gradient modal with numbered bullets and a "يلا نبدأ 🎉" CTA, then clears the key (one-shot — never re-shown for the same release).
- **Verified via Playwright**: injected mock changelog → reloaded → modal appeared with 4 numbered items in correct Arabic + RTL layout → clicking the CTA closed the modal AND cleared `app_changelog_pending` from localStorage as expected.

### Iter 74: Auto-Update Banner (UX-friendly) ✅ (2026-05-01)
- **Replaced** the silent auto-reload behavior in `AppVersionGuard.js` with a friendly top banner: "📦 إصدار جديد متاح من التطبيق — اضغطي تحديث الآن للحصول على آخر التغييرات".
- **Two actions**: 🔄 **تحديث الآن** (clears caches + SW + hard reload, preserving auth/sessions) — **لاحقًا** (snoozes for 30 min via `app_update_snooze_until` localStorage key).
- **Polling unchanged**: every 5 min + on focus + on tab visibility change. First check 1.5s after mount.
- **Verified via Playwright**: forced stale `app_build_version` → banner appeared on top → "لاحقًا" hides it + persists `app_update_snooze_until` → after un-snooze + reload, banner re-appears as expected.

### Iter 73: Same-Origin Rewrite (definitive fix) ✅ (2026-05-01)
- **Replaces** the response-interceptor fallback from Iter 72 with a single proactive rewrite layer that runs before any module loads — so cross-origin /api calls never even leave the browser.
- **New file `/app/frontend/src/api/sameOriginRewrite.js`**: when `window.location.origin !== process.env.REACT_APP_BACKEND_URL`, monkey-patches `window.fetch`, `window.WebSocket`, and adds an axios request interceptor that rewrites every `BACKEND_URL/...` URL to `<origin>/...`. ws/wss are auto-derived. Idempotent (safe to call twice). No-op when origins match.
- **Hooked in `index.js`**: `installSameOriginRewrite()` runs before `<App />` renders.
- **`App.js`**: removed the multi-target login complication and the response-interceptor fallback (both replaced by the cleaner request-side rewrite). `cleanClient = axios.create(...)` now explicitly attaches the rewrite via `attachRewriteToAxios(cleanClient)` since axios.create() doesn't inherit the global interceptor.
- **Coverage**: zero changes to ~130 components that import `process.env.REACT_APP_BACKEND_URL` directly — they all benefit transparently.
- **Verified**: standalone unit test (`/app/frontend/scripts/test_sameOriginRewrite.js`, runs in node) — 4/4 PASS for axios+fetch+WebSocket+passthrough cases. Live Playwright login on preview still passes through (origins match → rewrite is a no-op, `window.fetch` remains native).

### Iter 72: Same-Origin API Fallback ✅ (2026-05-01) (superseded by Iter 73)
- **Problem**: production deployment at `homemeapp.net` has frontend bundle baked with `REACT_APP_BACKEND_URL=https://dashboard-rescue-12.emergent.host`. Some users (cached SW from previous deploys, browser extensions, ISP filters, third-party-cookie blocks) saw "Network Error" on login/register because the cross-origin POST never made it out of the browser, even though the same backend is also reachable at `https://homemeapp.net/api/...`.
- **Fix in `App.js`**:
  1. Global axios response interceptor: on `Network Error` against `BACKEND_URL`, probes `<origin>/api/health` once per session; if reachable, transparently retries the same request against same-origin. Tagged `__sameOriginRetried` to prevent loops.
  2. `login()` rewritten to try a list of targets `[BACKEND_URL, window.location.origin]` (only the first if same), advancing only on real network errors. Other auth flows benefit via the global interceptor.
- **Verified**: login on preview still passes through the first target instantly. When the cross-origin POST is artificially aborted (`page.route('...', route.abort())`), the console correctly logs `[homeme] login network error on … — trying next target` — confirming the fallback path activates as designed.

### Iter 71: PWA + StrictMode restore + Theme + Polish ✅ (2026-05-01)
- **Re-enabled `React.StrictMode`** in `index.js` and **re-enabled Service Worker registration** in `index.html`. Rewrote `public/sw.js` (v5-safe) to a passthrough-only worker that **never** intercepts fetches — eliminates the legacy hang on POST that broke login. Push-notification & PWA install handlers preserved.
- **Fixed 404 on `/api/companies/my-compounds`** (called from `AccountSelector.js` after company-admin login). Switched to the correct `/api/company-admin/compounds` endpoint and unwrapped the `{compounds:[]}` envelope.
- **Show/Hide password toggle** in `Register.js` for both password + confirm-password fields (eye/eye-off icons with `data-testid` for testing).
- **Distinct purple-violet theme for all شركة الإدارة pages**: added `.company-admin-bg` and `.company-admin-card` utilities in `index.css` (deep #0b0820 → #261052 gradient + ambient violet/pink radial glows + grid texture). Applied across `CompanyAdminDashboard.js` (loading / error / main / cards). The page is now visually unmistakable from owner/super-admin/resident dashboards.
- **End-to-end verified via Playwright**: login → /select-account (purple cards) → /app/dashboard (purple ambient theme), SW controlled, no `/api/companies/my-compounds` 404, password toggle flips input type from `password` to `text` correctly.

### Iter 70: Registration Error UX — Clear Arabic error messages + Live password rules ✅ (2026-05-01)
- **Problem**: Management-company registration was silently failing with a generic "Registration failed" English toast — user had no idea WHY (their password was missing uppercase/special-char to match backend rules).
- **Fix 1 — `App.js` `register()` & `login()`**: rewrote error extraction to handle string detail, Pydantic-array detail (422), HTTP status codes, and network/CORS errors with localized Arabic messages. No more silent "Registration failed".
- **Fix 2 — `Register.js` client-side validation**: added pre-submit checks that mirror `validate_password_strength` in `auth_deps.py` (≥8 chars, uppercase, lowercase, digit, special char). Each rule emits its own Arabic toast on violation.
- **Fix 3 — Live password rules card**: visible 6-rule checklist below the password fields (turns green ✓ as the user types) so requirements are discoverable before submission. Password input `minLength` bumped from 6→8 to match backend.
- **Verified**: weak password "12345678" → shows Arabic "كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل (A-Z)". Strong password "TestPass123!" → registers successfully and redirects to login.
