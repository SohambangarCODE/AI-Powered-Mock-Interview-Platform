const ResumeProfile = require("../models/resumeProfile");
const {
  extractResumeText,
  analyzeResumeFully,
} = require("../utils/resumeAnalysis");
const { sendKnownError } = require("../utils/apiError");

if (!process.env.GROQ_API_KEY) {
  console.error("GROQ_API_KEY is not configured");
}

/**
 * Persist the extraction so the readiness engine can score it later.
 * Best-effort: a storage failure must not fail an analysis the candidate can
 * already see on screen.
 */
async function saveProfile({ userId, file, resumeText, core, structured }) {
  try {
    await ResumeProfile.findOneAndUpdate(
      { userId },
      {
        userId,
        ...structured,
        summary: core.summary,
        experienceLevel: core.experienceLevel,
        skillsDetected: core.skillsDetected,
        strengths: core.strengths,
        recommendedDomains: core.recommendedDomains,
        fileName: file.originalname || "",
        fileSize: file.size || 0,
        textLength: resumeText.length,
        uploadedAt: new Date(),
        updatedAt: new Date(),
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
  } catch (dbError) {
    console.error("Failed to persist resume profile:", dbError.message);
  }
}

const analyzeResume = async (req, res) => {
  try {
    const resumeText = await extractResumeText(req.file);
    const { core, structured } = await analyzeResumeFully(resumeText);

    await saveProfile({
      userId: req.userId,
      file: req.file,
      resumeText,
      core,
      structured,
    });

    // Response shape is unchanged — the dashboard's resume panel reads it.
    res.json({ analysis: core });
  } catch (error) {
    if (error.status) {
      return sendKnownError(res, error);
    }
    console.error("Unexpected error analyzing resume:", error);
    if (error instanceof SyntaxError) {
      return res.status(500).json({ error: "Failed to parse analysis result" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  analyzeResume,
};
