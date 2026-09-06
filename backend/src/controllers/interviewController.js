const Interview = require("../models/interview");
const { findProfile } = require("../models/companyProfile");
const { resolveSelection } = require("../config/companyProfiles");
const { isRepeatedAnswer } = require("../utils/textUtils");
const {
  MIN_QUESTIONS,
  MAX_QUESTIONS,
  generateOpeningQuestion,
  requestNextStep,
  buildReport,
  companyContext,
} = require("../utils/interviewEngine");

const minutesSince = (date) =>
  Math.max(1, Math.round((Date.now() - new Date(date).getTime()) / 60000));

// ── Start Interview ───────────────────────────────────────
// Two entry points, one engine: a plain mock interview (just `domain`) or an
// AI Recruiter Simulator round (`companySlug` + `roleId` + `roundId`). In the
// company case the domain comes from the resolved profile, never from the
// client, so an arbitrary domain can't ride in on a company session.
const startInterview = async (req, res) => {
  try {
    const { domain: requestedDomain, companySlug, roleId, roundId } = req.body;

    let company = null;
    let companyMeta = undefined;
    let domain = requestedDomain;
    let startDifficulty;

    if (companySlug) {
      const profile = await findProfile(companySlug);
      const selection = profile
        ? resolveSelection({ companySlug, roleId, roundId }, profile)
        : null;

      if (!selection)
        return res.status(400).json({
          message: "Unknown company, role or round for this simulation",
        });

      domain = selection.domain;
      startDifficulty = selection.startDifficulty;

      companyMeta = {
        slug: selection.profile.slug,
        name: selection.profile.name,
        roleId: selection.role.id,
        roleLabel: selection.role.label,
        roundId: selection.round.id,
        roundLabel: selection.round.label,
        expectedStandard: selection.profile.expectedStandard || {},
      };

      // The engine wants the flattened prompt context, which it derives from a
      // saved interview — build the same shape from an unsaved stand-in, reusing
      // the profile already resolved above (which may be the DB copy).
      company = companyContext({ company: companyMeta }, selection.profile);
    }

    if (!domain) return res.status(400).json({ message: "Domain is required" });

    const { question, topic, difficulty } = await generateOpeningQuestion(domain, {
      company,
      startDifficulty,
    });

    const interview = await Interview.create({
      userId: req.userId,
      domain,
      currentDifficulty: difficulty,
      askedTopics: [topic],
      turns: [{ index: 1, topic, difficulty, question }],
      messages: [
        { role: "ai", kind: "question", content: question, difficulty, topic },
      ],
      ...(companyMeta ? { company: companyMeta } : {}),
    });

    res.status(201).json({
      sessionId: interview._id,
      question,
      difficulty,
      topic,
      turnIndex: 1,
      answeredCount: 0,
      skippedCount: 0,
      minQuestions: MIN_QUESTIONS,
      maxQuestions: MAX_QUESTIONS,
      ...(companyMeta ? { domain, company: companyMeta } : {}),
    });
  } catch (error) {
    console.error("Error starting interview:", error);
    res
      .status(500)
      .json({ message: "Error starting interview", error: error.message });
  }
};

