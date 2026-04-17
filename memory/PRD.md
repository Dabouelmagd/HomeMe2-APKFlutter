# HomeMe PRD

## Architecture
- Frontend: React + Tailwind + Recharts + i18next
- Backend: FastAPI + MongoDB + Stripe + PayPal + OpenAI GPT-4o-mini

## Role Hierarchy (Updated Feb 2026)
- **App Owner**: Full access - financial, subscriptions, ads, settings
- **Super Admin**: Operations only - NO revenue/budget/subscriptions/referrals. CAN manage compounds, users, ads, translations, satisfaction
- **Company Admin / Admin / Manager**: Compound-level
- **Security / Resident**: Limited dashboards

## Financial Data Restrictions (Super Admin)
Pages modified to hide financial data for super_admin:
- `/app/analytics`: Revenue card hidden, Financial tab hidden, Revenue chart hidden
- `/app/ad-analytics`: Financial tab hidden, Export buttons hidden, Revenue in compare hidden
- Sidebar: No budget, subscriptions, referrals, codes, coupons

## Backlog
- P2: Bank transfer API (pending user credentials)
- P2: Smart Devices & Automation (deferred)
