# HomeMe PRD

## Architecture
- Frontend: React + Tailwind + Recharts + i18next
- Backend: FastAPI + MongoDB + Stripe + PayPal
- i18n: en.json, ar.json, fr.json (split JSON files)

## Latest: Internal Ads Display for Residents (Apr 15, 2026)
- Created `InternalAdBanner.js` reusable component with 3 variants: full, slim, card
- Integrated ads in: ResidentDashboard (banner + inline), Layout sidebar, Layout top banner
- Backend tracks views automatically when ads are fetched
- Ads filtered by: position, compound targeting, date range, active status
- Compound targeting: checkboxes in ad creation form to select target compounds
- Ad positions: banner (top), sidebar (side nav), inline (between content), dashboard (on dashboard)

## Completed Features
- Internal Ad Display for Residents with compound targeting (DONE - Apr 15, 2026)
- Enhanced Ads Management with dimensions/value/gift/dates (DONE)
- Translation fixes: 120+ keys added (DONE)
- Sidebar Reorganization + Owner Budget + Subscription Reminders (DONE)
- Company Subscriptions Management Page (DONE)
- Account Selector post-login (DONE)
- Translation Management UI for Super Admin (DONE)
- Full i18n (EN/AR/FR) with split JSON files (DONE)
- App Owner role with custom dark sidebar (DONE)
- Owner Dashboard (DONE)
- Payment (Stripe + PayPal), Subscriptions, 14-Day Trial (DONE)
- Internal Ads, Google AdSense, Referral Program (DONE)
- PDF Invoices, Email Notifications, Written Guide (DONE)

## Backlog
- P2: Bank transfer API (pending user credentials/docs)
- P2: Smart Devices & Automation (deferred by user)
