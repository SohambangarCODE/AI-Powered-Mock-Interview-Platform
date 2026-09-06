"use client";

import {
  ArrowRight,
  Building2,
  CircleCheck,
  Gauge,
  History,
  Info,
  Layers,
  RotateCcw,
  Target,
  TriangleAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createElement, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { LoadingState, Skeleton } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/useAuth";
import { useRecruiter } from "@/hooks/useRecruiter";
import { difficultyMeta, domainIcon, formatDate } from "@/lib/interview";
import {
  simulatorHref,
  standardVerdict,
  tierIcon,
  tierLabel,
  type CompanyProfile,
} from "@/lib/recruiter";
import { cn } from "@/lib/utils";

/**
 * The AI Recruiter Simulator selection flow.
 *
 * Company → role → round, then straight into the existing adaptive interview
 * engine at /interview. Every company behaviour shown here (difficulty, focus
 * areas, criteria, rounds, expected standard, the disclaimer) is read from
 * /api/companies; this page decides nothing about any company.
 */
export default function RecruiterPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading, user } = useAuth();
  const { companies, disclaimer, sessions, loading, loadError, sessionsError, reload } =
    useRecruiter(isLoggedIn);

  const [companySlug, setCompanySlug] = useState<string | null>(null);
  const [roleId, setRoleId] = useState<string | null>(null);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.push("/login");
  }, [isLoggedIn, authLoading, router]);

  const selected = useMemo(
    () => companies.find((c) => c.slug === companySlug) ?? null,
    [companies, companySlug],
  );
  const role = selected?.roles.find((r) => r.id === roleId) ?? null;
  const round = selected?.rounds.find((r) => r.id === roundId) ?? null;

  const chooseCompany = (profile: CompanyProfile) => {
    setCompanySlug(profile.slug);
    // Sensible defaults so one click is enough to start; both stay changeable.
    setRoleId(profile.roles[0]?.id ?? null);
    setRoundId(profile.rounds[0]?.id ?? null);
  };

  const start = () => {
    if (!selected || !role || !round) return;
    setStarting(true);
    router.push(simulatorHref(selected.slug, role.id, round.id));
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-background">
        <LoadingState label="Loading…" />
      </div>
    );
  }
  if (!isLoggedIn) return null;

  const firstName = user?.name ? user.name.split(" ")[0] : "";

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <PageHeader
          eyebrow={firstName ? `Recruiter simulator for ${firstName}` : "Recruiter simulator"}
          title="AI Recruiter Simulator"
          description="Practise against a company's interviewing style. Pick a company, a role and the round you want to rehearse — the same adaptive engine runs it, tuned to that profile, and grades you against its expected standard."
        />

        {/* ── Simulation disclaimer, straight from the backend ── */}
        {disclaimer && (
          <Card className="mt-6 border-border bg-muted/40">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <p className="min-w-0 text-xs leading-relaxed text-muted-foreground">
                {disclaimer}
              </p>
            </div>
          </Card>
        )}

        {/* ── Load failure ── */}
        {loadError && (
          <Card className="mt-6 border-destructive/25 bg-destructive/5">
            <div className="flex flex-wrap items-start gap-3">
              <TriangleAlert
                className="mt-0.5 size-5 shrink-0 text-destructive"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-destructive">{loadError}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your saved simulations are untouched — this only affects the
                  company list.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={reload}>
                <RotateCcw aria-hidden />
                Retry
              </Button>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="mt-8 space-y-4">
            <Card className="gap-4">
              <Skeleton className="h-6 w-44" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-28 w-full" />
                ))}
              </div>
            </Card>
            <Card className="gap-4">
              <Skeleton className="h-6 w-52" />
              <Skeleton className="h-24 w-full" />
            </Card>
          </div>
        ) : companies.length === 0 && !loadError ? (
          <Card className="mt-8 border-dashed">
            <EmptyState
              icon={Building2}
              title="No company profiles are configured"
              description="The simulator needs at least one company profile on the server. Once one is configured it will appear here."
              action={
                <Button variant="outline" onClick={reload}>
                  <RotateCcw aria-hidden />
                  Reload
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="mt-8 space-y-8">
            {/* ── Step 1: company ── */}
            <section className="space-y-3">
              <SectionHeader
                title="1. Choose a company"
                description="Each profile sets the interviewing style, the difficulty it starts at and the bar you are measured against."
              />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {companies.map((profile) => (
                  <CompanyTile
                    key={profile.slug}
                    profile={profile}
                    active={companySlug === profile.slug}
                    onClick={() => chooseCompany(profile)}
                  />
                ))}
              </div>
            </section>

            {selected && (
              <>
                {/* ── Step 2: role ── */}
                <section className="space-y-3">
                  <SectionHeader
                    title="2. Choose a role"
                    description={`Which ${selected.name} role you are interviewing for. The role decides which technology the questions are drawn from.`}
                  />
                  <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {selected.roles.map((option) => {
                      const DomainIcon = domainIcon(option.domain);
                      return (
                        <Tile
                          key={option.id}
                          active={roleId === option.id}
                          onClick={() => setRoleId(option.id)}
                          icon={DomainIcon}
                          label={option.label}
                          description={
                            option.emphasis.length
                              ? option.emphasis.join(" · ")
                              : option.domain
                          }
                          badge={
                            <Badge variant="neutral" size="sm">
                              {option.domain}
                            </Badge>
                          }
                        />
                      );
                    })}
                  </div>
                </section>

                {/* ── Step 3: round ── */}
                <section className="space-y-3">
                  <SectionHeader
                    title="3. Choose the round to simulate"
                    description={`${selected.name}'s loop as configured. You will run one round now; each one shifts the difficulty and the topics.`}
                  />
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {selected.rounds.map((option) => (
                      <Tile
                        key={option.id}
                        active={roundId === option.id}
                        onClick={() => setRoundId(option.id)}
                        icon={Layers}
                        label={`Round ${option.order} · ${option.label}`}
                        description={option.description}
                        badge={
                          option.focus.length ? (
                            <Badge variant="neutral" size="sm">
                              {option.focus[0]}
                            </Badge>
                          ) : undefined
                        }
                      />
                    ))}
                  </div>
                </section>

                {/* ── What you're being measured on ── */}
                <section className="space-y-3">
                  <SectionHeader
                    title="What you'll be measured on"
                    description={`The criteria and bar configured for ${selected.name}. Your report is scored against exactly these.`}
                  />
                  <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                    <Card className="gap-4">
                      <div className="space-y-3">
                        {selected.evaluationCriteria.map((criterion) => (
                          <div key={criterion.label} className="space-y-1.5">
                            <div className="flex items-baseline justify-between gap-3">
                              <p className="text-sm font-medium text-foreground">
                                {criterion.label}
                              </p>
                              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                {criterion.weight}%
                              </span>
                            </div>
                            <div
                              className="h-1.5 overflow-hidden rounded-full bg-muted"
                              role="presentation"
                            >
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${criterion.weight}%` }}
                              />
                            </div>
                            {criterion.description && (
                              <p className="text-xs text-muted-foreground">
                                {criterion.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card className="gap-0">
                      <div className="flex items-center gap-2">
                        <Gauge className="size-4 text-primary" aria-hidden />
                        <p className="text-sm font-semibold text-foreground">
                          {selected.expectedStandard.label}
                        </p>
                      </div>
                      <dl className="mt-4 space-y-3 text-sm">
                        <StandardRow
                          label="Overall score"
                          value={`${selected.expectedStandard.minOverallScore}/100 or above`}
                        />
                        <StandardRow
                          label="Average answer"
                          value={`${selected.expectedStandard.minAverageAnswerScore}/10 or above`}
                        />
                        <StandardRow
                          label="Skipped questions"
                          value={`${Math.round(selected.expectedStandard.maxSkipRate * 100)}% at most`}
                        />
                      </dl>
                      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                        Meeting this is a pass against the configured profile, not
                        a real hiring outcome.
                      </p>
                    </Card>
                  </div>
                </section>

                {/* ── Start ── */}
                <Card className="gap-4 border-primary/25 bg-primary/5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {selected.name}
                        {role ? ` · ${role.label}` : ""}
                        {round ? ` · ${round.label}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {role
                          ? `Adaptive ${role.domain} questions, starting at the difficulty this profile opens on.`
                          : "Pick a role to continue."}
                      </p>
                    </div>
                    <Button
                      size="lg"
                      onClick={start}
                      loading={starting}
                      disabled={!role || !round}
                      className="shrink-0"
                    >
                      {!starting && <Target aria-hidden />}
                      {starting ? "Starting…" : "Start simulation"}
                      {!starting && <ArrowRight aria-hidden />}
                    </Button>
                  </div>
                </Card>
              </>
            )}

            {/* ── Past simulations ── */}
            <section className="space-y-3">
              <SectionHeader
                title="Your past simulations"
                description="Completed company rounds and how they scored against each profile's bar."
              />
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
                    <Button variant="outline" size="sm" onClick={reload}>
                      <RotateCcw aria-hidden />
                      Retry
                    </Button>
                  </div>
                </Card>
              ) : sessions.length === 0 ? (
                <Card className="border-dashed">
                  <EmptyState
                    icon={History}
                    title="No simulations yet"
                    description="Run a company round and it will show up here with its verdict against that company's standard."
                  />
                </Card>
              ) : (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {sessions.map((session) => {
                    const verdict = standardVerdict(session.meetsStandard);
                    const VerdictIcon = verdict.icon;
                    return (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => router.push(`/sessions/${session.id}`)}
                        className="flex items-start gap-3 rounded-xl border border-border p-3.5 text-left transition-colors outline-none hover:border-primary/40 hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                          <Building2 className="size-[18px]" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {session.companyName}
                            {session.roleLabel ? ` · ${session.roleLabel}` : ""}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {session.roundLabel || session.domain} ·{" "}
                            {formatDate(session.date)}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <Badge variant="neutral" size="sm">
                              {session.score}/100
                              {session.expectedScore !== null
                                ? ` vs ${session.expectedScore}`
                                : ""}
                            </Badge>
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
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

/** One selectable company in step 1. */
function CompanyTile({
  profile,
  active,
  onClick,
}: {
  profile: CompanyProfile;
  active: boolean;
  onClick: () => void;
}) {
  // createElement, not a capitalised local: the lint rule reads
  // `const Icon = tierIcon(...)` as declaring a component inside render.
  const icon = tierIcon(profile.tier);
  const diff = difficultyMeta(profile.baseDifficulty);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-full flex-col gap-3 rounded-xl border p-4 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40 hover:bg-muted/40",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg border",
            active
              ? "border-primary/25 bg-primary/10 text-primary"
              : "border-border bg-muted text-muted-foreground",
          )}
        >
          {createElement(icon, { className: "size-[18px]", "aria-hidden": true })}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "truncate text-sm font-semibold",
                active ? "text-primary" : "text-foreground",
              )}
            >
              {profile.name}
            </p>
            {active && (
              <CircleCheck className="size-4 shrink-0 text-primary" aria-hidden />
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {tierLabel(profile.tier)}
          </p>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">{profile.blurb}</p>

      <div className="mt-auto flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "inline-flex h-5 w-fit items-center gap-1 rounded-full border px-2 text-[11px] font-medium",
            diff.badge,
          )}
        >
          <span className={cn("size-1.5 rounded-full", diff.dot)} aria-hidden />
          Opens {diff.label.toLowerCase()}
        </span>
        <Badge variant="neutral" size="sm">
          {profile.rounds.length} rounds
        </Badge>
        {profile.focusAreas.slice(0, 2).map((area) => (
          <Badge key={area} variant="outline" size="sm">
            {area}
          </Badge>
        ))}
      </div>
    </button>
  );
}

/** Generic selectable tile, shared by the role and round steps. */
function Tile({
  active,
  onClick,
  icon: Icon,
  label,
  description,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  description?: string;
  badge?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40 hover:bg-muted/40",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg border",
          active
            ? "border-primary/25 bg-primary/10 text-primary"
            : "border-border bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={cn(
              "text-sm font-semibold",
              active ? "text-primary" : "text-foreground",
            )}
          >
            {label}
          </p>
          {badge}
        </div>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </button>
  );
}

function StandardRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="shrink-0 font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
