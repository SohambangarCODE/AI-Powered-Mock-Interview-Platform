const express = require("express");
require("dotenv").config();

const cors = require("cors");
const helmet = require("helmet");

const connectDB = require("./config/db");
const { generalLimiter } = require("./middleware/rateLimitMiddleware");

const authRoutes = require("./routes/authRoutes");
const interviewRoutes = require("./routes/interviewRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const readinessRoutes = require("./routes/readinessRoutes");
const companyRoutes = require("./routes/companyRoutes");
const arenaRoutes = require("./routes/arenaRoutes");

const app = express();

/* -------------------- Trust Proxy (for IP detection behind Vercel/Nginx) ---- */

app.set("trust proxy", 1);

/* -------------------- Security Middleware ------------------------------------ */

// Helmet: sets security-relevant HTTP headers
app.use(helmet());

// CORS — restrict to known frontend origins
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server (no origin) and known origins
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Global rate limiter applied to all routes
app.use(generalLimiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* -------------------- Health Routes ----------------------------------------- */

app.get("/", (req, res) => {
  res.status(200).send("backend is alive");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
  });
});

/* -------------------- Database Middleware ------------------------------------ */

let dbConnectionPromise;

const ensureDatabaseConnection = async (req, res, next) => {
  try {
    if (!dbConnectionPromise) {
      dbConnectionPromise = connectDB();
    }

    await dbConnectionPromise;

    next();
  } catch (error) {
    console.error("Database connection failed:", error);

    dbConnectionPromise = null;

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
};

/* -------------------- API Routes -------------------------------------------- */

// authRateLimiter is applied per-route inside authRoutes.js (login/register only)
app.use("/api/auth", ensureDatabaseConnection, authRoutes);
app.use("/api/interviews", ensureDatabaseConnection, interviewRoutes);
app.use("/api/resume", ensureDatabaseConnection, resumeRoutes);
app.use("/api/readiness", ensureDatabaseConnection, readinessRoutes);
app.use("/api/companies", ensureDatabaseConnection, companyRoutes);
app.use("/api/arena", ensureDatabaseConnection, arenaRoutes);

/* -------------------- Error Handler ----------------------------------------- */

app.use((err, req, res, next) => {
  console.error("Unhandled application error:", err);

  // CORS errors
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ success: false, message: "CORS policy violation." });
  }

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

/* -------------------- Vercel Export ----------------------------------------- */

module.exports = app;

/* -------------------- Local Development ------------------------------------- */

if (require.main === module) {
  const PORT = process.env.PORT || 5000;

  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
      });
    })
    .catch((error) => {
      console.error("Failed to start server:", error);
      process.exit(1);
    });
}