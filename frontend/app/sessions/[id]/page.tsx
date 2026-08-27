"use client";

import InterviewReport from "@/components/interview/InterviewReport";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/spinner";
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
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  FileQuestion,
  LayoutDashboard,
  Play,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
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

  const DomainIcon = domainIcon(interview?.domain);

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-background">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to dashboard
        </Link>

        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        )}

        {!loading && error && (
          <Card className="items-center gap-0 p-8 text-center">
            <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <TriangleAlert className="size-5" aria-hidden />
            </span>
            <p className="text-base font-semibold text-foreground">
              Nothing to show
            </p>
            <p className="mt-1.5 mb-5 text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => router.push("/dashboard")}>
              <LayoutDashboard aria-hidden />
              Back to dashboard
            </Button>
          </Card>
        )}

        {!loading && !error && interview && (
          <>
            <div className="mb-6 flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <DomainIcon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
                  {interview.domain} Interview
                </h1>
                <p className="text-sm text-muted-foreground">
                  {formatDate(interview.createdAt)}
                </p>
              </div>
            </div>

            {/* Still open — offer to pick it back up rather than a half report. */}
            {!interview.isComplete && (
              <Card className="mb-5 gap-0 border-primary/30 bg-primary/5 p-6">
                <p className="text-base font-semibold text-foreground">
                  This session is still in progress
                </p>
                <p className="mt-1.5 mb-4 text-sm text-muted-foreground">
                  {interview.questionsAnswered} question
                  {interview.questionsAnswered === 1 ? "" : "s"} answered so far.
                  No report is generated until the interview ends.
                </p>
                <Button
                  className="self-start"
                  onClick={() =>
                    router.push(`/interview?session=${interview._id}`)
                  }
                >
                  <Play aria-hidden />
                  Resume interview
                  <ArrowRight aria-hidden />
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
              <Card className="mb-5 items-center gap-0 p-8 text-center">
                <span className="mb-4 flex size-11 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
                  <FileQuestion className="size-5" aria-hidden />
                </span>
                <p className="text-base font-semibold text-foreground">
                  No report on file
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  This session completed before adaptive reports were
                  introduced. Overall score:{" "}
                  <span className="tnum font-semibold text-foreground">
                    {interview.score}/100
                  </span>
                </p>
              </Card>
            )}

            {/* Full transcript */}
            {interview.turns?.length > 0 && (
              <Card className="mt-5 gap-0 p-6">
                <p className="text-base font-semibold text-foreground">
                  Full transcript
                </p>
                <p className="mt-1 mb-5 text-sm text-muted-foreground">
                  Every exchange, in order.
                </p>
                <div className="space-y-5">
                  {interview.turns.map((turn) => {
                    const tone = scoreTone(turn.score);
                    const diff = difficultyMeta(turn.difficulty);
                    return (
                      <div
                        key={turn.index}
                        className="border-b border-border pb-5 last:border-0 last:pb-0"
                      >
                        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                          <span className="tnum text-xs font-semibold text-muted-foreground">
                            Q{turn.index}
                          </span>
                          <Badge
                            variant="outline"
                            size="sm"
                            className={diff.badge}
                          >
                            {diff.label}
                          </Badge>
                          <Badge variant="outline" size="sm">
                            {turn.topic}
                          </Badge>
                          <Badge
                            variant="outline"
                            size="sm"
                            className={cn("tnum font-semibold", tone.badge)}
                          >
                            {turn.skipped || turn.score === null
                              ? "skipped"
                              : `${turn.score}/10`}
                          </Badge>
                        </div>

                        <p className="mb-2.5 text-sm leading-relaxed font-medium text-foreground">
                          {turn.question}
                        </p>

                        <p
                          className={cn(
                            "border-l-2 border-border pl-3 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground",
                            !turn.answer && "italic",
                          )}
                        >
                          {turn.answer || "No answer given."}
                        </p>

                        {turn.feedback && (
                          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
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

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() =>
                  router.push(
                    `/interview?domain=${encodeURIComponent(interview.domain)}`,
                  )
                }
              >
                <RotateCcw aria-hidden />
                Retake
              </Button>
              <Button size="lg" onClick={() => router.push("/dashboard")}>
                <LayoutDashboard aria-hidden />
                Dashboard
                <ArrowRight aria-hidden />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
