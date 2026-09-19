/**
 * Session management utilities.
 *
 * All direct session / history DB writes go through here so the controller
 * stays thin and these operations can be reused across handlers.
 */

const Session = require("../models/sessionModel");
const LoginHistory = require("../models/loginHistoryModel");
const { generateSessionId } = require("./tokenUtils");
const { parseDevice, getClientIp } = require("./deviceUtils");
const {
  SESSION_EXPIRY_DAYS,
  MAX_SESSIONS_PER_USER,
} = require("../config/securityConfig");

// ── Session creation ──────────────────────────────────────────────────────────

/**
 * Create a new session document for a successful login.
 *
 * @param {string|ObjectId} userId
 * @param {import('express').Request} req
 * @param {string} jti - JWT ID from the signed token
 * @returns {Promise<string>} sessionId
 */
async function createSession(userId, req, jti) {
  const ua = req.headers["user-agent"] || "";
  const { browser, os, device } = parseDevice(ua);
  const ipAddress = getClientIp(req);

  const sessionId = generateSessionId();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

  await Session.create({
    userId,
    sessionId,
    jwtJti: jti,
    ipAddress,
    device,
    browser,
    os,
    userAgent: ua,
    expiresAt,
  });

  // Enforce per-user session cap — remove the oldest sessions beyond the limit
  const sessions = await Session.find({
    userId,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .select("_id");

  if (sessions.length > MAX_SESSIONS_PER_USER) {
    const toRevoke = sessions.slice(MAX_SESSIONS_PER_USER).map((s) => s._id);
    await Session.updateMany({ _id: { $in: toRevoke } }, { isRevoked: true });
  }

  return sessionId;
}

// ── Session revocation ────────────────────────────────────────────────────────

/**
 * Revoke a specific session by its public sessionId.
 *
 * @param {string} sessionId
 * @param {string|ObjectId} userId - Owner check
 * @returns {Promise<boolean>} true when a session was found and revoked
 */
async function revokeSession(sessionId, userId) {
  const result = await Session.updateOne(
    { sessionId, userId, isRevoked: false },
    { isRevoked: true }
  );
  return result.modifiedCount > 0;
}

/**
 * Revoke all sessions for a user, optionally except one jti (the current one).
 *
 * @param {string|ObjectId} userId
 * @param {string|null} exceptJti - jti to preserve (current session)
 */
async function revokeAllSessions(userId, exceptJti = null) {
  const filter = { userId, isRevoked: false };
  if (exceptJti) {
    filter.jwtJti = { $ne: exceptJti };
  }
  await Session.updateMany(filter, { isRevoked: true });
}

// ── Token / session check ─────────────────────────────────────────────────────

/**
 * Check whether a jti has been revoked or is otherwise invalid.
 *
 * @param {string} jti
 * @returns {Promise<boolean>} true = revoked/expired = reject the request
 */
async function isSessionRevoked(jti) {
  const session = await Session.findOne({ jwtJti: jti });
  if (!session) return true; // jti not in DB → treat as revoked
  if (session.isRevoked) return true;
  if (session.expiresAt <= new Date()) return true;
  return false;
}

/**
 * Update lastActiveAt for a session (non-blocking — fire and forget is fine).
 */
async function touchSession(jti) {
  await Session.updateOne({ jwtJti: jti }, { lastActiveAt: new Date() });
}

// ── Login history ─────────────────────────────────────────────────────────────

/**
 * Append an entry to the login/security history.
 *
 * @param {Object} params
 * @param {string|ObjectId} params.userId
 * @param {string} params.eventType
 * @param {boolean} params.success
 * @param {import('express').Request} params.req
 * @param {string} [params.note]
 */
async function recordEvent({ userId, eventType, success, req, note = "" }) {
  try {
    const ua = req?.headers?.["user-agent"] || "";
    const { browser, os, device } = parseDevice(ua);
    const ipAddress = getClientIp(req);

    await LoginHistory.create({
      userId,
      eventType,
      success,
      ipAddress,
      device,
      browser,
      os,
      userAgent: ua,
      note,
    });
  } catch (err) {
    // History writes are best-effort — never fail the auth flow
    console.error("Failed to record security event:", err.message);
  }
}

module.exports = {
  createSession,
  revokeSession,
  revokeAllSessions,
  isSessionRevoked,
  touchSession,
  recordEvent,
};
