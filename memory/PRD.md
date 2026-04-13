# HomeMe PRD - Compound Management System

## Architecture
- **Frontend**: React + Tailwind CSS + Recharts + i18next (Arabic) + Cairo Font
- **Backend**: FastAPI + MongoDB + WebAuthn + ReportLab + Openpyxl
- **Auth**: JWT-based with 6 roles
- **Payments**: Stripe + PayPal (infrastructure ready)

## Backend Modular Architecture
**server.py: 16,321 → 9,798 lines (-40%, -6,523 lines)**

### 18 Route Modules (routes/)
| Module | Description |
|--------|-------------|
| finance.py | Balance sheet, obligations, charges, expenses |
| subscriptions.py | Subscription codes CRUD, activate, verify, bulk create |
| smart_devices.py | IoT devices, automations |
| companies.py | Company registration, dashboard |
| exports.py | Excel/PDF export, resident profile |
| documents.py | Document management |
| polls.py | Polls & voting |
| newsletters.py | Newsletter CRUD |
| guests.py | Visit requests, QR codes |
| announcements.py | Announcements & events |
| ratings.py | Satisfaction ratings |
| contracts.py | Contract management |
| facilities.py | Facility booking |
| superadmin.py | Super admin panel |
| maintenance.py | Maintenance requests |
| complaints.py | Complaints & suggestions |
| monitoring.py | Health checks, stats |
| notifications.py | User notifications |

### Subscription System
- 6 durations: trial, 3m, 6m, 9m, 1year, lifetime
- 7 plans: starter, basic, pro, premium, company_startup/business/enterprise
- Bulk code creation (up to 500)
- Custom codes support
- Auto-activation on user registration
- Super Admin management panel with stats

### Pricing (EGP/USD)
- Residential: Free (5 users), Basic 500 EGP (1-50), Pro 1200 (51-100), Premium 2200 (101+)
- Companies: Startup 3500 (3 compounds), Business 7500 (4-10), Enterprise (custom)
- Annual = 10 months (2 months free)

## Backlog
- P1: Continue server.py refactoring (Messaging/Chat, Auth)
- P1: Stripe/PayPal actual payment integration
- P2: E2E Registration Flow Test
- P2: Clean up duplicate user routes
