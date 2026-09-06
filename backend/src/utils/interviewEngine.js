const { isDuplicateQuestion } = require("./textUtils");
// One shared Groq client and one JSON-asking wrapper for the whole project.
const { askForJSON } = require("./aiClient");
// Company behaviour is configuration, never branching logic in here.
const { getProfile, SIMULATION_DISCLAIMER } = require("../config/companyProfiles");

const MIN_QUESTIONS = 4;
const MAX_QUESTIONS = 10;
const MAX_CONSECUTIVE_SKIPS = 3;

const DIFFICULTIES = ["easy", "medium", "hard"];

// Score thresholds that drive the difficulty ladder. Kept as code rather than
// left to the model so the adaptation is deterministic and reviewable.
const STRONG_ANSWER = 8; // >= this -> harder
const WEAK_ANSWER = 5;   // <  this -> easier

// ── Deterministic fallbacks ────────────────────────────────
// Used when the model returns unusable JSON, or keeps repeating itself. They are
// intentionally generic so they work for any domain.
const FALLBACK_QUESTIONS = {
  easy: (domain) =>
    `In your own words, what are the core concepts every ${domain} developer should understand, and why do they matter?`,
  medium: (domain) =>
    `Walk me through a problem you solved using ${domain}. What approach did you take, and what trade-offs did you weigh?`,
  hard: (domain) =>
    `A ${domain} system you own starts degrading under heavy load. How would you diagnose the bottleneck, and what would you change?`,
};

const GENERIC_TOPICS = [
  "Fundamentals",
  "Practical Application",
  "Debugging",
  "Performance",
  "Architecture",
  "Testing",
  "Trade-offs",
  "Best Practices",
];

// ── Small helpers ──────────────────────────────────────────
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function shiftDifficulty(current, decision) {
  const idx = DIFFICULTIES.indexOf(current);
  const from = idx === -1 ? 1 : idx;
  if (decision === "increase") return DIFFICULTIES[Math.min(from + 1, 2)];
  if (decision === "decrease") return DIFFICULTIES[Math.max(from - 1, 0)];
  return DIFFICULTIES[from];
}

/** Strong answer -> harder, weak answer -> easier, anything else -> hold. */
function scoreToDecision(score) {
  if (typeof score !== "number" || Number.isNaN(score)) return null;
  if (score >= STRONG_ANSWER) return "increase";
  if (score < WEAK_ANSWER) return "decrease";
  return "maintain";
}

/**
 * Next unused topic. A company session prefers that company's own focus areas
 * before falling back to the generic list, so even the deterministic path stays
 * on-profile.
 */
function firstUnusedTopic(askedTopics = [], company = null) {
  const used = new Set(askedTopics.map((t) => String(t).toLowerCase()));
  const candidates = company
    ? [
        ...(company.roundFocus || []),
        ...(company.roleEmphasis || []),
        ...(company.focusAreas || []),
        ...GENERIC_TOPICS,
      ]
    : GENERIC_TOPICS;

  return (
    candidates.find((t) => t && !used.has(String(t).toLowerCase())) ||
    `Follow-up ${askedTopics.length + 1}`
  );
}

function fallbackQuestion(domain, difficulty, company) {
  const build = FALLBACK_QUESTIONS[difficulty] || FALLBACK_QUESTIONS.medium;
  const base = build(domain);
  // A company session gets the same deterministic question, anchored to one of
  // its focus areas so even the degraded path stays on-profile.
  const focus = company?.focusAreas?.[0];
  return focus ? `${base} Frame your answer around ${focus}.` : base;
}

// ── Company context (AI Recruiter Simulator) ───────────────
/**
 * The block that makes the selected company actually influence the engine.
 *
 * Returns "" when there is no company, so a plain mock interview's prompt is
 * byte-identical to what it has always been — that is the guarantee that the
 * existing Mock Interview flow is unchanged.
 */
