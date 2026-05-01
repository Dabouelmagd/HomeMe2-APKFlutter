# HomeMe PRD

## Product
Multi-tenant Compound Management SaaS with Arabic-first localization, role-based dashboards, advanced monetization, multi-session architecture, real-time push notifications, hierarchical user-subscriptions dashboard, and a dedicated companies-management dashboard with full CRUD + Top-10 analytics + JSON import/export backup.

## Latest Fixes (Feb 2026 — iterations 26-65)

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

### Iter 72: Same-Origin API Fallback ✅ (2026-05-01)
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
