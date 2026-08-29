"use client";

import {
  Check,
  CircleCheck,
  CircleX,
  Info,
  ListChecks,
  Play,
  RotateCcw,
  TriangleAlert,
  Wrench,
  X,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/spinner";
import { Modal } from "@/components/ui/modal";
import { difficultyMeta, formatDate, formatRelative } from "@/lib/interview";
import {
  bandTone,
  type Quiz,
  type ScoreBand,
} from "@/lib/readiness";
import { useSkillAssessment } from "@/hooks/useSkillAssessment";
import { cn } from "@/lib/utils";

/**
 * The skill-assessment input to the readiness score.
 *
 * Questions are generated server-side from the candidate's own resume skills and
 * arrive without the answer key; the score comes back from the server on submit.
 * This surface can neither see nor decide a correct answer before then.
 */
export default function SkillAssessmentCard({
  enabled,
  questionCount,
  maxSkills,
  bands,
  onCompleted,
}: {
  enabled: boolean;
  questionCount?: number;
  maxSkills?: number;
  bands?: ScoreBand[] | null;
  onCompleted?: () => void;
}) {
  const {
    state,
    loading,
    loadError,
    reload,
    active,
    answers,
    answeredCount,
    choose,
    start,
    starting,
    submit,
    submitting,
    close,
    resume,
    actionError,
    dismissActionError,
  } = useSkillAssessment(enabled);

  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [review, setReview] = useState<Quiz | null>(null);

  const skillCap = maxSkills ?? 4;
  const available = state?.availableSkills ?? [];
  const history = state?.history ?? [];
  const latest = state?.latest ?? null;
  const inProgress = state?.inProgress ?? null;

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill)
        ? prev.filter((s) => s !== skill)
        : prev.length >= skillCap
          ? prev
          : [...prev, skill],
    );
  };

  const handleStart = async () => {
    dismissActionError();
    await start(selectedSkills);
  };

  const handleSubmit = async () => {
    const graded = await submit();
    if (graded) {
      setReview(graded);
      setSelectedSkills([]);
      onCompleted?.();
    }
  };

  const latestTone = bandTone(latest?.overallScore, bands);

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Wrench className="size-[18px]" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Skill Assessment
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {history.length > 0
                ? `${history.length} completed · feeds your readiness score`
                : "Quick MCQ test on your own resume skills"}
            </p>
          </div>
        </div>
        {latest && (
          <div className="flex shrink-0 items-center gap-2">
            <p className={cn("tnum text-2xl font-semibold", latestTone.text)}>
              {latest.overallScore}
            </p>
            <span className="text-xs text-muted-foreground">latest</span>
          </div>
        )}
      </div>

      <div className="p-5">
        {loading && <LoadingState label="Loading your assessments" />}

        {!loading && loadError && (
          <div className="space-y-3">
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5"
            >
              <TriangleAlert
                className="mt-px size-4 shrink-0 text-destructive"
                aria-hidden
              />
              <p className="text-sm font-medium text-destructive">{loadError}</p>
            </div>
            <Button variant="outline" size="sm" onClick={reload}>
              <RotateCcw aria-hidden />
              Try again
            </Button>
          </div>
        )}

        {!loading && !loadError && (
          <div className="space-y-5">
            {state?.usingFallbackSkills && (
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5"
              >
                <Info
                  className="mt-px size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <p className="text-sm text-muted-foreground">
                  These are general software skills. Upload a resume above and
                  future assessments will test the skills you actually claim.
                </p>
              </div>
            )}

            {actionError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5"
              >
                <TriangleAlert
                  className="mt-px size-4 shrink-0 text-destructive"
                  aria-hidden
                />
                <p className="flex-1 text-sm font-medium text-destructive">
                  {actionError}
                </p>
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={dismissActionError}
                  className="shrink-0 text-destructive/70 transition-colors outline-none hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </div>
            )}

            {/* ── Unfinished quiz ── */}
            {inProgress && !active && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    Assessment in progress
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {inProgress.questionCount} questions on{" "}
                    {inProgress.skills.join(", ")} · started{" "}
                    {formatRelative(inProgress.createdAt)}
                  </p>
                </div>
                <Button size="sm" onClick={resume} className="shrink-0">
                  <Play aria-hidden />
                  Resume
                </Button>
              </div>
            )}

            {/* ── Skill picker ── */}
            {!inProgress && (
              <div>
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
                    Choose skills to test
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedSkills.length > 0
                      ? `${selectedSkills.length}/${skillCap} selected`
                      : `Optional · up to ${skillCap}, else we pick your weakest`}
                  </p>
                </div>

                {available.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {available.map((skill) => {
                      const on = selectedSkills.includes(skill);
                      const full = !on && selectedSkills.length >= skillCap;
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          disabled={full}
                          aria-pressed={on}
                          className={cn(
                            "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                            on
                              ? "border-primary bg-primary text-primary-foreground"
                              : full
                                ? "cursor-not-allowed border-border bg-muted text-muted-foreground/50"
                                : "border-border bg-muted text-muted-foreground hover:border-primary/40 hover:text-foreground",
                          )}
                        >
                          {on && <Check className="size-3" aria-hidden />}
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No skills available yet.
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button
                    onClick={handleStart}
                    loading={starting}
                    disabled={available.length === 0}
                  >
                    {!starting && <Play aria-hidden />}
                    {starting
                      ? "Generating questions…"
                      : history.length > 0
                        ? "Take another assessment"
                        : "Start assessment"}
                  </Button>
                  {questionCount && (
                    <p className="text-xs text-muted-foreground">
                      {questionCount} AI-generated multiple-choice questions
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── Latest result ── */}
            {latest && (
              <div className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
                      Latest result
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {latest.correctCount}/{latest.questionCount} correct ·{" "}
                      {latest.completedAt
                        ? formatRelative(latest.completedAt)
                        : formatRelative(latest.createdAt)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReview(latest)}
                    className="shrink-0"
                  >
                    <ListChecks aria-hidden />
                    Review answers
                  </Button>
                </div>

                {latest.skillScores.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {latest.skillScores.map((s) => {
                      const tone = bandTone(s.score, bands);
                      return (
                        <li key={s.skill} className="flex items-center gap-3">
                          <span className="w-32 shrink-0 truncate text-xs text-muted-foreground">
                            {s.skill}
                          </span>
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                            <span
                              className={cn(
                                "block h-full rounded-full",
                                tone.bar,
                              )}
                              style={{ width: `${s.score}%` }}
                            />
                          </span>
                          <span className="tnum w-16 shrink-0 text-right text-xs text-muted-foreground">
                            {s.correct}/{s.total}
                          </span>
                          <span
                            className={cn(
                              "tnum w-8 shrink-0 text-right text-xs font-semibold",
                              tone.text,
                            )}
                          >
                            {s.score}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {/* ── Earlier attempts ── */}
            {history.length > 1 && (
              <div>
                <p className="mb-2 text-xs font-semibold tracking-wide text-foreground uppercase">
                  Earlier attempts
                </p>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {history.slice(1).map((h) => {
                    const tone = bandTone(h.overallScore, bands);
                    return (
                      <li
                        key={h.id}
                        className="flex items-center gap-3 px-3.5 py-2.5"
                      >
                        <p
                          className={cn(
                            "tnum w-9 shrink-0 text-sm font-semibold",
                            tone.text,
                          )}
                        >
                          {h.overallScore}
                        </p>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs text-foreground">
                            {h.skills.join(", ")}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {h.correctCount}/{h.questionCount} correct ·{" "}
                            {formatDate(h.completedAt || h.createdAt)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {!latest && !inProgress && history.length === 0 && (
              <EmptyState
                icon={Wrench}
                title="No assessments yet"
                description="A short MCQ test measures your claimed skills, and its score becomes one of the four inputs to your readiness score."
              />
            )}
          </div>
        )}
      </div>

      {/* ── Taking the quiz ── */}
      <Modal
        open={Boolean(active)}
        onOpenChange={(open) => {
          if (!open) close();
        }}
        title="Skill Assessment"
        description={
          active
            ? `${active.questionCount} questions on ${active.skills.join(", ")}`
            : undefined
        }
        className="max-w-2xl"
        footer={
          active ? (
            <>
              <p className="mr-auto text-xs text-muted-foreground">
                <span className="tnum font-semibold text-foreground">
                  {answeredCount}
                </span>
                /{active.questionCount} answered
              </p>
              <Button variant="ghost" onClick={close} disabled={submitting}>
                Later
              </Button>
              <Button
                onClick={handleSubmit}
                loading={submitting}
                disabled={answeredCount === 0}
              >
                {submitting ? "Scoring…" : "Submit for scoring"}
              </Button>
            </>
          ) : null
        }
      >
        {active && (
          <div className="space-y-5">
            {answeredCount < active.questionCount && (
              <p className="text-xs text-muted-foreground">
                Unanswered questions count as incorrect. You can close this and
                come back — nothing is scored until you submit.
              </p>
            )}

            {active.questions.map((q) => {
              const diff = difficultyMeta(q.difficulty);
              const chosen = answers[q.index];
              return (
                <fieldset key={q.index} className="min-w-0">
                  <legend className="mb-2.5 w-full">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="tnum flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                        {q.index}
                      </span>
                      <Badge variant="neutral" size="sm">
                        {q.skill}
                      </Badge>
                      <Badge variant="outline" size="sm" className={diff.badge}>
                        {diff.label}
                      </Badge>
                    </span>
                    <span className="mt-2 block text-sm font-medium text-foreground">
                      {q.question}
                    </span>
                  </legend>

                  <div className="space-y-2">
                    {q.options.map((option, optIndex) => {
                      const on = chosen === optIndex;
                      return (
                        <label
                          key={optIndex}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                            on
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted/50",
                          )}
                        >
                          <input
                            type="radio"
                            name={`question-${q.index}`}
                            checked={on}
                            onChange={() => choose(q.index, optIndex)}
                            className="sr-only"
                          />
                          <span
                            className={cn(
                              "mt-px flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                              on
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border-strong text-muted-foreground",
                            )}
                            aria-hidden
                          >
                            {String.fromCharCode(65 + optIndex)}
                          </span>
                          <span className="text-sm text-foreground">
                            {option}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
          </div>
        )}
      </Modal>

      {/* ── Reviewing a graded quiz ── */}
      <Modal
        open={Boolean(review)}
        onOpenChange={(open) => {
          if (!open) setReview(null);
        }}
        title="Assessment Review"
        description={
          review
            ? `${review.correctCount}/${review.questionCount} correct · ${review.overallScore}/100`
            : undefined
        }
        className="max-w-2xl"
        footer={
          <Button variant="outline" onClick={() => setReview(null)}>
            Close
          </Button>
        }
      >
        {review && (
          <div className="space-y-5">
            {review.questions.map((q) => {
              const correct = q.isCorrect === true;
              const skipped =
                q.selectedIndex === null || q.selectedIndex === undefined;
              return (
                <div key={q.index} className="min-w-0">
                  <div className="mb-2.5 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full",
                        correct
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive",
                      )}
                    >
                      {correct ? (
                        <CircleCheck className="size-3.5" aria-hidden />
                      ) : (
                        <CircleX className="size-3.5" aria-hidden />
                      )}
                    </span>
                    <Badge variant="neutral" size="sm">
                      {q.skill}
                    </Badge>
                    {skipped && (
                      <Badge variant="warning" size="sm">
                        Skipped
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {q.question}
                  </p>

                  <ul className="mt-2 space-y-1.5">
                    {q.options.map((option, optIndex) => {
                      const isAnswer = q.correctIndex === optIndex;
                      const isChosen = q.selectedIndex === optIndex;
                      return (
                        <li
                          key={optIndex}
                          className={cn(
                            "flex items-start gap-2.5 rounded-lg border p-2.5 text-sm",
                            isAnswer
                              ? "border-success/30 bg-success/5 text-foreground"
                              : isChosen
                                ? "border-destructive/30 bg-destructive/5 text-foreground"
                                : "border-border text-muted-foreground",
                          )}
                        >
                          <span
                            className="mt-px shrink-0 text-[10px] font-semibold"
                            aria-hidden
                          >
                            {String.fromCharCode(65 + optIndex)}
                          </span>
                          <span className="flex-1">{option}</span>
                          {isAnswer && (
                            <Badge variant="success" size="sm">
                              Correct
                            </Badge>
                          )}
                          {isChosen && !isAnswer && (
                            <Badge variant="destructive" size="sm">
                              Your answer
                            </Badge>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {q.explanation && (
                    <p className="mt-2 rounded-lg border border-border bg-muted/40 p-2.5 text-xs leading-relaxed text-muted-foreground">
                      {q.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </Card>
  );
}
