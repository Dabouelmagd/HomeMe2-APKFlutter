# HomeMe PRD

## Architecture
- **Frontend**: React + Tailwind + Recharts + i18next + Cairo
- **Backend**: FastAPI + MongoDB + Stripe + PayPal + WebAuthn
- **server.py**: 46 route modules
- **i18n**: Split into `en.json` (3003 lines), `ar.json` (2454 lines), `fr.json` (2784 lines) + index.js loader

## Completed (Apr 14, 2026)

### Translation Management System (NEW)
- **Backend API** (`routes/translations.py`):
  - `GET /api/translations` - Paginated, searchable, filterable translation keys
  - `PUT /api/translations` - Update single translation value
  - `POST /api/translations/add` - Add new translation key
  - `DELETE /api/translations/{key}` - Remove key from all languages
  - `GET /api/translations/export/{lang}` - Download JSON file
  - `POST /api/translations/import/{lang}` - Upload/merge JSON file
  - `POST /api/translations/bulk` - Bulk update translations

- **Frontend** (`TranslationManager.js`):
  - Stats cards: total keys (2969), per-language completion % with progress bars
  - Searchable/filterable table with inline editing
  - Add Key modal for creating new translations
  - Export/Import buttons per language (EN/AR/FR)
  - Warning badges for missing translations
  - Pagination support

- **Integration**: New tab "إدارة الترجمات" in Super Admin Panel
- **Testing**: 18/18 backend tests passed, 95% frontend pass rate

### i18n Localization - COMPLETE
All translatable UI strings across components use `t()` function:
- WrittenGuide, HelpCenter, VideoTutorial, ComplaintsSystem, SuperAdminPanel
- SubscriptionActivation, SubscriptionManagement, CompoundManagement, PushNotificationSettings
- HomePage, AdminDashboard, Layout, ContractsManagement, FinancialDashboard

### i18n File Split - COMPLETE
- `i18n/index.js` (35 lines) imports from `locales/en.json`, `locales/ar.json`, `locales/fr.json`

### Previously Completed Features
- Payment Integration (Stripe + PayPal)
- Subscription Management with codes and coupons
- 14-Day Free Trial
- Internal Ads System (CRUD + targeting)
- Google AdSense (pub-5928973437129941)
- Referral Program (5 friends = 1 month free)
- 7 subscription tiers
- Written Guide (23 sections)
- PDF Invoice Generation
- Automated Email Notifications
- Comparison tables for plans

## Backlog
- P2: Bank transfer API integration (pending user details)
- P2: Smart Devices & Automation feature (placeholder exists)
