# HomeMe PRD

## Architecture
- **Frontend**: React + Tailwind + Recharts + i18next + Cairo
- **Backend**: FastAPI + MongoDB + Stripe + PayPal + WebAuthn
- **server.py**: 16,321 -> 2,495 lines (-84.7%) | 46 route modules
- **i18n**: Split into `en.json` (3003 lines), `ar.json` (2454 lines), `fr.json` (2784 lines) + index.js loader

## Completed (Apr 14, 2026)

### i18n Localization - COMPLETE
All translatable UI strings across components now use `t()` function:
- **WrittenGuide.js**: 100% (45 strings)
- **HelpCenter.js**: 100% (33 strings)
- **VideoTutorial.js**: 100% (48 strings)
- **ComplaintsSystem.js**: 100% (7 strings - typeConfig/statusConfig moved inside component)
- **SuperAdminPanel.js**: 100% (69 strings - codes, coupons, ads, analytics)
- **SubscriptionActivation.js**: 100% (34 strings - durations, labels, help section)
- **SubscriptionManagement.js**: 100% (10 strings - toasts, labels, invoices)
- **CompoundManagement.js**: 100% (12 strings - user mgmt, form labels)
- **PushNotificationSettings.js**: 100% (6 strings - English in hook scope)
- **HomePage.js, AdminDashboard.js, Layout.js**: 100% (done previously)
- **SubscriptionManagement, ContractsManagement, FinancialDashboard**: 100% (done previously)

### i18n File Split (P3) - COMPLETE
- Old: Single `i18n/index.js` with 9900+ lines
- New: `i18n/index.js` (35 lines) imports from `locales/en.json`, `locales/ar.json`, `locales/fr.json`
- Fixed: `total_units` key had Arabic value in en.json, added missing `no_requests` keys, `balance_sheet`, `monthly_comparison` keys

### Files intentionally keeping Arabic text
- ServicesManagement.js: Uses `{ar, en, fr}` multilingual data objects
- UtilityBills.js: Official company/provider proper names
- PublicAccountTypeSelection.js: Uses `{ar, en, fr}` multilingual data objects
- EnterpriseRegistration.js / IndividualRegistration.js: Currency symbols (د.إ, ر.س, ج.م)
- LanguageSettings.js: Native language display names

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
- Full comparison tables for plans

## Pricing (EGP)
| Plan | Monthly | Annual (10mo) |
|------|---------|---------------|
| Starter | Free | Free |
| Basic | 500 | 5,000 |
| Pro | 1,200 | 12,000 |
| Premium | 2,200 | 22,000 |
| Co. Startup | 3,500 | 35,000 |
| Co. Business | 7,500 | 75,000 |
| Co. Enterprise | 20,000 | 200,000 |

## Backlog
- P2: Bank transfer API integration (pending user details)
- P2: Smart Devices & Automation feature (placeholder exists)