function companyPromptBlock(company) {
  if (!company || !company.name) return "";

  const list = (items, limit = 6) =>
    Array.isArray(items) && items.length
      ? items.slice(0, limit).join(", ")
      : "not specified";

  const criteria = Array.isArray(company.evaluationCriteria)
    ? company.evaluationCriteria
        .slice(0, 6)
        .map(
          (c) =>
            `- ${c.label}${c.weight ? ` (weight ${c.weight})` : ""}: ${c.description || ""}`.trim(),
        )
        .join("\n")
    : "";

  return `

COMPANY SIMULATION CONTEXT
You are running this interview as an interviewer at ${company.name}${
    company.roleLabel ? `, hiring for: ${company.roleLabel}` : ""
  }${company.roundLabel ? `, in the round: ${company.roundLabel}` : ""}.
This is a practice simulation of publicly discussed interview patterns, not any real or confidential process.

Interviewing style you must adopt:
${company.interviewStyle || "Professional and technically rigorous."}
${company.roundDescription ? `\nWhat this round is for: ${company.roundDescription}` : ""}
Focus areas for this company: ${list(company.focusAreas)}
Emphasis for this role: ${list(company.roleEmphasis)}
Emphasis for this round: ${list(company.roundFocus)}
Question types to favour: ${list(company.questionTypes)}
${criteria ? `\nScore the answer against these criteria, weighted as shown:\n${criteria}` : ""}

Apply this by choosing topics and phrasing questions the way ${company.name} would, and by judging answers against the criteria above. Do not mention that you are following a configuration.`;
}

/**
 * Flatten the persisted interview.company sub-document plus its profile into the
 * shape companyPromptBlock() wants. Returns null for non-company sessions.
 *
 * The profile is read synchronously from config rather than the database so this
 * stays a pure function usable mid-turn; the two agree because boot re-seeds the
 * collection from the same config. `profile` can be passed in when the caller
 * already resolved one (e.g. startInterview).
 */
function companyContext(interview, profile = null) {
  const company = interview?.company;
  if (!company || !company.slug) return null;

  profile = profile || getProfile(company.slug);
  const role = profile?.roles?.find((r) => r.id === company.roleId);
  const round = profile?.rounds?.find((r) => r.id === company.roundId);

  return {
    name: company.name || profile?.name || "",
    slug: company.slug,
    roleLabel: company.roleLabel || role?.label || "",
    roundLabel: company.roundLabel || round?.label || "",
    roundDescription: round?.description || "",
    interviewStyle: profile?.interviewStyle || "",
    focusAreas: profile?.focusAreas || [],
    questionTypes: profile?.questionTypes || [],
    evaluationCriteria: profile?.evaluationCriteria || [],
    roleEmphasis: role?.emphasis || [],
    roundFocus: round?.focus || [],
    expectedStandard: company.expectedStandard || profile?.expectedStandard || {},
  };
}

// ── Prompts ────────────────────────────────────────────────
// `difficulty` defaults to "medium" so a plain mock interview's prompt is
// unchanged; a company round can open easier or harder per its profile.
const openingSystemPrompt = (domain, company, difficulty = "medium") => `
You are a senior technical interviewer starting an ADAPTIVE mock interview for a ${domain} developer role.
Pick a solid foundational opening topic and ask ONE clear "${difficulty}" difficulty question to begin.

Respond with STRICT JSON ONLY, no markdown, no commentary:
{
  "nextTopic": "short topic name",
  "nextQuestion": "the opening interview question text"
}
${companyPromptBlock(company)}`.trim();

const engineSystemPrompt = (domain, company) => `
You are a senior technical interviewer conducting an ADAPTIVE mock interview for a ${domain} developer role.

Each turn you must:
1. Score the candidate's latest answer from 0 to 10 (integer).
2. Give short, constructive feedback on that answer.
3. Pick the next topic — it must NOT repeat any topic already covered (a list will be given to you).
4. Write ONE next interview question on that new topic.
5. Say whether the interview has gathered enough signal to end (only when told ending is permitted).

Scoring guide:
- 0-2  = no answer, off-topic, or fundamentally wrong
- 3-4  = vague or partially incorrect, misses key ideas
- 5-7  = correct and adequate, but shallow or missing nuance
- 8-9  = confident, accurate, well-structured, shows real depth
- 10   = exceptional, includes trade-offs and edge cases unprompted

Difficulty levels, for writing the next question:
- "easy"   = foundational / definition-level
- "medium" = applied / practical
- "hard"   = deep, edge-case, system-design or optimization

Respond with STRICT JSON ONLY, no markdown, no commentary:
{
  "score": 0-10 integer for the candidate's last answer,
  "feedback": "2-3 sentence constructive feedback on the candidate's last answer",
  "nextTopic": "short topic name for the next question",
  "nextQuestion": "the next interview question text",
  "shouldEnd": true | false,
  "endReason": "short reason if shouldEnd is true, else empty string"
}
${companyPromptBlock(company)}`.trim();

