import { formatDollars } from "../../_lib/lease-format";
import { monthlyIncome } from "../../_lib/lease-financials";

/**
 * OWNER-SHARE MONTHLY INCOME — twelve months, as an area chart.
 *
 * ── AN INLINE SVG, BUILT ON THE SERVER ──
 *
 * The prototype drew this by concatenating an SVG string into `innerHTML` on tab
 * activation, which meant the chart did not exist until a click, did not exist
 * at all without JavaScript, and could not be read by anything indexing or
 * printing the page. It is the same maths — the geometry constants below are its
 * viewBox, margins and gridline steps — evaluated during render instead. No
 * charting library, no client component, no `useEffect`.
 *
 * ── THE GEOMETRY ──
 *
 * `viewBox` gives one coordinate system that scales to any width; `X`/`Y` map a
 * point index and a dollar value into it. `Y_MAX` is the largest month plus 20%
 * headroom so the peak never touches the top edge.
 *
 * ── WHAT THE MARKS SAY ──
 *
 * The peak month is ringed in gold and every point gets a dot, because the story
 * of this series is one bump (March, on the oil spike) inside a decline — and a
 * bare line leaves the reader to find that themselves. The gradient fill is the
 * design's; it carries the eye along the trend without adding a second colour.
 *
 * ── ACCESSIBILITY ──
 *
 * `role="img"` with a real `aria-label` naming the range and direction, because
 * an unlabelled SVG is announced as nothing at all. The table in the Monthly
 * Reports tab carries the same figures row by row for anyone who needs the
 * numbers rather than the shape.
 */

const VIEW = { width: 740, height: 220 };
const PLOT = { left: 50, right: 726, top: 26, bottom: 182 };
const GRIDLINES = [0, 100, 200];
const HEADROOM = 1.2;

export function IncomeTrendChart() {
  const values = monthlyIncome.map((point) => point.share);
  const yMax = Math.max(...values) * HEADROOM;
  const peak = Math.max(...values);

  const x = (index: number) =>
    PLOT.left +
    (index * (PLOT.right - PLOT.left)) / (monthlyIncome.length - 1);
  const y = (value: number) =>
    PLOT.bottom - (value / yMax) * (PLOT.bottom - PLOT.top);

  const line = monthlyIncome
    .map((point, index) => `${x(index).toFixed(1)},${y(point.share).toFixed(1)}`)
    .join(" ");
  const area = `${PLOT.left},${PLOT.bottom} ${line} ${PLOT.right},${PLOT.bottom}`;

  return (
    <svg
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      role="img"
      aria-label={`Owner-share monthly income, derived, from ${
        monthlyIncome[0].label
      } to ${monthlyIncome[monthlyIncome.length - 1].label}. Peaks at ${formatDollars(
        peak,
      )} in March 2026 and eases to ${formatDollars(
        values[values.length - 1],
      )}.`}
      className="block h-auto w-full"
    >
      <defs>
        <linearGradient id="mv-income-fill" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor="var(--color-mv-green)"
            stopOpacity="0.42"
          />
          <stop
            offset="100%"
            stopColor="var(--color-mv-green)"
            stopOpacity="0.04"
          />
        </linearGradient>
      </defs>

      {GRIDLINES.filter((value) => value <= yMax).map((value) => (
        <g key={value}>
          <line
            x1={PLOT.left}
            y1={y(value)}
            x2={PLOT.right}
            y2={y(value)}
            strokeWidth={1}
            className={
              value === 0 ? "stroke-mv-line-strong" : "stroke-mv-line-soft"
            }
          />
          <text
            x={PLOT.left - 6}
            y={y(value) + 3}
            fontSize={9}
            textAnchor="end"
            className="fill-mv-muted"
          >
            ${value}
          </text>
        </g>
      ))}

      <polygon points={area} fill="url(#mv-income-fill)" />
      <polyline
        points={line}
        fill="none"
        strokeWidth={3}
        strokeLinejoin="round"
        strokeLinecap="round"
        className="stroke-mv-green-deep"
      />

      {monthlyIncome.map((point, index) => {
        const isPeak = point.share === peak;
        return (
          <g key={point.label}>
            {isPeak && (
              <circle
                cx={x(index)}
                cy={y(point.share)}
                r={7.5}
                fill="none"
                strokeWidth={1.5}
                className="stroke-mv-portal-gold"
              />
            )}
            <circle
              cx={x(index)}
              cy={y(point.share)}
              r={isPeak ? 4 : 3.2}
              strokeWidth={1.5}
              className={`stroke-mv-card ${
                isPeak ? "fill-mv-portal-gold" : "fill-mv-green-deep"
              }`}
            />
            {/* Every month is labelled, not every other one: twelve labels fit
                at 8.5px and a reader should not have to count columns to work
                out which month a dot is. */}
            <text
              x={x(index)}
              y={PLOT.bottom + 16}
              fontSize={8.5}
              textAnchor="middle"
              className="fill-mv-muted"
            >
              {point.label.slice(0, 3)}
            </text>
            <text
              x={x(index)}
              y={y(point.share) - 11}
              fontSize={8.5}
              fontWeight={700}
              textAnchor="middle"
              className="fill-mv-slate"
            >
              {formatDollars(point.share)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
