const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const interviewRoutes = require("./routes/interviewRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const readinessRoutes = require("./routes/readinessRoutes");
const companyRoutes = require("./routes/companyRoutes");
const arenaRoutes = require("./routes/arenaRoutes");
const { seedDailyChallenges, seedWeeklyChallenges } = require("./controllers/arenaController");
const { seedCompanyProfiles } = require("./models/companyProfile");

const app = express();

// Seed the AI Recruiter Simulator's company profiles once the DB is up. A seed
// failure is logged and tolerated: the config module is the read-path fallback,
// so the simulator still works.
connectDB()
  .then(() => seedCompanyProfiles())
  .then((result) => {
    if (result)
      console.log(
        `Company profiles seeded (${result.total} total, ${result.upserted} new)`,
      );
  })
  .catch((error) => {
    console.error("Company profile seed failed:", error.message);
  });

// Seed arena challenges (non-blocking — a failure logs and is tolerated).
connectDB()
  .then(() => Promise.all([seedDailyChallenges(), seedWeeklyChallenges()]))
  .then(([daily, weekly]) => {
    console.log(
      `Arena challenges seeded — daily: ${daily.created} new, weekly: ${weekly.created} new`,
    );
  })
  .catch((error) => {
    console.error("Arena challenge seed failed:", error.message);
  });

app.use(
  cors({
    origin: "*",
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/readiness", readinessRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/arena", arenaRoutes);

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("backend is alive");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
