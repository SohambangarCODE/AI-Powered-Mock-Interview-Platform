const {
  ChallengeTemplate,
  ChallengeAttempt,
  UserArenaProfile,
} = require("../models/challengeModel");

const {
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
} = require("../utils/challengeEngine");

// ── Helpers ────────────────────────────────────────────────

/** Return or create the UserArenaProfile for a user. */
async function getOrCreateProfile(userId) {
  let profile = await UserArenaProfile.findOne({ userId });
  if (!profile) {
    profile = await UserArenaProfile.create({ userId });
  }
  return profile;
}

/**
 * Compute the 1-based leaderboard rank of a user by their total points.
 * Returns null when the user has no profile yet.
 */
async function getUserRank(userId) {
  const profile = await UserArenaProfile.findOne({ userId });
  if (!profile) return null;

  const rank = await UserArenaProfile.countDocuments({
    totalPoints: { $gt: profile.totalPoints },
  });
  return rank + 1; // 1-based
}

// ── GET /api/arena/challenges ──────────────────────────────
// Lists available (non-expired) challenges.
// Optional query params: type, category, difficulty
const getChallenges = async (req, res) => {
  try {
    const { type, category, difficulty } = req.query;
    const now = new Date();
    const filter = { expiresAt: { $gte: now } };
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;

    const challenges = await ChallengeTemplate.find(filter)
      .select("-questions") // questions returned only when starting
      .sort({ type: 1, difficulty: 1, category: 1 })
      .lean();

    // Mark whether this user has already attempted each challenge.
    const ids = challenges.map((c) => c._id);
    const attempts = await ChallengeAttempt.find({
      userId: req.userId,
      challengeId: { $in: ids },
    })
      .select("challengeId status totalScore pointsEarned completedAt")
      .lean();

    const attemptMap = {};
    for (const a of attempts) {
      attemptMap[String(a.challengeId)] = a;
    }

    const enriched = challenges.map((c) => {
      const attempt = attemptMap[String(c._id)] || null;
      return {
        ...c,
        attempt: attempt
          ? {
              id: attempt._id,
              status: attempt.status,
              totalScore: attempt.totalScore,
              pointsEarned: attempt.pointsEarned,
              completedAt: attempt.completedAt,
            }
          : null,
      };
    });

    res.json({ challenges: enriched });
  } catch (err) {
    console.error("getChallenges error:", err);
    res.status(500).json({ message: "Failed to fetch challenges", error: err.message });
  }
};

// ── POST /api/arena/challenges/:id/start ──────────────────
// Creates (or returns) a ChallengeAttempt for this user+challenge.
// Idempotent: second call returns the existing attempt.
const startChallenge = async (req, res) => {
  try {
    const challenge = await ChallengeTemplate.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({ message: "Challenge not found" });
    }
    if (challenge.expiresAt < new Date()) {
      return res.status(410).json({ message: "This challenge has expired" });
    }

    // Check for an existing attempt.
    let attempt = await ChallengeAttempt.findOne({
      userId: req.userId,
      challengeId: challenge._id,
    });

    if (attempt) {
      // Return existing attempt (may be completed or in-progress).
      return res.json({
        attemptId: attempt._id,
        status: attempt.status,
        alreadyStarted: true,
        challenge: {
          id: challenge._id,
          title: challenge.title,
          category: challenge.category,
          difficulty: challenge.difficulty,
          type: challenge.type,
          questions: challenge.questions,
          questionCount: challenge.questionCount,
          expiresAt: challenge.expiresAt,
        },
      });
    }

    // ── Find-or-create with race-condition safety ──────────
    // Two requests can arrive simultaneously (e.g. React Strict Mode
    // double-fires useEffect in development, or a user double-clicks).
    // Both pass the findOne check above before either write commits, then
    // both try create() — the loser hits the unique index (E11000).
    // We catch that specific error and fetch the document the winner created.
    let isNew = true;
    try {
      attempt = await ChallengeAttempt.create({
        userId: req.userId,
        challengeId: challenge._id,
        category: challenge.category,
        difficulty: challenge.difficulty,
        type: challenge.type,
        title: challenge.title,
      });
    } catch (createErr) {
      if (createErr.code === 11000) {
        // Duplicate key — the concurrent request already created the attempt.
        attempt = await ChallengeAttempt.findOne({
          userId: req.userId,
          challengeId: challenge._id,
        });
        if (!attempt) throw createErr; // should never happen, but be safe
        isNew = false;
      } else {
        throw createErr; // genuine error — re-throw so outer catch handles it
      }
    }

    const challengePayload = {
      id: challenge._id,
      title: challenge.title,
      category: challenge.category,
      difficulty: challenge.difficulty,
      type: challenge.type,
      questions: challenge.questions,
      questionCount: challenge.questionCount,
      expiresAt: challenge.expiresAt,
    };

    res.status(isNew ? 201 : 200).json({
      attemptId: attempt._id,
      status: attempt.status,
      alreadyStarted: !isNew || attempt.status === "completed",
      challenge: challengePayload,
    });
  } catch (err) {
    console.error("startChallenge error:", err);
    res.status(500).json({ message: "Failed to start challenge", error: err.message });
  }
};

