const mongoose = require("mongoose");

/**
 * One persisted record per readiness computation.
 *
 * These are append-only: every "Generate readiness report" run writes a new
 * document, which is what makes the score progression chart, the per-skill
 * improvement/decline tracking, and the trend-aware recommendations possible.
 * The weights in force at the time are stored alongside the scores so an old
 * assessment still explains itself after the config is retuned.
 */

const componentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true }, // resume | interview | skillAssessment | communication
    label: { type: String, default: "" },
    score: { type: Number, default: null }, // 0-100, null when no data
    weight: { type: Number, default: 0 }, // configured weight
    effectiveWeight: { type: Number, default: 0 }, // after renormalising
    hasData: { type: Boolean, default: false },
    detail: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false },
);

const analysisSchema = new mongoose.Schema(
  {
    technicalStrengths: { type: [String], default: [] },
    weakTechnicalAreas: { type: [String], default: [] },
    communicationGaps: { type: [String], default: [] },
    missingIndustrySkills: { type: [String], default: [] },
    categoryReason: { type: String, default: "" },
    summary: { type: String, default: "" },
    aiGenerated: { type: Boolean, default: false },
  },
  { _id: false },
);

const roadmapItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    reason: { type: String, default: "" },
    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },
    // Only set on interview-topic items, so the UI can deep-link into a
    // practice session for a domain the interview engine supports.
    domain: { type: String, default: "" },
    // Only set on project items.
    technologies: { type: [String], default: [] },
  },
  { _id: false },
);

const roadmapSchema = new mongoose.Schema(
  {
    technologies: { type: [roadmapItemSchema], default: [] },
    projects: { type: [roadmapItemSchema], default: [] },
    certifications: { type: [roadmapItemSchema], default: [] },
    interviewTopics: { type: [roadmapItemSchema], default: [] },
    milestones: { type: [String], default: [] },
    focusStatement: { type: String, default: "" },
    aiGenerated: { type: Boolean, default: false },
  },
  { _id: false },
);

/**
 * Per-skill score at the moment of assessment. Comparing snapshots across two
 * assessments is how "improving / declining" is derived — no separate history
 * collection needed.
 */
const skillSnapshotSchema = new mongoose.Schema(
  {
    skill: { type: String, required: true },
    score: { type: Number, required: true }, // 0-100
    source: {
      type: String,
      enum: ["assessment", "interview"],
      default: "assessment",
    },
  },
  { _id: false },
);

const readinessAssessmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // ── Score ───────────────────────────────────────────────
  overallScore: { type: Number, required: true }, // 0-100
  components: { type: [componentSchema], default: [] },
  // 0-100: how many of the four inputs the candidate actually has data for,
  // weighted. A high score on thin data is flagged rather than hidden.
  dataCompleteness: { type: Number, default: 0 },

  category: {
    type: String,
    enum: ["placementReady", "highPotential", "needsImprovement"],
    required: true,
  },
  categoryLabel: { type: String, default: "" },

  track: {
    type: String,
    enum: ["fresher", "internship", "experienced"],
    default: "fresher",
  },
  trackLabel: { type: String, default: "" },
  trackDetected: { type: Boolean, default: true }, // false when user overrode it

  // ── AI output ───────────────────────────────────────────
  analysis: { type: analysisSchema, default: () => ({}) },
  roadmap: { type: roadmapSchema, default: () => ({}) },

  // ── Trend + provenance ──────────────────────────────────
  skillSnapshot: { type: [skillSnapshotSchema], default: [] },
  // Change in overall score vs the previous assessment (null for the first).
  scoreDelta: { type: Number, default: null },
  // What went into this computation, for auditability.
  sources: {
    interviewCount: { type: Number, default: 0 },
    assessmentCount: { type: Number, default: 0 },
    hasResume: { type: Boolean, default: false },
    resumeUpdatedAt: { type: Date, default: null },
  },
  weightsUsed: { type: mongoose.Schema.Types.Mixed, default: null },

  createdAt: { type: Date, default: Date.now },
});

readinessAssessmentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model(
  "ReadinessAssessment",
  readinessAssessmentSchema,
);
