/**
 * LoginHistory model.
 *
 * Immutable audit log of authentication events.
 * A 90-day TTL index keeps storage bounded without manual cleanup.
 */

const mongoose = require("mongoose");
const { LOGIN_HISTORY_TTL_DAYS } = require("../config/securityConfig");

const EVENT_TYPES = [
  "login_success",
  "login_failure",
  "logout",
  "logout_all",
  "account_locked",
  "password_change",
  "password_reset_request",
  "password_reset_complete",
  "email_verification",
  "session_revoked",
  "register",
];

const loginHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  eventType: {
    type: String,
    enum: EVENT_TYPES,
    required: true,
  },
  success: {
    type: Boolean,
    required: true,
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
  /** Optional human-readable note for display in security history */
  note: {
    type: String,
    default: "",
  },
  timestamp: {
    type: Date,
    default: Date.now,
    // TTL: MongoDB removes documents this many days after `timestamp`
    index: { expires: LOGIN_HISTORY_TTL_DAYS * 24 * 60 * 60 },
  },
});

// Efficiently page through events for a single user, newest first
loginHistorySchema.index({ userId: 1, timestamp: -1 });

const LoginHistory = mongoose.model("LoginHistory", loginHistorySchema);

module.exports = LoginHistory;
