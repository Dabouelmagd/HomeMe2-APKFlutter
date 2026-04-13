# HomeMe - Compound Management System PRD

## Original Problem Statement
Compound management system (HomeMe / هوم-مي) for residential compounds.

## Architecture
- **Backend**: FastAPI + MongoDB + openpyxl + reportlab
- **Frontend**: React + Tailwind CSS + Recharts

## All Features (Session 3 - Apr 13, 2026)

1. Fixed "Add Resident" + WebAuthn bugs + CORS
2. Admin Notification System (auto-notify on key actions)
3. Live Dashboard (real-time stats + quick actions)
4. Resident Profile (7 tabs + PDF + Print)
5. Arabic Translation (35+ keys, 50+ toasts)
6. Financial Management:
   - Balance Sheet + Charts (bar, pie, gauge)
   - 4 distribution methods (equal, sqm, percentage, custom)
   - Unit payments (green/red) + Notify unpaid
   - Monthly comparison + <70% alert
   - Excel export (5 sheets)
   - Automated daily report cron (7AM per compound)
7. Ratings & Satisfaction System:
   - 1-5 stars + comment for maintenance/services
   - Admin stats dashboard with charts
   - Smart alert: instant notification on 1-2 star ratings
   - Alert when overall average drops below 3
8. Contracts Management:
   - CRUD for provider contracts
   - Auto-calculated days remaining + urgency
   - Smart expiry alerts (30/7/0 days)
   - Filters: active, expiring, expired
   - Runs with daily cron job

## Key Pages
- `/app/finances` - Financial Management
- `/app/satisfaction` - Satisfaction Dashboard
- `/app/contracts` - Contracts Management
- `/app/residents/:id` - Resident Profile
