# HomeMe PRD

## Product
Multi-tenant Compound Management SaaS with Arabic-first localization, role-based dashboards, advanced monetization, multi-session architecture, real-time push notifications, hierarchical user-subscriptions dashboard, and a dedicated companies-management dashboard with full CRUD + compound linking + JSON structure export.

## Latest Fixes (Feb 2026 — iterations 26-35)

### Iter 35: Companies Management Dashboard + JSON Export ✅
- **📑 Full structure export**: new endpoint `GET /api/super-admin/export-full-structure` streams a JSON file with all Companies + Compounds + Users + Subscriptions (user + company level) for backup/audit.
- **🏢 Companies Management Tab**: new `CompaniesTab.js` component added as a top-level tab in SuperAdminPanel (visible only to Owner, not to super_admin-only). Features:
  - List all companies with expandable cards showing: admin user, description, linked compounds with user role breakdown
  - Stats summary: total companies / compounds / users / active subs
  - Create new company (modal)
  - Edit company (name, email, phone, address, website, description)
  - Delete company (auto-unlinks all its compounds)
  - Link independent compounds to a company (picker modal)
  - Unlink compounds (with confirmation)
  - Search by company name
- **New endpoints**: `GET/POST/PUT/DELETE /super-admin/companies`, `POST /super-admin/companies/{id}/link-compound`, `POST /super-admin/companies/{id}/unlink-compound`, `GET /super-admin/export-full-structure`
- **Fixed earlier bugs (continuation of iter 34)**:
  - Security panel "blank blue" — removed broken `/app/security` redirect in `CompoundDetailModal`
  - Companies not showing — unified `management_companies` → `companies` collection in 4 endpoints; added bidirectional linkage (forward `compound.company_id` + reverse `company.compound_ids`)
  - superadmin appearing as "مالك التطبيق" — fixed i18n fallback + added `app_owner` role in SuperAdminPanel `roleLabels`/`roleColors`

### Iter 34: Polish Pack — Timeline Chart + Clone + PDF + Session UX ✅
### Iter 33: Quality Pack — A/B Testing + FK Integrity + Owner Summary Email ✅
### Iter 32: Auto-Renewal Scheduler + Campaigns Dashboard + Company CRUD ✅ 100%
### Iter 31: HierarchicalSubs v2 — Reordered Layout + Full CRUD ✅ 100%
### Iter 30: Pack 1 — Email Gifts + Bulk Renewal ✅ 100%
### Iter 29: Hierarchical User Subscriptions v1 ✅
### Iter 28-26: Refactoring + Security Dashboard + Delete User fix ✅

## Architecture
- Frontend: React + Tailwind + Shadcn + recharts + sub-components in `/components/super-admin/` (AdsTab, UsersTab, CodesTab, CouponsTab, CompoundDetailModal, HierarchicalSubs, **CompaniesTab** — new)
- Backend: FastAPI + reportlab (PDF) + modular routes in `/backend/routes/`
- DB: MongoDB. Collections: users, compounds, **companies** (authoritative), user_subscriptions, company_subscriptions, user_gifts, bulk_campaigns, auto_renewal_config, coupons (with campaign_id FK + variant), internal_ads, security_incidents, complaints, families, budgets, services, notifications
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
- Collections note: `management_companies` is deprecated — all queries use `db.companies`
- Test users: see `/app/memory/test_credentials.md`
