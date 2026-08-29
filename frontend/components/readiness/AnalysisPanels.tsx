"use client";

import { Brain } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ANALYSIS_PANELS,
  PANEL_TONES,
  type ReadinessAnalysis,
} from "@/lib/readiness";
import { cn } from "@/lib/utils";

/**
 * The four AI findings: technical strengths, weak technical areas,
 * communication gaps, and missing industry skills.
 *
 * Each list is grounded in the candidate's own measured scores — the backend
 * hands the model a brief of real numbers and refuses to invent a finding it has
 * no evidence for, falling back to a deterministic summary if the model is down.
 */
export default function AnalysisPanels({
  analysis,
}: {
  analysis: ReadinessAnalysis;
}) {
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Brain className="size-[18px]" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">AI Analysis</p>
            <p className="truncate text-xs text-muted-foreground">
              Strengths, gaps and what employers expect that you have not shown
              yet
            </p>
          </div>
        </div>
        <Badge
          variant={analysis.aiGenerated ? "default" : "warning"}
          size="sm"
          className="shrink-0"
        >
          {analysis.aiGenerated ? "AI generated" : "Computed fallback"}
        </Badge>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-2">
        {ANALYSIS_PANELS.map((panel) => {
          const items = analysis[panel.key] || [];
          const tone = PANEL_TONES[panel.tone];
          const Icon = panel.icon;

          return (
            <div
              key={panel.key}
              className={cn("rounded-xl border p-4", tone.wrap)}
            >
              <p
                className={cn(
                  "mb-3 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase",
                  tone.head,
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {panel.title}
                {items.length > 0 && (
                  <span className="tnum ml-auto font-normal">
                    {items.length}
                  </span>
                )}
              </p>

              {items.length > 0 ? (
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"
                    >
                      <span
                        className={cn(
                          "mt-1.5 size-1.5 shrink-0 rounded-full",
                          tone.dot,
                        )}
                        aria-hidden
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{panel.empty}</p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
