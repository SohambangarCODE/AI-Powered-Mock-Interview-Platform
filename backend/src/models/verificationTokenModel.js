/**
 * VerificationToken model.
 *
 * Stores hashed tokens for both email verification and password reset.
 * Raw tokens are NEVER stored — only the SHA-256 hash.
 *
 * A TTL index ensures MongoDB automatically removes expired documents,
 * keeping the collection lean without a cron job.
 */

const mongoose = require("mongoose");

const TOKEN_TYPES = ["email_verification", "password_reset"];

const verificationTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  tokenHash: {
    type: String,
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: TOKEN_TYPES,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    // MongoDB TTL index — document is deleted by the DB engine after expiry
    index: { expires: 0 },
  },
  usedAt: {
    type: Date,
    default: null,
  },
});

// Composite index: look up "unused, unexpired token for this user+type" quickly
verificationTokenSchema.index({ userId: 1, type: 1, usedAt: 1 });

const VerificationToken = mongoose.model(
  "VerificationToken",
  verificationTokenSchema
);

module.exports = VerificationToken;
