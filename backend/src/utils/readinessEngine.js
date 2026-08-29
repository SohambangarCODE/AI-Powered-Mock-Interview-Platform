/**
 * The Placement Readiness engine.
 *
 * Two clearly separated halves:
 *
 *  1. Deterministic scoring. Every number the candidate sees is computed here
 *     from their real resume / interview / assessment records, using the weights
 *     and targets in config/readinessConfig.js. The model is never asked to
 *     produce a score, so the same inputs always yield the same score and the
 *     breakdown always adds up.
 *
 *  2. AI interpretation. The model is given the computed numbers and the
 *     candidate's actual data, and asked only for prose: which areas are weak,
 *     what's missing, and what to do next. If it is unavailable, deterministic
 *     fallbacks derived from the same records take over — degraded, but still
 *     real data rather than placeholder text.
 */

const { askForJSON } = require("./aiClient");
const {
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
} = require("../config/readinessConfig");

// ── Helpers ────────────────────────────────────────────────
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const round = (n) => Math.round(n);
const round1 = (n) => Math.round(n * 10) / 10;

const wordCount = (text) =>
  typeof text === "string" ? text.trim().split(/\s+/).filter(Boolean).length : 0;

const str = (value, max = 300) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : "";

const strList = (value, limit, max = 300) =>
  Array.isArray(value)
    ? value
        .map((item) => str(item, max))
        .filter(Boolean)
        .slice(0, limit)
    : [];

/** Label a 0-100 score using the configured bands. */
function scoreBand(score) {
  const band = SCORE_BANDS.find((b) => score >= b.min);
  return band ? band.label : "Needs work";
}

/**
 * Recency-weighted mean: the newest item counts fully, each older one is worth
 * `decay` times the item after it. Expects `items` newest-first.
 */
function decayedMean(items, decay, getValue) {
  let weightedTotal = 0;
  let weightTotal = 0;
  items.forEach((item, i) => {
    const value = Number(getValue(item));
    if (!Number.isFinite(value)) return;
    const weight = Math.pow(decay, i);
    weightedTotal += value * weight;
    weightTotal += weight;
  });
  return weightTotal ? weightedTotal / weightTotal : null;
}

