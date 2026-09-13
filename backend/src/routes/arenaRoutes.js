const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getChallenges,
  startChallenge,
  submitChallenge,
  getAttemptResult,
  getAttemptHistory,
  getLeaderboard,
  getMyProfile,
  getAchievements,
} = require("../controllers/arenaController");

// All arena routes require authentication.
router.use(authMiddleware);

// ── Challenges ─────────────────────────────────────────────
router.get("/challenges", getChallenges);
router.post("/challenges/:id/start", startChallenge);

// ── Attempts ──────────────────────────────────────────────
// Must be declared before "/:id" style routes that could shadow "me".
router.post("/attempts/:id/submit", submitChallenge);
router.get("/attempts/:id", getAttemptResult);

// ── User ───────────────────────────────────────────────────
router.get("/leaderboard", getLeaderboard);
router.get("/me/achievements", getAchievements);
router.get("/me/history", getAttemptHistory);
router.get("/me", getMyProfile);

module.exports = router;
