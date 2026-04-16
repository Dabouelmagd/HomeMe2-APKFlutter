# HomeMe PRD

## Architecture
- Frontend: React + Tailwind + Recharts + i18next
- Backend: FastAPI + MongoDB + Stripe + PayPal + OpenAI GPT-4o-mini
- Deployment: SPA static build served by FastAPI with catch-all fallback

## Latest Session (Feb 2026)
### Hybrid Ad System Fix: Resolved FastAPI routing conflict for /ads/ad-settings endpoint
- Removed duplicate endpoint definitions that caused PUT /api/ads/ad-settings to return 400
- Verified all ad CRUD operations still work correctly
- Frontend hybrid ad toggles (AdSense vs Internal) fully functional

## Completed Features
- Hybrid Ad System (AdSense + Internal Ads toggle per position) (DONE)
- Auto-translate 955 missing keys (DONE)
- Company offers/gifts/ads (DONE)
- Owner Dashboard redesign with live data (DONE)
- Full Referral CRUD + settings (DONE)
- User edit/delete/assign (DONE)
- Settings auth fix (DONE)
- SPA catch-all for production (DONE)
- Full Owner CRUD for Codes/Coupons/Subscriptions (DONE)
- Email Notifications with SMTP (DONE)
- Internal Ads + Analytics (DONE)
- Account Selector with active_role logic (DONE)
- Super Admin sidebar styling (Slate/Cyan) separated from Owner (Black/Rose) (DONE)
- All previous features (DONE)

## Backlog
- P2: Bank transfer API (pending user credentials)
- P2: Smart Devices & Automation (deferred)

## Technical Notes
- FastAPI routing: Static paths (e.g., /ads/ad-settings) MUST be defined ABOVE dynamic paths (e.g., /ads/{ad_id})
- SPA fallback: StaticFiles catch-all at bottom of server.py is required for production page refresh
- active_role vs user.role: UI context determined by localStorage active_role, not DB role