// ── Opening question ───────────────────────────────────────
/**
 * @param {string} domain
 * @param {object} [options]
 * @param {object} [options.company]          company context, when simulating one
 * @param {string} [options.startDifficulty]  opening difficulty; defaults to "medium"
 */
async function generateOpeningQuestion(domain, options = {}) {
  const { company = null, startDifficulty } = options;
  const difficulty = DIFFICULTIES.includes(startDifficulty)
    ? startDifficulty
    : "medium";

  const parsed = await askForJSON({
    system: openingSystemPrompt(domain, company, difficulty),
    user: company
      ? `Start the ${company.roundLabel || "interview"} for a ${domain} candidate applying to ${company.name}${
          company.roleLabel ? ` as a ${company.roleLabel}` : ""
        }. Ask a "${difficulty}" difficulty opening question.`
      : `Start the interview for a ${domain} candidate.`,
    temperature: 0.7,
    maxTokens: 300,
  });

  const question =
    typeof parsed?.nextQuestion === "string" && parsed.nextQuestion.trim()
      ? parsed.nextQuestion.trim()
      : fallbackQuestion(domain, difficulty, company);
  const topic =
    typeof parsed?.nextTopic === "string" && parsed.nextTopic.trim()
      ? parsed.nextTopic.trim()
      : company?.roundFocus?.[0] || company?.focusAreas?.[0] || "Fundamentals";

  return { question, topic, difficulty };
}

/**
 * Coerce whatever the model returned into a decision that is always safe to
 * persist. A partially-formed response (e.g. feedback but no nextQuestion) must
 * never reach mongoose, or a required-field ValidationError kills the turn.
 */
function normalizeDecision(parsed, ctx) {
  const {
    domain,
    company = null,
    askedTopics,
    nextDifficulty,
    canEnd,
    mustEnd,
    mustEndReason,
  } = ctx;
  const raw = parsed && typeof parsed === "object" ? parsed : {};

  const rawScore = Number(raw.score);
  const score = Number.isFinite(rawScore)
    ? clamp(Math.round(rawScore), 0, 10)
    : null;

  const feedback =
    typeof raw.feedback === "string" && raw.feedback.trim()
      ? raw.feedback.trim()
      : "Thanks for your answer — let's keep going.";

  const nextTopic =
    typeof raw.nextTopic === "string" && raw.nextTopic.trim()
      ? raw.nextTopic.trim()
      : firstUnusedTopic(askedTopics, company);

  const nextQuestion =
    typeof raw.nextQuestion === "string" && raw.nextQuestion.trim()
      ? raw.nextQuestion.trim()
      : fallbackQuestion(domain, nextDifficulty, company);

  const endReason =
    typeof raw.endReason === "string" ? raw.endReason.trim() : "";

  // The model is only allowed to end once we've hit the minimum, and is forced
  // to end at the maximum.
  let shouldEnd = raw.shouldEnd === true && canEnd;
  if (mustEnd) shouldEnd = true;

  return {
    score,
    feedback,
    nextTopic,
    nextQuestion,
    shouldEnd,
    endReason: shouldEnd
      ? (mustEnd && mustEndReason) ||
        endReason ||
        "Enough signal gathered to evaluate"
      : "",
  };
}

/**
 * One adaptive turn: score the answer, decide the next difficulty, and produce
 * the next question.
 *
 * @param {object}  interview   the mongoose document (its open turn is the
 *                              question being answered right now)
 * @param {string}  answerText  the candidate's answer, or a skip marker
 * @param {boolean} skipped     true when the candidate skipped
 */
