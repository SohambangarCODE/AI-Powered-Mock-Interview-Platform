"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CircleCheck,
  Clock,
  Filter,
  NotebookPen,
  RotateCcw,
  SkipForward,
  Star,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/spinner";
import {
  difficultyMeta,
  domainIcon,
  formatDate,
  formatMinutes,
  scoreTone,
  type InterviewSummary,
} from "@/lib/interview";
import { cn } from "@/lib/utils";

interface InterviewHistoryPanelProps {
  interviews: InterviewSummary[];
  dataLoading: boolean;
  onSelectDomain: (domain: string) => void;
  onStartInterview?: () => void;
  limit?: number;
  viewAllHref?: string;
}

export function InterviewHistoryPanel({
  interviews,
  dataLoading,
  onSelectDomain,
  onStartInterview,
  limit,
  viewAllHref,
}: InterviewHistoryPanelProps) {
  const router = useRouter();
  const [filterDomain, setFilterDomain] = useState<string>("All");

  const uniqueDomains = [
    "All",
    ...Array.from(new Set(interviews.map((i) => i.topic))),
  ];
  const filteredAll =
    filterDomain === "All"
      ? interviews
      : interviews.filter((i) => i.topic === filterDomain);
  const filtered = limit ? filteredAll.slice(0, limit) : filteredAll;
  const isTruncated = !!limit && filteredAll.length > limit;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Interview History"
        description="Your recent practice sessions"
        actions={
          uniqueDomains.length > 1 ? (
            <div className="flex items-center gap-2">
              <Filter className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="flex flex-wrap gap-1.5">
                {uniqueDomains.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setFilterDomain(d)}
                    aria-pressed={filterDomain === d}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      filterDomain === d
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          ) : undefined
        }
        className="sm:items-end"
      />

      {dataLoading ? (
        <Card className="gap-0 divide-y divide-border p-0">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="size-10 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-20 shrink-0 rounded-md" />
            </div>
          ))}
        </Card>
      ) : filtered.length === 0 && interviews.length === 0 ? (
        <Card className="border-dashed p-0">
          <EmptyState
            icon={NotebookPen}
            title="No sessions yet"
            description="Start a practice interview or upload your resume for personalised domain suggestions."
            action={
              onStartInterview ? (
                <Button onClick={onStartInterview}>Start Interview</Button>
              ) : undefined
            }
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            icon={Filter}
            title={`No sessions for "${filterDomain}"`}
            action={
              <Button variant="outline" onClick={() => setFilterDomain("All")}>
                Show all sessions
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <Card className="gap-0 divide-y divide-border overflow-hidden p-0">
            {filtered.map((interview) => {
              const diff = difficultyMeta(interview.finalDifficulty);
              const answerTone = scoreTone(interview.averageAnswerScore);
              const Icon = domainIcon(interview.topic);
              return (
                <div
                  key={interview.id}
                  className="group flex flex-col gap-3 p-4 transition-colors hover:bg-muted/40 md:flex-row md:items-center md:gap-4"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground transition-colors group-hover:border-primary/25 group-hover:bg-primary/10 group-hover:text-primary">
                    <Icon className="size-[18px]" aria-hidden />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {interview.topic}
                      </p>
                      <ScoreBadge score={interview.score} />
                      <Badge variant="outline" size="sm" className={diff.badge}>
                        ended {diff.label.toLowerCase()}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <Meta icon={Calendar}>{formatDate(interview.date)}</Meta>
                      <Meta icon={Clock}>{formatMinutes(interview.duration)}</Meta>
                      <Meta icon={CircleCheck}>
                        {interview.questionsAnswered} answered
                      </Meta>
                      {interview.skippedCount > 0 && (
                        <Meta icon={SkipForward}>
                          {interview.skippedCount} skipped
                        </Meta>
                      )}
                      {interview.averageAnswerScore !== null && (
                        <Meta icon={Star} className={answerTone.text}>
                          {interview.averageAnswerScore}/10 avg
                        </Meta>
                      )}
                    </div>
                  </div>

                  <div className="hidden w-24 shrink-0 flex-col items-end gap-1.5 lg:flex">
                    <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                      Score
                    </p>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${interview.score}%` }}
                      />
                    </div>
                    <p className="tnum text-xs font-semibold text-foreground">
                      {interview.score}%
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/sessions/${interview.id}`)}
                    >
                      Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectDomain(interview.topic)}
                    >
                      <RotateCcw aria-hidden />
                      Retake
                    </Button>
                  </div>
                </div>
              );
            })}
          </Card>

          {isTruncated && viewAllHref && (
            <div className="flex justify-center">
              <Button variant="outline" asChild>
                <Link href={viewAllHref}>
                  View all {filteredAll.length} sessions
                </Link>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Meta({
  icon: Icon,
  children,
  className,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-1.5", className)}>
      <Icon className="size-3.5 shrink-0 opacity-70" aria-hidden />
      {children}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const variant = score >= 80 ? "success" : score >= 60 ? "default" : "warning";
  const dot = score >= 80 ? "bg-success" : score >= 60 ? "bg-primary" : "bg-warning";
  return (
    <Badge variant={variant} size="sm" className="tnum">
      <span className={cn("size-1.5 rounded-full", dot)} aria-hidden />
      {score}%
    </Badge>
  );
}