function standardDeviation(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// ── 1. Resume strength ─────────────────────────────────────
/**
 * Scored on completeness: each configured section earns its weight pro-rata up
 * to `target` items. A resume with 10 skills, 3 projects, an internship and a
 * degree scores well; a one-page skills list does not.
 */
function scoreResume(profile) {
  if (!profile) {
    return { score: null, hasData: false, detail: null };
  }

  const counts = {
    skills: profile.skillNames ? profile.skillNames().length : 0,
    projects: profile.projects?.length || 0,
    experience: profile.experience?.length || 0,
    certifications: profile.certifications?.length || 0,
    education: profile.education?.length || 0,
  };

  const breakdown = Object.entries(RESUME_SCORING).map(([key, rule]) => {
    const count = counts[key] || 0;
    const ratio = rule.target > 0 ? clamp(count / rule.target, 0, 1) : 0;
    return {
      key,
      label: rule.label,
      count,
      target: rule.target,
      weight: rule.weight,
      earned: round1(ratio * rule.weight),
    };
  });

  const score = clamp(
    round(breakdown.reduce((sum, b) => sum + b.earned, 0)),
    0,
    100,
  );

  return {
    score,
    hasData: true,
    detail: {
      breakdown,
      totalYearsExperience: profile.totalYearsExperience || 0,
      experienceLevel: profile.experienceLevel || "Mid",
      band: scoreBand(score),
    },
  };
}

// ── 2. Interview performance ───────────────────────────────
/**
 * Recency-weighted mean of completed interview scores, plus a small bonus for
 * practising across several domains. Uses the interview engine's own 0-100
 * scores — no re-scoring, so the readiness page can never disagree with the
 * session report the candidate already read.
 */
function scoreInterviews(interviews) {
  const completed = interviews
    .filter((i) => i.isComplete && typeof i.score === "number" && i.score > 0)
    .slice(0, INTERVIEW_SCORING.maxSessions);

  if (!completed.length) {
    return { score: null, hasData: false, detail: null };
  }

  const base = decayedMean(
    completed,
    INTERVIEW_SCORING.recencyDecay,
    (i) => i.score,
  );

  const domains = [...new Set(completed.map((i) => i.domain).filter(Boolean))];
  const coverageRatio = clamp(
    domains.length / INTERVIEW_SCORING.domainCoverageTarget,
    0,
    1,
  );
  const coverageBonus = round1(coverageRatio * INTERVIEW_SCORING.coverageBonus);

  const score = clamp(round(base + coverageBonus), 0, 100);

  const scores = completed.map((i) => i.score);

  return {
    score,
    hasData: true,
    detail: {
      sessionsCounted: completed.length,
      recencyWeightedAverage: round1(base),
      coverageBonus,
      domainsPractised: domains,
      domainCoverageTarget: INTERVIEW_SCORING.domainCoverageTarget,
      bestScore: Math.max(...scores),
      latestScore: scores[0],
      band: scoreBand(score),
    },
  };
}

// ── 3. Skill assessment ────────────────────────────────────
function scoreSkillAssessments(assessments) {
  const completed = assessments
    .filter((a) => a.status === "completed")
    .slice(0, SKILL_ASSESSMENT_SCORING.maxAssessments);

  if (!completed.length) {
    return { score: null, hasData: false, detail: null };
  }

  const base = decayedMean(
    completed,
    SKILL_ASSESSMENT_SCORING.recencyDecay,
    (a) => a.overallScore,
  );
  const score = clamp(round(base), 0, 100);

  // Best score per skill across the counted assessments.
  const perSkill = new Map();
  for (const assessment of completed) {
    for (const entry of assessment.skillScores || []) {
      const key = entry.skill.toLowerCase();
      const existing = perSkill.get(key);
      if (!existing || entry.score > existing.score) {
        perSkill.set(key, { skill: entry.skill, score: entry.score });
      }
    }
  }

  return {
    score,
    hasData: true,
    detail: {
      assessmentsCounted: completed.length,
      recencyWeightedAverage: round1(base),
      latestScore: completed[0].overallScore,
      skillsCovered: [...perSkill.values()].sort((a, b) => b.score - a.score),
      band: scoreBand(score),
    },
  };
}

// ── 4. Communication ───────────────────────────────────────
/**
 * Measured from how the candidate actually answered in past interviews: depth
 * (words per answer), consistency (spread of per-answer scores), completion
 * (how many questions they attempted rather than skipped), and elaboration (how
 * often an answer went beyond a one-liner). Never self-reported.
 */
function scoreCommunication(interviews) {
  const turns = interviews.flatMap((i) =>
    (i.turns || []).filter((t) => t.answeredAt),
  );

  if (!turns.length) {
    return { score: null, hasData: false, detail: null };
  }

  const answered = turns.filter((t) => !t.skipped && t.answer);
  const words = answered.map((t) => wordCount(t.answer));
  const avgWords = words.length
    ? words.reduce((a, b) => a + b, 0) / words.length
    : 0;

  const depthRatio = clamp(
    avgWords / COMMUNICATION_SCORING.answerDepth.targetWords,
    0,
    1,
  );

  const scores = answered
    .map((t) => t.score)
    .filter((s) => typeof s === "number");
  const spread = standardDeviation(scores);
  // A 4-point spread on the 0-10 scale means answers swing from strong to weak;
  // that reads as inconsistent communication.
  const consistencyRatio = scores.length > 1 ? clamp(1 - spread / 4, 0, 1) : 0.5;

  const completionRatio = clamp(answered.length / turns.length, 0, 1);

  const elaborateCount = words.filter(
    (w) => w >= COMMUNICATION_SCORING.elaboration.minWords,
  ).length;
  const elaborationRatio = words.length
    ? clamp(elaborateCount / words.length, 0, 1)
    : 0;

  const metrics = [
    {
      key: "answerDepth",
      label: COMMUNICATION_SCORING.answerDepth.label,
      ratio: depthRatio,
      weight: COMMUNICATION_SCORING.answerDepth.weight,
      value: `${round1(avgWords)} words / answer`,
    },
    {
      key: "consistency",
      label: COMMUNICATION_SCORING.consistency.label,
      ratio: consistencyRatio,
      weight: COMMUNICATION_SCORING.consistency.weight,
      value: `±${round1(spread)} score spread`,
    },
    {
      key: "completion",
      label: COMMUNICATION_SCORING.completion.label,
      ratio: completionRatio,
      weight: COMMUNICATION_SCORING.completion.weight,
      value: `${answered.length}/${turns.length} answered`,
    },
    {
      key: "elaboration",
      label: COMMUNICATION_SCORING.elaboration.label,
      ratio: elaborationRatio,
      weight: COMMUNICATION_SCORING.elaboration.weight,
      value: `${elaborateCount}/${words.length} detailed`,
    },
  ].map((m) => ({ ...m, earned: round1(m.ratio * m.weight) }));

  const score = clamp(
    round(metrics.reduce((sum, m) => sum + m.earned, 0)),
    0,
    100,
  );

  return {
    score,
    hasData: true,
    detail: {
      metrics,
      answersAnalysed: answered.length,
      skippedCount: turns.length - answered.length,
      averageWordsPerAnswer: round1(avgWords),
      band: scoreBand(score),
    },
  };
}

// ── Overall score ──────────────────────────────────────────
/**
 * Weighted mean of whichever components have data, with the missing components'
 * weight redistributed across the rest. `dataCompleteness` reports how much of
 * the configured weight was actually backed by data, so a 90 built on one
 * component can be shown for what it is.
 */
function combineComponents(parts) {
  const configuredTotal = Object.values(COMPONENT_WEIGHTS).reduce(
    (a, b) => a + b,
    0,
  );

  const components = Object.keys(COMPONENT_WEIGHTS).map((key) => ({
    key,
    label: COMPONENT_LABELS[key] || key,
    score: parts[key].score,
    weight: COMPONENT_WEIGHTS[key],
    hasData: parts[key].hasData,
    detail: parts[key].detail,
    effectiveWeight: 0,
  }));

  const withData = components.filter((c) => c.hasData);
  const availableWeight = withData.reduce((sum, c) => sum + c.weight, 0);

  if (!availableWeight) {
    return { components, overallScore: 0, dataCompleteness: 0 };
  }

  for (const component of withData) {
    component.effectiveWeight = round1((component.weight / availableWeight) * 100);
  }

  const overallScore = clamp(
    round(
      withData.reduce((sum, c) => sum + c.score * c.weight, 0) / availableWeight,
    ),
    0,
    100,
  );

  const dataCompleteness = configuredTotal
    ? round((availableWeight / configuredTotal) * 100)
    : 0;

  return { components, overallScore, dataCompleteness };
}

// ── Classification ─────────────────────────────────────────
/**
 * Placement Ready needs a good score backed by several kinds of evidence.
 * High Potential is for candidates who aren't there yet but show a genuinely
 * strong component or a clearly rising trend. Everyone else needs improvement.
 */
function classify({ overallScore, components, scoreDelta }) {
  const withData = components.filter((c) => c.hasData);
  const topComponent = withData.reduce(
    (max, c) => Math.max(max, c.score),
    0,
  );
  const trendDelta = typeof scoreDelta === "number" ? scoreDelta : 0;

  const ready = CATEGORIES.placementReady;
  if (
    overallScore >= ready.minOverall &&
    withData.length >= ready.minComponents
  ) {
    return {
      category: "placementReady",
      categoryLabel: ready.label,
      reason:
        `Overall ${overallScore}/100 clears the ${ready.minOverall} threshold ` +
        `with ${withData.length} of 4 evidence sources present.`,
    };
  }

  const potential = CATEGORIES.highPotential;
  if (
    overallScore >= potential.minOverall &&
    (topComponent >= potential.minTopComponent ||
      trendDelta >= potential.minTrendDelta)
  ) {
    const driver =
      topComponent >= potential.minTopComponent
        ? `a standout component score of ${topComponent}/100`
        : `an improvement of +${round1(trendDelta)} since the last assessment`;
    return {
      category: "highPotential",
      categoryLabel: potential.label,
      reason: `Overall ${overallScore}/100 with ${driver}.`,
    };
  }

  const shortfall = Math.max(0, ready.minOverall - overallScore);
  return {
    category: "needsImprovement",
    categoryLabel: CATEGORIES.needsImprovement.label,
    reason:
      withData.length < ready.minComponents
        ? `Only ${withData.length} of 4 evidence sources available — more practice data is needed for a confident assessment.`
        : `Overall ${overallScore}/100 is ${shortfall} points short of the ${ready.minOverall} placement-ready threshold.`,
  };
}

// ── Track detection ────────────────────────────────────────
/** The current year, used to tell "still studying" from "already graduated". */
const currentYear = () => new Date().getFullYear();

function detectTrack(profile) {
  if (!profile) return "fresher";

  // The configured year threshold is the sole test for "experienced", so tuning
  // READINESS_EXPERIENCED_MIN_YEARS actually changes the outcome. Someone with
  // less than that is treated as a fresher — the fresher roadmap still fits a
  // candidate with a few months of exposure.
  const years = Number(profile.totalYearsExperience) || 0;
  if (years >= TRACK_DETECTION.experiencedMinYears) return "experienced";

  const entries = profile.experience || [];
  const hasProfessionalRole = entries.some(
    (e) => e.type === "job" || e.type === "freelance",
  );

  // Graduating this year or later, with nothing professional yet -> still a
  // student, so an internship is the realistic next step.
  const graduationYears = (profile.education || [])
    .map((ed) => parseInt(String(ed.year).match(/\d{4}/)?.[0] || "", 10))
    .filter((y) => Number.isFinite(y));
  const stillStudying =
    graduationYears.length > 0 &&
    Math.max(...graduationYears) >= currentYear() &&
    !hasProfessionalRole;

  return stillStudying ? "internship" : "fresher";
}

// ── Skill snapshot + trends ────────────────────────────────
/**
 * A flat list of per-skill 0-100 scores at the moment of assessment. Assessment
 * results take precedence over interview topic averages, which are converted
 * from the interview engine's 0-10 topic scale.
 */
function buildSkillSnapshot({ assessments, interviews }) {
  const snapshot = new Map();

  for (const assessment of assessments.filter(
    (a) => a.status === "completed",
  )) {
    for (const entry of assessment.skillScores || []) {
      const key = entry.skill.toLowerCase();
      // Newest assessment wins: `assessments` arrives newest-first.
      if (!snapshot.has(key)) {
        snapshot.set(key, {
          skill: entry.skill,
          score: clamp(round(entry.score), 0, 100),
          source: "assessment",
        });
      }
    }
  }

  for (const interview of interviews) {
    for (const topic of interview.report?.topicScores || []) {
      const key = String(topic.topic || "").toLowerCase();
      if (!key || snapshot.has(key)) continue;
      snapshot.set(key, {
        skill: topic.topic,
        score: clamp(round(topic.score * 10), 0, 100),
        source: "interview",
      });
    }
  }

  return [...snapshot.values()].sort((a, b) => b.score - a.score);
}

/** Per-skill movement between two snapshots, newest vs the one before it. */
function buildSkillTrends(current = [], previous = []) {
  const prior = new Map(
    previous.map((entry) => [entry.skill.toLowerCase(), entry.score]),
  );

  return current.map((entry) => {
    const before = prior.get(entry.skill.toLowerCase());
    const hasPrevious = typeof before === "number";
    const delta = hasPrevious ? entry.score - before : null;
    return {
      skill: entry.skill,
      score: entry.score,
      source: entry.source,
      previousScore: hasPrevious ? before : null,
      delta,
      direction:
        delta === null
          ? "new"
          : delta > 2
            ? "improving"
            : delta < -2
              ? "declining"
              : "steady",
    };
  });
}

// ── Industry skill gap ─────────────────────────────────────
const FILLER_WORDS = new Set(["one", "and", "the", "a", "of", "with", "&"]);

// Trailing qualifiers that describe *depth* rather than the technology itself.
// "REST API design" should match a resume that shows a REST API, so the phrase
// is also tried without the qualifier — but only when at least two words remain,
// so "System design" never degrades to the useless keyword "system".
const TRAILING_QUALIFIERS = new Set([
  "design",
  "modelling",
  "modeling",
  "basics",
  "fundamentals",
  "workflows",
  "strategies",
  "practices",
]);

/**
 * Break a catalogue entry into the phrases that would count as evidence of it.
 * "One backend framework (Express / Django / Spring)" ->
 *   ["backend framework", "express", "django", "spring"]
 */
function catalogKeywords(entry) {
  const parenMatch = entry.match(/\(([^)]*)\)/);
  const alternatives = parenMatch
    ? parenMatch[1].split("/").map((s) => s.trim().toLowerCase())
    : [];

  const main = entry
    .replace(/\([^)]*\)/g, " ")
    .toLowerCase()
    .split(/[/&,]/)
    .map((part) =>
      part
        .split(/\s+/)
        .filter((w) => w && !FILLER_WORDS.has(w))
        .join(" ")
        .trim(),
    )
    .filter(Boolean);

  const trimmed = main.flatMap((phrase) => {
    const words = phrase.split(" ");
    const last = words[words.length - 1];
    return TRAILING_QUALIFIERS.has(last) && words.length >= 3
      ? [words.slice(0, -1).join(" ")]
      : [];
  });

  return [...new Set([...main, ...trimmed, ...alternatives])].filter(
    (k) => k.length >= 3,
  );
}

