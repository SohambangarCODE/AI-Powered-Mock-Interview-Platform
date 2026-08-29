"use client";

import Link from "next/link";
import {
  ArrowRight,
  Gauge,
  RotateCcw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/spinner";
import { formatRelative } from "@/lib/interview";
import {
  bandTone,
  categoryMeta,
  componentIcon,
  deltaTone,
  formatDelta,
  type ReadinessAssessment,
  type ReadinessConfig,
} from "@/lib/readiness";
import { cn } from "@/lib/utils";

/**
 * Compact readiness summary for the dashboard.
 *
 * Read-only by design: generating, uploading and the full breakdown all live on
 * /readiness, so this panel never duplicates that logic — it shows the latest
 * saved report and links through.
 */
export function ReadinessSummaryPanel({
  assessment,
  config,
  loading,
  error,
  canGenerate,
  onRetry,
  href = "/readiness",
}: {
  assessment: ReadinessAssessment | null;
  config: ReadinessConfig | null;
  loading: boolean;
  error: string | null;
  canGenerate: boolean;
  onRetry: () => void;
  href?: string;
}) {
  return (
    <div className="space-y-4">
      <SectionHeader
        title="Placement Readiness"
        description="Your resume, interviews and assessments in one score"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={href}>
              Open
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
      />

      {loading ? (
        <Card className="gap-4">
          <div className="flex items-center gap-5">
            <Skeleton className="size-20 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </Card>
      ) : error ? (
        <Card className="border-destructive/25 bg-destructive/5">
          <div className="flex flex-wrap items-start gap-3">
            <TriangleAlert
              className="mt-0.5 size-5 shrink-0 text-destructive"
              aria-hidden
            />
            <p className="min-w-0 flex-1 text-sm font-semibold text-destructive">
              {error}
            </p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RotateCcw aria-hidden />
              Retry
            </Button>
          </div>
        </Card>
      ) : !assessment ? (
        <Card className="border-dashed p-0">
          <EmptyState
            icon={Gauge}
            title="No readiness report yet"
            description={
              canGenerate
                ? "Everything needed is on file. Generate your first report to see where you stand and what to fix."
                : "Upload your resume to unlock a placement readiness score, gap analysis and a personalised roadmap."
            }
            action={
              <Button asChild>
                <Link href={href}>
                  <Sparkles aria-hidden />
                  {canGenerate ? "Generate report" : "Get started"}
                </Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <ReadinessSummary
          assessment={assessment}
          config={config}
          href={href}
        />
      )}
    </div>
  );
}

function ReadinessSummary({
  assessment,
  config,
  href,
}: {
  assessment: ReadinessAssessment;
  config: ReadinessConfig | null;
  href: string;
}) {
  const bands = config?.scoreBands;
  const tone = bandTone(assessment.overallScore, bands);
  const cat = categoryMeta(assessment.category);
  const CatIcon = cat.icon;
  const withData = assessment.components.filter((c) => c.hasData);
  const weakAreas = assessment.analysis.weakTechnicalAreas.slice(0, 3);

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex flex-wrap items-center gap-5 p-5">
        {/* Score */}
        <div className="flex shrink-0 items-baseline gap-1">
          <p className={cn("tnum text-4xl font-semibold", tone.text)}>
            {assessment.overallScore}
          </p>
          <span className="text-sm text-muted-foreground">/100</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" size="sm" className={cat.badge}>
              <CatIcon aria-hidden />
              {assessment.categoryLabel}
            </Badge>
            <Badge variant="neutral" size="sm">
              {assessment.trackLabel}
            </Badge>
            {tone.label !== "—" && (
              <Badge variant="outline" size="sm" className={tone.badge}>
                {tone.label}
              </Badge>
            )}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Updated {formatRelative(assessment.createdAt)} · change{" "}
            <span
              className={cn(
                "tnum font-semibold",
                deltaTone(assessment.scoreDelta),
              )}
            >
              {formatDelta(assessment.scoreDelta)}
            </span>{" "}
            · {assessment.dataCompleteness}% data completeness
          </p>
        </div>
      </div>

      {/* Components */}
      {withData.length > 0 && (
        <div className="grid gap-3 border-t border-border p-5 sm:grid-cols-2">
          {withData.map((component) => {
            const Icon = componentIcon(component.key);
            const compTone = bandTone(component.score, bands);
            return (
              <div key={component.key} className="flex items-center gap-2.5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                  <Icon className="size-3.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">
                    {component.label}
                  </p>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className={cn("h-full rounded-full", compTone.bar)}
                      style={{ width: `${component.score ?? 0}%` }}
                    />
                  </div>
                </div>
                <p
                  className={cn(
                    "tnum shrink-0 text-xs font-semibold",
                    compTone.text,
                  )}
                >
                  {component.score}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Top gaps */}
      {weakAreas.length > 0 && (
        <div className="border-t border-border bg-muted/30 p-5">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-foreground uppercase">
            <TriangleAlert
              className="size-3.5 text-warning-foreground"
              aria-hidden
            />
            Top gaps to close
          </p>
          <ul className="space-y-1.5">
            {weakAreas.map((area) => (
              <li
                key={area}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning"
                  aria-hidden
                />
                {area}
              </li>
            ))}
          </ul>
          <Button variant="link" size="sm" asChild className="mt-2 px-0">
            <Link href={href}>
              See the full analysis and roadmap
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      )}
    </Card>
  );
}
