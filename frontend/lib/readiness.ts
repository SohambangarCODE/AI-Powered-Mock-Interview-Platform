// Shared contract + presentation helpers for the AI Placement Readiness engine.
//
// Deliberately contains no scoring rules. Every weight, target, threshold and
// score band is computed by the backend and read from GET /api/readiness/config;
// this module only decides how those numbers are *painted*. If a weight needs
// changing it changes in backend/src/config/readinessConfig.js (or its env var)
// and this file needs no edit at all.

import {
  ArrowDown,
  ArrowUp,
  Award,
  BookOpen,
  Brain,
  CircleCheck,
  FileText,
  FolderGit2,
  GraduationCap,
  Minus,
  Rocket,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  Wrench,
  type LucideIcon,
} from "lucide-react";

// The readiness endpoints wait on Groq, which routinely takes longer than the
// axios instance's 15s default. Passed per-request so the global timeout that
// the rest of the app relies on is left alone.
export const READINESS_AI_TIMEOUT = 120_000;

// ── API shapes ─────────────────────────────────────────────

export type ComponentKey =
  | "resume"
  | "interview"
  | "skillAssessment"
  | "communication";

export type CategoryKey =
  | "placementReady"
  | "highPotential"
  | "needsImprovement";

export type TrackKey = "fresher" | "internship" | "experienced";

export type Priority = "high" | "medium" | "low";

export type TrendDirection = "improving" | "declining" | "steady" | "new";

export interface ScoreBand {
  min: number;
  label: string;
}

/** One row of the resume score breakdown, as computed by the backend. */
export interface ResumeBreakdownRow {
  key: string;
  label: string;
  count: number;
  target: number;
  weight: number;
  earned: number;
}

/** One row of the communication score breakdown. */
export interface CommunicationMetric {
  key: string;
  label: string;
  ratio: number;
  weight: number;
  value: string;
  earned: number;
}

export interface ComponentDetail {
  band?: string;
  // resume
  breakdown?: ResumeBreakdownRow[];
  totalYearsExperience?: number;
  experienceLevel?: string;
  // interview
  sessionsCounted?: number;
  recencyWeightedAverage?: number;
  coverageBonus?: number;
  domainsPractised?: number;
  domainCoverageTarget?: number;
  bestScore?: number;
  latestScore?: number;
  // skill assessment
  assessmentsCounted?: number;
  skillsCovered?: { skill: string; score: number }[];
  // communication
  metrics?: CommunicationMetric[];
  answersAnalysed?: number;
  skippedCount?: number;
  averageWordsPerAnswer?: number;
}

export interface ScoreComponent {
  key: ComponentKey;
  label: string;
  /** 0-100, or null when the candidate has no data for this component. */
  score: number | null;
  /** The configured weight. */
  weight: number;
  /** The weight actually applied, after missing components were renormalised. */
  effectiveWeight: number;
  hasData: boolean;
  detail: ComponentDetail | null;
}

export interface ReadinessAnalysis {
  technicalStrengths: string[];
  weakTechnicalAreas: string[];
  communicationGaps: string[];
  missingIndustrySkills: string[];
  categoryReason: string;
  summary: string;
  /** false when the model was unavailable and the deterministic fallback ran. */
  aiGenerated: boolean;
}

export interface RoadmapItem {
  title: string;
  reason: string;
  priority: Priority;
  /** Set on interview-topic items the practice engine supports. */
  domain: string;
  /** Set on project items. */
  technologies: string[];
}

export interface Roadmap {
  technologies: RoadmapItem[];
  projects: RoadmapItem[];
  certifications: RoadmapItem[];
  interviewTopics: RoadmapItem[];
  milestones: string[];
  focusStatement: string;
  aiGenerated: boolean;
}

export interface SkillSnapshot {
  skill: string;
  score: number;
  source: "assessment" | "interview";
}

export interface SkillTrend extends SkillSnapshot {
  previousScore: number | null;
  delta: number | null;
  direction: TrendDirection;
}

