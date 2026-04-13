# HomeMe - Compound Management System PRD

## Original Problem Statement
A compound management system (HomeMe / هوم-مي) for managing residential compounds.

## Core Architecture
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Frontend**: React + Tailwind CSS + Shadcn UI + Recharts
- **Auth**: JWT-based with WebAuthn biometric
- **Integrations**: Stripe, PayPal, Recharts, fpdf2, slowapi, reportlab

## What's Been Implemented

### Session 1-2 (Previous)
- Full compound management system, WebAuthn, PWA, Multi-language, Settings

### Session 3 (Apr 13, 2026)
- Fixed "Add Resident" bug + WebAuthn db init bug
- CORS middleware + Query optimization
- Arabic translation: 35+ keys, 50+ toast messages
- Admin Notification System
- Live Dashboard with real-time stats
- Resident Profile Page with 7 tabs + PDF export + Print
- **Financial Management System**:
  - Balance Sheet with bar chart + pie charts (Recharts)
  - 4 distribution methods: بالتساوي, حسب المساحة, نسبة مئوية, مبلغ مخصص
  - Unit payment tracking (green=paid, red=unpaid)
  - Notify unpaid units
  - Revenue auto-recording
  - Collection rate gauge
  - Monthly comparison charts
- **Daily Email Report**: Enhanced with unpaid obligations + financial stats

## Key Pages
- `/app/finances` - CompoundFinance.js (Financial Management + Charts)
- `/app/residents/:id` - ResidentProfile.js (Resident Detail)
- `/app/dashboard` - AdminDashboard.js (Live Dashboard + Daily Report)

## Prioritized Backlog
### P3
- Excel export for financial data
- Automated scheduled daily email (cron job)
