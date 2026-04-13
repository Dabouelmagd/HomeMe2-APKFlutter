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
- CORS middleware + Query optimization (N+1 fix, bounded queries)
- Arabic translation: 35+ missing keys, 50+ toast messages translated
- Admin Notification System: auto-notify on new family member, maintenance, booking, residence
- Live Dashboard: real-time stats from API, activities, notifications, 6 quick actions
- **Resident Profile Page**: Full detail page with 7 tabs (overview, family, maintenance, bookings, financial, visitors, activities)
- **PDF Export**: Generate professional PDF report for any resident with all sections
- **Print Support**: Print-friendly layout for resident profiles
- **Sort functionality**: Toggle between newest/oldest for all data sections
- Deployment health check: all blockers resolved

## Key Files
- `/app/frontend/src/components/ResidentProfile.js` - Resident detail page
- `/app/frontend/src/components/AdminDashboard.js` - Live dashboard
- `/app/frontend/src/i18n/index.js` - Translations (EN/AR/FR)
- `/app/backend/server.py` - Main backend

## Prioritized Backlog
### P3
- Email daily summary report for admins
- Arabic PDF reports for compound-wide monthly statistics
