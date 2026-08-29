/**
 * Resume text extraction + AI analysis, shared by two callers:
 *
 *  - POST /api/resume/analyze  — the dashboard's domain-recommendation panel.
 *    Returns exactly the fields it has always returned.
 *  - POST /api/readiness/resume — the readiness engine, which additionally
 *    needs structured skills / projects / experience / certifications /
 *    education.
 *
 * Both go through one AI call. The two field sets are split apart afterwards by
 * separate sanitisers, so the dashboard's contract is enforced by code rather
 * than by the prompt: whatever the model returns, it gets exactly the five
 * fields it has always got, and the extra structured fields degrade to empty
 * without failing the upload.
 */

const { PDFParse } = require("pdf-parse");
const { askForJSONStrict } = require("./aiClient");
const { INTERVIEW_DOMAINS } = require("../config/readinessConfig");

const DOMAINS = INTERVIEW_DOMAINS;
const EXPERIENCE_LEVELS = ["Junior", "Mid", "Senior"];
const EXPERIENCE_TYPES = ["job", "internship", "freelance", "other"];

/** How much resume text is sent to the model. Keeps token cost predictable. */
const TEXT_LIMIT = 6000;
const MIN_USABLE_LENGTH = 50;

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
 * Turn an uploaded multer file into plain text.
 * Throws an Error whose `.status` is 400 for anything the candidate can fix.
 */
async function extractResumeText(file) {
  if (!file) {
    const err = new Error("No file uploaded");
    err.status = 400;
    throw err;
  }

  let text;
  if (file.mimetype === "application/pdf") {
    try {
      text = await extractTextFromPDF(file.buffer);
    } catch (pdfError) {
      console.error("PDF extraction error:", pdfError);
      const err = new Error("Failed to extract text from PDF");
      err.status = 400;
      throw err;
    }
  } else {
    text = file.buffer.toString("utf-8");
  }

  if (!text || text.trim().length < MIN_USABLE_LENGTH) {
    const err = new Error("Failed to extract text from resume");
    err.status = 400;
    throw err;
  }

  return text;
}

// ── Small sanitisers ───────────────────────────────────────
const str = (value, max = 400) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : "";

const strList = (value, limit, max = 200) =>
  Array.isArray(value)
    ? value
        .map((item) => str(item, max))
        .filter(Boolean)
        .slice(0, limit)
    : [];

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const int = (value, fallback = null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
};

// ── Core analysis (the dashboard's existing contract) ──────

