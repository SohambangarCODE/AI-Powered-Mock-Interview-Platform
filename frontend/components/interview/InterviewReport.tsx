import { Card } from "@/components/ui/card";
import DifficultyProgression from "@/components/interview/DifficultyProgression";
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

  return (
    <div className="space-y-5">
      {/* ── Headline score ─────────────────────────────── */}
      <Card className="p-8 border border-border/60 text-center">
        <div className="text-3xl mb-3">🎉</div>
        <h2 className="text-2xl font-black text-foreground mb-1">
          Interview Report
        </h2>
        <p className="text-sm text-muted-foreground mb-8">
          {domainIcon(domain)} {domain} · adaptive session
        </p>

        <ScoreRing score={report.overallScore} />

        <p className={`text-sm font-semibold mt-6 ${tone.color}`}>{tone.text}</p>
        {endReason && (
          <p className="text-xs text-muted-foreground mt-2">{endReason}</p>
        )}
      </Card>

      {/* ── Stats ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat icon="❓" label="Questions" value={report.totalQuestions} />
        <Stat icon="✅" label="Answered" value={report.answeredCount} />
        <Stat icon="⏭" label="Skipped" value={report.skippedCount} />
        <Stat
          icon="⭐"
          label="Avg answer"
          value={`${report.averageAnswerScore}/10`}
        />
        <Stat
          icon={finalDiff.rank === 2 ? "🔥" : finalDiff.rank === 1 ? "📈" : "🌱"}
          label="Ended at"
          value={finalDiff.label}
        />
        <Stat
          icon="⏱"
          label="Duration"
          value={
            typeof durationMinutes === "number"
              ? formatMinutes(durationMinutes)
              : "—"
          }
        />
      </div>

      {/* ── How the score was reached ──────────────────── */}
      <Card className="p-6 border border-border/50">
        <p className="text-sm font-semibold text-foreground mb-1">
          How this score was calculated
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Derived from your per-answer scores — nothing estimated.
        </p>

        <div className="space-y-3">
          <ScoreLine
            label="Answer quality"
            detail={`avg ${report.averageAnswerScore}/10 across ${report.answeredCount} answered`}
            value={`+${report.answerQuality}`}
            pct={report.answerQuality}
            barClass="bg-green-500"
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
            barClass="bg-orange-500"
          />
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/60">
          <span className="text-sm font-semibold text-foreground">
            Overall score
          </span>
          <span className={`text-lg font-black ${tone.color}`}>
            {report.overallScore}
            <span className="text-xs text-muted-foreground font-medium">
              /100
            </span>
          </span>
        </div>
      </Card>

      {/* ── Difficulty progression ─────────────────────── */}
      <Card className="p-6 border border-border/50">
        <p className="text-sm font-semibold text-foreground mb-1">
          Difficulty progression
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          The engine raised difficulty after strong answers (8+) and eased it
          after weak ones (under 5).
        </p>

        <DifficultyProgression points={report.difficultyProgression} />

        {report.progressionSummary && (
          <p className="text-sm text-muted-foreground leading-relaxed mt-4 pt-4 border-t border-border/60">
            {report.progressionSummary}
          </p>
        )}
      </Card>

      {/* ── Strong vs weak areas ───────────────────────── */}
      {(report.strongAreas.length > 0 ||
        report.weakAreas.length > 0 ||
        report.topicScores.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-3">
          <TopicPanel
            title="Strong areas"
            icon="💪"
            emptyText="No topic averaged 7 or above this session."
            accent="text-green-600 dark:text-green-400"
            topics={report.strongAreas}
          />
          <TopicPanel
            title="Needs work"
            icon="🎯"
            emptyText="Nothing fell below 5 — good consistency."
            accent="text-orange-600 dark:text-orange-400"
            topics={report.weakAreas}
          />
        </div>
      )}

      {/* ── Narrative ──────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-3">
        <BulletPanel
          title="What went well"
          icon="✨"
          items={report.strengths}
          dotClass="bg-green-500"
        />
        <BulletPanel
          title="What to improve"
          icon="⚠️"
          items={report.weaknesses}
          dotClass="bg-orange-500"
        />
      </div>

      {/* ── Recommendations ───────────────────────────── */}
      {report.recommendations.length > 0 && (
        <Card className="p-6 border border-border/50">
          <p className="text-sm font-semibold text-foreground mb-4">
            📚 Recommended next steps
          </p>
          <ol className="space-y-3">
            {report.recommendations.map((rec, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-muted-foreground leading-relaxed">
                  {rec}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* ── Question-by-question ───────────────────────── */}
      {report.questionPerformance.length > 0 && (
        <Card className="p-6 border border-border/50">
          <p className="text-sm font-semibold text-foreground mb-1">
            Question-wise performance
          </p>
          <p className="text-xs text-muted-foreground mb-4">
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
    <div className="relative w-40 h-40 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
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
        <span className="text-4xl font-black text-foreground">{score}</span>
        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">
          Score
        </span>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string | number;
}) {
  return (
    <Card className="p-4 text-center border border-border/50">
      <div className="text-lg mb-1">{icon}</div>
      <p className="text-base font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </Card>
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
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="text-xs font-bold text-foreground tabular-nums">
          {value}
        </span>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full ${barClass} rounded-full transition-all duration-1000`}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">{detail}</p>
    </div>
  );
}

function TopicPanel({
  title,
  icon,
  topics,
  emptyText,
  accent,
}: {
  title: string;
  icon: string;
  topics: TopicScore[];
  emptyText: string;
  accent: string;
}) {
  return (
    <Card className="p-6 border border-border/50">
      <p className="text-sm font-semibold text-foreground mb-4">
        {icon} {title}
      </p>
      {topics.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {topics.map((t) => {
            const tone = scoreTone(t.score);
            return (
              <div key={t.topic}>
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-xs font-medium text-foreground truncate">
                    {t.topic}
                  </span>
                  <span className={`text-xs font-bold tabular-nums ${accent}`}>
                    {t.score}/10
                  </span>
                </div>
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className={`h-full ${tone.bar} rounded-full transition-all duration-1000`}
                    style={{ width: `${(t.score / 10) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
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
  icon,
  items,
  dotClass,
}: {
  title: string;
  icon: string;
  items: string[];
  dotClass: string;
}) {
  return (
    <Card className="p-6 border border-border/50">
      <p className="text-sm font-semibold text-foreground mb-4">
        {icon} {title}
      </p>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-sm">
            <span
              className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${dotClass} mt-[7px]`}
            />
            <span className="text-muted-foreground leading-relaxed">
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
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="text-xs font-bold text-muted-foreground">
            Q{turn.index}
          </span>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${diff.badge}`}
          >
            {diff.label}
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-background text-muted-foreground font-medium truncate max-w-[160px]">
            {turn.topic}
          </span>
          {turn.skipped && (
            <span className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground font-medium">
              Skipped
            </span>
          )}
        </div>
        <span
          className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full border font-bold tabular-nums ${tone.badge}`}
        >
          {turn.skipped || turn.score === null ? "—" : `${turn.score}/10`}
        </span>
      </div>

      <p className="text-sm font-medium text-foreground leading-relaxed">
        {turn.question}
      </p>

      {!turn.skipped && turn.score !== null && (
        <div className="h-1 bg-border rounded-full overflow-hidden mt-3">
          <div
            className={`h-full ${tone.bar} rounded-full transition-all duration-1000`}
            style={{ width: `${(turn.score / 10) * 100}%` }}
          />
        </div>
      )}

      {turn.answer && (
        <details className="group mt-3">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground transition-colors list-none flex items-center gap-1">
            <span className="inline-block transition-transform group-open:rotate-90">
              ▸
            </span>
            Your answer
          </summary>
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap mt-2 pl-3 border-l-2 border-border">
            {turn.answer}
          </p>
        </details>
      )}

      {turn.feedback && (
        <p className="text-xs text-muted-foreground leading-relaxed mt-3 pt-3 border-t border-border/60">
          <span className="font-semibold text-foreground">Feedback: </span>
          {turn.feedback}
        </p>
      )}
    </div>
  );
}
