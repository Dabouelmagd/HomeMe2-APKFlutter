# HomeMe PRD

## Architecture
- Frontend: React + Tailwind + Recharts + i18next
- Backend: FastAPI + MongoDB + Stripe + PayPal + OpenAI GPT-4o-mini
- Deployment: SPA static build served by FastAPI with catch-all fallback

## Latest Session (Feb 2026)
### Features Built:
1. **Real-time Ad Analytics Dashboard** (`/app/ad-analytics`)
   - Auto-refresh every 30s, daily/hourly charts, CTR alerts
2. **Detailed Financial Reports**
   - Revenue by position, CPC/CPV, projected monthly/yearly, top earners
3. **Export Reports (Excel/CSV)**
   - Excel: 3 sheets (الإعلانات, الملخص المالي, الإيرادات حسب الموقع)
   - CSV: Arabic headers with BOM
4. **Period Comparison with Custom Date Filter**
   - Custom date picker (4 inputs)
   - Quick presets: هذا الشهر vs السابق, هذا الأسبوع vs السابق, هذا الربع vs السابق
   - Visual bar chart comparison
5. **Automatic Weekly Email Report**
   - Scheduled every Sunday 8AM (asyncio background task in server.py)
   - Manual send button also available
   - HTML email with summary + top performers sent to app owner
6. **Hybrid Ad System Fix** - Resolved routing conflict

## Background Schedulers
- Daily reports: 7:00 AM daily (existing)
- Weekly ad report: Sundays 8:00 AM (NEW)

## Key Endpoints
- `GET /api/ads/analytics/realtime?days=30`
- `GET /api/ads/analytics/financial`
- `GET /api/ads/analytics/compare?period1_start=&period1_end=&period2_start=&period2_end=`
- `GET /api/ads/analytics/export?format=excel|csv`
- `POST /api/ads/analytics/send-weekly-report`

## Completed Features
- All Ad Analytics features (realtime, financial, export, compare, weekly report) (DONE)
- Hybrid Ad System (DONE)
- Auto-translate 955 missing keys (DONE)
- Company offers/gifts/ads (DONE)
- Owner Dashboard redesign (DONE)
- Full Referral CRUD + settings (DONE)
- Email Notifications with SMTP (DONE)
- Internal Ads + Analytics (DONE)
- SPA catch-all + Account Selector (DONE)
- All previous features (DONE)

## Backlog
- P2: Bank transfer API (pending user credentials)
- P2: Smart Devices & Automation (deferred)

## Technical Notes
- FastAPI routing: Static paths ABOVE dynamic paths
- SPA fallback: StaticFiles catch-all at bottom of server.py
- active_role in localStorage determines UI context
