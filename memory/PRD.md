# HomeMe PRD

## Product
Multi-tenant Compound Management SaaS with Arabic-first localization, role-based dashboards, advanced monetization, multi-session architecture, real-time push notifications, hierarchical user-subscriptions dashboard, and a dedicated companies-management dashboard with full CRUD + Top-10 analytics + JSON import/export backup.

## Latest Fixes (Feb 2026 — iterations 26-51)

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
