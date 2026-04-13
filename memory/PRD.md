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

### Session 1-2 (Previous)
- Full compound management system
- WebAuthn biometric login, PWA, Multi-language
- Settings page fix, refactor, redesign, PWA auto-reload fix

### Session 3 (Apr 13, 2026)
- **Fixed "Add Resident" bug**: Data structure mismatch fix in `AddFamilyMemberToUnit.js`
- **Fixed WebAuthn db initialization bug**: `webauthn_service.db` reassigned in startup event
- **CORS middleware**: Added CORSMiddleware to FastAPI
- **Query optimization**: N+1 fix in `/database/compounds`, bounded queries for messages/chats/search
- **Arabic translation completeness**: Added 35+ missing Arabic keys, translated 50+ hardcoded English toast messages in ServicesManagement, CompoundManagement, AddFamilyMemberToUnit, EventsAnnouncements, AdvancedAnalytics
- **Deployment health check**: All 3 critical blockers resolved
- **Cleanup**: Removed 8 backup files (components + i18n)

## Key Files
- `/app/frontend/src/i18n/index.js` - All translations (EN/AR/FR)
- `/app/frontend/src/components/AddFamilyMemberToUnit.js` - Add family member
- `/app/frontend/src/components/ResidentsList.js` - Residents list
- `/app/frontend/src/components/settings/*` - Modular settings
- `/app/frontend/src/services/webauthn.js` - WebAuthn client
- `/app/backend/webauthn_service.py` - WebAuthn server
- `/app/backend/server.py` - Main backend

## Prioritized Backlog

### P2
- Real-time notifications for admin actions (new resident, maintenance, etc.)

### P3
- Interactive dashboard with live stats (new residents, open maintenance, pending payments)
- Further translation audit for edge cases
