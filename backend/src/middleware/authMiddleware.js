/**
 * Auth middleware — JWT verification + session revocation check.
 *
 * Extended from the original to:
 * 1. Extract the `jti` claim and validate the session is active (not revoked).
 * 2. Attach `req.jti` so controllers can reference the current session's jti.
 */

const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const { isSessionRevoked, touchSession } = require("../utils/sessionUtils");

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Authorization header is missing or invalid." });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check session revocation (jti-based)
    if (decoded.jti) {
      const revoked = await isSessionRevoked(decoded.jti);
      if (revoked) {
        return res
          .status(401)
          .json({ message: "Session has been revoked. Please log in again." });
      }
      // Update last-active timestamp (fire-and-forget — don't block the request)
      touchSession(decoded.jti).catch(() => {});
    }

    const user = await User.findById(decoded.userID);
    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    req.user = user;
    req.userId = user._id;
    req.jti = decoded.jti || null; // Available to controllers

    next();
  } catch (error) {
    console.error("Error verifying token:", error);
    res.status(401).json({ message: "Invalid or expired token." });
  }
};

module.exports = authMiddleware;