const mongoose = require("mongoose");

/**
 * An AI-generated multiple-choice skill assessment.
 *
 * Questions are generated from the skills found on the candidate's own resume,
 * so the resulting scores are real measurements rather than seeded data.
 * `correctIndex` and `explanation` are stripped before the questions are sent to
 * the browser — see toClientQuestions() — so the quiz cannot be answered by
 * reading the network response.
 */

const questionSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true }, // 1-based
    skill: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    question: { type: String, required: true },
    options: { type: [String], required: true },
    correctIndex: { type: Number, required: true },
    explanation: { type: String, default: "" },

    // Filled in on submit.
    selectedIndex: { type: Number, default: null },
    isCorrect: { type: Boolean, default: null },
  },
  { _id: false },
);

const skillScoreSchema = new mongoose.Schema(
  {
    skill: { type: String, required: true },
    correct: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    score: { type: Number, default: 0 }, // 0-100
  },
  { _id: false },
);

const skillAssessmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  skills: { type: [String], default: [] },
  questions: { type: [questionSchema], default: [] },
  status: {
    type: String,
    enum: ["in-progress", "completed"],
    default: "in-progress",
  },

  // ── Results (set on submit) ─────────────────────────────
  overallScore: { type: Number, default: 0 }, // 0-100
  correctCount: { type: Number, default: 0 },
  answeredCount: { type: Number, default: 0 },
  skillScores: { type: [skillScoreSchema], default: [] },

  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
});

skillAssessmentSchema.index({ userId: 1, status: 1, createdAt: -1 });

/** The questions with the answer key removed — safe to send to the client. */
skillAssessmentSchema.methods.toClientQuestions = function () {
  return this.questions.map((q) => ({
    index: q.index,
    skill: q.skill,
    difficulty: q.difficulty,
    question: q.question,
    options: q.options,
    selectedIndex: q.selectedIndex,
  }));
};

/** The full review, including answers — only ever sent once completed. */
skillAssessmentSchema.methods.toReviewQuestions = function () {
  return this.questions.map((q) => ({
    index: q.index,
    skill: q.skill,
    difficulty: q.difficulty,
    question: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
    selectedIndex: q.selectedIndex,
    isCorrect: q.isCorrect,
  }));
};

module.exports = mongoose.model("SkillAssessment", skillAssessmentSchema);
