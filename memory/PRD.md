# HomeMe - Compound Management System PRD

## Original Problem Statement
A comprehensive residential compound management system that supports:
- Multi-tenant architecture with role-based access control (RBAC)
- Support for Super Admin, Admin, Security, and Resident roles
- Internationalization (i18n) for Arabic, English, and French languages
- Complete resident, family, and guest management
- Service booking and maintenance requests
- Financial management and billing
- Visitor management with security check-in/check-out

## User Personas
1. **Super Admin**: Manages multiple compounds, creates subscription codes, oversees the platform
2. **Admin**: Manages a single compound, handles residents, services, and finances
3. **Security**: Limited access to visitor logs and security-related functions
4. **Resident**: Views their family, payments, and can request services

## Core Requirements
- [x] User authentication with JWT tokens
- [x] Role-based access control (RBAC)
- [x] Multi-language support (EN, AR, FR)
- [x] Resident and family management
- [x] Guest/visitor management with QR codes
- [x] Service booking system
- [x] Financial management and invoicing
- [x] Message center and notifications
- [x] Security dashboard for security personnel
- [x] Subscription code management

## What's Been Implemented

### Authentication System
- JWT-based authentication
- Password hashing with bcrypt
- Login/logout functionality
- User session management

### User Management
- User registration with subscription codes
- Multiple user roles support
- User activation/deactivation
- Profile management

### Email Notifications System (NEW)
- Welcome email for new registrations
- Payment reminder notifications
- Visitor arrival notifications
- Daily reports for administrators
- Maintenance request notifications
- SMTP integration with SiteGround

### Compound Management
- Create and manage residential compounds
- Unit management
- Resident assignment to units

### Internationalization
- i18n support with react-i18next
- Arabic (AR), English (EN), and French (FR) translations
- Language detection from URL query parameter
- Language persistence in localStorage

### Security Features
- Security dashboard for security personnel
- Visitor check-in/check-out logging
- Security notes and observations

### Financial Management
- Invoice generation
- Payment tracking
- Financial reports

## Current State (February 2025)

### Working Features
- Login for admin users (admin/admin123, dalia/Admin2024!)
- Registration page with full Arabic translation
- Dashboard with statistics
- Compound management
- Family management
- Guest management with security logs
- Service booking
- Financial management
- Message center

### Recent Fixes (This Session)
1. Fixed Arabic translation for registration page
2. Added missing i18n keys for registration form fields
3. Fixed i18n detection to support URL query parameter (?lng=ar)
4. Verified login functionality for all user roles (Admin, Security, Resident)
5. Created security user for testing
6. Verified multi-role concurrent access capability
7. Implemented complete email notification system with SMTP

### Email Notification Types
- **For Residents:**
  - Welcome email on registration
  - Payment reminders
  - Visitor arrival notifications
  
- **For Administrators:**
  - New resident registration alerts
  - Maintenance request notifications
  - Daily activity reports

## Technical Architecture

### Backend
- FastAPI (Python)
- MongoDB with Motor async driver
- JWT authentication
- bcrypt password hashing
- RESTful API design

### Frontend
- React 18
- react-router-dom for routing
- react-i18next for internationalization
- Tailwind CSS for styling
- Axios for API calls

### Database Schema
- users: {username, email, password_hash, role, compound_id, is_active}
- compounds: {name, address, admin_id}
- residents: {user_id, unit_number, family_id}
- guests: {name, resident_id, status, expected_at}
- security_logs: {guest_id, security_id, action, timestamp, notes}
- subscription_codes: {code, duration_months, is_active, used_by}

## API Endpoints

### Authentication
- POST /api/auth/login - User login
- POST /api/auth/register - User registration
- GET /api/auth/me - Get current user

### Users
- GET /api/users - List users
- POST /api/users - Create user
- PUT /api/users/{id} - Update user
- DELETE /api/users/{id} - Delete user

### Compounds
- GET /api/compounds - List compounds
- POST /api/compounds - Create compound
- PUT /api/compounds/{id} - Update compound

### Guests
- GET /api/guests - List guests
- POST /api/guests - Create guest
- POST /api/guest/{id}/security_check - Security check-in/out

### Subscription Codes
- GET /api/admin/subscription-codes - List codes
- POST /api/admin/subscription-codes - Create code
- POST /api/admin/subscription-codes/{code}/renew - Renew code

## Test Credentials
| Role | Username | Password | Status |
|------|----------|----------|--------|
| Admin | dalia | Admin2024! | ✅ Working |
| Admin | admin | admin123 | ✅ Working |
| Security | security | security123 | ✅ Working |
| Resident | resident1 | resident123 | ✅ Working |

## Deployment Information
- Preview URL: https://homeme-visitor-logs.preview.emergentagent.com
- Target Domain: homemeapp.net (user's custom domain)

## Backlog

### P0 (Critical)
- None currently

### P1 (High Priority)
- Deploy to production domain (homemeapp.net)
- Comprehensive end-to-end testing
- Security audit and hardening

### P2 (Medium Priority)
- Mobile app development
- Push notifications
- Email notifications
- Report generation and export

### P3 (Low Priority)
- Advanced analytics dashboard
- Integration with external payment gateways
- Automated billing reminders
