const Groq = require("groq-sdk");
const { PDFParse } = require("pdf-parse");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

if (!process.env.GROQ_API_KEY) {
  console.error("GROQ_API_KEY is not configured");
}

const DOMAINS = [
  "JavaScript/Node.js",
  "React",
  "Python",
  "Data Science",
  "DevOps",
  "System Design",
  "Database Design",
  "General",
];

const EXPERIENCE_LEVELS = ["Junior", "Mid", "Senior"];

/**
 * Extract text from a PDF buffer using pdf-parse v2's class-based API.
 * (v1's `pdf(buffer)` function call no longer exists in v2 — using it
 * silently returns undefined text instead of throwing.)
 */
async function extractTextFromPDF(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result?.text || "";
  } finally {
    // Always release the parser's resources, even if getText() throws.
    await parser.destroy();
  }
}

/**
 * Basic shape-check + normalization of the AI's JSON so a malformed or
 * partially-hallucinated response can't crash the frontend.
 */
function sanitizeAnalysis(analysis) {
  if (!analysis || typeof analysis !== "object") return null;

  const summary =
    typeof analysis.summary === "string" && analysis.summary.trim()
      ? analysis.summary.trim()
      : "No summary available.";

  const experienceLevel = EXPERIENCE_LEVELS.includes(analysis.experienceLevel)
    ? analysis.experienceLevel
    : "Mid";

  const skillsDetected = Array.isArray(analysis.skillsDetected)
    ? analysis.skillsDetected.filter((s) => typeof s === "string").slice(0, 12)
    : [];

  const strengths = Array.isArray(analysis.strengths)
    ? analysis.strengths.filter((s) => typeof s === "string").slice(0, 3)
    : [];

  const recommendedDomains = Array.isArray(analysis.recommendedDomains)
    ? analysis.recommendedDomains
        .filter(
          (d) =>
            d &&
            typeof d.label === "string" &&
            DOMAINS.includes(d.label) &&
            typeof d.reason === "string"
        )
        .map((d) => ({
          label: d.label,
          reason: d.reason,
          confidence:
            typeof d.confidence === "number"
              ? Math.max(0, Math.min(100, Math.round(d.confidence)))
              : 50,
        }))
        .slice(0, 3)
    : [];

  return { summary, experienceLevel, skillsDetected, strengths, recommendedDomains };
}

const analyzeResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    let resumeText;
    try {
      if (req.file.mimetype === "application/pdf") {
        resumeText = await extractTextFromPDF(req.file.buffer);
      } else {
        resumeText = req.file.buffer.toString("utf-8");
      }
    } catch (pdfError) {
      console.error("PDF extraction error:", pdfError);
      return res.status(400).json({ error: "Failed to extract text from PDF" });
    }

    if (!resumeText || resumeText.trim().length < 50) {
      return res
        .status(400)
        .json({ error: "Failed to extract text from resume" });
    }

    const truncated = resumeText.slice(0, 6000);
    const prompt = `
You are an expert technical recruiter and career coach.
Analyze the following resume and respond ONLY with a valid JSON object. No text outside JSON.

Available interview domains: ${DOMAINS.join(", ")}

Resume text:
"""
${truncated}
"""

Respond with this exact JSON structure:
{
  "summary": "2-3 sentence professional summary of the candidate",
  "experienceLevel": "Junior" | "Mid" | "Senior",
  "skillsDetected": ["skill1", "skill2", "skill3", ...],
  "strengths": ["strength1", "strength2", "strength3"],
  "recommendedDomains": [
    {
      "label": "exact domain name from the available list",
      "reason": "one sentence why this domain fits them",
      "confidence": 85
    }
  ]
}

Rules:
- experienceLevel must be exactly "Junior", "Mid", or "Senior"
- skillsDetected: list up to 12 actual skills found in the resume
- strengths: list 3 specific professional strengths
- recommendedDomains: recommend 3 domains ordered by best fit, confidence is 0-100
- domain label must exactly match one from the available domains list
- confidence scores should be realistic and different for each domain
`;

    let aiResponse;
    try {
      aiResponse = await groq.chat.completions.create({
        model: "groq/compound-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });
    } catch (groqError) {
      console.error("Groq API error:", groqError);
      const errorMessage = groqError.response?.status
        ? `AI service error: ${groqError.message || "Groq API failed"}`
        : "AI service is unavailable. Please try again later.";
      return res.status(500).json({ error: errorMessage });
    }

    const raw = aiResponse.choices?.[0]?.message?.content || "{}";

    let parsed;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      parsed = null;
    }

    const analysis = sanitizeAnalysis(parsed);

    if (!analysis) {
      console.error("Unparseable or empty AI response:", raw);
      return res.status(500).json({ error: "Failed to parse analysis result" });
    }

    if (analysis.recommendedDomains.length === 0) {
      console.warn("AI returned no valid domain recommendations:", raw);
    }

    res.json({ analysis });
  } catch (error) {
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