async function requestNextStep({ interview, answerText, skipped = false }) {
  const domain = interview.domain;
  // Non-null only for AI Recruiter Simulator sessions; everything below behaves
  // exactly as before when it is null.
  const company = companyContext(interview);
  const openTurn = interview.openTurn();
  const askedQuestions = interview.askedQuestions();

  // interview.turns already includes the turn being answered, and counts skips —
  // so skipping can no longer stretch the interview indefinitely.
  const turnCount = interview.turns.length;
  const consecutiveSkips = countTrailingSkips(interview.turns, skipped);

  const canEnd = turnCount >= MIN_QUESTIONS;
  const hitMax = turnCount >= MAX_QUESTIONS;
  const skippedOut = consecutiveSkips >= MAX_CONSECUTIVE_SKIPS;
  const mustEnd = hitMax || skippedOut;
  const mustEndReason = skippedOut
    ? `Ended after ${consecutiveSkips} questions skipped in a row`
    : hitMax
      ? `Reached the maximum of ${MAX_QUESTIONS} questions`
      : "";

  const transcript = interview.turns
    .filter((t) => t.answeredAt)
    .slice(-3)
    .map(
      (t) =>
        `Q${t.index} (${t.difficulty}, ${t.topic}): ${t.question}\n` +
        `A${t.index}: ${t.skipped ? "[skipped]" : t.answer}`
    )
    .join("\n\n");

  const buildPayload = (extraInstruction = "") =>
    `
Domain: ${domain}
${company ? `Company: ${company.name}${company.roleLabel ? ` · ${company.roleLabel}` : ""}${company.roundLabel ? ` · ${company.roundLabel}` : ""}\n` : ""}Current difficulty: ${interview.currentDifficulty}
Topics already covered (do NOT repeat any of these): ${interview.askedTopics.join(", ") || "none"}
Questions asked so far: ${turnCount}
Interview may end: ${canEnd ? "yes, if you have enough signal" : "no, not yet"}

Earlier exchanges:
${transcript || "(none yet)"}

The question you asked, which the candidate has just answered:
"${openTurn?.question || "(unknown)"}"

Candidate's answer to score: "${answerText}"
${skipped ? "\nNOTE: the candidate SKIPPED this question. Score it 0." : ""}
${mustEnd ? "\nIMPORTANT: This MUST be the final turn — set shouldEnd to true regardless of your assessment." : ""}
${extraInstruction}
`.trim();

  let parsed = await askForJSON({
    system: engineSystemPrompt(domain, company),
    user: buildPayload(),
    temperature: 0.6,
  });

  // Difficulty follows the score. The model's own opinion is not consulted —
  // the score is the signal, so the ladder stays consistent with what the
  // candidate is shown.
  let score = Number.isFinite(Number(parsed?.score))
    ? clamp(Math.round(Number(parsed.score)), 0, 10)
    : null;

  // A skip is an abstention, not a wrong answer: no score is recorded, but it
  // still eases the difficulty.
  const decision = skipped ? "decrease" : scoreToDecision(score) || "maintain";
  const nextDifficulty = shiftDifficulty(interview.currentDifficulty, decision);

  const ctx = {
    domain,
    company,
    askedTopics: interview.askedTopics,
    nextDifficulty,
    canEnd,
    mustEnd,
    mustEndReason,
  };

  let normalized = normalizeDecision(parsed, ctx);

  // ── Don't ask the same question twice ────────────────────
  if (
    !normalized.shouldEnd &&
    isDuplicateQuestion(normalized.nextQuestion, askedQuestions)
  ) {
    const retry = await askForJSON({
      system: engineSystemPrompt(domain, company),
      user: buildPayload(
        `\nYou have ALREADY asked the following questions. Your next question must be substantively different — new topic, new angle:\n` +
          askedQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")
      ),
      temperature: 0.9,
    });

    const retryNormalized = normalizeDecision(
      { ...retry, score: parsed?.score ?? retry?.score },
      ctx
    );

    normalized = isDuplicateQuestion(retryNormalized.nextQuestion, askedQuestions)
      ? {
          ...normalized,
          nextTopic: firstUnusedTopic(interview.askedTopics, company),
          nextQuestion: fallbackQuestion(domain, nextDifficulty, company),
        }
      : retryNormalized;
  }

  return {
    ...normalized,
    score: skipped ? null : normalized.score,
    decision,
    nextDifficulty,
  };
}

/** How many turns in a row have been skipped, counting the current one. */
function countTrailingSkips(turns, currentIsSkip) {
  if (!currentIsSkip) return 0;
  let count = 1;
  // turns[last] is the turn being answered right now; walk backwards past it.
  for (let i = turns.length - 2; i >= 0; i--) {
    if (turns[i].skipped) count++;
    else break;
  }
  return count;
}

