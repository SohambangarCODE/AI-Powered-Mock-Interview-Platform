"use client";

import {
  Award,
  CheckCircle2,
  Flame,
  Hash,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/spinner";
import type { UserArenaStats } from "@/lib/arena";
import { cn } from "@/lib/utils";

function StatItem({
  icon: Icon,
  label,
  value,
  sub,
  color = "text-primary",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg bg-current/10",
          color,
        )}
      >
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="tnum text-lg font-bold text-foreground leading-none">
          {value}
        </p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

export function UserArenaStatsPanel({
  profile,
  rank,
  loading,
}: {
  profile: UserArenaStats | null;
  rank: number | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 py-10 text-center">
        <Zap className="mx-auto mb-3 size-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">No arena activity yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Complete a challenge to see your stats here
        </p>
      </div>
    );
  }

  const rankDisplay =
    rank !== null ? `#${rank}` : "—";

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <StatItem
        icon={Hash}
        label="Leaderboard Rank"
        value={rankDisplay}
        color="text-chart-5"
      />
      <StatItem
        icon={Star}
        label="Total Points"
        value={profile.totalPoints.toLocaleString()}
        color="text-warning"
      />
      <StatItem
        icon={CheckCircle2}
        label="Challenges Done"
        value={profile.totalCompleted}
        color="text-success"
      />
      <StatItem
        icon={Flame}
        label="Current Streak"
        value={`${profile.currentStreak}d`}
        sub={profile.currentStreak > 0 ? "Keep it up!" : "Start a streak"}
        color="text-warning"
      />
      <StatItem
        icon={TrendingUp}
        label="Longest Streak"
        value={`${profile.longestStreak}d`}
        color="text-primary"
      />
      <StatItem
        icon={Award}
        label="Achievements"
        value={profile.achievementCount}
        color="text-chart-5"
      />
    </div>
  );
}
