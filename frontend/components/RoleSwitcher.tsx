"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Briefcase,
  ShieldCheck,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Shuffle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { setStoredUser } from "@/lib/auth";
import axiosInstance from "@/lib/axios";
import { ROLE_HOME, Role } from "@/lib/permissions";

// ── Role definitions ────────────────────────────────────────────────────────
const ROLES: {
  value: Role;
  label: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  gradient: string;
  ring: string;
  badge: string;
  features: string[];
}[] = [
  {
    value: "Student",
    label: "Student",
    description: "Practice interviews, track readiness, join challenges.",
    icon: GraduationCap,
    gradient: "from-primary/20 via-primary/5 to-transparent",
    ring: "ring-primary/30",
    badge: "bg-primary/10 text-primary border-primary/20",
    features: ["Mock Interviews", "AI Recruiter", "Placement Readiness", "Arena Challenges", "Resume Analysis"],
  },
  {
    value: "Mentor",
    label: "Mentor",
    description: "View student progress, review interview sessions, give feedback.",
    icon: Briefcase,
    gradient: "from-chart-5/20 via-chart-5/5 to-transparent",
    ring: "ring-chart-5/30",
    badge: "bg-chart-5/10 text-chart-5 border-chart-5/20",
    features: ["Student Dashboard", "Interview Reports", "Written Feedback", "Progress Tracking"],
  },
  {
    value: "Administrator",
    label: "Administrator",
    description: "Manage all users, assign roles, view platform analytics.",
    icon: ShieldCheck,
    gradient: "from-destructive/20 via-destructive/5 to-transparent",
    ring: "ring-destructive/30",
    badge: "bg-destructive/10 text-destructive border-destructive/20",
    features: ["User Management", "Role Assignment", "Platform Analytics", "Full Access"],
  },
];

// ── Component ────────────────────────────────────────────────────────────────
export function RoleSwitcher() {
  const { user, role: currentRole, refreshUser } = useAuth();
  const router = useRouter();
  const [switching, setSwitching] = useState<Role | null>(null);
  const [success, setSuccess] = useState<Role | null>(null);

  const handleSwitch = async (targetRole: Role) => {
    if (targetRole === currentRole || switching) return;

    setSwitching(targetRole);
    setSuccess(null);

    try {
      const { data } = await axiosInstance.patch("/api/auth/me/role", {
        role: targetRole,
      });

      // Update cached user in localStorage
      if (user) {
        setStoredUser({ ...user, role: targetRole });
      }

      // Refresh the auth context to pick up the new role
      await refreshUser();

      setSuccess(targetRole);

      // Navigate to the role's home page after a short delay so the user
      // sees the success state before being redirected.
      setTimeout(() => {
        router.push(ROLE_HOME[targetRole]);
      }, 800);
    } catch (err) {
      console.error("Role switch failed:", err);
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-muted">
          <Shuffle className="size-4 text-muted-foreground" aria-hidden />
        </div>
        <div>
          <h2 className="text-base font-semibold leading-tight">Role Switcher</h2>
          <p className="text-xs text-muted-foreground">
            Switch roles to experience different dashboards. Changes apply instantly.
          </p>
        </div>
      </div>

      {/* Current role badge */}
      {currentRole && (
        <div className="mb-5 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Current role:</span>
          <span
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
              ROLES.find((r) => r.value === currentRole)?.badge,
            )}
          >
            {currentRole}
          </span>
        </div>
      )}

      {/* Role cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {ROLES.map(({ value, label, description, icon: Icon, gradient, ring, badge, features }) => {
          const isActive = value === currentRole;
          const isSwitching = switching === value;
          const isSuccess = success === value;

          return (
            <button
              key={value}
              type="button"
              disabled={isActive || !!switching}
              onClick={() => handleSwitch(value)}
              aria-label={`Switch to ${label}`}
              className={cn(
                "group relative flex flex-col items-start rounded-xl border p-4 text-left transition-all outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                isActive
                  ? `border-ring/50 bg-gradient-to-br ${gradient} ring-1 ${ring}`
                  : "border-border bg-background hover:border-ring/30 hover:shadow-sm disabled:cursor-not-allowed",
                !!switching && !isActive && "opacity-50",
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <span className="absolute right-3 top-3 flex size-4 items-center justify-center rounded-full bg-primary">
                  <CheckCircle2 className="size-3 text-primary-foreground" aria-hidden />
                </span>
              )}

              {/* Icon */}
              <div
                className={cn(
                  "mb-3 flex size-9 items-center justify-center rounded-lg border",
                  ROLES.find((r) => r.value === value)?.badge,
                )}
              >
                {isSwitching ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : isSuccess ? (
                  <CheckCircle2 className="size-4" aria-hidden />
                ) : (
                  <Icon className="size-4" aria-hidden />
                )}
              </div>

              {/* Text */}
              <span className="mb-0.5 text-sm font-semibold">{label}</span>
              <span className="mb-3 text-xs leading-snug text-muted-foreground">{description}</span>

              {/* Feature list */}
              <ul className="mb-4 space-y-1">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="size-1 rounded-full bg-muted-foreground/50" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="mt-auto w-full">
                {isActive ? (
                  <span
                    className={cn(
                      "inline-flex w-full items-center justify-center rounded-lg border py-1.5 text-xs font-semibold",
                      badge,
                    )}
                  >
                    Active
                  </span>
                ) : (
                  <span className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-border bg-muted py-1.5 text-xs font-medium text-muted-foreground transition-colors group-hover:border-foreground/20 group-hover:text-foreground group-enabled:cursor-pointer">
                    {isSwitching ? (
                      <>
                        <Loader2 className="size-3 animate-spin" /> Switching…
                      </>
                    ) : isSuccess ? (
                      <>
                        <CheckCircle2 className="size-3" /> Done! Redirecting…
                      </>
                    ) : (
                      <>
                        Switch <ArrowRight className="size-3" />
                      </>
                    )}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] text-muted-foreground">
        🔒 Role changes are saved to your account instantly. You can switch back at any time.
      </p>
    </div>
  );
}
