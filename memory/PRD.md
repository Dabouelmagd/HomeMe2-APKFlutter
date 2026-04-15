# HomeMe PRD

## Architecture
- Frontend: React + Tailwind + Recharts + i18next
- Backend: FastAPI + MongoDB + Stripe + PayPal
- i18n: en.json, ar.json, fr.json (split JSON files)

## Latest: Ad Analytics Reports (Apr 15, 2026)
- Added "تقارير الإعلانات" tab to Advanced Analytics page
- Backend `/api/ads/analytics` returns: summary, top by CTR/clicks/views, position chart, all ads data
- Charts: Bar chart (views/clicks by position), Pie chart (ad distribution by position)
- Tables: Top 5 by CTR, Top 5 by clicks, Top 5 by views, Full performance table
- Click events logged to `ad_events` collection for future time-series analysis

## Completed Features
- Ad Analytics Reports in Advanced Analytics (DONE - Apr 15, 2026)
- Internal Ad Display for Residents with compound targeting (DONE)
- Enhanced Ads Management with dimensions/value/gift/dates (DONE)
- Sidebar Reorganization + Owner Budget + Subscription Reminders (DONE)
- Company Subscriptions Management Page (DONE)
- Account Selector post-login, Translation Management (DONE)
- Full i18n (EN/AR/FR), App Owner role (DONE)
- Payment (Stripe + PayPal), Subscriptions, Internal Ads, AdSense, Referral (DONE)
- PDF Invoices, Email Notifications, Written Guide (DONE)

## Backlog
- P2: Bank transfer API (pending user credentials/docs)
- P2: Smart Devices & Automation (deferred by user)
