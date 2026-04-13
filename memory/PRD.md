# HomeMe - Compound Management System PRD

## Original Problem Statement
A compound management system (HomeMe / هوم-مي) for managing residential compounds.

## Core Architecture
- **Backend**: FastAPI + MongoDB + openpyxl + reportlab + Recharts
- **Frontend**: React + Tailwind CSS + Shadcn UI + Recharts
- **Auth**: JWT-based with WebAuthn biometric
- **Integrations**: Stripe, PayPal, Recharts, fpdf2, slowapi, reportlab, openpyxl

## What's Been Implemented (Session 3 - Apr 13, 2026)

### Bug Fixes
- Fixed "Add Resident" data mismatch bug
- Fixed WebAuthn db initialization bug  
- Added CORS middleware + Query optimization

### Features Built
- **Arabic Translation**: 35+ keys, 50+ toast messages translated
- **Admin Notification System**: Auto-notify on new family member, maintenance, booking, residence
- **Live Dashboard**: Real-time stats + quick actions + daily report button
- **Resident Profile Page**: 7 tabs + PDF export + Print + sorting
- **Financial Management System (Complete)**:
  - Balance Sheet with Recharts (bar + pie charts)
  - 4 distribution methods: equal, per sqm, percentage, custom
  - Unit payment tracking (green=paid, red=unpaid)
  - Notify unpaid units
  - Collection rate gauge
  - Monthly comparison dashboard with auto-alert (<70%)
  - **Excel Export**: 5 sheets (Balance Sheet, Expenses, Unit Charges, Obligations, Revenue)
  - **Automated Daily Report**: Cron job at 7AM + manual trigger, per compound separately
  - Revenue auto-recording on payment

## Key API Endpoints
- Financial: obligations, unit-charges, balance-sheet, export-excel, notify-unpaid
- Reports: export-pdf, send-daily-report, trigger-daily-reports
- Resident: profile, export-pdf

## Prioritized Backlog
- None remaining from current session
