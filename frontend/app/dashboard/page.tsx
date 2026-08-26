"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  Brain,
  Calendar,
  ChartColumn,
  CircleCheck,
  ClipboardList,
  Clock,
  CloudUpload,
  FileText,
  Filter,
  Gauge,
  ListChecks,
  NotebookPen,
  Play,
  Plus,
  RotateCcw,
  ScanSearch,
  SkipForward,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  TriangleAlert,
  Trophy,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { Skeleton, Spinner, LoadingState } from "@/components/ui/spinner";
import { StatCard } from "@/components/ui/stat-card";
import { useAuth } from "@/hooks/useAuth";
import axiosInstance from "@/lib/axios";
import {
  INTERVIEW_DOMAINS,
  difficultyMeta,
  domainIcon,
  formatDate,
  formatMinutes,
  formatRelative,
  scoreTone,
  type ActiveSession,
  type InterviewSummary,
} from "@/lib/interview";
import { cn } from "@/lib/utils";

interface ResumeAnalysis {
  summary: string;
  strengths: string[];
  recommendedDomains: { label: string; reason: string; confidence: number }[];
  experienceLevel: "Junior" | "Mid" | "Senior";
  skillsDetected: string[];
}


const LEVEL_BADGE: Record<string, string> = {
  Senior: "border-chart-5/25 bg-chart-5/10 text-chart-5",
  Mid: "border-primary/20 bg-primary/10 text-primary",
  Junior: "border-success/25 bg-success/10 text-success",
};