// ── POST /api/arena/attempts/:id/submit ───────────────────
// Evaluates answers, computes score & points, updates profile.
// All scoring is server-side. The frontend sends raw answer strings only.
const submitChallenge = async (req, res) => {
  try {
    const attempt = await ChallengeAttempt.findOne({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }
    if (attempt.status === "completed") {
      // Idempotent: return cached result.
      return res.json({
        alreadyCompleted: true,
        totalScore: attempt.totalScore,
        pointsEarned: attempt.pointsEarned,
        answers: attempt.answers,
        completedAt: attempt.completedAt,
      });
    }

    const challenge = await ChallengeTemplate.findById(attempt.challengeId);
    if (!challenge) {
      return res.status(404).json({ message: "Challenge template not found" });
    }

    // ── Validate submitted answers ───────────────────────
    const { answers: rawAnswers } = req.body;
    if (!Array.isArray(rawAnswers) || rawAnswers.length === 0) {
      return res.status(400).json({ message: "answers array is required" });
    }

    // Normalise: only accept index+answer; strip everything else.
    const sanitised = rawAnswers.map((a) => ({
      index: Number(a.index),
      answer:
        typeof a.answer === "string" ? a.answer.trim().slice(0, 3000) : "",
    }));

    // ── AI evaluation (server-side) ──────────────────────
    const evaluations = await evaluateAnswers(
      challenge.questions,
      sanitised,
      challenge.category,
      challenge.difficulty,
    );

    const totalScore = computeOverallScore(evaluations);

    const timeTakenSeconds =
      attempt.startedAt
        ? Math.round((Date.now() - new Date(attempt.startedAt).getTime()) / 1000)
        : null;

    const pointsEarned = computePoints(
      evaluations,
      challenge.difficulty,
      challenge.type,
      timeTakenSeconds,
      challenge.questions.length,
    );

    // Build answer records.
    const answerDocs = challenge.questions.map((q) => {
      const sub = sanitised.find((a) => a.index === q.index);
      const ev = evaluations.find((e) => e.index === q.index);
      return {
        index: q.index,
        answer: sub?.answer || "",
        score: ev?.score ?? 0,
        feedback: ev?.feedback || "",
        points: Math.round(
          (BASE_POINTS_MAP[challenge.difficulty] || 20) * ((ev?.score || 0) / 10),
        ),
      };
    });

    // ── Persist attempt ──────────────────────────────────
    attempt.answers = answerDocs;
    attempt.totalScore = totalScore;
    attempt.pointsEarned = pointsEarned;
    attempt.status = "completed";
    attempt.completedAt = new Date();
    attempt.timeTakenSeconds = timeTakenSeconds;
    await attempt.save();

    // ── Update user arena profile ────────────────────────
    const profile = await getOrCreateProfile(req.userId);
    profile.totalPoints += pointsEarned;
    profile.totalCompleted += 1;
    updateStreak(profile, attempt.completedAt);
    profile.updatedAt = new Date();

    // Record current rank snapshot.
    const rank = await getUserRank(req.userId);

    // Check for new achievements.
    const newAchievements = checkAchievements(profile, rank, {
      difficulty: challenge.difficulty,
      type: challenge.type,
      totalScore,
    });
    profile.achievements.push(...newAchievements);

    // Record rank history entry.
    profile.rankHistory.push({
      rank: rank || 0,
      points: profile.totalPoints,
      recordedAt: new Date(),
    });
    // Keep history compact — last 50 entries only.
    if (profile.rankHistory.length > 50) {
      profile.rankHistory = profile.rankHistory.slice(-50);
    }

    await profile.save();

    res.json({
      totalScore,
      pointsEarned,
      answers: answerDocs,
      completedAt: attempt.completedAt,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      totalPoints: profile.totalPoints,
      newAchievements,
      rank,
    });
  } catch (err) {
    console.error("submitChallenge error:", err);
    res.status(500).json({ message: "Failed to submit challenge", error: err.message });
  }
};

// Inline copy for point-per-answer breakdown (avoids requiring the engine module twice).
const BASE_POINTS_MAP = { easy: 10, medium: 20, hard: 35 };

// ── GET /api/arena/attempts/:id ────────────────────────────
// Returns a completed attempt. Only the owner can access it.
const getAttemptResult = async (req, res) => {
  try {
    const attempt = await ChallengeAttempt.findOne({
      _id: req.params.id,
      userId: req.userId,
    }).lean();
    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    const challenge = await ChallengeTemplate.findById(attempt.challengeId)
      .select("title category difficulty type questions questionCount expiresAt")
      .lean();

    res.json({ attempt, challenge });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch attempt", error: err.message });
  }
};

// ── GET /api/arena/me/history ──────────────────────────────
const getAttemptHistory = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [attempts, total] = await Promise.all([
      ChallengeAttempt.find({ userId: req.userId, status: "completed" })
        .sort({ completedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-answers") // lightweight for history list
        .lean(),
      ChallengeAttempt.countDocuments({ userId: req.userId, status: "completed" }),
    ]);

    res.json({ attempts, total, page, limit });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch history", error: err.message });
  }
};

// ── GET /api/arena/leaderboard ─────────────────────────────
const getLeaderboard = async (req, res) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit) || 20);

    const profiles = await UserArenaProfile.find({ totalPoints: { $gt: 0 } })
      .sort({ totalPoints: -1 })
      .limit(limit)
      .populate("userId", "name") // only name, no email
      .lean();

    const rows = profiles.map((p, i) => ({
      rank: i + 1,
      userId: p.userId?._id,
      name: p.userId?.name || "Anonymous",
      totalPoints: p.totalPoints,
      totalCompleted: p.totalCompleted,
      currentStreak: p.currentStreak,
      longestStreak: p.longestStreak,
      achievementCount: (p.achievements || []).length,
      isCurrentUser: String(p.userId?._id) === String(req.userId),
    }));

    // Also compute current user's rank even if not in top-N.
    const myRank = await getUserRank(req.userId);
    const myProfile = await UserArenaProfile.findOne({ userId: req.userId })
      .select("totalPoints totalCompleted currentStreak longestStreak achievements")
      .lean();

    res.json({
      leaderboard: rows,
      currentUser: myProfile
        ? {
            rank: myRank,
            totalPoints: myProfile.totalPoints,
            totalCompleted: myProfile.totalCompleted,
            currentStreak: myProfile.currentStreak,
            longestStreak: myProfile.longestStreak,
            achievementCount: (myProfile.achievements || []).length,
          }
        : null,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch leaderboard", error: err.message });
  }
};