const corePrompt = (resumeText) => `
You are an expert technical recruiter and career coach.
Analyze the following resume and respond ONLY with a valid JSON object. No text outside JSON.

Available interview domains: ${DOMAINS.join(", ")}

Resume text:
"""
${resumeText}
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

/**
 * Basic shape-check + normalization of the AI's JSON so a malformed or
 * partially-hallucinated response can't crash the frontend.
 */
function sanitizeCoreAnalysis(analysis) {
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
            typeof d.reason === "string",
        )
        .map((d) => ({
          label: d.label,
          reason: d.reason,
          confidence:
            typeof d.confidence === "number"
              ? clamp(Math.round(d.confidence), 0, 100)
              : 50,
        }))
        .slice(0, 3)
    : [];

  return {
    summary,
    experienceLevel,
    skillsDetected,
    strengths,
    recommendedDomains,
  };
}

// ── Structured extraction (readiness engine) ───────────────

function sanitizeStructured(parsed) {
  const raw = parsed && typeof parsed === "object" ? parsed : {};

  const rawYears = Number(raw.totalYearsExperience);
  const totalYearsExperience = Number.isFinite(rawYears)
    ? clamp(Math.round(rawYears * 10) / 10, 0, 50)
    : 0;

  const skills = Array.isArray(raw.skills)
    ? raw.skills
        .map((s) =>
          typeof s === "string"
            ? { name: str(s, 80), category: "Other", evidence: "" }
            : {
                name: str(s?.name, 80),
                category: str(s?.category, 40) || "Other",
                evidence: str(s?.evidence, 200),
              },
        )
        .filter((s) => s.name)
        // The model occasionally repeats a skill under two categories.
        .filter(
          (s, i, arr) =>
            arr.findIndex(
              (other) => other.name.toLowerCase() === s.name.toLowerCase(),
            ) === i,
        )
        .slice(0, 20)
    : [];

  const projects = Array.isArray(raw.projects)
    ? raw.projects
        .map((p) => ({
          name: str(p?.name, 120),
          description: str(p?.description, 400),
          technologies: strList(p?.technologies, 10, 60),
        }))
        .filter((p) => p.name)
        .slice(0, 8)
    : [];

  const experience = Array.isArray(raw.experience)
    ? raw.experience
        .map((e) => ({
          role: str(e?.role, 120),
          organization: str(e?.organization, 120),
          type: EXPERIENCE_TYPES.includes(e?.type) ? e.type : "other",
          duration: str(e?.duration, 80),
          durationMonths: (() => {
            const months = int(e?.durationMonths, null);
            return months === null ? null : clamp(months, 0, 600);
          })(),
          highlights: strList(e?.highlights, 4, 300),
        }))
        .filter((e) => e.role || e.organization)
        .slice(0, 8)
    : [];

  const certifications = Array.isArray(raw.certifications)
    ? raw.certifications
        .map((c) =>
          typeof c === "string"
            ? { name: str(c, 160), issuer: "", year: "" }
            : {
                name: str(c?.name, 160),
                issuer: str(c?.issuer, 120),
                year: str(c?.year, 20),
              },
        )
        .filter((c) => c.name)
        .slice(0, 10)
    : [];

  const education = Array.isArray(raw.education)
    ? raw.education
        .map((ed) => ({
          degree: str(ed?.degree, 160),
          institution: str(ed?.institution, 160),
          year: str(ed?.year, 20),
          score: str(ed?.score, 40),
        }))
        .filter((ed) => ed.degree || ed.institution)
        .slice(0, 6)
    : [];

  return {
    totalYearsExperience,
    skills,
    projects,
    experience,
    certifications,
    education,
  };
}

/** An extraction with nothing in it — used when the structured call fails. */
const emptyStructured = () => ({
  totalYearsExperience: 0,
  skills: [],
  projects: [],
  experience: [],
  certifications: [],
  education: [],
});

// ── Public API ─────────────────────────────────────────────

/**
 * Turn an AI-layer failure into something the API can return honestly.
 *
 * aiClient already classifies the cause and attaches a real status (429 when
 * rate-limited, 503 when unreachable) plus a retry hint. Passing that through
 * matters: the old blanket 500 "AI service is unavailable" told a user whose
 * account had simply hit its daily quota nothing they could act on.
 */
function aiFailure(error, fallbackMessage) {
  if (error?.status) return error;

  console.error("Groq API error:", error);
  const err = new Error(fallbackMessage);
  err.status = 503;
  err.aiFailure = "unavailable";
  return err;
}

/**
 * Run the core analysis on its own, with the smaller original prompt.
 *
 * This is the recovery path for `analyzeResumeFully`: it asks for five fields
 * instead of eleven, so a reply the token limit truncated stands a real chance
 * of fitting on the retry.
 */
async function analyzeResumeCore(resumeText) {
  let result;
  try {
    result = await askForJSONStrict({
      user: corePrompt(resumeText.slice(0, TEXT_LIMIT)),
      temperature: 0.7,
      maxTokens: 1200,
    });
  } catch (groqError) {
    throw aiFailure(
      groqError,
      "The AI service is temporarily unavailable. Please try again in a moment.",
    );
  }

  const analysis = sanitizeCoreAnalysis(result.parsed);
  if (!analysis) {
    console.error("Unparseable or empty AI response:", result.raw);
    const err = new Error("Failed to parse analysis result");
    err.status = 502;
    throw err;
  }

  if (analysis.recommendedDomains.length === 0) {
    console.warn("AI returned no valid domain recommendations:", result.raw);
  }

  return analysis;
}

/**
 * Both field sets in a single request.
 *
 * This used to be two parallel calls, which meant sending the same resume text
 * twice and paying two lots of prompt overhead for one upload — the single
 * biggest source of token burn in the feature. The response is split back
 * through the existing sanitisers, so each caller's contract is enforced by the
 * same code as before rather than by the prompt.
 */
const combinedPrompt = (resumeText) => `
You are an expert technical recruiter and resume parser.
Analyze the resume below and respond ONLY with a valid JSON object. No text outside JSON.

