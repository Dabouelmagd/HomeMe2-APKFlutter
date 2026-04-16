# HomeMe PRD

## Architecture
- Frontend: React + Tailwind + Recharts + i18next
- Backend: FastAPI + MongoDB + Stripe + PayPal + OpenAI GPT-4o-mini
- Deployment: SPA static build served by FastAPI with catch-all fallback

## All Features (Latest: Feb 2026)
1. Real-time Ad Analytics Dashboard with auto-refresh, CTR alerts
2. Financial Reports with revenue by position, CPC/CPV, projections
3. Export Reports: Excel (3 sheets), CSV (Arabic BOM), PDF (Arabic with reshaper+bidi)
4. Period Comparison with custom date picker + presets (month/week/quarter)
5. Weekly Email Report auto-scheduled Sundays 8AM
6. Smart CTR Push Notifications every 6 hours
7. Redesigned Resident Dashboard (Arabic-first, rating widget)
8. Service Rating System (1-5 stars with comments, admin alerts)
9. Redesigned Security Dashboard (modern, search, RTL)
10. Hybrid Ad System, Internal Ads + AdSense
11. Auto-translate (955 keys), Company ads, Owner Dashboard
12. Full Referral/Coupon/Subscription CRUD, Email SMTP, SPA fallback

## Background Schedulers
- Daily reports: 7:00 AM daily
- Weekly ad report: Sundays 8:00 AM
- CTR alert checker: every 6 hours

## Backlog
- P2: Bank transfer API (pending user credentials)
- P2: Smart Devices & Automation (deferred)
