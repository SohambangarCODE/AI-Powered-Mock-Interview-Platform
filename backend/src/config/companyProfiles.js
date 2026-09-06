/**
 * Single source of truth for the AI Recruiter Simulator's company profiles.
 *
 * Every knob that shapes a company-flavoured interview lives here: difficulty,
 * style, focus areas, question types, evaluation criteria, roles, rounds and the
 * expected performance standard. Nothing about company behaviour is duplicated
 * in the frontend — the browser reads `publicProfiles()` from
 * GET /api/companies purely to *render* what the backend already decided.
 *
 * These profiles are a teaching simulation built from publicly discussed
 * interview patterns. They are not, and do not claim to be, any company's real
 * or confidential hiring process — see SIMULATION_DISCLAIMER.
 *
 * On boot these entries are upserted into the `companyprofiles` collection
 * (see models/companyProfile.js) so they can be tuned in the database without a
 * redeploy; this module stays the fallback and the in-repo record.
 */

const { DIFFICULTIES } = require("../models/interview");
const { INTERVIEW_DOMAINS } = require("./readinessConfig");

const SIMULATION_DISCLAIMER =
  "This is a practice simulation based on a configured company profile. " +
  "It reflects publicly discussed interview patterns, not any company's real " +
  "or confidential hiring process, and its result is not a hiring decision.";

/** How a round nudges the company's base difficulty. Fed to shiftDifficulty(). */
const DIFFICULTY_BIASES = ["decrease", "maintain", "increase"];

