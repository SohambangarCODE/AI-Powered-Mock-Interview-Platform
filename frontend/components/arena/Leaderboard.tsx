"use client";

import { Crown, Flame, Medal, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import type { LeaderboardRow, UserArenaStats } from "@/lib/arena";
import { cn } from "@/lib/utils";

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="size-4 text-yellow-500" aria-hidden />;
  if (rank === 2) return <Medal className="size-4 text-slate-400" aria-hidden />;
  if (rank === 3) return <Medal className="size-4 text-amber-600" aria-hidden />;
  return (
    <span className="tnum w-4 text-center text-sm font-semibold text-muted-foreground">
      {rank}
    </span>
  );
}

function StreakPill({ streak }: { streak: number }) {
  if (streak === 0) return null;
  return (
    <span className="flex items-center gap-0.5 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
      <Flame className="size-3" aria-hidden />
      {streak}
    </span>
  );
}

export function Leaderboard({
  rows,
  currentUser,
  loading,
  error,
}: {
  rows: LeaderboardRow[];
  currentUser: UserArenaStats | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={Trophy}
        title="Failed to load leaderboard"
        description={error}
      />
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="Leaderboard is empty"
        description="Be the first to complete a challenge and claim the top spot!"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Current user banner if not in visible rows */}
      {currentUser && currentUser.rank !== null && currentUser.rank > rows.length && (
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Your position
          </p>
          <div className="flex items-center gap-3">
            <span className="tnum text-lg font-bold text-primary">
              #{currentUser.rank}
            </span>
            <div className="h-5 w-px bg-border" />
            <span className="tnum text-sm font-semibold text-foreground">
              {currentUser.totalPoints.toLocaleString()} pts
            </span>
            <StreakPill streak={currentUser.currentStreak} />
          </div>
        </div>
      )}

      {/* Leaderboard rows */}
      <Card className="gap-0 divide-y divide-border overflow-hidden p-0">
        {rows.map((row) => (
          <div
            key={row.userId}
            className={cn(
              "flex items-center gap-3 px-4 py-3 transition-colors",
              row.isCurrentUser
                ? "bg-primary/5"
                : row.rank <= 3
                  ? "bg-muted/30"
                  : "hover:bg-muted/20",
            )}
          >
            {/* Rank */}
            <div className="flex w-8 shrink-0 items-center justify-center">
              <RankIcon rank={row.rank} />
            </div>

            {/* Avatar initials */}
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                row.isCurrentUser
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {(row.name || "?")
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </span>

            {/* Name */}
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "truncate text-sm font-medium",
                  row.isCurrentUser ? "text-primary" : "text-foreground",
                )}
              >
                {row.name}
                {row.isCurrentUser && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    (you)
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {row.totalCompleted} challenge{row.totalCompleted !== 1 ? "s" : ""}
                {row.achievementCount > 0 && ` · ${row.achievementCount} badges`}
              </p>
            </div>

            {/* Streak */}
            <StreakPill streak={row.currentStreak} />

            {/* Points */}
            <div className="shrink-0 text-right">
              <p className="tnum text-sm font-semibold text-foreground">
                {row.totalPoints.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">pts</p>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
