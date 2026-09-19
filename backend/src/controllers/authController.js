/**
 * Auth controller — enterprise-level authentication.
 *
 * All existing handlers (register, login, getUserProfile) are preserved and
 * upgraded in-place. New handlers are added below.
 */

const User = require("../models/userModel");
const VerificationToken = require("../models/verificationTokenModel");
const Session = require("../models/sessionModel");
const LoginHistory = require("../models/loginHistoryModel");
const jwt = require("jsonwebtoken");
const {
  generateSecureToken,
  hashToken,
  generateJti,
} = require("../utils/tokenUtils");
const { validatePasswordStrength } = require("../utils/passwordUtils");
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendSecurityAlertEmail,
} = require("../utils/emailService");
const {
  createSession,
  revokeSession,
  revokeAllSessions,
  recordEvent,
} = require("../utils/sessionUtils");
const {
  VERIFICATION_TOKEN_EXPIRY_HOURS,
  RESET_TOKEN_EXPIRY_HOURS,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_MINUTES,
  LOGIN_HISTORY_PAGE_SIZE,
} = require("../config/securityConfig");

// ── JWT helpers ───────────────────────────────────────────────────────────────

/**
 * Sign a JWT that includes a `jti` for per-session revocation.
 * @param {string} userID
 * @param {string} jti
 */
const signToken = (userID, jti) =>
  jwt.sign({ userID, jti }, process.env.JWT_SECRET, { expiresIn: "1d" });

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Create and store a hashed token for email verification or password reset.
 * Invalidates any existing unused token of the same type for the same user.
 */
async function issueToken(userId, type, expiryHours) {
  // Invalidate previous unused tokens of the same type
  await VerificationToken.updateMany(
    { userId, type, usedAt: null },
    { usedAt: new Date() }
  );

  const rawToken = generateSecureToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

  await VerificationToken.create({ userId, tokenHash, type, expiresAt });
  return rawToken; // Only the raw token leaves this function; hash stays in DB
}

// ── Register ──────────────────────────────────────────────────────────────────

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Backend password strength check
    const { valid, errors } = validatePasswordStrength(password);
    if (!valid) {
      return res
        .status(400)
        .json({ message: errors[0], errors });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "An account with this email already exists." });
    }

    const newUser = new User({ name, email, password });
    await newUser.save();

    // Send verification email
    const rawToken = await issueToken(
      newUser._id,
      "email_verification",
      VERIFICATION_TOKEN_EXPIRY_HOURS
    );
    await sendVerificationEmail(email, rawToken);

    await recordEvent({
      userId: newUser._id,
      eventType: "register",
      success: true,
      req,
      note: "Account created",
    });

    res.status(201).json({
      message:
        "Account created! Please check your email to verify your account.",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        isEmailVerified: false,
      },
      requiresVerification: true,
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Registration failed. Please try again." });
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      // Don't reveal whether the email exists
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Lockout check
    if (existingUser.isLockedOut()) {
      const remaining = Math.ceil(
        (existingUser.lockoutUntil - Date.now()) / 60000
      );
      return res.status(423).json({
        message: `Account temporarily locked. Please try again in ${remaining} minute${remaining === 1 ? "" : "s"}.`,
        lockedUntil: existingUser.lockoutUntil,
      });
    }

    const isMatch = await existingUser.comparePassword(password);

    if (!isMatch) {
      // Increment failed attempts
      existingUser.failedLoginAttempts += 1;

      if (existingUser.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        existingUser.lockoutUntil = new Date(
          Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000
        );
        existingUser.failedLoginAttempts = 0;
        await existingUser.save();

        await recordEvent({
          userId: existingUser._id,
          eventType: "account_locked",
          success: false,
          req,
          note: `Locked for ${LOCKOUT_DURATION_MINUTES} minutes after ${MAX_FAILED_ATTEMPTS} failed attempts`,
        });

        return res.status(423).json({
          message: `Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.`,
          lockedUntil: existingUser.lockoutUntil,
        });
      }

      await existingUser.save();

      await recordEvent({
        userId: existingUser._id,
        eventType: "login_failure",
        success: false,
        req,
        note: `Failed attempt ${existingUser.failedLoginAttempts}/${MAX_FAILED_ATTEMPTS}`,
      });

      const attemptsLeft = MAX_FAILED_ATTEMPTS - existingUser.failedLoginAttempts;
      return res.status(401).json({
        message: `Invalid credentials. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining before lockout.`,
      });
    }

    // Successful login — reset counters
    existingUser.failedLoginAttempts = 0;
    existingUser.lockoutUntil = null;
    await existingUser.save();

    // Create session
    const jti = generateJti();
    const token = signToken(existingUser._id, jti);
    const sessionId = await createSession(existingUser._id, req, jti);

    await recordEvent({
      userId: existingUser._id,
      eventType: "login_success",
      success: true,
      req,
    });

    res.status(200).json({
      message: "Logged in successfully.",
      user: {
        id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
        isEmailVerified: existingUser.isEmailVerified,
        createdAt: existingUser.createdAt,
      },
      token,
      sessionId,
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ message: "Login failed. Please try again." });
  }
};