/**
 * Catalogue entries with no supporting evidence anywhere in the candidate's
 * resume, projects or practice history. This is a grounded hint list for the
 * model, not the final answer — the model decides which gaps actually matter
 * for the candidate's track.
 */
function findMissingIndustrySkills({ profile, track, skillSnapshot }) {
  const corpus = [
    ...(profile?.skillNames ? profile.skillNames() : []),
    ...(profile?.projects || []).flatMap((p) => [
      p.name,
      p.description,
      ...(p.technologies || []),
    ]),
    ...(profile?.experience || []).flatMap((e) => [e.role, ...(e.highlights || [])]),
    ...(profile?.certifications || []).map((c) => c.name),
    ...skillSnapshot.map((s) => s.skill),
  ]
    .filter(Boolean)
    .join(" • ")
    .toLowerCase();

  const catalog = [
    ...INDUSTRY_SKILL_CATALOG.core,
    ...(INDUSTRY_SKILL_CATALOG[track] || []),
  ];

  return catalog.filter(
    (entry) => !catalogKeywords(entry).some((kw) => corpus.includes(kw)),
  );
}

// ── Deterministic fallbacks ────────────────────────────────
/**
 * Analysis derived purely from the stored records. Used when the model is
 * unavailable so the page still shows the candidate's real strengths and gaps
 * instead of empty sections.
 */
