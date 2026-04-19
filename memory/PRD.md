# HomeMe PRD

## Product
Multi-tenant Compound Management SaaS with Arabic-first localization, role-based dashboards (Resident, Admin, Super Admin, App Owner, Security), monetization (Ads + Campaigns + AdSense + Gifts + Bulk Renewal Offers), multi-session browser-tab architecture, and real-time push notifications.

## Latest Fixes (Feb 2026 — iterations 26-30)

### Iter 30: Pack 1 — Email Gifts + Bulk Renewal + Full-Details Polish ✅ 100%
- **Email delivery for gifts**: send-gift now emails the recipient a branded HTML + text fallback (extend_trial / free_subscription / discount_coupon). Response includes `email: {sent: bool}`.
- **Bulk Renewal Offer (retention booster)**: new endpoints
  - `POST /api/super-admin/bulk-renewal-offer/preview?days_before_expiry=N` → lists users expiring within N days
  - `POST /api/super-admin/bulk-renewal-offer/send` → creates RENEW-XXXXXX coupon per user, sends email + in-app notification, logs to `db.bulk_campaigns`
- **Full-details improvements**:
  - Separates `ads_targeted` (for this compound) vs `ads_global` (default)
  - Smarter subscription lookup: company_subscriptions → compound subscription → active user_subscriptions of privileged admins
- **Frontend**: new orange/pink "عرض تجديد جماعي" button with live preview modal (user list, days/discount inputs, message textarea, confirmation counter)
- Test: 10/10 backend + 6/6 frontend — no regressions

### Iter 29: Hierarchical User Subscriptions Dashboard ✅
- Critical fix: restored missing `async def` signature on full-details endpoint (backend was down)
- Hierarchical tree: Management Companies → Compounds → Users (by role)
- Sticky totals bar + 4 summary cards + per-level CSV export
- Send Gift flow (3 types) targetable at user/compound/company level
- Test: 10/10 backend + 16/16 frontend

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
- **Hierarchical Subscriptions Dashboard with Gifts + Bulk Renewal Offers (iter 29-30)**

## Backlog
- P2: Bank transfer API (blocked on user credentials)
- P2: Smart Devices & Automation (deferred) — still **MOCKED**
- P3: FCM mobile push for critical incidents (requires Firebase project + credentials)
- P3: Advertiser Self-Service Portal (multi-sprint feature: register, create ad, pay, admin approval)

## Architecture
- Frontend: React (CRA) + Tailwind + Shadcn — `/components/super-admin/` sub-components (AdsTab, UsersTab, CodesTab, CouponsTab, CompoundDetailModal, HierarchicalSubs)
- Backend: FastAPI modular routes in `/backend/routes/`
- DB: MongoDB via Motor (async). New collections: `user_gifts`, `bulk_campaigns`
- Email: shared `email_service` instance (SMTP via .env) — gifts + bulk renewal + reminders
- Push: pywebpush + VAPID (web); FCM mobile pending

## Health
- Broken: none
- MOCKED: Smart Devices module
- Test users: see `/app/memory/test_credentials.md`
