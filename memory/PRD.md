# HomeMe PRD

## Product
Multi-tenant Compound Management SaaS with Arabic-first localization, role-based dashboards (Resident, Admin, Super Admin, App Owner, Security), advanced monetization (Ads + Campaigns + AdSense + Gifts + Bulk Renewal Offers + Monthly Auto-Renewal), multi-session architecture, real-time push notifications, and a hierarchical user-subscriptions dashboard with full end-to-end CRUD at company/compound/user levels.

## Latest Fixes (Feb 2026 — iterations 26-32)

### Iter 32: HierarchicalSubs v3 — Auto-Renewal + Campaigns Analytics + Company CRUD ✅ 100%
- **Company CRUD**: edit company (name/email/phone/address/description) + add new compound under existing company — 2 new buttons on each company card
- **Expiring-soon badge**: red pulsing counter on "عرض تجديد جماعي" button showing users expiring in 7 days (only shown when > 0)
- **Campaigns Analytics Dashboard** (📈 button): usage rate per RENEW code, 4-card summary (total campaigns/sent/used/conversion rate), filterable table with auto vs manual tags
- **Monthly Auto-Renewal Scheduler** (⚙️ button): toggle enable/disable, configure day_of_month + days_before_expiry + discount + message. Hooked into existing daily 7AM scheduler (`server.py`). Prevents same-day re-runs, tags coupons as `bulk_renewal_auto`.
- **5 new endpoints**: `PUT /super-admin/companies/{id}`, `POST /super-admin/companies/{id}/compounds`, `GET /super-admin/bulk-campaigns`, `GET /super-admin/expiring-soon-count`, `GET|PUT /super-admin/auto-renewal-config`
- **Cleanup**: purged 10 `testnew_*` + `@example.com` test users from db.users; auto-renewal_config set to `enabled:false` as safe default
- **Test results**: 18/18 backend + all frontend interactions — no regressions

### Iter 31: HierarchicalSubs v2 — Reordered Layout + Full CRUD ✅ 100%
- Layout: Independent compounds FIRST → Companies SECOND → Totals dashboard at BOTTOM (8 stat cards)
- Full CRUD per compound/user (add/edit/delete/activate/deactivate/export/gift)
- Critical fix: DELETE /api/database/users/{id} missing `db = get_db()` call

### Iter 30: Pack 1 — Email Gifts + Bulk Renewal + Full-Details Polish ✅ 100%
- HTML email delivery for gifts + bulk-renewal preview/send endpoints
- Full-details: separates `ads_targeted` vs `ads_global`; smarter subscription lookup

### Iter 29: Hierarchical User Subscriptions Dashboard (v1) ✅
### Iter 28: Refactor Round 2 + Push Notifications ✅
### Iter 27: Security Dashboard + AdsTab Extraction ✅
### Iter 26: Delete User Bug ✅

## Recent Completed
- Multi-Session architecture
- Full Ad Campaign CRUD + 12 positions + AdSense fallback + Smart Health Checker + 12 Templates
- Real-Time Ad Analytics + CSV/Excel/Arabic-PDF + weekly email reports
- Resident Satisfaction Dashboard
- Super Admin hidden-financials + i18n auto-translation
- 8-tab CompoundDetailModal + inline user CRUD
- Homepage Resident Portal + improved Trial Status Bar
- **Hierarchical Subscriptions Dashboard v3 with full company/compound/user CRUD + Monthly Auto-Renewal + Campaigns Analytics (iter 29-32)**

## Backlog
- P2: Bank transfer API (blocked on user credentials)
- P2: Smart Devices & Automation (deferred) — still **MOCKED**
- P3: Advertiser Self-Service Portal (multi-sprint feature)
- Code quality: tag RENEW coupons with `campaign_id` FK for accurate per-campaign used-count (currently heuristic)
- Nice-to-have: de-dupe success toast on gift flow

## Architecture
- Frontend: React (CRA) + Tailwind + Shadcn — sub-components in `/components/super-admin/` (AdsTab, UsersTab, CodesTab, CouponsTab, CompoundDetailModal, HierarchicalSubs with 9 embedded modal components)
- Backend: FastAPI modular routes in `/backend/routes/`
- DB: MongoDB via Motor (async). Collections: users, compounds, management_companies, user_subscriptions, user_gifts, bulk_campaigns, auto_renewal_config, coupons, internal_ads, security_incidents, complaints, families, budgets, services, notifications
- Schedulers (in `server.py`): daily 7AM (reports + expiry checks + **monthly auto-renewal**), weekly Sunday 8AM (ad reports), 6-hourly (CTR alerts)
- Email: shared `email_service` (SMTP via .env)
- Push: pywebpush + VAPID (web only)

## Health
- Broken: none
- MOCKED: Smart Devices module
- Auto-renewal: currently `enabled:false` (safe default)
- Test users: see `/app/memory/test_credentials.md`
