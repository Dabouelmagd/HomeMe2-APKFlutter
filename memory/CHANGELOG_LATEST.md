# Latest Changelog

## Iter 116 — Feb 6, 2026

**Title:** Pricing Fixes + GeoIP Currency + HomePage Refactor + Portfolio PDF Auto-Schedule

**Changes:**
1. ✅ Fixed old pricing in residential & company comparison tables (now match actual plan prices).
2. ✅ Added EGP/USD + Monthly/Yearly toggles to the company plans section (was hidden).
3. ✅ Removed fake stats from CustomerTestimonialsCarousel (+30/+100/+5,000/4.9 → all gone).
4. ✅ Added GeoIP-based currency auto-detection via timezone (`Intl.DateTimeFormat`):
   - Africa/Cairo or Egypt → EGP
   - Anywhere else → USD
   - User preference cached in localStorage.
5. ✅ Refactored HomePage.js from 1717 → 1064 lines by extracting:
   - `homepage/FAQSection.js`
   - `homepage/LiveDemoSection.js`
   - `homepage/RolesSection.js`
   - `homepage/PricingSection.js`
6. ✅ Added Company Portfolio PDF auto-generation to monthly_reports_scheduler:
   - Runs alongside existing summaries + statements on the 1st of each month at 02:00 UTC.
   - Emails to all `company_admin` + `app_owner`/`super_admin` accounts.
   - Idempotent via `report_runs` collection (kind="portfolio").
   - On-demand trigger via `POST /api/reports/run-monthly-now` works.
   - Tested manually: 40 portfolios sent successfully, 0 failures.

**Files modified:**
- `frontend/src/components/HomePage.js` (heavy)
- `frontend/src/components/CustomerTestimonialsCarousel.js`
- `frontend/src/components/homepage/*` (4 new files)
- `backend/routes/monthly_reports_scheduler.py`

**Tests:** Frontend smoke screenshots ✅. Backend curl + scheduler/status endpoint ✅.

---
