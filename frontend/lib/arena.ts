// Types and presentation helpers for the Peer Challenge Arena.
// Single source of truth for categories, difficulties, and display metadata.

import {
  BookOpen,
  Brain,
  Code2,
  GitBranch,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

// ── API shapes ─────────────────────────────────────────────

export type ChallengeType = "daily" | "weekly";
export type ChallengeCategory =
  | "technical"
  | "hr"
  | "aptitude"
  | "domain"
  | "dsa";
export type ChallengeDifficulty = "easy" | "medium" | "hard";
export type AttemptStatus = "in-progress" | "completed";

export interface ChallengeQuestion {
  index: number;
  question: string;
  topic: string;
}

export interface ChallengeTemplate {
  _id: string;
  type: ChallengeType;
  category: ChallengeCategory;
  difficulty: ChallengeDifficulty;
  title: string;
  description: string;
  questionCount: number;
  periodKey: string;
  expiresAt: string;
  createdAt: string;
  // Enriched by server when listing challenges:
  attempt: AttemptSummary | null;
}

export interface ChallengeWithQuestions extends ChallengeTemplate {
  questions: ChallengeQuestion[];
}

export interface AttemptSummary {
  id: string;
  status: AttemptStatus;
  totalScore: number;
  pointsEarned: number;
  completedAt: string | null;
}

export interface AnswerResult {
  index: number;
  answer: string;
  score: number;
  feedback: string;
  points: number;
}

export interface SubmitResult {
  totalScore: number;
  pointsEarned: number;
  answers: AnswerResult[];
  completedAt: string;
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  newAchievements: Achievement[];
  rank: number | null;
  alreadyCompleted?: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt: string | null;
}

export interface LeaderboardRow {
  rank: number;
  userId: string;
  name: string;
  totalPoints: number;
  totalCompleted: number;
  currentStreak: number;
  longestStreak: number;
  achievementCount: number;
  isCurrentUser: boolean;
}

export interface UserArenaStats {
  rank: number | null;
  totalPoints: number;
  totalCompleted: number;
  currentStreak: number;
  longestStreak: number;
  achievementCount: number;
}

export interface AttemptHistoryItem {
  _id: string;
  challengeId: string;
  category: ChallengeCategory;
  difficulty: ChallengeDifficulty;
  type: ChallengeType;
  title: string;
  totalScore: number;
  pointsEarned: number;
  completedAt: string;
  timeTakenSeconds: number | null;
}

// ── Category metadata ──────────────────────────────────────

interface CategoryMeta {
  label: string;
  icon: LucideIcon;
  color: string;        // Tailwind text class
  bgColor: string;      // Tailwind bg class
  borderColor: string;  // Tailwind border class
  description: string;
}

export const CATEGORY_META: Record<ChallengeCategory, CategoryMeta> = {
  technical: {
    label: "Technical",
    icon: Code2,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/25",
    description: "Software engineering & CS fundamentals",
  },
  hr: {
    label: "HR / Behavioural",
    icon: Brain,
    color: "text-chart-5",
    bgColor: "bg-chart-5/10",
    borderColor: "border-chart-5/25",
    description: "Behavioural & situational questions",
  },
  aptitude: {
    label: "Aptitude",
    icon: HelpCircle,
    color: "text-warning",
    bgColor: "bg-warning/10",
    borderColor: "border-warning/25",
    description: "Logic, reasoning & numerical ability",
  },
  domain: {
    label: "Domain-Specific",
    icon: BookOpen,
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success/25",
    description: "Industry & domain knowledge",
  },
  dsa: {
    label: "DSA",
    icon: GitBranch,
    color: "text-chart-2",
    bgColor: "bg-chart-2/10",
    borderColor: "border-chart-2/25",
    description: "Data structures & algorithms",
  },
};

// ── Difficulty metadata ────────────────────────────────────

interface DifficultyMeta {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  dot: string;
}

export const DIFFICULTY_META: Record<ChallengeDifficulty, DifficultyMeta> = {
  easy: {
    label: "Easy",
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success/25",
    dot: "bg-success",
  },
  medium: {
    label: "Medium",
    color: "text-warning",
    bgColor: "bg-warning/10",
    borderColor: "border-warning/25",
    dot: "bg-warning",
  },
  hard: {
    label: "Hard",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/25",
    dot: "bg-destructive",
  },
};

// ── Score helpers ──────────────────────────────────────────

export function scoreToneArena(score: number): string {
  if (score >= 90) return "text-success";
  if (score >= 70) return "text-primary";
  if (score >= 50) return "text-warning";
  return "text-destructive";
}

export function scoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Great";
  if (score >= 60) return "Good";
  if (score >= 45) return "Fair";
  return "Needs work";
}

// ── Time helpers ───────────────────────────────────────────

export function formatTimeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h left`;
  }
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

// ── Points colour ──────────────────────────────────────────

export function pointsColor(points: number): string {
  if (points >= 200) return "text-chart-5";
  if (points >= 100) return "text-primary";
  if (points >= 50)  return "text-success";
  return "text-muted-foreground";
}
