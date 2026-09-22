const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/rbacMiddleware");
const {
  getCompanies,
  getCompanySessions,
  getCompany,
} = require("../controllers/companyController");

router.use(authMiddleware);

// Company profiles are part of the AI Recruiter Simulator — a student feature.
// interview.read is shared with mentors so they can review simulator sessions.
router.get("/",          requirePermission("interview.read"), getCompanies);

// Must be declared before "/:slug", or Express matches "sessions" as a slug.
router.get("/sessions",  requirePermission("interview.read"), getCompanySessions);

router.get("/:slug",     requirePermission("interview.read"), getCompany);

module.exports = router;