// ── GET /api/arena/me ──────────────────────────────────────
const getMyProfile = async (req, res) => {
  try {
    const profile = await UserArenaProfile.findOne({ userId: req.userId }).lean();
    const rank = await getUserRank(req.userId);

    if (!profile) {
      return res.json({
        profile: null,
        rank: null,
        message: "No arena activity yet",
      });
    }

    res.json({ profile, rank });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch profile", error: err.message });
  }
};

// ── GET /api/arena/me/achievements ────────────────────────
const getAchievements = async (req, res) => {
  try {
    const profile = await UserArenaProfile.findOne({ userId: req.userId })
      .select("achievements totalCompleted longestStreak")
      .lean();

    const earned = new Set((profile?.achievements || []).map((a) => a.id));
    const earnedMap = {};
    for (const a of profile?.achievements || []) {
      earnedMap[a.id] = a;
    }

    const all = ACHIEVEMENT_DEFINITIONS.map((def) => ({
      id: def.id,
      name: def.name,
      description: def.description,
      icon: def.icon,
      earned: earned.has(def.id),
      earnedAt: earnedMap[def.id]?.earnedAt || null,
    }));

    res.json({ achievements: all });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch achievements", error: err.message });
  }
};

// ── Seed helpers (called from index.js on boot) ────────────

