# HomeMe PRD

## Architecture
- **Frontend**: React + Tailwind + Recharts + i18next + Cairo
- **Backend**: FastAPI + MongoDB + Stripe + PayPal + WebAuthn
- **server.py**: 47 route modules
- **i18n**: `en.json` (2914 keys), `ar.json` (2326 keys), `fr.json` (2717 keys)

## Completed (Apr 14, 2026)

### Translation Management System
- Backend API (`routes/translations.py`): 7 endpoints for CRUD, export/import
- Frontend (`TranslationManager.js`): Stats cards, searchable table, inline editing, export/import
- Integrated as tab in Super Admin Panel

### Financial Management i18n Fix
- Added 95+ missing English/French translation keys for CompoundFinance.js
- All financial labels, months, categories, actions now fully translated
- Fixed: total_revenue, net_balance, collection_rate, expenses_by_category, obligations_summary, months, etc.

### i18n Localization - COMPLETE
All components use t() function. i18n split into 3 JSON locale files.

### Previously Completed
- Payment (Stripe + PayPal), Subscriptions, 14-Day Trial
- Internal Ads, Google AdSense (pub-5928973437129941)
- Referral Program, PDF Invoices, Email Notifications
- Written Guide (23 sections), Plan Comparison Tables

## Backlog
- P2: Bank transfer API (pending user details)
- P2: Smart Devices & Automation (deferred)
