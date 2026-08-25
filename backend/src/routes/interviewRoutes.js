const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  startInterview,
  submitAnswer,
  finishInterview,
  getActiveInterviews,
  getInterviews,
  getInterview,
  deleteInterview,
} = require("../controllers/interviewController.js");

router.use(authMiddleware);

router.post("/start", startInterview);
router.post("/submit-answer", submitAnswer);

// Must be declared before "/:id" — otherwise Express matches this as an id and
// the ObjectId cast fails on the string "active".
router.get("/active", getActiveInterviews);

router.get("/", getInterviews);
router.post("/:id/finish", finishInterview);
router.get("/:id", getInterview);
router.delete("/:id", deleteInterview);

module.exports = router;
