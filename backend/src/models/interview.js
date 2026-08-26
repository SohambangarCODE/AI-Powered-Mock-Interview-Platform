const mongoose = require("mongoose");

const DIFFICULTIES = ["easy", "medium", "hard"];

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "ai"], required: true },
  kind: {
    type: String,
    enum: ["question", "answer", "feedback", "nudge", "system"],
    required: true,
  },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  difficulty: { type: String, enum: DIFFICULTIES },
  topic: { type: String },
  skipped: { type: Boolean, default: false },
  score: { type: Number, min: 0, max: 10, default: null },
});

const turnSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true }, // 1-based
    topic: { type: String, default: "General" },
    difficulty: { type: String, enum: DIFFICULTIES, default: "medium" },
    question: { type: String, required: true },
    answer: { type: String, default: "" },
    score: { type: Number, min: 0, max: 10, default: null },
    feedback: { type: String, default: "" },
    skipped: { type: Boolean, default: false },
    askedAt: { type: Date, default: Date.now },
    answeredAt: { type: Date, default: null },
  },
  { _id: false },
);

const interviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  domain: { type: String, required: true },
  score: { type: Number, default: 0 }, 
  duration: { type: Number, default: 0 }, 
  messages: [messageSchema],
  createdAt: { type: Date, default: Date.now },
  questionsAnswered: { type: Number, default: 0 },
  feedback: { type: String, default: "" },
  isComplete: { type: Boolean, default: false },

  // ── Adaptive Engine fields ──────────────────────────────
  turns: [turnSchema],
  currentDifficulty: { type: String, enum: DIFFICULTIES, default: "medium" },
  askedTopics: { type: [String], default: [] },
  skippedCount: { type: Number, default: 0 },
  endReason: { type: String, default: "" },
  report: { type: mongoose.Schema.Types.Mixed, default: null },
  lastActivityAt: { type: Date, default: Date.now },
});

interviewSchema.index({ userId: 1, isComplete: 1, lastActivityAt: -1 });

interviewSchema.methods.openTurn = function () {
  const last = this.turns[this.turns.length - 1];
  return last && !last.answeredAt ? last : null;
};

interviewSchema.methods.previousAnswers = function () {
  return this.turns.filter((t) => !t.skipped && t.answer).map((t) => t.answer);
};

interviewSchema.methods.askedQuestions = function () {
  return this.turns.map((t) => t.question).filter(Boolean);
};

module.exports = mongoose.model("Interview", interviewSchema);
module.exports.DIFFICULTIES = DIFFICULTIES;
