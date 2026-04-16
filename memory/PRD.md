# HomeMe PRD

## Architecture
- Frontend: React + Tailwind + Recharts + i18next
- Backend: FastAPI + MongoDB + Stripe + PayPal + OpenAI GPT-4o-mini
- Deployment: SPA static build served by FastAPI with catch-all fallback

## Latest Session (Feb 2026)
### All Features Built:
1. **Real-time Ad Analytics Dashboard** (`/app/ad-analytics`) - Auto-refresh, daily/hourly charts, CTR alerts
2. **Detailed Financial Reports** - Revenue by position, CPC/CPV, projections, top earners
3. **Export Reports** - Excel (3 sheets), CSV (Arabic BOM), PDF (reportlab with tables)
4. **Period Comparison** - Custom date picker + quick presets (month/week/quarter)
5. **Weekly Email Report** - Auto Sundays 8AM + manual button
6. **Smart CTR Push Notifications** - Background checker every 6 hours, push + DB notifications for CTR >= 5%
7. **Redesigned Resident Dashboard** - Arabic-first, RTL, modern cards, quick actions
8. **Hybrid Ad System Fix** - Resolved routing conflict

## Background Schedulers
- Daily reports: 7:00 AM daily
- Weekly ad report: Sundays 8:00 AM
- CTR alert checker: every 6 hours

## Key Endpoints
- `GET /api/ads/analytics/realtime?days=30`
- `GET /api/ads/analytics/financial`
- `GET /api/ads/analytics/compare?period1_start=&period1_end=&period2_start=&period2_end=`
- `GET /api/ads/analytics/export?format=excel|csv`
- `GET /api/ads/analytics/export-pdf`
- `POST /api/ads/analytics/send-weekly-report`

## Backlog
- P2: Bank transfer API (pending user credentials)
- P2: Smart Devices & Automation (deferred)
