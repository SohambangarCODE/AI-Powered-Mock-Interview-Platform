"use client";

import ChatContainer from "@/components/ChatContainer";
import { InputBox } from "@/components/InputBox";
import InterviewReport from "@/components/interview/InterviewReport";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  const durationMinutes = Math.max(1, Math.round(elapsed / 60));

  return (
    <div className="h-[calc(100vh-4rem)] bg-background flex flex-col">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 flex items-center justify-center text-xl flex-shrink-0">
                {domainIcon(domain)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-foreground truncate">
                    {domain} Interview
                  </h1>
                  {!isComplete && (
                    <span className="flex items-center gap-1 text-xs bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Adaptive
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
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
              <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                <span
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${diffMeta.badge}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${diffMeta.dot}`} />
                  {diffMeta.label}
                  {difficultyChange && (
                    <span className={`font-bold ${change.className}`}>
                      {change.arrow}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-1.5 bg-muted/50 border border-border/60 px-3 py-1 rounded-full">
                  <span className="text-xs text-muted-foreground">⏱</span>
                  <span className="text-sm font-mono font-semibold text-foreground tabular-nums">
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
              className="rounded-full text-xs border-border/60 hover:border-destructive/50 hover:text-destructive hover:bg-destructive/5 transition-colors flex-shrink-0"
            >
              {isComplete ? "Go to Dashboard" : "Exit"}
            </Button>
          </div>

          {/* Adaptive progress: MIN..MAX, not a fixed quota */}
          {!isComplete && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span className="font-medium text-foreground">
                  Q{turnIndex}
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    · {answeredCount} answered
                    {skippedCount > 0 && ` · ${skippedCount} skipped`}
                  </span>
                </span>
                <span className="sm:hidden font-mono">
                  {formatClock(elapsed)}
                </span>
                <span className="hidden sm:inline">
                  {bounds.min}–{bounds.max} questions, adapted to you
                </span>
              </div>
              <div className="relative h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-700"
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
      {showExit && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
            <p className="text-lg font-bold text-foreground mb-1">
              Leave this interview?
            </p>
            <p className="text-sm text-muted-foreground mb-5">
              You&apos;ve answered {answeredCount} question
              {answeredCount === 1 ? "" : "s"}. Choose what happens to this
              session.
            </p>

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

            <Button
              variant="ghost"
              onClick={() => setShowExit(false)}
              disabled={exitBusy !== null}
              className="w-full mt-3 rounded-full text-sm"
            >
              Keep going
            </Button>
          </Card>
        </div>
      )}

      {/* ── Body ────────────────────────────────────────── */}
      <div className="flex-1 max-w-4xl w-full mx-auto flex flex-col min-h-0">
        {isComplete ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="w-full max-w-2xl mx-auto">
              {report ? (
                <InterviewReport
                  report={report}
                  domain={domain}
                  durationMinutes={durationMinutes}
                  endReason={endReason}
                />
              ) : (
                <Card className="p-8 border border-border/60 text-center">
                  <div className="text-3xl mb-3">✅</div>
                  <h2 className="text-xl font-bold text-foreground mb-1">
                    Interview complete
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {endReason ||
                      "This session finished, but no report was generated for it."}
                  </p>
                </Card>
              )}

              <div className="grid grid-cols-2 gap-3 mt-5">
                <Button
                  variant="outline"
                  onClick={retry}
                  className="rounded-full border-border/60"
                >
                  🔄 New session
                </Button>
                <Button
                  onClick={() => router.push("/dashboard")}
                  className="rounded-full bg-gradient-to-r from-primary to-accent hover:opacity-90 font-semibold"
                >
                  Dashboard →
                </Button>
              </div>
            </div>
          </div>
        ) : booting ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-border border-t-primary animate-spin" />
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
            <div className="border-t border-border/50 bg-background">
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
      className={`w-full text-left rounded-xl border p-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        destructive
          ? "border-destructive/30 hover:border-destructive/60 hover:bg-destructive/5"
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      }`}
    >
      <p
        className={`text-sm font-semibold ${
          destructive ? "text-destructive" : "text-foreground"
        }`}
      >
        {busy ? "Working…" : title}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
    </button>
  );
}

export default InterviewContent;
