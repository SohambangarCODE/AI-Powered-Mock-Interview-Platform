/**
 * Peer Challenge Arena — engine layer.
 *
 * Reuses the project's single Groq integration (aiClient.js) for all AI calls.
 * All scoring and point arithmetic happens here on the server; the frontend
 * only receives computed results.
 */

const { askForJSON } = require("./aiClient");

// ── Challenge categories ───────────────────────────────────

const CATEGORY_LABELS = {
  technical: "Technical",
  hr: "HR / Behavioural",
  aptitude: "Aptitude",
  domain: "Domain-Specific",
  dsa: "Data Structures & Algorithms",
};

// ── Points table ───────────────────────────────────────────
// Base points per question answered correctly (score 10/10).
// Actual points = base × (aiScore / 10).

const BASE_POINTS = { easy: 10, medium: 20, hard: 35 };
const TYPE_BONUS = { daily: 50, weekly: 150 };
/** Extra % of base when completed in under half the allotted time. */
const TIME_BONUS_FRACTION = 0.1;
/** Allotted seconds per question (used to judge time bonus). */
const SECONDS_PER_QUESTION = 90;

// ── Achievement definitions ────────────────────────────────
// Add new entries here; the controller calls checkAchievements() after every
// completion without knowing this list's size.

const ACHIEVEMENT_DEFINITIONS = [
  {
    id: "first_challenge",
    name: "First Challenge",
    description: "Complete your first challenge",
    icon: "🎯",
    /** @param {object} profile @param {number} rank @param {object} attempt */
    check: (profile) => profile.totalCompleted >= 1,
  },
  {
    id: "ten_challenges",
    name: "Challenger",
    description: "Complete 10 challenges",
    icon: "🏆",
    check: (profile) => profile.totalCompleted >= 10,
  },
  {
    id: "fifty_challenges",
    name: "Arena Legend",
    description: "Complete 50 challenges",
    icon: "🦁",
    check: (profile) => profile.totalCompleted >= 50,
  },
  {
    id: "streak_7",
    name: "7-Day Streak",
    description: "Keep a 7-day challenge streak",
    icon: "🔥",
    check: (profile) => profile.longestStreak >= 7,
  },
  {
    id: "streak_30",
    name: "Month of Fire",
    description: "Keep a 30-day challenge streak",
    icon: "💥",
    check: (profile) => profile.longestStreak >= 30,
  },
  {
    id: "top_10",
    name: "Top 10",
    description: "Reach the top 10 on the leaderboard",
    icon: "⭐",
    check: (_profile, rank) => rank !== null && rank <= 10,
  },
  {
    id: "top_3",
    name: "Podium",
    description: "Reach the top 3 on the leaderboard",
    icon: "🥇",
    check: (_profile, rank) => rank !== null && rank <= 3,
  },
  {
    id: "interview_master",
    name: "Interview Master",
    description: "Score 90%+ on a Hard challenge",
    icon: "🎓",
    check: (_profile, _rank, attempt) =>
      attempt?.difficulty === "hard" && attempt?.totalScore >= 90,
  },
  {
    id: "perfect_score",
    name: "Perfect Score",
    description: "Score 100% on any challenge",
    icon: "💎",
    check: (_profile, _rank, attempt) => attempt?.totalScore === 100,
  },
  {
    id: "weekly_warrior",
    name: "Weekly Warrior",
    description: "Complete a weekly challenge",
    icon: "📅",
    check: (_profile, _rank, attempt) => attempt?.type === "weekly",
  },
];

// ── Period key helpers ─────────────────────────────────────

/**
 * "YYYY-MM-DD" in UTC — uniquely identifies one daily challenge slot.
 */
function dailyKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/**
 * "YYYY-Www" (ISO 8601 week) — uniquely identifies one weekly challenge slot.
 */