export interface ReadinessAssessment {
  id: string;
  overallScore: number;
  components: ScoreComponent[];
  /** 0-100: how much of the configured weight was backed by real data. */
  dataCompleteness: number;
  category: CategoryKey;
  categoryLabel: string;
  track: TrackKey;
  trackLabel: string;
  /** false when the candidate overrode the detected track. */
  trackDetected: boolean;
  analysis: ReadinessAnalysis;
  roadmap: Roadmap;
  skillSnapshot: SkillSnapshot[];
  /** Change vs the previous assessment; null for the first one. */
  scoreDelta: number | null;
  sources: {
    interviewCount: number;
    assessmentCount: number;
    hasResume: boolean;
    resumeUpdatedAt: string | null;
  };
  weightsUsed: Record<string, number> | null;
  createdAt: string;
}

/** Compact assessment record used by the progression chart and history list. */
export interface ReadinessHistoryEntry {
  id: string;
  overallScore: number;
  category: CategoryKey;
  categoryLabel: string;
  track: TrackKey;
  trackLabel: string;
  scoreDelta: number | null;
  dataCompleteness: number;
  createdAt: string;
  components: {
    key: ComponentKey;
    label: string;
    score: number | null;
    hasData: boolean;
  }[];
}

export interface ResumeSkill {
  name: string;
  category: string;
  evidence: string;
}

export interface ResumeProject {
  name: string;
  description: string;
  technologies: string[];
}

export interface ResumeExperience {
  role: string;
  organization: string;
  type: "job" | "internship" | "freelance" | "other";
  duration: string;
  durationMonths: number | null;
  highlights: string[];
}

export interface ResumeCertification {
  name: string;
  issuer: string;
  year: string;
}

export interface ResumeEducation {
  degree: string;
  institution: string;
  year: string;
  score: string;
}

export interface ResumeProfile {
  skills: ResumeSkill[];
  projects: ResumeProject[];
  experience: ResumeExperience[];
  certifications: ResumeCertification[];
  education: ResumeEducation[];
  totalYearsExperience: number;
  summary: string;
  experienceLevel: "Junior" | "Mid" | "Senior";
  skillsDetected: string[];
  strengths: string[];
  recommendedDomains: { label: string; reason: string; confidence: number }[];
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  updatedAt: string;
}

export interface Availability {
  hasResume: boolean;
  resumeUpdatedAt: string | null;
  interviewCount: number;
  assessmentCount: number;
  canGenerate: boolean;
}

export interface TrackOption {
  id: TrackKey;
  label: string;
  description: string;
}

/** The scoring rules, for explaining the score — never for computing it. */
export interface ReadinessConfig {
  componentWeights: Record<ComponentKey, number>;
  componentLabels: Record<ComponentKey, string>;
  resumeScoring: Record<
    string,
    { weight: number; target: number; label: string }
  >;
  communicationScoring: Record<string, { weight: number; label: string }>;
  categories: {
    placementReady: {
      label: string;
      minOverall: number;
      minComponents: number;
    };
    highPotential: {
      label: string;
      minOverall: number;
      minTopComponent: number;
      minTrendDelta: number;
    };
    needsImprovement: { label: string };
  };
  tracks: TrackOption[];
  scoreBands: ScoreBand[];
  assessment: {
    questionsPerAssessment: number;
    maxSkillsPerAssessment: number;
  };
  interviewDomains: string[];
}

// ── Skill assessment (MCQ) shapes ──────────────────────────

export interface QuizQuestion {
  index: number;
  skill: string;
  difficulty: "easy" | "medium" | "hard";
  question: string;
  options: string[];
  selectedIndex: number | null;
  /** Only present once the quiz is submitted. */
  correctIndex?: number;
  explanation?: string;
  isCorrect?: boolean | null;
}

export interface SkillScore {
  skill: string;
  correct: number;
  total: number;
  score: number;
}

export interface Quiz {
  id: string;
  skills: string[];
  status: "in-progress" | "completed";
  questionCount: number;
  questions: QuizQuestion[];
  overallScore: number;
  correctCount: number;
  answeredCount: number;
  skillScores: SkillScore[];
  createdAt: string;
  completedAt: string | null;
}

export interface QuizSummary {
  id: string;
  skills: string[];
  status: "in-progress" | "completed";
  questionCount: number;
  overallScore: number;
  correctCount: number;
  skillScores: SkillScore[];
  createdAt: string;
  completedAt: string | null;
}

export interface SkillAssessmentState {
  inProgress: Quiz | null;
  latest: Quiz | null;
  history: QuizSummary[];
  availableSkills: string[];
  /** true when the candidate has no resume, so generic skills were offered. */
  usingFallbackSkills: boolean;
}

// ── Score bands ────────────────────────────────────────────

