# HomeMe PRD

## Architecture
- **Frontend**: React + Tailwind + Recharts + i18next + Cairo
- **Backend**: FastAPI + MongoDB + Stripe + PayPal + WebAuthn
- **server.py**: 16,321 -> 2,495 lines (-84.7%) | 46 route modules

## Latest Updates (Apr 14, 2026)

### i18n / Localization - Phase 2 Complete
- **WrittenGuide.js**: 100% translated (45 strings wrapped in t() with EN/FR keys)
- **HelpCenter.js**: 100% translated (33 strings - section titles, articles)
- **VideoTutorial.js**: Core UI translated (step titles, header, guide button)
- **SubscriptionActivation.js**: Duration labels and key messages translated
- **SuperAdminPanel.js**: Previously completed (112 strings translated)
- **ComplaintsSystem.js**: Type/status labels need t() (deferred - used to cause crash)
- **SubscriptionManagement.js**: Key toast/label strings remain
- **PushNotificationSettings.js**: Error messages use English (hook scope limitation)
- **i18n/index.js**: 9900+ lines with 500+ new translation keys added for EN and FR
- **French 'remember_me'**: Added missing translation
- All provider names (UtilityBills), multilingual data structures (ServicesManagement, PublicAccountTypeSelection), and language names intentionally remain as-is

### Previously Completed Features
- Payment Integration (Stripe + PayPal)
- Subscription Management with codes and coupons
- 14-Day Free Trial
- Internal Ads System (CRUD + targeting)
- Google AdSense spaces (3 slots on HomePage)
- Referral Program (5 friends = 1 month free)
- Updated Subscription Plans (7 tiers)
- Comprehensive Written Guide (23 sections)
- PDF Invoice Generation
- Automated Email Notifications
- Full comparison tables for plans

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
- 3 ad slots on HomePage
- Status: Configured, pending Google domain approval

## Translations Status
| Component | Arabic | English | French |
|-----------|--------|---------|--------|
| HomePage | 100% | 100% | 100% |
| AdminDashboard | 100% | 100% | 100% |
| SubscriptionManagement | 95% | 95% | 90% |
| SuperAdminPanel | 95% | 95% | 85% |
| ContractsManagement | 100% | 100% | 100% |
| FinancialDashboard | 100% | 100% | 100% |
| CompoundFinance | 90% | 90% | 80% |
| WrittenGuide | 100% | 100% | 100% |
| HelpCenter | 100% | 100% | 100% |
| VideoTutorial | 80% | 80% | 70% |
| SubscriptionActivation | 70% | 60% | 50% |
| Layout/Navigation | 100% | 100% | 100% |
| Login/Register | 100% | 100% | 100% |

## Backlog
- P1: Complete remaining translations in VideoTutorial, SubscriptionActivation, ComplaintsSystem, CompoundManagement, SuperAdminPanel (remaining toast messages and labels)
- P2: Bank transfer API (pending bank setup from user)
- P2: Smart Devices & Automation feature (placeholder exists)
- P3: Split i18n/index.js into separate locale JSON files for maintainability
