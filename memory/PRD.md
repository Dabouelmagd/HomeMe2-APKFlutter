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
- **Fixed "Add Resident" bug**: Root cause was data structure mismatch - API returns nested `family_head` objects in residences, but frontend expected flat fields. Fixed by flattening data in `fetchResidents()` in `AddFamilyMemberToUnit.js`
- **Fixed navigation**: Changed `window.location.href` to React Router `navigate()` in ResidentsList.js
- **CORS middleware**: Added proper CORSMiddleware configuration to FastAPI app
- **Query optimization**: Fixed N+1 query pattern in `/database/compounds` endpoint using aggregation
- **Bounded queries**: Added limits to unbounded `.to_list(None)` calls in search endpoints
- **Cleaned up backup files**: Removed 6 .backup/.js.backup files from components directory
- **Deployment health check**: Ran and fixed all 3 critical blockers

## Key Files
- `/app/frontend/src/components/AddFamilyMemberToUnit.js` - Add family member to unit
- `/app/frontend/src/components/ResidentsList.js` - Residents list page
- `/app/frontend/src/components/Settings.js` - Settings wrapper
- `/app/frontend/src/components/settings/*` - Modular settings components
- `/app/backend/server.py` - Main backend server

## Prioritized Backlog

### P1
- End-to-End Biometric Login Testing (WebAuthn flow)

### P2
- Further query optimization (remaining unbounded queries in chat/messaging)
- Additional pagination for large data endpoints
