const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { BCRYPT_SALT_ROUNDS } = require("../config/securityConfig");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },

  // ── Email verification ────────────────────────────────────────────────────
  isEmailVerified: {
    type: Boolean,
    default: false,
  },

  // ── Failed login / lockout ────────────────────────────────────────────────
  failedLoginAttempts: {
    type: Number,
    default: 0,
  },
  lockoutUntil: {
    type: Date,
    default: null,
  },

  // ── Password tracking ─────────────────────────────────────────────────────
  lastPasswordChange: {
    type: Date,
    default: null,
  },
});

// ── Pre-save: hash password when modified ─────────────────────────────────────
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
});

// ── Instance methods ──────────────────────────────────────────────────────────

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/** True when the account is currently locked out */
userSchema.methods.isLockedOut = function () {
  return this.lockoutUntil && this.lockoutUntil > new Date();
};

const userModel = mongoose.model("User", userSchema);

module.exports = userModel;