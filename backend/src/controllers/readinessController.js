const Interview = require("../models/interview");
const ResumeProfile = require("../models/resumeProfile");
const SkillAssessment = require("../models/skillAssessment");
const ReadinessAssessment = require("../models/readinessAssessment");

const { sendKnownError } = require("../utils/apiError");
const {
  publicConfig,
  SKILL_ASSESSMENT_SCORING,
  TRACKS,
} = require("../config/readinessConfig");
const {
  extractResumeText,
  analyzeResumeFully,
} = require("../utils/resumeAnalysis");
const { computeReadiness, buildSkillTrends } = require("../utils/readinessEngine");
const {
  pickSkills,
  generateQuestions,
  scoreSubmission,
} = require("../utils/skillAssessmentEngine");


const INTERVIEW_LOOKBACK = 20;


const profileShape = (profile) =>
  profile
    ? {
        skills: profile.skills,
        projects: profile.projects,
        experience: profile.experience,
        certifications: profile.certifications,
        education: profile.education,
        totalYearsExperience: profile.totalYearsExperience,
        summary: profile.summary,
        experienceLevel: profile.experienceLevel,
        skillsDetected: profile.skillsDetected,
        strengths: profile.strengths,
        recommendedDomains: profile.recommendedDomains,
        fileName: profile.fileName,
        fileSize: profile.fileSize,
        uploadedAt: profile.uploadedAt,
        updatedAt: profile.updatedAt,
      }
    : null;

const assessmentShape = (doc) =>
  doc
    ? {
        id: doc._id,
        overallScore: doc.overallScore,
        components: doc.components,
        dataCompleteness: doc.dataCompleteness,
        category: doc.category,
        categoryLabel: doc.categoryLabel,
        track: doc.track,
        trackLabel: doc.trackLabel,
        trackDetected: doc.trackDetected,
        analysis: doc.analysis,
        roadmap: doc.roadmap,
        skillSnapshot: doc.skillSnapshot,
        scoreDelta: doc.scoreDelta,
        sources: doc.sources,
        weightsUsed: doc.weightsUsed,
        createdAt: doc.createdAt,
      }
    : null;


const historyShape = (doc) => ({
  id: doc._id,
  overallScore: doc.overallScore,
  category: doc.category,
  categoryLabel: doc.categoryLabel,
  track: doc.track,
  trackLabel: doc.trackLabel,
  scoreDelta: doc.scoreDelta,
  dataCompleteness: doc.dataCompleteness,
  createdAt: doc.createdAt,
  components: (doc.components || []).map((c) => ({
    key: c.key,
    label: c.label,
    score: c.score,
    hasData: c.hasData,
  })),
});

const quizShape = (doc, { review = false } = {}) => ({
  id: doc._id,
  skills: doc.skills,
  status: doc.status,
  questionCount: doc.questions.length,
  questions: review ? doc.toReviewQuestions() : doc.toClientQuestions(),
  overallScore: doc.overallScore,
  correctCount: doc.correctCount,
  answeredCount: doc.answeredCount,
  skillScores: doc.skillScores,
  createdAt: doc.createdAt,
  completedAt: doc.completedAt,
});

const quizSummaryShape = (doc) => ({
  id: doc._id,
  skills: doc.skills,
  status: doc.status,
  questionCount: doc.questions.length,
  overallScore: doc.overallScore,
  correctCount: doc.correctCount,
  skillScores: doc.skillScores,
  createdAt: doc.createdAt,
  completedAt: doc.completedAt,
});


async function loadCandidateData(userId) {
  const [profile, interviews, assessments, previous] = await Promise.all([
    ResumeProfile.findOne({ userId }),
    Interview.find({ userId, isComplete: true })
      .sort({ createdAt: -1 })
      .limit(INTERVIEW_LOOKBACK),
    SkillAssessment.find({ userId, status: "completed" })
      .sort({ createdAt: -1 })
      .limit(SKILL_ASSESSMENT_SCORING.maxAssessments),
    ReadinessAssessment.findOne({ userId }).sort({ createdAt: -1 }),
  ]);

  return { profile, interviews, assessments, previous };
}

