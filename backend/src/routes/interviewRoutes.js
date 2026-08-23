const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  startInterview,
  submitAnswer,
  getInterviews,
  getInterview,
} = require("../controllers/interviewController.js");

router.use(authMiddleware); 

router.post("/start", startInterview);
router.post("/submit-answer", submitAnswer);
router.get("/", getInterviews);
router.get("/:id", getInterview);

module.exports = router;