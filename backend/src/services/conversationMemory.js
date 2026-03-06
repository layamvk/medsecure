/**
 * Conversation Memory Service
 * Maintains per-user conversation sessions in memory for the AI assistant.
 * Each session stores recent messages, detected intents, and context metadata.
 *
 * Sessions auto-expire after SESSION_TTL_MS of inactivity.
 */

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_HISTORY = 20; // Max messages to retain per session
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Cleanup stale sessions every 5 min

// In-memory store: userId -> session
const sessions = new Map();

// ─── Session structure ──────────────────────────────────────────────────────
function createSession(userId, userRole) {
  return {
    userId,
    userRole,
    messages: [],           // { role: 'patient'|'ai', text: string, timestamp: Date }
    activeIntent: null,     // Current multi-turn intent (e.g., 'book_appointment')
    collectedFields: {},    // Fields gathered during multi-turn flow
    lastActivity: Date.now(),
    createdAt: Date.now(),
    messageCount: 0,
  };
}

// ─── Get or create a session ────────────────────────────────────────────────
function getSession(userId, userRole = 'patient') {
  const key = String(userId);
  if (sessions.has(key)) {
    const session = sessions.get(key);
    session.lastActivity = Date.now();
    // Update role if changed
    if (userRole && session.userRole !== userRole) {
      session.userRole = userRole;
    }
    return session;
  }
  const session = createSession(key, userRole);
  sessions.set(key, session);
  return session;
}

// ─── Add a message to the session ───────────────────────────────────────────
function addMessage(userId, role, text, metadata = {}) {
  const session = getSession(userId);
  session.messages.push({
    role,
    text,
    timestamp: Date.now(),
    ...metadata,
  });
  // Trim to max history
  if (session.messages.length > MAX_HISTORY) {
    session.messages = session.messages.slice(-MAX_HISTORY);
  }
  session.messageCount += 1;
  session.lastActivity = Date.now();
  return session;
}

// ─── Get conversation history formatted for AI ──────────────────────────────
function getHistory(userId, limit = 8) {
  const session = getSession(userId);
  return session.messages.slice(-limit).map((m) => ({
    role: m.role,
    text: m.text,
  }));
}

// ─── Set / clear an active multi-turn intent ────────────────────────────────
function setActiveIntent(userId, intent, collectedFields = {}) {
  const session = getSession(userId);
  session.activeIntent = intent;
  session.collectedFields = { ...session.collectedFields, ...collectedFields };
  session.lastActivity = Date.now();
  return session;
}

function getActiveIntent(userId) {
  const session = getSession(userId);
  return {
    intent: session.activeIntent,
    collectedFields: session.collectedFields,
  };
}

function clearActiveIntent(userId) {
  const session = getSession(userId);
  session.activeIntent = null;
  session.collectedFields = {};
  return session;
}

// ─── Update collected fields during multi-turn flow ─────────────────────────
function updateCollectedFields(userId, fields = {}) {
  const session = getSession(userId);
  session.collectedFields = { ...session.collectedFields, ...fields };
  session.lastActivity = Date.now();
  return session.collectedFields;
}

// ─── Get full session metadata ──────────────────────────────────────────────
function getSessionMeta(userId) {
  const key = String(userId);
  if (!sessions.has(key)) return null;
  const s = sessions.get(key);
  return {
    userId: s.userId,
    userRole: s.userRole,
    messageCount: s.messageCount,
    activeIntent: s.activeIntent,
    collectedFields: s.collectedFields,
    lastActivity: s.lastActivity,
    createdAt: s.createdAt,
    historyLength: s.messages.length,
  };
}

// ─── Clear a session ────────────────────────────────────────────────────────
function clearSession(userId) {
  sessions.delete(String(userId));
}

// ─── Periodic cleanup of stale sessions ─────────────────────────────────────
function cleanup() {
  const now = Date.now();
  for (const [key, session] of sessions) {
    if (now - session.lastActivity > SESSION_TTL_MS) {
      sessions.delete(key);
    }
  }
}

// Start cleanup interval (non-blocking, unref so it doesn't keep the process alive)
const cleanupTimer = setInterval(cleanup, CLEANUP_INTERVAL_MS);
if (cleanupTimer.unref) cleanupTimer.unref();

module.exports = {
  getSession,
  addMessage,
  getHistory,
  setActiveIntent,
  getActiveIntent,
  clearActiveIntent,
  updateCollectedFields,
  getSessionMeta,
  clearSession,
  cleanup,
};