Available interview domains: ${DOMAINS.join(", ")}

Resume text:
"""
${resumeText}
"""

Respond with this exact JSON structure:
{
  "summary": "2-3 sentence professional summary of the candidate",
  "experienceLevel": "Junior" | "Mid" | "Senior",
  "skillsDetected": ["skill1", "skill2", "skill3"],
  "strengths": ["strength1", "strength2", "strength3"],
  "recommendedDomains": [
    { "label": "exact domain name from the available list", "reason": "one sentence why it fits", "confidence": 85 }
  ],
  "totalYearsExperience": 0,
  "skills": [
    { "name": "skill name", "category": "Language|Frontend|Backend|Database|DevOps|Data|Testing|Tooling|Other", "evidence": "where it appears in the resume" }
  ],
  "projects": [
    { "name": "project name", "description": "one sentence", "technologies": ["tech1", "tech2"] }
  ],
  "experience": [
    { "role": "job title", "organization": "company name", "type": "job|internship|freelance|other", "duration": "as written in the resume", "durationMonths": 6, "highlights": ["one sentence achievement"] }
  ],
  "certifications": [
    { "name": "certification name", "issuer": "issuing body", "year": "2024" }
  ],
  "education": [
    { "degree": "degree name", "institution": "school name", "year": "2025", "score": "CGPA or percentage as written" }
  ]
}

Rules:
- Extract ONLY what is actually present. Never invent projects, jobs, certifications or degrees.
- Return an empty array for any section the resume does not contain.
- experienceLevel must be exactly "Junior", "Mid", or "Senior".
- skillsDetected: up to 12 skills actually found in the resume.
- strengths: 3 specific professional strengths.
- recommendedDomains: 3 domains ordered by best fit, confidence 0-100 and different for each; label must match the available list exactly.
- totalYearsExperience: total professional experience in years, excluding internships. Use 0 for a fresher. Decimals allowed.
- durationMonths: best numeric estimate of that role's length in months, or null if unknown.
- type must be exactly one of: job, internship, freelance, other.
- skills: up to 20 entries, deduplicated, using the name as written in the resume.
`;

/**
 * One call, both field sets. The core fields decide whether the request
 * succeeds; the structured fields are best-effort and degrade to empty.
 */
async function analyzeResumeFully(resumeText) {
  let result;
  try {
    result = await askForJSONStrict({
      user: combinedPrompt(resumeText.slice(0, TEXT_LIMIT)),
      temperature: 0.4,
      maxTokens: 2600,
    });
  } catch (groqError) {
    throw aiFailure(
      groqError,
      "The AI service is temporarily unavailable. Please try again in a moment.",
    );
  }

  const core = sanitizeCoreAnalysis(result.parsed);
  if (!core) {
    // The bigger reply came back unusable — usually truncated. Fall back to the
    // five-field prompt rather than failing an upload the smaller ask can serve.
    console.warn(
      "Combined resume analysis was unusable; retrying with the core prompt only",
    );
    return { core: await analyzeResumeCore(resumeText), structured: emptyStructured() };
  }

  // Never fatal: a reply that carried the summary but lost the skill list still
  // produces a usable profile, flagged as partial by the model's hasStructuredData().
  return { core, structured: sanitizeStructured(result.parsed) };
}

module.exports = {
  DOMAINS,
  EXPERIENCE_LEVELS,
  EXPERIENCE_TYPES,
  extractResumeText,
  extractTextFromPDF,
  analyzeResumeCore,
  analyzeResumeFully,
  sanitizeCoreAnalysis,
  sanitizeStructured,
};
