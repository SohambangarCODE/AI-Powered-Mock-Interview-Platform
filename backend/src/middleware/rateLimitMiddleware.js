/**
 * Rate limiting middleware.
 *
 * Uses express-rate-limit with configuration driven by securityConfig
 * so thresholds can be adjusted centrally.
 */

const rateLimit = require("express-rate-limit");
const { RATE_LIMIT } = require("../config/securityConfig");

const standardHeaders = true; // Emit `RateLimit-*` headers (RFC 7327)
const legacyHeaders = false; // Disable `X-RateLimit-*` headers

/**
 * Applied to all /api/auth/* routes.
 */
const authRateLimiter = rateLimit({
  windowMs: RATE_LIMIT.AUTH_WINDOW_MINUTES * 60 * 1000,
  max: RATE_LIMIT.AUTH_MAX_REQUESTS,
  standardHeaders,
  legacyHeaders,
  message: {
    message: "Too many requests from this IP — please try again later.",
  },
});

/**
 * Stricter limiter for password-reset and resend-verification routes.
 */
const passwordResetLimiter = rateLimit({
  windowMs: RATE_LIMIT.RESET_WINDOW_MINUTES * 60 * 1000,
  max: RATE_LIMIT.RESET_MAX_REQUESTS,
  standardHeaders,
  legacyHeaders,
  message: {
    message:
      "Too many password reset requests — please wait before trying again.",
  },
});

/**
 * General limiter for all API routes.
 */
const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT.GENERAL_WINDOW_MINUTES * 60 * 1000,
  max: RATE_LIMIT.GENERAL_MAX_REQUESTS,
  standardHeaders,
  legacyHeaders,
  message: { message: "Too many requests — please slow down." },
});

module.exports = { authRateLimiter, passwordResetLimiter, generalLimiter };
