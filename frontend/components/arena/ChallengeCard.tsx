"use client";

import Link from "next/link";
import { Clock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CATEGORY_META,
  DIFFICULTY_META,
  formatTimeLeft,
  scoreToneArena,
  type ChallengeTemplate,
} from "@/lib/arena";
import { cn } from "@/lib/utils";

export function ChallengeCard({ challenge }: { challenge: ChallengeTemplate }) {
  const cat = CATEGORY_META[challenge.category];
  const diff = DIFFICULTY_META[challenge.difficulty];
  const Icon = cat.icon;
  const isCompleted = challenge.attempt?.status === "completed";
  const isInProgress = challenge.attempt?.status === "in-progress";
  const timeLeft = formatTimeLeft(challenge.expiresAt);
  const isExpired = timeLeft === "Expired";

  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden p-0 transition-shadow hover:shadow-md",
        isCompleted && "opacity-80",
      )}
    >
      {/* Top accent strip */}
      <div className={cn("h-1 w-full", cat.bgColor.replace("/10", ""))} />

      <div className="flex flex-col gap-4 p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg",
                cat.bgColor,
                cat.color,
              )}
            >
              <Icon className="size-[18px]" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {challenge.title}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {cat.description}
              </p>
            </div>
          </div>

          {/* Type badge */}
          <Badge
            variant="outline"
            size="sm"
            className={
              challenge.type === "weekly"
                ? "border-chart-5/30 bg-chart-5/10 text-chart-5"
                : "border-primary/30 bg-primary/10 text-primary"
            }
          >
            {challenge.type === "weekly" ? "Weekly" : "Daily"}
          </Badge>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Difficulty */}
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
              diff.bgColor,
              diff.color,
            )}
          >
            <span className={cn("size-1.5 rounded-full", diff.dot)} />
            {diff.label}
          </span>

          {/* Category */}
          <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
            {cat.label}
          </span>

          {/* Question count */}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3" aria-hidden />
            {challenge.questionCount} questions
          </span>

          {/* Time left */}
          <span
            className={cn(
              "flex items-center gap-1 text-xs",
              isExpired ? "text-destructive" : "text-muted-foreground",
            )}
          >
            <Clock className="size-3" aria-hidden />
            {timeLeft}
          </span>
        </div>

        {/* Score if completed */}
        {isCompleted && challenge.attempt && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2">
            <span className="text-xs text-muted-foreground">Your score</span>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "tnum text-sm font-semibold",
                  scoreToneArena(challenge.attempt.totalScore),
                )}
              >
                {challenge.attempt.totalScore}%
              </span>
              <span className="tnum text-xs font-medium text-warning">
                +{challenge.attempt.pointsEarned} pts
              </span>
            </div>
          </div>
        )}

        {/* Action */}
        <div className="mt-auto">
          {isExpired ? (
            <Button variant="outline" size="sm" className="w-full" disabled>
              Expired
            </Button>
          ) : isCompleted && challenge.attempt ? (
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href={`/arena/${challenge._id}`}>View Results</Link>
            </Button>
          ) : isInProgress ? (
            <Button size="sm" className="w-full" asChild>
              <Link href={`/arena/${challenge._id}`}>Continue →</Link>
            </Button>
          ) : (
            <Button size="sm" className="w-full" asChild>
              <Link href={`/arena/${challenge._id}`}>Start Challenge →</Link>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
