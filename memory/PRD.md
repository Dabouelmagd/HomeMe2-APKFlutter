# HomeMe PRD

## Architecture
- Frontend: React + Tailwind + Recharts + i18next
- Backend: FastAPI + MongoDB + Stripe + PayPal
- i18n: en.json, ar.json, fr.json

## Latest Changes (Apr 15, 2026)
### Homepage First
- Root URL "/" now shows the public HomePage instead of redirecting to login
- Users see the marketing page first, then click "تسجيل الدخول" to enter the app

### Arabic Default
- Arabic is the default and fallback language (already configured in i18n/index.js)

### Ad Placement Guide
- Visual app layout map showing where each ad type appears (banner/sidebar/dashboard/inline)
- Detailed table with: position, description, available sizes, audience, max count
- Integrated directly in the owner's ads management page

## Completed Features
- Homepage-first flow (DONE)
- Ad Placement Guide in Owner panel (DONE)
- Ad Analytics Reports in Advanced Analytics (DONE)
- Internal Ad Display for Residents (DONE)
- Enhanced Ads Management (DONE)
- Sidebar Reorganization + Budget + Reminders (DONE)
- Company Subscriptions Management (DONE)
- Account Selector, Translation Management (DONE)
- Full i18n (EN/AR/FR), App Owner role (DONE)
- Payment (Stripe + PayPal), Subscriptions (DONE)
- Internal Ads, AdSense, Referral Program (DONE)

## Backlog
- P2: Bank transfer API (pending user credentials)
- P2: Smart Devices & Automation (deferred)
