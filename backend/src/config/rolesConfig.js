/**
 * Centralized Roles & Permissions configuration.
 *
 * ─ HOW TO EXTEND ─────────────────────────────────────────────────────────────
 *   1. Add the new permission string to PERMISSIONS.
 *   2. Grant it to one or more roles in ROLE_PERMISSIONS.
 *   3. Use requirePermission('new.permission') in the route file.
 *   Never scatter role-name checks (if role === 'Admin') through controllers.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── All defined permissions ───────────────────────────────────────────────────
const PERMISSIONS = Object.freeze({
  // Interview / Mock interview engine
  INTERVIEW_CREATE:   "interview.create",
  INTERVIEW_READ:     "interview.read",

  // Reports
  REPORT_READ:        "report.read",

  // Placement Readiness
  READINESS_READ:     "readiness.read",

  // Resume analysis
  RESUME_ANALYZE:     "resume.analyze",

  // Peer Challenge Arena
  CHALLENGE_ATTEMPT:  "challenge.attempt",   // take a challenge (student)
  CHALLENGE_MANAGE:   "challenge.manage",    // create/edit/delete challenges (admin)

  // Mentor operations
  STUDENT_READ:       "student.read",        // view student data (mentor)
  FEEDBACK_CREATE:    "feedback.create",     // write feedback (mentor)
  FEEDBACK_READ:      "feedback.read",       // read feedback

  // Admin operations
  USER_MANAGE:        "user.manage",         // list/view all users
  ROLE_MANAGE:        "role.manage",         // change a user's role
  COMPANY_MANAGE:     "company.manage",      // create/edit/delete company profiles
  SYSTEM_MANAGE:      "system.manage",       // system settings
  ANALYTICS_READ:     "analytics.read",      // platform-wide analytics
});

// ── Role → permissions map ────────────────────────────────────────────────────
const ROLE_PERMISSIONS = Object.freeze({
  Student: [
    PERMISSIONS.INTERVIEW_CREATE,
    PERMISSIONS.INTERVIEW_READ,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.READINESS_READ,
    PERMISSIONS.CHALLENGE_ATTEMPT,
    PERMISSIONS.RESUME_ANALYZE,
  ],

  Mentor: [
    PERMISSIONS.STUDENT_READ,
    PERMISSIONS.INTERVIEW_READ,   // view student interview reports
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.FEEDBACK_CREATE,
    PERMISSIONS.FEEDBACK_READ,
  ],

  Administrator: Object.values(PERMISSIONS), // all permissions
});

// ── Helper: check if a role has a permission ──────────────────────────────────
/**
 * @param {string} role   - e.g. "Student"
 * @param {string} perm   - e.g. "interview.create"
 * @returns {boolean}
 */
function roleHasPermission(role, perm) {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes(perm);
}

module.exports = { PERMISSIONS, ROLE_PERMISSIONS, roleHasPermission };
