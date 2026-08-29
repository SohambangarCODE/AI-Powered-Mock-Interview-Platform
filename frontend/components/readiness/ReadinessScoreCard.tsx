"use client";

import { ChevronDown, Info, RotateCcw, Sparkles } from "lucide-react";
import { useState } from "react";

import { ScoreRing } from "@/components/interview/InterviewReport";
import { Glyph } from "@/components/readiness/Glyph";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRelative } from "@/lib/interview";
import {
  bandTone,
  categoryMeta,
  componentIcon,
  deltaTone,
  formatDelta,
  trackIcon,
  type ReadinessAssessment,
  type ReadinessConfig,
  type ScoreComponent,
} from "@/lib/readiness";
import { cn } from "@/lib/utils";

/**
 * The headline: overall score, candidate category, and how the four weighted
 * components produced that number.
 *
 * Every number rendered here was computed by the backend. Nothing on this
 * surface recalculates a score or applies a threshold of its own — the weights,
 * bands and category rules all arrive over the wire.
 */
export default function ReadinessScoreCard({
  assessment,
  config,
  onRegenerate,
  generating,
}: {
  assessment: ReadinessAssessment;
  config: ReadinessConfig | null;
  onRegenerate: () => void;
  generating: boolean;
}) {
  const [showWeights, setShowWeights] = useState(false);

  const bands = config?.scoreBands;
  const tone = bandTone(assessment.overallScore, bands);
  const cat = categoryMeta(assessment.category);
  const CatIcon = cat.icon;

  const withData = assessment.components.filter((c) => c.hasData);
  const missing = assessment.components.filter((c) => !c.hasData);

  return (
    <Card className="gap-0 overflow-hidden p-0">
      {/* ── Score + category ── */}
      <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
        <div className="mx-auto md:mx-0">
          <ScoreRing
            score={assessment.overallScore}
            label="Readiness"
            hex={tone.hex}
          />
        </div>

        <div className="min-w-0 space-y-4 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
            <Badge variant="outline" className={cat.badge}>
              <CatIcon aria-hidden />
              {assessment.categoryLabel}
            </Badge>
            <Badge variant="neutral">
              <Glyph icon={trackIcon(assessment.track)} />
              {assessment.trackLabel}
              {!assessment.trackDetected && " · chosen"}
            </Badge>
            {tone.label !== "—" && (
              <Badge variant="outline" className={tone.badge}>
                {tone.label}
              </Badge>
            )}
            {!assessment.analysis.aiGenerated && (
              <Badge variant="warning" size="sm">
                AI unavailable · computed only
              </Badge>
            )}
          </div>

          {assessment.analysis.summary && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {assessment.analysis.summary}
            </p>
          )}

          {assessment.analysis.categoryReason && (
            <div
              className={cn(
                "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left",
                cat.ring,
              )}
            >
              <Info
                className={cn("mt-px size-4 shrink-0", cat.text)}
                aria-hidden
              />
              <p className="text-sm text-muted-foreground">
                {assessment.analysis.categoryReason}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground md:justify-start">
            <span>
              Change vs previous:{" "}
              <span
                className={cn(
                  "tnum font-semibold",
                  deltaTone(assessment.scoreDelta),
                )}
              >
                {formatDelta(assessment.scoreDelta)}
              </span>
            </span>
            <span>
              Data completeness:{" "}
              <span className="tnum font-semibold text-foreground">
                {assessment.dataCompleteness}%
              </span>
            </span>
            <span>Generated {formatRelative(assessment.createdAt)}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
            <Button
              size="sm"
              variant="outline"
              onClick={onRegenerate}
              loading={generating}
            >
              {!generating && <RotateCcw aria-hidden />}
              {generating ? "Recalculating…" : "Recalculate"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Component breakdown ── */}
      <div className="border-t border-border p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
            Score Composition
          </p>
          <button
            type="button"
            onClick={() => setShowWeights((v) => !v)}
            aria-expanded={showWeights}
            className="flex items-center gap-1 text-xs font-medium text-primary transition-colors outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            How this is weighted
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                showWeights && "rotate-180",
              )}
              aria-hidden
            />
          </button>
        </div>

        {showWeights && (
          <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3.5 text-xs leading-relaxed text-muted-foreground">
            <p>
              Each component is scored 0–100 and combined using the weights
              configured on the server. Components you have no data for are
              dropped and the remaining weights are scaled back up to 100%, so a
              missing input never counts as a zero — it is reported through data
              completeness instead.
            </p>
            {config && (
              <p className="mt-2">
                Configured weights:{" "}
                {assessment.components
                  .map((c) => `${c.label} ${c.weight}%`)
                  .join(" · ")}
                .
              </p>
            )}
            {config && (
              <p className="mt-2">
                <span className="font-medium text-foreground">
                  {config.categories.placementReady.label}
                </span>{" "}
                needs {config.categories.placementReady.minOverall}+ with at
                least {config.categories.placementReady.minComponents} data
                sources ·{" "}
                <span className="font-medium text-foreground">
                  {config.categories.highPotential.label}
                </span>{" "}
                needs {config.categories.highPotential.minOverall}+ with one
                component at {config.categories.highPotential.minTopComponent}+
                or a {config.categories.highPotential.minTrendDelta}-point climb.
              </p>
            )}
          </div>
        )}

        <div className="mt-4 space-y-3">
          {withData.map((component) => (
            <ComponentRow
              key={component.key}
              component={component}
              bands={config?.scoreBands}
            />
          ))}
        </div>

        {missing.length > 0 && (
          <div className="mt-4 rounded-lg border border-dashed border-border-strong bg-muted/30 p-3.5">
            <p className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Sparkles
                className="size-3.5 text-muted-foreground"
                aria-hidden
              />
              Not counted yet
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {missing.map((m) => m.label).join(", ")} — no data on file. Adding
              {missing.length === 1 ? " it" : " them"} will make your score a
              fuller picture.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

/** One weighted component, with its score bar and contribution. */
function ComponentRow({
  component,
  bands,
}: {
  component: ScoreComponent;
  bands?: { min: number; label: string }[] | null;
}) {
  const [open, setOpen] = useState(false);
  const tone = bandTone(component.score, bands);
  const score = component.score ?? 0;
  const hasDetail = Boolean(component.detail);

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => hasDetail && setOpen((v) => !v)}
        aria-expanded={hasDetail ? open : undefined}
        disabled={!hasDetail}
        className={cn(
          "flex w-full items-center gap-3 p-3.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          hasDetail && "transition-colors hover:bg-muted/40",
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
          <Glyph icon={componentIcon(component.key)} className="size-[18px]" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {component.label}
            </p>
            {tone.label !== "—" && (
              <Badge variant="outline" size="sm" className={tone.badge}>
                {tone.label}
              </Badge>
            )}
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className={cn("h-full rounded-full transition-all", tone.bar)}
              style={{ width: `${score}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {component.weight}% configured
            {component.effectiveWeight !== component.weight && (
              <> · {Math.round(component.effectiveWeight)}% applied</>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <p className={cn("tnum text-lg font-semibold", tone.text)}>{score}</p>
          {hasDetail && (
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
              aria-hidden
            />
          )}
        </div>
      </button>

      {open && component.detail && (
        <div className="border-t border-border p-3.5">
          <ComponentDetailBody component={component} />
        </div>
      )}
    </div>
  );
}

/** The per-component evidence, straight from the backend's `detail` payload. */
function ComponentDetailBody({ component }: { component: ScoreComponent }) {
  const d = component.detail;
  if (!d) return null;

  // Resume and communication both arrive as weighted rows, so they render the
  // same way with different field names.
  const rows =
    d.breakdown?.map((b) => ({
      key: b.key,
      label: b.label,
      value: `${b.count}/${b.target}`,
      earned: b.earned,
      weight: b.weight,
    })) ??
    d.metrics?.map((m) => ({
      key: m.key,
      label: m.label,
      value: m.value,
      earned: m.earned,
      weight: m.weight,
    }));

  return (
    <div className="space-y-3">
      {rows && (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center gap-3 text-xs">
              <span className="w-40 shrink-0 truncate text-muted-foreground">
                {row.label}
              </span>
              <span className="tnum w-28 shrink-0 text-foreground">
                {row.value}
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                <span
                  className="block h-full rounded-full bg-primary/70"
                  style={{
                    width: `${row.weight > 0 ? (row.earned / row.weight) * 100 : 0}%`,
                  }}
                />
              </span>
              <span className="tnum w-16 shrink-0 text-right text-muted-foreground">
                {row.earned}/{row.weight}
              </span>
            </li>
          ))}
        </ul>
      )}

      <dl className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
        {d.sessionsCounted !== undefined && (
          <Fact label="Sessions counted" value={d.sessionsCounted} />
        )}
        {d.assessmentsCounted !== undefined && (
          <Fact label="Assessments counted" value={d.assessmentsCounted} />
        )}
        {d.recencyWeightedAverage !== undefined && (
          <Fact label="Recency-weighted avg" value={d.recencyWeightedAverage} />
        )}
        {d.coverageBonus !== undefined && d.coverageBonus > 0 && (
          <Fact label="Domain coverage bonus" value={`+${d.coverageBonus}`} />
        )}
        {d.domainsPractised !== undefined && (
          <Fact
            label="Domains practised"
            value={`${d.domainsPractised}${
              d.domainCoverageTarget ? `/${d.domainCoverageTarget}` : ""
            }`}
          />
        )}
        {d.bestScore !== undefined && <Fact label="Best" value={d.bestScore} />}
        {d.latestScore !== undefined && (
          <Fact label="Latest" value={d.latestScore} />
        )}
        {d.answersAnalysed !== undefined && (
          <Fact label="Answers analysed" value={d.answersAnalysed} />
        )}
        {d.averageWordsPerAnswer !== undefined && (
          <Fact label="Avg words / answer" value={d.averageWordsPerAnswer} />
        )}
        {d.totalYearsExperience !== undefined && d.totalYearsExperience > 0 && (
          <Fact label="Years of experience" value={d.totalYearsExperience} />
        )}
        {d.experienceLevel && (
          <Fact label="Experience level" value={d.experienceLevel} />
        )}
      </dl>

      {d.skillsCovered && d.skillsCovered.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-foreground">
            Skills measured
          </p>
          <div className="flex flex-wrap gap-1.5">
            {d.skillsCovered.map((s) => (
              <Badge key={s.skill} variant="neutral" size="sm" className="tnum">
                {s.skill} · {s.score}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <dt>{label}:</dt>
      <dd className="tnum font-semibold text-foreground">{value}</dd>
    </div>
  );
}