// ── Get current user ──────────────────────────────────────────────────────────

const getMe = async (req, res) => {
  try {
    const user = req.user;
    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        lastPasswordChange: user.lastPasswordChange,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Failed to fetch profile." });
  }
};

// ── Get user profile by ID (existing route, preserved) ───────────────────────

const getUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;

    // Users may only fetch their own profile via this route
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ message: "Forbidden." });
    }

    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found." });
    }
    res.status(200).json({
      user: {
        id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
        isEmailVerified: existingUser.isEmailVerified,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: error.message });
  }
};

// ── Email Verification ────────────────────────────────────────────────────────

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Verification token is required." });
    }

    const tokenHash = hashToken(token);
    const record = await VerificationToken.findOne({
      tokenHash,
      type: "email_verification",
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      return res.status(400).json({
        message:
          "This verification link is invalid or has expired. Please request a new one.",
        expired: true,
      });
    }

    // Mark token used and verify the user atomically
    record.usedAt = new Date();
    await record.save();

    const user = await User.findById(record.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.isEmailVerified) {
      return res.status(200).json({ message: "Email already verified." });
    }

    user.isEmailVerified = true;
    await user.save();

    await recordEvent({
      userId: user._id,
      eventType: "email_verification",
      success: true,
      req,
      note: "Email verified successfully",
    });

    res.status(200).json({ message: "Email verified successfully!" });
  } catch (error) {
    console.error("Error verifying email:", error);
    res.status(500).json({ message: "Verification failed. Please try again." });
  }
};

const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email });

    // Always respond the same way — don't leak whether the email exists
    if (!user || user.isEmailVerified) {
      return res.status(200).json({
        message:
          "If your email is registered and unverified, a new link has been sent.",
      });
    }

    const rawToken = await issueToken(
      user._id,
      "email_verification",
      VERIFICATION_TOKEN_EXPIRY_HOURS
    );
    await sendVerificationEmail(email, rawToken);

    res.status(200).json({
      message:
        "If your email is registered and unverified, a new link has been sent.",
    });
  } catch (error) {
    console.error("Error resending verification:", error);
    res.status(500).json({ message: "Failed to resend. Please try again." });
  }
};

// ── Forgot Password ───────────────────────────────────────────────────────────

const forgotPassword = async (req, res) => {
  // Always returns the same response — never reveal whether the email exists
  const GENERIC_MSG =
    "If an account with that email exists, a password reset link has been sent.";

  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email });
    if (user) {
      const rawToken = await issueToken(
        user._id,
        "password_reset",
        RESET_TOKEN_EXPIRY_HOURS
      );
      await sendPasswordResetEmail(email, rawToken);

      await recordEvent({
        userId: user._id,
        eventType: "password_reset_request",
        success: true,
        req,
        note: "Password reset email sent",
      });
    }

    res.status(200).json({ message: GENERIC_MSG });
  } catch (error) {
    console.error("Error in forgot password:", error);
    // Still return generic message — don't leak anything via errors
    res.status(200).json({ message: GENERIC_MSG });
  }
};

