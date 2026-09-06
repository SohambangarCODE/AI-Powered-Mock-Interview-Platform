const Interview = require("../models/interview");
const { listProfiles, findProfile } = require("../models/companyProfile");
const {
  SIMULATION_DISCLAIMER,
  publicProfile,
  publicProfiles,
} = require("../config/companyProfiles");

// ── All company profiles ──────────────────────────────────
const getCompanies = async (req, res) => {
  try {
    const profiles = await listProfiles();
    res.json({
      companies: publicProfiles(profiles),
      disclaimer: SIMULATION_DISCLAIMER,
    });
  } catch (error) {
    console.error("getCompanies error:", error);
    res
      .status(500)
      .json({ message: "Failed to load company profiles", error: error.message });
  }
};

// ── The user's completed company sessions ─────────────────
// Declared before "/:slug" in the router — otherwise Express matches "sessions"
// as a slug, the same hazard "/active" has in interviewRoutes.js.
const getCompanySessions = async (req, res) => {
  try {
    const interviews = await Interview.find({
      userId: req.userId,
      isComplete: true,
      "company.slug": { $exists: true },
    })
      .select("domain score duration createdAt questionsAnswered skippedCount company report")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const sessions = interviews.map((i) => ({
      id: i._id,
      companySlug: i.company?.slug || "",
      companyName: i.company?.name || "",
      roleLabel: i.company?.roleLabel || "",
      roundLabel: i.company?.roundLabel || "",
      domain: i.domain,
      score: i.score,
      duration: i.duration,
      date: i.createdAt,
      questionsAnswered: i.questionsAnswered,
      skippedCount: i.skippedCount,
      // null on the rare session whose report predates the company section.
      meetsStandard: i.report?.company?.meetsStandard ?? null,
      expectedScore: i.report?.company?.expectedStandard?.minOverallScore ?? null,
    }));

    res.json({ sessions });
  } catch (error) {
    console.error("getCompanySessions error:", error);
    res
      .status(500)
      .json({ message: "Failed to load company sessions", error: error.message });
  }
};

// ── One company profile ───────────────────────────────────
const getCompany = async (req, res) => {
  try {
    const profile = await findProfile(req.params.slug);
    if (!profile)
      return res.status(404).json({ message: "Company profile not found" });

    res.json({
      company: publicProfile(profile),
      disclaimer: SIMULATION_DISCLAIMER,
    });
  } catch (error) {
    console.error("getCompany error:", error);
    res
      .status(500)
      .json({ message: "Failed to load company profile", error: error.message });
  }
};

module.exports = { getCompanies, getCompanySessions, getCompany };
