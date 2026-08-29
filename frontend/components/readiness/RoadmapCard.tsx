"use client";

import { Flag, Map, Play, Target } from "lucide-react";

import { Glyph } from "@/components/readiness/Glyph";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { domainIcon } from "@/lib/interview";
import {
  ROADMAP_SECTION_ICONS,
  priorityMeta,
  trackIcon,
  type Roadmap,
  type RoadmapItem,
  type TrackKey,
} from "@/lib/readiness";
import { cn } from "@/lib/utils";

const SECTIONS = [
  {
    key: "technologies" as const,
    title: "Technologies to learn",
    blurb: "Skills to add next, ordered by what unblocks the most roles",
  },
  {
    key: "projects" as const,
    title: "Projects to build",
    blurb: "Portfolio work that proves the skills above",
  },
  {
    key: "certifications" as const,
    title: "Certifications to consider",
    blurb: "Credentials that carry weight for your track",
  },
  {
    key: "interviewTopics" as const,
    title: "Interview topics to practise",
    blurb: "Start a live mock session on any of these",
  },
];

/**
 * The personalised roadmap. Every item is derived from this candidate's own
 * resume, interview and assessment data, and the recommendations differ by track
 * (fresher / internship seeker / experienced) because the backend prompts the
 * model with track-specific guidance.
 */
export default function RoadmapCard({
  roadmap,
  trackLabel,
  track,
  onPractise,
}: {
  roadmap: Roadmap;
  trackLabel: string;
  track: TrackKey;
  onPractise: (domain: string) => void;
}) {
  const total =
    roadmap.technologies.length +
    roadmap.projects.length +
    roadmap.certifications.length +
    roadmap.interviewTopics.length;

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Map className="size-[18px]" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Personalised Roadmap
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Tailored to your data and your track
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge variant="neutral" size="sm">
            <Glyph icon={trackIcon(track)} />
            {trackLabel}
          </Badge>
          {!roadmap.aiGenerated && (
            <Badge variant="warning" size="sm">
              Computed fallback
            </Badge>
          )}
        </div>
      </div>

      {total === 0 && !roadmap.focusStatement ? (
        <EmptyState
          icon={Map}
          title="No roadmap yet"
          description="Recalculate your readiness report to generate one."
        />
      ) : (
        <div className="space-y-6 p-5">
          {roadmap.focusStatement && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="mb-1.5 flex items-center gap-2 text-xs font-semibold tracking-wide text-primary uppercase">
                <Target className="size-3.5" aria-hidden />
                Focus right now
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {roadmap.focusStatement}
              </p>
            </div>
          )}

          {SECTIONS.map((section) => {
            const items = roadmap[section.key];
            if (!items?.length) return null;
            const Icon = ROADMAP_SECTION_ICONS[section.key];

            return (
              <div key={section.key}>
                <div className="mb-2.5">
                  <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-foreground uppercase">
                    <Icon
                      className="size-3.5 text-muted-foreground"
                      aria-hidden
                    />
                    {section.title}
                    <span className="tnum font-normal text-muted-foreground">
                      ({items.length})
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {section.blurb}
                  </p>
                </div>

                <ul className="space-y-2">
                  {items.map((item, i) => (
                    <RoadmapRow
                      key={`${item.title}-${i}`}
                      item={item}
                      onPractise={
                        section.key === "interviewTopics" && item.domain
                          ? () => onPractise(item.domain)
                          : undefined
                      }
                    />
                  ))}
                </ul>
              </div>
            );
          })}

          {roadmap.milestones.length > 0 && (
            <div>
              <p className="mb-2.5 flex items-center gap-2 text-xs font-semibold tracking-wide text-foreground uppercase">
                <Flag className="size-3.5 text-muted-foreground" aria-hidden />
                Milestones
              </p>
              <ol className="space-y-2">
                {roadmap.milestones.map((m, i) => (
                  <li
                    key={m}
                    className="flex items-start gap-3 rounded-lg border border-border p-3"
                  >
                    <span className="tnum flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {m}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function RoadmapRow({
  item,
  onPractise,
}: {
  item: RoadmapItem;
  onPractise?: () => void;
}) {
  const priority = priorityMeta(item.priority);

  return (
    <li className="flex flex-wrap items-start gap-3 rounded-lg border border-border p-3.5">
      <span
        className={cn("mt-1.5 size-2 shrink-0 rounded-full", priority.dot)}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{item.title}</p>
          <Badge variant={priority.variant} size="sm">
            {priority.label}
          </Badge>
        </div>
        {item.reason && (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {item.reason}
          </p>
        )}
        {item.technologies.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.technologies.map((t) => (
              <Badge key={t} variant="outline" size="sm">
                {t}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {onPractise && (
        <Button
          size="sm"
          variant="outline"
          onClick={onPractise}
          className="shrink-0"
        >
          {item.domain ? (
            <Glyph icon={domainIcon(item.domain)} />
          ) : (
            <Play aria-hidden />
          )}
          Practise
        </Button>
      )}
    </li>
  );
}
