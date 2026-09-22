const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/rbacMiddleware");
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
router.get("/challenges",                requirePermission("challenge.attempt"), getChallenges);
router.post("/challenges/:id/start",     requirePermission("challenge.attempt"), startChallenge);

// ── Attempts ──────────────────────────────────────────────
// Must be declared before "/:id" style routes that could shadow "me".
router.post("/attempts/:id/submit",      requirePermission("challenge.attempt"), submitChallenge);
router.get("/attempts/:id",              requirePermission("challenge.attempt"), getAttemptResult);

// ── User ───────────────────────────────────────────────────
router.get("/leaderboard",               requirePermission("challenge.attempt"), getLeaderboard);
router.get("/me/achievements",           requirePermission("challenge.attempt"), getAchievements);
router.get("/me/history",                requirePermission("challenge.attempt"), getAttemptHistory);
router.get("/me",                        requirePermission("challenge.attempt"), getMyProfile);

module.exports = router;
