const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/rbacMiddleware");
const {
  listStudents,
  getStudent,
  getStudentInterviews,
  submitFeedback,
  getStudentFeedback,
} = require("../controllers/mentorController");

// All mentor routes: authenticated + appropriate permission.
router.use(authMiddleware);

// ── Student Visibility ───────────────────────────────────────────────────────
router.get("/students",                         requirePermission("student.read"),    listStudents);
router.get("/students/:id",                     requirePermission("student.read"),    getStudent);
router.get("/students/:id/interviews",          requirePermission("interview.read"),  getStudentInterviews);

// ── Feedback ─────────────────────────────────────────────────────────────────
router.post("/students/:id/feedback",           requirePermission("feedback.create"), submitFeedback);
router.get("/students/:id/feedback",            requirePermission("feedback.read"),   getStudentFeedback);

module.exports = router;
