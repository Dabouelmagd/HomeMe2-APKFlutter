# HomeMe PRD

## Architecture
- Frontend: React + Tailwind + Recharts + i18next
- Backend: FastAPI + MongoDB + Stripe + PayPal
- i18n: en.json (2921 keys), ar.json (2471 keys), fr.json (2724 keys)

## Latest: Account Selector (Apr 14, 2026)
- New `/select-account` screen after login
- Shows all user compounds as selectable cards
- "Remember my choice" checkbox to skip next time
- Auto-redirect if only 1 compound
- Clears selection on logout
- Files: AccountSelector.js, App.js (route + logout), Login.js (redirect)

## Completed Features
- Account Selector, Translation Management (Super Admin)
- Full i18n (EN/AR/FR) with split JSON files
- Payment (Stripe + PayPal), Subscriptions, 14-Day Trial
- Internal Ads, Google AdSense, Referral Program
- PDF Invoices, Email Notifications, Written Guide

## Backlog
- P2: Bank transfer API (pending details)
- P2: Smart Devices & Automation (deferred)
