# HomeMe PRD

## Architecture
- Frontend: React + Tailwind + Recharts + i18next
- Backend: FastAPI + MongoDB

## Ad Positions (12 positions, 30 total slots)
- homepage_hero (3), homepage_mid (2), homepage_footer (2)
- banner (5), sidebar (3), dashboard (2), inline (4)
- login_page (2), popup (1), notification (2), splash (1), services_page (3)

## Role Restrictions (Super Admin)
Hidden from SuperAdminPanel: revenue/expenses/net stats, ad revenue, subscription codes/coupons/user_subs/referrals/analytics tabs
Hidden from AdvancedAnalytics: revenue card, financial tab, revenue chart
Hidden from AdRealtimeDashboard: financial tab, export buttons, revenue in compare
Hidden from CompanySubscriptions: monthly revenue card

## Backlog
- P2: Bank transfer API
- P2: Smart Devices
