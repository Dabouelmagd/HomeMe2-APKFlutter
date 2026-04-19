/**
 * Multi-Session Manager
 * Allows multiple accounts to be logged in simultaneously across browser tabs.
 * Each tab has its own sessionId (stored in sessionStorage).
 * All sessions are stored in localStorage (shared across tabs).
 */

const SESSIONS_KEY = 'homeme_sessions';

// Generate a unique session ID for this tab
const getOrCreateTabSessionId = () => {
  let sid = sessionStorage.getItem('tab_session_id');
  if (!sid) {
    sid = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem('tab_session_id', sid);
  }
  return sid;
};

// Get all active sessions from localStorage
const getAllSessions = () => {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '{}');
  } catch {
    return {};
  }
};

// Save all sessions to localStorage
const saveAllSessions = (sessions) => {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
};

// Get current tab's session
const getCurrentSession = () => {
  const sid = getOrCreateTabSessionId();
  const sessions = getAllSessions();
  return sessions[sid] || null;
};

// Save/update current tab's session — de-duplicates by user id/username
const saveCurrentSession = (token, user, extras = {}) => {
  const sid = getOrCreateTabSessionId();
  const sessions = getAllSessions();
  const identityKey = user?.id || user?.username || user?.email;
  // Remove any OTHER sessions that belong to the same user to prevent duplicates
  if (identityKey) {
    for (const [existingSid, data] of Object.entries(sessions)) {
      if (existingSid === sid) continue;
      const existingKey = data?.user?.id || data?.user?.username || data?.user?.email;
      if (existingKey === identityKey) {
        delete sessions[existingSid];
      }
    }
  }
  sessions[sid] = {
    token,
    user,
    selectedRole: extras.selectedRole || null,
    selectedCompoundId: extras.selectedCompoundId || null,
    lastActive: Date.now(),
  };
  saveAllSessions(sessions);
};

// One-shot: de-duplicate existing sessions keeping the most recent per user identity
const dedupeSessionsByUser = () => {
  const sessions = getAllSessions();
  const byKey = {}; // identity -> {sid, lastActive}
  for (const [sid, data] of Object.entries(sessions)) {
    const key = data?.user?.id || data?.user?.username || data?.user?.email;
    if (!key) continue;
    const current = byKey[key];
    if (!current || (data.lastActive || 0) > (current.lastActive || 0)) {
      byKey[key] = { sid, lastActive: data.lastActive || 0 };
    }
  }
  const keepSids = new Set(Object.values(byKey).map(x => x.sid));
  // Also keep the current tab sid even if empty
  const currentSid = sessionStorage.getItem('tab_session_id');
  if (currentSid) keepSids.add(currentSid);
  let changed = false;
  for (const sid of Object.keys(sessions)) {
    if (!keepSids.has(sid)) {
      delete sessions[sid];
      changed = true;
    }
  }
  if (changed) saveAllSessions(sessions);
  return Object.keys(sessions).length;
};

// Remove current tab's session
const removeCurrentSession = () => {
  const sid = getOrCreateTabSessionId();
  const sessions = getAllSessions();
  delete sessions[sid];
  saveAllSessions(sessions);
  sessionStorage.removeItem('tab_session_id');
};

// Get all active sessions (for session switcher) — de-duplicates by user identity at read time
const getActiveSessions = () => {
  const sessions = getAllSessions();
  const currentSid = sessionStorage.getItem('tab_session_id');
  // Keep only the most-recent session per user identity
  const byKey = {};
  for (const [sid, data] of Object.entries(sessions)) {
    const key = data?.user?.id || data?.user?.username || data?.user?.email || sid;
    const existing = byKey[key];
    // Prefer the current tab's session if it matches, otherwise most-recent
    const shouldReplace = !existing
      || sid === currentSid
      || (existing.sid !== currentSid && (data.lastActive || 0) > (existing.lastActive || 0));
    if (shouldReplace) byKey[key] = { sid, data };
  }
  return Object.values(byKey).map(({ sid, data }) => ({
    sessionId: sid,
    user: data.user,
    token: data.token,
    lastActive: data.lastActive,
    isCurrent: sid === currentSid,
  }));
};

// Switch this tab to another session
const switchToSession = (targetSessionId) => {
  const sessions = getAllSessions();
  const target = sessions[targetSessionId];
  if (!target) return null;

  // Update this tab's session ID
  sessionStorage.setItem('tab_session_id', targetSessionId);
  return target;
};

// Clean up stale sessions (older than 24 hours)
const cleanupStaleSessions = () => {
  const sessions = getAllSessions();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  let changed = false;
  for (const [sid, data] of Object.entries(sessions)) {
    if (data.lastActive < cutoff) {
      delete sessions[sid];
      changed = true;
    }
  }
  if (changed) saveAllSessions(sessions);
};

// Migrate from old single-session storage
const migrateFromLegacy = () => {
  const oldToken = localStorage.getItem('token');
  const oldUser = localStorage.getItem('user');
  if (oldToken && oldUser) {
    try {
      const userData = JSON.parse(oldUser);
      const sid = getOrCreateTabSessionId();
      const sessions = getAllSessions();
      if (!sessions[sid]) {
        sessions[sid] = {
          token: oldToken,
          user: userData,
          selectedRole: localStorage.getItem('selectedRole'),
          selectedCompoundId: localStorage.getItem('selectedCompoundId'),
          lastActive: Date.now(),
        };
        saveAllSessions(sessions);
      }
    } catch { /* ignore */ }
  }
};

export {
  getOrCreateTabSessionId,
  getAllSessions,
  getCurrentSession,
  saveCurrentSession,
  removeCurrentSession,
  getActiveSessions,
  switchToSession,
  cleanupStaleSessions,
  migrateFromLegacy,
  dedupeSessionsByUser,
};