const DEFAULT_CHALLENGE_CONFIG = [
  { category: "technical", difficulty: "medium", questionCount: 5 },
  { category: "hr",        difficulty: "easy",   questionCount: 5 },
  { category: "dsa",       difficulty: "medium", questionCount: 5 },
  { category: "aptitude",  difficulty: "easy",   questionCount: 5 },
  { category: "domain",    difficulty: "hard",   questionCount: 5 },
];

/**
 * Create today's daily challenges if they don't exist yet.
 * Called once at boot; failures are logged and tolerated.
 */
async function seedDailyChallenges() {
  const key = dailyKey();
  const expiry = dailyExpiry();
  let created = 0;

  for (const cfg of DEFAULT_CHALLENGE_CONFIG) {
    const exists = await ChallengeTemplate.findOne({
      type: "daily",
      category: cfg.category,
      difficulty: cfg.difficulty,
      periodKey: key,
    });
    if (exists) continue;

    const questions = await generateChallengeQuestions(
      cfg.category,
      cfg.difficulty,
      cfg.questionCount,
    );
    const title = generateTitle(cfg.category, cfg.difficulty, "daily");

    await ChallengeTemplate.create({
      type: "daily",
      category: cfg.category,
      difficulty: cfg.difficulty,
      title,
      description: `Today's ${CATEGORY_LABELS[cfg.category]} challenge`,
      questions,
      questionCount: cfg.questionCount,
      periodKey: key,
      expiresAt: expiry,
    });
    created++;
  }
  return { created };
}

/**
 * Create this week's weekly challenges if they don't exist yet.
 */
async function seedWeeklyChallenges() {
  const WEEKLY_CONFIG = [
    { category: "technical", difficulty: "hard",   questionCount: 8 },
    { category: "dsa",       difficulty: "hard",   questionCount: 8 },
    { category: "domain",    difficulty: "medium", questionCount: 8 },
  ];

  const key = weeklyKey();
  const expiry = weeklyExpiry();
  let created = 0;

  for (const cfg of WEEKLY_CONFIG) {
    const exists = await ChallengeTemplate.findOne({
      type: "weekly",
      category: cfg.category,
      difficulty: cfg.difficulty,
      periodKey: key,
    });
    if (exists) continue;

    const questions = await generateChallengeQuestions(
      cfg.category,
      cfg.difficulty,
      cfg.questionCount,
    );
    const title = generateTitle(cfg.category, cfg.difficulty, "weekly");

    await ChallengeTemplate.create({
      type: "weekly",
      category: cfg.category,
      difficulty: cfg.difficulty,
      title,
      description: `This week's ${CATEGORY_LABELS[cfg.category]} challenge`,
      questions,
      questionCount: cfg.questionCount,
      periodKey: key,
      expiresAt: expiry,
    });
    created++;
  }
  return { created };
}

module.exports = {
  getChallenges,
  startChallenge,
  submitChallenge,
  getAttemptResult,
  getAttemptHistory,
  getLeaderboard,
  getMyProfile,
  getAchievements,
  seedDailyChallenges,
  seedWeeklyChallenges,
};