function deterministicAnalysis({
  components,
  skillSnapshot,
  interviews,
  profile,
  missingIndustrySkills,
  categoryReason,
}) {
  const byKey = Object.fromEntries(components.map((c) => [c.key, c]));

  const interviewStrong = interviews.flatMap((i) =>
    (i.report?.strongAreas || []).map((a) => a.topic),
  );
  const interviewWeak = interviews.flatMap((i) =>
    (i.report?.weakAreas || []).map((a) => a.topic),
  );

  const technicalStrengths = [
    ...new Set([
      ...skillSnapshot.filter((s) => s.score >= 70).map((s) => s.skill),
      ...interviewStrong,
      ...(profile?.strengths || []),
    ]),
  ].slice(0, ANALYSIS_LIMITS.technicalStrengths);

  const weakTechnicalAreas = [
    ...new Set([
      ...skillSnapshot.filter((s) => s.score < 50).map((s) => s.skill),
      ...interviewWeak,
    ]),
  ].slice(0, ANALYSIS_LIMITS.weakTechnicalAreas);

  // Communication gaps come from whichever sub-metrics under-performed.
  const communicationGaps = (byKey.communication?.detail?.metrics || [])
    .filter((m) => m.ratio < 0.7)
    .sort((a, b) => a.ratio - b.ratio)
    .map((m) => `${m.label} is below target (${m.value}).`)
    .slice(0, ANALYSIS_LIMITS.communicationGaps);

  return {
    technicalStrengths,
    weakTechnicalAreas,
    communicationGaps,
    missingIndustrySkills: missingIndustrySkills.slice(
      0,
      ANALYSIS_LIMITS.missingIndustrySkills,
    ),
    categoryReason,
    summary:
      "Generated from your stored resume, interview and assessment records. " +
      "AI commentary was unavailable for this run.",
    aiGenerated: false,
  };
}

