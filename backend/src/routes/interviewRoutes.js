const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/rbacMiddleware");
const {
  startInterview,
  submitAnswer,
  finishInterview,
  getActiveInterviews,
  getInterviews,
  getInterview,
  deleteInterview,
} = require("../controllers/interviewController.js");

// All interview routes require authentication.
router.use(authMiddleware);

// Students can create interviews; mentors/admins can read but not create.
router.post("/start",          requirePermission("interview.create"), startInterview);
router.post("/submit-answer",  requirePermission("interview.create"), submitAnswer);

// Must be declared before "/:id" — otherwise Express matches this as an id and
// the ObjectId cast fails on the string "active".
router.get("/active",          requirePermission("interview.read"),   getActiveInterviews);

router.get("/",                requirePermission("interview.read"),   getInterviews);
router.post("/:id/finish",     requirePermission("interview.create"), finishInterview);
router.get("/:id",             requirePermission("interview.read"),   getInterview);
router.delete("/:id",          requirePermission("interview.create"), deleteInterview);

module.exports = router;
