# HomeMe PRD

## Architecture
- Frontend: React + Tailwind + Recharts + i18next
- Backend: FastAPI + MongoDB + Stripe + PayPal + OpenAI GPT-4o-mini
- Deployment: SPA static build served by FastAPI

## Role Hierarchy (Updated Feb 2026)
- **App Owner**: Full access - financial, subscriptions, ads, settings, everything
- **Super Admin**: Operations manager - compounds, users, ads (create/manage), analytics, translations, satisfaction. NO access to: budget, company subscriptions, referrals, subscription codes/coupons
- **Company Admin / Admin / Manager**: Compound-level management
- **Security**: Visitor logs, messages
- **Resident**: Personal dashboard, services, ratings

## All Features
1. Real-time Ad Analytics (auto-refresh, CTR alerts, daily/hourly charts)
2. Financial Reports (revenue by position, CPC/CPV, projections)
3. Export Reports: Excel, CSV, PDF (with Arabic support)
4. Period Comparison (custom dates + presets)
5. Weekly Email Report (auto Sundays 8AM)
6. Smart CTR Push Notifications (every 6 hours)
7. Customer Satisfaction Dashboard (charts, distribution, trends, negative alerts)
8. Service Rating System (1-5 stars, comments, admin notifications)
9. Redesigned Security Dashboard (Arabic, search, RTL)
10. Redesigned Resident Dashboard (Arabic, rating widget)
11. Super Admin role restriction (operations-only, no financial)
12. Hybrid Ad System, Internal Ads + AdSense
13. All previous features (auto-translate, referrals, CRUD, email)

## Background Schedulers
- Daily reports: 7:00 AM
- Weekly ad report: Sundays 8:00 AM
- CTR alert checker: every 6 hours

## Backlog
- P2: Bank transfer API (pending user credentials)
- P2: Smart Devices & Automation (deferred)
