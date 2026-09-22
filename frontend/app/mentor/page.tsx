"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  ChevronLeft,
  ChevronRight,
  Video,
  MessageSquare,
  Search,
  RefreshCw,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/spinner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import axiosInstance from "@/lib/axios";

interface Student {
  _id: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
  createdAt: string;
}

interface FeedbackForm {
  studentId: string;
  content: string;
  submitting: boolean;
}

function MentorDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<FeedbackForm | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  const fetchStudents = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axiosInstance.get("/api/mentor/students", {
        params: { page: p, limit: 20 },
      });
      setStudents(data.students);
      setTotal(data.pagination.total);
      setPage(data.pagination.page);
      setPages(data.pagination.pages);
    } catch {
      setError("Failed to load students. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents(1);
  }, [fetchStudents]);

  const filtered = search
    ? students.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.email.toLowerCase().includes(search.toLowerCase())
      )
    : students;

  const handleOpenFeedback = (studentId: string) => {
    setFeedback({ studentId, content: "", submitting: false });
    setFeedbackSuccess(null);
  };

  const handleSubmitFeedback = async () => {
    if (!feedback || !feedback.content.trim()) return;
    setFeedback((prev) => prev && { ...prev, submitting: true });
    try {
      await axiosInstance.post(`/api/mentor/students/${feedback.studentId}/feedback`, {
        content: feedback.content.trim(),
      });
      setFeedbackSuccess("Feedback submitted successfully!");
      setFeedback(null);
    } catch {
      setFeedback((prev) => prev && { ...prev, submitting: false });
      alert("Failed to submit feedback. Please try again.");
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-chart-5/10">
            <Users className="size-5 text-chart-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-bold">My Students</h1>
            <p className="text-sm text-muted-foreground">{total} students on the platform</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchStudents(page)} aria-label="Refresh">
          <RefreshCw className="size-4" />
        </Button>
      </div>

      {/* Success banner */}
      {feedbackSuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
          <CheckCircle className="size-4 shrink-0" aria-hidden />
          {feedbackSuccess}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          id="student-search"
          type="text"
          placeholder="Search students by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/50"
        />
      </div>

      {/* Student list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center text-sm text-destructive">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">No students found.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <Card key={s._id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3" aria-hidden />
                      Joined {new Date(s.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/mentor/students/${s._id}/interviews`}>
                      <Video className="mr-1.5 size-3.5" aria-hidden />
                      Interviews
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenFeedback(s._id)}
                  >
                    <MessageSquare className="mr-1.5 size-3.5" aria-hidden />
                    Feedback
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1 || loading}
            onClick={() => fetchStudents(page - 1)}
          >
            <ChevronLeft className="size-4" /> Prev
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= pages || loading}
            onClick={() => fetchStudents(page + 1)}
          >
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      {/* Feedback modal */}
      {feedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-semibold">Submit Feedback</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Write your evaluation for this student.
            </p>
            <textarea
              id="feedback-content"
              rows={5}
              maxLength={5000}
              value={feedback.content}
              onChange={(e) =>
                setFeedback((prev) => prev && { ...prev, content: e.target.value })
              }
              placeholder="Enter your feedback here…"
              className="w-full resize-none rounded-md border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring/50"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {feedback.content.length}/5000
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFeedback(null)}
                disabled={feedback.submitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!feedback.content.trim() || feedback.submitting}
                onClick={handleSubmitFeedback}
              >
                {feedback.submitting ? "Submitting…" : "Submit Feedback"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}

export default function MentorPage() {
  return (
    <ProtectedRoute permission="student.read">
      <MentorDashboard />
    </ProtectedRoute>
  );
}
