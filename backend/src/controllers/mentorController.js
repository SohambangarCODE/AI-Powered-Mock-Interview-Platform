/**
 * Mentor Controller — student visibility and feedback operations.
 *
 * All handlers are protected at the route layer (mentorRoutes.js).
 * Mentors can view all students (platform-wide). Assignment-based scoping
 * can be added later by introducing a MentorAssignment model without
 * changing this controller's structure.
 */

const User = require("../models/userModel");
const Interview = require("../models/interview");
const Feedback = require("../models/feedbackModel");

// ── GET /api/mentor/students ──────────────────────────────────────────────────
// List all users with Student role. Safe fields only — no passwords, tokens, etc.
const listStudents = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || "1", 10));
    const limit = Math.min(100, parseInt(req.query.limit || "20", 10));
    const skip  = (page - 1) * limit;

    const [students, total] = await Promise.all([
      User.find({ role: "Student" })
        .select("name email createdAt isEmailVerified")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments({ role: "Student" }),
    ]);

    res.json({
      students,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("listStudents error:", err);
    res.status(500).json({ message: "Failed to fetch students.", error: err.message });
  }
};

// ── GET /api/mentor/students/:id ──────────────────────────────────────────────
const getStudent = async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: "Student" })
      .select("name email createdAt isEmailVerified")
      .lean();

    if (!student) return res.status(404).json({ message: "Student not found." });
    res.json({ student });
  } catch (err) {
    console.error("getStudent error:", err);
    res.status(500).json({ message: "Failed to fetch student.", error: err.message });
  }
};

// ── GET /api/mentor/students/:id/interviews ───────────────────────────────────
// View a student's completed interviews (for performance review).
const getStudentInterviews = async (req, res) => {
  try {
    // Verify target is a student (prevent mentors from querying other mentors' data)
    const student = await User.findOne({ _id: req.params.id, role: "Student" })
      .select("name email")
      .lean();
    if (!student) return res.status(404).json({ message: "Student not found." });

    const interviews = await Interview.find({
      userId: req.params.id,
      isComplete: true,
    })
      .select("domain score duration questionsAnswered skippedCount createdAt report company")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      student,
      interviews: interviews.map((i) => ({
        id: i._id,
        domain: i.domain,
        score: i.score,
        duration: i.duration,
        questionsAnswered: i.questionsAnswered,
        skippedCount: i.skippedCount,
        date: i.createdAt,
        averageAnswerScore: i.report?.averageAnswerScore ?? null,
        company: i.company ? { name: i.company.name, roleLabel: i.company.roleLabel } : null,
      })),
    });
  } catch (err) {
    console.error("getStudentInterviews error:", err);
    res.status(500).json({ message: "Failed to fetch student interviews.", error: err.message });
  }
};

// ── POST /api/mentor/students/:id/feedback ────────────────────────────────────
const submitFeedback = async (req, res) => {
  try {
    const { content, interviewId } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Feedback content is required." });
    }
    if (content.length > 5000) {
      return res.status(400).json({ message: "Feedback must be under 5000 characters." });
    }

    // Verify target is a student
    const student = await User.findOne({ _id: req.params.id, role: "Student" })
      .select("_id name")
      .lean();
    if (!student) return res.status(404).json({ message: "Student not found." });

    const feedback = await Feedback.create({
      mentorId: req.user._id,
      studentId: req.params.id,
      interviewId: interviewId || null,
      content: content.trim(),
    });

    res.status(201).json({
      message: "Feedback submitted successfully.",
      feedback: {
        id: feedback._id,
        studentId: feedback.studentId,
        content: feedback.content,
        interviewId: feedback.interviewId,
        createdAt: feedback.createdAt,
      },
    });
  } catch (err) {
    console.error("submitFeedback error:", err);
    res.status(500).json({ message: "Failed to submit feedback.", error: err.message });
  }
};

// ── GET /api/mentor/students/:id/feedback ─────────────────────────────────────
// View feedback this mentor has written for a student.
const getStudentFeedback = async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: "Student" })
      .select("name email")
      .lean();
    if (!student) return res.status(404).json({ message: "Student not found." });

    const feedback = await Feedback.find({
      studentId: req.params.id,
      mentorId: req.user._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ student, feedback });
  } catch (err) {
    console.error("getStudentFeedback error:", err);
    res.status(500).json({ message: "Failed to fetch feedback.", error: err.message });
  }
};

module.exports = {
  listStudents,
  getStudent,
  getStudentInterviews,
  submitFeedback,
  getStudentFeedback,
};
