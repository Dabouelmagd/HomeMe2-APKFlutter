# HomeMe PRD

## Architecture
- **Frontend**: React + Tailwind + Recharts + i18next + Cairo Font
- **Backend**: FastAPI + MongoDB + WebAuthn + Stripe + ReportLab + Openpyxl
- **server.py**: 16,321 → 3,838 lines (-76.5%) | 37 route modules

## New Features (Apr 13, 2026)
### Stripe Subscription Payments
- `/api/payments/subscribe` - Creates Stripe checkout for plan+duration
- `/api/payments/plans` - Returns all plans with prices (EGP/USD)
- `/api/payments/subscription-status/{session_id}` - Check payment status
- Webhook auto-activates subscription on successful payment
- Supports all 7 plans × 6 durations

### Subscription Analytics (Super Admin)
- `/api/super-admin/subscription-analytics` - Full analytics
- Active subscriptions count, plan distribution chart
- Monthly revenue estimate, expiring-soon alerts
- New tab in Super Admin Panel with visual stats

### Pricing (EGP monthly)
| Plan | Price | Residents |
|------|-------|-----------|
| Starter | 0 | 5 max |
| Basic | 500 | Unlimited |
| Pro | 1,200 | Unlimited |
| Premium | 2,200 | Unlimited |
| Company Startup | 3,500 | 3 compounds |
| Company Business | 7,500 | 1-5 compounds |
| Company Enterprise | 20,000 | Unlimited |

### Smart Devices: Marked as "قريباً" (Coming Soon)

## Backlog
- P2: Continue server.py cleanup (3,838 lines remaining)
- P2: 14-day free trial for paid plans
- P3: PayPal integration
