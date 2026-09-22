const mongoose = require("mongoose");

/**
 * Feedback — a mentor's written evaluation for a student.
 *
 * Lightweight: mentors write free-form notes. The `interviewId` field is
 * optional — feedback can be general or tied to a specific session.
 */
const feedbackSchema = new mongoose.Schema({
  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  // Optional: tie feedback to a specific interview session.
  interviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Interview",
    default: null,
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Feedback", feedbackSchema);
