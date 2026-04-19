# HomeMe PRD

## Product
Multi-tenant Compound Management SaaS with Arabic-first localization, role-based dashboards, advanced monetization (Ads + Gifts + Bulk Renewal + Auto-Renewal + A/B Testing), multi-session architecture, real-time push notifications, hierarchical user-subscriptions dashboard with full CRUD + campaign analytics (timeline chart + PDF export + clone).

## Latest Fixes (Feb 2026 — iterations 26-34)

### Iter 34: Polish Pack — Timeline Chart + Clone + PDF + Session UX ✅
- **📊 Campaign Timeline Chart**: new endpoint `GET /api/super-admin/bulk-campaigns/{id}/timeline` returns cumulative usage series with A/B breakdown. Frontend renders via `recharts` LineChart with 4 lines (total cumulative, variant A, variant B, daily).
- **🔁 Clone Campaign**: one-click button that closes the dashboard and pre-fills the bulk offer modal with the selected campaign's params (discount, message, A/B variants, days).
- **🎨 PDF Export**: new endpoint `GET /api/super-admin/bulk-campaigns/{id}/pdf` generates a branded ReportLab PDF (overview + A/B results table + winner) — streams as `campaign-{id}.pdf` download.
- **📧 Email under Session Name**: SessionSwitcher now shows the user's email (small monospaced grey) under each name both for current and other sessions — helps distinguish same-name accounts.
- **i18n fix**: `role_super_admin` was mistranslated to "App Owner" in ar/en/fr — corrected to "سوبر أدمن" / "Super Admin" / "Super Admin".

### Iter 33: Quality Pack — A/B Testing + FK Integrity + Owner Summary Email ✅
### Iter 32: Auto-Renewal Scheduler + Campaigns Dashboard + Company CRUD ✅ 100%
### Iter 31: HierarchicalSubs v2 — Reordered Layout + Full CRUD ✅ 100%
### Iter 30: Pack 1 — Email Gifts + Bulk Renewal ✅ 100%
### Iter 29: Hierarchical User Subscriptions v1 ✅
### Iter 28-26: Refactoring + Security Dashboard + Delete User fix ✅

## Architecture
- Frontend: React + Tailwind + Shadcn + **recharts** (timeline chart)
- Backend: FastAPI + **reportlab** (PDF generation)
- DB: MongoDB. Collections: users, compounds, management_companies, user_subscriptions, user_gifts, bulk_campaigns, auto_renewal_config, coupons (with `campaign_id` FK + `variant` + `used_at`), internal_ads, security_incidents, complaints, families, budgets, services, notifications
- Schedulers: daily 7AM (reports + expiry + monthly auto-renewal with owner summary email)
- Email: shared `email_service` (SMTP via .env)
- Push: pywebpush + VAPID (web only)

## Backlog
- P2: Bank transfer API (blocked on user credentials)
- P2: Smart Devices & Automation (deferred) — still **MOCKED**
- P3: Advertiser Self-Service Portal (multi-sprint feature)

## Health
- Broken: none
- MOCKED: Smart Devices module
- Auto-renewal: `enabled:false` (safe default)
- Test users: see `/app/memory/test_credentials.md`