function weeklyKey(date = new Date()) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  // ISO week starts on Monday
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d - yearStart) / 86400000 + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function dailyExpiry(date = new Date()) {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function weeklyExpiry(date = new Date()) {
  const d = new Date(date);
  const day = d.getUTCDay() || 7;
  // Next Sunday 23:59:59
  d.setUTCDate(d.getUTCDate() + (7 - day));
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

// ── Question generation ────────────────────────────────────

/**
 * Build a category-appropriate system prompt for challenge question generation.
 */
function buildQuestionGenPrompt(category, difficulty) {
  const catLabel = CATEGORY_LABELS[category] || category;

  const diffGuide = {
    easy: "foundational, definition-level, suitable for beginners",
    medium: "applied, scenario-based, requiring real understanding",
    hard: "deep, edge-case, system-design or optimisation level",
  }[difficulty] || "moderate difficulty";

  const categoryInstructions = {
    technical:
      "Focus on software engineering, programming concepts, algorithms, system design, or CS fundamentals.",
    hr:
      "Focus on behavioural questions using the STAR method, situational judgment, or professional competencies.",
    aptitude:
      "Focus on logical reasoning, numerical ability, data interpretation, or verbal reasoning.",
    domain:
      "Focus on industry-specific knowledge: software development, data science, product management, or DevOps.",
    dsa:
      "Focus on Data Structures (arrays, trees, graphs, heaps) and Algorithms (sorting, searching, dynamic programming, greedy).",
  }[category] || "";

  return `You are an expert interview question creator for a competitive challenge platform.
Generate exactly the requested number of ${difficulty} difficulty ${catLabel} interview questions.
${categoryInstructions}
Difficulty guide: ${diffGuide}.

Rules:
- Each question must be standalone and answerable in 1-4 sentences.
- No sub-questions or multi-part questions.
- Questions must be distinct and cover different topics.
- Respond with STRICT JSON ONLY, no markdown, no commentary.

Format:
{
  "questions": [
    { "index": 1, "question": "...", "topic": "short topic name" },
    ...
  ]
}`.trim();
}

/**
 * Generate challenge questions via the existing Groq AI client.
 *
 * @param {string} category  - One of the CATEGORY_LABELS keys
 * @param {string} difficulty - "easy" | "medium" | "hard"
 * @param {number} count      - Number of questions to generate
 * @returns {Promise<Array<{index,question,topic}>>}
 */
async function generateChallengeQuestions(category, difficulty, count = 5) {
  const catLabel = CATEGORY_LABELS[category] || category;

  const parsed = await askForJSON({
    system: buildQuestionGenPrompt(category, difficulty),
    user: `Generate ${count} ${difficulty} ${catLabel} challenge questions now.`,
    temperature: 0.75,
    maxTokens: 1200,
  });

  const raw = Array.isArray(parsed?.questions) ? parsed.questions : [];
  const questions = raw
    .filter(
      (q) =>
        q &&
        typeof q.question === "string" &&
        q.question.trim(),
    )
    .slice(0, count)
    .map((q, i) => ({
      index: i + 1,
      question: q.question.trim(),
      topic:
        typeof q.topic === "string" && q.topic.trim()
          ? q.topic.trim()
          : catLabel,
    }));

  // Deterministic fallback: if the model returns fewer questions than requested,
  // pad with generic ones so the challenge is always complete.
  while (questions.length < count) {
    const i = questions.length + 1;
    questions.push({
      index: i,
      question: fallbackQuestion(category, difficulty, i),
      topic: catLabel,
    });
  }

  return questions;
}

function fallbackQuestion(category, difficulty, index) {
  const templates = {
    technical: {
      easy: `Explain a fundamental concept in software engineering that every developer should know. (Question ${index})`,
      medium: `Describe how you would approach designing a scalable system component. (Question ${index})`,
      hard: `Walk through how you would optimize a high-traffic service experiencing latency issues. (Question ${index})`,
    },
    hr: {
      easy: `Tell me about yourself and your career goals. (Question ${index})`,
      medium: `Describe a challenging situation you faced at work and how you resolved it. (Question ${index})`,
      hard: `Give an example of a time you led a team through significant uncertainty. (Question ${index})`,
    },
    aptitude: {
      easy: `If a train travels 60 km in 45 minutes, what is its speed in km/h? (Question ${index})`,
      medium: `A sequence follows the pattern 2, 6, 18, 54. What is the next number? (Question ${index})`,
      hard: `In a group of 100 people, 60 speak English and 50 speak French. At least how many speak both? (Question ${index})`,
    },
    domain: {
      easy: `What is the difference between a frontend and backend developer? (Question ${index})`,
      medium: `Explain the key principles of agile development. (Question ${index})`,
      hard: `How would you architect a microservices system for a high-availability e-commerce platform? (Question ${index})`,
    },
    dsa: {
      easy: `What is the time complexity of binary search and why? (Question ${index})`,
      medium: `Explain how a hash map works and describe a collision resolution strategy. (Question ${index})`,
      hard: `Describe how you would detect a cycle in a directed graph and the algorithm's complexity. (Question ${index})`,
    },
  };
  return (
    templates[category]?.[difficulty] ||
    `Discuss a key concept relevant to this category. (Question ${index})`
  );
}

// ── Answer evaluation ──────────────────────────────────────

/**
 * Evaluate all submitted answers in a single AI call.
 * Returns per-answer scores (0-10) and feedback, plus an overall assessment.
 *
 * @param {Array<{index,question,topic}>} questions
 * @param {Array<{index,answer}>} answers
 * @param {string} category
 * @param {string} difficulty
 */
async function evaluateAnswers(questions, answers, category, difficulty) {
  const catLabel = CATEGORY_LABELS[category] || category;

  // Build a compact Q&A transcript.
  const transcript = questions
    .map((q) => {
      const a = answers.find((ans) => ans.index === q.index);
      const answerText =
        a && typeof a.answer === "string" && a.answer.trim()
          ? a.answer.trim()
          : "[No answer provided]";
      return `Q${q.index} [${q.topic}]: ${q.question}\nA${q.index}: ${answerText}`;
    })
    .join("\n\n");

  const systemPrompt = `You are an expert evaluator for a competitive interview challenge platform.
Evaluate the following ${catLabel} challenge answers (${difficulty} difficulty).

Scoring guide (0-10 integer per answer):
- 0-2:  No answer, completely off-topic, or fundamentally wrong
- 3-4:  Vague, partially incorrect, misses key ideas
- 5-7:  Correct but shallow or missing nuance
- 8-9:  Confident, accurate, well-structured, shows real depth
- 10:   Exceptional — includes trade-offs and edge cases unprompted

Rules:
- Score each answer independently.
- Feedback must be 1-2 sentences: constructive and specific.
- If no answer was provided, score it 0.
- Respond with STRICT JSON ONLY.

Format:
{
  "evaluations": [
    { "index": 1, "score": 0-10, "feedback": "..." },
    ...
  ]
}`.trim();

  const parsed = await askForJSON({
    system: systemPrompt,
    user: `Evaluate these ${catLabel} answers:\n\n${transcript}`,
    temperature: 0.4,
    maxTokens: 1200,
  });

  const raw = Array.isArray(parsed?.evaluations) ? parsed.evaluations : [];

  // Normalise — one entry per question, with safe defaults for missing ones.
  return questions.map((q) => {
    const ev = raw.find((e) => Number(e.index) === q.index);
    const rawScore = Number(ev?.score);
    const score = Number.isFinite(rawScore)
      ? Math.max(0, Math.min(10, Math.round(rawScore)))
      : 0;
    const feedback =
      typeof ev?.feedback === "string" && ev.feedback.trim()
        ? ev.feedback.trim()
        : score >= 7
          ? "Good answer."
          : "Could be more detailed and accurate.";
    return { index: q.index, score, feedback };
  });
}

// ── Points calculation ─────────────────────────────────────

/**
 * Compute total points earned for a completed attempt.
 * Called server-side only; the result is stored in the database.
 *
 * @param {Array<{score:number}>} evaluations  - Per-answer evaluations (score 0-10)
 * @param {string}  difficulty  - "easy" | "medium" | "hard"
 * @param {string}  type        - "daily" | "weekly"
 * @param {number|null} timeTakenSeconds
 * @param {number}  questionCount
 */
function computePoints(
  evaluations,
  difficulty,
  type,
  timeTakenSeconds,
  questionCount,
) {
  const base = BASE_POINTS[difficulty] || BASE_POINTS.medium;
  const allottedSeconds = questionCount * SECONDS_PER_QUESTION;

  let total = 0;
  for (const ev of evaluations) {
    const rawScore = Math.max(0, Math.min(10, ev.score || 0));
    let pts = base * (rawScore / 10);
    // Small time bonus per question if overall completion was fast.
    if (
      timeTakenSeconds != null &&
      timeTakenSeconds < allottedSeconds / 2
    ) {
      pts += base * TIME_BONUS_FRACTION;
    }
    total += pts;
  }

  // Type bonus (flat, awarded once per completion)
  total += TYPE_BONUS[type] || 0;

  return Math.round(total);
}

/**
 * Compute the 0-100 overall percentage score for a completed attempt.
 */
function computeOverallScore(evaluations) {
  if (!evaluations.length) return 0;
  const sum = evaluations.reduce((s, e) => s + (e.score || 0), 0);
  const avg = sum / evaluations.length; // 0-10
  return Math.round((avg / 10) * 100);
}

// ── Streak logic ───────────────────────────────────────────

/**
 * Update the user's streak fields in-place given a new completion.
 * Returns the mutated profile object (not saved — caller saves it).
 *
 * @param {object} profile   - UserArenaProfile document (mongoose doc or plain obj)
 * @param {Date}   completedAt
 */
function updateStreak(profile, completedAt = new Date()) {
  const todayKey = completedAt.toISOString().slice(0, 10);

  if (profile.lastCompletionDate === todayKey) {
    // Already completed something today — streak stays the same.
    return profile;
  }

  if (profile.lastCompletionDate) {
    const last = new Date(profile.lastCompletionDate);
    last.setUTCHours(0, 0, 0, 0);
    const today = new Date(todayKey);
    today.setUTCHours(0, 0, 0, 0);
    const diffDays = Math.round((today - last) / 86400000);

    if (diffDays === 1) {
      profile.currentStreak += 1;
    } else {
      // Gap — reset streak.
      profile.currentStreak = 1;
    }
  } else {
    // First ever completion.
    profile.currentStreak = 1;
  }

  if (profile.currentStreak > profile.longestStreak) {
    profile.longestStreak = profile.currentStreak;
  }

  profile.lastCompletionDate = todayKey;
  return profile;
}

// ── Achievement checking ───────────────────────────────────

/**
 * Return newly unlocked achievements (not already in the profile).
 *
 * @param {object} profile  - UserArenaProfile (after totalCompleted / streak updates)
 * @param {number|null} rank - Current leaderboard rank (1-based); null if unknown
 * @param {object} attempt  - ChallengeAttempt (with difficulty and totalScore)
 * @returns {Array} new achievements to push
 */
function checkAchievements(profile, rank, attempt) {
  const alreadyEarned = new Set((profile.achievements || []).map((a) => a.id));
  const newAchievements = [];

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (alreadyEarned.has(def.id)) continue;
    try {
      if (def.check(profile, rank, attempt)) {
        newAchievements.push({
          id: def.id,
          name: def.name,
          description: def.description,
          icon: def.icon,
          earnedAt: new Date(),
        });
      }
    } catch (err) {
      // A buggy check must never crash the submission flow.
      console.warn(`Achievement check '${def.id}' threw:`, err.message);
    }
  }

  return newAchievements;
}

// ── Challenge title generation (deterministic, no AI) ─────

const CATEGORY_TITLES = {
  technical: [
    "Engineering Deep Dive",
    "Tech Challenge",
    "Code & Concepts",
    "Systems Thinking",
    "Software Craft",
  ],
  hr: [
    "Behavioural Spotlight",
    "People Skills Check",
    "Soft Skills Challenge",
    "Leadership & Culture",
    "Communication Test",
  ],
  aptitude: [
    "Logic & Reasoning",
    "Number Crunch",
    "Pattern Recognition",
    "Verbal Reasoning",
    "Quick Thinking",
  ],
  domain: [
    "Industry Insider",
    "Domain Mastery",
    "Professional Knowledge",
    "Industry Spotlight",
    "Expert Check",
  ],
  dsa: [
    "Algorithm Arena",
    "Data Structures Duel",
    "Code Efficiency",
    "Algorithm Sprint",
    "DSA Showdown",
  ],
};

function generateTitle(category, difficulty, type) {
  const titles = CATEGORY_TITLES[category] || ["Challenge"];
  const seed = Math.floor(Date.now() / 86400000); // changes daily
  const title = titles[seed % titles.length];
  return `${title} — ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} ${type === "weekly" ? "(Weekly)" : "(Daily)"}`;
}

module.exports = {
  generateChallengeQuestions,
  evaluateAnswers,
  computePoints,
  computeOverallScore,
  updateStreak,
  checkAchievements,
  generateTitle,
  dailyKey,
  weeklyKey,
  dailyExpiry,
  weeklyExpiry,
  ACHIEVEMENT_DEFINITIONS,
  CATEGORY_LABELS,
};
