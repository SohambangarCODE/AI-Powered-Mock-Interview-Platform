"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  Loader2,
  RotateCcw,
  Send,
  Star,
  Swords,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/spinner";
import { AchievementBadge } from "@/components/arena/AchievementBadge";
import { useAuth } from "@/hooks/useAuth";
import axiosInstance from "@/lib/axios";
import {
  CATEGORY_META,
  DIFFICULTY_META,
  formatDuration,
  scoreLabel,
  scoreToneArena,
  type ChallengeQuestion,
  type ChallengeWithQuestions,
  type SubmitResult,
  type Achievement,
} from "@/lib/arena";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────
type Stage =
  | "loading"
  | "ready"       // challenge info shown, not started
  | "answering"   // question-by-question
  | "submitting"  // AI evaluation in progress
  | "results"     // completed
  | "error";

interface StartResponse {
  attemptId: string;
  status: string;
  alreadyStarted: boolean;
  challenge: ChallengeWithQuestions;
}

// ── Score bar ──────────────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-border">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-700",
          score >= 80
            ? "bg-success"
            : score >= 60
              ? "bg-primary"
              : score >= 40
                ? "bg-warning"
                : "bg-destructive",
        )}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

// ── Elapsed timer ──────────────────────────────────────────
function ElapsedTimer({ startedAt }: { startedAt: Date | null }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Clock className="size-3" aria-hidden />
      {formatDuration(elapsed)}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────
export default function ChallengePage() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();

  const [stage, setStage] = useState<Stage>("loading");
  const [error, setError] = useState<string | null>(null);

  // Challenge data
  const [challenge, setChallenge] = useState<ChallengeWithQuestions | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [alreadyStarted, setAlreadyStarted] = useState(false);

  // Answering state
  const [currentQ, setCurrentQ] = useState(0); // 0-based index
  const [answers, setAnswers] = useState<string[]>([]);
  const [draft, setDraft] = useState(""); // current textarea content
  const [startedAt, setStartedAt] = useState<Date | null>(null);

  // Results
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [activeResultQ, setActiveResultQ] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Auth guard ───────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.push("/login");
  }, [isLoggedIn, authLoading, router]);

  // ── Load challenge ───────────────────────────────────────
  const loadChallenge = useCallback(async () => {
    setStage("loading");
    setError(null);
    try {
      const { data }: { data: StartResponse } = await axiosInstance.post(
        `/api/arena/challenges/${challengeId}/start`,
      );
      setChallenge(data.challenge);
      setAttemptId(data.attemptId);
      setAlreadyStarted(data.alreadyStarted);
      setAnswers(
        Array.from({ length: data.challenge.questions.length }, () => ""),
      );

      if (data.status === "completed") {
        // Already submitted — fetch results directly.
        const res = await axiosInstance.get(
          `/api/arena/attempts/${data.attemptId}`,
        );
        // Build a SubmitResult-like structure from stored attempt
        const att = res.data.attempt;
        setResult({
          totalScore: att.totalScore,
          pointsEarned: att.pointsEarned,
          answers: att.answers,
          completedAt: att.completedAt,
          currentStreak: 0,
          longestStreak: 0,
          totalPoints: 0,
          newAchievements: [],
          rank: null,
          alreadyCompleted: true,
        });
        setStage("results");
      } else {
        setStage("ready");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Failed to load challenge. Please try again.",
      );
      setStage("error");
    }
  }, [challengeId]);

  useEffect(() => {
    if (isLoggedIn) loadChallenge();
  }, [isLoggedIn, loadChallenge]);

  // ── Auto-focus textarea ──────────────────────────────────
  useEffect(() => {
    if (stage === "answering") {
      textareaRef.current?.focus();
    }
  }, [stage, currentQ]);

  // ── Handlers ─────────────────────────────────────────────
  const handleStart = () => {
    setStage("answering");
    setStartedAt(new Date());
    setCurrentQ(0);
    setDraft("");
  };

  const handleNext = () => {
    if (!challenge) return;
    // Save draft into answers array
    const updated = [...answers];
    updated[currentQ] = draft.trim();
    setAnswers(updated);
    setDraft(updated[currentQ + 1] || "");
    setCurrentQ((q) => q + 1);
  };

  const handleBack = () => {
    if (currentQ === 0) return;
    const updated = [...answers];
    updated[currentQ] = draft.trim();
    setAnswers(updated);
    setDraft(updated[currentQ - 1] || "");
    setCurrentQ((q) => q - 1);
  };

  const handleSubmit = async () => {
    if (!challenge || !attemptId) return;
    // Save current draft.
    const finalAnswers = [...answers];
    finalAnswers[currentQ] = draft.trim();

    setStage("submitting");
    try {
      const payload = challenge.questions.map((q, i) => ({
        index: q.index,
        answer: finalAnswers[i] || "",
      }));
      const { data } = await axiosInstance.post<SubmitResult>(
        `/api/arena/attempts/${attemptId}/submit`,
        { answers: payload },
      );
      setResult(data);
      setStage("results");
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Submission failed. Please try again.",
      );
      setStage("error");
    }
  };

  // ── Loading / auth ────────────────────────────────────────
  if (authLoading || !isLoggedIn) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center">
        <LoadingState label="Loading…" />
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────
  if (stage === "error") {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <Swords className="mx-auto mb-4 size-10 text-destructive" />
          <h1 className="mb-2 text-xl font-bold text-foreground">
            Something went wrong
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">{error}</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push("/arena")} className="flex-1">
              <ArrowLeft aria-hidden /> Back to Arena
            </Button>
            <Button onClick={loadChallenge} className="flex-1">
              <RotateCcw aria-hidden /> Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── Loading state ─────────────────────────────────────────
  if (stage === "loading") {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-background">
        <LoadingState label="Loading challenge…" />
      </div>
    );
  }

  // ── Submitting state ──────────────────────────────────────
  if (stage === "submitting") {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center bg-background px-4">
        <Loader2 className="mb-4 size-10 animate-spin text-primary" />
        <h2 className="text-lg font-semibold text-foreground">
          AI is evaluating your answers…
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Scoring · Computing points · Checking achievements
        </p>
      </div>
    );
  }

  if (!challenge) return null;

  const cat = CATEGORY_META[challenge.category];
  const diff = DIFFICULTY_META[challenge.difficulty];
  const CatIcon = cat.icon;

  // ── Ready (challenge info) ────────────────────────────────
  if (stage === "ready") {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-lg space-y-6">
          {/* Back link */}
          <button
            type="button"
            onClick={() => router.push("/arena")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to Arena
          </button>

          <Card className="gap-0 overflow-hidden p-0">
            {/* Top accent */}
            <div
              className={cn(
                "h-2 w-full",
                challenge.type === "weekly"
                  ? "bg-chart-5"
                  : "bg-primary",
              )}
            />
            <div className="p-8 text-center">
              <span
                className={cn(
                  "mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl",
                  cat.bgColor,
                  cat.color,
                )}
              >
                <CatIcon className="size-7" aria-hidden />
              </span>

              <div className="mb-1 flex items-center justify-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    challenge.type === "weekly"
                      ? "bg-chart-5/10 text-chart-5"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {challenge.type === "weekly" ? "Weekly" : "Daily"}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    diff.bgColor,
                    diff.color,
                  )}
                >
                  {diff.label}
                </span>
              </div>

              <h1 className="mt-3 text-2xl font-bold text-foreground">
                {challenge.title}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {challenge.description}
              </p>

              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="tnum text-lg font-bold text-foreground">
                    {challenge.questionCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Questions</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="tnum text-lg font-bold text-foreground">
                    ~{Math.ceil((challenge.questionCount * 90) / 60)}m
                  </p>
                  <p className="text-xs text-muted-foreground">Est. time</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="tnum text-lg font-bold text-foreground capitalize">
                    {challenge.category}
                  </p>
                  <p className="text-xs text-muted-foreground">Category</p>
                </div>
              </div>

              {alreadyStarted && (
                <p className="mt-4 text-xs text-warning">
                  You have an in-progress attempt for this challenge.
                </p>
              )}

              <Button
                size="lg"
                className="mt-6 w-full"
                onClick={handleStart}
              >
                <Swords aria-hidden />
                {alreadyStarted ? "Continue Challenge" : "Start Challenge"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ── Answering ─────────────────────────────────────────────
  if (stage === "answering") {
    const question = challenge.questions[currentQ];
    const isLast = currentQ === challenge.questions.length - 1;
    const progress = ((currentQ + 1) / challenge.questions.length) * 100;

    return (
      <div className="min-h-[calc(100dvh-4rem)] bg-background">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          {/* ── Top bar ── */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg",
                  cat.bgColor,
                  cat.color,
                )}
              >
                <CatIcon className="size-4" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-medium text-foreground">{challenge.title}</p>
                <p className={cn("text-[10px]", diff.color)}>{diff.label}</p>
              </div>
            </div>
            <ElapsedTimer startedAt={startedAt} />
          </div>

          {/* ── Progress bar ── */}
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Question {currentQ + 1} of {challenge.questions.length}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* ── Question card ── */}
          <Card className="gap-0 p-0">
            {/* Topic pill */}
            <div className="border-b border-border px-5 py-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                <ChevronRight className="size-3" aria-hidden />
                {question.topic}
              </span>
            </div>

            {/* Question text */}
            <div className="px-5 py-6">
              <p className="text-base font-medium leading-relaxed text-foreground">
                {question.question}
              </p>
            </div>

            {/* Answer textarea */}
            <div className="border-t border-border px-5 pb-5">
              <label
                htmlFor="answer-textarea"
                className="mb-2 block text-xs font-medium text-muted-foreground"
              >
                Your Answer
              </label>
              <textarea
                id="answer-textarea"
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={6}
                placeholder="Type your answer here…"
                className="w-full resize-none rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-ring/30 transition-colors"
              />
              <p className="mt-1.5 text-right text-[10px] text-muted-foreground">
                {draft.length} / 3000
              </p>
            </div>
          </Card>

          {/* ── Navigation ── */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentQ === 0}
            >
              <ArrowLeft aria-hidden /> Back
            </Button>

            <div className="flex gap-1.5">
              {challenge.questions.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    const updated = [...answers];
                    updated[currentQ] = draft.trim();
                    setAnswers(updated);
                    setDraft(updated[i] || "");
                    setCurrentQ(i);
                  }}
                  className={cn(
                    "size-2 rounded-full transition-colors",
                    i === currentQ
                      ? "bg-primary"
                      : answers[i]
                        ? "bg-primary/40"
                        : "bg-border",
                  )}
                  aria-label={`Go to question ${i + 1}`}
                />
              ))}
            </div>

            {isLast ? (
              <Button onClick={handleSubmit}>
                <Send aria-hidden /> Submit
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Next <ArrowRight aria-hidden />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Results ───────────────────────────────────────────────
  if (stage === "results" && result) {
    const isAlreadyDone = result.alreadyCompleted;

    return (
      <div className="min-h-[calc(100dvh-4rem)] bg-background">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          {/* ── Score hero ── */}
          <div className="mb-8 text-center">
            <div
              className={cn(
                "mx-auto mb-4 flex size-20 items-center justify-center rounded-full text-4xl",
                result.totalScore >= 80
                  ? "bg-success/10"
                  : result.totalScore >= 60
                    ? "bg-primary/10"
                    : "bg-warning/10",
              )}
            >
              {result.totalScore >= 80 ? "🏆" : result.totalScore >= 60 ? "✅" : "📝"}
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              {result.totalScore}%
            </h1>
            <p
              className={cn(
                "mt-1 text-lg font-medium",
                scoreToneArena(result.totalScore),
              )}
            >
              {scoreLabel(result.totalScore)}
            </p>
            {!isAlreadyDone && (
              <div className="mt-3 flex items-center justify-center gap-4">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-warning">
                  <Star className="size-4" aria-hidden />+{result.pointsEarned} points
                </span>
                {result.currentStreak > 0 && (
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-warning">
                    <Flame className="size-4" aria-hidden />
                    {result.currentStreak}-day streak
                  </span>
                )}
                {result.rank !== null && (
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-chart-5">
                    <Trophy className="size-4" aria-hidden />
                    Rank #{result.rank}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── New achievements ── */}
          {result.newAchievements.length > 0 && (
            <Card className="mb-6 gap-0 p-0">
              <div className="border-b border-border px-5 py-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Award className="size-4 text-chart-5" aria-hidden />
                  Achievement{result.newAchievements.length > 1 ? "s" : ""} Unlocked!
                </p>
              </div>
              <div className="flex flex-wrap gap-3 p-4">
                {result.newAchievements.map((a: Achievement) => (
                  <AchievementBadge
                    key={a.id}
                    achievement={{ ...a, earned: true }}
                  />
                ))}
              </div>
            </Card>
          )}

          {/* ── Per-question results ── */}
          <Card className="mb-6 gap-0 p-0">
            <div className="border-b border-border px-5 py-3">
              <p className="text-sm font-semibold text-foreground">
                Question Results
              </p>
            </div>

            {/* Question selector */}
            <div className="flex overflow-x-auto border-b border-border">
              {challenge.questions.map((q, i) => {
                const ans = result.answers.find((a) => a.index === q.index);
                const score = ans?.score ?? 0;
                return (
                  <button
                    key={q.index}
                    type="button"
                    onClick={() => setActiveResultQ(i)}
                    className={cn(
                      "shrink-0 px-4 py-2.5 text-xs font-medium transition-colors",
                      i === activeResultQ
                        ? "border-b-2 border-primary text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Q{i + 1}
                    <span
                      className={cn(
                        "ml-1.5 text-[10px] font-semibold",
                        scoreToneArena(score * 10),
                      )}
                    >
                      {score}/10
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Question detail */}
            {(() => {
              const q = challenge.questions[activeResultQ];
              const ans = result.answers.find((a) => a.index === q.index);
              const score = ans?.score ?? 0;
              return (
                <div className="space-y-4 p-5">
                  {/* Score meter */}
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "tnum text-lg font-bold",
                        scoreToneArena(score * 10),
                      )}
                    >
                      {score}/10
                    </span>
                    <div className="flex-1">
                      <ScoreBar score={score * 10} />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      +{ans?.points ?? 0} pts
                    </span>
                  </div>

                  {/* Question */}
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Question
                    </p>
                    <p className="text-sm text-foreground">{q.question}</p>
                  </div>

                  {/* Your answer */}
                  <div className="rounded-lg border border-border p-4">
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Your Answer
                    </p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {ans?.answer || (
                        <span className="italic text-muted-foreground">
                          No answer provided
                        </span>
                      )}
                    </p>
                  </div>

                  {/* AI feedback */}
                  {ans?.feedback && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                        <CheckCircle2 className="size-3" aria-hidden />
                        AI Feedback
                      </p>
                      <p className="text-sm text-foreground">{ans.feedback}</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </Card>

          {/* ── Actions ── */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => router.push("/arena")}
              className="flex-1"
            >
              <ArrowLeft aria-hidden /> Back to Arena
            </Button>
            <Button
              onClick={() => router.push("/arena?tab=leaderboard")}
              className="flex-1"
            >
              <Trophy aria-hidden /> View Leaderboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
