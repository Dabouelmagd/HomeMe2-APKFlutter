# HomeMe PRD - Compound Management System

## Original Problem Statement
Multi-role Compound Management application with Arabic-first UI, featuring financial management, maintenance, contracts, satisfaction ratings, complaints, facilities booking, and role-based access control.

## Architecture
- **Frontend**: React + Tailwind CSS + Recharts + i18next (Arabic)
- **Backend**: FastAPI + MongoDB + WebAuthn + ReportLab + Openpyxl
- **Auth**: JWT-based with 6 roles (super_admin, company_admin, admin, manager, security, resident)
- **Background Tasks**: Daily report scheduler, contract expiry checker

## Modular Backend Architecture (Refactored Apr 13, 2026)
- `/app/backend/server.py` - Main app (~14,039 lines) with core routes
- `/app/backend/routes/finance.py` - Expenses, Revenue, Obligations, Balance Sheet, Unit Charges
- `/app/backend/routes/ratings.py` - Satisfaction ratings with smart alerts
- `/app/backend/routes/contracts.py` - Contract management with expiry tracking
- `/app/backend/routes/complaints.py` - Complaints & Suggestions system
- `/app/backend/routes/superadmin.py` - Super Admin panel & role management
- `/app/backend/routes/exports.py` - Excel/PDF exports, Resident profile
- `/app/backend/routes/facilities.py` - Facility booking system
- `/app/backend/routes/monitoring.py` - System health & monitoring
- `/app/backend/auth_deps.py` - Shared auth dependencies (UserDict, get_current_user, require_admin, etc.)
- `/app/backend/database.py` - Shared DB connection module
- `/app/backend/helpers.py` - Shared utilities (serialize_datetime, notify_compound_admins)

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

## Backend Refactoring Status
- Phase 1 COMPLETE: 8 route modules extracted (~2,282 lines moved)
- server.py reduced from 16,321 to ~14,039 lines
- Remaining in server.py: Auth, Users, Compounds, Messaging/Chat, Dashboard, Maintenance, Visits/Guests, Announcements, Documents, Polls, Smart Devices, Newsletters, Company/Enterprise, Subscription Codes, Email/Push notifications, Daily Reports, Payment services
- Future: Continue extracting remaining route groups

## Key API Endpoints
- Auth: `/api/auth/login`, `/api/auth/register`
- Finance: `/api/financial/balance-sheet`, `/api/financial/obligations`, `/api/financial/unit-charges`
- Ratings: `/api/ratings/stats`, `/api/ratings`
- Contracts: `/api/contracts`
- Complaints: `/api/complaints`
- Super Admin: `/api/super-admin/dashboard`, `/api/super-admin/users`
- Facilities: `/api/facilities`, `/api/facility-bookings`
- Exports: `/api/financial/export-excel`, `/api/residents/{id}/export-pdf`
- Monitoring: `/api/health`, `/api/monitoring/stats`
- Reports: `/api/reports/financial`, `/api/reports/residents`, `/api/reports/maintenance`

## Backlog (P1-P2)
- P1: Continue server.py refactoring (messaging, auth, users, compounds routes)
- P1: E2E Registration Flow Test (Super Admin → Company → Compound → Invite → Resident)
- P2: Performance optimization for large compounds
- P2: Offline PWA capabilities
