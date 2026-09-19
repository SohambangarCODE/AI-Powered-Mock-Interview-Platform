/**
 * Session model.
 *
 * Each authenticated session is represented as a document.
 * The `jwtJti` (JWT ID) ties the JWT to this session record, enabling
 * precise per-session revocation without blocklists.
 *
 * Raw JWT tokens are NEVER stored here — only the jti claim.
 */

const mongoose = require("mongoose");
const { SESSION_EXPIRY_DAYS } = require("../config/securityConfig");

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  /** JWT ID claim — used to validate tokens against active sessions */
  jwtJti: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  ipAddress: {
    type: String,
    default: "unknown",
  },
  device: {
    type: String,
    default: "Unknown",
  },
  browser: {
    type: String,
    default: "Unknown",
  },
  os: {
    type: String,
    default: "Unknown",
  },
  userAgent: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastActiveAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
    // TTL index — MongoDB removes expired sessions automatically
    index: { expires: 0 },
  },
  isRevoked: {
    type: Boolean,
    default: false,
    index: true,
  },
});

// Fetch all active sessions for a user in one query
sessionSchema.index({ userId: 1, isRevoked: 1, expiresAt: 1 });

const Session = mongoose.model("Session", sessionSchema);

module.exports = Session;
