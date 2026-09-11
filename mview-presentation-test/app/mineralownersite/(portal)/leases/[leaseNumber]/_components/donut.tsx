/**
 * PRODUCED AGAINST STILL AHEAD, AS A RING.
 *
 * Two slices of one whole, read once — the one job a ring does better than a
 * bar. The figure is printed in the middle so nobody has to estimate it off an
 * arc, and both quantities are listed beside it so the ring never has to be
 * measured at all.
 *
 * `stroke-dasharray` ON A CIRCLE IS THE WHOLE MECHANISM: the circumference is
 * computed, the produced share becomes the dash and the remainder the gap, and
 * the circle is rotated so it starts at twelve o'clock. No path maths, no
 * library, and it scales with the viewBox.
 *
 * Shared by the lease report and the reservoir report, which ask the same
 * question of different scopes.
 */

const RING = {
  gas: {
    strong: "stroke-mv-green-deep",
    pale: "stroke-mv-green-deep/25",
    dot: "bg-mv-green-deep",
  },
  oil: {
    strong: "stroke-mv-sand",
    pale: "stroke-mv-sand/25",
    dot: "bg-mv-sand",
  },
} as const;

export type DonutTone = keyof typeof RING;

export function Donut({
  unit,
  tone,
  percent,
  produced,
  ahead,
  note,
}: {
  /** "Gas · MCF". */
  unit: string;
  tone: DonutTone;
  percent: number;
  produced: string;
  ahead: string;
  note: string;
}) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const filled = (percent / 100) * circumference;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-center gap-6">
        <span className="flex items-center gap-1.5 text-[11px] font-bold">
          <span
            aria-hidden="true"
            className={`inline-block h-2 w-2 rounded-full ${RING[tone].dot}`}
          />
          {unit}
        </span>

        <svg
          viewBox="0 0 120 120"
          className="h-[130px] w-[130px]"
          role="img"
          aria-label={`${percent.toFixed(1)}% produced`}
        >
          <circle
            cx={60}
            cy={60}
            r={radius}
            fill="none"
            strokeWidth={16}
            className={RING[tone].pale}
          />
          <circle
            cx={60}
            cy={60}
            r={radius}
            fill="none"
            strokeWidth={16}
            strokeDasharray={`${filled} ${circumference - filled}`}
            transform="rotate(-90 60 60)"
            className={RING[tone].strong}
          />
          <text
            x={60}
            y={58}
            textAnchor="middle"
            className="fill-mv-ink text-[20px] font-bold"
          >
            {percent.toFixed(1)}%
          </text>
          <text
            x={60}
            y={74}
            textAnchor="middle"
            className="fill-mv-muted text-[9px] font-bold tracking-[0.1em] uppercase"
          >
            Produced
          </text>
        </svg>

        <dl className="space-y-2 text-[12px]">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`inline-block h-2 w-2 rounded-full ${RING[tone].dot}`}
            />
            <dt className="text-mv-slate">Produced</dt>
            <dd className="font-bold tabular-nums">{produced}</dd>
          </div>
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`inline-block h-2 w-2 rounded-full opacity-30 ${RING[tone].dot}`}
            />
            <dt className="text-mv-slate">Still ahead</dt>
            <dd className="font-bold tabular-nums">{ahead}</dd>
          </div>
        </dl>
      </div>

      <p className="mt-3 text-[11.5px] leading-[1.55] text-mv-muted">{note}</p>
    </div>
  );
}

/** The coloured dot the stat rows beside a ring use, so the two agree. */
export function DonutDot({ tone }: { tone: DonutTone }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-2 w-2 flex-none rounded-full ${RING[tone].dot}`}
    />
  );
}
