# HomeMe PRD - Compound Management System

## Architecture
- **Frontend**: React + Tailwind CSS + Recharts + i18next + Cairo Font
- **Backend**: FastAPI + MongoDB + WebAuthn + ReportLab + Openpyxl
- **Auth**: JWT with 6 roles | **Payments**: Stripe + PayPal ready

## Backend Architecture (Final - Apr 13, 2026)
**server.py: 16,321 → 3,838 lines (-76.5%)**
**37 route modules in /app/backend/routes/ (~10,479 lines)**

### All Route Modules
finance, subscriptions, chat, search, scheduled_msgs, services, family, admin_registration, admin_users, security, push_email, smart_devices, companies, exports, documents, polls, newsletters, guests, announcements, ratings, contracts, facilities, superadmin, maintenance, complaints, monitoring, notifications, compounds, utility, compound_services, dashboard, user_profile, trial, analytics, individual, super_accounts, payments

### Shared Infrastructure
- auth_deps.py, database.py, helpers.py, shared_models.py

### E2E Registration Flow - TESTED ✅
Super Admin → Company Admin → Create Compound → Subscription Code → Register Resident → Verify Subscription

### Subscription System
- 6 durations: trial, 3m, 6m, 9m, 1year, lifetime
- 7 plans: starter/basic/pro/premium + company tiers
- EGP/USD pricing with annual = 10 months discount

## Remaining in server.py (~3,838 lines)
- Core models & enums
- Auth (register, login, WebAuthn)
- Families, Messages, Database queries
- Admin initialization services
- WebSocket endpoints
- Startup/shutdown handlers

## Backlog
- P1: Stripe/PayPal payment integration
- P2: Continue final server.py cleanup
