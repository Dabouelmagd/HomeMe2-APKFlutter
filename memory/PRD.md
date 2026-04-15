# HomeMe PRD

## Architecture
- Frontend: React + Tailwind + Recharts + i18next
- Backend: FastAPI + MongoDB + Stripe + PayPal
- i18n: en.json, ar.json, fr.json (split JSON files)

## Latest: Company Subscriptions Page (Apr 15, 2026)
- Connected `CompanySubscriptions.js` to App.js routing at `/app/company-subscriptions`
- Updated owner sidebar link from `finances` to `company-subscriptions`
- Backend API `/api/owner/company-subscriptions` with GET (search, filter, pagination) and PUT (renew, suspend, change_plan, activate)
- Seeded 5 test management companies with different plans and statuses
- Fixed date handling for ISO string dates in subscription status check

## Completed Features
- Company Subscriptions Management Page for App Owner (DONE - Apr 15, 2026)
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
