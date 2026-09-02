"use client";

import { useState } from "react";

import {
  CASPER_SEAM,
  casperMeta,
  casperPresets,
  casperSeries,
} from "../../_lib/portal-production-data";
import {
  CHART,
  CONTEXT_GAS,
  CONTEXT_OIL,
  LAST,
  MIN_WINDOW,
  chartFrame,
  clampLabel,
  fmt,
  points,
} from "../../_lib/production-chart";

/**
 * THE DEEP-DIVE CHART — Detailed and Professional (`.hide-s` on the wrapper in
 * the page, so Essentials and Ultra never render it).
 *
 * A CLIENT COMPONENT, because it is genuinely interactive: two brush handles,
 * four preset windows and a hover readout, each of which rescales or redraws
 * the plot. That is the whole reason this one island ships JavaScript when the
 * rest of the page does not.
 *
 * IT RENDERS DECLARATIVELY, NOT THROUGH `innerHTML`. The reference builds an
 * SVG string and assigns it to `#pf2Plot`, which means its chart does not exist
 * until `render()` runs — the markup ships an empty `<g>`. Rendering in JSX
 * instead means the SERVER already emits the complete chart at the default
 * window, so the first paint is the finished chart and hydration only attaches
 * the handlers. The geometry is the reference's, unchanged; only where it is
 * computed has moved.
 *
 * BOTH AXES RESCALE TO THE WINDOW, independently. That is deliberate in the
 * design and worth not "fixing": this lease's first month is twenty times its
 * last, so a fixed axis would flatten the entire tail into the baseline and the
 * decline — the thing the page exists to show — would be invisible. The axis
 * labels stay round because `niceAxis` picks the step, and the reader is told
 * which axis is which by colour and by the two rotated titles.
 *
 * THE SEAM IS THE ONE INDEX THAT MATTERS. `CASPER_SEAM` is the last POSTED
 * month; everything to its right is projection. Solid to the seam, dashed from
 * it, the zone behind the dashes tinted, and a labelled rule on it — four
 * separate signals for the same fact, because mistaking a projection for a
 * posting is the costly misreading on this page.
 */

/** The two range inputs sit on top of each other; this is their shared shape. */
const HANDLE_STYLE = { zIndex: 2 } as const;

