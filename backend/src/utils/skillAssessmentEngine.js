/**
 * AI-generated multiple-choice skill assessments.
 *
 * Questions are generated from the skills on the candidate's own resume, and the
 * result is scored deterministically here on the server. If the model cannot
 * produce a usable set of questions the request fails — no placeholder quiz is
 * ever served, because a fabricated score would poison the readiness history.
 */

const { askForJSONStrict } = require("./aiClient");
const { SKILL_ASSESSMENT_SCORING } = require("../config/readinessConfig");

const MIN_USABLE_QUESTIONS = 4;
const OPTIONS_PER_QUESTION = 4;

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const str = (value, max = 400) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : "";

/**
 * Choose which skills this assessment covers.
 *
 * Untested skills come first, then the weakest previously-scored ones, so
 * repeat assessments keep pointing at genuine gaps rather than re-testing what
 * the candidate has already proven.
 *
 * A caller-supplied list is intersected with the candidate's own resume skills:
 * arbitrary text must never reach the generation prompt.
 */
function pickSkills({ profile, previousAssessments = [], requested = [] }) {
  const pool = profile?.skillNames ? profile.skillNames() : [];
  const available = pool.length ? pool : SKILL_ASSESSMENT_SCORING.fallbackSkills;
  const limit = SKILL_ASSESSMENT_SCORING.maxSkillsPerAssessment;

  if (Array.isArray(requested) && requested.length) {
    const allowed = new Map(available.map((s) => [s.toLowerCase(), s]));
    const chosen = requested
      .filter((s) => typeof s === "string")
      .map((s) => allowed.get(s.trim().toLowerCase()))
      .filter(Boolean);
    const unique = [...new Set(chosen)];
    if (unique.length) return unique.slice(0, limit);
  }

  // Best previous score per skill.
  const bestScore = new Map();
  for (const assessment of previousAssessments) {
    for (const entry of assessment.skillScores || []) {
      const key = entry.skill.toLowerCase();
      const existing = bestScore.get(key);
      if (existing === undefined || entry.score > existing) {
        bestScore.set(key, entry.score);
      }
    }
  }

  return [...available]
    .sort((a, b) => {
      const scoreA = bestScore.get(a.toLowerCase());
      const scoreB = bestScore.get(b.toLowerCase());
      const untestedA = scoreA === undefined;
      const untestedB = scoreB === undefined;
      if (untestedA !== untestedB) return untestedA ? -1 : 1;
      if (untestedA) return 0; // both untested — keep resume order
      return scoreA - scoreB; // weakest first
    })
    .slice(0, limit);
}

const systemPrompt = `
You are a technical assessment author writing multiple-choice questions to measure a
candidate's real working knowledge. Questions must be unambiguous, have exactly one
correct answer, and test understanding rather than trivia recall.
Respond with STRICT JSON ONLY, no markdown, no commentary.
`.trim();

const buildPrompt = ({ skills, count, experienceLevel }) =>
  `
Write ${count} multiple-choice questions to assess a ${experienceLevel}-level developer
across these skills: ${skills.join(", ")}.

Distribute the questions as evenly as possible across the skills listed.

Respond with this exact JSON structure:
{
  "questions": [
    {
      "skill": "exact skill name from the list above",
      "difficulty": "easy" | "medium" | "hard",
      "question": "the question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correctIndex": 0,
      "explanation": "one sentence on why that answer is correct"
    }
  ]
}

Rules:
- Exactly ${OPTIONS_PER_QUESTION} options per question, all plausible, exactly one correct.
- "skill" must exactly match one of the skills listed above.
- "correctIndex" is the 0-based index of the correct option.
- Mix difficulties: roughly one third easy, one third medium, one third hard.
- Do not number the questions or reference "option A" inside the question text.
- No two questions may test the same fact.
`.trim();

/**
 * Rotate a question's options so the answer key is spread across positions.
 * Deterministic (driven by the question's index) rather than random, so the
 * stored document and the served document always agree.
 */
function rotateOptions(options, correctIndex, by) {
  const len = options.length;
  const shift = ((by % len) + len) % len;
  if (shift === 0) return { options, correctIndex };

  const rotated = new Array(len);
  options.forEach((option, i) => {
    rotated[(i + shift) % len] = option;
  });
  return { options: rotated, correctIndex: (correctIndex + shift) % len };
}

