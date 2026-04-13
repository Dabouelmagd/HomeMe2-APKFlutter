# HomeMe - Compound Management System PRD

## Original Problem Statement
A compound management system (HomeMe / هوم-مي) for managing residential compounds.

## Core Architecture
- **Backend**: FastAPI + MongoDB + openpyxl + reportlab + Recharts
- **Frontend**: React + Tailwind CSS + Shadcn UI + Recharts

## Session 3 Summary (Apr 13, 2026) - All Features

### Bug Fixes
- Fixed "Add Resident" data mismatch, WebAuthn db init, CORS

### Features Built
1. **Arabic Translation**: 35+ keys, 50+ toast messages
2. **Admin Notification System**: Auto-notify on key actions
3. **Live Dashboard**: Real-time stats + quick actions + daily report button
4. **Resident Profile**: 7 tabs + PDF export + Print + sorting
5. **Financial Management**:
   - Balance Sheet with Recharts (bar + pie)
   - 4 distribution methods (equal, sqm, percentage, custom)
   - Unit payment tracking (green/red)
   - Notify unpaid units
   - Monthly comparison with <70% alert
   - Excel export (5 sheets)
   - Automated daily report cron (7AM, per compound)
6. **Ratings & Satisfaction System**:
   - Submit ratings (1-5 stars + comment) for maintenance & services
   - Rating modal integrated into maintenance page
   - Admin statistics dashboard with charts
   - Distribution chart, monthly trend, recent ratings

## Key Pages
- `/app/finances` - Financial Management + Charts
- `/app/satisfaction` - Satisfaction Dashboard
- `/app/residents/:id` - Resident Profile
- `/app/dashboard` - Live Dashboard