const availabilityShape = ({ profile, interviews, assessments }) => ({
  hasResume: Boolean(profile),
  resumeUpdatedAt: profile?.updatedAt || null,
  interviewCount: interviews.length,
  assessmentCount: assessments.length,
  canGenerate:
    Boolean(profile) || interviews.length > 0 || assessments.length > 0,
});


const getConfig = async (req, res) => {
  try {
    res.json({ config: publicConfig() });
  } catch (error) {
    console.error("Failed to load readiness config:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


const uploadResume = async (req, res) => {
  try {
    const resumeText = await extractResumeText(req.file);
    const { core, structured } = await analyzeResumeFully(resumeText);

    const profile = await ResumeProfile.findOneAndUpdate(
      { userId: req.userId },
      {
        userId: req.userId,
        ...structured,
        summary: core.summary,
        experienceLevel: core.experienceLevel,
        skillsDetected: core.skillsDetected,
        strengths: core.strengths,
        recommendedDomains: core.recommendedDomains,
        fileName: req.file.originalname || "",
        fileSize: req.file.size || 0,
        textLength: resumeText.length,
        uploadedAt: new Date(),
        updatedAt: new Date(),
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );

    res.json({
      profile: profileShape(profile),

      partial: !profile.hasStructuredData(),
    });
  } catch (error) {
    if (error.status) {
      return sendKnownError(res, error);
    }
    console.error("Failed to analyze resume for readiness:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


const getLatest = async (req, res) => {
  try {
    const userId = req.userId;
    const [profile, latest, previousTwo, interviewCount, assessmentCount] =
      await Promise.all([
        ResumeProfile.findOne({ userId }),
        ReadinessAssessment.findOne({ userId }).sort({ createdAt: -1 }),
        ReadinessAssessment.find({ userId })
          .sort({ createdAt: -1 })
          .limit(2)
          .select("skillSnapshot overallScore createdAt"),
        Interview.countDocuments({ userId, isComplete: true }),
        SkillAssessment.countDocuments({ userId, status: "completed" }),
      ]);

    const previous = previousTwo.length > 1 ? previousTwo[1] : null;

    res.json({
      assessment: assessmentShape(latest),
      profile: profileShape(profile),
      skillTrends: latest
        ? buildSkillTrends(latest.skillSnapshot, previous?.skillSnapshot)
        : [],
      availability: {
        hasResume: Boolean(profile),
        resumeUpdatedAt: profile?.updatedAt || null,
        interviewCount,
        assessmentCount,
        canGenerate: Boolean(profile) || interviewCount > 0 || assessmentCount > 0,
      },
    });
  } catch (error) {
    console.error("Failed to load readiness assessment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


const generateAssessment = async (req, res) => {
  try {
    const userId = req.userId;

    // An unrecognised track would otherwise be dropped silently and the report
    // auto-detected instead, leaving the caller to think their choice applied.
    const requestedTrack = req.body?.track;
    if (
      requestedTrack !== undefined &&
      requestedTrack !== null &&
      requestedTrack !== "" &&
      !TRACKS[requestedTrack]
    ) {
      return res.status(400).json({
        error: `Unknown track. Expected one of: ${Object.keys(TRACKS).join(", ")}.`,
      });
    }

    const data = await loadCandidateData(userId);
    const availability = availabilityShape(data);

    if (!availability.canGenerate) {
      return res.status(400).json({
        error:
          "Not enough data yet. Upload your resume or complete a mock interview first.",
        availability,
      });
    }

    const computed = await computeReadiness({
      profile: data.profile,
      interviews: data.interviews,
      assessments: data.assessments,
      previous: data.previous,
      trackOverride:
        typeof requestedTrack === "string" && requestedTrack
          ? requestedTrack
          : null,
    });

    const saved = await ReadinessAssessment.create({ userId, ...computed });

    res.status(201).json({
      assessment: assessmentShape(saved),
      skillTrends: buildSkillTrends(
        saved.skillSnapshot,
        data.previous?.skillSnapshot,
      ),
      availability,
    });
  } catch (error) {
    if (error.status) {
      return sendKnownError(res, error);
    }
    console.error("Failed to generate readiness assessment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


const getHistory = async (req, res) => {
  try {
    const docs = await ReadinessAssessment.find({ userId: req.userId })
      .sort({ createdAt: 1 })
      .select(
        "overallScore components dataCompleteness category categoryLabel track trackLabel scoreDelta createdAt",
      );

    res.json({ history: docs.map(historyShape) });
  } catch (error) {
    console.error("Failed to load readiness history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


const getSkillAssessments = async (req, res) => {
  try {
    const userId = req.userId;
    const [inProgress, completed, profile] = await Promise.all([
      SkillAssessment.findOne({ userId, status: "in-progress" }).sort({
        createdAt: -1,
      }),
      SkillAssessment.find({ userId, status: "completed" })
        .sort({ createdAt: -1 })
        .limit(SKILL_ASSESSMENT_SCORING.maxAssessments),
      ResumeProfile.findOne({ userId }).select("skills skillsDetected"),
    ]);

    res.json({
      inProgress: inProgress ? quizShape(inProgress) : null,
      latest: completed.length ? quizShape(completed[0], { review: true }) : null,
      history: completed.map(quizSummaryShape),

      availableSkills: profile
        ? profile.skillNames()
        : SKILL_ASSESSMENT_SCORING.fallbackSkills,
      usingFallbackSkills: !profile || profile.skillNames().length === 0,
    });
  } catch (error) {
    console.error("Failed to load skill assessments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


const startSkillAssessment = async (req, res) => {
  try {
    const userId = req.userId;

    const existing = await SkillAssessment.findOne({
      userId,
      status: "in-progress",
    }).sort({ createdAt: -1 });
    if (existing) {
      return res.json({ assessment: quizShape(existing), resumed: true });
    }

    const [profile, previousAssessments] = await Promise.all([
      ResumeProfile.findOne({ userId }),
      SkillAssessment.find({ userId, status: "completed" })
        .sort({ createdAt: -1 })
        .limit(SKILL_ASSESSMENT_SCORING.maxAssessments),
    ]);

    const skills = pickSkills({
      profile,
      previousAssessments,
      requested: Array.isArray(req.body?.skills) ? req.body.skills : [],
    });

    if (!skills.length) {
      return res.status(400).json({
        error: "No skills available to assess. Upload your resume first.",
      });
    }

    const questions = await generateQuestions({
      skills,
      experienceLevel: profile?.experienceLevel || "Mid",
    });

    const assessment = await SkillAssessment.create({
      userId,
      skills,
      questions,
      status: "in-progress",
    });

    res.status(201).json({ assessment: quizShape(assessment), resumed: false });
  } catch (error) {
    if (error.status) {
      return sendKnownError(res, error);
    }
    console.error("Failed to start skill assessment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


const submitSkillAssessment = async (req, res) => {
  try {
    const { assessmentId, answers } = req.body || {};

    if (!assessmentId) {
      return res.status(400).json({ error: "assessmentId is required" });
    }

    // Scoped to the caller: an id alone must never grant access.
    const assessment = await SkillAssessment.findOne({
      _id: assessmentId,
      userId: req.userId,
    });

    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }
    if (assessment.status === "completed") {
      return res.status(409).json({
        error: "This assessment has already been submitted.",
        assessment: quizShape(assessment, { review: true }),
      });
    }

    const { graded, correctCount, answeredCount, overallScore, skillScores } =
      scoreSubmission(assessment.questions, answers);

    assessment.questions = graded;
    assessment.correctCount = correctCount;
    assessment.answeredCount = answeredCount;
    assessment.overallScore = overallScore;
    assessment.skillScores = skillScores;
    assessment.status = "completed";
    assessment.completedAt = new Date();
    await assessment.save();

    res.json({ assessment: quizShape(assessment, { review: true }) });
  } catch (error) {
  
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid assessment id" });
    }
    console.error("Failed to submit skill assessment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getConfig,
  uploadResume,
  getLatest,
  generateAssessment,
  getHistory,
  getSkillAssessments,
  startSkillAssessment,
  submitSkillAssessment,
};