// ── Submit Answer (core adaptive loop) ─────────────────────
const submitAnswer = async (req, res) => {
  try {
    const { sessionId, answer, skipped = false } = req.body;
    const trimmed = typeof answer === "string" ? answer.trim() : "";

    if (!sessionId)
      return res.status(400).json({ message: "sessionId is required" });
    if (!skipped && !trimmed)
      return res.status(400).json({ message: "An answer is required" });

    const interview = await Interview.findOne({
      _id: sessionId,
      userId: req.userId,
      isComplete: false,
    });
    if (!interview)
      return res
        .status(404)
        .json({ message: "Session not found or already complete" });

    const openTurn = interview.openTurn();
    if (!openTurn)
      return res
        .status(409)
        .json({ message: "No question is awaiting an answer" });

    // ── Repeated answer — nudge, don't spend an AI call or a turn ──
    if (!skipped && isRepeatedAnswer(trimmed, interview.previousAnswers())) {
      const nudge =
        "That's essentially the same as an answer you've already given. Could you elaborate, or add more technical detail?";

      interview.messages.push({ role: "user", kind: "answer", content: trimmed });
      interview.messages.push({
        role: "ai",
        kind: "nudge",
        content: nudge,
        topic: openTurn.topic,
        difficulty: openTurn.difficulty,
      });
      interview.lastActivityAt = new Date();
      await interview.save();

      return res.json({
        repeated: true,
        feedback: nudge,
        // The open turn's own question — not "the last ai message", which after
        // a nudge would hand back the nudge text itself.
        nextQuestion: openTurn.question,
        topic: openTurn.topic,
        difficulty: interview.currentDifficulty,
        turnIndex: openTurn.index,
        answeredCount: interview.questionsAnswered,
        skippedCount: interview.skippedCount,
        isComplete: false,
      });
    }

    const answerText = skipped ? "[The candidate skipped this question]" : trimmed;

    // The AI call happens BEFORE any mutation, so a Groq failure can't leave the
    // transcript holding an answer with no feedback or follow-up question.
    const decision = await requestNextStep({ interview, answerText, skipped });

    // ── Commit the turn ───────────────────────────────────
    openTurn.answer = skipped ? "" : trimmed;
    openTurn.skipped = skipped;
    openTurn.score = skipped ? null : decision.score;
    openTurn.feedback = decision.feedback;
    openTurn.answeredAt = new Date();

    interview.messages.push({
      role: "user",
      kind: "answer",
      content: skipped ? "[Question skipped]" : trimmed,
      skipped,
      topic: openTurn.topic,
      difficulty: openTurn.difficulty,
      score: openTurn.score,
    });
    interview.messages.push({
      role: "ai",
      kind: "feedback",
      content: decision.feedback,
      topic: openTurn.topic,
      difficulty: openTurn.difficulty,
      score: openTurn.score,
    });

    if (skipped) interview.skippedCount += 1;
    else interview.questionsAnswered += 1;

    interview.currentDifficulty = decision.nextDifficulty;
    interview.lastActivityAt = new Date();

    // ── Complete ──────────────────────────────────────────
    if (decision.shouldEnd) {
      const report = await buildReport(interview);

      interview.isComplete = true;
      interview.feedback = decision.feedback;
      interview.score = report.overallScore;
      interview.report = report;
      interview.endReason = decision.endReason || "Interview complete";
      interview.duration = minutesSince(interview.createdAt);
      await interview.save();

      return res.json({
        score: openTurn.score,
        feedback: decision.feedback,
        difficulty: decision.nextDifficulty,
        answeredCount: interview.questionsAnswered,
        skippedCount: interview.skippedCount,
        isComplete: true,
        overallScore: report.overallScore,
        report,
        endReason: interview.endReason,
      });
    }

    // ── Next question ─────────────────────────────────────
    const nextIndex = interview.turns.length + 1;
    interview.turns.push({
      index: nextIndex,
      topic: decision.nextTopic,
      difficulty: decision.nextDifficulty,
      question: decision.nextQuestion,
    });
    interview.askedTopics.push(decision.nextTopic);
    interview.messages.push({
      role: "ai",
      kind: "question",
      content: decision.nextQuestion,
      difficulty: decision.nextDifficulty,
      topic: decision.nextTopic,
    });

    await interview.save();

    return res.json({
      score: openTurn.score,
      feedback: decision.feedback,
      nextQuestion: decision.nextQuestion,
      difficulty: decision.nextDifficulty,
      difficultyChange: decision.decision,
      topic: decision.nextTopic,
      turnIndex: nextIndex,
      answeredCount: interview.questionsAnswered,
      skippedCount: interview.skippedCount,
      isComplete: false,
      skipped,
    });
  } catch (err) {
    // Two answers submitted for the same session at once — the second lost the
    // race against the first's array writes.
    if (err.name === "VersionError")
      return res
        .status(409)
        .json({ message: "That answer collided with another. Please retry." });

    console.error("submitAnswer error:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// ── End early and grade what exists ───────────────────────
const finishInterview = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!interview)
      return res.status(404).json({ message: "Interview not found" });

    if (interview.isComplete)
      return res.json({
        isComplete: true,
        overallScore: interview.score,
        report: interview.report,
        endReason: interview.endReason,
      });

    const answered = interview.turns.filter((t) => t.answeredAt);

    // Nothing to grade — a report over zero answers is noise, so drop the
    // session instead of leaving a dead row in the user's history.
    if (answered.length === 0) {
      await interview.deleteOne();
      return res.json({ discarded: true, isComplete: false });
    }

    const report = await buildReport(interview);

    interview.isComplete = true;
    interview.score = report.overallScore;
    interview.report = report;
    interview.endReason = "Ended early by candidate";
    interview.duration = minutesSince(interview.createdAt);
    interview.lastActivityAt = new Date();
    await interview.save();

    res.json({
      isComplete: true,
      overallScore: report.overallScore,
      report,
      endReason: interview.endReason,
    });
  } catch (err) {
    console.error("finishInterview error:", err);
    res.status(500).json({ message: "Failed to finish interview", error: err.message });
  }
};