/**
 * Palette for the score bands, best-first. Matched to the bands the backend
 * returns *by position*, not by threshold — so retuning a threshold in
 * readinessConfig.js recolours correctly without touching this file.
 */
const BAND_TONES = [
  {
    text: "text-success",
    bar: "bg-success",
    badge: "border-success/25 bg-success/10 text-success",
    hex: "#10b981",
  },
  {
    text: "text-primary",
    bar: "bg-primary",
    badge: "border-primary/20 bg-primary/10 text-primary",
    hex: "#4f46e5",
  },
  {
    text: "text-warning-foreground",
    bar: "bg-warning",
    badge: "border-warning/30 bg-warning/10 text-warning-foreground",
    hex: "#f59e0b",
  },
  {
    text: "text-destructive",
    bar: "bg-destructive",
    badge: "border-destructive/25 bg-destructive/10 text-destructive",
    hex: "#ef4444",
  },
] as const;

const NEUTRAL_TONE = {
  text: "text-muted-foreground",
  bar: "bg-muted-foreground/40",
  badge: "border-border bg-muted text-muted-foreground",
  hex: "#a1a1aa",
  label: "—",
};

export type BandTone = typeof NEUTRAL_TONE;

/**
 * Label + colour for a 0-100 score, using the bands the backend supplied.
 * Falls back to a neutral tone with no label when the score is absent or the
 * config has not arrived — inventing a threshold locally is exactly what this
 * module must not do.
 */
export function bandTone(
  score: number | null | undefined,
  bands?: ScoreBand[] | null,
): BandTone {
  if (score === null || score === undefined) return NEUTRAL_TONE;
  if (!bands?.length) {
    return { ...BAND_TONES[1], label: `${score}` };
  }

  // Highest threshold first, so the first match is the right band regardless of
  // the order the backend happened to list them in.
  const ordered = [...bands].sort((a, b) => b.min - a.min);
  const index = ordered.findIndex((b) => score >= b.min);
  const matched = index === -1 ? ordered[ordered.length - 1] : ordered[index];
  const tone = BAND_TONES[Math.min(Math.max(index, 0), BAND_TONES.length - 1)];

  return { ...tone, label: matched?.label ?? `${score}` };
}

// ── Categories ─────────────────────────────────────────────

export const CATEGORY_META: Record<
  CategoryKey,
  { icon: LucideIcon; badge: string; ring: string; text: string }
> = {
  placementReady: {
    icon: CircleCheck,
    badge: "border-success/25 bg-success/10 text-success",
    ring: "border-success/30 bg-success/5",
    text: "text-success",
  },
  highPotential: {
    icon: Rocket,
    badge: "border-primary/20 bg-primary/10 text-primary",
    ring: "border-primary/30 bg-primary/5",
    text: "text-primary",
  },
  needsImprovement: {
    icon: TrendingUp,
    badge: "border-warning/30 bg-warning/10 text-warning-foreground",
    ring: "border-warning/30 bg-warning/5",
    text: "text-warning-foreground",
  },
};

export function categoryMeta(category?: CategoryKey) {
  return CATEGORY_META[category ?? "needsImprovement"] ?? CATEGORY_META.needsImprovement;
}

// ── Components ─────────────────────────────────────────────

export const COMPONENT_ICONS: Record<ComponentKey, LucideIcon> = {
  resume: FileText,
  interview: Brain,
  skillAssessment: Wrench,
  communication: Sparkles,
};

export function componentIcon(key: ComponentKey): LucideIcon {
  return COMPONENT_ICONS[key] ?? FileText;
}

// ── Roadmap ────────────────────────────────────────────────

export const ROADMAP_SECTION_ICONS = {
  technologies: Wrench,
  projects: FolderGit2,
  certifications: Award,
  interviewTopics: BookOpen,
} as const;

export function priorityMeta(priority?: Priority) {
  if (priority === "high")
    return {
      label: "High",
      variant: "destructive" as const,
      dot: "bg-destructive",
    };
  if (priority === "low")
    return { label: "Low", variant: "neutral" as const, dot: "bg-muted-foreground" };
  return { label: "Medium", variant: "warning" as const, dot: "bg-warning" };
}

// ── Trends ─────────────────────────────────────────────────

