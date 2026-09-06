import {
  Building2,
  CircleCheck,
  CircleSlash,
  Rocket,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Difficulty } from "@/lib/interview";

// ── API shapes ─────────────────────────────────────────────

export interface EvaluationCriterion {
  label: string;
  weight: number;
  description: string;
}

export interface ExpectedStandard {
  minOverallScore: number;
  minAverageAnswerScore: number;
  maxSkipRate: number;
  label: string;
}

export interface CompanyRole {
  id: string;
  label: string;
  /** Always one of the existing interview domains. */
  domain: string;
  emphasis: string[];
}

export interface CompanyRound {
  id: string;
  label: string;
  order: number;
  focus: string[];
  description: string;
}

export interface CompanyProfile {
  slug: string;
  name: string;
  tier: string;
  blurb: string;
  baseDifficulty: Difficulty;
  focusAreas: string[];
  questionTypes: string[];
  evaluationCriteria: EvaluationCriterion[];
  expectedStandard: ExpectedStandard;
  roles: CompanyRole[];
  rounds: CompanyRound[];
}

/** The company stamp carried by a simulator interview session. */
export interface CompanyMeta {
  slug: string;
  name: string;
  roleId?: string;
  roleLabel?: string;
  roundId?: string;
  roundLabel?: string;
  /** Present on history rows once the session has a report. */
  meetsStandard?: boolean | null;
}

/** The company block the backend adds to a simulator session's report. */
export interface CompanyReportSection {
  slug: string;
  name: string;
  roleLabel: string;
  roundLabel: string;
  expectedStandard: ExpectedStandard;
  candidateScore: number;
  candidateAverageAnswerScore: number;
  /** 0-1. */
  skipRate: number;
  meetsStandard: boolean;
  /** Points below the expected overall score; 0 when the bar was cleared. */
  standardGap: number;
  evaluationCriteria: EvaluationCriterion[];
  focusAreas: string[];
  improvementAreas: string[];
  companyFeedback: string;
  preparationAreas: string[];
  disclaimer: string;
}

export interface CompanySessionSummary {
  id: string;
  companySlug: string;
  companyName: string;
  roleLabel: string;
  roundLabel: string;
  domain: string;
  score: number;
  duration: number;
  date: string;
  questionsAnswered: number;
  skippedCount: number;
  meetsStandard: boolean | null;
  expectedScore: number | null;
}

// ── Presentation ───────────────────────────────────────────

/** Icon per configured tier. Purely decorative; unknown tiers get a default. */
export function tierIcon(tier?: string): LucideIcon {
  switch (tier) {
    case "faang":
      return Sparkles;
    case "big-tech":
      return Building2;
    case "service":
      return Users;
    case "startup":
      return Rocket;
    default:
      return Building2;
  }
}

export function tierLabel(tier?: string): string {
  switch (tier) {
    case "faang":
      return "FAANG-style";
    case "big-tech":
      return "Big tech";
    case "service":
      return "Service company";
    case "startup":
      return "Startup";
    default:
      return "Company";
  }
}

/** Tone for the meets/does-not-meet verdict. `null` = no verdict recorded. */
export function standardVerdict(meetsStandard: boolean | null | undefined) {
  if (meetsStandard === null || meetsStandard === undefined)
    return {
      label: "Not assessed",
      badge: "bg-muted text-muted-foreground border-border",
      text: "text-muted-foreground",
      icon: CircleSlash,
    };
  if (meetsStandard)
    return {
      label: "Meets the simulated standard",
      badge: "bg-success/10 text-success border-success/25",
      text: "text-success",
      icon: CircleCheck,
    };
  return {
    label: "Below the simulated standard",
    badge: "bg-warning/15 text-warning-foreground border-warning/30",
    text: "text-warning-foreground",
    icon: CircleSlash,
  };
}

/** Build the interview URL for a resolved selection. */
export function simulatorHref(
  companySlug: string,
  roleId: string,
  roundId: string,
): string {
  const params = new URLSearchParams({
    company: companySlug,
    role: roleId,
    round: roundId,
  });
  return `/interview?${params.toString()}`;
}
