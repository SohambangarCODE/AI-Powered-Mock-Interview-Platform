// Shared contract + presentation helpers for the adaptive interview engine.
// Single source of truth for domain metadata, which previously lived duplicated
// in both the dashboard and the interview screen.

export type Difficulty = "easy" | "medium" | "hard";
export type DifficultyChange = "increase" | "maintain" | "decrease";
export type MessageKind = "question" | "answer" | "feedback" | "nudge" | "system";

// ── API shapes ─────────────────────────────────────────────

export interface Turn {
  index: number;
  topic: string;
  difficulty: Difficulty;
  question: string;
  answer: string;
  /** 0-10. null when the question was skipped or is unanswered. */
  score: number | null;
  feedback: string;
  skipped: boolean;
  askedAt: string;
  answeredAt: string | null;
}

export interface TopicScore {
  topic: string;
  score: number;
  questions: number;
}

export interface ProgressionPoint {
  index: number;
  topic: string;
  difficulty: Difficulty;
  score: number | null;
  skipped: boolean;
}

export interface QuestionPerformance {
  index: number;
  question: string;
  answer: string;
  topic: string;
  difficulty: Difficulty;
  score: number | null;
  feedback: string;
  skipped: boolean;
}

export interface InterviewReport {
  /** 0-100, derived from the per-answer scores minus the skip penalty. */
  overallScore: number;
  answerQuality: number;
  skipPenalty: number;
  /** 0-10 mean across answered questions. */
  averageAnswerScore: number;
  totalQuestions: number;
  answeredCount: number;
  skippedCount: number;
  finalDifficulty: Difficulty;
  difficultyProgression: ProgressionPoint[];
  questionPerformance: QuestionPerformance[];
  topicScores: TopicScore[];
  strongAreas: TopicScore[];
  weakAreas: TopicScore[];
  strengths: string[];
  weaknesses: string[];
  progressionSummary: string;
  recommendations: string[];
  generatedAt: string;
}

export interface StartInterviewResponse {
  sessionId: string;
  question: string;
  difficulty: Difficulty;
  topic: string;
  turnIndex: number;
  answeredCount: number;
  skippedCount: number;
  minQuestions: number;
  maxQuestions: number;
}

export interface SubmitAnswerResponse {
  score?: number | null;
  feedback?: string;
  nextQuestion?: string;
  difficulty?: Difficulty;
  difficultyChange?: DifficultyChange;
  topic?: string;
  turnIndex?: number;
  answeredCount?: number;
  skippedCount?: number;
  isComplete: boolean;
  overallScore?: number;
  report?: InterviewReport;
  endReason?: string;
  /** Set when the answer duplicated an earlier one — no turn was consumed. */
  repeated?: boolean;
  skipped?: boolean;
}

export interface StoredMessage {
  role: "user" | "ai";
  kind: MessageKind;
  content: string;
  timestamp: string;
  difficulty?: Difficulty;
  topic?: string;
  skipped?: boolean;
  score?: number | null;
}

export interface InterviewDetail {
  _id: string;
  domain: string;
  score: number;
  duration: number;
  createdAt: string;
  questionsAnswered: number;
  skippedCount: number;
  isComplete: boolean;
  currentDifficulty: Difficulty;
  askedTopics: string[];
  endReason: string;
  messages: StoredMessage[];
  turns: Turn[];
  report: InterviewReport | null;
}

export interface InterviewSummary {
  id: string;
  topic: string;
  score: number;
  duration: number;
  date: string;
  finalDifficulty: Difficulty;
  questionsAnswered: number;
  skippedCount: number;
  averageAnswerScore: number | null;
}

export interface ActiveSession {
  id: string;
  domain: string;
  currentDifficulty: Difficulty;
  answeredCount: number;
  skippedCount: number;
  turnIndex: number;
  lastActivityAt: string;
}

// ── Chat view model ────────────────────────────────────────

export interface ChatMessage {
  id: string;
  kind: MessageKind;
  content: string;
  isUser: boolean;
  timestamp: Date;
  topic?: string;
  difficulty?: Difficulty;
  score?: number | null;
  skipped?: boolean;
}

// ── Domains ────────────────────────────────────────────────

export interface DomainMeta {
  label: string;
  icon: string;
  desc: string;
}

export const INTERVIEW_DOMAINS: DomainMeta[] = [
  { label: "JavaScript/Node.js", icon: "🟨", desc: "ES6+, async, Node runtime" },
  { label: "React", icon: "⚛️", desc: "Hooks, state, lifecycle" },
  { label: "Python", icon: "🐍", desc: "OOP, data structures, stdlib" },
  { label: "Data Science", icon: "📊", desc: "ML, pandas, statistics" },
  { label: "DevOps", icon: "⚙️", desc: "CI/CD, Docker, Kubernetes" },
  { label: "System Design", icon: "🏗️", desc: "Scalability, architecture" },
  { label: "Database Design", icon: "🗄️", desc: "SQL, NoSQL, indexing" },
  { label: "General", icon: "🎯", desc: "Behavioural & fundamentals" },
];

