/**
 * Centralised security configuration.
 *
 * All auth-related thresholds and rules live here so they can be tweaked
 * without hunting through multiple controllers or services.
 */

module.exports = {
  // ── Bcrypt ─────────────────────────────────────────────────────────────────
  BCRYPT_SALT_ROUNDS: 12,

  // ── JWT ────────────────────────────────────────────────────────────────────
  JWT_EXPIRY: "1d",

  // ── Email Verification ─────────────────────────────────────────────────────
  VERIFICATION_TOKEN_EXPIRY_HOURS: 24,

  // ── Password Reset ─────────────────────────────────────────────────────────
  RESET_TOKEN_EXPIRY_HOURS: 1,

  // ── Account Lockout ────────────────────────────────────────────────────────
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,

  // ── Session ────────────────────────────────────────────────────────────────
  SESSION_EXPIRY_DAYS: 1,
  // Maximum active sessions allowed per user (oldest removed when exceeded)
  MAX_SESSIONS_PER_USER: 10,

  // ── Login History ──────────────────────────────────────────────────────────
  LOGIN_HISTORY_TTL_DAYS: 90,
  LOGIN_HISTORY_PAGE_SIZE: 20,

  // ── Password Rules ─────────────────────────────────────────────────────────
  PASSWORD_RULES: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
  },

  // ── Rate Limiting ──────────────────────────────────────────────────────────
  RATE_LIMIT: {
    // Login / register endpoints only
    AUTH_WINDOW_MINUTES: 15,
    AUTH_MAX_REQUESTS: 50,          // 50 login attempts per 15 min per IP
    // Password-reset specific — stricter
    RESET_WINDOW_MINUTES: 60,
    RESET_MAX_REQUESTS: 5,          // 5 reset requests per hour per IP
    // General API (all routes)
    GENERAL_WINDOW_MINUTES: 15,
    GENERAL_MAX_REQUESTS: 500,      // 500 req/15 min — generous for normal usage
  },
};
