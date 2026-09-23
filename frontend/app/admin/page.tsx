"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  LineChart,
  Video,
  Trophy,
  TrendingUp,
  LayoutDashboard,
  ShieldCheck,
  Server,
  Activity,
  AlertCircle,
  Settings,
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
type Role = "Student" | "Mentor" | "Administrator";

interface UserRow {
  _id: string;
  name: string;
  email: string;
  role: Role;
  isEmailVerified: boolean;
  createdAt: string;
}

interface Analytics {
  users: { total: number; students: number; mentors: number; admins: number };
  interviews: { total: number; completed: number; avgScore: number | null };
  challenges: { total: number; completedAttempts: number };
}

// ── Constants ──────────────────────────────────────────────
const ROLES: Role[] = ["Student", "Mentor", "Administrator"];

const ROLE_BADGE: Record<Role, string> = {
  Student:       "border-primary/20 bg-primary/10 text-primary",
  Mentor:        "border-chart-5/20 bg-chart-5/10 text-chart-5",
  Administrator: "border-destructive/20 bg-destructive/10 text-destructive",
};

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "users",     label: "Users",     icon: Users },
  { id: "analytics", label: "Analytics", icon: LineChart },
] as const;
type Tab = (typeof TABS)[number]["id"];

// ── Dashboard Tab ──────────────────────────────────────────
function AdminOverview({
  onGoToUsers,
  onGoToAnalytics,
}: {
  onGoToUsers: () => void;
  onGoToAnalytics: () => void;
}) {
  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="System Status" value="Online" sub="All services operational" icon={Activity} tone="success" />
        <StatCard label="Database" value="Connected" sub="MongoDB replica set" icon={Server} tone="primary" />
        <StatCard label="Active Alerts" value="0" sub="No current issues" icon={AlertCircle} />
      </section>

      <section className="space-y-3">
        <SectionHeader title="Quick Links" description="Common administrative tasks" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            {
              icon: Users,
              label: "Manage Users",
              desc: "Change roles and view user details",
              color: "text-primary",
              bg: "bg-primary/10",
              action: onGoToUsers,
            },
            {
              icon: LineChart,
              label: "View Analytics",
              desc: "Platform-wide usage and performance metrics",
              color: "text-chart-5",
              bg: "bg-chart-5/10",
              action: onGoToAnalytics,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className="group flex items-start gap-3 rounded-xl border border-border p-4 text-left transition-colors outline-none hover:border-destructive/40 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", item.bg, item.color)}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ── Users Tab ──────────────────────────────────────────────