const FALLBACK_DOMAIN: DomainMeta = {
  label: "General",
  icon: "🎯",
  desc: "Behavioural & fundamentals",
};

export function domainMeta(label?: string): DomainMeta {
  if (!label) return FALLBACK_DOMAIN;
  return (
    INTERVIEW_DOMAINS.find((d) => d.label === label) ?? { ...FALLBACK_DOMAIN, label }
  );
}

export function domainIcon(label?: string): string {
  return domainMeta(label).icon;
}

// ── Difficulty ─────────────────────────────────────────────

export const DIFFICULTY_META: Record<
  Difficulty,
  { label: string; badge: string; dot: string; rank: number }
> = {
  easy: {
    label: "Easy",
    badge:
      "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/25",
    dot: "bg-green-500",
    rank: 0,
  },
  medium: {
    label: "Medium",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
    dot: "bg-blue-500",
    rank: 1,
  },
  hard: {
    label: "Hard",
    badge:
      "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25",
    dot: "bg-purple-500",
    rank: 2,
  },
};

export function difficultyMeta(d?: Difficulty | string) {
  return DIFFICULTY_META[(d as Difficulty) ?? "medium"] ?? DIFFICULTY_META.medium;
}

export const DIFFICULTY_ORDER: Difficulty[] = ["easy", "medium", "hard"];

export function changeIndicator(change?: DifficultyChange) {
  if (change === "increase")
    return { arrow: "↑", label: "Harder", className: "text-purple-500" };
  if (change === "decrease")
    return { arrow: "↓", label: "Easier", className: "text-amber-500" };
  return { arrow: "→", label: "Same", className: "text-muted-foreground" };
}

// ── Scores ─────────────────────────────────────────────────

/** Tone for a per-answer score on the 0-10 scale. */
export function scoreTone(score: number | null | undefined) {
  if (score === null || score === undefined)
    return {
      label: "—",
      text: "text-muted-foreground",
      badge: "bg-muted text-muted-foreground border-border",
      bar: "bg-muted-foreground/40",
      hex: "#a1a1aa",
    };
  if (score >= 8)
    return {
      label: "Strong",
      text: "text-green-600 dark:text-green-400",
      badge:
        "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/25",
      bar: "bg-green-500",
      hex: "#22c55e",
    };
  if (score >= 5)
    return {
      label: "Adequate",
      text: "text-blue-600 dark:text-blue-400",
      badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
      bar: "bg-blue-500",
      hex: "#3b82f6",
    };
  if (score >= 3)
    return {
      label: "Weak",
      text: "text-orange-600 dark:text-orange-400",
      badge:
        "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25",
      bar: "bg-orange-500",
      hex: "#f97316",
    };
  return {
    label: "Poor",
    text: "text-red-600 dark:text-red-400",
    badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25",
    bar: "bg-red-500",
    hex: "#ef4444",
  };
}

/** Tone + copy for the overall 0-100 score. */
export function overallTone(score: number) {
  if (score >= 80)
    return {
      text: "Excellent! You're interview-ready 🚀",
      color: "text-green-600 dark:text-green-400",
      hex: "#22c55e",
    };
  if (score >= 60)
    return {
      text: "Good effort! A few more sessions will get you there 💪",
      color: "text-blue-600 dark:text-blue-400",
      hex: "#3b82f6",
    };
  return {
    text: "Keep practicing! Every session makes you stronger 🌟",
    color: "text-orange-600 dark:text-orange-400",
    hex: "#f97316",
  };
}

// ── Formatting ─────────────────────────────────────────────

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatMinutes(minutes: number): string {
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${minutes}m`;
}

export function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Turn an axios failure into something worth showing a user. */
export function apiErrorMessage(error: unknown, fallback = "Something went wrong."): string {
  const err = error as {
    response?: { status?: number; data?: { message?: string; error?: string } };
  };
  const fromBody = err?.response?.data?.message || err?.response?.data?.error;
  if (fromBody) return fromBody;

  switch (err?.response?.status) {
    case 401:
      return "Authorization error. Please log in again.";
    case 404:
      return "That interview session could not be found.";
    case 409:
      return "That request collided with another. Please try again.";
    case 500:
      return "AI service error. Please try again.";
    default:
      return err?.response ? fallback : "Connection error. Please check your network.";
  }
}