// ── Final report ───────────────────────────────────────────
const reportSystemPrompt = (domain, company) =>
  `You are an expert technical interview evaluator reviewing a ${domain} mock interview. ` +
  `You write concise, specific, actionable assessments. Never invent details that aren't in the transcript.` +
  (company
    ? ` This session simulated an interview at ${company.name}${
        company.roleLabel ? ` for a ${company.roleLabel}` : ""
      }${company.roundLabel ? ` (${company.roundLabel})` : ""}. ` +
      `Judge the candidate against that company's bar as described, and be explicit about where they fall short of it. ` +
      `Speak about the simulated profile, never claim knowledge of the company's real internal process.`
    : "");

/**
 * Build the end-of-interview report.
 *
 * Everything numeric — scores, averages, difficulty progression, strong/weak
 * areas — is computed from `interview.turns` so it always agrees with what the
 * candidate saw during the interview. The model is only asked for prose.
 */
async function buildReport(interview) {
  const company = companyContext(interview);
  const turns = interview.turns.filter((t) => t.answeredAt);
  const scored = turns.filter(
    (t) => !t.skipped && typeof t.score === "number"
  );

  const answeredCount = scored.length;
  const skippedCount = turns.filter((t) => t.skipped).length;

  const averageAnswerScore = answeredCount
    ? Math.round(
        (scored.reduce((sum, t) => sum + t.score, 0) / answeredCount) * 10
      ) / 10
    : 0;

  // Overall is derived from the per-answer scores so the two can't disagree.
  // Skips are surfaced as an explicit, visible deduction rather than hidden in
  // the average.
  const answerQuality = answeredCount ? Math.round(averageAnswerScore * 10) : 0;
  const skipPenalty = turns.length
    ? Math.round(20 * (skippedCount / turns.length))
    : 0;
  const overallScore = clamp(answerQuality - skipPenalty, 10, 100);

  const difficultyProgression = turns.map((t) => ({
    index: t.index,
    topic: t.topic,
    difficulty: t.difficulty,
    score: t.skipped ? null : t.score,
    skipped: t.skipped,
  }));

  const questionPerformance = turns.map((t) => ({
    index: t.index,
    question: t.question,
    answer: t.skipped ? "" : t.answer,
    topic: t.topic,
    difficulty: t.difficulty,
    score: t.skipped ? null : t.score,
    feedback: t.feedback,
    skipped: t.skipped,
  }));

  // Average score per topic -> strong vs weak areas.
  const byTopic = new Map();
  for (const t of scored) {
    const key = t.topic || "General";
    const entry = byTopic.get(key) || { topic: key, total: 0, count: 0 };
    entry.total += t.score;
    entry.count += 1;
    byTopic.set(key, entry);
  }
  const topicScores = [...byTopic.values()].map((e) => ({
    topic: e.topic,
    score: Math.round((e.total / e.count) * 10) / 10,
    questions: e.count,
  }));

  const strongAreas = topicScores
    .filter((t) => t.score >= 7)
    .sort((a, b) => b.score - a.score);
  const weakAreas = topicScores
    .filter((t) => t.score < 5)
    .sort((a, b) => a.score - b.score);

  // ── Prose from the model ───────────────────────────────
  const transcript = questionPerformance
    .map(
      (t) =>
        `Q${t.index} [${t.difficulty} · ${t.topic}]: ${t.question}\n` +
        `A: ${t.skipped ? "[skipped]" : t.answer}\n` +
        `Score: ${t.skipped ? "skipped" : `${t.score}/10`}`
    )
    .join("\n\n");

  const progressionPath = difficultyProgression
    .map(
      (d) =>
        `${d.index}. ${d.topic} (${d.difficulty}) → ${d.skipped ? "skipped" : `${d.score}/10`}`
    )
    .join("\n");

  // ── Company standard (deterministic) ───────────────────
  // Computed here, never asked of the model, for the same reason every other
  // number in this report is: the verdict must always agree with the scores.
  const skipRate = turns.length ? skippedCount / turns.length : 0;
  const standard = company ? normalizeStandard(company.expectedStandard) : null;
  const meetsStandard = standard
    ? overallScore >= standard.minOverallScore &&
      averageAnswerScore >= standard.minAverageAnswerScore &&
      skipRate <= standard.maxSkipRate
    : null;

  const parsed = await askForJSON({
    system: reportSystemPrompt(interview.domain, company),
    user: `
Transcript with per-answer scores:
${transcript || "(no answers were given)"}

Difficulty progression:
${progressionPath || "(none)"}

Computed stats — use these, do not recalculate:
- Questions answered: ${answeredCount}
- Questions skipped: ${skippedCount}
- Average answer score: ${averageAnswerScore}/10
- Overall score: ${overallScore}/100
- Topic averages: ${topicScores.map((t) => `${t.topic} ${t.score}/10`).join(", ") || "none"}
${
  company
    ? `
Simulated company profile:
- Company: ${company.name}${company.roleLabel ? ` · ${company.roleLabel}` : ""}${company.roundLabel ? ` · ${company.roundLabel}` : ""}
- Interviewing style: ${company.interviewStyle || "not specified"}
- Focus areas: ${(company.focusAreas || []).join(", ") || "not specified"}
- Evaluation criteria: ${
        (company.evaluationCriteria || [])
          .map((c) => `${c.label}${c.weight ? ` (${c.weight})` : ""}`)
          .join(", ") || "not specified"
      }
- Expected standard: overall >= ${standard.minOverallScore}/100, average answer >= ${standard.minAverageAnswerScore}/10, skip rate <= ${Math.round(standard.maxSkipRate * 100)}%
- Candidate's skip rate: ${Math.round(skipRate * 100)}%
- Verdict already computed (do not contradict it): the candidate ${meetsStandard ? "MEETS" : "does NOT meet"} this simulated standard.
`
    : ""
}
Respond with STRICT JSON ONLY, no markdown:
{
  "strengths": ["2-4 specific things the candidate did well, each one sentence"],
  "weaknesses": ["2-4 specific gaps or mistakes, each one sentence"],
  "progressionSummary": "2-3 sentences on how performance evolved as difficulty changed",
  "recommendations": ["2-4 concrete next steps, each one sentence"]${
    company
      ? `,
  "improvementAreas": ["2-4 areas the candidate must improve to clear this company's bar, each one sentence"],
  "companyFeedback": "3-4 sentences judging this candidate against the simulated ${company.name} bar, referring to their actual answers",
  "preparationAreas": ["2-4 concrete things to prepare before interviewing at a company like this, each one sentence"]`
      : ""
  }
}
`.trim(),
    temperature: 0.5,
    maxTokens: company ? 1200 : 800,
  });

  const strList = (value, fallback) => {
    const list = Array.isArray(value)
      ? value.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim())
      : [];
    return list.length ? list.slice(0, 4) : fallback;
  };

  return {
    overallScore,
    answerQuality,
    skipPenalty,
    averageAnswerScore,
    totalQuestions: turns.length,
    answeredCount,
    skippedCount,
    finalDifficulty: interview.currentDifficulty,
    difficultyProgression,
    questionPerformance,
    topicScores,
    strongAreas,
    weakAreas,
    strengths: strList(parsed?.strengths, ["No strengths could be assessed."]),
    weaknesses: strList(parsed?.weaknesses, ["No weaknesses could be assessed."]),
    progressionSummary:
      typeof parsed?.progressionSummary === "string" &&
      parsed.progressionSummary.trim()
        ? parsed.progressionSummary.trim()
        : "Not enough answers were recorded to summarise progression.",
    recommendations: strList(parsed?.recommendations, [
      "Complete a full interview to receive tailored recommendations.",
    ]),
    // Present only on AI Recruiter Simulator sessions. Absent otherwise, so the
    // existing report renders exactly as it always has.
    ...(company
      ? {
          company: {
            slug: company.slug,
            name: company.name,
            roleLabel: company.roleLabel,
            roundLabel: company.roundLabel,
            expectedStandard: standard,
            candidateScore: overallScore,
            candidateAverageAnswerScore: averageAnswerScore,
            skipRate: Math.round(skipRate * 100) / 100,
            meetsStandard,
            standardGap: Math.max(0, standard.minOverallScore - overallScore),
            evaluationCriteria: company.evaluationCriteria || [],
            focusAreas: company.focusAreas || [],
            improvementAreas: strList(
              parsed?.improvementAreas,
              deterministicImprovementAreas({ weakAreas, skipRate, standard, overallScore }),
            ),
            companyFeedback:
              typeof parsed?.companyFeedback === "string" &&
              parsed.companyFeedback.trim()
                ? parsed.companyFeedback.trim()
                : deterministicCompanyFeedback({
                    company,
                    standard,
                    overallScore,
                    averageAnswerScore,
                    meetsStandard,
                  }),
            preparationAreas: strList(
              parsed?.preparationAreas,
              deterministicPreparationAreas({ company, weakAreas }),
            ),
            disclaimer: SIMULATION_DISCLAIMER,
          },
        }
      : {}),
    generatedAt: new Date(),
  };
}