function ResumePanel({
  onDomainSelect,
}: {
  onDomainSelect: (d: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"upload" | "analyzing" | "results">(
    "upload",
  );
  const [analyzingStep, setAnalyzingStep] = useState(0);

  const analyzingSteps = [
    "Reading your resume…",
    "Detecting skills & technologies…",
    "Mapping to interview domains…",
    "Generating recommendations…",
  ];
  const handleFile = (f: File) => {
    const allowedTypes = [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const isTypeAllowed = allowedTypes.includes(f.type);
    const allowedExtensions = [".pdf", ".txt", ".doc", ".docx"];
    const fileExtension = f.name?.substring(f.name?.lastIndexOf('.') ?? 0) || '';
    const isExtensionAllowed = allowedExtensions.some(ext =>
      fileExtension.toLowerCase().endsWith(ext)
    );

    if (!isTypeAllowed && !isExtensionAllowed) {
      setError("Please upload a PDF, DOC, DOCX, or TXT file.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("File must be under 5MB.");
      return;
    }
    setFile(f);
    setError(null);
    setAnalysis(null);
    setStep("upload");
  };
  const handleAnalyze = async () => {
    if (!file) return;
    setStep("analyzing");
    setError(null);
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % analyzingSteps.length;
      setAnalyzingStep(idx);
    }, 1100);
    try {
      const formData = new FormData();
      if (file) {
        formData.append("resume", file);
      }
      const { data } = await axiosInstance.post(
        "/api/resume/analyze",
        formData,
      );
      setAnalysis(data.analysis);
      setStep("results");
    } catch (error: any) {
      let errorMessage: string;
      if (error?.response?.status === 400) {
        errorMessage = error.response.data.error || "Invalid file format or file too large.";
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.status === 500) {
        // Check for specific error messages from backend
        const backendMsg = error?.response?.data?.error || '';
        if (backendMsg.includes("AI service error")) {
          errorMessage = "AI service error. Please try again later.";
        } else if (backendMsg.includes("Failed to extract")) {
          errorMessage = "Failed to extract text from resume.";
        } else if (backendMsg.includes("Failed to parse")) {
          errorMessage = "Failed to analyze resume data.";
        } else {
          errorMessage = "AI analysis failed. Please try again.";
        }
      } else {
        errorMessage = "Connection error. Please check your network.";
      }
      setError(errorMessage);
      setStep("upload");
    } finally {
      clearInterval(interval);
    }
  };
  const reset = () => {
    setFile(null);
    setAnalysis(null);
    setError(null);
    setStep("upload");
  };

  const openPicker = () => fileRef.current?.click();

  return (
    <Card className="gap-0 overflow-hidden p-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="size-[18px]" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              AI Resume Analysis
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Upload your resume · Get domain recommendations
            </p>
          </div>
        </div>
        {step === "results" && (
          <Button variant="outline" size="sm" onClick={reset} className="shrink-0">
            <CloudUpload aria-hidden />
            Upload new
          </Button>
        )}
      </div>

      <div className="p-5">
        {/* Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <div
              role="button"
              tabIndex={0}
              aria-label="Choose a resume file"
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
              onClick={openPicker}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openPicker();
                }
              }}
              className={cn(
                "relative cursor-pointer rounded-xl border border-dashed p-8 text-center transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                dragging
                  ? "border-primary bg-primary/5"
                  : file
                    ? "border-primary/40 bg-primary/5"
                    : "border-border-strong hover:border-primary/50 hover:bg-muted/40",
              )}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />

              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                    <FileText className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 text-left">
                    <p className="max-w-[200px] truncate text-sm font-medium text-foreground">
                      {file.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(0)} KB ·{" "}
                      {file.type.includes("pdf") ? "PDF" : "Document"}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Remove file"
                    onClick={(e) => {
                      e.stopPropagation();
                      reset();
                    }}
                    className="ml-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors outline-none hover:bg-border hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <span className="mb-3 flex size-11 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
                    <CloudUpload className="size-5" aria-hidden />
                  </span>
                  <p className="text-sm font-medium text-foreground">
                    Drop your resume here
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    or click to browse · PDF, DOC, DOCX, TXT · Max 5 MB
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5"
              >
                <TriangleAlert
                  className="mt-px size-4 shrink-0 text-destructive"
                  aria-hidden
                />
                <p className="text-sm font-medium text-destructive">{error}</p>
              </div>
            )}

            {!file && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  {
                    icon: ScanSearch,
                    label: "Skills Detection",
                    desc: "Frameworks, languages, tools",
                  },
                  {
                    icon: ChartColumn,
                    label: "Experience Level",
                    desc: "Junior / Mid / Senior",
                  },
                  {
                    icon: Target,
                    label: "Domain Matching",
                    desc: "Best-fit interview areas",
                  },
                  {
                    icon: Award,
                    label: "Strength Analysis",
                    desc: "Your competitive edge",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 p-3"
                    >
                      <Icon
                        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">
                          {item.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Button
              onClick={handleAnalyze}
              disabled={!file}
              size="lg"
              className="w-full"
            >
              <Sparkles aria-hidden />
              Analyse Resume with AI
            </Button>
          </div>
        )}

        {/* Analyzing */}
        {step === "analyzing" && (
          <div className="flex flex-col items-center gap-5 py-10">
            <Spinner size="lg" className="text-primary" label="Analysing" />
            <div className="space-y-1.5 text-center">
              <p className="text-sm font-semibold text-foreground">
                Groq AI is reading your resume…
              </p>
              <p aria-live="polite" className="text-xs text-muted-foreground">
                {analyzingSteps[analyzingStep]}
              </p>
            </div>
            <div className="h-1.5 w-64 overflow-hidden rounded-full bg-border">
              <div
                className="h-full animate-pulse rounded-full bg-primary"
                style={{ width: "70%" }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              This usually takes 5–10 seconds
            </p>
          </div>
        )}

        {/* Results */}
        {step === "results" && analysis && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Brain className="size-4 text-primary" aria-hidden />
                <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
                  AI Summary
                </p>
                <Badge
                  variant="outline"
                  size="sm"
                  className={cn(
                    "ml-auto",
                    LEVEL_BADGE[analysis.experienceLevel],
                  )}
                >
                  {analysis.experienceLevel} Level
                </Badge>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {analysis.summary}
              </p>
            </div>

            {/* Skills */}
            {analysis.skillsDetected.length > 0 && (
              <div>
                <p className="mb-2.5 flex items-center gap-2 text-xs font-semibold tracking-wide text-foreground uppercase">
                  <Wrench className="size-3.5 text-muted-foreground" aria-hidden />
                  Skills Detected
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.skillsDetected.map((skill) => (
                    <Badge key={skill} variant="neutral" size="sm">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended domains */}
            <div>
              <p className="mb-2.5 flex items-center gap-2 text-xs font-semibold tracking-wide text-foreground uppercase">
                <Target className="size-3.5 text-muted-foreground" aria-hidden />
                Recommended Interview Domains
              </p>
              <div className="space-y-2">
                {analysis.recommendedDomains.map((rec, i) => {
                  const Icon = domainIcon(rec.label);
                  return (
                    <button
                      key={rec.label}
                      type="button"
                      onClick={() => onDomainSelect(rec.label)}
                      className="group flex w-full items-center gap-3 rounded-lg border border-border p-3.5 text-left transition-colors outline-none hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground transition-colors group-hover:border-primary/25 group-hover:bg-primary/10 group-hover:text-primary">
                        <Icon className="size-[18px]" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center gap-2">
                          {i === 0 && (
                            <Badge variant="solid" size="sm">
                              TOP PICK
                            </Badge>
                          )}
                          <p className="truncate text-sm font-semibold text-foreground">
                            {rec.label}
                          </p>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {rec.reason}
                        </p>
                      </div>
                      <div className="flex w-14 shrink-0 flex-col items-end gap-1.5">
                        <p className="tnum text-xs font-semibold text-primary">
                          {rec.confidence}%
                        </p>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${rec.confidence}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Strengths */}
            {analysis.strengths.length > 0 && (
              <div className="rounded-xl border border-success/25 bg-success/5 p-4">
                <p className="mb-2.5 flex items-center gap-2 text-xs font-semibold tracking-wide text-success uppercase">
                  <CircleCheck className="size-3.5" aria-hidden />
                  Your Strengths
                </p>
                <ul className="space-y-2">
                  {analysis.strengths.map((s) => (
                    <li
                      key={s}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span
                        className="mt-1.5 size-1.5 shrink-0 rounded-full bg-success"
                        aria-hidden
                      />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground">
              Click any domain above to start a tailored interview session
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

const TABS = [
  { id: "history", label: "Interview History", icon: ListChecks },
  { id: "resume", label: "Resume Analysis", icon: FileText },
] as const;

const page = () => {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading, user } = useAuth();
  const [interviews, setIntervies] = useState<InterviewSummary[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [ShowDomainSelector, setShowDomainSelector] = useState(false);
  const [filterDomain, setFilterDomain] = useState<string>("All");
  const [activeTab, setActiveTab] = useState<"history" | "resume">("history");

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, authLoading, router]);

  useEffect(() => {
    if (isLoggedIn) fetchInterviews();
  }, [isLoggedIn]);
  const fetchInterviews = async () => {
    try {
      setDataLoading(true);
      // Completed history and in-progress sessions are separate endpoints;
      // neither should block the other from rendering.
      const [history, active] = await Promise.allSettled([
        axiosInstance.get("/api/interviews"),
        axiosInstance.get("/api/interviews/active"),
      ]);
      if (history.status === "fulfilled")
        setIntervies(history.value.data.interviews || []);
      else console.error("Failed to fetch interviews:", history.reason);

      if (active.status === "fulfilled")
        setActiveSessions(active.value.data.active || []);
    } finally {
      setDataLoading(false);
    }
  };
  const handleSelectDomain = (domain: string) => {
    router.push(`/interview?domain=${encodeURIComponent(domain)}`);
  };
  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-background">
        <LoadingState label="Loading…" />
      </div>
    );
  }
  if (!isLoggedIn) return null;

  const avgScore = interviews.length
    ? Math.round(
        interviews.reduce((s, i) => s + i.score, 0) / interviews.length,
      )
    : null;
  const totalMinutes = interviews.reduce((s, i) => s + i.duration, 0);
  const bestScore = interviews.length
    ? Math.max(...interviews.map((i) => i.score))
    : null;
  // The API sorts newest-first, so take the newest six then flip them into
  // chronological order for the trend line.
  const recentScores = interviews
    .slice(0, 6)
    .map((i) => i.score)
    .reverse();
  const uniqueDomains = [
    "All",
    ...Array.from(new Set(interviews.map((i) => i.topic))),
  ];
  const filtered =
    filterDomain === "All"
      ? interviews
      : interviews.filter((i) => i.topic === filterDomain);

  const firstName = user?.name ? user.name.split(" ")[0] : "";
  const initials =
    (user?.name || "U")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  const tabCount: Record<string, number | undefined> = {
    history: interviews.length,
    resume: undefined,
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {/* ── Header ── */}
        <PageHeader
          eyebrow={`Welcome back${firstName ? `, ${firstName}` : ""}`}
          title="Your Dashboard"
          actions={
            <Button size="lg" onClick={() => setShowDomainSelector(true)}>
              <Plus aria-hidden />
              New Interview
            </Button>
          }
        />

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
          {/* ── Side rail (desktop) ── */}
          <aside className="hidden lg:sticky lg:top-24 lg:block">
            <div className="space-y-6">
              {/* User profile */}
              <Card className="gap-0 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {initials}
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {user?.name || "User"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Section nav — switches the panel on the right */}
              <nav aria-label="Dashboard sections" className="space-y-1">
                <p className="px-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Sections
                </p>
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  const count = tabCount[tab.id];
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="truncate">{tab.label}</span>
                      {count !== undefined && count > 0 && (
                        <span className="tnum ml-auto text-xs text-muted-foreground">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* ── Main column ── */}
          <div className="min-w-0 space-y-8">
            {/* ── Continue where you left off ── */}
            {activeSessions.length > 0 && (
              <section className="space-y-3">
                <SectionHeader
                  title="Continue where you left off"
                  description={`${activeSessions.length} session${activeSessions.length === 1 ? "" : "s"} still in progress`}
                />
                <Card className="gap-0 divide-y divide-border overflow-hidden border-primary/30 p-0">
                  {activeSessions.map((session) => {
                    const diff = difficultyMeta(session.currentDifficulty);
                    const Icon = domainIcon(session.domain);
                    return (
                      <div
                        key={session.id}
                        className="flex flex-wrap items-center gap-3 bg-primary/5 p-4"
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                          <Icon className="size-[18px]" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="mb-0.5 flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {session.domain}
                            </p>
                            <Badge
                              variant="outline"
                              size="sm"
                              className={diff.badge}
                            >
                              <span
                                className={cn(
                                  "size-1.5 rounded-full",
                                  diff.dot,
                                )}
                                aria-hidden
                              />
                              {diff.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            On Q{session.turnIndex} · {session.answeredCount}{" "}
                            answered
                            {session.skippedCount > 0 &&
                              ` · ${session.skippedCount} skipped`}{" "}
                            · {formatRelative(session.lastActivityAt)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() =>
                            router.push(`/interview?session=${session.id}`)
                          }
                          className="shrink-0"
                        >
                          <Play aria-hidden />
                          Resume
                        </Button>
                      </div>
                    );
                  })}
                </Card>
              </section>
            )}

            {/* ── Statistics ── */}
            <section
              aria-label="Practice statistics"
              className="grid grid-cols-2 gap-4 xl:grid-cols-4"
            >
              <StatCard
                label="Total Sessions"
                value={interviews.length}
                sub={`${interviews.length} session${interviews.length !== 1 ? "s" : ""}`}
                icon={ClipboardList}
              />
              <StatCard
                label="Average Score"
                value={avgScore !== null ? `${avgScore}%` : "—"}
                sub={
                  avgScore !== null
                    ? avgScore >= 80
                      ? "Excellent"
                      : avgScore >= 60
                        ? "Good"
                        : "Keep going"
                    : "No data yet"
                }
                icon={Gauge}
                tone="primary"
                className="border-primary/30 bg-primary/5"
              />
              <StatCard
                label="Best Score"
                value={bestScore !== null ? `${bestScore}%` : "—"}
                sub={bestScore !== null ? "Personal best" : "No data yet"}
                icon={Trophy}
              />
              <StatCard
                label="Practice Time"
                value={formatMinutes(totalMinutes)}
                sub="Total invested"
                icon={Clock}
              />
            </section>

            {/* ── Score trend ── */}
            {recentScores.length >= 2 && (
              <Card className="gap-0 p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <TrendingUp className="size-4" aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Score Trend
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last {recentScores.length} sessions
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <MiniSparkline scores={recentScores} />
                    <div className="text-right">
                      <p className="text-xs tracking-wide text-muted-foreground uppercase">
                        Latest
                      </p>
                      <p className="tnum text-lg font-semibold text-primary">
                        {recentScores[recentScores.length - 1]}%
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* ── Sections ── */}
            <section>
              {/* Tab strip — the rail replaces this from lg up */}
              <nav
                aria-label="Dashboard sections"
                className="mb-6 flex items-center gap-1 border-b border-border lg:hidden"
              >
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        active
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>

              {activeTab === "history" && (
                <div className="space-y-4">
                  <SectionHeader
                    title="Interview History"
                    description="Your recent practice sessions"
                    actions={
                      uniqueDomains.length > 1 ? (
                        <div className="flex items-center gap-2">
                          <Filter
                            className="size-3.5 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                          <div className="flex flex-wrap gap-1.5">
                            {uniqueDomains.map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setFilterDomain(d)}
                                aria-pressed={filterDomain === d}
                                className={cn(
                                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                                  filterDomain === d
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
                                )}
                              >
                                {d}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : undefined
                    }
                    className="sm:items-end"
                  />

                  {dataLoading ? (
                    <Card className="gap-0 divide-y divide-border p-0">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-4">
                          <Skeleton className="size-10 shrink-0 rounded-lg" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                          <Skeleton className="h-8 w-20 shrink-0 rounded-md" />
                        </div>
                      ))}
                    </Card>
                  ) : filtered.length === 0 && interviews.length === 0 ? (
                    <Card className="border-dashed p-0">
                      <EmptyState
                        icon={NotebookPen}
                        title="No sessions yet"
                        description="Start a practice interview or upload your resume for personalised domain suggestions."
                        action={
                          <>
                            <Button onClick={() => setShowDomainSelector(true)}>
                              <Plus aria-hidden />
                              Start Interview
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setActiveTab("resume")}
                            >
                              <FileText aria-hidden />
                              Analyse Resume
                            </Button>
                          </>
                        }
                      />
                    </Card>
                  ) : filtered.length === 0 ? (
                    <Card className="p-0">
                      <EmptyState
                        icon={Filter}
                        title={`No sessions for "${filterDomain}"`}
                        action={
                          <Button
                            variant="outline"
                            onClick={() => setFilterDomain("All")}
                          >
                            Show all sessions
                          </Button>
                        }
                      />
                    </Card>
                  ) : (
                    <Card className="gap-0 divide-y divide-border overflow-hidden p-0">
                      {/* Already newest-first from the API — no reverse. */}
                      {filtered.map((interview) => {
                        const diff = difficultyMeta(interview.finalDifficulty);
                        const answerTone = scoreTone(
                          interview.averageAnswerScore,
                        );
                        const Icon = domainIcon(interview.topic);
                        return (
                          <div
                            key={interview.id}
                            className="group flex flex-col gap-3 p-4 transition-colors hover:bg-muted/40 md:flex-row md:items-center md:gap-4"
                          >
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground transition-colors group-hover:border-primary/25 group-hover:bg-primary/10 group-hover:text-primary">
                              <Icon className="size-[18px]" aria-hidden />
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {interview.topic}
                                </p>
                                <ScoreBadge score={interview.score} />
                                <Badge
                                  variant="outline"
                                  size="sm"
                                  className={diff.badge}
                                >
                                  ended {diff.label.toLowerCase()}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <Meta icon={Calendar}>
                                  {formatDate(interview.date)}
                                </Meta>
                                <Meta icon={Clock}>
                                  {formatMinutes(interview.duration)}
                                </Meta>
                                <Meta icon={CircleCheck}>
                                  {interview.questionsAnswered} answered
                                </Meta>
                                {interview.skippedCount > 0 && (
                                  <Meta icon={SkipForward}>
                                    {interview.skippedCount} skipped
                                  </Meta>
                                )}
                                {interview.averageAnswerScore !== null && (
                                  <Meta
                                    icon={Star}
                                    className={answerTone.text}
                                  >
                                    {interview.averageAnswerScore}/10 avg
                                  </Meta>
                                )}
                              </div>
                            </div>

                            <div className="hidden w-24 shrink-0 flex-col items-end gap-1.5 lg:flex">
                              <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                                Score
                              </p>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${interview.score}%` }}
                                />
                              </div>
                              <p className="tnum text-xs font-semibold text-foreground">
                                {interview.score}%
                              </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  router.push(`/interviews/${interview.id}`)
                                }
                              >
                                Details
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleSelectDomain(interview.topic)
                                }
                              >
                                <RotateCcw aria-hidden />
                                Retake
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </Card>
                  )}
                </div>
              )}

              {activeTab === "resume" && (
                <ResumePanel onDomainSelect={handleSelectDomain} />
              )}
            </section>
          </div>
        </div>
      </div>

      {/* ── Domain picker ── */}
      <Modal
        open={ShowDomainSelector}
        onOpenChange={setShowDomainSelector}
        title="Pick a Domain"
        description="Choose what you want to practice today"
        className="max-w-2xl"
        footer={
          <Button
            variant="ghost"
            onClick={() => setShowDomainSelector(false)}
          >
            Cancel
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {INTERVIEW_DOMAINS.map((domain) => {
            const Icon = domain.icon;
            return (
              <button
                key={domain.label}
                type="button"
                onClick={() => {
                  setShowDomainSelector(false);
                  handleSelectDomain(domain.label);
                }}
                className="group flex items-center gap-3 rounded-lg border border-border p-3.5 text-left transition-colors outline-none hover:border-primary/50 hover:bg-primary/5 focus-visible:border-primary/50 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground transition-colors group-hover:border-primary/25 group-hover:bg-primary/10 group-hover:text-primary group-focus-visible:text-primary">
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {domain.label}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {domain.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
};

/** One icon + value pair on a history row's metadata line. */
function Meta({
  icon: Icon,
  children,
  className,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-1.5", className)}>
      <Icon className="size-3.5 shrink-0 opacity-70" aria-hidden />
      {children}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const variant = score >= 80 ? "success" : score >= 60 ? "default" : "warning";
  const dot =
    score >= 80 ? "bg-success" : score >= 60 ? "bg-primary" : "bg-warning";
  return (
    <Badge variant={variant} size="sm" className="tnum">
      <span className={cn("size-1.5 rounded-full", dot)} aria-hidden />
      {score}%
    </Badge>
  );
}

function MiniSparkline({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null;
  const max = Math.max(...scores, 100);
  const min = Math.min(...scores, 0);
  const range = max - min || 1;
  const w = 112,
    h = 32;
  const coords = scores.map((s, i) => ({
    x: (i / (scores.length - 1)) * w,
    y: h - ((s - min) / range) * h,
  }));
  const pts = coords.map((p) => `${p.x},${p.y}`).join(" ");
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={`Score trend: ${scores.join("%, ")}%`}
      className="overflow-visible"
    >
      {/* Faint fill under the line so the direction reads at a glance */}
      <polygon
        points={`0,${h} ${pts} ${w},${h}`}
        className="fill-primary/10"
        stroke="none"
      />
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-primary"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {coords.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" className="fill-primary" />
      ))}
    </svg>
  );
}
export default page;
