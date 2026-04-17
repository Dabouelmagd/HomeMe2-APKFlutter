# HomeMe PRD

## Architecture
- Frontend: React + Tailwind + Recharts + i18next
- Backend: FastAPI + MongoDB

## Role Hierarchy
- **App Owner**: Full access - all financial data, subscriptions, settings
- **Super Admin**: Operations only - compounds, users, companies, ads, translations. NO financial data (revenue, budget, subscriptions mgmt, referrals)

## Latest Fixes
- Added 40+ missing Arabic translations
- Fixed language persistence on refresh
- Added شركات الإدارة to Super Admin sidebar
- Hidden revenue data from Super Admin across: analytics, ad-analytics, company-subscriptions
- Auto-translated remaining EN/FR keys via LLM
- Company page shows operational data without revenue for Super Admin

## Backlog
- P2: Bank transfer API (pending user credentials)
- P2: Smart Devices & Automation (deferred)