// ── In-progress sessions (for "continue where you left off") ─
const getActiveInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({
      userId: req.userId,
      isComplete: false,
    })
      .select("domain currentDifficulty questionsAnswered skippedCount turns lastActivityAt createdAt company")
      .sort({ lastActivityAt: -1 })
      .limit(5);

    const active = interviews
      // A session with no answers yet is just an abandoned click — not worth
      // offering back to the user.
      .filter((i) => i.questionsAnswered > 0 || i.skippedCount > 0)
      .map((i) => ({
        id: i._id,
        domain: i.domain,
        currentDifficulty: i.currentDifficulty,
        answeredCount: i.questionsAnswered,
        skippedCount: i.skippedCount,
        turnIndex: i.turns.length,
        lastActivityAt: i.lastActivityAt || i.createdAt,
        // Present only on simulator sessions, so the resume card can label them.
        company: i.company
          ? {
              slug: i.company.slug,
              name: i.company.name,
              roleLabel: i.company.roleLabel,
              roundLabel: i.company.roundLabel,
            }
          : null,
      }));

    res.json({ active });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch active sessions", error: err.message });
  }
};

// ── Get All Completed Interviews ──────────────────────────
const getInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({ userId: req.userId, isComplete: true })
      .select("domain score duration questionsAnswered skippedCount createdAt currentDifficulty report company")
      .sort({ createdAt: -1 });

    const mapped = interviews.map((i) => ({
      id: i._id,
      topic: i.domain,
      score: i.score,
      duration: i.duration,
      date: i.createdAt,
      finalDifficulty: i.currentDifficulty,
      questionsAnswered: i.questionsAnswered,
      skippedCount: i.skippedCount,
      averageAnswerScore: i.report?.averageAnswerScore ?? null,
      company: i.company
        ? {
            slug: i.company.slug,
            name: i.company.name,
            roleLabel: i.company.roleLabel,
            roundLabel: i.company.roundLabel,
            meetsStandard: i.report?.company?.meetsStandard ?? null,
          }
        : null,
    }));

    res.json({ interviews: mapped });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch interviews", error: err.message });
  }
};

// ── Get Single Interview ──────────────────────────────────
const getInterview = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!interview)
      return res.status(404).json({ message: "Interview not found" });

    res.json({
      interview,
      meta: { minQuestions: MIN_QUESTIONS, maxQuestions: MAX_QUESTIONS },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ── Discard a session ─────────────────────────────────────
const deleteInterview = async (req, res) => {
  try {
    const result = await Interview.deleteOne({
      _id: req.params.id,
      userId: req.userId,
    });
    if (result.deletedCount === 0)
      return res.status(404).json({ message: "Interview not found" });

    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete interview", error: err.message });
  }
};

module.exports = {
  startInterview,
  submitAnswer,
  finishInterview,
  getActiveInterviews,
  getInterviews,
  getInterview,
  deleteInterview,
};
