"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Video,
  Trophy,
  Clock,
  BarChart2,
  CheckCircle2,
  SkipForward,
  Building2,
  CalendarDays,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/spinner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import axiosInstance from "@/lib/axios";

interface InterviewRecord {
  id: string;
  domain: string;
  score: number | null;
  duration: number | null;
  questionsAnswered: number;
  skippedCount: number;
  date: string;
  averageAnswerScore: number | null;
  company: { name: string; roleLabel: string } | null;
}

interface StudentInfo {
  name: string;
  email: string;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-muted-foreground">—</span>;
  const pct = Math.round(score);
  const color =
    pct >= 80
      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
      : pct >= 60
      ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
      : "text-destructive bg-destructive/10 border-destructive/20";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${color}`}
    >
      <Trophy className="size-3" aria-hidden />
      {pct}%
    </span>
  );
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function StudentInterviewsContent() {
  const params = useParams<{ id: string }>();
  const studentId = params.id;

  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axiosInstance.get(
        `/api/mentor/students/${studentId}/interviews`
      );
      setStudent(data.student);
      setInterviews(data.interviews);
    } catch {
      setError("Failed to load interview history. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Back link */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="-ml-1">
          <Link href="/mentor">
            <ArrowLeft className="mr-1.5 size-4" aria-hidden />
            Back to My Students
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <Video className="size-5 text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-bold">
              {loading || !student ? (
                <Skeleton className="h-5 w-40" />
              ) : (
                `${student.name}'s Interviews`
              )}
            </h1>
            {!loading && student && (
              <p className="text-sm text-muted-foreground">{student.email}</p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
          aria-label="Refresh"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
          <AlertCircle className="size-8 text-destructive" aria-hidden />
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchData}>
            Try again
          </Button>
        </div>
      ) : interviews.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <Video className="mx-auto mb-3 size-8 text-muted-foreground/40" aria-hidden />
          <p className="text-sm font-medium text-muted-foreground">No completed interviews yet</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Completed interview sessions will appear here.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {interviews.length} completed interview{interviews.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-3">
            {interviews.map((interview) => (
              <Card
                key={interview.id}
                className="p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Left: domain & company */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold capitalize text-foreground">
                        {interview.domain}
                      </p>
                      <ScoreBadge score={interview.score} />
                    </div>
                    {interview.company && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Building2 className="size-3" aria-hidden />
                        {interview.company.name}
                        {interview.company.roleLabel && (
                          <span className="text-muted-foreground/60">
                            · {interview.company.roleLabel}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="size-3" aria-hidden />
                      {new Date(interview.date).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>

                  {/* Right: stats chips */}
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1 rounded-lg bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
                      <Clock className="size-3 shrink-0" aria-hidden />
                      {formatDuration(interview.duration)}
                    </div>
                    <div className="flex items-center gap-1 rounded-lg bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
                      <CheckCircle2 className="size-3 shrink-0" aria-hidden />
                      {interview.questionsAnswered} answered
                    </div>
                    {interview.skippedCount > 0 && (
                      <div className="flex items-center gap-1 rounded-lg bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
                        <SkipForward className="size-3 shrink-0" aria-hidden />
                        {interview.skippedCount} skipped
                      </div>
                    )}
                    {interview.averageAnswerScore !== null && (
                      <div className="flex items-center gap-1 rounded-lg bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
                        <BarChart2 className="size-3 shrink-0" aria-hidden />
                        Avg {Math.round(interview.averageAnswerScore)}%
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

export default function StudentInterviewsPage() {
  return (
    <ProtectedRoute permission="interview.read">
      <StudentInterviewsContent />
    </ProtectedRoute>
  );
}