// ── Profiles ───────────────────────────────────────────────
const COMPANY_PROFILES = [
  {
    slug: "google",
    name: "Google",
    tier: "faang",
    blurb:
      "Depth-first questioning. Expects precise reasoning about complexity and scale.",
    baseDifficulty: "hard",
    interviewStyle:
      "Rigorous and analytical. Probe the candidate's reasoning rather than accepting a working answer: ask why an approach is correct, what its complexity is, and what breaks at scale. Prefer questions with a clear optimal answer the candidate must reason toward.",
    focusAreas: [
      "Algorithms",
      "Data Structures",
      "System Design",
      "Complexity Analysis",
      "Distributed Systems",
    ],
    questionTypes: ["problem-solving", "trade-off analysis", "conceptual depth"],
    evaluationCriteria: [
      {
        label: "Algorithmic rigour",
        weight: 35,
        description: "Correctness, optimality and stated complexity",
      },
      {
        label: "Scalability thinking",
        weight: 25,
        description: "Reasons about growth, bottlenecks and failure modes",
      },
      {
        label: "Structured communication",
        weight: 20,
        description: "Explains the approach before the answer",
      },
      {
        label: "Depth of fundamentals",
        weight: 20,
        description: "Understands the mechanism, not just the API",
      },
    ],
    expectedStandard: {
      minOverallScore: 78,
      minAverageAnswerScore: 7.5,
      maxSkipRate: 0.2,
      label: "Strong hire bar",
    },
    roles: [
      {
        id: "sde",
        label: "Software Engineer",
        domain: "System Design",
        emphasis: ["Scalability", "Complexity analysis", "Distributed systems"],
      },
      {
        id: "frontend",
        label: "Frontend Engineer",
        domain: "React",
        emphasis: ["Rendering performance", "State architecture", "Accessibility"],
      },
      {
        id: "data-scientist",
        label: "Data Scientist",
        domain: "Data Science",
        emphasis: ["Statistical rigour", "Experiment design", "Model evaluation"],
      },
    ],
    rounds: [
      {
        id: "phone-screen",
        label: "Technical Phone Screen",
        order: 1,
        difficultyBias: "decrease",
        focus: ["Fundamentals", "Data Structures"],
        description:
          "A single focused problem to confirm the candidate can code and reason out loud.",
      },
      {
        id: "onsite-coding",
        label: "Onsite: Coding",
        order: 2,
        difficultyBias: "maintain",
        focus: ["Algorithms", "Complexity Analysis"],
        description:
          "Harder problems with follow-ups that push toward the optimal solution.",
      },
      {
        id: "onsite-design",
        label: "Onsite: System Design",
        order: 3,
        difficultyBias: "increase",
        focus: ["System Design", "Distributed Systems"],
        description:
          "Open-ended design with escalating scale and reliability constraints.",
      },
      {
        id: "googleyness",
        label: "Googleyness & Leadership",
        order: 4,
        difficultyBias: "decrease",
        focus: ["Collaboration", "Ambiguity", "Ownership"],
        description:
          "Behavioural signal on how the candidate works with others under ambiguity.",
      },
    ],
  },

  {
    slug: "amazon",
    name: "Amazon",
    tier: "faang",
    blurb:
      "Leadership Principles woven through every technical answer. Data over opinion.",
    baseDifficulty: "hard",
    interviewStyle:
      "Bar-raiser style. Anchor questions in concrete situations and press for specifics: what the candidate actually did, what data drove the decision, what the measured outcome was. Reward ownership and customer impact; penalise vague generalities.",
    focusAreas: [
      "Data Structures",
      "Scalability",
      "Ownership",
      "Operational Excellence",
      "Cost Awareness",
    ],
    questionTypes: [
      "problem-solving",
      "situational",
      "trade-off analysis",
      "operational",
    ],
    evaluationCriteria: [
      {
        label: "Customer obsession",
        weight: 25,
        description: "Frames technical choices around user impact",
      },
      {
        label: "Ownership & bias for action",
        weight: 25,
        description: "Drove the outcome rather than observed it",
      },
      {
        label: "Technical depth",
        weight: 30,
        description: "Correct, scalable, operationally sound solutions",
      },
      {
        label: "Data-backed reasoning",
        weight: 20,
        description: "Cites metrics instead of asserting",
      },
    ],
    expectedStandard: {
      minOverallScore: 75,
      minAverageAnswerScore: 7.2,
      maxSkipRate: 0.2,
      label: "Bar-raiser bar",
    },
    roles: [
      {
        id: "sde",
        label: "SDE (Software Development Engineer)",
        domain: "System Design",
        emphasis: ["Scalability", "Operational excellence", "Cost trade-offs"],
      },
      {
        id: "backend",
        label: "Backend Engineer",
        domain: "JavaScript/Node.js",
        emphasis: ["API design", "Throughput", "Failure handling"],
      },
      {
        id: "devops",
        label: "Cloud/DevOps Engineer",
        domain: "DevOps",
        emphasis: ["Automation", "Monitoring", "Incident response"],
      },
    ],
    rounds: [
      {
        id: "online-assessment",
        label: "Online Assessment",
        order: 1,
        difficultyBias: "decrease",
        focus: ["Data Structures", "Fundamentals"],
        description: "Timed fundamentals check before any human conversation.",
      },
      {
        id: "technical-phone",
        label: "Technical Phone Interview",
        order: 2,
        difficultyBias: "maintain",
        focus: ["Problem Solving", "Code Quality"],
        description: "One engineer, one problem, plus a Leadership Principle probe.",
      },
      {
        id: "loop-coding",
        label: "Loop: Coding & Design",
        order: 3,
        difficultyBias: "increase",
        focus: ["Scalability", "System Design"],
        description:
          "Back-to-back technical rounds with operational and cost follow-ups.",
      },
      {
        id: "bar-raiser",
        label: "Bar Raiser",
        order: 4,
        difficultyBias: "increase",
        focus: ["Ownership", "Judgement", "Long-term thinking"],
        description:
          "An interviewer outside the team testing whether the candidate raises the bar.",
      },
    ],
  },

  {
    slug: "microsoft",
    name: "Microsoft",
    tier: "big-tech",
    blurb:
      "Collaborative and practical. Cares how you think and how you'd work on a team.",
    baseDifficulty: "medium",
    interviewStyle:
      "Conversational but technically substantive. Treat the interview as pair problem-solving: give the candidate room to think aloud, ask clarifying follow-ups, and value clean, maintainable reasoning over clever tricks. Include design and testing considerations.",
    focusAreas: [
      "Problem Solving",
      "Object-Oriented Design",
      "Code Quality",
      "Testing",
      "Collaboration",
    ],
    questionTypes: ["conceptual", "problem-solving", "design", "testing"],
    evaluationCriteria: [
      {
        label: "Problem-solving process",
        weight: 30,
        description: "Clarifies, decomposes, then solves",
      },
      {
        label: "Design & maintainability",
        weight: 25,
        description: "Clean abstractions, sensible interfaces",
      },
      {
        label: "Testing mindset",
        weight: 20,
        description: "Considers edge cases and verification",
      },
      {
        label: "Collaboration",
        weight: 25,
        description: "Responds well to hints and pushback",
      },
    ],
    expectedStandard: {
      minOverallScore: 70,
      minAverageAnswerScore: 6.8,
      maxSkipRate: 0.25,
      label: "Hire bar",
    },
    roles: [
      {
        id: "sde",
        label: "Software Engineer",
        domain: "System Design",
        emphasis: ["Object-oriented design", "Maintainability", "Testing"],
      },
      {
        id: "fullstack",
        label: "Full-Stack Engineer",
        domain: "JavaScript/Node.js",
        emphasis: ["API design", "Async patterns", "Error handling"],
      },
      {
        id: "data-engineer",
        label: "Data Engineer",
        domain: "Database Design",
        emphasis: ["Schema design", "Indexing", "Query performance"],
      },
    ],
    rounds: [
      {
        id: "recruiter-technical",
        label: "Initial Technical Screen",
        order: 1,
        difficultyBias: "decrease",
        focus: ["Fundamentals", "Problem Solving"],
        description: "Breadth check across the basics of the candidate's stack.",
      },
      {
        id: "coding-design",
        label: "Coding & Design",
        order: 2,
        difficultyBias: "maintain",
        focus: ["Object-Oriented Design", "Code Quality"],
        description: "Build something small and well-structured, then extend it.",
      },
      {
        id: "as-appropriate",
        label: "As-Appropriate (Hiring Manager)",
        order: 3,
        difficultyBias: "increase",
        focus: ["Architecture", "Trade-offs", "Ownership"],
        description:
          "Senior round covering architecture judgement and team fit.",
      },
    ],
  },

  {
    slug: "tcs",
    name: "TCS",
    tier: "service",
    blurb:
      "Broad fundamentals across CS basics, with clear textbook-accurate answers.",
    baseDifficulty: "easy",
    interviewStyle:
      "Structured and breadth-first, in the style of a large service-company graduate drive. Cover fundamentals across programming, databases and OS/networking concepts. Reward clear, accurate, textbook-correct explanations and correct terminology over exotic depth.",
    focusAreas: [
      "Programming Fundamentals",
      "OOP Concepts",
      "DBMS",
      "Operating Systems",
      "Aptitude & Communication",
    ],
    questionTypes: ["definitional", "conceptual", "short scenario"],
    evaluationCriteria: [
      {
        label: "Conceptual accuracy",
        weight: 35,
        description: "Correct definitions and terminology",
      },
      {
        label: "Breadth of fundamentals",
        weight: 30,
        description: "Comfortable across several core CS areas",
      },
      {
        label: "Clarity of expression",
        weight: 20,
        description: "Explains simply and completely",
      },
      {
        label: "Application to examples",
        weight: 15,
        description: "Can ground a concept in a small example",
      },
    ],
    expectedStandard: {
      minOverallScore: 60,
      minAverageAnswerScore: 6,
      maxSkipRate: 0.3,
      label: "Graduate selection bar",
    },
    roles: [
      {
        id: "systems-engineer",
        label: "Systems Engineer (Ninja)",
        domain: "General",
        emphasis: ["Programming fundamentals", "OOP", "DBMS basics"],
      },
      {
        id: "digital",
        label: "Digital / Prime Engineer",
        domain: "Python",
        emphasis: ["Data structures", "Problem solving", "Applied coding"],
      },
      {
        id: "database-admin",
        label: "Database Engineer",
        domain: "Database Design",
        emphasis: ["Normalisation", "SQL", "Transactions"],
      },
    ],
    rounds: [
      {
        id: "aptitude-technical",
        label: "Technical Round 1",
        order: 1,
        difficultyBias: "maintain",
        focus: ["Programming Fundamentals", "OOP Concepts"],
        description: "Core fundamentals across the candidate's declared stack.",
      },
      {
        id: "technical-deep",
        label: "Technical Round 2",
        order: 2,
        difficultyBias: "increase",
        focus: ["DBMS", "Operating Systems"],
        description: "Slightly deeper questioning plus project discussion.",
      },
      {
        id: "managerial-hr",
        label: "Managerial / HR",
        order: 3,
        difficultyBias: "decrease",
        focus: ["Communication", "Motivation", "Adaptability"],
        description: "Fit, communication and willingness to learn.",
      },
    ],
  },

  {
    slug: "infosys",
    name: "Infosys",
    tier: "service",
    blurb:
      "Fundamentals plus applied problem solving, with an emphasis on trainability.",
    baseDifficulty: "easy",
    interviewStyle:
      "Supportive and structured, in the style of a large service-company hiring drive. Test core fundamentals and the ability to apply them to small practical problems. Reward clear reasoning and evidence the candidate can be trained; give partial credit for a sound approach.",
    focusAreas: [
      "Programming Fundamentals",
      "Data Structures",
      "DBMS & SQL",
      "Software Engineering Basics",
      "Communication",
    ],
    questionTypes: ["definitional", "conceptual", "applied problem"],
    evaluationCriteria: [
      {
        label: "Fundamentals",
        weight: 35,
        description: "Accurate core concepts",
      },
      {
        label: "Applied reasoning",
        weight: 25,
        description: "Turns a concept into a working approach",
      },
      {
        label: "Learnability",
        weight: 20,
        description: "Absorbs a hint and improves the answer",
      },
      {
        label: "Communication",
        weight: 20,
        description: "Clear, organised explanations",
      },
    ],
    expectedStandard: {
      minOverallScore: 58,
      minAverageAnswerScore: 5.8,
      maxSkipRate: 0.3,
      label: "Graduate selection bar",
    },
    roles: [
      {
        id: "systems-engineer",
        label: "Systems Engineer",
        domain: "General",
        emphasis: ["Programming fundamentals", "SDLC", "DBMS basics"],
      },
      {
        id: "power-programmer",
        label: "Power Programmer",
        domain: "Python",
        emphasis: ["Data structures", "Algorithms", "Clean code"],
      },
      {
        id: "specialist-frontend",
        label: "Digital Specialist (Frontend)",
        domain: "React",
        emphasis: ["Component design", "State handling", "Browser basics"],
      },
    ],
    rounds: [
      {
        id: "technical",
        label: "Technical Round",
        order: 1,
        difficultyBias: "maintain",
        focus: ["Programming Fundamentals", "Data Structures"],
        description: "Fundamentals plus a walkthrough of the candidate's projects.",
      },
      {
        id: "technical-managerial",
        label: "Technical + Managerial",
        order: 2,
        difficultyBias: "increase",
        focus: ["DBMS & SQL", "Software Engineering Basics"],
        description: "Applied questions with light architecture discussion.",
      },
      {
        id: "hr",
        label: "HR Round",
        order: 3,
        difficultyBias: "decrease",
        focus: ["Communication", "Career goals", "Flexibility"],
        description: "Motivation, communication and role expectations.",
      },
    ],
  },

  {
    slug: "startup",
    name: "Early-Stage Startup",
    tier: "startup",
    blurb:
      "Ship-it pragmatism. Breadth, ownership and speed matter more than theory.",
    baseDifficulty: "medium",
    interviewStyle:
      "Fast-moving and practical, like a small team hiring their next builder. Favour questions about shipping real features end to end, debugging production issues, and making pragmatic trade-offs under time and headcount constraints. Reward breadth, initiative and honest 'here's what I'd cut' reasoning; penalise theory with no execution.",
    focusAreas: [
      "Full-Stack Delivery",
      "Debugging",
      "Pragmatic Trade-offs",
      "Product Sense",
      "Ownership",
    ],
    questionTypes: ["practical scenario", "debugging", "trade-off analysis"],
    evaluationCriteria: [
      {
        label: "Shipping ability",
        weight: 30,
        description: "Gets a working thing out end to end",
      },
      {
        label: "Breadth",
        weight: 25,
        description: "Comfortable across the stack, not just one layer",
      },
      {
        label: "Pragmatic judgement",
        weight: 25,
        description: "Knows what to cut and why",
      },
      {
        label: "Ownership",
        weight: 20,
        description: "Takes the problem to done without hand-holding",
      },
    ],
    expectedStandard: {
      minOverallScore: 65,
      minAverageAnswerScore: 6.5,
      maxSkipRate: 0.25,
      label: "First-ten-engineers bar",
    },
    roles: [
      {
        id: "fullstack",
        label: "Full-Stack Engineer",
        domain: "JavaScript/Node.js",
        emphasis: ["End-to-end delivery", "API design", "Debugging"],
      },
      {
        id: "frontend",
        label: "Product Engineer (Frontend)",
        domain: "React",
        emphasis: ["Fast iteration", "UX detail", "State management"],
      },
      {
        id: "platform",
        label: "Platform / Infra Engineer",
        domain: "DevOps",
        emphasis: ["CI/CD", "Cost control", "Small-team tooling"],
      },
    ],
    rounds: [
      {
        id: "founder-chat",
        label: "Founder Screen",
        order: 1,
        difficultyBias: "decrease",
        focus: ["Motivation", "Product Sense", "Breadth"],
        description:
          "A founder probing what the candidate has actually built and shipped.",
      },
      {
        id: "practical-build",
        label: "Practical Build & Debug",
        order: 2,
        difficultyBias: "maintain",
        focus: ["Full-Stack Delivery", "Debugging"],
        description:
          "Work through building and fixing something close to real product code.",
      },
      {
        id: "ownership",
        label: "Ownership & Trade-offs",
        order: 3,
        difficultyBias: "increase",
        focus: ["Pragmatic Trade-offs", "Ownership"],
        description:
          "Scope a feature under a hard deadline and defend what you'd drop.",
      },
    ],
  },
];

