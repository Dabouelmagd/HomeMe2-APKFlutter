# HomeMe PRD

## Architecture
- Frontend: React + Tailwind + Recharts + i18next
- Backend: FastAPI + MongoDB + Stripe + PayPal
- i18n: en.json, ar.json, fr.json (split JSON files)

## Latest: Translation Fix + Sidebar Reorganization (Apr 15, 2026)
- Added 99 missing Arabic translation keys, 94 English, 94 French
- Fixed sa_compounds, sa_users, sa_ads, sa_referrals, sa_analytics showing as English keys
- Added all budget/reminders/company-subs page translations
- Updated OwnerDashboard quick links to include Budget and Reminders

### Sidebar Structure for App Owner:
1. **نظرة عامة** (4 items): Dashboard, Compounds, Users, General Budget
2. **الاشتراكات والمدفوعات** (5 items): Codes, Coupons, Company Subs, Analytics, Reminders
3. **التسويق والإعلانات** (2 items): Ads Management, Referrals
4. **إعدادات النظام** (3 items): Translations, Advanced Analytics, Settings

### New Pages:
- **الميزانية العامة** (`/app/owner-budget`): Revenue/expenses/gifts overview
- **تذكيرات الاشتراكات** (`/app/subscription-reminders`): Expiry tracking + email reminders
- **Enhanced Ads Model**: dimensions, ad_value, is_gift, start_date, end_date

## Completed Features
- Translation fixes for all new pages (DONE - Apr 15, 2026)
- Sidebar Reorganization + Owner Budget + Subscription Reminders (DONE)
- Company Subscriptions Management Page for App Owner (DONE)
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
