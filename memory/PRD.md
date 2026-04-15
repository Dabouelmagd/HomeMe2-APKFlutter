# HomeMe PRD

## Architecture
- Frontend: React + Tailwind + Recharts + i18next
- Backend: FastAPI + MongoDB + Stripe + PayPal
- i18n: en.json, ar.json, fr.json (split JSON files)

## Latest: Enhanced Ads Management + Full Translations (Apr 15, 2026)
- Updated ads UI: dimensions, ad_value, is_gift, start_date, end_date fields in create form
- Updated ads table: 8 columns (title, position, dimensions, duration, value/gift, clicks, status, actions)
- Added ads revenue/gift stats cards (6 total)
- Added 112+ missing translation keys across ar/en/fr

### Sidebar Structure for App Owner (4 sections):
1. **نظرة عامة** (4): Dashboard, Compounds, Users, General Budget
2. **الاشتراكات والمدفوعات** (5): Codes, Coupons, Company Subs, Analytics, Reminders
3. **التسويق والإعلانات** (2): Ads Management, Referrals
4. **إعدادات النظام** (3): Translations, Advanced Analytics, Settings

### New Pages Built This Session:
- `/app/owner-budget` - General Budget (revenue/expenses/gifts)
- `/app/subscription-reminders` - Subscription expiry tracking + email reminders
- `/app/company-subscriptions` - Company subscription management
- `ads.txt` - Google AdSense verification file

## Completed Features
- Enhanced Ads Management with dimensions/value/gift/dates (DONE)
- Translation fixes: 112+ keys added (DONE)
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
