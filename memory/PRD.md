# HomeMe PRD

## Multi-Session System
- Each browser tab gets unique sessionId (sessionStorage)
- All sessions stored in localStorage (shared)
- Session Switcher in header shows current account + other active accounts
- "Add Account" opens new tab for login
- Each tab survives refresh independently

## Files
- /app/frontend/src/utils/sessionManager.js - Session management utility
- /app/frontend/src/components/SessionSwitcher.js - UI component
- /app/frontend/src/App.js - AuthProvider uses session manager

## Backlog
- P2: Bank transfer API
- P2: Smart Devices
