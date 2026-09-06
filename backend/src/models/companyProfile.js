const mongoose = require("mongoose");

const { DIFFICULTIES } = require("./interview");
const {
  COMPANY_PROFILES,
  DIFFICULTY_BIASES,
  getProfile,
} = require("../config/companyProfiles");

const criterionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    weight: { type: Number, default: 0 },
    description: { type: String, default: "" },
  },
  { _id: false },
);

const roleSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    // Always one of readinessConfig.INTERVIEW_DOMAINS — this is what lands in
    // interview.domain, so the rest of the app keeps working unchanged.
    domain: { type: String, required: true },
    emphasis: { type: [String], default: [] },
  },
  { _id: false },
);

const roundSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    order: { type: Number, default: 1 },
    difficultyBias: {
      type: String,
      enum: DIFFICULTY_BIASES,
      default: "maintain",
    },
    focus: { type: [String], default: [] },
    description: { type: String, default: "" },
  },
  { _id: false },
);

const companyProfileSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    tier: { type: String, default: "other" },
    blurb: { type: String, default: "" },
    baseDifficulty: {
      type: String,
      enum: DIFFICULTIES,
      default: "medium",
    },
    interviewStyle: { type: String, default: "" },
    focusAreas: { type: [String], default: [] },
    questionTypes: { type: [String], default: [] },
    evaluationCriteria: { type: [criterionSchema], default: [] },
    expectedStandard: { type: mongoose.Schema.Types.Mixed, default: {} },
    roles: { type: [roleSchema], default: [] },
    rounds: { type: [roundSchema], default: [] },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "companyprofiles" },
);

const CompanyProfile = mongoose.model("CompanyProfile", companyProfileSchema);

/**
 * Upsert every profile from config/companyProfiles.js.
 *
 * Called once after connectDB(). The config stays canonical, so re-seeding is
 * idempotent and a profile edited in the database is overwritten on next boot —
 * that is deliberate: the repo is the record, the collection is the read path.
 */
async function seedCompanyProfiles() {
  const results = await Promise.all(
    COMPANY_PROFILES.map((profile) =>
      CompanyProfile.updateOne(
        { slug: profile.slug },
        { $set: { ...profile, updatedAt: new Date() } },
        { upsert: true },
      ),
    ),
  );

  return {
    total: COMPANY_PROFILES.length,
    upserted: results.filter((r) => r.upsertedCount > 0).length,
  };
}

/**
 * All profiles, preferring the database. The config is the fallback so a fresh
 * or unseeded database still serves a working simulator.
 */
async function listProfiles() {
  try {
    const docs = await CompanyProfile.find().lean();
    if (docs.length) return docs;
  } catch (error) {
    console.error("listProfiles: falling back to config —", error.message);
  }
  return COMPANY_PROFILES;
}

/** One profile, preferring the database, falling back to the config. */
async function findProfile(slug) {
  if (typeof slug !== "string" || !slug.trim()) return null;
  const wanted = slug.trim().toLowerCase();

  try {
    const doc = await CompanyProfile.findOne({ slug: wanted }).lean();
    if (doc) return doc;
  } catch (error) {
    console.error("findProfile: falling back to config —", error.message);
  }
  return getProfile(wanted);
}

module.exports = CompanyProfile;
module.exports.seedCompanyProfiles = seedCompanyProfiles;
module.exports.listProfiles = listProfiles;
module.exports.findProfile = findProfile;
