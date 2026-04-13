# HomeMe PRD - Compound Management System

## Original Problem Statement
Multi-role Compound Management application with Arabic-first UI, featuring financial management, maintenance, contracts, satisfaction ratings, complaints, facilities booking, and role-based access control.

## Architecture
- **Frontend**: React + Tailwind CSS + Recharts + i18next (Arabic)
- **Backend**: FastAPI + MongoDB + WebAuthn + ReportLab + Openpyxl
- **Auth**: JWT-based with 6 roles (super_admin, company_admin, admin, manager, security, resident)
- **Background Tasks**: Daily report scheduler, contract expiry checker

## Modular Backend Architecture (Refactored Apr 13, 2026)
### Extracted Route Modules (11 files, 2,191 lines)
- `routes/finance.py` - Expenses, Revenue, Obligations, Balance Sheet, Unit Charges (501 lines)
- `routes/exports.py` - Excel/PDF exports, Resident profile (402 lines)
- `routes/guests.py` - Visit requests, Guest management, QR codes (209 lines)
- `routes/ratings.py` - Satisfaction ratings with smart alerts (165 lines)
- `routes/contracts.py` - Contract management with expiry tracking (161 lines)
- `routes/facilities.py` - Facility booking system (157 lines)
- `routes/superadmin.py` - Super Admin panel & role management (145 lines)
- `routes/maintenance.py` - Maintenance requests (142 lines)
- `routes/complaints.py` - Complaints & Suggestions (138 lines)
- `routes/monitoring.py` - System health & monitoring (99 lines)
- `routes/notifications.py` - User notifications CRUD (71 lines)

### Shared Modules
- `auth_deps.py` - Auth dependencies (UserDict, get_current_user, require_admin, etc.)
- `database.py` - Shared DB connection module
- `helpers.py` - Shared utilities (serialize_datetime, notify_compound_admins)

### Still in server.py (~13,138 lines)
- Auth/Registration, WebAuthn
- Compounds, Families, Users CRUD
- Messaging/Chat system (WebSockets)
- Dashboard routes
- Service providers/bookings
- Documents, Polls, Smart Devices, Newsletters
- Company/Enterprise, Individual accounts
- Subscription codes
- Email/Push notifications, Daily reports
- Payment services (Stripe, PayPal)

## 15 Systems Built
1. Bug Fixes (Add Resident, WebAuthn, CORS)
2. Admin Notification System
3. Live Dashboard + Quick Actions
4. Resident Profile (7 tabs + PDF + Print)
5. Arabic Translation (complete)
6. Financial Management (Balance Sheet, Charts, 4 distribution methods, Excel)
7. Daily Report Cron (7AM per compound)
8. Monthly Comparison + <70% Alert
9. Ratings & Satisfaction (smart alerts)
10. Contracts Management (expiry tracking 30/7/0 days)
11. Facility Booking Enhanced (admin management)
12. Complaints & Suggestions System
13. Roles & Permissions (6 roles)
14. Registration Flow Redesign (3 account types)
15. Sidebar Redesign (role-based colors, 8 sections)

## Backlog
- P1: Continue server.py refactoring (Auth, Messaging, Users, Dashboard, etc.)
- P1: E2E Registration Flow Test (Super Admin → Company → Compound → Invite → Resident)
- P2: Performance optimization for large compounds
- P2: Offline PWA capabilities
