"use client";

import Link from "next/link";
import { createElement } from "react";
import {
  ArrowRight,
  Building2,
  History,
  RotateCcw,
  Target,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/spinner";
import { difficultyMeta, formatDate } from "@/lib/interview";
import {
  standardVerdict,
  tierIcon,
  tierLabel,
  type CompanyProfile,
  type CompanySessionSummary,
} from "@/lib/recruiter";
import { cn } from "@/lib/utils";

export function RecruiterPanel({
  companies,
  sessions,
  loading,
  loadError,
  sessionsError,
  onRetry,
  href = "/recruiter",
}: {
  companies: CompanyProfile[];
  sessions: CompanySessionSummary[];
  loading: boolean;
  loadError: string | null;
  sessionsError: string | null;
  onRetry: () => void;
  href?: string;
}) {
  return (
    <div className="space-y-4">
      <SectionHeader
        title="AI Recruiter Simulator"
        description="Practise a company's interview loop and get graded against its bar"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={href}>
              Open simulator
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
      />

      {loading ? (
        <>
          <Card className="gap-4">
            <Skeleton className="h-4 w-40" />
            <div className="grid gap-2.5 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </Card>
          <Card className="gap-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-14 w-full" />
          </Card>
        </>
      ) : loadError ? (
        <Card className="border-destructive/25 bg-destructive/5">
          <div className="flex flex-wrap items-start gap-3">
            <TriangleAlert
              className="mt-0.5 size-5 shrink-0 text-destructive"
              aria-hidden
            />
            <p className="min-w-0 flex-1 text-sm font-semibold text-destructive">
              {loadError}
            </p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RotateCcw aria-hidden />
              Retry
            </Button>
          </div>
        </Card>
      ) : companies.length === 0 ? (
        <Card className="border-dashed p-4">
          <EmptyState
            icon={Building2}
            title="No company profiles configured"
            description="The simulator needs at least one company profile on the server. Once one is configured it will show up here."
            action={
              <Button variant="outline" onClick={onRetry}>
                <RotateCcw aria-hidden />
                Reload
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {/* ── Configured companies ── */}
          <Card className="gap-4 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">
                Choose who you&apos;re interviewing with
              </p>
              <span className="text-xs text-muted-foreground">
                {companies.length} profiles
              </span>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {companies.map((profile) => (
                <CompanyRow key={profile.slug} profile={profile} href={href} />
              ))}
            </div>
            <Button asChild className="w-full sm:w-fit">
              <Link href={href}>
                <Target aria-hidden />
                Start a simulation
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </Card>

          {/* ── Past rounds ── */}
          {sessionsError ? (
            <Card className="border-destructive/25 bg-destructive/5">
              <div className="flex flex-wrap items-start gap-3">
                <TriangleAlert
                  className="mt-0.5 size-5 shrink-0 text-destructive"
                  aria-hidden
                />
                <p className="min-w-0 flex-1 text-sm font-semibold text-destructive">
                  {sessionsError}
                </p>
                <Button variant="outline" size="sm" onClick={onRetry}>
                  <RotateCcw aria-hidden />
                  Retry
                </Button>
              </div>
            </Card>
          ) : sessions.length === 0 ? (
            <Card className="border-dashed p-0">
              <EmptyState
                icon={History}
                title="No simulations yet"
                description="Run a company round and its verdict against that company's expected standard shows up here."
              />
            </Card>
          ) : (
            <Card className="gap-3 p-4">
              <p className="text-sm font-semibold text-foreground">
                Recent simulations
              </p>
              <div className="space-y-2">
                {sessions.slice(0, 4).map((session) => (
                  <SessionRow key={session.id} session={session} />
                ))}
              </div>
              {sessions.length > 4 && (
                <Button variant="link" size="sm" asChild className="w-fit px-0">
                  <Link href={href}>
                    See all {sessions.length} simulations
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function CompanyRow({
  profile,
  href,
}: {
  profile: CompanyProfile;
  href: string;
}) {
  // createElement, not a capitalised local: the lint rule reads
  // `const Icon = tierIcon(...)` as declaring a component inside render.
  const icon = tierIcon(profile.tier);
  const diff = difficultyMeta(profile.baseDifficulty);

  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-xl border border-border p-3 transition-colors outline-none hover:border-primary/40 hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
        {createElement(icon, { className: "size-4", "aria-hidden": true })}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {profile.name}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {tierLabel(profile.tier)} · {profile.roles.length} roles ·{" "}
          {profile.rounds.length} rounds
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex h-5 w-fit items-center gap-1 rounded-full border px-2 text-[11px] font-medium",
              diff.badge,
            )}
          >
            <span className={cn("size-1.5 rounded-full", diff.dot)} aria-hidden />
            Opens {diff.label.toLowerCase()}
          </span>
          {profile.focusAreas.slice(0, 1).map((area) => (
            <Badge key={area} variant="outline" size="sm">
              {area}
            </Badge>
          ))}
        </div>
      </div>
    </Link>
  );
}

function SessionRow({ session }: { session: CompanySessionSummary }) {
  const verdict = standardVerdict(session.meetsStandard);
  const VerdictIcon = verdict.icon;

  return (
    <Link
      href={`/sessions/${session.id}`}
      className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors outline-none hover:border-primary/40 hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
        <Building2 className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {session.companyName}
          {session.roleLabel ? ` · ${session.roleLabel}` : ""}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {session.roundLabel || session.domain} · {formatDate(session.date)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <p className="tnum text-sm font-semibold text-foreground">
          {session.score}
          {session.expectedScore !== null && (
            <span className="text-xs font-normal text-muted-foreground">
              {" "}
              / {session.expectedScore} needed
            </span>
          )}
        </p>
        <span
          className={cn(
            "inline-flex h-5 w-fit items-center gap-1 rounded-full border px-2 text-[11px] font-medium",
            verdict.badge,
          )}
        >
          <VerdictIcon className="size-3" aria-hidden />
          {session.meetsStandard === null
            ? verdict.label
            : session.meetsStandard
              ? "Met the bar"
              : "Below the bar"}
        </span>
      </div>
    </Link>
  );
}

export default RecruiterPanel;
