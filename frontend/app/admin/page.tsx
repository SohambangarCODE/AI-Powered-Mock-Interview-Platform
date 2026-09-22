"use client";

import Link from "next/link";
import { ShieldCheck, Users, LineChart, Settings, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";

const ADMIN_SECTIONS = [
  {
    href: "/admin/users",
    icon: Users,
    label: "User Management",
    description: "View all users, change roles, manage access.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    href: "/admin/analytics",
    icon: LineChart,
    label: "Platform Analytics",
    description: "Interviews completed, average scores, challenge stats.",
    color: "text-chart-5",
    bg: "bg-chart-5/10",
  },
  {
    href: "/settings",
    icon: Settings,
    label: "Settings",
    description: "Manage your account and system preferences.",
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
];

function AdminDashboard() {
  const { user } = useAuth();

  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10 flex items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 ring-1 ring-destructive/20">
          <ShieldCheck className="size-7 text-destructive" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Administrator Panel</h1>
          <p className="text-sm text-muted-foreground">
            Logged in as <span className="font-medium text-foreground">{user?.name}</span>
          </p>
        </div>
      </div>

      {/* Section cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ADMIN_SECTIONS.map(({ href, icon: Icon, label, description, color, bg }) => (
          <Link key={href} href={href}>
            <Card className="group cursor-pointer p-5 transition-all hover:ring-1 hover:ring-ring/50 hover:shadow-md">
              <div className={`mb-4 flex size-10 items-center justify-center rounded-xl ${bg}`}>
                <Icon className={`size-5 ${color}`} aria-hidden />
              </div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-foreground">{label}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </div>
                <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute permission="user.manage">
      <AdminDashboard />
    </ProtectedRoute>
  );
}
