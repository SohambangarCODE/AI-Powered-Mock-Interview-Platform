"use client";

import { cn } from "@/lib/utils";
import type { Achievement } from "@/lib/arena";

export function AchievementBadge({
  achievement,
  size = "default",
}: {
  achievement: Achievement;
  size?: "sm" | "default";
}) {
  const earned = achievement.earned;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors",
        earned
          ? "border-primary/20 bg-primary/5"
          : "border-border bg-muted/30 opacity-50 grayscale",
        size === "sm" ? "min-w-[80px]" : "min-w-[96px]",
      )}
      title={
        earned
          ? `Earned on ${achievement.earnedAt ? new Date(achievement.earnedAt).toLocaleDateString() : "—"}`
          : "Not yet earned"
      }
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full",
          size === "sm"
            ? "size-9 text-xl"
            : "size-12 text-2xl",
          earned ? "bg-primary/10" : "bg-muted",
        )}
        aria-hidden
      >
        {achievement.icon}
      </span>
      <div className="space-y-0.5">
        <p
          className={cn(
            "font-semibold leading-tight",
            size === "sm" ? "text-[10px]" : "text-xs",
            earned ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {achievement.name}
        </p>
        {size !== "sm" && (
          <p className="text-[10px] leading-tight text-muted-foreground">
            {achievement.description}
          </p>
        )}
        {earned && achievement.earnedAt && (
          <p className="text-[9px] text-muted-foreground">
            {new Date(achievement.earnedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
