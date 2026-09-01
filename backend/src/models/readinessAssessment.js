const mongoose = require("mongoose");


const componentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, default: "" },
    score: { type: Number, default: null }, 
    weight: { type: Number, default: 0 }, 
    effectiveWeight: { type: Number, default: 0 },
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
    domain: { type: String, default: "" },
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
  trackDetected: { type: Boolean, default: true },

  // ── AI output ───────────────────────────────────────────
  analysis: { type: analysisSchema, default: () => ({}) },
  roadmap: { type: roadmapSchema, default: () => ({}) },

  // ── Trend + provenance ──────────────────────────────────
  skillSnapshot: { type: [skillSnapshotSchema], default: [] },

  scoreDelta: { type: Number, default: null },

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
