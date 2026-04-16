# HomeMe PRD

## Architecture
- Frontend: React + Tailwind + Recharts + i18next
- Backend: FastAPI + MongoDB + Stripe + PayPal + OpenAI GPT-4o-mini
- i18n: en.json, ar.json, fr.json

## Latest: Owner Subscription Management Actions (Apr 16, 2026)
- Owner can: apply coupon, update price, custom extend (days), renew, suspend, activate, change plan
- All actions logged to `subscription_changelog` collection
- Changelog visible to compound admins in their SubscriptionManagement page
- Applied coupon shown on company card

## Completed Features
- Full Owner Subscription Management (coupon/price/extend/changelog) (DONE - Apr 16, 2026)
- AI Auto-Translation for missing keys (DONE)
- Homepage-first flow, Ad Placement Guide (DONE)
- Ad Analytics Reports, Internal Ad Display (DONE)
- Enhanced Ads Management (DONE)
- Sidebar Reorganization + Budget + Reminders (DONE)
- Company Subscriptions Management (DONE)
- Account Selector, Translation Management (DONE)
- Full i18n (EN/AR/FR), App Owner role (DONE)
- Payment (Stripe + PayPal), Subscriptions (DONE)

## Backlog
- P2: Bank transfer API (pending user credentials)
- P2: Smart Devices & Automation (deferred)