export function trendMeta(direction: TrendDirection) {
  switch (direction) {
    case "improving":
      return { icon: ArrowUp, label: "Improving", className: "text-success" };
    case "declining":
      return { icon: ArrowDown, label: "Declining", className: "text-destructive" };
    case "new":
      return { icon: Sparkles, label: "New", className: "text-primary" };
    default:
      return { icon: Minus, label: "Steady", className: "text-muted-foreground" };
  }
}

/** Signed delta for display, e.g. "+4" / "-3" / "—". */
export function formatDelta(delta: number | null | undefined): string {
  if (delta === null || delta === undefined) return "—";
  if (delta === 0) return "0";
  return delta > 0 ? `+${delta}` : `${delta}`;
}

export function deltaTone(delta: number | null | undefined): string {
  if (delta === null || delta === undefined || delta === 0)
    return "text-muted-foreground";
  return delta > 0 ? "text-success" : "text-destructive";
}

// ── Tracks ─────────────────────────────────────────────────

export const TRACK_ICONS: Record<TrackKey, LucideIcon> = {
  fresher: GraduationCap,
  internship: BookOpen,
  experienced: Award,
};

export function trackIcon(track?: TrackKey): LucideIcon {
  return TRACK_ICONS[track ?? "fresher"] ?? GraduationCap;
}

// ── Analysis panels ────────────────────────────────────────

export const ANALYSIS_PANELS = [
  {
    key: "technicalStrengths" as const,
    title: "Technical Strengths",
    icon: CircleCheck,
    tone: "success" as const,
    empty: "No measured strengths yet — complete an interview or skill assessment.",
  },
  {
    key: "weakTechnicalAreas" as const,
    title: "Weak Technical Areas",
    icon: TriangleAlert,
    tone: "destructive" as const,
    empty: "Nothing flagged as weak. Keep practising to keep it that way.",
  },
  {
    key: "communicationGaps" as const,
    title: "Communication Gaps",
    icon: Sparkles,
    tone: "warning" as const,
    empty: "Complete a mock interview so your answers can be analysed.",
  },
  {
    key: "missingIndustrySkills" as const,
    title: "Missing Industry Skills",
    icon: Wrench,
    tone: "primary" as const,
    empty: "Your resume covers the expected industry skills for this track.",
  },
];

export const PANEL_TONES = {
  success: {
    wrap: "border-success/25 bg-success/5",
    head: "text-success",
    dot: "bg-success",
  },
  destructive: {
    wrap: "border-destructive/25 bg-destructive/5",
    head: "text-destructive",
    dot: "bg-destructive",
  },
  warning: {
    wrap: "border-warning/30 bg-warning/5",
    head: "text-warning-foreground",
    dot: "bg-warning",
  },
  primary: {
    wrap: "border-primary/20 bg-primary/5",
    head: "text-primary",
    dot: "bg-primary",
  },
} as const;

// ── Formatting ─────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** "2 yrs 6 mo" from a fractional year count. */
export function formatYears(years: number | null | undefined): string {
  if (!years || years <= 0) return "None listed";
  const whole = Math.floor(years);
  const months = Math.round((years - whole) * 12);
  if (whole === 0) return `${months} mo`;
  if (months === 0) return `${whole} yr${whole === 1 ? "" : "s"}`;
  return `${whole} yr${whole === 1 ? "" : "s"} ${months} mo`;
}

export const EXPERIENCE_TYPE_LABEL: Record<string, string> = {
  job: "Full-time",
  internship: "Internship",
  freelance: "Freelance",
  other: "Other",
};

// ── Upload validation ──────────────────────────────────────
// Mirrors what backend/src/routes/readinessRoutes.js enforces. The server is
// still the authority; this only spares the user a round trip.

export const ACCEPTED_RESUME_EXTENSIONS = [".pdf", ".txt"];
export const MAX_RESUME_SIZE_MB = 5;

/** null when the file is acceptable, otherwise the reason it is not. */
export function validateResumeFile(file: File): string | null {
  const name = file.name || "";
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();

  if (!ACCEPTED_RESUME_EXTENSIONS.includes(ext)) {
    return `Upload a ${ACCEPTED_RESUME_EXTENSIONS.join(" or ")} file. Word documents cannot be read reliably.`;
  }
  if (file.size > MAX_RESUME_SIZE_MB * 1024 * 1024) {
    return `File is too large. Maximum size is ${MAX_RESUME_SIZE_MB}MB.`;
  }
  if (file.size === 0) {
    return "That file is empty.";
  }
  return null;
}
