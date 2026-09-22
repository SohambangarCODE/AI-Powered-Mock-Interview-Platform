/**
 * Admin Controller — platform-wide management operations.
 *
 * All handlers in this file require Administrator-level permissions and are
 * protected at the route layer (adminRoutes.js). Controllers themselves apply
 * no extra auth — the middleware chain enforces it.
 */

const User = require("../models/userModel");
const Interview = require("../models/interview");
const {
  ChallengeTemplate,
  ChallengeAttempt,
} = require("../models/challengeModel");
const { ROLE_PERMISSIONS } = require("../config/rolesConfig");

const SAFE_USER_FIELDS = "name email role isEmailVerified createdAt";

// ── GET /api/admin/users ──────────────────────────────────────────────────────
// List all users (paginated). Exposes only non-sensitive fields.
const listUsers = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || "1", 10));
    const limit = Math.min(100, parseInt(req.query.limit || "20", 10));
    const skip  = (page - 1) * limit;

    // Optional filter by role
    const filter = {};
    if (req.query.role && ["Student", "Mentor", "Administrator"].includes(req.query.role)) {
      filter.role = req.query.role;
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select(SAFE_USER_FIELDS)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("listUsers error:", err);
    res.status(500).json({ message: "Failed to fetch users.", error: err.message });
  }
};

// ── GET /api/admin/users/:id ──────────────────────────────────────────────────
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select(SAFE_USER_FIELDS)
      .lean();
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json({ user });
  } catch (err) {
    console.error("getUser error:", err);
    res.status(500).json({ message: "Failed to fetch user.", error: err.message });
  }
};

// ── PATCH /api/admin/users/:id/role ──────────────────────────────────────────
// Change a user's role. Administrators cannot demote themselves.
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = Object.keys(ROLE_PERMISSIONS);

    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        message: `Invalid role. Valid options: ${validRoles.join(", ")}.`,
      });
    }

    // Security: prevent self-demotion to avoid locking out the last admin.
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        message: "Administrators cannot change their own role through this API.",
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    user.role = role;
    await user.save();

    res.json({
      message: `User role updated to ${role}.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("updateUserRole error:", err);
    res.status(500).json({ message: "Failed to update role.", error: err.message });
  }
};

// ── GET /api/admin/analytics ──────────────────────────────────────────────────
// Platform-wide aggregate statistics.
const getAnalytics = async (req, res) => {
  try {
    const [
      totalUsers,
      studentCount,
      mentorCount,
      adminCount,
      totalInterviews,
      completedInterviews,
      totalChallenges,
      completedAttempts,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "Student" }),
      User.countDocuments({ role: "Mentor" }),
      User.countDocuments({ role: "Administrator" }),
      Interview.countDocuments(),
      Interview.countDocuments({ isComplete: true }),
      ChallengeTemplate.countDocuments(),
      ChallengeAttempt.countDocuments({ status: "completed" }),
    ]);

    // Average interview score across all completed sessions.
    const scoreAgg = await Interview.aggregate([
      { $match: { isComplete: true, score: { $exists: true, $ne: null } } },
      { $group: { _id: null, avgScore: { $avg: "$score" } } },
    ]);
    const avgInterviewScore = scoreAgg[0]?.avgScore
      ? Math.round(scoreAgg[0].avgScore * 10) / 10
      : null;

    res.json({
      users: { total: totalUsers, students: studentCount, mentors: mentorCount, admins: adminCount },
      interviews: { total: totalInterviews, completed: completedInterviews, avgScore: avgInterviewScore },
      challenges: { total: totalChallenges, completedAttempts },
    });
  } catch (err) {
    console.error("getAnalytics error:", err);
    res.status(500).json({ message: "Failed to fetch analytics.", error: err.message });
  }
};

module.exports = { listUsers, getUser, updateUserRole, getAnalytics };
