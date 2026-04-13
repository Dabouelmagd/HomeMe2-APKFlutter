# HomeMe PRD

## Architecture
- **Frontend**: React + Tailwind + Recharts + i18next + Cairo
- **Backend**: FastAPI + MongoDB + Stripe + WebAuthn
- **server.py**: 16,321 → 2,495 lines (-84.7%) | 42 route modules

## Latest Changes (Apr 13, 2026)
- 14-day free trial for all new accounts
- Stripe subscription checkout working
- Subscription expiry notifications (7-day + same-day)
- Super Admin subscription analytics dashboard
- server.py final cleanup: 2,495 lines remaining

## Subscription Pricing (EGP)
| Plan | Monthly | Annual (10mo) |
|------|---------|---------------|
| Starter | Free | Free |
| Basic | 500 | 5,000 |
| Pro | 1,200 | 12,000 |
| Premium | 2,200 | 22,000 |
| Co. Startup | 3,500 | 35,000 |
| Co. Business | 7,500 | 75,000 |
| Co. Enterprise | 20,000 | 200,000 |

## Remaining in server.py (2,495 lines)
- Core models, enums, WebSocket handlers
- Push notification routes, gallery/init services (duplicated in routes)
- Startup/shutdown handlers

## Backlog
- P2: PayPal integration
- P3: Final server.py dedup (remove remaining duplicates)
