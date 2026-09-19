const express = require("express");
require("dotenv").config();

const cors = require("cors");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const interviewRoutes = require("./routes/interviewRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const readinessRoutes = require("./routes/readinessRoutes");
const companyRoutes = require("./routes/companyRoutes");
const arenaRoutes = require("./routes/arenaRoutes");

const app = express();

/* -------------------- Middleware -------------------- */

app.use(
  cors({
    origin: "*",
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* -------------------- Health Routes -------------------- */

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

/* -------------------- Database Middleware -------------------- */

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

/* -------------------- API Routes -------------------- */

app.use("/api/auth", ensureDatabaseConnection, authRoutes);
app.use("/api/interviews", ensureDatabaseConnection, interviewRoutes);
app.use("/api/resume", ensureDatabaseConnection, resumeRoutes);
app.use("/api/readiness", ensureDatabaseConnection, readinessRoutes);
app.use("/api/companies", ensureDatabaseConnection, companyRoutes);
app.use("/api/arena", ensureDatabaseConnection, arenaRoutes);

/* -------------------- Error Handler -------------------- */

app.use((err, req, res, next) => {
  console.error("Unhandled application error:", err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

/* -------------------- Vercel Export -------------------- */

module.exports = app;

/* -------------------- Local Development -------------------- */

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