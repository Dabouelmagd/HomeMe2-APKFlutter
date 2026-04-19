# HomeMe PRD

## Product
Multi-tenant Compound Management SaaS with Arabic-first localization, role-based dashboards (Resident, Admin, Super Admin, App Owner, Security), advanced monetization (Ads + Campaigns + AdSense + Gifts + Bulk Renewal Offers + Monthly Auto-Renewal + A/B Testing), multi-session architecture, real-time push notifications, and a hierarchical user-subscriptions dashboard with full end-to-end CRUD at company/compound/user levels.

## Latest Fixes (Feb 2026 — iterations 26-33)

### Iter 33: Quality Pack — A/B Testing + FK Integrity + Owner Summary Email ✅
- **🔗 campaign_id FK**: `send_bulk_renewal` and `run_auto_renewal_if_due` now generate a UUID `campaign_id`, attach it to every coupon created, and store it as the `bulk_campaigns` doc `id`. The `/bulk-campaigns` endpoint now queries coupons by exact `campaign_id` match (with graceful fallback to the old time-window heuristic for legacy campaigns).
- **🧪 A/B Testing**: bulk-renewal send accepts `{ab_test, variant_a_message, variant_b_message}`. Splits recipients 50/50 by index, tags each coupon with `variant: 'a'|'b'`. Response includes `sent_a`, `sent_b`. Campaigns dashboard now renders per-variant `sent/used/conversion_rate` with a 🏆 marker on the winner.
- **📧 App Owner summary email**: after every auto-renewal run, sends a branded HTML summary (targets / sent / emails_sent / discount / campaign_id) to all users with role `app_owner` or `super_admin`.
- **🔔 Gift toast dedupe**: `submitGift` now guards with `useRef` re-entry flag (500ms cooldown) — eliminates the duplicate success toast.
- **Test results**: 6/6 backend smoke checks pass (non-A/B send, A/B auto-disable, campaigns response shape, auto-renewal config, admin 403 guard, gift response with email key). Frontend: new A/B section renders in bulk modal with toggle + 2 variant textareas; campaigns table shows per-variant breakdown with winner indicator.

### Iter 32: HierarchicalSubs v3 — Auto-Renewal + Campaigns Analytics + Company CRUD ✅ 100%
- Company CRUD + add new compound under company
- Expiring-soon pulsing badge on bulk button
- Campaigns Analytics Dashboard + Monthly Auto-Renewal Scheduler
- 5 new endpoints; cleanup of 10 test users

### Iter 31: HierarchicalSubs v2 — Reordered Layout + Full CRUD ✅ 100%
### Iter 30: Pack 1 — Email Gifts + Bulk Renewal + Full-Details Polish ✅ 100%
### Iter 29: Hierarchical User Subscriptions Dashboard (v1) ✅
### Iter 28-26: Refactoring + Security Dashboard + Delete User fix ✅

## Recent Completed
- Multi-Session architecture
- Full Ad Campaign CRUD + 12 positions + AdSense fallback + Smart Health Checker + 12 Templates
- Real-Time Ad Analytics + CSV/Excel/Arabic-PDF + weekly email reports
- Resident Satisfaction Dashboard
- Super Admin hidden-financials + i18n auto-translation
- 8-tab CompoundDetailModal + inline user CRUD
- Homepage Resident Portal + improved Trial Status Bar
- **Hierarchical Subscriptions Dashboard v3 with full company/compound/user CRUD + Monthly Auto-Renewal + Campaigns Analytics + A/B Testing + campaign_id FK + Owner summary email (iter 29-33)**

## Backlog
- P2: Bank transfer API (blocked on user credentials)
- P2: Smart Devices & Automation (deferred) — still **MOCKED**
- P3: Advertiser Self-Service Portal (multi-sprint feature)

## Architecture
- Frontend: React (CRA) + Tailwind + Shadcn — sub-components in `/components/super-admin/` (AdsTab, UsersTab, CodesTab, CouponsTab, CompoundDetailModal, HierarchicalSubs with 9 embedded modal components)
- Backend: FastAPI modular routes in `/backend/routes/`
- DB: MongoDB via Motor (async). Collections: users, compounds, management_companies, user_subscriptions, user_gifts, bulk_campaigns, auto_renewal_config, coupons (with campaign_id FK + variant), internal_ads, security_incidents, complaints, families, budgets, services, notifications
- Schedulers (in `server.py`): daily 7AM (reports + expiry checks + monthly auto-renewal with owner summary email), weekly Sunday 8AM (ad reports), 6-hourly (CTR alerts)
- Email: shared `email_service` (SMTP via .env)
- Push: pywebpush + VAPID (web only)

## Health
- Broken: none
- MOCKED: Smart Devices module
- Auto-renewal: currently `enabled:false` (safe default)
- Test users: see `/app/memory/test_credentials.md`
