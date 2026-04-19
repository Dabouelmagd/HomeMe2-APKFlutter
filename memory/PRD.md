# HomeMe PRD

## Product
Multi-tenant Compound Management SaaS with Arabic-first localization, role-based dashboards (Resident, Admin, Super Admin, App Owner, Security), monetization (Ads + Campaigns + AdSense), multi-session browser-tab architecture, and real-time push notifications.

## Latest Fixes (Feb 2026 — iterations 26-29)

### Iter 29: Hierarchical User Subscriptions Dashboard ✅
- **Critical fix**: superadmin.py had missing `async def` signature on full-details endpoint causing the backend to fail to boot entirely. Resolved.
- Rebuilt "User Subscriptions" tab as a hierarchical tree: **Management Companies → Compounds → Users (by role)**
- Sticky totals bar + 4 summary cards (companies / compounds / users / active subs)
- Inline search + role filter; expand/collapse per company and per compound
- Per-level CSV export (company, compound, all) with BOM for Arabic Excel compatibility
- **Send Gift/Offer** flow with 3 types: extend_trial (additive — extends forward from existing end_date), free_subscription (full plan + days), discount_coupon (auto-generated GIFT-XXXXXX code)
- Gift target can be: a single user, an entire compound (all users), or an entire management company (all compounds × all users)
- Delete user inline + view compound details link into existing CompoundDetailModal
- New endpoints: `GET /api/super-admin/hierarchical-subs`, `POST /api/super-admin/users/{id}/send-gift`
- **Test results**: 10/10 backend pytest + 16/16 frontend UI assertions — 100% pass

### Iter 28: Refactor Round 2 + Push Notifications ✅
- Extracted UsersTab, CodesTab, CouponsTab → `/components/super-admin/` (4 sub-components total)
- SuperAdminPanel.js: 1977 → 1017 lines (-49%)
- Critical Incident Push Notifications on POST /api/security/incidents (severity high|critical)
- Fixed /api/search 500 (family_id AttributeError + duplicate $or)

### Iter 27: Security Dashboard + AdsTab Extraction ✅
- AdsTab.js extracted (~688 lines moved)
- Analytics (7-day trends + 24h heatmap), incidents CRUD, CSV export, role-aware delete
- New endpoints: /api/security/analytics, /api/security/incidents CRUD

### Iter 26: Delete User Bug ✅
- Root cause: undefined `fetchUsers()` threw ReferenceError; renamed to fetchDashboard + optimistic filter

## Recent Completed
- Multi-Session architecture
- Full Ad Campaign CRUD + 12 Ad positions + AdSense fallback + Smart Health Checker + 12 Templates
- Real-Time Ad Analytics + CSV/Excel/Arabic-PDF + weekly email reports
- Resident Satisfaction Dashboard
- Super Admin hidden-financials
- i18n auto-translation
- Comprehensive 8-tab CompoundDetailModal with inline user CRUD
- Homepage Resident Portal + improved Trial Status Bar

## Backlog
- P1: Integrate send-gift with email notification delivery (current: in-app notification only)
- P2: Bank transfer API (blocked on user credentials)
- P2: Smart Devices & Automation (deferred) — still **MOCKED**
- P3: Advertiser Self-Service Portal (revenue enhancement)
- P3: FCM mobile push for critical incidents

## Architecture
- Frontend: React (CRA) + Tailwind + Shadcn — sub-components in `/components/super-admin/` (AdsTab, UsersTab, CodesTab, CouponsTab, CompoundDetailModal, HierarchicalSubs)
- Backend: FastAPI modular routes in `/backend/routes/`
- DB: MongoDB via Motor (async). Collections: users, compounds, management_companies, user_subscriptions, user_gifts, coupons, subscription_codes, internal_ads, security_incidents, complaints, families, budgets, services
- Push: pywebpush + VAPID

## Health
- Broken: none
- MOCKED: Smart Devices module
- Test users: Owner_homeme / superadmin / admin / security — see `/app/memory/test_credentials.md`
