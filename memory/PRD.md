# HomeMe PRD

## Architecture
- **Frontend**: React + Tailwind + Recharts + i18next + Cairo
- **Backend**: FastAPI + MongoDB + Stripe + PayPal + WebAuthn
- **server.py**: 16,321 -> 2,495 lines (-84.7%) | 46 route modules

## Latest Features (Apr 13, 2026)

### Payment Integration
- Stripe checkout for subscriptions (working)
- PayPal orders/capture (sandbox creds)
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

### Internal Ads System (NEW)
- Super Admin creates/manages ads for display inside the app
- Position options: banner, sidebar, inline, dashboard
- Target specific compounds or all
- Click tracking and view stats
- CRUD from Super Admin panel -> Ads tab

### Google AdSense Spaces (NEW)
- 3 ad placeholder slots on public HomePage
- After Hero section (728x90 Leaderboard)
- Before Pricing section
- Before CTA section
- Ready for Google AdSense code insertion

### Referral Program (NEW)
- Each user gets a unique referral code (REF-XXXXXX)
- Track invited users count
- Auto-generate 1-month free coupon when 5 friends sign up
- Progress bar in admin dashboard
- Copy code functionality
- Super Admin referral stats dashboard

### Updated Subscription Plans
- Residential: Starter(free), Basic(500), Pro(1200), Premium(2200) EGP/month
- Company: Startup(3500), Business(7500), Enterprise(20000) EGP/month
- All plans now show FULL feature lists (no excluded items)
- Premium button changed from "Contact Us" to "Subscribe Now"
- Full comparison tables for both residential and company plans

### Updated Operating Guide
- HomePage guide: 15 compact grid cards (was 10 accordion items)
- In-app guide: 23 sections covering all features
- New sections: Complaints, Contracts, Ratings, Facilities, Polls, Announcements, Newsletters, Analytics, Export, Subscriptions

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

## Google AdSense
- Publisher ID: ca-pub-5928973437129941
- Customer ID: 2587234002
- Script added to index.html
- 3 ad slots on HomePage (after hero, before pricing, before CTA)
- Status: Configured, pending Google approval for domain

## Backlog
- P2: Bank transfer API (pending bank setup)

## Completed (Latest Session - Apr 13, 2026)
- Google AdSense spaces with proper `ins` elements (3 slots on HomePage)
- Upload images/videos for ads (up to 50MB) from Super Admin panel
- Email notification system (invoice emails + subscription reminders) from info@datalifeai.com
- Invoice PDF auto-generation
- Payment History page in Subscription Management
- Internal Ads system (CRUD + compound targeting)
- Referral program (5 friends = 1 month free)
