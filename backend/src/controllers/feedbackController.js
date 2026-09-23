/**
 * Feedback Controller — student-facing operations.
 *
 * Students can read all feedback that mentors have written for them.
 * Protected at the route layer by feedbackRoutes.js (interview.read permission).
 */

const Feedback = require("../models/feedbackModel");
const User = require("../models/userModel");

// ── GET /api/feedback/mine ─────────────────────────────────────────────────────
// Returns all feedback written for the currently logged-in student,
// ordered newest-first, with mentor name included.
const getMyFeedback = async (req, res) => {
  try {
    // Only applicable for students; other roles have no feedback written "for them".
    const feedback = await Feedback.find({ studentId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    // Populate mentor names (avoid full populate overhead for simple name lookup).
    const mentorIds = [...new Set(feedback.map((f) => String(f.mentorId)))];
    const mentors = await User.find({ _id: { $in: mentorIds } })
      .select("name")
      .lean();
    const mentorMap = Object.fromEntries(mentors.map((m) => [String(m._id), m.name]));

    res.json({
      feedback: feedback.map((f) => ({
        id: f._id,
        content: f.content,
        interviewId: f.interviewId,
        mentorName: mentorMap[String(f.mentorId)] ?? "Mentor",
        createdAt: f.createdAt,
      })),
    });
  } catch (err) {
    console.error("getMyFeedback error:", err);
    res.status(500).json({ message: "Failed to fetch your feedback.", error: err.message });
  }
};

module.exports = { getMyFeedback };
