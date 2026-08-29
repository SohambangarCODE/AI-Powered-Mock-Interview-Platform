/**
 * Single source of truth for how the Placement Readiness Score is computed.
 *
 * Every weight, target and threshold lives here (or in an environment variable)
 * so the scoring rules can be tuned without touching engine code — and are
 * never duplicated in the frontend. The frontend reads them from
 * GET /api/readiness/config purely to *explain* the score it was given.
 */

const num = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// ── Overall component weights ──────────────────────────────
// Any component with no data is dropped and the remaining weights are
// renormalised, so a candidate who has only ever done interviews still gets a
// meaningful score (flagged with a lower dataCompleteness).
const COMPONENT_WEIGHTS = {
  resume: num(process.env.READINESS_WEIGHT_RESUME, 25),
  interview: num(process.env.READINESS_WEIGHT_INTERVIEW, 35),
  skillAssessment: num(process.env.READINESS_WEIGHT_SKILL_ASSESSMENT, 25),
  communication: num(process.env.READINESS_WEIGHT_COMMUNICATION, 15),
};

const COMPONENT_LABELS = {
  resume: "Resume Strength",
  interview: "Interview Performance",
  skillAssessment: "Skill Assessment",
  communication: "Communication",
};

// ── Resume sub-scoring ─────────────────────────────────────
// Each section contributes `weight` points, earned pro-rata up to `target`
// items. Totals across sections add up to 100.
const RESUME_SCORING = {
  skills: { weight: 30, target: 10, label: "Skills listed" },
  projects: { weight: 25, target: 3, label: "Projects" },
  experience: { weight: 20, target: 2, label: "Experience entries" },
  certifications: { weight: 15, target: 2, label: "Certifications" },
  education: { weight: 10, target: 1, label: "Education" },
};

// ── Interview sub-scoring ──────────────────────────────────
const INTERVIEW_SCORING = {
  // Newest session counts fully; each older one is worth `recencyDecay` times
  // the one after it. Keeps the score responsive to recent practice without
  // throwing away history.
  recencyDecay: num(process.env.READINESS_INTERVIEW_DECAY, 0.75),
  // Sessions beyond this point stop influencing the average at all.
  maxSessions: num(process.env.READINESS_INTERVIEW_MAX_SESSIONS, 8),
  // Practising across several domains is worth a small bonus — a candidate who
  // only ever drills one topic is not broadly interview-ready.
  domainCoverageTarget: 3,
  coverageBonus: 8,
};

// ── Skill assessment sub-scoring ───────────────────────────
const SKILL_ASSESSMENT_SCORING = {
  recencyDecay: num(process.env.READINESS_ASSESSMENT_DECAY, 0.7),
  maxAssessments: 6,
  // How many MCQs one assessment contains, and how many skills it spans.
  questionsPerAssessment: num(process.env.READINESS_ASSESSMENT_QUESTIONS, 8),
  maxSkillsPerAssessment: 4,
  // Skills used when the candidate has no resume on file yet.
  fallbackSkills: ["JavaScript", "Data Structures", "SQL", "Git"],
};

// ── Communication sub-scoring ──────────────────────────────
// Derived from how the candidate actually answered in past interviews — answer
// length, consistency and completion — never from a self-report.
const COMMUNICATION_SCORING = {
  answerDepth: { weight: 40, targetWords: 60, label: "Answer depth" },
  consistency: { weight: 25, label: "Consistency across answers" },
  completion: { weight: 20, label: "Questions attempted" },
  elaboration: { weight: 15, minWords: 25, label: "Elaboration rate" },
};

// ── Candidate categories ───────────────────────────────────
const CATEGORIES = {
  placementReady: {
    label: "Placement Ready",
    minOverall: num(process.env.READINESS_READY_THRESHOLD, 75),
    // A high score built on a single signal is not evidence of readiness.
    minComponents: num(process.env.READINESS_READY_MIN_COMPONENTS, 3),
  },
  highPotential: {
    label: "High Potential Candidate",
    minOverall: num(process.env.READINESS_POTENTIAL_THRESHOLD, 55),
    // Either one component is already strong, or the trend is climbing fast.
    minTopComponent: num(process.env.READINESS_POTENTIAL_TOP_COMPONENT, 72),
    minTrendDelta: num(process.env.READINESS_POTENTIAL_TREND_DELTA, 6),
  },
  needsImprovement: {
    label: "Needs Improvement",
  },
};

