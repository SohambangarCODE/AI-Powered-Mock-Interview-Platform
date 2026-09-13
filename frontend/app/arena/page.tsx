"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  BarChart3,
  Filter,
  ListChecks,
  RotateCcw,
  Swords,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { LoadingState, Skeleton } from "@/components/ui/spinner";
import { ChallengeCard } from "@/components/arena/ChallengeCard";
import { Leaderboard } from "@/components/arena/Leaderboard";
import { UserArenaStatsPanel } from "@/components/arena/UserArenaStats";
import { AchievementBadge } from "@/components/arena/AchievementBadge";
import { useAuth } from "@/hooks/useAuth";
import {
  useChallenges,
  useLeaderboard,
  useArenaProfile,
  useAchievements,
  useAttemptHistory,
} from "@/hooks/useArena";
import {
  CATEGORY_META,
  DIFFICULTY_META,
  formatTimeLeft,
  formatDuration,
  scoreToneArena,
  type ChallengeCategory,
  type ChallengeDifficulty,
  type ChallengeType,
} from "@/lib/arena";
import { cn } from "@/lib/utils";

// ── Tabs ───────────────────────────────────────────────────
const TABS = [
  { id: "challenges", label: "Challenges", icon: Swords },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy },
  { id: "stats", label: "My Stats", icon: BarChart3 },
  { id: "achievements", label: "Achievements", icon: Award },
  { id: "history", label: "History", icon: ListChecks },
] as const;

type Tab = (typeof TABS)[number]["id"];

