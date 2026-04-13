# HomeMe PRD

## Architecture
- **Frontend**: React + Tailwind + Recharts + i18next + Cairo
- **Backend**: FastAPI + MongoDB + Stripe + PayPal + WebAuthn
- **server.py**: 16,321 → 2,495 lines (-84.7%) | 44 route modules

## Latest Features (Apr 13, 2026)
### Payment Integration
- Stripe checkout for subscriptions (working)
- PayPal orders/capture (code ready, sandbox creds need verification)
- Payment methods API: Stripe, PayPal, InstaPay, Vodafone Cash, Bank Transfer
- InstaPay: 00201006008552 | Vodafone: 00201012625529

### Subscription Management Page (Admin)
- Current plan status with days remaining
- Activate subscription code
- Upgrade/renew with plan + duration selection
- Pay via Stripe, PayPal, or manual transfer (InstaPay/Vodafone)

### Coupon System
- Super Admin creates percentage or fixed-amount coupons
- Apply at checkout to get discount
- Track usage, set max uses, plan restrictions, expiry

### 14-Day Free Trial
- All new accounts get 14-day trial automatically

## Pricing (EGP)
| Plan | Monthly | Annual (10mo) |
|------|---------|---------------|
| Starter | Free | Free |
| Basic | 500 | 5,000 |
| Pro | 1,200 | 12,000 |
| Premium | 2,200 | 22,000 |
| Co. Startup | 3,500 | 35,000 |
| Co. Business | 7,500 | 75,000 |
| Co. Enterprise | 20,000 | 200,000 |

## Backlog
- P2: PayPal sandbox credentials verification
- P2: Bank transfer API (pending bank setup)
- P3: Coupon UI in Super Admin panel