// ── Candidate tracks ───────────────────────────────────────
// Detected from the resume, overridable by the candidate before generating.
const TRACKS = {
  fresher: {
    id: "fresher",
    label: "Fresher",
    description: "Final-year student or graduate targeting a first full-time role",
  },
  internship: {
    id: "internship",
    label: "Internship Seeker",
    description: "Looking for an internship or trainee position",
  },
  experienced: {
    id: "experienced",
    label: "Experienced Candidate",
    description: "Already has professional engineering experience",
  },
};

const TRACK_DETECTION = {
  // Years of professional (non-internship) experience needed to be treated as
  // an experienced candidate rather than a fresher.
  experiencedMinYears: num(process.env.READINESS_EXPERIENCED_MIN_YEARS, 1.5),
};

// ── Industry skill catalogue ───────────────────────────────
// The "missing industry skills" analysis is grounded in this list so the model
// recommends things employers actually ask for instead of inventing them.
const INDUSTRY_SKILL_CATALOG = {
  core: [
    "Data Structures & Algorithms",
    "Git & version control",
    "REST API design",
    "SQL",
    "Unit testing",
    "Debugging & profiling",
    "Linux & shell basics",
  ],
  fresher: [
    "Object-oriented design",
    "One backend framework (Express / Django / Spring)",
    "One frontend framework (React / Angular / Vue)",
    "Database modelling",
    "Problem-solving on competitive platforms",
  ],
  internship: [
    "Version control workflows (branches, PRs)",
    "Basic CI pipelines",
    "Writing clear documentation",
    "Reading an existing codebase",
  ],
  experienced: [
    "System design & scalability",
    "Cloud platforms (AWS / GCP / Azure)",
    "Docker & container orchestration",
    "CI/CD pipelines",
    "Observability & monitoring",
    "Caching strategies",
    "Message queues & event-driven design",
    "Security fundamentals (OWASP)",
  ],
};

// ── Interview domains the roadmap may point at ─────────────
// Mirrors the domains the interview engine already supports, so a recommended
// interview topic can deep-link straight into a practice session.
const INTERVIEW_DOMAINS = [
  "JavaScript/Node.js",
  "React",
  "Python",
  "Data Science",
  "DevOps",
  "System Design",
  "Database Design",
  "General",
];

// ── Roadmap shape ──────────────────────────────────────────
const ROADMAP_LIMITS = {
  technologies: 5,
  projects: 3,
  certifications: 3,
  interviewTopics: 5,
  milestones: 4,
};

const ANALYSIS_LIMITS = {
  technicalStrengths: 6,
  weakTechnicalAreas: 5,
  communicationGaps: 4,
  missingIndustrySkills: 6,
};

/** Score bands used for labelling any 0-100 component score. */
const SCORE_BANDS = [
  { min: 80, label: "Strong" },
  { min: 65, label: "Good" },
  { min: 45, label: "Developing" },
  { min: 0, label: "Needs work" },
];

/**
 * The subset of the config that is safe (and useful) to expose to the browser.
 * The frontend uses it to render the weight breakdown and threshold copy so
 * none of those numbers are duplicated in React.
 */
function publicConfig() {
  return {
    componentWeights: COMPONENT_WEIGHTS,
    componentLabels: COMPONENT_LABELS,
    resumeScoring: RESUME_SCORING,
    communicationScoring: COMMUNICATION_SCORING,
    categories: {
      placementReady: {
        label: CATEGORIES.placementReady.label,
        minOverall: CATEGORIES.placementReady.minOverall,
        minComponents: CATEGORIES.placementReady.minComponents,
      },
      highPotential: {
        label: CATEGORIES.highPotential.label,
        minOverall: CATEGORIES.highPotential.minOverall,
        minTopComponent: CATEGORIES.highPotential.minTopComponent,
        minTrendDelta: CATEGORIES.highPotential.minTrendDelta,
      },
      needsImprovement: { label: CATEGORIES.needsImprovement.label },
    },
    tracks: Object.values(TRACKS),
    scoreBands: SCORE_BANDS,
    assessment: {
      questionsPerAssessment: SKILL_ASSESSMENT_SCORING.questionsPerAssessment,
      maxSkillsPerAssessment: SKILL_ASSESSMENT_SCORING.maxSkillsPerAssessment,
    },
    interviewDomains: INTERVIEW_DOMAINS,
  };
}

module.exports = {
  COMPONENT_WEIGHTS,
  COMPONENT_LABELS,
  RESUME_SCORING,
  INTERVIEW_SCORING,
  SKILL_ASSESSMENT_SCORING,
  COMMUNICATION_SCORING,
  CATEGORIES,
  TRACKS,
  TRACK_DETECTION,
  INDUSTRY_SKILL_CATALOG,
  INTERVIEW_DOMAINS,
  ROADMAP_LIMITS,
  ANALYSIS_LIMITS,
  SCORE_BANDS,
  publicConfig,
};
