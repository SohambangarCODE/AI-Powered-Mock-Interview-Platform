"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
    AlertTriangle,
    Check,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
    Globe,
    Key,
    Laptop,
    LogOut,
    Monitor,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Smartphone,
    Trash2,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
    type ActiveSession,
    type LoginEvent,
    changePassword,
    getActiveSessions,
    getLoginHistory,
    logoutAllSessions,
    revokeOtherSessions,
    revokeSession,
} from "@/lib/security";
import { useAuth } from "@/hooks/useAuth";

// ── Password strength indicator ───────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
    const checks = [
        { label: "8+ chars", ok: password.length >= 8 },
        { label: "Uppercase", ok: /[A-Z]/.test(password) },
        { label: "Lowercase", ok: /[a-z]/.test(password) },
        { label: "Number", ok: /[0-9]/.test(password) },
        { label: "Special char", ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
    ];
    if (!password) return null;
    const passed = checks.filter((c) => c.ok).length;
    const pct = (passed / checks.length) * 100;
    const color =
        pct <= 40 ? "bg-destructive" : pct <= 60 ? "bg-warning" : pct <= 80 ? "bg-chart-4" : "bg-success";

    return (
        <div className="space-y-1.5">
            <div className="h-1 w-full overflow-hidden rounded-full bg-border">
                <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {checks.map((c) => (
                    <span key={c.label} className={cn("flex items-center gap-1 text-[11px]", c.ok ? "text-success" : "text-muted-foreground")}>
                        <span className={cn("size-1.5 rounded-full", c.ok ? "bg-success" : "bg-border")} />
                        {c.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionCard({ title, description, icon: Icon, children }: {
    title: string;
    description?: string;
    icon: React.ElementType;
    children: React.ReactNode;
}) {
    return (
        <Card className="gap-0 overflow-hidden p-0">
            <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-[18px]" aria-hidden />
                </span>
                <div>
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    {description && <p className="text-xs text-muted-foreground">{description}</p>}
                </div>
            </div>
            <div className="p-5">{children}</div>
        </Card>
    );
}

// ── Change Password section ────────────────────────────────────────────────────

function ChangePasswordSection() {
    const [form, setForm] = useState({ current: "", newPwd: "", confirm: "" });
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const mismatch = form.confirm.length > 0 && form.newPwd !== form.confirm;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg("");
        if (mismatch) return;
        setStatus("loading");
        try {
            await changePassword(form.current, form.newPwd);
            setStatus("success");
            setForm({ current: "", newPwd: "", confirm: "" });
            setTimeout(() => setStatus("idle"), 4000);
        } catch (err: any) {
            setErrorMsg(err?.response?.data?.message || "Failed to change password.");
            setStatus("error");
        }
    };

    return (
        <SectionCard title="Change Password" description="Update your password anytime" icon={Key}>
            {status === "success" && (
                <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-success/25 bg-success/10 px-3 py-2.5">
                    <CheckCircle className="size-4 shrink-0 text-success" aria-hidden />
                    <p className="text-sm font-medium text-success">Password changed! Other sessions logged out.</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="current-pwd">Current password</Label>
                    <div className="relative">
                        <Input
                            id="current-pwd"
                            type={showCurrent ? "text" : "password"}
                            autoComplete="current-password"
                            placeholder="••••••••"
                            value={form.current}
                            onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))}
                            required
                            className="pr-10"
                        />
                        <button type="button" onClick={() => setShowCurrent((p) => !p)}
                            className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                            aria-label={showCurrent ? "Hide" : "Show"}>
                            {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="new-pwd">New password</Label>
                    <div className="relative">
                        <Input
                            id="new-pwd"
                            type={showNew ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="••••••••"
                            value={form.newPwd}
                            onChange={(e) => setForm((f) => ({ ...f, newPwd: e.target.value }))}
                            required
                            className="pr-10"
                        />
                        <button type="button" onClick={() => setShowNew((p) => !p)}
                            className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                            aria-label={showNew ? "Hide" : "Show"}>
                            {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                    </div>
                    <PasswordStrength password={form.newPwd} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirm-pwd">Confirm new password</Label>
                    <Input
                        id="confirm-pwd"
                        type="password"
                        autoComplete="new-password"
                        placeholder="••••••••"
                        value={form.confirm}
                        onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                        aria-invalid={mismatch || undefined}
                        required
                    />
                    {mismatch && <p className="text-xs text-destructive">Passwords do not match.</p>}
                </div>

                {status === "error" && (
                    <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5">
                        <AlertTriangle className="mt-px size-4 shrink-0 text-destructive" />
                        <p className="text-sm font-medium text-destructive">{errorMsg}</p>
                    </div>
                )}

                <Button type="submit" loading={status === "loading"} className="w-full sm:w-auto">
                    {status === "loading" ? "Updating…" : "Update password"}
                </Button>
            </form>
        </SectionCard>
    );
}

// ── Device icon helper ─────────────────────────────────────────────────────────

function DeviceIcon({ device }: { device: string }) {
    if (/mobile|phone|android|ios/i.test(device)) return <Smartphone className="size-4" />;
    if (/tablet|ipad/i.test(device)) return <Monitor className="size-4" />;
    return <Laptop className="size-4" />;
}

// ── Active Sessions section ────────────────────────────────────────────────────

function ActiveSessionsSection() {
    const { logout } = useAuth();
    const [sessions, setSessions] = useState<ActiveSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [revoking, setRevoking] = useState<string | null>(null);
    const [bulkStatus, setBulkStatus] = useState<"idle" | "loading" | "done">("idle");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getActiveSessions();
            setSessions(data);
        } catch {
            setError("Failed to load sessions.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleRevoke = async (sessionId: string) => {
        setRevoking(sessionId);
        try {
            await revokeSession(sessionId);
            setSessions((s) => s.filter((sess) => sess.sessionId !== sessionId));
        } catch {
            // ignore
        } finally {
            setRevoking(null);
        }
    };

    const handleRevokeOthers = async () => {
        setBulkStatus("loading");
        try {
            await revokeOtherSessions();
            setBulkStatus("done");
            setTimeout(() => { load(); setBulkStatus("idle"); }, 1200);
        } catch {
            setBulkStatus("idle");
        }
    };

    const handleLogoutAll = async () => {
        await logoutAllSessions();
        logout();
    };

    const others = sessions.filter((s) => !s.isCurrent);

    return (
        <SectionCard title="Active Sessions" description="Manage where you're logged in" icon={Shield}>
            {loading ? (
                <div className="space-y-3">
                    {[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
                </div>
            ) : error ? (
                <p className="text-sm text-destructive">{error}</p>
            ) : sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active sessions found.</p>
            ) : (
                <div className="space-y-3">
                    {sessions.map((s) => (
                        <div key={s.sessionId}
                            className={cn(
                                "flex items-center gap-3 rounded-lg border p-3.5",
                                s.isCurrent ? "border-primary/25 bg-primary/5" : "border-border bg-muted/30"
                            )}>
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                <DeviceIcon device={s.device} />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-medium text-foreground">
                                        {s.browser} · {s.os}
                                    </p>
                                    {s.isCurrent && (
                                        <Badge variant="outline" size="sm" className="border-primary/25 bg-primary/10 text-primary">
                                            Current
                                        </Badge>
                                    )}
                                </div>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    <Globe className="mr-1 inline size-3" />{s.ipAddress} · Last active {new Date(s.lastActiveAt).toLocaleString()}
                                </p>
                            </div>
                            {!s.isCurrent && (
                                <Button variant="outline" size="sm" className="shrink-0 text-destructive hover:border-destructive/50 hover:bg-destructive/5"
                                    loading={revoking === s.sessionId}
                                    onClick={() => handleRevoke(s.sessionId)}>
                                    <Trash2 className="size-3.5" />
                                    Revoke
                                </Button>
                            )}
                        </div>
                    ))}

                    {others.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            <Button variant="outline" size="sm" loading={bulkStatus === "loading"}
                                onClick={handleRevokeOthers}>
                                {bulkStatus === "done" ? <Check className="size-4 text-success" /> : <LogOut className="size-4" />}
                                {bulkStatus === "done" ? "Done!" : "Log out all other sessions"}
                            </Button>
                            <Button variant="outline" size="sm"
                                className="text-destructive hover:border-destructive/50 hover:bg-destructive/5"
                                onClick={handleLogoutAll}>
                                <X className="size-4" />
                                Log out everywhere
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </SectionCard>
    );
}

// ── Event type helpers ─────────────────────────────────────────────────────────

const EVENT_LABELS: Record<string, string> = {
    login_success: "Login",
    login_failure: "Failed login",
    logout: "Logout",
    logout_all: "Logged out all sessions",
    account_locked: "Account locked",
    password_change: "Password changed",
    password_reset_request: "Password reset requested",
    password_reset_complete: "Password reset",
    email_verification: "Email verified",
    session_revoked: "Session revoked",
    register: "Account created",
};

function eventBadge(eventType: string, success: boolean) {
    if (eventType === "login_failure" || eventType === "account_locked")
        return <Badge variant="outline" size="sm" className="border-destructive/25 bg-destructive/10 text-destructive">Failed</Badge>;
    if (success)
        return <Badge variant="outline" size="sm" className="border-success/25 bg-success/10 text-success">Success</Badge>;
    return <Badge variant="outline" size="sm">Event</Badge>;
}

function eventIcon(eventType: string) {
    if (eventType === "login_failure" || eventType === "account_locked")
        return <ShieldAlert className="size-4 text-destructive" />;
    if (eventType === "password_change" || eventType === "password_reset_complete")
        return <Key className="size-4 text-primary" />;
    return <ShieldCheck className="size-4 text-success" />;
}

// ── Login History section ──────────────────────────────────────────────────────

function LoginHistorySection() {
    const [events, setEvents] = useState<LoginEvent[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async (p: number) => {
        setLoading(true);
        setError("");
        try {
            const data = await getLoginHistory(p);
            setEvents(data.events);
            setTotalPages(data.pagination.pages);
        } catch {
            setError("Failed to load login history.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(page); }, [load, page]);

    return (
        <SectionCard title="Login & Security History" description="Recent activity on your account" icon={ShieldCheck}>
            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
                </div>
            ) : error ? (
                <p className="text-sm text-destructive">{error}</p>
            ) : events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No security events recorded yet.</p>
            ) : (
                <div className="space-y-2">
                    {events.map((ev) => (
                        <div key={ev._id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                                {eventIcon(ev.eventType)}
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-medium text-foreground">
                                        {EVENT_LABELS[ev.eventType] || ev.eventType}
                                    </p>
                                    {eventBadge(ev.eventType, ev.success)}
                                </div>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {new Date(ev.timestamp).toLocaleString()} · {ev.browser} · {ev.os} · {ev.ipAddress}
                                </p>
                                {ev.note && <p className="mt-0.5 text-xs text-muted-foreground">{ev.note}</p>}
                            </div>
                        </div>
                    ))}

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2">
                            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                                <ChevronLeft className="size-4" /> Previous
                            </Button>
                            <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                                Next <ChevronRight className="size-4" />
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </SectionCard>
    );
}

// ── Main SecurityPanel export ──────────────────────────────────────────────────

export function SecurityPanel() {
    return (
        <div className="space-y-6">
            <ChangePasswordSection />
            <ActiveSessionsSection />
            <LoginHistorySection />
        </div>
    );
}
