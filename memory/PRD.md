# HomeMe - Compound Management System PRD

## Original Problem Statement
A compound management system (HomeMe / هوم-مي) for managing residential compounds, including residents, family members, services, maintenance, billing, and communications.

## Core Architecture
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Auth**: JWT-based with WebAuthn biometric support
- **Integrations**: Stripe, PayPal, Recharts, fpdf2, slowapi

## User Personas
- **Super Admin** (dalia): Full system access
- **Admin**: Compound-level management
- **Resident**: Personal dashboard, family management, service booking

## What's Been Implemented

### Session 1 (Previous)
- Full compound management system with dashboard, residents, services, billing
- WebAuthn biometric login
- PWA support
- Multi-language (Arabic/English)

### Session 2 (Previous)
- Settings page navigation fix (unclickable tabs)
- Settings.js refactored into modular components (`/components/settings/`)
- Settings page redesigned with modern UI
- PWA auto-reload bug fix (disabled aggressive service worker reload in index.html)

### Session 3 (Apr 13, 2026)
- **Fixed "Add Resident" bug**: Data structure mismatch - API returns nested `family_head` objects in residences, frontend expected flat fields. Fixed in `AddFamilyMemberToUnit.js`
- **Fixed WebAuthn db initialization bug**: `WebAuthnService(db)` was called when `db=None`. Fixed by reassigning `webauthn_service.db = db` in startup event
- **CORS middleware**: Added proper CORSMiddleware configuration to FastAPI app
- **Query optimization**: Fixed N+1 query pattern in `/database/compounds` endpoint using aggregation pipeline
- **Bounded queries**: Added limits to unbounded `.to_list(None)` calls in search endpoints
- **Navigation fix**: Changed `window.location.href` to React Router `navigate()` in ResidentsList.js
- **Cleaned up backup files**: Removed 6 .backup/.js.backup files from components directory
- **Deployment health check**: Ran and fixed all 3 critical blockers
- **WebAuthn E2E testing**: All 6 API endpoints verified working (check, register options, register verify, login options, login verify, remove)

## Key Files
- `/app/frontend/src/components/AddFamilyMemberToUnit.js` - Add family member to unit
- `/app/frontend/src/components/ResidentsList.js` - Residents list page
- `/app/frontend/src/components/Settings.js` - Settings wrapper
- `/app/frontend/src/components/settings/*` - Modular settings components
- `/app/frontend/src/components/Login.js` - Login with biometric support
- `/app/frontend/src/services/webauthn.js` - WebAuthn client service
- `/app/backend/webauthn_service.py` - WebAuthn server service
- `/app/backend/server.py` - Main backend server

## Prioritized Backlog

### P2
- Further query optimization (remaining unbounded queries in chat/messaging)
- Additional pagination for large data endpoints

### P3
- Real-time notifications for admin actions (e.g., new resident added)
