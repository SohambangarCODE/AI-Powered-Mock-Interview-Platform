"use client";

import ChatContainer from "@/components/ChatContainer";
import { InputBox } from "@/components/InputBox";
import InterviewReport from "@/components/interview/InterviewReport";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/useAuth";
import axiosInstance from "@/lib/axios";
import {
  apiErrorMessage,
  changeIndicator,
  difficultyMeta,
  domainIcon,
  formatClock,
  type ChatMessage,
  type Difficulty,
  type DifficultyChange,
  type InterviewDetail,
  type InterviewReport as Report,
  type StartInterviewResponse,
  type StoredMessage,
  type SubmitAnswerResponse,
} from "@/lib/interview";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CircleCheck,
  LayoutDashboard,
  RotateCcw,
  Timer,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

const InterviewContent = () => {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const resumeId = searchParams.get("session");

  const [domain, setDomain] = useState(searchParams.get("domain") || "General");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [sessionId, setSessionId] = useState("");

  // Adaptive state, all driven by the backend — never inferred locally.
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [difficultyChange, setDifficultyChange] = useState<DifficultyChange>();
  const [topic, setTopic] = useState("");
  const [turnIndex, setTurnIndex] = useState(1);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [bounds, setBounds] = useState({ min: 4, max: 10 });

  const [isComplete, setIsComplete] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [endReason, setEndReason] = useState("");

  const [elapsed, setElapsed] = useState(0);
  const [showExit, setShowExit] = useState(false);
  const [exitBusy, setExitBusy] = useState<"end" | "discard" | null>(null);

  const idRef = useRef(0);
  const nextId = () => `m${++idRef.current}`;
  const questionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bootedRef = useRef(false);

  const push = (message: Omit<ChatMessage, "id" | "timestamp">) =>
    setMessages((prev) => [
      ...prev,
      { ...message, id: nextId(), timestamp: new Date() },
    ]);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.push("/login");
  }, [isLoggedIn, authLoading, router]);

  useEffect(
    () => () => {
      if (questionTimer.current) clearTimeout(questionTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (isComplete) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isComplete]);

  // ── Boot: resume an existing session, or start a new one ──
  useEffect(() => {
    if (!isLoggedIn || bootedRef.current) return;
    bootedRef.current = true;

    const hydrate = (stored: StoredMessage[]): ChatMessage[] =>
      stored.map((m, i) => ({
        id: `h${i}`,
        kind: m.kind,
        content: m.content,
        isUser: m.role === "user",
        timestamp: new Date(m.timestamp),
        topic: m.topic,
        difficulty: m.difficulty,
        score: m.score ?? null,
        skipped: m.skipped,
      }));

    const resume = async (id: string) => {
      try {
        const { data } = await axiosInstance.get<{
          interview: InterviewDetail;
          meta: { minQuestions: number; maxQuestions: number };
        }>(`/api/interviews/${id}`);

        const iv = data.interview;
        setSessionId(iv._id);
        setDomain(iv.domain);
        setBounds({
          min: data.meta?.minQuestions ?? 4,
          max: data.meta?.maxQuestions ?? 10,
        });
        setAnsweredCount(iv.questionsAnswered);
        setSkippedCount(iv.skippedCount);
        setDifficulty(iv.currentDifficulty);
        setMessages(hydrate(iv.messages ?? []));
        setElapsed(
          Math.max(
            0,
            Math.floor((Date.now() - new Date(iv.createdAt).getTime()) / 1000),
          ),
        );

        // The open turn is the question still awaiting an answer.
        const open = [...(iv.turns ?? [])].reverse().find((t) => !t.answeredAt);
        setTurnIndex(open?.index ?? (iv.turns?.length || 1));
        if (open?.topic) setTopic(open.topic);

        if (iv.isComplete) {
          setReport(iv.report);
          setEndReason(iv.endReason);
          setIsComplete(true);
        }
      } catch (error) {
        push({
          kind: "system",
          content: apiErrorMessage(error, "Could not resume that session."),
          isUser: false,
        });
      } finally {
        setBooting(false);
      }
    };

    const begin = async (forDomain: string) => {
      try {
        const { data } = await axiosInstance.post<StartInterviewResponse>(
          "/api/interviews/start",
          { domain: forDomain },
        );
        setSessionId(data.sessionId);
        setDifficulty(data.difficulty);
        setTopic(data.topic);
        setTurnIndex(data.turnIndex);
        setAnsweredCount(data.answeredCount);
        setSkippedCount(data.skippedCount);
        setBounds({ min: data.minQuestions, max: data.maxQuestions });
        setMessages([
          {
            id: nextId(),
            kind: "question",
            content: data.question,
            isUser: false,
            timestamp: new Date(),
            topic: data.topic,
            difficulty: data.difficulty,
          },
        ]);
      } catch (error) {
        setMessages([
          {
            id: nextId(),
            kind: "system",
            content: apiErrorMessage(error, "Could not start the interview."),
            isUser: false,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setBooting(false);
      }
    };

    if (resumeId) resume(resumeId);
    else begin(domain);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // ── One adaptive turn ────────────────────────────────────
  const submit = async (answerText: string, skipped = false) => {
    if (!sessionId || isLoading || isComplete) return;

    push({
      kind: "answer",
      content: skipped ? "[Question skipped]" : answerText,
      isUser: true,
      skipped,
    });
    setIsLoading(true);

    // Captured before the response overwrites them — the feedback belongs to the
    // question that was just answered, not the next one.
    const answeredTopic = topic;
    const answeredDifficulty = difficulty;

    try {
      const { data } = await axiosInstance.post<SubmitAnswerResponse>(
        "/api/interviews/submit-answer",
        { sessionId, answer: skipped ? "" : answerText, skipped },
      );

      // Repeated answer: the same question stands, nothing advances.
      if (data.repeated) {
        push({
          kind: "nudge",
          content: data.feedback ?? "",
          isUser: false,
          topic: data.topic,
          difficulty: data.difficulty,
        });
        return;
      }

      push({
        kind: "feedback",
        content: data.feedback ?? "",
        isUser: false,
        score: data.score ?? null,
        topic: answeredTopic,
        difficulty: answeredDifficulty,
      });

      if (typeof data.answeredCount === "number")
        setAnsweredCount(data.answeredCount);
      if (typeof data.skippedCount === "number")
        setSkippedCount(data.skippedCount);
      if (data.difficulty) setDifficulty(data.difficulty);
      setDifficultyChange(data.difficultyChange);

      // Completion is the backend's call — no local question quota.
      if (data.isComplete) {
        setReport(data.report ?? null);
        setEndReason(data.endReason ?? "");
        setIsComplete(true);
        return;
      }

      if (data.nextQuestion) {
        const question = data.nextQuestion;
        const nextTopic = data.topic;
        const nextDifficulty = data.difficulty;
        if (nextTopic) setTopic(nextTopic);
        if (typeof data.turnIndex === "number") setTurnIndex(data.turnIndex);

        // Small stagger so feedback lands before the next question.
        questionTimer.current = setTimeout(() => {
          push({
            kind: "question",
            content: question,
            isUser: false,
            topic: nextTopic,
            difficulty: nextDifficulty,
          });
        }, 450);
      }
    } catch (error) {
      push({
        kind: "system",
        content: apiErrorMessage(error, "That answer could not be submitted."),
        isUser: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Exit paths ───────────────────────────────────────────
  const endAndGrade = async () => {
    setExitBusy("end");
    try {
      const { data } = await axiosInstance.post<
        SubmitAnswerResponse & { discarded?: boolean }
      >(`/api/interviews/${sessionId}/finish`);

      // Nothing answered — the backend dropped the session rather than emit an
      // empty report.
      if (data.discarded) {
        router.push("/dashboard");
        return;
      }
      setReport(data.report ?? null);
      setEndReason(data.endReason ?? "Ended early by candidate");
      setIsComplete(true);
      setShowExit(false);
    } catch (error) {
      setShowExit(false);
      push({
        kind: "system",
        content: apiErrorMessage(error, "Could not end the interview."),
        isUser: false,
      });
    } finally {
      setExitBusy(null);
    }
  };

  const discardSession = async () => {
    setExitBusy("discard");
    try {
      await axiosInstance.delete(`/api/interviews/${sessionId}`);
    } catch {
      // Leaving either way; a surviving session just stays resumable.
    }
    router.push("/dashboard");
  };

  const retry = () => {
    router.push(`/interview?domain=${encodeURIComponent(domain)}`);
    router.refresh();
  };

  if (authLoading || !isLoggedIn) return null;

  const asked = answeredCount + skippedCount;
  const progressPct = Math.min(100, (asked / bounds.max) * 100);
  const minTickPct = (bounds.min / bounds.max) * 100;
  const diffMeta = difficultyMeta(difficulty);
  const change = changeIndicator(difficultyChange);
  const ChangeIcon = change.Icon;
  const DomainIcon = domainIcon(domain);
  const durationMinutes = Math.max(1, Math.round(elapsed / 60));

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col bg-background">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto max-w-4xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                <DomainIcon className="size-[18px]" aria-hidden />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-base font-semibold tracking-tight text-foreground">
                    {domain} Interview
                  </h1>
                  {!isComplete && (
                    <Badge variant="success" size="sm" className="shrink-0">
                      <span
                        className="size-1.5 animate-pulse rounded-full bg-success"
                        aria-hidden
                      />
                      Adaptive
                    </Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {isComplete
                    ? endReason || "Session complete"
                    : topic
                      ? `Current topic: ${topic}`
                      : "AI Mock Interview Session"}
                </p>
              </div>
            </div>

            {/* Difficulty + timer */}
            {!isComplete && (
              <div className="hidden shrink-0 items-center gap-2 sm:flex">
                <Badge variant="outline" className={diffMeta.badge}>
                  <span
                    className={cn("size-1.5 rounded-full", diffMeta.dot)}
                    aria-hidden
                  />
                  {diffMeta.label}
                  {difficultyChange && (
                    <ChangeIcon
                      className={cn("size-3.5", change.className)}
                      aria-label={change.label}
                    />
                  )}
                </Badge>
                <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1">
                  <Timer className="size-3.5 text-muted-foreground" aria-hidden />
                  <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                    {formatClock(elapsed)}
                  </span>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                isComplete ? router.push("/dashboard") : setShowExit(true)
              }
              className="shrink-0 hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
            >
              {isComplete ? "Go to Dashboard" : "Exit"}
            </Button>
          </div>

          {/* Adaptive progress: MIN..MAX, not a fixed quota */}
          {!isComplete && (
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  Q{turnIndex}
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · {answeredCount} answered
                    {skippedCount > 0 && ` · ${skippedCount} skipped`}
                  </span>
                </span>
                <span className="font-mono tabular-nums sm:hidden">
                  {formatClock(elapsed)}
                </span>
                <span className="hidden sm:inline">
                  {bounds.min}–{bounds.max} questions, adapted to you
                </span>
              </div>
              <div className="relative h-1.5 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                />
                {/* Past this mark the interview may end at any time. */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-foreground/40"
                  style={{ left: `${minTickPct}%` }}
                  title={`Can end any time after ${bounds.min} questions`}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Exit dialog ─────────────────────────────────── */}
      <Modal
        open={showExit}
        // Escape / overlay click must not abandon an in-flight request.
        onOpenChange={(next) => {
          if (!next && exitBusy !== null) return;
          setShowExit(next);
        }}
        title="Leave this interview?"
        description={`You've answered ${answeredCount} question${
          answeredCount === 1 ? "" : "s"
        }. Choose what happens to this session.`}
        className="max-w-md"
        footer={
          <Button
            variant="ghost"
            onClick={() => setShowExit(false)}
            disabled={exitBusy !== null}
          >
            Keep going
          </Button>
        }
      >
        <div className="space-y-2">
          <ExitOption
            title="End & get my report"
            detail="Grades the questions you answered and closes the session."
            onClick={endAndGrade}
            busy={exitBusy === "end"}
            disabled={exitBusy !== null || answeredCount + skippedCount === 0}
          />
          <ExitOption
            title="Save & resume later"
            detail="Keeps your progress. Pick it back up from the dashboard."
            onClick={() => router.push("/dashboard")}
            disabled={exitBusy !== null}
          />
          <ExitOption
            title="Discard this session"
            detail="Deletes it permanently. Nothing is saved to your history."
            onClick={discardSession}
            busy={exitBusy === "discard"}
            disabled={exitBusy !== null}
            destructive
          />
        </div>
      </Modal>

      {/* ── Body ────────────────────────────────────────── */}
      <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col">
        {isComplete ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="mx-auto w-full max-w-2xl">
              {report ? (
                <InterviewReport
                  report={report}
                  domain={domain}
                  durationMinutes={durationMinutes}
                  endReason={endReason}
                />
              ) : (
                <Card className="items-center gap-0 p-8 text-center">
                  <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-success/10 text-success">
                    <CircleCheck className="size-5" aria-hidden />
                  </span>
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">
                    Interview complete
                  </h2>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {endReason ||
                      "This session finished, but no report was generated for it."}
                  </p>
                </Card>
              )}

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button variant="outline" size="lg" onClick={retry}>
                  <RotateCcw aria-hidden />
                  New session
                </Button>
                <Button size="lg" onClick={() => router.push("/dashboard")}>
                  <LayoutDashboard aria-hidden />
                  Dashboard
                  <ArrowRight aria-hidden />
                </Button>
              </div>
            </div>
          </div>
        ) : booting ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="flex flex-col items-center gap-3">
              <Spinner size="lg" className="text-primary" />
              <p className="text-sm text-muted-foreground">
                {resumeId
                  ? "Restoring your session…"
                  : "Writing your first question…"}
              </p>
            </div>
          </div>
        ) : (
          <>
            <ChatContainer
              messages={messages}
              isLoading={isLoading}
              loadingLabel="Scoring your answer"
            />
            <div className="border-t border-border bg-background">
              <InputBox
                onSend={(text) => submit(text)}
                onSkip={() => submit("", true)}
                disabled={isLoading || !sessionId}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

function ExitOption({
  title,
  detail,
  onClick,
  busy,
  disabled,
  destructive,
}: {
  title: string;
  detail: string;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        destructive
          ? "border-destructive/25 hover:border-destructive/50 hover:bg-destructive/5"
          : "border-border hover:border-primary/50 hover:bg-muted/60",
      )}
    >
      <p
        className={cn(
          "flex items-center gap-2 text-sm font-semibold",
          destructive ? "text-destructive" : "text-foreground",
        )}
      >
        {busy && <Spinner size="sm" className="text-current" />}
        {busy ? "Working…" : title}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
    </button>
  );
}

export default InterviewContent;
