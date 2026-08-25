"use client";

import InterviewReport from "@/components/interview/InterviewReport";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import axiosInstance from "@/lib/axios";
import {
  apiErrorMessage,
  difficultyMeta,
  domainIcon,
  formatDate,
  scoreTone,
  type InterviewDetail,
} from "@/lib/interview";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function InterviewDetailPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  // In a client component useParams() returns the object directly — no await.
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [interview, setInterview] = useState<InterviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.push("/login");
  }, [isLoggedIn, authLoading, router]);

  useEffect(() => {
    if (!isLoggedIn || !id) return;

    let cancelled = false;
    (async () => {
      try {
        const { data } = await axiosInstance.get<{ interview: InterviewDetail }>(
          `/api/interviews/${id}`,
        );
        if (!cancelled) setInterview(data.interview);
      } catch (err) {
        if (!cancelled)
          setError(apiErrorMessage(err, "Could not load that interview."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, id]);

  if (authLoading || !isLoggedIn) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <Link
          href="/dashboard"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 mb-5"
        >
          ← Back to dashboard
        </Link>

        {loading && (
          <div className="space-y-3">
            <div className="h-48 rounded-2xl bg-muted animate-pulse" />
            <div className="h-24 rounded-2xl bg-muted animate-pulse" />
            <div className="h-24 rounded-2xl bg-muted animate-pulse" />
          </div>
        )}

        {!loading && error && (
          <Card className="p-8 border border-border/60 text-center">
            <div className="text-3xl mb-3">⚠️</div>
            <p className="text-base font-bold text-foreground mb-1">
              Nothing to show
            </p>
            <p className="text-sm text-muted-foreground mb-5">{error}</p>
            <Button
              onClick={() => router.push("/dashboard")}
              className="rounded-full"
            >
              Back to dashboard
            </Button>
          </Card>
        )}

        {!loading && !error && interview && (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 flex items-center justify-center text-xl flex-shrink-0">
                {domainIcon(interview.domain)}
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-black text-foreground truncate">
                  {interview.domain} Interview
                </h1>
                <p className="text-xs text-muted-foreground">
                  {formatDate(interview.createdAt)}
                </p>
              </div>
            </div>

            {/* Still open — offer to pick it back up rather than a half report. */}
            {!interview.isComplete && (
              <Card className="p-6 border border-border/60 mb-5">
                <p className="text-base font-bold text-foreground mb-1">
                  This session is still in progress
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {interview.questionsAnswered} question
                  {interview.questionsAnswered === 1 ? "" : "s"} answered so far.
                  No report is generated until the interview ends.
                </p>
                <Button
                  onClick={() =>
                    router.push(`/interview?session=${interview._id}`)
                  }
                  className="rounded-full bg-gradient-to-r from-primary to-accent hover:opacity-90 font-semibold"
                >
                  Resume interview →
                </Button>
              </Card>
            )}

            {interview.report && (
              <InterviewReport
                report={interview.report}
                domain={interview.domain}
                durationMinutes={interview.duration}
                endReason={interview.endReason}
              />
            )}

            {interview.isComplete && !interview.report && (
              <Card className="p-8 border border-border/60 text-center mb-5">
                <div className="text-3xl mb-3">📄</div>
                <p className="text-base font-bold text-foreground mb-1">
                  No report on file
                </p>
                <p className="text-sm text-muted-foreground">
                  This session completed before adaptive reports were
                  introduced. Overall score:{" "}
                  <span className="font-bold text-foreground">
                    {interview.score}/100
                  </span>
                </p>
              </Card>
            )}

            {/* Full transcript */}
            {interview.turns?.length > 0 && (
              <Card className="p-6 border border-border/50 mt-5">
                <p className="text-sm font-semibold text-foreground mb-1">
                  Full transcript
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Every exchange, in order.
                </p>
                <div className="space-y-4">
                  {interview.turns.map((turn) => {
                    const tone = scoreTone(turn.score);
                    const diff = difficultyMeta(turn.difficulty);
                    return (
                      <div
                        key={turn.index}
                        className="pb-4 border-b border-border/50 last:border-0 last:pb-0"
                      >
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <span className="text-xs font-bold text-muted-foreground">
                            Q{turn.index}
                          </span>
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${diff.badge}`}
                          >
                            {diff.label}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-background text-muted-foreground font-medium">
                            {turn.topic}
                          </span>
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full border font-bold tabular-nums ${tone.badge}`}
                          >
                            {turn.skipped || turn.score === null
                              ? "skipped"
                              : `${turn.score}/10`}
                          </span>
                        </div>

                        <p className="text-sm font-medium text-foreground leading-relaxed mb-2">
                          {turn.question}
                        </p>

                        <p
                          className={`text-xs leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-border ${
                            turn.answer
                              ? "text-muted-foreground"
                              : "text-muted-foreground italic"
                          }`}
                        >
                          {turn.answer || "No answer given."}
                        </p>

                        {turn.feedback && (
                          <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                            <span className="font-semibold text-foreground">
                              Feedback:{" "}
                            </span>
                            {turn.feedback}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-3 mt-5">
              <Button
                variant="outline"
                onClick={() =>
                  router.push(
                    `/interview?domain=${encodeURIComponent(interview.domain)}`,
                  )
                }
                className="rounded-full border-border/60"
              >
                🔄 Retake
              </Button>
              <Button
                onClick={() => router.push("/dashboard")}
                className="rounded-full bg-gradient-to-r from-primary to-accent hover:opacity-90 font-semibold"
              >
                Dashboard →
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