/** Roadmap derived from the same records, for the same fallback case. */
function deterministicRoadmap({
  components,
  track,
  missingIndustrySkills,
  weakTechnicalAreas,
  interviews,
}) {
  const byKey = Object.fromEntries(components.map((c) => [c.key, c]));

  const technologies = missingIndustrySkills
    .slice(0, ROADMAP_LIMITS.technologies)
    .map((skill) => ({
      title: skill,
      reason: `Commonly expected of ${TRACKS[track].label.toLowerCase()} candidates and not evident in your resume.`,
      priority: "high",
      domain: "",
      technologies: [],
    }));

  const projects = missingIndustrySkills
    .slice(0, ROADMAP_LIMITS.projects)
    .map((skill) => ({
      title: `Build a small project that uses ${skill}`,
      reason: "Turns a listed gap into demonstrable evidence on your resume.",
      priority: "medium",
      domain: "",
      technologies: [skill],
    }));

  // Domains the candidate has not practised yet, so the suggestion is useful.
  const practised = new Set(
    (byKey.interview?.detail?.domainsPractised || []).map((d) => d.toLowerCase()),
  );
  const unpractised = INTERVIEW_DOMAINS.filter(
    (d) => !practised.has(d.toLowerCase()),
  );

  const interviewTopics = [
    ...weakTechnicalAreas.slice(0, 2).map((area) => ({
      title: area,
      reason: "Scored below par in your interview and assessment history.",
      priority: "high",
      domain: "",
      technologies: [],
    })),
    ...unpractised.slice(0, 3).map((domain) => ({
      title: domain,
      reason: "You have not run a mock interview in this domain yet.",
      priority: "medium",
      domain,
      technologies: [],
    })),
  ].slice(0, ROADMAP_LIMITS.interviewTopics);

  const lowest = components
    .filter((c) => c.hasData)
    .sort((a, b) => a.score - b.score)[0];

  return {
    technologies,
    projects,
    certifications: [],
    interviewTopics,
    milestones: [
      lowest
        ? `Raise your weakest component — ${lowest.label} at ${lowest.score}/100.`
        : "Complete a mock interview to start building a score.",
      "Run a skill assessment so your technical scores are measured, not estimated.",
      "Re-generate this report after your next practice session to track movement.",
    ].slice(0, ROADMAP_LIMITS.milestones),
    focusStatement: interviews.length
      ? "Focus on your lowest-scoring component first — it carries the most upside."
      : "Start with a mock interview: interview performance carries the largest weight.",
    aiGenerated: false,
  };
}

// ── AI analysis ────────────────────────────────────────────
const analysisSystemPrompt = `
You are a placement officer and senior engineering hiring manager reviewing a candidate's
readiness for technical job placement. You are specific, honest and constructive.
Never invent skills, projects or experience that are not in the data you are given.
Respond with STRICT JSON ONLY, no markdown, no commentary.
`.trim();