// ── Company standard helpers ───────────────────────────────
/** Fill in any missing threshold so the verdict is never NaN-driven. */
function normalizeStandard(raw) {
  const s = raw && typeof raw === "object" ? raw : {};
  const num = (value, fallback) =>
    Number.isFinite(Number(value)) ? Number(value) : fallback;

  return {
    minOverallScore: clamp(num(s.minOverallScore, 65), 0, 100),
    minAverageAnswerScore: clamp(num(s.minAverageAnswerScore, 6.5), 0, 10),
    maxSkipRate: clamp(num(s.maxSkipRate, 0.25), 0, 1),
    label: typeof s.label === "string" && s.label.trim() ? s.label.trim() : "Hire bar",
  };
}

/**
 * Fallbacks used when the model is unavailable. Derived from the same computed
 * numbers as the verdict, so a degraded report still says something true rather
 * than placeholder text.
 */
function deterministicCompanyFeedback({
  company,
  standard,
  overallScore,
  averageAnswerScore,
  meetsStandard,
}) {
  const gap = standard.minOverallScore - overallScore;
  return meetsStandard
    ? `Scored ${overallScore}/100 against the simulated ${company.name} ${standard.label} of ${standard.minOverallScore}/100, with an average answer score of ${averageAnswerScore}/10. On this profile the performance clears the bar.`
    : `Scored ${overallScore}/100 against the simulated ${company.name} ${standard.label} of ${standard.minOverallScore}/100 — ${gap > 0 ? `${gap} points short` : "short on answer depth or skip rate"}. Average answer score was ${averageAnswerScore}/10 versus the ${standard.minAverageAnswerScore}/10 this profile expects.`;
}

