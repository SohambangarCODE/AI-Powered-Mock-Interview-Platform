const mongoose = require("mongoose");

// ── Challenge Template ─────────────────────────────────────
// One shared template per (type × date/week). All users attempt the same
// challenge; their answers and scores are stored in ChallengeAttempt.

const questionSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true },
    question: { type: String, required: true },
    topic: { type: String, default: "General" },
  },
  { _id: false },
);

const challengeTemplateSchema = new mongoose.Schema({
  type: { type: String, enum: ["daily", "weekly"], required: true },
  category: {
    type: String,
    enum: ["technical", "hr", "aptitude", "domain", "dsa"],
    required: true,
  },
  difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  questions: [questionSchema],
  questionCount: { type: Number, default: 5 },
  // ISO date string "YYYY-MM-DD" for daily; ISO week "YYYY-Www" for weekly.
  periodKey: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Uniqueness: one template per type+category+difficulty combination per period.
challengeTemplateSchema.index(
  { type: 1, category: 1, difficulty: 1, periodKey: 1 },
  { unique: true },
);
challengeTemplateSchema.index({ expiresAt: 1 }); // TTL candidate

// ── Challenge Attempt ──────────────────────────────────────
// One document per user per challenge. Created on "Start", updated on "Submit".

const answerSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true },
    answer: { type: String, default: "" },
    score: { type: Number, min: 0, max: 10, default: null },
    feedback: { type: String, default: "" },
    points: { type: Number, default: 0 },
  },
  { _id: false },
);

const challengeAttemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChallengeTemplate",
    required: true,
  },
  // Snapshot of key challenge data so the result page works even if the
  // template is later rotated out.
  category: { type: String, required: true },
  difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
  type: { type: String, enum: ["daily", "weekly"], required: true },
  title: { type: String, default: "" },

  answers: [answerSchema],
  /** 0-100 overall score, computed server-side. */
  totalScore: { type: Number, default: 0 },
  /** Challenge points awarded, computed server-side. */
  pointsEarned: { type: Number, default: 0 },

  status: {
    type: String,
    enum: ["in-progress", "completed"],
    default: "in-progress",
  },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
  /** Seconds elapsed from start to submission. */
  timeTakenSeconds: { type: Number, default: null },
});

// Prevent duplicate attempts: one per user per challenge.
challengeAttemptSchema.index(
  { userId: 1, challengeId: 1 },
  { unique: true },
);
challengeAttemptSchema.index({ userId: 1, completedAt: -1 });

// ── User Arena Profile ─────────────────────────────────────
// One document per user; created on first challenge completion.

const achievementSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    icon: { type: String, default: "🏅" },
    earnedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const rankHistorySchema = new mongoose.Schema(
  {
    rank: { type: Number, required: true },
    points: { type: Number, required: true },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const userArenaProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  totalPoints: { type: Number, default: 0 },
  totalCompleted: { type: Number, default: 0 },

  // Streak tracking (calendar days, UTC).
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  // ISO date string of the last day a challenge was completed.
  lastCompletionDate: { type: String, default: null },

  achievements: [achievementSchema],
  rankHistory: { type: [rankHistorySchema], default: [] },

  updatedAt: { type: Date, default: Date.now },
});

userArenaProfileSchema.index({ totalPoints: -1 }); // leaderboard sort

// ── Models ─────────────────────────────────────────────────
const ChallengeTemplate = mongoose.model(
  "ChallengeTemplate",
  challengeTemplateSchema,
);
const ChallengeAttempt = mongoose.model(
  "ChallengeAttempt",
  challengeAttemptSchema,
);
const UserArenaProfile = mongoose.model(
  "UserArenaProfile",
  userArenaProfileSchema,
);

module.exports = { ChallengeTemplate, ChallengeAttempt, UserArenaProfile };