/** Compact, factual description of the candidate for the model to reason over. */
function buildCandidateBrief({
  profile,
  components,
  overallScore,
  dataCompleteness,
  track,
  categoryLabel,
  categoryReason,
  skillTrends,
  interviews,
  missingIndustrySkills,
  scoreDelta,
}) {
  const byKey = Object.fromEntries(components.map((c) => [c.key, c]));

  const componentLines = components
    .map(
      (c) =>
        `- ${c.label}: ${c.hasData ? `${c.score}/100 (weight ${c.effectiveWeight}%)` : "no data yet"}`,
    )
    .join("\n");

  const resumeLines = profile
    ? [
        `Experience level: ${profile.experienceLevel}`,
        `Professional experience: ${profile.totalYearsExperience || 0} years`,
        `Skills: ${profile.skillNames().join(", ") || "none extracted"}`,
        `Projects: ${
          (profile.projects || [])
            .map(
              (p) =>
                `${p.name}${p.technologies?.length ? ` [${p.technologies.join(", ")}]` : ""}`,
            )
            .join("; ") || "none"
        }`,
        `Experience entries: ${
          (profile.experience || [])
            .map((e) => `${e.role} at ${e.organization} (${e.type}${e.duration ? `, ${e.duration}` : ""})`)
            .join("; ") || "none"
        }`,
        `Certifications: ${
          (profile.certifications || []).map((c) => c.name).join("; ") || "none"
        }`,
        `Education: ${
          (profile.education || [])
            .map((ed) => `${ed.degree} — ${ed.institution} (${ed.year})`)
            .join("; ") || "none"
        }`,
      ].join("\n")
    : "No resume on file.";

  const interviewLines = interviews.length
    ? interviews
        .slice(0, 5)
        .map(
          (i) =>
            `- ${i.domain}: ${i.score}/100, ${i.questionsAnswered} answered, ${i.skippedCount} skipped` +
            (i.report?.weakAreas?.length
              ? `, weak: ${i.report.weakAreas.map((a) => a.topic).join(", ")}`
              : "") +
            (i.report?.strongAreas?.length
              ? `, strong: ${i.report.strongAreas.map((a) => a.topic).join(", ")}`
              : ""),
        )
        .join("\n")
    : "No completed mock interviews.";

  const skillLines = skillTrends.length
    ? skillTrends
        .map(
          (s) =>
            `- ${s.skill}: ${s.score}/100 (${s.source}, ${s.direction}${
              s.delta === null ? "" : `, ${s.delta > 0 ? "+" : ""}${s.delta}`
            })`,
        )
        .join("\n")
    : "No per-skill measurements yet.";

  const commLines = byKey.communication?.detail?.metrics
    ? byKey.communication.detail.metrics
        .map((m) => `- ${m.label}: ${m.value} (${m.earned}/${m.weight} points)`)
        .join("\n")
    : "No interview answers to analyse.";

  return `
CANDIDATE TRACK: ${TRACKS[track].label} — ${TRACKS[track].description}

COMPUTED SCORES (do not recalculate, do not dispute):
Overall placement readiness: ${overallScore}/100
Category: ${categoryLabel} (${categoryReason})
Data completeness: ${dataCompleteness}%
Change since last assessment: ${scoreDelta === null ? "first assessment" : `${scoreDelta > 0 ? "+" : ""}${scoreDelta} points`}
${componentLines}

RESUME:
${resumeLines}

MOCK INTERVIEW HISTORY:
${interviewLines}

MEASURED SKILL SCORES:
${skillLines}

COMMUNICATION METRICS (from interview answers):
${commLines}

INDUSTRY SKILLS WITH NO EVIDENCE IN THE CANDIDATE'S RECORD:
${missingIndustrySkills.join(", ") || "none — good coverage"}
`.trim();
}

async function runAIAnalysis(brief, { categoryReason, missingIndustrySkills }) {
  const parsed = await askForJSON({
    system: analysisSystemPrompt,
    user: `
${brief}

Produce the analysis. Respond with this exact JSON structure:
{
  "summary": "3-4 sentences on where this candidate stands for placement right now",
  "categoryReason": "1-2 sentences explaining the category, in plain language addressed to the candidate",
  "technicalStrengths": ["up to ${ANALYSIS_LIMITS.technicalStrengths} specific technical strengths, each grounded in the data above"],
  "weakTechnicalAreas": ["up to ${ANALYSIS_LIMITS.weakTechnicalAreas} specific weak technical areas, each naming the skill and why it is weak"],
  "communicationGaps": ["up to ${ANALYSIS_LIMITS.communicationGaps} specific communication gaps drawn from the communication metrics and interview answers"],
  "missingIndustrySkills": ["up to ${ANALYSIS_LIMITS.missingIndustrySkills} industry skills this candidate should add, most important first"]
}

Rules:
- Ground every item in the data above. Do not invent projects, jobs or skills.
- weakTechnicalAreas and communicationGaps must be actionable, not vague ("Explains trade-offs only when prompted", not "communication needs work").
- For missingIndustrySkills, prioritise from the no-evidence list, but drop anything irrelevant to this candidate's track.
- If a section genuinely has no data to support it, return an empty array rather than filler.
`.trim(),
    temperature: 0.5,
    maxTokens: 1200,
  });

  if (!parsed) return null;

  const analysis = {
    summary: str(parsed.summary, 1200),
    categoryReason: str(parsed.categoryReason, 500) || categoryReason,
    technicalStrengths: strList(
      parsed.technicalStrengths,
      ANALYSIS_LIMITS.technicalStrengths,
    ),
    weakTechnicalAreas: strList(
      parsed.weakTechnicalAreas,
      ANALYSIS_LIMITS.weakTechnicalAreas,
    ),
    communicationGaps: strList(
      parsed.communicationGaps,
      ANALYSIS_LIMITS.communicationGaps,
    ),
    missingIndustrySkills: strList(
      parsed.missingIndustrySkills,
      ANALYSIS_LIMITS.missingIndustrySkills,
    ),
    aiGenerated: true,
  };

  // A reply with nothing usable in it is worse than the deterministic fallback.
  const empty =
    !analysis.summary &&
    !analysis.technicalStrengths.length &&
    !analysis.weakTechnicalAreas.length &&
    !analysis.missingIndustrySkills.length;
  if (empty) return null;

  if (!analysis.missingIndustrySkills.length) {
    analysis.missingIndustrySkills = missingIndustrySkills.slice(
      0,
      ANALYSIS_LIMITS.missingIndustrySkills,
    );
  }

  return analysis;
}

