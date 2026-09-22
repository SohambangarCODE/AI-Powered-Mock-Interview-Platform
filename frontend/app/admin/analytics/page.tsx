"use client";

import { useEffect, useState } from "react";
import { LineChart, Users, Video, Trophy, TrendingUp, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import axiosInstance from "@/lib/axios";

interface Analytics {
  users: { total: number; students: number; mentors: number; admins: number };
  interviews: { total: number; completed: number; avgScore: number | null };
  challenges: { total: number; completedAttempts: number };
}

const STAT_CARDS = (data: Analytics) => [
  {
    label: "Total Users",
    value: data.users.total,
    sub: `${data.users.students} students · ${data.users.mentors} mentors · ${data.users.admins} admins`,
    icon: Users,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    label: "Interviews",
    value: data.interviews.total,
    sub: `${data.interviews.completed} completed`,
    icon: Video,
    color: "text-chart-2",
    bg: "bg-chart-2/10",
  },
  {
    label: "Avg Interview Score",
    value: data.interviews.avgScore !== null ? `${data.interviews.avgScore}/10` : "N/A",
    sub: "Across all completed sessions",
    icon: TrendingUp,
    color: "text-success",
    bg: "bg-success/10",
  },
  {
    label: "Challenge Attempts",
    value: data.challenges.completedAttempts,
    sub: `${data.challenges.total} challenge templates`,
    icon: Trophy,
    color: "text-chart-5",
    bg: "bg-chart-5/10",
  },
];

function AnalyticsDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await axiosInstance.get("/api/admin/analytics");
      setData(res);
    } catch {
      setError("Failed to load analytics. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-chart-5/10">
            <LineChart className="size-5 text-chart-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-bold">Platform Analytics</h1>
            <p className="text-sm text-muted-foreground">Live platform-wide statistics</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnalytics} aria-label="Refresh analytics">
          <RefreshCw className="size-4" />
        </Button>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center text-sm text-destructive">
          {error}
        </div>
      ) : data ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {STAT_CARDS(data).map(({ label, value, sub, icon: Icon, color, bg }) => (
            <Card key={label} className="p-5">
              <div className="flex items-start gap-4">
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>
                  <Icon className={`size-5 ${color}`} aria-hidden />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-0.5 text-2xl font-bold tracking-tight">{value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </main>
  );
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute permission="analytics.read">
      <AnalyticsDashboard />
    </ProtectedRoute>
  );
}
