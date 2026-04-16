# HomeMe PRD

## Architecture
- Frontend: React + Tailwind + Recharts + i18next
- Backend: FastAPI + MongoDB + Stripe + PayPal + OpenAI GPT-4o-mini

## Latest: Full CRUD for Owner (Apr 16, 2026)
- Subscription Codes: Create, Edit (modal), Toggle, Delete, Copy, Bulk create
- Coupons: Create, Edit (modal with code/type/value/max/notes), Toggle, Delete, Copy
- User Subscriptions: New tab - view all users, activate/deactivate/extend/change plan
- Company Subscriptions: Apply coupon, update price, custom extend, renew, suspend, change plan
- Edit endpoints: PUT /subscription-codes/{code}, PUT /coupons/{coupon_id}
- Owner endpoints: GET/PUT /owner/user-subscriptions

## Completed Features
- Full Owner CRUD for Codes/Coupons/Subscriptions (DONE - Apr 16, 2026)
- Email Notifications with SMTP (DONE)
- AI Auto-Translation (DONE)
- Homepage-first, Ad Placement Guide (DONE)
- Internal Ads + Analytics (DONE)
- Sidebar Reorganization + Budget + Reminders (DONE)
- Company Subscriptions Management (DONE)
- Account Selector, Translation Management (DONE)
- Full i18n (EN/AR/FR), App Owner role (DONE)
- Payment (Stripe + PayPal), Subscriptions (DONE)

## Backlog
- P2: Bank transfer API (pending user credentials)
- P2: Smart Devices & Automation (deferred)
