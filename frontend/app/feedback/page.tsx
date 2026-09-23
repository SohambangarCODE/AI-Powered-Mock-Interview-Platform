"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  MessageSquare,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CalendarDays,
  User as UserIcon,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/spinner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import axiosInstance from "@/lib/axios";

interface FeedbackItem {
  id: string;
  content: string;
  interviewId: string | null;
  mentorName: string;
  createdAt: string;
}

function MyFeedbackContent() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axiosInstance.get("/api/feedback/mine");
      setFeedback(data.feedback);
    } catch {
      setError("Failed to load feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Back link */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="-ml-1">
          <Link href="/dashboard">
            <ArrowLeft className="mr-1.5 size-4" aria-hidden />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-chart-5/10">
            <MessageSquare className="size-5 text-chart-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-bold">My Feedback</h1>
            <p className="text-sm text-muted-foreground">
              {loading
                ? "Loading…"
                : feedback.length === 0
                ? "No feedback yet"
                : `${feedback.length} feedback note${feedback.length !== 1 ? "s" : ""} from your mentors`}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchFeedback}
          disabled={loading}
          aria-label="Refresh feedback"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
          <AlertCircle className="size-8 text-destructive" aria-hidden />
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchFeedback}>
            Try again
          </Button>
        </div>
      ) : feedback.length === 0 ? (
        <div className="rounded-xl border border-dashed py-20 text-center">
          <MessageSquare
            className="mx-auto mb-3 size-10 text-muted-foreground/30"
            aria-hidden
          />
          <p className="text-sm font-medium text-muted-foreground">
            No feedback yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            When a mentor reviews your interviews and writes feedback, it will
            appear here.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-6">
            <Link href="/interview">Start an interview</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {feedback.map((item) => (
            <Card key={item.id} className="p-5">
              {/* Meta row */}
              <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UserIcon className="size-3.5 shrink-0" aria-hidden />
                  <span className="font-medium text-foreground">
                    {item.mentorName}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="size-3.5 shrink-0" aria-hidden />
                  {new Date(item.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                {item.interviewId && (
                  <Link
                    href={`/sessions/${item.interviewId}`}
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <Video className="size-3.5 shrink-0" aria-hidden />
                    View session
                  </Link>
                )}
              </div>

              {/* Feedback content */}
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {item.content}
              </p>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

export default function FeedbackPage() {
  return (
    <ProtectedRoute permission="interview.read">
      <MyFeedbackContent />
    </ProtectedRoute>
  );
}
