import {
  CASPER_SEAM,
  casperSeries,
  casperSimple,
} from "../../_lib/portal-production-data";
import {
  LAST,
  SIMPLE,
  SIMPLE_ACTUAL,
  SIMPLE_FORECAST,
  simpleX,
  simpleY,
} from "../../_lib/production-chart";

/**
 * THE ESSENTIALS CHART — v43 · OW-10.
 *
 * Ryan's note on the deep-dive chart is the brief for this one: "the charts
 * assume knowledge". So this is the same oil series, read once: ONE line, no
 * second axis, no brush, no tooltip, and — the part that does the work — its
 * axes labelled in WORDS rather than numbers. "its best month" and "nothing"
 * are the two reference lines, because a reader who does not know what 25,000
 * bbl/mo means still knows what a peak is.
 *
 * A SERVER COMPONENT, and it ships no JavaScript. Nothing here responds to the
 * reader, so there is nothing to hydrate — the whole chart is deterministic
 * geometry over a constant series, computed at build time in
 * `production-chart.ts`.
 *
 * IT ANSWERS THE QUESTION ON THE CHART ITSELF. "busiest early on" and "a long,
 * slow tail" are annotations, not decoration: the point of the page is that a
 * declining line is normal, and this chart says so where the reader is looking
 * instead of leaving them to infer it from a slope.
 */
export function CasperSimpleChart() {
  const { L, R, T, B } = SIMPLE;
  const { labels, oil, oilMax } = casperSeries;
  const seamX = simpleX(CASPER_SEAM);

  return (
    <svg
      id="pf2SimpleSvg"
      viewBox={`0 0 ${SIMPLE.W} ${SIMPLE.H}`}
      role="img"
      aria-label={casperSimple.chartAria}
    >
      {/* The estimate half, tinted so "reported" and "estimated" cannot be
          confused for one another. */}
      <rect
        x={seamX.toFixed(1)}
        y={T}
        width={(R - seamX).toFixed(1)}
        height={B - T}
        fill="#f4fdf9"
      />
      <line x1={L} y1={B} x2={R} y2={B} stroke="#cbd5e1" />

      {/* Two reference lines only, both named in words. */}
      <line
        x1={L}
        y1={simpleY(oilMax).toFixed(1)}
        x2={R}
        y2={simpleY(oilMax).toFixed(1)}
        stroke="#eef0f3"
      />
      <text
        x={L - 8}
        y={(simpleY(oilMax) + 4).toFixed(1)}
        fontSize="10.5"
        fill="#6b7280"
        textAnchor="end"
      >
        {casperSimple.axisTop}
      </text>
      <text x={L - 8} y={B + 4} fontSize="10.5" fill="#6b7280" textAnchor="end">
        {casperSimple.axisZero}
      </text>

      <polyline
        points={SIMPLE_ACTUAL}
        fill="none"
        stroke="#2e8f6d"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polyline
        points={SIMPLE_FORECAST}
        fill="none"
        stroke="#2e8f6d"
        strokeWidth="3"
        strokeDasharray="7 6"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity=".8"
      />

      {/* The seam, named in words on both sides of itself. */}
      <line
        x1={seamX.toFixed(1)}
        y1="24"
        x2={seamX.toFixed(1)}
        y2={B}
        stroke="#475569"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <text
        x={(seamX - 8).toFixed(1)}
        y="20"
        fontSize="11"
        fontWeight="700"
        fill="#475569"
        textAnchor="end"
      >
        {casperSimple.seamBefore}
      </text>
      <text
        x={(seamX + 8).toFixed(1)}
        y="20"
        fontSize="11"
        fontWeight="700"
        fill="#2e8f6d"
        textAnchor="start"
      >
        {casperSimple.seamAfter}
      </text>

      {/* The one annotation that carries the meaning. It marks index 1, the
          peak month, not index 0 — the first posted month was a partial one. */}
      <circle
        cx={simpleX(1).toFixed(1)}
        cy={simpleY(oil[1]).toFixed(1)}
        r="4"
        fill="#2e8f6d"
      />
      <text
        x={(simpleX(1) + 10).toFixed(1)}
        y={(simpleY(oil[1]) + 4).toFixed(1)}
        fontSize="11"
        fontWeight="700"
        fill="#04231a"
      >
        {casperSimple.annotationEarly}
      </text>
      <text
        x={R - 4}
        y={(simpleY(oil[LAST]) - 10).toFixed(1)}
        fontSize="11"
        fontWeight="700"
        fill="#6b7280"
        textAnchor="end"
      >
        {casperSimple.annotationTail}
      </text>

      <text x={L} y={B + 20} fontSize="11" fill="#6b7280" textAnchor="start">
        {labels[0]}
      </text>
      <text
        x={seamX.toFixed(1)}
        y={B + 20}
        fontSize="11"
        fill="#6b7280"
        textAnchor="middle"
      >
        {labels[CASPER_SEAM]}
      </text>
      <text x={R} y={B + 20} fontSize="11" fill="#6b7280" textAnchor="end">
        {labels[LAST]}
      </text>
      <text
        x={((L + R) / 2).toFixed(1)}
        y={B + 42}
        fontSize="11"
        fill="#6b7280"
        textAnchor="middle"
      >
        {casperSimple.xCaption}
      </text>
    </svg>
  );
}
