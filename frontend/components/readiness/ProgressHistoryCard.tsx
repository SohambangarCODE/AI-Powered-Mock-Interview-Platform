"use client";

import { History, TrendingUp, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/interview";
import {
  bandTone,
  categoryMeta,
  deltaTone,
  formatDelta,
  trendMeta,
  type ReadinessHistoryEntry,
  type ScoreBand,
  type SkillTrend,
} from "@/lib/readiness";
import { cn } from "@/lib/utils";

/**
 * Score progression over time plus per-skill improvement/decline.
 *
 * The chart is built from the append-only assessment history: one point per
 * "Recalculate" run, oldest-first as the API returns it. Skill directions come
 * from comparing the latest snapshot against the one before it, server-side.
 */
export default function ProgressHistoryCard({
  history,
  skillTrends,
  bands,
  error,
}: {
  history: ReadinessHistoryEntry[];
  skillTrends: SkillTrend[];
  bands?: ScoreBand[] | null;
  error?: string | null;
}) {
  const improving = skillTrends.filter((s) => s.direction === "improving");
  const declining = skillTrends.filter((s) => s.direction === "declining");

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <History className="size-[18px]" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Progress History
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {history.length > 0
                ? `${history.length} assessment${history.length === 1 ? "" : "s"} recorded`
                : "Your score over time"}
            </p>
          </div>
        </div>
        {(improving.length > 0 || declining.length > 0) && (
          <div className="flex shrink-0 gap-2">
            {improving.length > 0 && (
              <Badge variant="success" size="sm">
                {improving.length} improving
              </Badge>
            )}
            {declining.length > 0 && (
              <Badge variant="destructive" size="sm">
                {declining.length} declining
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="p-5">
        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5"
          >
            <TriangleAlert
              className="mt-px size-4 shrink-0 text-destructive"
              aria-hidden
            />
            <p className="text-sm font-medium text-destructive">{error}</p>
          </div>
        )}

        {history.length === 0 && !error && (
          <EmptyState
            icon={TrendingUp}
            title="No history yet"
            description="Your first readiness report starts the trend. Recalculate after each interview or assessment to watch it move."
          />
        )}

        {history.length === 1 && (
          <div className="rounded-lg border border-dashed border-border-strong bg-muted/30 p-4 text-center">
            <p className="text-sm font-medium text-foreground">
              First assessment recorded
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Recalculate again after your next interview or skill assessment and
              a progression chart will appear here.
            </p>
          </div>
        )}

        {history.length >= 2 && (
          <ScoreProgression history={history} bands={bands} />
        )}

        {/* ── Run log ── */}
        {history.length > 0 && (
          <div className="mt-6">
            <p className="mb-2.5 text-xs font-semibold tracking-wide text-foreground uppercase">
              Assessment log
            </p>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {[...history].reverse().map((entry) => {
                const tone = bandTone(entry.overallScore, bands);
                const cat = categoryMeta(entry.category);
                return (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-center gap-3 p-3.5"
                  >
                    <p
                      className={cn(
                        "tnum w-10 shrink-0 text-lg font-semibold",
                        tone.text,
                      )}
                    >
                      {entry.overallScore}
                    </p>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" size="sm" className={cat.badge}>
                          {entry.categoryLabel}
                        </Badge>
                        <Badge variant="neutral" size="sm">
                          {entry.trackLabel}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(entry.createdAt)} ·{" "}
                        {entry.dataCompleteness}% data completeness
                      </p>
                    </div>
                    <p
                      className={cn(
                        "tnum shrink-0 text-sm font-semibold",
                        deltaTone(entry.scoreDelta),
                      )}
                    >
                      {formatDelta(entry.scoreDelta)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* ── Per-skill tracking ── */}
        {skillTrends.length > 0 && (
          <div className="mt-6">
            <p className="mb-1 text-xs font-semibold tracking-wide text-foreground uppercase">
              Skill Tracking
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              Measured per skill from your assessments and interview topic
              scores, compared with your previous assessment.
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {skillTrends.map((trend) => {
                const meta = trendMeta(trend.direction);
                const Icon = meta.icon;
                const tone = bandTone(trend.score, bands);
                return (
                  <li
                    key={`${trend.skill}-${trend.source}`}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {trend.skill}
                      </p>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border">
                        <div
                          className={cn("h-full rounded-full", tone.bar)}
                          style={{ width: `${trend.score}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {trend.source === "assessment"
                          ? "Skill assessment"
                          : "Interview topic"}
                        {trend.previousScore !== null &&
                          ` · was ${trend.previousScore}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={cn("tnum text-sm font-semibold", tone.text)}>
                        {trend.score}
                      </p>
                      <p
                        className={cn(
                          "flex items-center justify-end gap-1 text-[11px] font-medium",
                          meta.className,
                        )}
                      >
                        <Icon className="size-3" aria-hidden />
                        {trend.delta !== null
                          ? formatDelta(trend.delta)
                          : meta.label}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

// Geometry in viewBox units; the SVG scales to its container.
const PAD_L = 34;
const PAD_R = 14;
const PAD_T = 18;
const PAD_B = 30;
const STEP = 62;
const PLOT_H = 130;

/** Line chart of overall score across every recorded assessment. */
function ScoreProgression({
  history,
  bands,
}: {
  history: ReadinessHistoryEntry[];
  bands?: ScoreBand[] | null;
}) {
  const n = history.length;
  const width = PAD_L + (n - 1) * STEP + PAD_R;
  const height = PAD_T + PLOT_H + PAD_B;

  // Fixed 0-100 axis: the score is always a percentage, and an auto-scaled axis
  // would exaggerate a 2-point wobble into a dramatic climb.
  const xFor = (i: number) => PAD_L + i * STEP;
  const yFor = (score: number) =>
    PAD_T + PLOT_H - (Math.max(0, Math.min(100, score)) / 100) * PLOT_H;

  const points = history.map((h, i) => ({
    x: xFor(i),
    y: yFor(h.overallScore),
    entry: h,
  }));
  const line = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${PAD_L},${PAD_T + PLOT_H} ${line} ${xFor(n - 1)},${PAD_T + PLOT_H}`;

  const first = history[0].overallScore;
  const last = history[n - 1].overallScore;
  const net = last - first;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
          Score progression
        </p>
        <p className="text-xs text-muted-foreground">
          Net change since first assessment:{" "}
          <span className={cn("tnum font-semibold", deltaTone(net))}>
            {formatDelta(net)}
          </span>
        </p>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[320px]"
          style={{ maxWidth: `${Math.max(width, 320)}px` }}
          role="img"
          aria-label={`Readiness score progression across ${n} assessments: ${history
            .map((h) => h.overallScore)
            .join(", ")}`}
        >
          {/* Gridlines at 0/25/50/75/100 */}
          {[0, 25, 50, 75, 100].map((tick) => (
            <g key={tick}>
              <line
                x1={PAD_L - 6}
                y1={yFor(tick)}
                x2={width - PAD_R}
                y2={yFor(tick)}
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="3 4"
                className="text-border"
              />
              <text
                x={PAD_L - 10}
                y={yFor(tick) + 3.5}
                textAnchor="end"
                className="fill-muted-foreground text-[9px]"
              >
                {tick}
              </text>
            </g>
          ))}

          <polygon points={area} className="fill-primary/10" stroke="none" />
          <polyline
            points={line}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          />

          {points.map((p, i) => {
            const tone = bandTone(p.entry.overallScore, bands);
            return (
              <g key={p.entry.id}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="4.5"
                  fill={tone.hex}
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-card"
                />
                <text
                  x={p.x}
                  y={p.y - 10}
                  textAnchor="middle"
                  className="fill-foreground text-[10px] font-semibold"
                >
                  {p.entry.overallScore}
                </text>
                <text
                  x={p.x}
                  y={height - PAD_B + 18}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[9px]"
                >
                  #{i + 1}
                </text>
                <title>
                  {`#${i + 1} · ${formatDate(p.entry.createdAt)} · ${p.entry.overallScore}/100 · ${p.entry.categoryLabel}`}
                </title>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
