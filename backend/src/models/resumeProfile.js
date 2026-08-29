const mongoose = require("mongoose");

/**
 * The structured extraction of a candidate's most recent resume upload.
 *
 * One document per user — a new upload replaces the previous extraction, since
 * the readiness history (ReadinessAssessment) is what preserves the trail over
 * time.
 */

const skillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, default: "Other" },
    evidence: { type: String, default: "" },
  },
  { _id: false },
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    technologies: { type: [String], default: [] },
  },
  { _id: false },
);

const experienceSchema = new mongoose.Schema(
  {
    role: { type: String, default: "" },
    organization: { type: String, default: "" },
    type: {
      type: String,
      enum: ["job", "internship", "freelance", "other"],
      default: "other",
    },
    duration: { type: String, default: "" },
    durationMonths: { type: Number, default: null },
    highlights: { type: [String], default: [] },
  },
  { _id: false },
);

const certificationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    issuer: { type: String, default: "" },
    year: { type: String, default: "" },
  },
  { _id: false },
);

const educationSchema = new mongoose.Schema(
  {
    degree: { type: String, default: "" },
    institution: { type: String, default: "" },
    year: { type: String, default: "" },
    score: { type: String, default: "" },
  },
  { _id: false },
);

const resumeProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },

  // ── Extracted sections ──────────────────────────────────
  skills: { type: [skillSchema], default: [] },
  projects: { type: [projectSchema], default: [] },
  experience: { type: [experienceSchema], default: [] },
  certifications: { type: [certificationSchema], default: [] },
  education: { type: [educationSchema], default: [] },
  totalYearsExperience: { type: Number, default: 0 },

  // ── From the same analysis the dashboard panel shows ─────
  summary: { type: String, default: "" },
  experienceLevel: {
    type: String,
    enum: ["Junior", "Mid", "Senior"],
    default: "Mid",
  },
  skillsDetected: { type: [String], default: [] },
  strengths: { type: [String], default: [] },
  recommendedDomains: { type: mongoose.Schema.Types.Mixed, default: [] },

  // ── Upload metadata ─────────────────────────────────────
  // The file itself is never stored — only what was extracted from it.
  fileName: { type: String, default: "" },
  fileSize: { type: Number, default: 0 },
  textLength: { type: Number, default: 0 },
  uploadedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

/** True when the structured extraction produced something usable. */
resumeProfileSchema.methods.hasStructuredData = function () {
  return (
    this.skills.length > 0 ||
    this.projects.length > 0 ||
    this.experience.length > 0 ||
    this.education.length > 0
  );
};

/** Skill names for the assessment generator, preferring structured entries. */
resumeProfileSchema.methods.skillNames = function () {
  const names = this.skills.map((s) => s.name).filter(Boolean);
  return names.length ? names : this.skillsDetected.filter(Boolean);
};

module.exports = mongoose.model("ResumeProfile", resumeProfileSchema);