/** Keep only questions that are actually answerable and scoreable. */
function sanitizeQuestions(parsed, skills) {
  const raw = Array.isArray(parsed?.questions) ? parsed.questions : [];
  const allowed = new Map(skills.map((s) => [s.toLowerCase(), s]));
  const seen = new Set();

  const clean = [];
  for (const item of raw) {
    const question = str(item?.question, 600);
    const options = Array.isArray(item?.options)
      ? item.options.map((o) => str(o, 300)).filter(Boolean)
      : [];
    const correctIndex = Number(item?.correctIndex);

    if (!question) continue;
    if (options.length !== OPTIONS_PER_QUESTION) continue;
    if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) {
      continue; // duplicate options make the question unanswerable
    }
    if (
      !Number.isInteger(correctIndex) ||
      correctIndex < 0 ||
      correctIndex >= options.length
    ) {
      continue;
    }

    const key = question.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);

    // An unrecognised skill label would break per-skill scoring; map it back to
    // the requested list instead of dropping an otherwise good question.
    const skill =
      allowed.get(str(item?.skill, 80).toLowerCase()) || skills[0] || "General";

    const difficulty = ["easy", "medium", "hard"].includes(item?.difficulty)
      ? item.difficulty
      : "medium";

    const rotated = rotateOptions(options, correctIndex, clean.length);

    clean.push({
      index: clean.length + 1,
      skill,
      difficulty,
      question,
      options: rotated.options,
      correctIndex: rotated.correctIndex,
      explanation: str(item?.explanation, 500),
      selectedIndex: null,
      isCorrect: null,
    });
  }

  return clean;
}

/**
 * Generate a question set. Retries once with a nudge before giving up, and
 * throws a 503-style error rather than serving a fabricated quiz.
 *
 * Uses the strict wrapper so the two failure modes stay distinguishable: an
 * unreachable or rate-limited model throws its own error, with its own status
 * and an accurate message, instead of being reported as malformed questions.
 */
async function generateQuestions({ skills, experienceLevel = "Mid" }) {
  const count = SKILL_ASSESSMENT_SCORING.questionsPerAssessment;

  const ask = async (user, temperature) => {
    const { parsed } = await askForJSONStrict({
      system: systemPrompt,
      user,
      temperature,
      maxTokens: 2600,
    });
    return sanitizeQuestions(parsed, skills);
  };

  let questions = await ask(
    buildPrompt({ skills, count, experienceLevel }),
    0.6,
  );

  if (questions.length < MIN_USABLE_QUESTIONS) {
    questions = await ask(
      `${buildPrompt({ skills, count, experienceLevel })}\n\nIMPORTANT: your previous response was malformed. Return valid JSON with exactly ${OPTIONS_PER_QUESTION} options and a numeric correctIndex for every question.`,
      0.4,
    );
  }

  if (questions.length < MIN_USABLE_QUESTIONS) {
    const err = new Error(
      "Could not generate assessment questions right now. Please try again in a moment.",
    );
    err.status = 503;
    throw err;
  }

  return questions.slice(0, count);
}

/**
 * Score a submission. Unanswered questions count as incorrect, so a partial
 * submission cannot inflate the score by omission.
 *
 * @param {object[]} questions  the stored questions, with the answer key
 * @param {Array<{index:number, selectedIndex:number}>} answers
 */
function scoreSubmission(questions, answers) {
  const selections = new Map();
  if (Array.isArray(answers)) {
    for (const answer of answers) {
      const index = Number(answer?.index);
      // Skipped questions arrive as null (or ""), and Number() turns both into
      // 0 — coercing blindly would silently record them as "chose option A".
      const raw = answer?.selectedIndex;
      if (raw === null || raw === undefined || raw === "") continue;
      const selected = Number(raw);
      if (!Number.isInteger(index) || !Number.isInteger(selected)) continue;
      selections.set(index, selected);
    }
  }

  const graded = questions.map((q) => {
    const raw = selections.get(q.index);
    const selectedIndex =
      Number.isInteger(raw) && raw >= 0 && raw < q.options.length ? raw : null;
    return {
      ...(typeof q.toObject === "function" ? q.toObject() : q),
      selectedIndex,
      isCorrect: selectedIndex === null ? false : selectedIndex === q.correctIndex,
    };
  });

  const correctCount = graded.filter((q) => q.isCorrect).length;
  const answeredCount = graded.filter((q) => q.selectedIndex !== null).length;
  const overallScore = graded.length
    ? clamp(Math.round((correctCount / graded.length) * 100), 0, 100)
    : 0;

  // Per-skill breakdown — this is what feeds skill-level trend tracking.
  const bySkill = new Map();
  for (const q of graded) {
    const entry = bySkill.get(q.skill) || { skill: q.skill, correct: 0, total: 0 };
    entry.total += 1;
    if (q.isCorrect) entry.correct += 1;
    bySkill.set(q.skill, entry);
  }

  const skillScores = [...bySkill.values()].map((entry) => ({
    ...entry,
    score: entry.total
      ? clamp(Math.round((entry.correct / entry.total) * 100), 0, 100)
      : 0,
  }));

  return { graded, correctCount, answeredCount, overallScore, skillScores };
}

module.exports = {
  MIN_USABLE_QUESTIONS,
  OPTIONS_PER_QUESTION,
  pickSkills,
  generateQuestions,
  scoreSubmission,
  sanitizeQuestions,
  rotateOptions,
};
