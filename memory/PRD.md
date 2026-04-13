# HomeMe - Compound Management System PRD

## Original Problem Statement
A compound management system (HomeMe / هوم-مي) for managing residential compounds.

## Core Architecture
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Auth**: JWT-based with WebAuthn biometric
- **Integrations**: Stripe, PayPal, Recharts, fpdf2, slowapi, reportlab

## What's Been Implemented

### Session 1-2 (Previous)
- Full compound management system, WebAuthn, PWA, Multi-language
- Settings page fix, refactor, redesign

### Session 3 (Apr 13, 2026)
- Fixed "Add Resident" bug + WebAuthn db init bug
- CORS middleware + Query optimization
- Arabic translation: 35+ keys, 50+ toast messages
- Admin Notification System
- Live Dashboard with real-time stats
- Resident Profile Page with 7 tabs + PDF export + Print
- **Financial Management System (Complete)**:
  - Balance Sheet: total revenue, expenses, net balance, collection rate
  - Expense Management: add expenses by category (maintenance, utilities, security, cleaning, salaries)
  - Obligation System: create obligations, distribute equally to all units
  - Unit Payment Tracking: green=paid, red=unpaid, with payment dates, month/year
  - Notify Unpaid: send reminders to units that haven't paid
  - Revenue auto-recording when marking charges as paid

## Key API Endpoints (New)
- `POST /api/financial/obligations` - Create & distribute to units
- `GET /api/financial/unit-charges` - Unit payment status
- `PUT /api/financial/unit-charges/{id}/pay` - Mark paid
- `POST /api/financial/unit-charges/notify-unpaid` - Remind unpaid
- `GET /api/financial/balance-sheet` - Full balance sheet
- `GET /api/residents/{id}/profile` - Resident full profile
- `GET /api/residents/{id}/export-pdf` - Resident PDF export

## Key Frontend Pages
- `/app/finances` - CompoundFinance.js (Financial Management)
- `/app/residents/:id` - ResidentProfile.js (Resident Detail)
- `/app/dashboard` - AdminDashboard.js (Live Dashboard)

## Prioritized Backlog
### P3
- Email daily summary report for admins
- Excel export for financial data
