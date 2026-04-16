# HomeMe PRD

## Architecture
- Frontend: React + Tailwind + Recharts + i18next
- Backend: FastAPI + MongoDB + Stripe + PayPal + OpenAI GPT-4o-mini
- Deployment: SPA static build served by FastAPI with catch-all fallback

## Latest Session (Feb 2026)
### Real-time Ad Analytics Dashboard & Financial Reports
- New dedicated page `/app/ad-analytics` with 3 tabs: البيانات الحية, التقارير المالية, التنبيهات
- Real-time metrics: auto-refresh every 30s, live CTR tracking, daily/hourly time-series charts
- Financial reports: revenue by position, monthly trends, CPC/CPV, projected yearly revenue, top earners
- CTR alert system: toast notifications for high-performing ads, warning for zero-click ads
- Backend: `GET /api/ads/analytics/realtime` + `GET /api/ads/analytics/financial`

### Previous: Hybrid Ad System Fix
- Fixed FastAPI routing conflict for /ads/ad-settings (removed duplicate endpoints)

## Completed Features
- Real-time Ad Analytics Dashboard + Financial Reports (DONE)
- Hybrid Ad System (AdSense + Internal Ads toggle per position) (DONE)
- Auto-translate 955 missing keys (DONE)
- Company offers/gifts/ads (DONE)
- Owner Dashboard redesign with live data (DONE)
- Full Referral CRUD + settings (DONE)
- User edit/delete/assign (DONE)
- Settings auth fix (DONE)
- SPA catch-all for production (DONE)
- Full Owner CRUD for Codes/Coupons/Subscriptions (DONE)
- Email Notifications with SMTP (DONE)
- Internal Ads + Analytics (DONE)
- Account Selector with active_role logic (DONE)
- Super Admin sidebar styling separated from Owner (DONE)
- All previous features (DONE)

## Backlog
- P2: Bank transfer API (pending user credentials)
- P2: Smart Devices & Automation (deferred)

## Technical Notes
- FastAPI routing: Static paths MUST be defined ABOVE dynamic paths
- SPA fallback: StaticFiles catch-all at bottom of server.py is required
- active_role vs user.role: UI context determined by localStorage active_role
- New analytics endpoints are placed between /ads/analytics and UPLOAD_DIR in ads.py
