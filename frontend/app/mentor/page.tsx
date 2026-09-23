"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  LayoutDashboard,
  BookOpen,
  Star,
  Award,
  TrendingUp,
  UserCheck,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/spinner";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import axiosInstance from "@/lib/axios";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────
interface Student {
  _id: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
  createdAt: string;
}

interface FeedbackForm {
  studentId: string;
  studentName: string;
  content: string;
  submitting: boolean;
}

// ── Tab config ─────────────────────────────────────────────
const TABS = [
  { id: "dashboard", label: "Dashboard",   icon: LayoutDashboard },
  { id: "students",  label: "My Students", icon: Users },
] as const;
type Tab = (typeof TABS)[number]["id"];

// ── Dashboard overview ─────────────────────────────────────
function MentorOverview({
  students,
  total,
  loading,
  onGoToStudents,
  onOpenFeedback,
}: {
  students: Student[];
  total: number;
  loading: boolean;
  onGoToStudents: () => void;
  onOpenFeedback: (s: Student) => void;
}) {
  const verified = students.filter((s) => s.isEmailVerified).length;
  const recent = students.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Stats strip */}
      <section aria-label="Mentor statistics" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total Students" value={loading ? "—" : total} sub="on the platform" icon={Users} />
        <StatCard label="Verified" value={loading ? "—" : verified} sub="email confirmed" icon={UserCheck} tone="primary" />
        <StatCard label="Avg. Sessions" value="—" sub="per student" icon={TrendingUp} />
        <StatCard label="Feedback Given" value="—" sub="across all students" icon={MessageCircle} />
      </section>

      {/* Quick actions */}
      <section className="space-y-3">
        <SectionHeader title="Quick Actions" description="Common mentor tasks" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              icon: Users,
              label: "View All Students",
              desc: "Browse and search the full student list",
              color: "text-primary",
              bg: "bg-primary/10",
              action: onGoToStudents,
            },
            {
              icon: MessageSquare,
              label: "Send Feedback",
              desc: "Write performance evaluations for students",
              color: "text-chart-5",
              bg: "bg-chart-5/10",
              action: onGoToStudents,
            },
            {
              icon: Video,
              label: "Review Interviews",
              desc: "Watch completed student interview sessions",
              color: "text-success",
              bg: "bg-success/10",
              action: onGoToStudents,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className="group flex items-start gap-3 rounded-xl border border-border p-4 text-left transition-colors outline-none hover:border-primary/40 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", item.bg, item.color)}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </button>
            );
          })}
        </div>
      </section>

      {/* Recent students */}
      <section className="space-y-3">
        <SectionHeader
          title="Recently Joined Students"
          description="Newest members on the platform"
          actions={
            <Button variant="outline" size="sm" onClick={onGoToStudents}>
              View all <ArrowRight className="ml-1 size-3.5" aria-hidden />
            </Button>
          }
        />
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            No students yet.
          </div>
        ) : (
          <Card className="gap-0 divide-y divide-border overflow-hidden p-0">
            {recent.map((s) => (
              <div key={s._id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {s.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {s.isEmailVerified && (
                    <Badge variant="outline" size="sm" className="border-success/25 bg-success/10 text-success hidden sm:flex">
                      Verified
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onOpenFeedback(s)}>
                    <MessageSquare className="mr-1 size-3" aria-hidden />
                    Feedback
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                    <Link href={`/mentor/students/${s._id}/interviews`}>
                      <Video className="mr-1 size-3" aria-hidden />
                      Interviews
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}

// ── My Students tab ────────────────────────────────────────
function StudentList({
  students,
  total,
  page,
  pages,
  loading,
  error,
  search,
  onSearchChange,
  onPageChange,
  onRefresh,
  onOpenFeedback,
  feedbackSuccess,
}: {
  students: Student[];
  total: number;
  page: number;
  pages: number;
  loading: boolean;
  error: string | null;
  search: string;
  onSearchChange: (v: string) => void;
  onPageChange: (p: number) => void;
  onRefresh: () => void;
  onOpenFeedback: (s: Student) => void;
  feedbackSuccess: string | null;
}) {
  const filtered = search
    ? students.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.email.toLowerCase().includes(search.toLowerCase())
      )
    : students;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="My Students"
        description={`${total} student${total !== 1 ? "s" : ""} on the platform`}
        actions={
          <Button variant="outline" size="sm" onClick={onRefresh} aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
        }
      />

      {feedbackSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
          <CheckCircle className="size-4 shrink-0" aria-hidden />
          {feedbackSuccess}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          id="student-search"
          type="text"
          placeholder="Search students by name or email…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/50"
        />
      </div>

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
        <Card className="gap-0 divide-y divide-border overflow-hidden p-0">
          {filtered.map((s) => (
            <div key={s._id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
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
                    {s.isEmailVerified && (
                      <Badge variant="outline" size="sm" className="ml-1 border-success/25 bg-success/10 text-success">
                        Verified
                      </Badge>
                    )}
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
                <Button size="sm" variant="outline" onClick={() => onOpenFeedback(s)}>
                  <MessageSquare className="mr-1.5 size-3.5" aria-hidden />
                  Feedback
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className="size-4" /> Prev
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
          <Button size="sm" variant="outline" disabled={page >= pages || loading} onClick={() => onPageChange(page + 1)}>
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main Content Component (Needs Suspense) ─────────────────
function MentorDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const tabParam = (searchParams.get("tab") ?? "dashboard") as Tab;
  const activeTab: Tab = TABS.some((t) => t.id === tabParam) ? tabParam : "dashboard";

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

  useEffect(() => { fetchStudents(1); }, [fetchStudents]);

  const setTab = (id: Tab) => {
    router.push(`/mentor?tab=${id}`, { scroll: false });
    setFeedbackSuccess(null);
  };

  const handleOpenFeedback = (s: Student) => {
    setFeedback({ studentId: s._id, studentName: s.name, content: "", submitting: false });
    setFeedbackSuccess(null);
  };

  const handleSubmitFeedback = async () => {
    if (!feedback || !feedback.content.trim()) return;
    setFeedback((prev) => prev && { ...prev, submitting: true });
    try {
      await axiosInstance.post(`/api/mentor/students/${feedback.studentId}/feedback`, {
        content: feedback.content.trim(),
      });
      setFeedbackSuccess(`Feedback sent to ${feedback.studentName} successfully!`);
      setFeedback(null);
    } catch {
      setFeedback((prev) => prev && { ...prev, submitting: false });
      alert("Failed to submit feedback. Please try again.");
    }
  };

  const firstName = user?.name ? user.name.split(" ")[0] : "";
  const initials  = (user?.name || "M").split(" ").map((n) => n[0]).join("").toUpperCase() || "M";

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <PageHeader
          eyebrow={`Welcome back${firstName ? `, ${firstName}` : ""}`}
          title="Mentor Dashboard"
        />

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
          {/* Desktop sidebar */}
          <aside className="hidden lg:sticky lg:top-24 lg:block">
            <div className="space-y-6">
              <Card className="gap-0 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-chart-5 text-sm font-semibold text-white">
                    {initials}
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-sm font-semibold text-foreground">{user?.name || "Mentor"}</p>
                    <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-chart-5/20 bg-chart-5/10 px-3 py-1.5 text-center text-xs font-semibold text-chart-5">
                  Mentor
                </div>
              </Card>

              <nav aria-label="Mentor sections" className="space-y-1">
                <p className="px-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Sections
                </p>
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setTab(tab.id)}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        active
                          ? "bg-chart-5/10 text-chart-5"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <div className="min-w-0">
            {/* Mobile tab nav */}
            <nav aria-label="Mentor sections" className="mb-6 flex items-center gap-1 border-b border-border lg:hidden">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTab(tab.id)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors outline-none",
                      active
                        ? "border-chart-5 text-chart-5"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            {activeTab === "dashboard" && (
              <MentorOverview
                students={students}
                total={total}
                loading={loading}
                onGoToStudents={() => setTab("students")}
                onOpenFeedback={handleOpenFeedback}
              />
            )}
            {activeTab === "students" && (
              <StudentList
                students={students}
                total={total}
                page={page}
                pages={pages}
                loading={loading}
                error={error}
                search={search}
                onSearchChange={setSearch}
                onPageChange={(p) => fetchStudents(p)}
                onRefresh={() => fetchStudents(page)}
                onOpenFeedback={handleOpenFeedback}
                feedbackSuccess={feedbackSuccess}
              />
            )}
          </div>
        </div>
      </div>

      {/* Feedback modal */}
      {feedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-semibold">Submit Feedback</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Writing evaluation for{" "}
              <span className="font-medium text-foreground">{feedback.studentName}</span>
            </p>
            <textarea
              id="feedback-content"
              rows={5}
              maxLength={5000}
              value={feedback.content}
              onChange={(e) => setFeedback((prev) => prev && { ...prev, content: e.target.value })}
              placeholder="Enter your feedback here…"
              className="w-full resize-none rounded-md border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring/50"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{feedback.content.length}/5000</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setFeedback(null)} disabled={feedback.submitting}>
                Cancel
              </Button>
              <Button size="sm" disabled={!feedback.content.trim() || feedback.submitting} onClick={handleSubmitFeedback}>
                {feedback.submitting ? "Submitting…" : "Submit Feedback"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function MentorPage() {
  return (
    <ProtectedRoute permission="student.read">
      <Suspense fallback={<div className="p-8 text-center"><Skeleton className="h-32 w-full rounded-xl" /></div>}>
        <MentorDashboardContent />
      </Suspense>
    </ProtectedRoute>
  );
}
