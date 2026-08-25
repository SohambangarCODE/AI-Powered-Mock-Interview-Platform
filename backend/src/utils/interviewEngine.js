const Groq = require("groq-sdk");
const { safeParseJSON, isDuplicateQuestion } = require("./textUtils");

// Constructed on first use, not at import time: the SDK throws when
// GROQ_API_KEY is unset, which would otherwise take the whole server down at
// boot instead of failing the one request that needs it.
let groqClient = null;
function getGroq() {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

const MODEL = "groq/compound-mini";

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

function firstUnusedTopic(askedTopics = []) {
  const used = new Set(askedTopics.map((t) => String(t).toLowerCase()));
  return (
    GENERIC_TOPICS.find((t) => !used.has(t.toLowerCase())) ||
    `Follow-up ${askedTopics.length + 1}`
  );
}

function fallbackQuestion(domain, difficulty) {
  const build = FALLBACK_QUESTIONS[difficulty] || FALLBACK_QUESTIONS.medium;
  return build(domain);
}

/**
 * Single place where we talk to Groq. Returns parsed JSON, or null on any
 * failure (network, rate limit, unparseable body) so callers can degrade
 * gracefully instead of throwing mid-interview.
 */
async function askForJSON({ system, user, temperature = 0.6, maxTokens = 700 }) {
  try {
    const completion = await getGroq().chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
      max_tokens: maxTokens,
    });
    return safeParseJSON(completion.choices?.[0]?.message?.content);
  } catch (err) {
    console.error("Groq call failed:", err.message);
    return null;
  }
}

// ── Prompts ────────────────────────────────────────────────
const openingSystemPrompt = (domain) => `
You are a senior technical interviewer starting an ADAPTIVE mock interview for a ${domain} developer role.
Pick a solid foundational opening topic and ask ONE clear "medium" difficulty question to begin.

Respond with STRICT JSON ONLY, no markdown, no commentary:
{
  "nextTopic": "short topic name",
  "nextQuestion": "the opening interview question text"
}
`.trim();

const engineSystemPrompt = (domain) => `
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
`.trim();

// ── Opening question ───────────────────────────────────────
async function generateOpeningQuestion(domain) {
  const parsed = await askForJSON({
    system: openingSystemPrompt(domain),
    user: `Start the interview for a ${domain} candidate.`,
    temperature: 0.7,
    maxTokens: 300,
  });

  const question =
    typeof parsed?.nextQuestion === "string" && parsed.nextQuestion.trim()
      ? parsed.nextQuestion.trim()
      : fallbackQuestion(domain, "medium");
  const topic =
    typeof parsed?.nextTopic === "string" && parsed.nextTopic.trim()
      ? parsed.nextTopic.trim()
      : "Fundamentals";

  return { question, topic, difficulty: "medium" };
}

/**
 * Coerce whatever the model returned into a decision that is always safe to
 * persist. A partially-formed response (e.g. feedback but no nextQuestion) must
 * never reach mongoose, or a required-field ValidationError kills the turn.
 */
function normalizeDecision(parsed, ctx) {
  const { domain, askedTopics, nextDifficulty, canEnd, mustEnd, mustEndReason } = ctx;
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
      : firstUnusedTopic(askedTopics);

  const nextQuestion =
    typeof raw.nextQuestion === "string" && raw.nextQuestion.trim()
      ? raw.nextQuestion.trim()
      : fallbackQuestion(domain, nextDifficulty);

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
Current difficulty: ${interview.currentDifficulty}
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
    system: engineSystemPrompt(domain),
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
      system: engineSystemPrompt(domain),
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
          nextTopic: firstUnusedTopic(interview.askedTopics),
          nextQuestion: fallbackQuestion(domain, nextDifficulty),
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
const reportSystemPrompt = (domain) =>
  `You are an expert technical interview evaluator reviewing a ${domain} mock interview. ` +
  `You write concise, specific, actionable assessments. Never invent details that aren't in the transcript.`;

/**
 * Build the end-of-interview report.
 *
 * Everything numeric — scores, averages, difficulty progression, strong/weak
 * areas — is computed from `interview.turns` so it always agrees with what the
 * candidate saw during the interview. The model is only asked for prose.
 */
async function buildReport(interview) {
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

  const parsed = await askForJSON({
    system: reportSystemPrompt(interview.domain),
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

Respond with STRICT JSON ONLY, no markdown:
{
  "strengths": ["2-4 specific things the candidate did well, each one sentence"],
  "weaknesses": ["2-4 specific gaps or mistakes, each one sentence"],
  "progressionSummary": "2-3 sentences on how performance evolved as difficulty changed",
  "recommendations": ["2-4 concrete next steps, each one sentence"]
}
`.trim(),
    temperature: 0.5,
    maxTokens: 800,
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
    generatedAt: new Date(),
  };
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
};