function deterministicImprovementAreas({ weakAreas, skipRate, standard, overallScore }) {
  const areas = weakAreas
    .slice(0, 3)
    .map((a) => `Raise depth on ${a.topic} — it averaged ${a.score}/10.`);

  if (skipRate > standard.maxSkipRate)
    areas.push(
      `Reduce skipped questions: ${Math.round(skipRate * 100)}% were skipped against a ${Math.round(standard.maxSkipRate * 100)}% ceiling on this profile.`,
    );

  if (!areas.length)
    areas.push(
      overallScore >= standard.minOverallScore
        ? "Keep depth consistent across topics as the difficulty escalates."
        : "Add concrete detail and trade-off reasoning to every answer.",
    );

  return areas;
}

function deterministicPreparationAreas({ company, weakAreas }) {
  const weakest = weakAreas.slice(0, 2).map((a) => a.topic);
  const focus = (company.focusAreas || []).slice(0, 3);
  const areas = [];

  if (weakest.length)
    areas.push(`Revise ${weakest.join(" and ")} before the next attempt.`);
  if (focus.length)
    areas.push(
      `Practise this profile's focus areas: ${focus.join(", ")}.`,
    );
  if (company.roundLabel)
    areas.push(`Rehearse the format of the ${company.roundLabel} round specifically.`);

  return areas.length
    ? areas
    : ["Complete another round to gather more signal on where to prepare."];
}

module.exports = {
  MIN_QUESTIONS,
  MAX_QUESTIONS,
  MAX_CONSECUTIVE_SKIPS,
  DIFFICULTIES,
  generateOpeningQuestion,
  requestNextStep,
  buildReport,
  shiftDifficulty,
  scoreToDecision,
  companyContext,
};
