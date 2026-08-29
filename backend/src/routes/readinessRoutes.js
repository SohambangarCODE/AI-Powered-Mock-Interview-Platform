const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
  getConfig,
  uploadResume,
  getLatest,
  generateAssessment,
  getHistory,
  getSkillAssessments,
  startSkillAssessment,
  submitSkillAssessment,
} = require("../controllers/readinessController");

const MAX_FILE_SIZE_MB = 5;

// Only formats the extraction pipeline can genuinely read: PDF, or plain text.
// A .docx would be accepted as a zip archive and analysed as binary garbage, so
// it is rejected with a clear message instead.
const ALLOWED_EXTENSIONS = [".pdf", ".txt"];
const ALLOWED_MIMETYPES = [
  "application/pdf",
  "text/plain",
  "application/octet-stream", // some browsers send this for a valid .pdf
];

const upload = multer({
  // Files are parsed in memory and never written to disk — nothing to clean up
  // and no path handling to get wrong.
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    // The extension is checked as well as the mimetype: mimetype is
    // client-supplied and trivially spoofed.
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(
        new Error(
          `Unsupported file type. Upload a ${ALLOWED_EXTENSIONS.join(" or ")} file.`,
        ),
        false,
      );
    }
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      return cb(new Error("Unsupported file type."), false);
    }
    cb(null, true);
  },
});

/**
 * Run multer with its errors turned into JSON. Without this, an oversized file
 * hits Express's default handler and the browser gets an HTML error page that
 * the upload UI cannot display.
 */
const acceptResume = (req, res, next) => {
  upload.single("resume")(req, res, (err) => {
    if (!err) return next();

    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: `File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`,
      });
    }
    if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
      return res
        .status(400)
        .json({ error: 'Upload a single file in the "resume" field.' });
    }
    return res.status(400).json({ error: err.message || "Upload failed." });
  });
};

// Every route requires a valid token — same middleware as the rest of the app.
router.use(authMiddleware);

router.get("/config", getConfig);
router.get("/latest", getLatest);
router.get("/history", getHistory);
router.post("/resume", acceptResume, uploadResume);
router.post("/generate", generateAssessment);

router.get("/assessment", getSkillAssessments);
router.post("/assessment/start", startSkillAssessment);
router.post("/assessment/submit", submitSkillAssessment);

module.exports = router;
