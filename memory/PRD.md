# HomeMe PRD

## Architecture
- Frontend: React + Tailwind + Recharts + i18next
- Backend: FastAPI + MongoDB + Stripe + PayPal + OpenAI GPT-4o-mini
- Deployment: SPA static build served by FastAPI with catch-all fallback

## Latest Session (Feb 2026)
### New Features Added:
1. **Real-time Ad Analytics Dashboard** (`/app/ad-analytics`)
   - Auto-refresh every 30s with live metrics
   - Daily/hourly time-series charts (views, clicks, CTR)
   - CTR alert notifications (toast for high-performing ads)
2. **Detailed Financial Reports**
   - Revenue by position, monthly trends, CPC/CPV
   - Projected monthly/yearly revenue
   - Top earners table with ROI metrics
3. **Export Reports (Excel/CSV)**
   - Excel with 3 sheets: الإعلانات, الملخص المالي, الإيرادات حسب الموقع
   - CSV with Arabic headers and BOM support
4. **Period Comparison**
   - Compare this month vs last month (default)
   - Visual bar chart comparison
   - Change % for all metrics
5. **Weekly Email Report**
   - HTML email with financial summary and top performers
   - Sent to app owner email (dalia@datalifeai.com)

### Previous Fixes:
- Fixed Hybrid Ad System routing conflict

## Completed Features
- Real-time Ad Analytics + Financial Reports + Export + Compare + Weekly Report (DONE)
- Hybrid Ad System (AdSense + Internal Ads toggle) (DONE)
- Auto-translate 955 missing keys (DONE)
- Company offers/gifts/ads (DONE)
- Owner Dashboard redesign with live data (DONE)
- Full Referral CRUD + settings (DONE)
- User edit/delete/assign (DONE)
- SPA catch-all for production (DONE)
- Full Owner CRUD for Codes/Coupons/Subscriptions (DONE)
- Email Notifications with SMTP (DONE)
- Internal Ads + Analytics (DONE)
- Account Selector with active_role logic (DONE)
- All previous features (DONE)

## Key Endpoints Added This Session
- `GET /api/ads/analytics/realtime?days=30`
- `GET /api/ads/analytics/financial`
- `GET /api/ads/analytics/compare`
- `GET /api/ads/analytics/export?format=excel|csv`
- `POST /api/ads/analytics/send-weekly-report`

## Backlog
- P2: Bank transfer API (pending user credentials)
- P2: Smart Devices & Automation (deferred)

## Technical Notes
- FastAPI routing: Static paths MUST be defined ABOVE dynamic paths
- SPA fallback: StaticFiles catch-all at bottom of server.py is required
- active_role vs user.role: UI context determined by localStorage active_role
