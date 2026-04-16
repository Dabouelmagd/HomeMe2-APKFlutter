# HomeMe PRD

## Architecture
- Frontend: React + Tailwind + Recharts + i18next
- Backend: FastAPI + MongoDB + Stripe + PayPal + OpenAI GPT-4o-mini
- i18n: en.json, ar.json, fr.json

## Latest: Auto-Translate Feature (Apr 16, 2026)
- Added AI-powered auto-translation for missing keys using GPT-4o-mini
- Batch translation: translates up to 25 missing keys per click per language
- Single key translation: click ✨ icon on any empty cell to translate instantly
- Backend endpoints: /api/translations/auto-translate and /api/translations/auto-translate-single

## Completed Features
- AI Auto-Translation for missing keys (DONE - Apr 16, 2026)
- Homepage-first flow, Ad Placement Guide (DONE)
- Ad Analytics Reports in Advanced Analytics (DONE)
- Internal Ad Display for Residents (DONE)
- Enhanced Ads Management (DONE)
- Sidebar Reorganization + Budget + Reminders (DONE)
- Company Subscriptions Management (DONE)
- Account Selector, Translation Management (DONE)
- Full i18n (EN/AR/FR), App Owner role (DONE)
- Payment (Stripe + PayPal), Subscriptions (DONE)
- Internal Ads, AdSense, Referral Program (DONE)

## Backlog
- P2: Bank transfer API (pending user credentials)
- P2: Smart Devices & Automation (deferred)
