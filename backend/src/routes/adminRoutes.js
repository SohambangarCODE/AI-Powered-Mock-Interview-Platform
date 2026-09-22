const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/rbacMiddleware");
const {
  listUsers,
  getUser,
  updateUserRole,
  getAnalytics,
} = require("../controllers/adminController");

// All admin routes: must be authenticated AND have the required permission.
router.use(authMiddleware);

// ── User Management ──────────────────────────────────────────────────────────
router.get("/users",             requirePermission("user.manage"),  listUsers);
router.get("/users/:id",         requirePermission("user.manage"),  getUser);
router.patch("/users/:id/role",  requirePermission("role.manage"),  updateUserRole);

// ── Analytics ─────────────────────────────────────────────────────────────────
router.get("/analytics",         requirePermission("analytics.read"), getAnalytics);

module.exports = router;
