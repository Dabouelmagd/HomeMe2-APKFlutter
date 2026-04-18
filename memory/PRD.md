# HomeMe PRD

## Ad Positions - All 12 Connected
| Position | Max | Component | File | Auth |
|---|---|---|---|---|
| homepage_hero | 3 | InternalAdBanner | HomePage.js (after hero) | Public |
| homepage_mid | 2 | InternalAdBanner | HomePage.js (before pricing) | Public |
| homepage_footer | 2 | InternalAdBanner | HomePage.js (before CTA) | Public |
| banner | 5 | InternalAdBanner | Layout.js | Auth |
| sidebar | 3 | InternalAdBanner | Layout.js | Auth |
| dashboard | 2 | InternalAdBanner | ResidentDashboard.js | Auth |
| inline | 4 | InternalAdBanner | ResidentDashboard.js | Auth |
| login_page | 2 | InternalAdBanner | Login.js | Public |
| popup | 1 | PopupAdOverlay | Layout.js | Auth |
| notification | 2 | InternalAdBanner | NotificationCenter.js | Auth |
| splash | 1 | InternalAdBanner | App.js | Auth |
| services_page | 3 | InternalAdBanner | ServicesManagement.js | Auth |

## Public API
- GET /api/ads/public?position= (no auth, homepage/login only)

## Backlog
- P2: Bank transfer API
- P2: Smart Devices
