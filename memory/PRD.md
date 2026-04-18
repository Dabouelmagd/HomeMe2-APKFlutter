# HomeMe PRD

## Product
Multi-tenant Compound Management SaaS with Arabic-first localization, role-based dashboards (Resident, Admin, Super Admin, App Owner, Security), monetization (Ads + Campaigns + AdSense), multi-session browser-tab architecture, and real-time push notifications.

## Latest Fixes (Feb 2026 — iterations 26-28)

### Iter 28: Refactor Round 2 + Push Notifications ✅
- Extracted **UsersTab, CodesTab, CouponsTab** into `/components/super-admin/` (now 4 sub-components alongside AdsTab)
- SuperAdminPanel.js: **1977 → 1017 lines** (-49% total reduction across iterations)
- **Critical Incident Push Notifications**: POST /api/security/incidents with severity='high'|'critical' auto-broadcasts web push to all admin-role users in the same compound. Uses existing VAPID infrastructure (PushNotificationService.send_broadcast_notification). Response includes `push_result: {total, sent, failed}` when triggered, absent otherwise.
- Bonus fix: `/api/search` 500 KeyError (family_id AttributeError + duplicate $or query) → now returns 200

### Iter 27: Security Dashboard + AdsTab Extraction ✅
- AdsTab.js extracted (~688 lines moved out of SuperAdminPanel)
- Security Dashboard: analytics tab (7-day trends + 24h heatmap + peak hours), incidents CRUD (4 severity levels + 3 status states), CSV export, role-aware delete button
- New endpoints: GET /api/security/analytics, POST/GET/PATCH/DELETE /api/security/incidents

### Iter 26: Delete User Bug ✅
- Root cause: undefined `fetchUsers()` threw ReferenceError caught by try/catch
- Fix: renamed to fetchDashboard + optimistic setUsers filter + proper error surfacing

## Recent Completed
- Multi-Session architecture (sessionStorage + SessionSwitcher UI)
- Full Ad Campaign CRUD + 12 Ad positions + AdSense fallback
- Real-Time Ad Analytics + CSV/Excel/Arabic-PDF + weekly email reports
- Resident Satisfaction Dashboard
- Super Admin hidden-financials
- i18n auto-translation

## Backlog
- P2: Bank transfer API (blocked on user credentials)
- P2: Smart Devices & Automation (deferred) — still **MOCKED**
- P3: Advertiser Self-Service Portal (revenue enhancement)
- P3: FCM mobile push for critical incidents (current web-push works; mobile FCM would extend reach off-browser)

## Architecture
- Frontend: React (CRA) + Tailwind + Shadcn — sub-components organized in `/components/super-admin/` + `/components/` for main screens
- Backend: FastAPI modular routes in `/backend/routes/`
- DB: MongoDB via Motor (async)
- Push: pywebpush + VAPID keys in backend/.env

## Health
- Broken: none
- MOCKED: Smart Devices module
- Test users: superadmin / Owner_homeme / security (see `/app/memory/test_credentials.md`)