// ── Boot-time validation ───────────────────────────────────
// A typo in `role.domain` would silently write an off-taxonomy value into
// interview.domain and quietly break the readiness aggregation, so fail loudly
// at require() time instead.
(function validateProfiles() {
  const domains = new Set(INTERVIEW_DOMAINS);
  const slugs = new Set();

  for (const profile of COMPANY_PROFILES) {
    const where = `companyProfiles[${profile.slug}]`;

    if (!profile.slug) throw new Error("companyProfiles: a profile is missing a slug");
    if (slugs.has(profile.slug))
      throw new Error(`${where}: duplicate slug`);
    slugs.add(profile.slug);

    if (!DIFFICULTIES.includes(profile.baseDifficulty))
      throw new Error(
        `${where}: baseDifficulty "${profile.baseDifficulty}" is not one of ${DIFFICULTIES.join("/")}`,
      );

    if (!profile.roles?.length) throw new Error(`${where}: needs at least one role`);
    if (!profile.rounds?.length) throw new Error(`${where}: needs at least one round`);

    for (const role of profile.roles) {
      if (!domains.has(role.domain))
        throw new Error(
          `${where}.roles[${role.id}]: domain "${role.domain}" is not a known interview domain`,
        );
    }

    for (const round of profile.rounds) {
      if (!DIFFICULTY_BIASES.includes(round.difficultyBias))
        throw new Error(
          `${where}.rounds[${round.id}]: difficultyBias "${round.difficultyBias}" is invalid`,
        );
    }
  }
})();

