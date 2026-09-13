"use client";

import Link from "next/link";
import { ArrowRight, Flame, Star, Swords, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/spinner";
import { useChallenges, useArenaProfile } from "@/hooks/useArena";
import {
  CATEGORY_META,
  DIFFICULTY_META,
  formatTimeLeft,
  scoreToneArena,
  type ChallengeTemplate,
} from "@/lib/arena";
import { cn } from "@/lib/utils";

function MiniChallengeRow({ c }: { c: ChallengeTemplate }) {
  const cat = CATEGORY_META[c.category];
  const diff = DIFFICULTY_META[c.difficulty];
  const Icon = cat.icon;
  const done = c.attempt?.status === "completed";

  return (
    <Link
      href={`/arena/${c._id}`}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted"
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          cat.bgColor,
          cat.color,
        )}
      >
        <Icon className="size-3.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-foreground">{c.title}</p>
        <p className="text-[10px] text-muted-foreground">
          {diff.label} · {formatTimeLeft(c.expiresAt)}
        </p>
      </div>
      {done && c.attempt ? (
        <span
          className={cn(
            "tnum shrink-0 text-xs font-semibold",
            scoreToneArena(c.attempt.totalScore),
          )}
        >
          {c.attempt.totalScore}%
        </span>
      ) : (
        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
      )}
    </Link>
  );
}

export function ArenaPanel() {
  const { challenges, loading: chalLoading } = useChallenges(true);
  const { profile, rank, loading: profLoading } = useArenaProfile(true);

  const dailyChallenges = challenges
    .filter((c) => c.type === "daily")
    .slice(0, 3);

  const loading = chalLoading || profLoading;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Peer Challenge Arena"
        description="Daily and weekly challenges — compete on the leaderboard"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/arena">
              Open Arena
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
      />

      {loading ? (
        <Card className="gap-0 p-0">
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Stats strip */}
          {profile && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
              {rank !== null && (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-chart-5">
                  <Trophy className="size-4" aria-hidden />#{rank}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-sm font-semibold text-warning">
                <Star className="size-4" aria-hidden />
                {profile.totalPoints.toLocaleString()} pts
              </span>
              {profile.currentStreak > 0 && (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-warning">
                  <Flame className="size-4" aria-hidden />
                  {profile.currentStreak}-day streak
                </span>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                {profile.totalCompleted} completed
              </span>
            </div>
          )}

          {/* Today's challenges */}
          <Card className="gap-0 p-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Swords className="size-4 text-primary" aria-hidden />
                <p className="text-sm font-semibold text-foreground">
                  Today's Challenges
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                <Link href="/arena">View all</Link>
              </Button>
            </div>
            <div className="p-2">
              {dailyChallenges.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  No challenges available yet. Check back soon!
                </p>
              ) : (
                dailyChallenges.map((c) => (
                  <MiniChallengeRow key={c._id} c={c} />
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
