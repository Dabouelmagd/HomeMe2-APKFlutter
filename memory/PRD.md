# HomeMe PRD - Compound Management System

## Original Problem Statement
Multi-role Compound Management application with Arabic-first UI, featuring financial management, maintenance, contracts, satisfaction ratings, complaints, facilities booking, and role-based access control.

## Architecture
- **Frontend**: React + Tailwind CSS + Recharts + i18next (Arabic)
- **Backend**: FastAPI + MongoDB + WebAuthn + ReportLab + Openpyxl
- **Auth**: JWT-based with 6 roles (super_admin, company_admin, admin, manager, security, resident)
- **Background Tasks**: Daily report scheduler, contract expiry checker

## Modular Backend Architecture (Refactored Apr 13, 2026)
**server.py: 16,321 → 11,251 lines (-31%, -5,070 lines)**

### 17 Extracted Route Modules (4,248 lines total)
| Module | Lines | Routes |
|--------|-------|--------|
| finance.py | 501 | Balance sheet, obligations, charges, expenses, revenue |
| smart_devices.py | 512 | IoT devices, automations, NL commands |
| companies.py | 496 | Company registration, dashboard, compounds |
| exports.py | 402 | Excel/PDF export, resident profile |
| documents.py | 305 | Document management, folders |
| polls.py | 292 | Polls, voting, results |
| newsletters.py | 261 | Newsletter CRUD |
| guests.py | 209 | Visit requests, QR codes, check-in/out |
| announcements.py | 191 | Announcements & events |
| ratings.py | 165 | Satisfaction ratings, smart alerts |
| contracts.py | 161 | Contract management, expiry tracking |
| facilities.py | 157 | Facility booking |
| superadmin.py | 145 | Super admin panel, role management |
| maintenance.py | 142 | Maintenance requests |
| complaints.py | 138 | Complaints & suggestions |
| monitoring.py | 99 | Health checks, system stats |
| notifications.py | 71 | User notification CRUD |

### Shared Modules
- `auth_deps.py` - Auth dependencies (UserDict, get_current_user, require_admin)
- `database.py` - Shared DB connection module
- `helpers.py` - Utilities (serialize_datetime, notify_compound_admins)

### Still in server.py (~11,251 lines)
- Auth/Registration, WebAuthn, Login
- Compounds CRUD, Families, Users
- Messaging/Chat (WebSockets) - largest remaining section
- Dashboard routes
- Service providers/bookings
- Individual accounts, Account selection
- Subscription codes & management
- Email/Push notifications, Daily reports
- Payment services (Stripe, PayPal)
- Security endpoints
- User profile/password/privacy (with duplicates)

## 15 Systems Built
1-15: (See previous PRD entries - all operational)

## Backlog
- P1: Continue server.py refactoring (Messaging/Chat ~2000 lines, Auth, Users, Subscriptions)
- P1: E2E Registration Flow Test
- P2: Clean up duplicate user profile/password routes (4 copies exist)
- P2: Performance optimization