// ── Lookups ────────────────────────────────────────────────
const byOrder = (a, b) => (a.order || 0) - (b.order || 0);

function getProfile(slug) {
  if (typeof slug !== "string") return null;
  const wanted = slug.trim().toLowerCase();
  return COMPANY_PROFILES.find((p) => p.slug === wanted) || null;
}

/**
 * Resolve a company/role/round selection into everything the engine needs.
 *
 * `source` lets a DB-backed profile be resolved with the same logic — the config
 * array is only the default. Returns null when any part of the selection is
 * unknown, which the controller turns into a 400 rather than trusting client
 * input.
 */
function resolveSelection({ companySlug, roleId, roundId }, source = null) {
  const profile = source || getProfile(companySlug);
  if (!profile) return null;

  const role = profile.roles.find((r) => r.id === roleId);
  if (!role) return null;

  // A round is optional: default to the first one in the sequence.
  const rounds = [...profile.rounds].sort(byOrder);
  const round = roundId ? rounds.find((r) => r.id === roundId) : rounds[0];
  if (!round) return null;

  return {
    profile,
    role,
    round,
    domain: role.domain,
    startDifficulty: shiftBias(profile.baseDifficulty, round.difficultyBias),
  };
}

/**
 * Bias the base difficulty by one rung. Deliberately mirrors the engine's
 * shiftDifficulty(); duplicated here (three lines) rather than imported so this
 * config module stays free of engine imports and cannot create a require cycle.
 */
