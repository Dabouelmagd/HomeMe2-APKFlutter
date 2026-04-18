# HomeMe PRD

## Product
Multi-tenant Compound Management SaaS with Arabic-first localization, role-based dashboards (Resident, Admin, Super Admin, App Owner, Security), monetization (Ads + Campaigns + AdSense), and multi-session browser-tab architecture.

## Latest Fixes (Feb 2026 — iterations 26 & 27)

### P0: Delete User bug ✅
- Root cause: `handleDelete` called undefined `fetchUsers()` → ReferenceError caught → users saw "فشل" toast even though backend succeeded.
- Fix: renamed to `fetchDashboard()`, added optimistic `setUsers` filter, surfaced server error message, added `data-testid`. Verified 100% (iteration_26).

### P1: SuperAdminPanel refactor ✅
- Extracted Ads + Campaigns tab (~700 lines) → `/app/frontend/src/components/super-admin/AdsTab.js`.
- SuperAdminPanel.js shrunk from 1977 → 1290 lines (-35%).
- No regression: all other tabs load, delete user still works (iteration_27).

### P2: Security Dashboard Enhancements ✅
- New analytics tab: 7-day visitor trend bar chart, 24h hourly heatmap, top-3 peak hours, summary cards (total visits / check-ins / check-outs / ID verification ratio).
- New incidents CRUD: create/list/update-status/delete; severity levels (low/medium/high/critical); status flow (open → in_progress → resolved).
- CSV export for visitor logs (Arabic-safe BOM + date-named file).
- Role-aware UI: delete button hidden for non-admin roles.
- Backend endpoints: `GET /api/security/analytics`, `POST/GET/PATCH/DELETE /api/security/incidents`.
- 13/13 backend pytest pass; frontend flows verified end-to-end.

## Recent Completed (Feb 2026)
- Multi-Session architecture (sessionStorage per tab + session registry + SessionSwitcher UI + colored role badges)
- Full Ad Campaign CRUD (budget, dates, auto-renew, free-trial days, status)
- 12 Ad positions + AdSense fallback
- Real-Time Ad Analytics + CSV/Excel/Arabic-PDF exports + weekly email reports
- Resident Satisfaction Dashboard + Service Rating Widget
- Super Admin hidden-financials
- i18n auto-translation + localStorage language persistence

## Backlog
- P1: Further split SuperAdminPanel (UsersTab, CodesTab, CouponsTab, UserSubsTab) — optional, AdsTab was the biggest win
- P2: Bank transfer API (blocked on user credentials)
- P2: Smart Devices & Automation (deferred) — still MOCKED
- P3: Advertiser Self-Service Portal (revenue enhancement — awaiting decision)

## Health
- Broken: none
- MOCKED: Smart Devices module
- Test users: superadmin / Owner_homeme / security (see /app/memory/test_credentials.md)