// ── Reset Password ────────────────────────────────────────────────────────────

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required." });
    }

    // Validate password strength
    const { valid, errors } = validatePasswordStrength(newPassword);
    if (!valid) {
      return res.status(400).json({ message: errors[0], errors });
    }

    const tokenHash = hashToken(token);
    const record = await VerificationToken.findOne({
      tokenHash,
      type: "password_reset",
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      return res.status(400).json({
        message:
          "This reset link is invalid or has expired. Please request a new one.",
        expired: true,
      });
    }

    const user = await User.findById(record.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Mark token used (single-use)
    record.usedAt = new Date();
    await record.save();

    // Update password + tracking fields
    user.password = newPassword; // pre-save hook re-hashes
    user.lastPasswordChange = new Date();
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;
    await user.save();

    // Invalidate ALL existing sessions (security: old tokens no longer work)
    await revokeAllSessions(user._id);

    await recordEvent({
      userId: user._id,
      eventType: "password_reset_complete",
      success: true,
      req,
      note: "Password reset; all sessions invalidated",
    });

    res.status(200).json({
      message: "Password reset successfully. Please log in with your new password.",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Password reset failed. Please try again." });
  }
};

// ── Change Password ───────────────────────────────────────────────────────────

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current and new passwords are required." });
    }

    const user = req.user;

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    // Validate new password strength
    const { valid, errors } = validatePasswordStrength(newPassword);
    if (!valid) {
      return res.status(400).json({ message: errors[0], errors });
    }

    // Update password
    user.password = newPassword; // pre-save hook re-hashes
    user.lastPasswordChange = new Date();
    await user.save();

    // Invalidate all other sessions (current session preserved via jti)
    const currentJti = req.jti; // set by authMiddleware
    await revokeAllSessions(user._id, currentJti);

    await recordEvent({
      userId: user._id,
      eventType: "password_change",
      success: true,
      req,
      note: "Password changed; other sessions invalidated",
    });

    res.status(200).json({
      message: "Password changed successfully. Other sessions have been logged out.",
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Failed to change password. Please try again." });
  }
};

// ── Logout ────────────────────────────────────────────────────────────────────

const logout = async (req, res) => {
  try {
    const jti = req.jti;
    if (jti) {
      await Session.updateOne({ jwtJti: jti }, { isRevoked: true });
    }

    await recordEvent({
      userId: req.user._id,
      eventType: "logout",
      success: true,
      req,
    });

    res.status(200).json({ message: "Logged out successfully." });
  } catch (error) {
    console.error("Error logging out:", error);
    res.status(500).json({ message: "Logout failed." });
  }
};

const logoutAll = async (req, res) => {
  try {
    await revokeAllSessions(req.user._id);

    await recordEvent({
      userId: req.user._id,
      eventType: "logout_all",
      success: true,
      req,
      note: "All sessions revoked",
    });

    res.status(200).json({ message: "All sessions logged out." });
  } catch (error) {
    console.error("Error logging out all sessions:", error);
    res.status(500).json({ message: "Failed to log out all sessions." });
  }
};

// ── Sessions ──────────────────────────────────────────────────────────────────

const getSessions = async (req, res) => {
  try {
    const sessions = await Session.find({
      userId: req.user._id,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    })
      .sort({ lastActiveAt: -1 })
      .select("-jwtJti -userAgent -__v");

    const currentJti = req.jti;
    const currentSession = await Session.findOne({ jwtJti: currentJti });

    const result = sessions.map((s) => ({
      sessionId: s.sessionId,
      device: s.device,
      browser: s.browser,
      os: s.os,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      expiresAt: s.expiresAt,
      isCurrent:
        currentSession && s.sessionId === currentSession.sessionId,
    }));

    res.status(200).json({ sessions: result });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ message: "Failed to fetch sessions." });
  }
};

const revokeSessionHandler = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const revoked = await revokeSession(sessionId, req.user._id);

    if (!revoked) {
      return res.status(404).json({ message: "Session not found." });
    }

    await recordEvent({
      userId: req.user._id,
      eventType: "session_revoked",
      success: true,
      req,
      note: `Session ${sessionId} revoked`,
    });

    res.status(200).json({ message: "Session revoked." });
  } catch (error) {
    console.error("Error revoking session:", error);
    res.status(500).json({ message: "Failed to revoke session." });
  }
};

const revokeOtherSessions = async (req, res) => {
  try {
    const currentJti = req.jti;
    await revokeAllSessions(req.user._id, currentJti);

    await recordEvent({
      userId: req.user._id,
      eventType: "logout_all",
      success: true,
      req,
      note: "All other sessions revoked",
    });

    res.status(200).json({ message: "All other sessions have been logged out." });
  } catch (error) {
    console.error("Error revoking other sessions:", error);
    res.status(500).json({ message: "Failed to revoke other sessions." });
  }
};

// ── Login History ─────────────────────────────────────────────────────────────

const getLoginHistory = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = LOGIN_HISTORY_PAGE_SIZE;
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      LoginHistory.find({ userId: req.user._id })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .select("-userAgent -__v"),
      LoginHistory.countDocuments({ userId: req.user._id }),
    ]);

    res.status(200).json({
      events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching login history:", error);
    res.status(500).json({ message: "Failed to fetch login history." });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  getUserProfile,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  logout,
  logoutAll,
  getSessions,
  revokeSessionHandler,
  revokeOtherSessions,
  getLoginHistory,
};