function shiftBias(current, bias) {
  const from = Math.max(0, DIFFICULTIES.indexOf(current));
  if (bias === "increase") return DIFFICULTIES[Math.min(from + 1, DIFFICULTIES.length - 1)];
  if (bias === "decrease") return DIFFICULTIES[Math.max(from - 1, 0)];
  return DIFFICULTIES[from];
}

/** The browser-safe shape. Everything here is display-only. */
function publicProfile(profile) {
  return {
    slug: profile.slug,
    name: profile.name,
    tier: profile.tier,
    blurb: profile.blurb,
    baseDifficulty: profile.baseDifficulty,
    focusAreas: profile.focusAreas,
    questionTypes: profile.questionTypes,
    evaluationCriteria: profile.evaluationCriteria,
    expectedStandard: profile.expectedStandard,
    roles: profile.roles.map((r) => ({
      id: r.id,
      label: r.label,
      domain: r.domain,
      emphasis: r.emphasis || [],
    })),
    rounds: [...profile.rounds].sort(byOrder).map((r) => ({
      id: r.id,
      label: r.label,
      order: r.order,
      focus: r.focus || [],
      description: r.description || "",
    })),
  };
}

function publicProfiles(list = COMPANY_PROFILES) {
  return list.map(publicProfile);
}

module.exports = {
  COMPANY_PROFILES,
  DIFFICULTY_BIASES,
  SIMULATION_DISCLAIMER,
  getProfile,
  resolveSelection,
  publicProfile,
  publicProfiles,
};
