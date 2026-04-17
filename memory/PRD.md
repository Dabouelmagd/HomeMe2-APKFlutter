# HomeMe PRD

## Architecture
- Frontend: React + Tailwind + Recharts + i18next
- Backend: FastAPI + MongoDB

## Role Hierarchy
- **App Owner**: Full access
- **Super Admin**: Operations only + شركات الإدارة. NO financial data

## Latest Fixes (Feb 2026)
- Added 40+ missing Arabic translations for analytics page
- Fixed language persistence on page refresh (i18n languageChanged event)
- Added شركات الإدارة to Super Admin sidebar
- Hidden financial data from Super Admin across all pages

## Backlog
- P2: Bank transfer API (pending user credentials)
- P2: Smart Devices & Automation (deferred)
