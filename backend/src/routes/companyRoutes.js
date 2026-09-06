const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getCompanies,
  getCompanySessions,
  getCompany,
} = require("../controllers/companyController");

router.use(authMiddleware);

router.get("/", getCompanies);

// Must be declared before "/:slug", or Express matches this as a slug.
router.get("/sessions", getCompanySessions);

router.get("/:slug", getCompany);

module.exports = router;
