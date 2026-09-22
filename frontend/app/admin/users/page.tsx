"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, ChevronLeft, ChevronRight, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/spinner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import axiosInstance from "@/lib/axios";
import { useAuth } from "@/hooks/useAuth";

type Role = "Student" | "Mentor" | "Administrator";

interface UserRow {
  _id: string;
  name: string;
  email: string;
  role: Role;
  isEmailVerified: boolean;
  createdAt: string;
}

const ROLES: Role[] = ["Student", "Mentor", "Administrator"];

const ROLE_BADGE: Record<Role, string> = {
  Student:       "border-primary/20 bg-primary/10 text-primary",
  Mentor:        "border-chart-5/20 bg-chart-5/10 text-chart-5",
  Administrator: "border-destructive/20 bg-destructive/10 text-destructive",
};

function UserManagement() {
  const { user: currentUser } = useAuth();
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
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <Users className="size-5 text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-bold">User Management</h1>
            <p className="text-sm text-muted-foreground">{total} users total</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchUsers(page, roleFilter)}
          aria-label="Refresh"
        >
          <RefreshCw className="size-4" />
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
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
        {/* Role filter */}
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={roleFilter === "" ? "default" : "outline"}
            onClick={() => { setRoleFilter(""); setPage(1); }}
          >
            All
          </Button>
          {ROLES.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={roleFilter === r ? "default" : "outline"}
              onClick={() => { setRoleFilter(r); setPage(1); }}
            >
              {r}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
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
                    <tr
                      key={u._id}
                      className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-medium">
                        {u.name}
                        {isSelf && (
                          <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            You
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-[11px] ${ROLE_BADGE[u.role] || ""}`}>
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            u.isEmailVerified
                              ? "text-success"
                              : "text-muted-foreground"
                          }
                        >
                          {u.isEmailVerified ? "✓" : "–"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {isSelf ? (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        ) : (
                          <select
                            id={`role-select-${u._id}`}
                            value={u.role}
                            disabled={updating === u._id}
                            onChange={(e) =>
                              handleRoleChange(u._id, e.target.value as Role)
                            }
                            className="rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50"
                            aria-label={`Change role for ${u.name}`}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
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

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1 || loading}
            onClick={() => fetchUsers(page - 1, roleFilter)}
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
            onClick={() => fetchUsers(page + 1, roleFilter)}
          >
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </main>
  );
}

export default function UsersPage() {
  return (
    <ProtectedRoute permission="user.manage">
      <UserManagement />
    </ProtectedRoute>
  );
}
