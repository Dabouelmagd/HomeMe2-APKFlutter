# HomeMe PRD

## Product
Multi-tenant Compound Management SaaS with Arabic-first localization, role-based dashboards (Resident, Admin, Super Admin, App Owner), monetization (Ads + Campaigns + AdSense), and multi-session browser-tab architecture.

## Latest Fix (Feb 2026): Delete User in Super Admin Panel
- Root cause: `handleDelete` inline handler called undefined `fetchUsers()` → ReferenceError caught → users saw "فشل" toast even though backend succeeded.
- Fix: renamed call to `fetchDashboard()`, added optimistic `setUsers` filter, surfaced server error message, added `data-testid`. 100% end-to-end verified (iteration_26).

## Recent Completed (Feb 2026)
- Multi-Session architecture (sessionStorage per tab + localStorage session registry + SessionSwitcher UI + colored role badges)
- Full Ad Campaign CRUD (budget, dates, auto-renew, free-trial days, status)
- 12 Ad positions (homepage_hero, splash, login_left, notifications, etc.) + AdSense fallback
- Real-Time Ad Analytics + CSV/Excel/Arabic-PDF exports + weekly email reports
- Resident Satisfaction Dashboard + Service Rating Widget
- Super Admin hidden-financials (no revenue/budget data for super_admin role)
- i18n auto-translation + localStorage language persistence
- Ad Settings save bug fix (React-controlled checkboxes)

## Backlog
- P1: Refactor `SuperAdminPanel.js` (1974 lines) into feature sub-components (UsersTab, CodesTab, CouponsTab, AdsTab, CampaignsTab)
- P2: Security Dashboard enhancements
- P2: Bank transfer API (blocked on user credentials)
- P2: Smart Devices & Automation (deferred)

## Health
- Broken: none currently
- MOCKED: Smart Devices module