// ── AI roadmap ─────────────────────────────────────────────
const roadmapSystemPrompt = `
You are a technical career coach building a personalised placement roadmap.
Your recommendations must be specific, sequenced and achievable, and must reflect
the candidate's track and their measured weak areas. Never recommend something the
candidate has already demonstrated. Respond with STRICT JSON ONLY, no markdown.
`.trim();

const TRACK_GUIDANCE = {
  fresher:
    "This candidate is a fresher targeting their first full-time role. Prioritise fundamentals, " +
    "DSA depth, one strong end-to-end project, and campus/off-campus interview preparation. " +
    "Avoid senior-level system design and expensive enterprise certifications.",
  internship:
    "This candidate is seeking an internship while still studying. Prioritise buildable skills, " +
    "small shippable projects, collaboration workflows (Git, PRs, code review) and confidence on " +
    "core language questions. Keep every recommendation completable alongside coursework.",
  experienced:
    "This candidate already has professional experience. Prioritise depth, system design, " +
    "scalability, cloud and CI/CD, and leadership signals. Recommend certifications only where " +
    "they carry real hiring weight, and pitch projects at production complexity.",
};

async function runAIRoadmap(brief, track) {
  const parsed = await askForJSON({
    system: roadmapSystemPrompt,
    user: `
${brief}

TRACK GUIDANCE: ${TRACK_GUIDANCE[track]}

Interview domains available for practice in this app (use these exact names for the "domain" field):
${INTERVIEW_DOMAINS.join(", ")}

Build the roadmap. Respond with this exact JSON structure:
{
  "focusStatement": "one sentence naming the single most important thing to work on next",
  "technologies": [
    { "title": "technology or skill to learn", "reason": "why, referencing this candidate's data", "priority": "high" }
  ],
  "projects": [
    { "title": "project to build", "reason": "what gap it closes", "priority": "high", "technologies": ["tech1", "tech2"] }
  ],
  "certifications": [
    { "title": "certification name", "reason": "why it is worth it for this track", "priority": "medium" }
  ],
  "interviewTopics": [
    { "title": "topic to practise", "reason": "why, referencing a weak area or unpractised domain", "priority": "high", "domain": "exact domain name from the list above" }
  ],
  "milestones": ["ordered checkpoints from now until placement-ready, each one sentence"]
}

Limits: at most ${ROADMAP_LIMITS.technologies} technologies, ${ROADMAP_LIMITS.projects} projects, ${ROADMAP_LIMITS.certifications} certifications, ${ROADMAP_LIMITS.interviewTopics} interview topics, ${ROADMAP_LIMITS.milestones} milestones.
Rules:
- priority must be exactly "high", "medium" or "low", ordered high first.
- "domain" is required on interviewTopics and must match the available domain list exactly.
- Do not recommend a certification if none is genuinely worth the candidate's time — return an empty array.
- Reference the candidate's actual weak areas and previous interview performance in the reasons.
`.trim(),
    temperature: 0.6,
    maxTokens: 1600,
  });

  if (!parsed) return null;

  const items = (value, limit, { withDomain = false, withTech = false } = {}) =>
    Array.isArray(value)
      ? value
          .map((item) => {
            const domain = str(item?.domain, 60);
            return {
              title: str(item?.title, 160),
              reason: str(item?.reason, 400),
              priority: ["high", "medium", "low"].includes(item?.priority)
                ? item.priority
                : "medium",
              // Only keep a domain the interview engine can actually start.
              domain:
                withDomain && INTERVIEW_DOMAINS.includes(domain) ? domain : "",
              technologies: withTech ? strList(item?.technologies, 8, 60) : [],
            };
          })
          .filter((item) => item.title)
          .slice(0, limit)
      : [];

  const roadmap = {
    focusStatement: str(parsed.focusStatement, 400),
    technologies: items(parsed.technologies, ROADMAP_LIMITS.technologies),
    projects: items(parsed.projects, ROADMAP_LIMITS.projects, {
      withTech: true,
    }),
    certifications: items(parsed.certifications, ROADMAP_LIMITS.certifications),
    interviewTopics: items(
      parsed.interviewTopics,
      ROADMAP_LIMITS.interviewTopics,
      { withDomain: true },
    ),
    milestones: strList(parsed.milestones, ROADMAP_LIMITS.milestones, 400),
    aiGenerated: true,
  };

  const empty =
    !roadmap.technologies.length &&
    !roadmap.projects.length &&
    !roadmap.interviewTopics.length &&
    !roadmap.milestones.length;

  return empty ? null : roadmap;
}

