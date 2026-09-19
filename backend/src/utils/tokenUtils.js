/**
 * Token utilities — secure random token generation and hashing.
 *
 * Raw tokens are ONLY sent in emails/responses, never stored.
 * Only the SHA-256 hash is persisted.
 */

const crypto = require("crypto");

/**
 * Generate a cryptographically secure random hex token.
 * @param {number} bytes - Number of random bytes (default 32 → 64-char hex)
 */
const generateSecureToken = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");

/**
 * Hash a token with SHA-256 for storage.
 * Deterministic: same token → same hash. No salt needed here because the
 * raw token itself is already 256-bit random.
 */
const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

/**
 * Generate a UUID-style JWT ID (jti) for per-session revocation.
 */
const generateJti = () => crypto.randomUUID();

/**
 * Generate a unique session identifier.
 */
const generateSessionId = () => crypto.randomBytes(16).toString("hex");

module.exports = {
  generateSecureToken,
  hashToken,
  generateJti,
  generateSessionId,
};
