const express = require("express");
const router = express.Router();

const {
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
  switchRole,
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");
const { passwordResetLimiter, authRateLimiter } = require("../middleware/rateLimitMiddleware");

// ── Public routes ─────────────────────────────────────────────────────────────
// authRateLimiter only on login/register — these are the brute-force targets.
// Authenticated routes (sessions, history, change-password) do NOT need it.
router.post("/register", authRateLimiter, registerUser);
router.post("/login", authRateLimiter, loginUser);

// Email verification
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", passwordResetLimiter, resendVerification);

// Password reset (rate-limited)
router.post("/forgot-password", passwordResetLimiter, forgotPassword);
router.post("/reset-password", resetPassword);

// ── Authenticated routes ──────────────────────────────────────────────────────
router.get("/me", authMiddleware, getMe);
router.get("/profile/:id", authMiddleware, getUserProfile);

// Password change
router.post("/change-password", authMiddleware, changePassword);

// Session management
router.post("/logout", authMiddleware, logout);
router.post("/logout-all", authMiddleware, logoutAll);
router.get("/sessions", authMiddleware, getSessions);
router.delete("/sessions/others", authMiddleware, revokeOtherSessions);
router.delete("/sessions/:sessionId", authMiddleware, revokeSessionHandler);

// Security / login history
router.get("/login-history", authMiddleware, getLoginHistory);

// Role switching (dev / demo — any authenticated user)
router.patch("/me/role", authMiddleware, switchRole);

module.exports = router;
