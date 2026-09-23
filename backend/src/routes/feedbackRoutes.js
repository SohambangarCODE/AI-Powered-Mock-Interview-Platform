const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/rbacMiddleware");
const { getMyFeedback } = require("../controllers/feedbackController");

// All feedback routes require authentication.
router.use(authMiddleware);

// ── Student: read feedback written for me ─────────────────────────────────────
// Students have interview.read permission — reuse it here rather than inventing
// a new permission just for this single student-facing read.
router.get("/mine", requirePermission("interview.read"), getMyFeedback);

module.exports = router;