function UserManagement({ currentUser }: { currentUser: any }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (p = 1, role = "") => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page: p, limit: 20 };
      if (role) params.role = role;
      const { data } = await axiosInstance.get("/api/admin/users", { params });
      setUsers(data.users);
      setTotal(data.pagination.total);
      setPage(data.pagination.page);
      setPages(data.pagination.pages);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load users.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(1, roleFilter);
  }, [fetchUsers, roleFilter]);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setUpdating(userId);
    try {
      await axiosInstance.patch(`/api/admin/users/${userId}/role`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
      );
    } catch {
      alert("Failed to update role. Please try again.");
    } finally {
      setUpdating(null);
    }
  };

  const filtered = search
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <SectionHeader title="User Management" description={`${total} total users`} />
        <Button variant="outline" size="sm" onClick={() => fetchUsers(page, roleFilter)} aria-label="Refresh">
          <RefreshCw className="size-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            id="user-search"
            type="text"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant={roleFilter === "" ? "default" : "outline"} onClick={() => { setRoleFilter(""); setPage(1); }}>
            All
          </Button>
          {ROLES.map((r) => (
            <Button key={r} size="sm" variant={roleFilter === r ? "default" : "outline"} onClick={() => { setRoleFilter(r); setPage(1); }}>
              {r}
            </Button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="py-12 text-center text-sm text-destructive">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Verified</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium">Change Role</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const isSelf = u._id === currentUser?.id;
                  return (
                    <tr key={u._id} className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">
                        {u.name}
                        {isSelf && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">You</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-[11px] ${ROLE_BADGE[u.role] || ""}`}>{u.role}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={u.isEmailVerified ? "text-success" : "text-muted-foreground"}>
                          {u.isEmailVerified ? "✓" : "–"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {isSelf ? (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        ) : (
                          <select
                            value={u.role}
                            disabled={updating === u._id}
                            onChange={(e) => handleRoleChange(u._id, e.target.value as Role)}
                            className="rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50"
                            aria-label={`Change role for ${u.name}`}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => fetchUsers(page - 1, roleFilter)}>
            <ChevronLeft className="size-4" /> Prev
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
          <Button size="sm" variant="outline" disabled={page >= pages || loading} onClick={() => fetchUsers(page + 1, roleFilter)}>
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Analytics Tab ──────────────────────────────────────────
function AnalyticsDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <SectionHeader title="Platform Analytics" description="Live platform-wide statistics" />
        <Button variant="outline" size="sm" onClick={fetchAnalytics} aria-label="Refresh analytics">
          <RefreshCw className="size-4" />
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center text-sm text-destructive">{error}</div>
      ) : data ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Total Users" value={data.users.total} sub={`${data.users.students} students · ${data.users.mentors} mentors · ${data.users.admins} admins`} icon={Users} tone="primary" />
          <StatCard label="Interviews" value={data.interviews.total} sub={`${data.interviews.completed} completed`} icon={Video} tone="default" />
          <StatCard label="Avg Interview Score" value={data.interviews.avgScore !== null ? `${data.interviews.avgScore}/10` : "N/A"} sub="Across all completed sessions" icon={TrendingUp} tone="success" />
          <StatCard label="Challenge Attempts" value={data.challenges.completedAttempts} sub={`${data.challenges.total} challenge templates`} icon={Trophy} tone="warning" />
        </div>
      ) : null}
    </div>
  );
}

// ── Main Page Content ──────────────────────────────────────
function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const tabParam = (searchParams.get("tab") ?? "dashboard") as Tab;
  const activeTab: Tab = TABS.some((t) => t.id === tabParam) ? tabParam : "dashboard";

  const setTab = (id: Tab) => {
    router.push(`/admin?tab=${id}`, { scroll: false });
  };

  const firstName = user?.name ? user.name.split(" ")[0] : "";
  const initials  = (user?.name || "A").split(" ").map((n) => n[0]).join("").toUpperCase() || "A";

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <PageHeader eyebrow={`Welcome back${firstName ? `, ${firstName}` : ""}`} title="Admin Dashboard" />

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside className="hidden lg:sticky lg:top-24 lg:block">
            <div className="space-y-6">
              <Card className="gap-0 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive text-sm font-semibold text-white">
                    {initials}
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-sm font-semibold text-foreground">{user?.name || "Admin"}</p>
                    <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-center text-xs font-semibold text-destructive">
                  Administrator
                </div>
              </Card>

              <nav aria-label="Admin sections" className="space-y-1">
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
                          ? "bg-destructive/10 text-destructive"
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
            {/* Mobile Nav */}
            <nav aria-label="Admin sections" className="mb-6 flex items-center gap-1 border-b border-border lg:hidden">
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
                        ? "border-destructive text-destructive"
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
              <AdminOverview
                onGoToUsers={() => setTab("users")}
                onGoToAnalytics={() => setTab("analytics")}
              />
            )}
            {activeTab === "users" && <UserManagement currentUser={user} />}
            {activeTab === "analytics" && <AnalyticsDashboard />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute permission="system.manage">
      <Suspense fallback={<div className="p-8 text-center"><Skeleton className="h-32 w-full rounded-xl" /></div>}>
        <AdminDashboardContent />
      </Suspense>
    </ProtectedRoute>
  );
}
