import {
  BookOpen,
  ChevronRight,
  CircleCheck,
  CircleHelp,
  Clock,
  Flame,
  SkipForward,
  Sparkles,
  Sprout,
  Star,
  Target,
  TrendingUp,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import DifficultyProgression from "@/components/interview/DifficultyProgression";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import {
  difficultyMeta,
  domainIcon,
  formatMinutes,
  overallTone,
  scoreTone,
  type InterviewReport as Report,
  type QuestionPerformance,
  type TopicScore,
} from "@/lib/interview";
import { cn } from "@/lib/utils";

interface Props {
  report: Report;
  domain: string;
  /** Session length in minutes, when known. */
  durationMinutes?: number;
  endReason?: string;
}

export default function InterviewReport({
  report,
  domain,
  durationMinutes,
  endReason,
}: Props) {
  const tone = overallTone(report.overallScore);
  const finalDiff = difficultyMeta(report.finalDifficulty);
  const DomainIcon = domainIcon(domain);
  // Rank maps to how far the engine escalated: eased back, held, or pushed hard.
  const RankIcon =
    finalDiff.rank === 2 ? Flame : finalDiff.rank === 1 ? TrendingUp : Sprout;

  return (
    <div className="space-y-4">
      {/* ── Headline score ─────────────────────────────── */}
      <Card className="items-center gap-0 p-8 text-center">
        <Badge variant="neutral">
          <DomainIcon aria-hidden />
          {domain} · adaptive session
        </Badge>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
          Interview Report
        </h2>

        <div className="mt-7">
          <ScoreRing score={report.overallScore} />
        </div>

        <p className={cn("mt-6 text-sm font-medium", tone.color)}>{tone.text}</p>
        {endReason && (
          <p className="mt-2 text-xs text-muted-foreground">{endReason}</p>
        )}
      </Card>

      {/* ── Stats ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="Questions"
          value={report.totalQuestions}
          icon={CircleHelp}
        />
        <StatCard
          label="Answered"
          value={report.answeredCount}
          icon={CircleCheck}
          tone="success"
        />
        <StatCard
          label="Skipped"
          value={report.skippedCount}
          icon={SkipForward}
          tone={report.skippedCount > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Avg answer"
          value={`${report.averageAnswerScore}/10`}
          icon={Star}
          tone="primary"
        />
        <StatCard
          label="Ended at"
          value={finalDiff.label}
          icon={RankIcon}
        />
        <StatCard
          label="Duration"
          value={
            typeof durationMinutes === "number"
              ? formatMinutes(durationMinutes)
              : "—"
          }
          icon={Clock}
        />
      </div>

      {/* ── How the score was reached ──────────────────── */}
      <Card className="gap-0 p-6">
        <p className="text-base font-semibold text-foreground">
          How this score was calculated
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Derived from your per-answer scores — nothing estimated.
        </p>

        <div className="mt-5 space-y-4">
          <ScoreLine
            label="Answer quality"
            detail={`avg ${report.averageAnswerScore}/10 across ${report.answeredCount} answered`}
            value={`+${report.answerQuality}`}
            pct={report.answerQuality}
            barClass="bg-success"
          />
          <ScoreLine
            label="Skip penalty"
            detail={
              report.skippedCount
                ? `${report.skippedCount} of ${report.totalQuestions} questions skipped`
                : "no questions skipped"
            }
            value={report.skipPenalty ? `−${report.skipPenalty}` : "0"}
            pct={report.skipPenalty}
            barClass="bg-warning"
          />
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm font-medium text-foreground">
            Overall score
          </span>
          <span className={cn("tnum text-lg font-semibold", tone.color)}>
            {report.overallScore}
            <span className="text-xs font-medium text-muted-foreground">
              /100
            </span>
          </span>
        </div>
      </Card>

      {/* ── Difficulty progression ─────────────────────── */}
      <Card className="gap-0 p-6">
        <p className="text-base font-semibold text-foreground">
          Difficulty progression
        </p>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">
          The engine raised difficulty after strong answers (8+) and eased it
          after weak ones (under 5).
        </p>

        <DifficultyProgression points={report.difficultyProgression} />

        {report.progressionSummary && (
          <p className="mt-5 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
            {report.progressionSummary}
          </p>
        )}
      </Card>

      {/* ── Strong vs weak areas ───────────────────────── */}
      {(report.strongAreas.length > 0 ||
        report.weakAreas.length > 0 ||
        report.topicScores.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          <TopicPanel
            title="Strong areas"
            icon={TrendingUp}
            emptyText="No topic averaged 7 or above this session."
            accent="text-success"
            topics={report.strongAreas}
          />
          <TopicPanel
            title="Needs work"
            icon={Target}
            emptyText="Nothing fell below 5 — good consistency."
            accent="text-warning-foreground"
            topics={report.weakAreas}
          />
        </div>
      )}

      {/* ── Narrative ──────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <BulletPanel
          title="What went well"
          icon={Sparkles}
          items={report.strengths}
          dotClass="bg-success"
        />
        <BulletPanel
          title="What to improve"
          icon={TriangleAlert}
          items={report.weaknesses}
          dotClass="bg-warning"
        />
      </div>

      {/* ── Recommendations ───────────────────────────── */}
      {report.recommendations.length > 0 && (
        <Card className="gap-0 p-6">
          <p className="mb-5 flex items-center gap-2 text-base font-semibold text-foreground">
            <BookOpen className="size-4 text-muted-foreground" aria-hidden />
            Recommended next steps
          </p>
          <ol className="space-y-3">
            {report.recommendations.map((rec, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="tnum flex size-5 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-[11px] font-semibold text-primary">
                  {i + 1}
                </span>
                <span className="leading-relaxed text-muted-foreground">
                  {rec}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* ── Question-by-question ───────────────────────── */}
      {report.questionPerformance.length > 0 && (
        <Card className="gap-0 p-6">
          <p className="text-base font-semibold text-foreground">
            Question-wise performance
          </p>
          <p className="mt-1 mb-5 text-sm text-muted-foreground">
            Every question, what you said, and how it scored.
          </p>
          <div className="space-y-3">
            {report.questionPerformance.map((turn) => (
              <QuestionCard key={turn.index} turn={turn} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Pieces ───────────────────────────────────────────────

export function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <div className="relative mx-auto size-40">
      <svg className="size-full -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-border"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={overallTone(score).hex}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tnum text-4xl font-semibold tracking-tight text-foreground">
          {score}
        </span>
        <span className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Score
        </span>
      </div>
    </div>
  );
}

function ScoreLine({
  label,
  detail,
  value,
  pct,
  barClass,
}: {
  label: string;
  detail: string;
  value: string;
  pct: number;
  barClass: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="tnum text-sm font-semibold text-foreground">
          {value}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className={cn("h-full rounded-full transition-all duration-1000", barClass)}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function TopicPanel({
  title,
  icon: Icon,
  topics,
  emptyText,
  accent,
}: {
  title: string;
  icon: LucideIcon;
  topics: TopicScore[];
  emptyText: string;
  /** Tailwind text colour for the per-topic score, matching the panel's intent. */
  accent: string;
}) {
  return (
    <Card className="gap-0 p-6">
      <p className="mb-5 flex items-center gap-2 text-base font-semibold text-foreground">
        <Icon className="size-4 text-muted-foreground" aria-hidden />
        {title}
      </p>
      {topics.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="space-y-4">
          {topics.map((t) => {
            const tone = scoreTone(t.score);
            return (
              <div key={t.topic}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground">
                    {t.topic}
                  </span>
                  <span className={cn("tnum text-sm font-semibold", accent)}>
                    {t.score}/10
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      tone.bar,
                    )}
                    style={{ width: `${(t.score / 10) * 100}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {t.questions} question{t.questions === 1 ? "" : "s"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function BulletPanel({
  title,
  icon: Icon,
  items,
  dotClass,
}: {
  title: string;
  icon: LucideIcon;
  items: string[];
  dotClass: string;
}) {
  return (
    <Card className="gap-0 p-6">
      <p className="mb-5 flex items-center gap-2 text-base font-semibold text-foreground">
        <Icon className="size-4 text-muted-foreground" aria-hidden />
        {title}
      </p>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-sm">
            <span
              aria-hidden
              className={cn("mt-[7px] size-1.5 shrink-0 rounded-full", dotClass)}
            />
            <span className="leading-relaxed text-muted-foreground">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function QuestionCard({ turn }: { turn: QuestionPerformance }) {
  const tone = scoreTone(turn.score);
  const diff = difficultyMeta(turn.difficulty);

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="tnum text-xs font-semibold text-muted-foreground">
            Q{turn.index}
          </span>
          <Badge variant="outline" size="sm" className={diff.badge}>
            {diff.label}
          </Badge>
          <Badge variant="outline" size="sm" className="max-w-[160px]">
            <span className="truncate">{turn.topic}</span>
          </Badge>
          {turn.skipped && (
            <Badge variant="neutral" size="sm">
              Skipped
            </Badge>
          )}
        </div>
        <Badge
          variant="outline"
          size="sm"
          className={cn("tnum shrink-0 font-semibold", tone.badge)}
        >
          {turn.skipped || turn.score === null ? "—" : `${turn.score}/10`}
        </Badge>
      </div>

      <p className="text-sm leading-relaxed font-medium text-foreground">
        {turn.question}
      </p>

      {!turn.skipped && turn.score !== null && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-border">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-1000",
              tone.bar,
            )}
            style={{ width: `${(turn.score / 10) * 100}%` }}
          />
        </div>
      )}

      {turn.answer && (
        <details className="group mt-3">
          <summary className="flex list-none cursor-pointer items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ChevronRight
              className="size-3.5 transition-transform group-open:rotate-90"
              aria-hidden
            />
            Your answer
          </summary>
          <p className="mt-2 border-l-2 border-border pl-3 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {turn.answer}
          </p>
        </details>
      )}

      {turn.feedback && (
        <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Feedback: </span>
          {turn.feedback}
        </p>
      )}
    </div>
  );
}
