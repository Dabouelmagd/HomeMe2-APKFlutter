# HomeMe PRD

## Product
Multi-tenant Compound Management SaaS with Arabic-first localization, role-based dashboards (Resident, Admin, Super Admin, App Owner, Security), monetization (Ads + Campaigns + AdSense + Gifts + Bulk Renewal Offers), multi-session browser-tab architecture, real-time push notifications, and a hierarchical user-subscriptions dashboard with full inline CRUD.

## Latest Fixes (Feb 2026 — iterations 26-31)

### Iter 31: HierarchicalSubs v2 — Reordered Layout + Full CRUD ✅ 100%
- **Layout reversal per user request**: Independent compounds now render FIRST, then Management Companies SECOND, then unified totals dashboard at the BOTTOM (8 stat cards)
- **Full CRUD per compound**: view 👁, edit ✏️, add-user ➕, gift 🎁, export ⬇, expand ▸
- **Full CRUD per user**: edit ✏️ (name/email/phone/role), activate/deactivate ⏸/▶, gift 🎁, delete 🗑
- **New endpoint**: `POST /api/super-admin/users` — creates user in any compound (accepts compound_id, bypassing admin's compound_id isolation)
- **Critical bug fix** (discovered during testing): `DELETE /api/database/users/{id}` was raising 500 due to missing `db = get_db()` — now resolved
- **Test results**: 17/17 backend + all frontend interactions — no regressions

### Iter 30: Pack 1 — Email Gifts + Bulk Renewal + Full-Details Polish ✅ 100%
- Email delivery for all 3 gift types (HTML + text fallback)
- Bulk Renewal Offer: preview + send endpoints, RENEW-XXXXXX coupons, logged in `db.bulk_campaigns`
- Full-details: separates `ads_targeted` vs `ads_global`, smarter subscription lookup
- Frontend: orange/pink gradient "عرض تجديد جماعي" button + live preview modal

### Iter 29: Hierarchical User Subscriptions Dashboard ✅
- Critical fix: restored missing `async def` signature on full-details endpoint
- Hierarchical tree (v1): Management Companies → Compounds → Users (by role)
- Sticky totals bar + summary cards + per-level CSV export + send gift flow

### Iter 28: Refactor Round 2 + Push Notifications ✅
### Iter 27: Security Dashboard + AdsTab Extraction ✅
### Iter 26: Delete User Bug ✅

## Recent Completed
- Multi-Session architecture
- Full Ad Campaign CRUD + 12 positions + AdSense fallback + Smart Health Checker + 12 Templates
- Real-Time Ad Analytics + CSV/Excel/Arabic-PDF + weekly email reports
- Resident Satisfaction Dashboard
- Super Admin hidden-financials
- i18n auto-translation
- 8-tab CompoundDetailModal + inline user CRUD
- Homepage Resident Portal + improved Trial Status Bar
- **Hierarchical Subscriptions Dashboard v2 with full CRUD + Gifts + Bulk Renewal (iter 29-31)**

## Backlog
- P2: Bank transfer API (blocked on user credentials)
- P2: Smart Devices & Automation (deferred) — still **MOCKED**
- P3: Advertiser Self-Service Portal (multi-sprint feature)
- Nice-to-have: scheduled monthly auto-bulk-renewal campaigns; de-dupe gift toast

## Architecture
- Frontend: React (CRA) + Tailwind + Shadcn — sub-components in `/components/super-admin/` (AdsTab, UsersTab, CodesTab, CouponsTab, CompoundDetailModal, HierarchicalSubs with 5 embedded modal components)
- Backend: FastAPI modular routes in `/backend/routes/`
- DB: MongoDB via Motor (async). Collections: users, compounds, management_companies, user_subscriptions, user_gifts, bulk_campaigns, coupons, subscription_codes, internal_ads, security_incidents, complaints, families, budgets, services
- Email: shared `email_service` (SMTP via .env)
- Push: pywebpush + VAPID (web only — FCM mobile cancelled by user)

## Health
- Broken: none
- MOCKED: Smart Devices module
- Test users: see `/app/memory/test_credentials.md`
