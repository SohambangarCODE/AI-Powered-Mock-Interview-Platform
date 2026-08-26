import {
  DIFFICULTY_ORDER,
  difficultyMeta,
  scoreTone,
  type ProgressionPoint,
} from "@/lib/interview";

// Geometry, in viewBox units. The SVG scales to its container, so these are
// relative rather than absolute pixels.
const PAD_L = 62;
const PAD_R = 18;
const PAD_T = 16;
const PAD_B = 34;
const STEP = 56;
const ROW = 36;

const yFor = (rank: number) => PAD_T + (2 - rank) * ROW;

/**
 * Step chart of how the difficulty moved across the interview.
 * x = question index, y = easy/medium/hard, each dot tinted by that answer's score.
 */
export default function DifficultyProgression({
  points,
}: {
  points: ProgressionPoint[];
}) {
  if (!points.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No answered questions to chart.
      </p>
    );
  }

  const n = points.length;
  const width = PAD_L + Math.max(n - 1, 1) * STEP + PAD_R;
  const height = PAD_T + 2 * ROW + PAD_B;

  const xFor = (i: number) => (n === 1 ? PAD_L + STEP / 2 : PAD_L + i * STEP);
  const ranks = points.map((p) => difficultyMeta(p.difficulty).rank);

  // Right-angle steps rather than a smooth curve: the difficulty changes
  // between questions, it doesn't drift during one.
  let path = `M ${xFor(0)} ${yFor(ranks[0])}`;
  for (let i = 1; i < n; i++) {
    const midX = (xFor(i - 1) + xFor(i)) / 2;
    path +=
      ` L ${midX} ${yFor(ranks[i - 1])}` +
      ` L ${midX} ${yFor(ranks[i])}` +
      ` L ${xFor(i)} ${yFor(ranks[i])}`;
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[320px]"
        style={{ maxWidth: `${Math.max(width, 320)}px` }}
        role="img"
        aria-label={`Difficulty progression across ${n} questions`}
      >
        {/* Difficulty lanes */}
        {[...DIFFICULTY_ORDER].reverse().map((level) => {
          const meta = difficultyMeta(level);
          const y = yFor(meta.rank);
          return (
            <g key={level}>
              <line
                x1={PAD_L - 8}
                y1={y}
                x2={width - PAD_R}
                y2={y}
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="3 4"
                className="text-border"
              />
              <text
                x={PAD_L - 16}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[11px] font-medium"
              >
                {meta.label}
              </text>
            </g>
          );
        })}

        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-primary/45"
        />

        {points.map((p, i) => {
          const tone = scoreTone(p.score);
          const cx = xFor(i);
          const cy = yFor(ranks[i]);
          return (
            <g key={`${p.index}-${i}`}>
              <circle
                cx={cx}
                cy={cy}
                r="7"
                fill={p.skipped ? "transparent" : tone.hex}
                stroke={p.skipped ? "currentColor" : tone.hex}
                strokeWidth="2"
                strokeDasharray={p.skipped ? "3 2" : undefined}
                className={p.skipped ? "text-muted-foreground" : ""}
              />
              {!p.skipped && p.score !== null && (
                <text
                  x={cx}
                  y={cy - 12}
                  textAnchor="middle"
                  className="fill-foreground text-[10px] font-semibold"
                >
                  {p.score}
                </text>
              )}
              <text
                x={cx}
                y={height - PAD_B + 20}
                textAnchor="middle"
                className="fill-muted-foreground text-[11px] font-semibold"
              >
                Q{p.index}
              </text>
              <title>
                {`Q${p.index} · ${p.topic} · ${difficultyMeta(p.difficulty).label} · ${
                  p.skipped ? "skipped" : `${p.score}/10`
                }`}
              </title>
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-success" /> 8–10
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-primary" /> 5–7
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-warning" /> 3–4
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-destructive" /> 0–2
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border-2 border-dashed border-muted-foreground" />
          skipped
        </span>
      </div>
    </div>
  );
}
