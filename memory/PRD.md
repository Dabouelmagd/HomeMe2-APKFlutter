# HomeMe PRD - Compound Management System

## Architecture
- **Frontend**: React + Tailwind CSS + Recharts + i18next + Cairo Font
- **Backend**: FastAPI + MongoDB + WebAuthn + ReportLab + Openpyxl
- **Auth**: JWT with 6 roles | **Payments**: Stripe + PayPal ready

## Backend Architecture (Refactored Apr 13, 2026)
**server.py: 16,321 → 5,773 lines (-65%)**
**27 route modules in /app/backend/routes/ (8,303 lines total)**

### Route Modules
finance, subscriptions, chat, search, scheduled_msgs, services, family, admin_registration, admin_users, security, push_email, smart_devices, companies, exports, documents, polls, newsletters, guests, announcements, ratings, contracts, facilities, superadmin, maintenance, complaints, monitoring, notifications

### Shared Infrastructure
- auth_deps.py, database.py, helpers.py, shared_models.py (74 Pydantic models)

### Subscription System (NEW)
- 6 durations: trial, 3m, 6m, 9m, 1year, lifetime
- 7 plans: starter/basic/pro/premium + company tiers
- Bulk creation, custom codes, Super Admin management
- Pricing: EGP/USD with annual = 10 months discount

## Backlog
- P1: Stripe/PayPal payment integration (needs API keys)
- P1: E2E Registration Flow Test
- P2: Continue server.py refactoring (Compounds, Utility, Payments ~5.7k left)