// ── Filters ────────────────────────────────────────────────
const TYPE_OPTIONS: { value: "" | ChallengeType; label: string }[] = [
  { value: "", label: "All" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];
const CATEGORY_OPTIONS: { value: "" | ChallengeCategory; label: string }[] = [
  { value: "", label: "All Categories" },
  { value: "technical", label: "Technical" },
  { value: "hr", label: "HR / Behavioural" },
  { value: "aptitude", label: "Aptitude" },
  { value: "domain", label: "Domain" },
  { value: "dsa", label: "DSA" },
];
const DIFFICULTY_OPTIONS: {
  value: "" | ChallengeDifficulty;
  label: string;
}[] = [
  { value: "", label: "All Levels" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

// ── FilterPill helper ──────────────────────────────────────
function FilterPill<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            value === opt.value
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── History Row ────────────────────────────────────────────
function HistoryRow({
  item,
}: {
  item: {
    _id: string;
    title: string;
    category: ChallengeCategory;
    difficulty: ChallengeDifficulty;
    type: ChallengeType;
    totalScore: number;
    pointsEarned: number;
    completedAt: string;
    timeTakenSeconds: number | null;
  };
}) {
  const cat = CATEGORY_META[item.category];
  const diff = DIFFICULTY_META[item.difficulty];
  const Icon = cat.icon;

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 last:border-0">
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          cat.bgColor,
          cat.color,
        )}
      >
        <Icon className="size-[14px]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {item.title}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(item.completedAt).toLocaleDateString()} ·{" "}
          <span className={diff.color}>{diff.label}</span> ·{" "}
          {item.type === "weekly" ? "Weekly" : "Daily"} ·{" "}
          {formatDuration(item.timeTakenSeconds)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={cn(
            "tnum text-sm font-semibold",
            scoreToneArena(item.totalScore),
          )}
        >
          {item.totalScore}%
        </p>
        <p className="tnum text-[10px] text-warning">+{item.pointsEarned} pts</p>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────
export default function ArenaPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("challenges");

  // Filters (challenges tab)
  const [typeFilter, setTypeFilter] = useState<"" | ChallengeType>("");
  const [catFilter, setCatFilter] = useState<"" | ChallengeCategory>("");
  const [diffFilter, setDiffFilter] = useState<"" | ChallengeDifficulty>("");

  const { challenges, loading: chalLoading, error: chalError, refetch: refetchChal } =
    useChallenges(isLoggedIn);
  const { leaderboard, currentUser, loading: lbLoading, error: lbError } =
    useLeaderboard(isLoggedIn && activeTab === "leaderboard");
  const { profile, rank, loading: profLoading } =
    useArenaProfile(isLoggedIn && activeTab === "stats");
  const { achievements, loading: achLoading } =
    useAchievements(isLoggedIn && activeTab === "achievements");
  const { history, total: histTotal, loading: histLoading } =
    useAttemptHistory(isLoggedIn && activeTab === "history");

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.push("/login");
  }, [isLoggedIn, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-background">
        <LoadingState label="Loading…" />
      </div>
    );
  }
  if (!isLoggedIn) return null;

  // Apply filters
  const filtered = challenges.filter((c) => {
    if (typeFilter && c.type !== typeFilter) return false;
    if (catFilter && c.category !== catFilter) return false;
    if (diffFilter && c.difficulty !== diffFilter) return false;
    return true;
  });

  const dailyChallenges = filtered.filter((c) => c.type === "daily");
  const weeklyChallenges = filtered.filter((c) => c.type === "weekly");

  const earnedCount = achievements.filter((a) => a.earned).length;

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {/* ── Header ── */}
        <PageHeader
          eyebrow="Compete · Improve · Rise"
          title="Peer Challenge Arena"
        />

        {/* ── Tab navigation ── */}
        <nav
          aria-label="Arena sections"
          className="mt-6 flex items-center gap-0.5 border-b border-border overflow-x-auto"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {tab.label}
                {tab.id === "achievements" && earnedCount > 0 && (
                  <span className="tnum ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    {earnedCount}
                  </span>
                )}
                {tab.id === "history" && histTotal > 0 && (
                  <span className="tnum ml-1 text-xs text-muted-foreground">
                    {histTotal}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ── Tab content ── */}
        <div className="mt-8">
          {/* ── Challenges tab ── */}
          {activeTab === "challenges" && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-muted/30 p-3">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Filter className="size-3.5" aria-hidden /> Filter
                </span>
                <FilterPill
                  options={TYPE_OPTIONS}
                  value={typeFilter}
                  onChange={setTypeFilter}
                />
                <div className="h-4 w-px bg-border hidden sm:block" />
                <FilterPill
                  options={CATEGORY_OPTIONS}
                  value={catFilter}
                  onChange={setCatFilter}
                />
                <div className="h-4 w-px bg-border hidden sm:block" />
                <FilterPill
                  options={DIFFICULTY_OPTIONS}
                  value={diffFilter}
                  onChange={setDiffFilter}
                />
                {(typeFilter || catFilter || diffFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setTypeFilter("");
                      setCatFilter("");
                      setDiffFilter("");
                    }}
                    className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RotateCcw className="size-3" />
                    Clear
                  </button>
                )}
              </div>

              {chalLoading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-56 rounded-xl" />
                  ))}
                </div>
              ) : chalError ? (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
                  <p className="text-sm text-destructive">{chalError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={refetchChal}
                  >
                    Retry
                  </Button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <Swords className="mx-auto mb-3 size-10 opacity-40" />
                  <p className="text-sm font-medium">No challenges match your filters</p>
                  <p className="mt-1 text-xs">Try adjusting the filters above</p>
                </div>
              ) : (
                <>
                  {/* Daily */}
                  {dailyChallenges.length > 0 && (
                    <div className="space-y-3">
                      <SectionHeader
                        title="Daily Challenges"
                        description="Refresh every day at midnight UTC"
                      />
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {dailyChallenges.map((c) => (
                          <ChallengeCard key={c._id} challenge={c} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Weekly */}
                  {weeklyChallenges.length > 0 && (
                    <div className="space-y-3">
                      <SectionHeader
                        title="Weekly Challenges"
                        description="Reset every Sunday — worth more points"
                      />
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {weeklyChallenges.map((c) => (
                          <ChallengeCard key={c._id} challenge={c} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Leaderboard tab ── */}
          {activeTab === "leaderboard" && (
            <div className="mx-auto max-w-2xl">
              <SectionHeader
                title="Global Leaderboard"
                description="Real scores from all users · Updated after every challenge"
              />
              <div className="mt-4">
                <Leaderboard
                  rows={leaderboard}
                  currentUser={currentUser}
                  loading={lbLoading}
                  error={lbError}
                />
              </div>
            </div>
          )}

          {/* ── Stats tab ── */}
          {activeTab === "stats" && (
            <div className="mx-auto max-w-2xl space-y-4">
              <SectionHeader
                title="My Arena Stats"
                description="Your performance across all challenges"
              />
              <UserArenaStatsPanel
                profile={
                  profile
                    ? {
                        rank: rank ?? null,
                        totalPoints: profile.totalPoints,
                        totalCompleted: profile.totalCompleted,
                        currentStreak: profile.currentStreak,
                        longestStreak: profile.longestStreak,
                        achievementCount: profile.achievementCount,
                      }
                    : null
                }
                rank={rank}
                loading={profLoading}
              />
            </div>
          )}

          {/* ── Achievements tab ── */}
          {activeTab === "achievements" && (
            <div className="space-y-4">
              <SectionHeader
                title="Achievements"
                description={`${earnedCount} of ${achievements.length} unlocked`}
              />
              {achLoading ? (
                <div className="flex flex-wrap gap-3">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <Skeleton key={i} className="size-24 rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {/* Show earned first, then locked */}
                  {[
                    ...achievements.filter((a) => a.earned),
                    ...achievements.filter((a) => !a.earned),
                  ].map((a) => (
                    <AchievementBadge key={a.id} achievement={a} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── History tab ── */}
          {activeTab === "history" && (
            <div className="mx-auto max-w-3xl space-y-4">
              <SectionHeader
                title="Challenge History"
                description={`${histTotal} completed challenge${histTotal !== 1 ? "s" : ""}`}
              />
              {histLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-lg" />
                  ))}
                </div>
              ) : history.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <ListChecks className="mx-auto mb-3 size-10 opacity-40" />
                  <p className="text-sm font-medium">No completed challenges yet</p>
                  <p className="mt-1 text-xs">
                    Start a challenge to see your history here
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border">
                  {history.map((item) => (
                    <HistoryRow key={item._id} item={item} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
