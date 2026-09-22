/**
 * RBAC Middleware — permission-based route protection.
 *
 * Usage (always AFTER authMiddleware):
 *
 *   router.use(authMiddleware);
 *   router.post("/start", requirePermission("interview.create"), startInterview);
 *
 * Responses:
 *   401 — not authenticated (authMiddleware handles this; this middleware only
 *          runs when req.user is already set)
 *   403 — authenticated but the role lacks the required permission
 */

const { roleHasPermission } = require("../config/rolesConfig");

/**
 * Returns an Express middleware that checks whether the authenticated user's
 * role grants the specified permission.
 *
 * @param {string} permission  - e.g. "interview.create"
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    // authMiddleware must have run first — if req.user is missing, the chain
    // was configured incorrectly, so we return 401 as a safety net.
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const role = req.user.role || "Student"; // safe default

    if (!roleHasPermission(role, permission)) {
      return res.status(403).json({
        message: "You do not have permission to perform this action.",
        required: permission,
      });
    }

    next();
  };
};

module.exports = { requirePermission };