export function CasperDetailChart() {
  const [window, setWindow] = useState<{ a: number; b: number }>({
    a: 0,
    b: LAST,
  });
  /** Which month the pointer is nearest, or `null` when it has left. */
  const [hover, setHover] = useState<number | null>(null);

  const { a, b } = window;
  const { L, R, T, B, W } = CHART;
  const frame = chartFrame(a, b);
  const { labels, oil, gas } = casperSeries;

  /* The brush's two handles clamp against each other rather than crossing —
     `MIN_WINDOW` months is the narrowest readable window. */
  function moveStart(raw: number) {
    const v = Math.max(0, Math.min(raw, window.b - MIN_WINDOW));
    setWindow({ a: v, b: window.b });
  }

  function moveEnd(raw: number) {
    const v = Math.min(LAST, Math.max(raw, window.a + MIN_WINDOW));
    setWindow({ a: window.a, b: v });
  }

  /* Nearest-point hover. The rect is read at event time, which is safe because
     the handler only fires when the chart is on screen. */
  function onMove(event: React.MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const px = ((event.clientX - rect.left) * W) / rect.width;
    if (px < L - 8 || px > R + 8) {
      setHover(null);
      return;
    }
    let idx = Math.round(a + ((px - L) * (b - a)) / (R - L));
    if (idx < a) idx = a;
    if (idx > b) idx = b;
    setHover(idx);
  }

  const showForecastZone = b > CASPER_SEAM;
  const seamVisible = CASPER_SEAM >= a && CASPER_SEAM <= b;
  const todayVisible = casperSeries.todayIdx >= a && casperSeries.todayIdx <= b;
  const forecastFlagVisible = b > CASPER_SEAM + 4;

  return (
    <>
      <svg
        id="pf2Svg"
        viewBox={`0 0 ${CHART.W} ${CHART.H}`}
        role="img"
        aria-label={casperMeta.chartAria}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* The plot. `#pf2Plot` keeps the reference's id so the route-scoped
            CSS and anyone reading both files can line them up. */}
        <g id="pf2Plot">
          {/* The forecast zone, tinted before anything is drawn over it. */}
          {showForecastZone ? (
            <rect
              x={frame.x(Math.max(a, CASPER_SEAM)).toFixed(1)}
              y={T}
              width={(R - frame.x(Math.max(a, CASPER_SEAM))).toFixed(1)}
              height={B - T}
              fill="#f4fdf9"
            />
          ) : null}

          {/* Gridlines on the OIL scale only — two sets of gridlines for two
              axes would read as a grid that means nothing. */}
          {frame.oilTicks.map((v) => (
            <line
              key={`grid-${v}`}
              x1={L}
              y1={frame.yOil(v).toFixed(1)}
              x2={R}
              y2={frame.yOil(v).toFixed(1)}
              stroke="#f0f1f4"
            />
          ))}
          <line x1={L} y1={B} x2={R} y2={B} stroke="#e5e7eb" />

          {/* Left axis · oil. */}
          <text x="60" y={B + 4} fontSize="11.5" fill="#6b7280" textAnchor="end">
            0
          </text>
          {frame.oilTicks.map((v) => (
            <text
              key={`oil-${v}`}
              x="60"
              y={(frame.yOil(v) + 4).toFixed(1)}
              fontSize="11.5"
              fill="#6b7280"
              textAnchor="end"
            >
              {fmt(v)}
            </text>
          ))}

          {/* Right axis · gas. */}
          <text x="700" y={B + 4} fontSize="11.5" fill="#6b7280" textAnchor="start">
            0
          </text>
          {frame.gasTicks.map((v) => (
            <text
              key={`gas-${v}`}
              x="700"
              y={(frame.yGas(v) + 4).toFixed(1)}
              fontSize="11.5"
              fill="#6b7280"
              textAnchor="start"
            >
              {fmt(v)}
            </text>
          ))}

          {/* X axis. The first and last labels are anchored inward so neither
              hangs off the plot. */}
          {frame.xTicks.map((t) => (
            <text
              key={`x-${t}`}
              x={frame.x(t).toFixed(1)}
              y={B + 20}
              fontSize="11.5"
              fill="#6b7280"
              textAnchor={t === a ? "start" : t === b ? "end" : "middle"}
            >
              {labels[t]}
            </text>
          ))}

          {/* Series — gas first so oil sits on top of it; solid to the seam,
              dashed after it. */}
          {a <= CASPER_SEAM ? (
            <polyline
              points={points(gas, a, Math.min(b, CASPER_SEAM), frame.x, frame.yGas)}
              fill="none"
              stroke="#b45309"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}
          {b > CASPER_SEAM ? (
            <polyline
              points={points(gas, Math.max(a, CASPER_SEAM), b, frame.x, frame.yGas)}
              fill="none"
              stroke="#b45309"
              strokeWidth="2"
              strokeDasharray="6 5"
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity=".85"
            />
          ) : null}
          {a <= CASPER_SEAM ? (
            <polyline
              points={points(oil, a, Math.min(b, CASPER_SEAM), frame.x, frame.yOil)}
              fill="none"
              stroke="#2e8f6d"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}
          {b > CASPER_SEAM ? (
            <polyline
              points={points(oil, Math.max(a, CASPER_SEAM), b, frame.x, frame.yOil)}
              fill="none"
              stroke="#2e8f6d"
              strokeWidth="2.5"
              strokeDasharray="6 5"
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity=".85"
            />
          ) : null}

          {/* The seam — heavier than the today rule, because it is the more
              important of the two facts. */}
          {seamVisible ? (
            <>
              <line
                x1={frame.x(CASPER_SEAM).toFixed(1)}
                y1="17"
                x2={frame.x(CASPER_SEAM).toFixed(1)}
                y2={B}
                stroke="#475569"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text
                x={clampLabel(frame.x(CASPER_SEAM), 78).toFixed(1)}
                y="12"
                fontSize="11.5"
                fontWeight="700"
                fill="#475569"
                textAnchor="middle"
              >
                {casperMeta.lastPostedLabel}
              </text>
            </>
          ) : null}

          {/* Today — lighter, and it falls INSIDE the forecast zone, which is
              the point: the newest posted month is already months old. */}
          {todayVisible ? (
            <>
              <line
                x1={frame.x(casperSeries.todayIdx).toFixed(1)}
                y1={T}
                x2={frame.x(casperSeries.todayIdx).toFixed(1)}
                y2={B}
                stroke="#b6c0cc"
                strokeWidth="1"
                strokeDasharray="2 5"
              />
              <text
                x={(
                  frame.x(casperSeries.todayIdx) +
                  (frame.x(casperSeries.todayIdx) > R - 52 ? -5 : 5)
                ).toFixed(1)}
                y={T + 13}
                fontSize="10.5"
                fontWeight="600"
                fill="#94a3b8"
                textAnchor={
                  frame.x(casperSeries.todayIdx) > R - 52 ? "end" : "start"
                }
              >
                {casperMeta.todayLabel}
              </text>
            </>
          ) : null}

          {forecastFlagVisible ? (
            <text
              x={(frame.x(Math.max(a, CASPER_SEAM)) + 12).toFixed(1)}
              y="150"
              fontSize="11"
              fontWeight="700"
              letterSpacing=".06em"
              fill="#2e8f6d"
              opacity=".6"
            >
              {casperMeta.forecastFlag}
            </text>
          ) : null}
        </g>

        {/* The two axis titles are static — they do not move with the window,
            so they live outside the plot group exactly as in the reference. */}
        <text
          x="20"
          y="139"
          fontSize="11.5"
          fontWeight="700"
          fill="#2e8f6d"
          textAnchor="middle"
          transform="rotate(-90 20 139)"
        >
          {casperMeta.oilAxis}
        </text>
        <text
          x="744"
          y="139"
          fontSize="11.5"
          fontWeight="700"
          fill="#b45309"
          textAnchor="middle"
          transform="rotate(90 744 139)"
        >
          {casperMeta.gasAxis}
        </text>

        {/* The hover readout. */}
        <g id="pf2Hover" pointerEvents="none">
          {hover !== null ? <HoverReadout idx={hover} frame={frame} /> : null}
        </g>
      </svg>

      <div className="pf2-brushrow">
        <div
          className="pf2-presets"
          role="group"
          aria-label="Time window presets"
        >
          {casperPresets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className={
                preset.a === a && preset.b === b
                  ? "pf2-preset on"
                  : "pf2-preset"
              }
              onClick={() => setWindow({ a: preset.a, b: preset.b })}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <span className="tiny muted pf2-winlab" id="pf2WinLab">
          {labels[a]} → {labels[b]} · {b - a + 1} months
        </span>
      </div>

      <div className="pf2-brush">
        <svg
          className="pf2-ctx"
          viewBox={`0 0 ${LAST} 28`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* The forecast half of the context strip, tinted to match the plot. */}
          <rect
            x={CASPER_SEAM}
            y="0"
            width={LAST - CASPER_SEAM}
            height="28"
            fill="#f4fdf9"
          />
          <polyline
            id="pf2CtxG"
            points={CONTEXT_GAS}
            fill="none"
            stroke="#e6c9a0"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            id="pf2CtxO"
            points={CONTEXT_OIL}
            fill="none"
            stroke="#9fcab7"
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div
          className="pf2-win"
          id="pf2Win"
          style={{
            left: `${(a / LAST) * 100}%`,
            width: `${((b - a) / LAST) * 100}%`,
          }}
        />

        <input
          type="range"
          id="pf2S0"
          min={0}
          max={LAST}
          step={1}
          value={a}
          style={HANDLE_STYLE}
          onChange={(event) => moveStart(Number(event.target.value))}
          aria-label="Window start month"
        />
        <input
          type="range"
          id="pf2S1"
          min={0}
          max={LAST}
          step={1}
          value={b}
          style={HANDLE_STYLE}
          onChange={(event) => moveEnd(Number(event.target.value))}
          aria-label="Window end month"
        />
      </div>

      <p className="pf2-note">
        {casperMeta.brushNoteLead}
        <strong className="num">{casperMeta.brushNoteMonth}</strong>
        {casperMeta.brushNoteMid}
        <strong>{casperMeta.brushNoteStrong}</strong>
        {casperMeta.brushNoteTail}
      </p>
    </>
  );
}

/**
 * The tooltip: a crosshair, a dot on each series, and a card.
 *
 * It grows by a line inside the forecast to carry the estimate disclaimer,
 * which is why the box height is conditional — a projected figure never
 * appears in this build without the words that qualify it.
 */
function HoverReadout({
  idx,
  frame,
}: {
  idx: number;
  frame: ReturnType<typeof chartFrame>;
}) {
  const { R, T, B } = CHART;
  const { oil, gas, labels } = casperSeries;

  const x = frame.x(idx);
  const yo = B - (oil[idx] / frame.oilTop) * (B - T);
  const yg = B - (gas[idx] / frame.gasTop) * (B - T);
  const forecast = idx > CASPER_SEAM;

  const bw = 168;
  const bh = forecast ? 70 : 56;
  const by = T + 6;
  let bx = x + 12;
  if (bx + bw > R + 30) bx = x - bw - 12;

  return (
    <>
      <line
        x1={x.toFixed(1)}
        y1={T}
        x2={x.toFixed(1)}
        y2={B}
        stroke="#cbd5e1"
        strokeWidth="1"
      />
      <circle
        cx={x.toFixed(1)}
        cy={yg.toFixed(1)}
        r="3.5"
        fill="#b45309"
        stroke="#fff"
        strokeWidth="1.2"
      />
      <circle
        cx={x.toFixed(1)}
        cy={yo.toFixed(1)}
        r="3.5"
        fill="#2e8f6d"
        stroke="#fff"
        strokeWidth="1.2"
      />
      <rect
        x={bx.toFixed(1)}
        y={by}
        width={bw}
        height={bh}
        rx="8"
        fill="#fff"
        stroke="#e2e8f0"
      />
      <text
        x={(bx + 10).toFixed(1)}
        y={by + 16}
        fontSize="11.5"
        fontWeight="800"
        fill="#1f2937"
      >
        {labels[idx]}
        {forecast ? " · forecast" : ""}
      </text>
      <text
        x={(bx + 10).toFixed(1)}
        y={by + 32}
        fontSize="11"
        fontWeight="700"
        fill="#2e8f6d"
      >
        {`Oil  ${fmt(oil[idx])} bbl`}
      </text>
      <text
        x={(bx + 10).toFixed(1)}
        y={by + 46}
        fontSize="11"
        fontWeight="700"
        fill="#b45309"
      >
        {`Gas  ${fmt(gas[idx])} mcf`}
      </text>
      {forecast ? (
        <text
          x={(bx + 10).toFixed(1)}
          y={by + 61}
          fontSize="9"
          fontWeight="700"
          fill="#b98b3c"
          letterSpacing=".04em"
        >
          ESTIMATE — NOT AN APPRAISAL
        </text>
      ) : null}
    </>
  );
}