// ── Entry point ────────────────────────────────────────────
/**
 * Compute a complete readiness assessment.
 *
 * @param {object}   input
 * @param {object?}  input.profile      the user's ResumeProfile, if any
 * @param {object[]} input.interviews   completed interviews, newest first
 * @param {object[]} input.assessments  skill assessments, newest first
 * @param {object?}  input.previous     the previous ReadinessAssessment, for trends
 * @param {string?}  input.trackOverride  candidate-selected track
 * @returns a plain object matching the ReadinessAssessment schema
 */
async function computeReadiness({
  profile = null,
  interviews = [],
  assessments = [],
  previous = null,
  trackOverride = null,
}) {
  // ── Deterministic scoring ──────────────────────────────
  const parts = {
    resume: scoreResume(profile),
    interview: scoreInterviews(interviews),
    skillAssessment: scoreSkillAssessments(assessments),
    communication: scoreCommunication(interviews),
  };

  const { components, overallScore, dataCompleteness } =
    combineComponents(parts);

  const scoreDelta =
    previous && typeof previous.overallScore === "number"
      ? overallScore - previous.overallScore
      : null;

  const classification = classify({ overallScore, components, scoreDelta });

  const detectedTrack = detectTrack(profile);
  const trackValid = trackOverride && TRACKS[trackOverride];
  const track = trackValid ? trackOverride : detectedTrack;

  const skillSnapshot = buildSkillSnapshot({ assessments, interviews });
  const skillTrends = buildSkillTrends(skillSnapshot, previous?.skillSnapshot);
  const missingIndustrySkills = findMissingIndustrySkills({
    profile,
    track,
    skillSnapshot,
  });

  // ── AI interpretation ──────────────────────────────────
  const brief = buildCandidateBrief({
    profile,
    components,
    overallScore,
    dataCompleteness,
    track,
    categoryLabel: classification.categoryLabel,
    categoryReason: classification.reason,
    skillTrends,
    interviews,
    missingIndustrySkills,
    scoreDelta,
  });

  const [aiAnalysis, aiRoadmap] = await Promise.all([
    runAIAnalysis(brief, {
      categoryReason: classification.reason,
      missingIndustrySkills,
    }),
    runAIRoadmap(brief, track),
  ]);

  const analysis =
    aiAnalysis ||
    deterministicAnalysis({
      components,
      skillSnapshot,
      interviews,
      profile,
      missingIndustrySkills,
      categoryReason: classification.reason,
    });

  const roadmap =
    aiRoadmap ||
    deterministicRoadmap({
      components,
      track,
      missingIndustrySkills,
      weakTechnicalAreas: analysis.weakTechnicalAreas,
      interviews,
    });

  if (!roadmap.focusStatement) {
    roadmap.focusStatement = classification.reason;
  }

  return {
    overallScore,
    components,
    dataCompleteness,
    category: classification.category,
    categoryLabel: classification.categoryLabel,
    track,
    trackLabel: TRACKS[track].label,
    trackDetected: !trackValid,
    analysis,
    roadmap,
    skillSnapshot,
    scoreDelta,
    sources: {
      interviewCount: interviews.filter((i) => i.isComplete).length,
      assessmentCount: assessments.filter((a) => a.status === "completed")
        .length,
      hasResume: Boolean(profile),
      resumeUpdatedAt: profile?.updatedAt || null,
    },
    weightsUsed: { ...COMPONENT_WEIGHTS },
  };
}

module.exports = {
  computeReadiness,
  buildSkillTrends,
  detectTrack,
  scoreBand,
  // Exported for tests / diagnostics.
  scoreResume,
  scoreInterviews,
  scoreSkillAssessments,
  scoreCommunication,
  combineComponents,
  classify,
  findMissingIndustrySkills,
  catalogKeywords,
};
