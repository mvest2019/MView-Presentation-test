"use client";

import { useMemo, useState } from "react";

import { Badge } from "../../../_components/ui/badge";
import { gates } from "../../../_components/ui/portal-gating";
import {
  bandPath,
  buildScale,
  CHART,
  monthLabel,
  PLOT,
  seriesPath,
  windowValues,
} from "../_lib/decline-chart";
import type { MonthlySeries, ProductionRecord } from "../_lib/lease-report-types";

/**
 * POSTED PRODUCTION vs THE DECLINE CURVE — the honest test of a forecast.
 *
 * ── WHY THE CURVE IS DRAWN OVER THE HISTORY, NOT JUST AFTER IT ──
 *
 * The engine's published curve begins at the prediction date. Drawn that way it
 * appears out of nowhere at the right-hand edge, and the design's note on that
 * is exact: "nobody can take the dashed estimate seriously unless they can see
 * how it was predicted with the historical data." So the dashed line also runs
 * BACKWARDS through the months it was fitted to — an Arps least-squares backfit
 * on the same posted record, labelled DERIVED wherever it appears. It is our
 * arithmetic on real data, never presented as the engine's output.
 *
 * ── GAS IS RED, OIL IS GREEN ──
 *
 * A domain convention, not a palette choice, and the design states it twice. It
 * is the one place in this module where the brand green means "oil" rather than
 * "good", which is why the two charts are labelled above the axis as well as in
 * the legend.
 *
 * ── NO FIT SCORE ──
 *
 * The chip reads "pending". No collection publishes a goodness-of-fit for these
 * curves, and the one number a reader would most want here is the one we must not
 * invent. When the modeling team publishes it, `record.fit` carries it and the
 * chip changes on its own.
 *
 * ── THE DATE WINDOW ──
 *
 * Two range inputs rather than a drag-select, and they are clamped so the start
 * can never pass the end. 237 months at 674px is under 3px a month, so a reader
 * comparing the curve to the last two years needs to be able to get there.
 */
export function ProductionChart({ record }: { record: ProductionRecord }) {
  const last = record.months - 1;
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(last);
  const [showActual, setShowActual] = useState(true);
  const [showCurve, setShowCurve] = useState(true);
  const [showBand, setShowBand] = useState(true);
  const [log, setLog] = useState(false);

  const csv = useMemo(() => buildCsv(record), [record]);

  return (
    <div className="relative mb-4 rounded-mv border border-mv-line bg-mv-card px-[18px] pt-4 pb-2 shadow-mv">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-[15px] font-bold">
          <span className={gates("hideInEssentials")}>
            Production — the posted history vs the decline curve
          </span>
          <span className={gates("essentialsOnly")}>
            Did we read this well right? Check us against history.
          </span>
        </h4>
        <Badge tone="estimate" size="xs">
          {record.fit === null
            ? "Curve fit score: pending — not yet published by the modeling engine"
            : `Curve fit score: ${record.fit}`}
        </Badge>
      </div>

      <p className={`mt-1.5 mb-1 text-[13px] ${gates("hideInEssentials")}`}>
        The honest test of a forecast is history. The solid line is what the well{" "}
        <em>actually posted</em>, month by month; the dashed line is the modeled
        decline with its down–high range, drawn back across the history it was
        fitted to and forward from today. Where they overlap and hug, the
        projection has earned some trust.
      </p>

      <div className="my-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-mv-slate">
        <Legend swatch="#b91c1c" label="Gas — actual posted (red)" />
        <Legend swatch="#1f7a56" label="Oil — actual posted (green)" />
        <Legend dashed label="Decline curve (derived backfit + engine forecast)" />
        <Legend swatch="rgba(148,163,184,.35)" label="Down–high range band" />
        {/* The one clarification the legend cannot do without: these are GROSS
            WELL volumes from the public record, not the reader's share. Every
            dollar figure on this page is an owner share, so a chart of gross
            rate sitting among them needs saying. */}
        <Badge tone="slate" size="xs">Gross well rate</Badge>
      </div>

      <div
        className={`mb-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] ${gates("hideInEssentials")}`}
      >
        <Toggle checked={showActual} onChange={setShowActual} label="● Actual posted" />
        <Toggle checked={showCurve} onChange={setShowCurve} label="┅ Decline curve" />
        <Toggle checked={showBand} onChange={setShowBand} label="▒ Range band" />
        <Toggle
          checked={log}
          onChange={setLog}
          label="log scale"
          title="Engineers judge decline fits on a log rate axis — the industry standard"
        />
        <a
          href={csv}
          download={`${record.unit}-${record.well}-production.csv`}
          className="font-bold text-mv-green-deep"
        >
          ⤓ Export CSV
        </a>
      </div>

      <p className="mt-0.5 text-[11px] font-bold text-mv-down">Gas — mcf per month</p>
      <DeclineSvg
        height={CHART.gasHeight}
        colour="#b91c1c"
        unit="mcf"
        axisLabel="mcf/mo"
        markProjection
        actual={record.gasActual}
        backfit={record.gasBackfit}
        forecast={record.gasMean}
        low={record.gasDown}
        high={record.gasHigh}
        firstMonth={record.firstMonth}
        from={from}
        to={to}
        log={log}
        showActual={showActual}
        showCurve={showCurve}
        showBand={showBand}
      />

      <p className="mt-0.5 text-[11px] font-bold text-mv-chart-oil">
        Oil — bbl per month
      </p>
      <DeclineSvg
        height={CHART.oilHeight}
        colour="#1f7a56"
        unit="bbl"
        axisLabel="bbl/mo"
        actual={record.oilActual}
        backfit={record.oilBackfit}
        forecast={record.oilMean}
        low={record.oilDown}
        high={record.oilHigh}
        firstMonth={record.firstMonth}
        from={from}
        to={to}
        log={log}
        showActual={showActual}
        showCurve={showCurve}
        showBand={showBand}
      />

      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="font-extrabold whitespace-nowrap text-mv-slate">
          Date window
        </span>
        <input
          type="range"
          min={0}
          max={last}
          value={from}
          aria-label="Window start month"
          /* Clamped against the other thumb, or the window inverts and every
             path renders backwards across the plot. */
          onChange={(e) => setFrom(Math.min(Number(e.target.value), to - 5))}
          className="min-w-[90px] flex-1 accent-mv-green-deep"
        />
        <input
          type="range"
          min={0}
          max={last}
          value={to}
          aria-label="Window end month"
          onChange={(e) => setTo(Math.max(Number(e.target.value), from + 5))}
          className="min-w-[90px] flex-1 accent-mv-green-deep"
        />
        <span className="font-bold whitespace-nowrap tabular-nums text-mv-slate">
          {monthLabel(record.firstMonth, from)} –{" "}
          {monthLabel(record.firstMonth, to)}
        </span>
        <button
          type="button"
          onClick={() => {
            setFrom(0);
            setTo(last);
          }}
          className="cursor-pointer border-0 bg-transparent p-0 font-bold text-mv-green-deep"
        >
          ↺ Full range
        </button>
      </div>

      <p className="px-0.5 pt-0.5 pb-2 text-[10px] text-mv-muted">
        <strong>Real example, honestly labeled:</strong> this chart renders the{" "}
        <strong>
          real posted record of {record.unit} well {record.well}
        </strong>{" "}
        (RRC lease {record.rrcLease}, {record.county} Co.) — the same pilot unit
        drawn on the map above, its measured survey among the two shown there.
        EUR {record.eurGas.toLocaleString("en-US")} mcf ·{" "}
        {record.eurOil.toLocaleString("en-US")} bbl; produced to date{" "}
        {record.producedGas.toLocaleString("en-US")} mcf ·{" "}
        {record.producedOil.toLocaleString("en-US")} bbl. The dashed line before
        the forecast date is our backfit, marked <em>derived</em>.
      </p>
    </div>
  );
}

function DeclineSvg({
  height,
  colour,
  unit,
  axisLabel,
  markProjection = false,
  actual,
  backfit,
  forecast,
  low,
  high,
  firstMonth,
  from,
  to,
  log,
  showActual,
  showCurve,
  showBand,
}: {
  height: number;
  colour: string;
  unit: string;
  axisLabel: string;
  /** Draw the "engine projection from here" divider. Gas chart only. */
  markProjection?: boolean;
  actual: MonthlySeries;
  backfit: MonthlySeries;
  forecast: MonthlySeries;
  low: MonthlySeries;
  high: MonthlySeries;
  firstMonth: string;
  from: number;
  to: number;
  log: boolean;
  showActual: boolean;
  showCurve: boolean;
  showBand: boolean;
}) {
  const scale = useMemo(() => {
    const considered: MonthlySeries[] = [];
    if (showActual) considered.push(actual);
    if (showCurve) considered.push(backfit, forecast);
    if (showBand) considered.push(high);
    return buildScale({
      values: windowValues(considered.length ? considered : [actual], from, to),
      from,
      to,
      height,
      log,
    });
  }, [actual, backfit, forecast, high, from, to, height, log, showActual, showCurve, showBand]);

  const bottom = height - 26;
  /* Six x labels regardless of window width — enough to orient, few enough to
     stay readable at 740px. */
  const xTicks = Array.from({ length: 6 }, (_, i) =>
    Math.round(from + ((to - from) * i) / 5),
  );

  /* WHERE OUR BACKFIT ENDS AND THE ENGINE'S FORECAST BEGINS.
     The dashed line is one continuous curve to the eye, but the left half is
     our least-squares fit over the posted record and the right half is the
     modeling engine's published projection. That is the single most important
     boundary on the chart — everything right of it is a claim about the future
     — so it gets a divider and a label rather than a footnote. */
  const projectionStart = forecast.findIndex((v) => v !== null);
  const showDivider =
    markProjection && projectionStart >= from && projectionStart <= to;

  return (
    <svg
      viewBox={`0 0 ${CHART.width} ${height}`}
      role="img"
      aria-label={`Actual posted monthly ${unit} with the dashed decline curve overlaid on history and extended forward, plus its range band, from ${monthLabel(firstMonth, from)} to ${monthLabel(firstMonth, to)}.`}
      className="block h-auto w-full"
    >
      {scale.ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={PLOT.left}
            y1={scale.y(tick)}
            x2={PLOT.right}
            y2={scale.y(tick)}
            strokeWidth={1}
            className={tick === 0 ? "stroke-mv-line-strong" : "stroke-mv-line-soft"}
          />
          <text
            x={PLOT.left - 6}
            y={scale.y(tick) + 3}
            fontSize={9}
            textAnchor="end"
            className="fill-mv-muted"
          >
            {tick >= 1000 ? `${Math.round(tick / 1000)}k` : tick}
          </text>
        </g>
      ))}

      {showBand && (
        <path d={bandPath(low, high, scale, from, to)} fill="rgba(148,163,184,.35)" />
      )}

      {showCurve && (
        <>
          {/* Backfit and forecast are one visual line in two segments: same
              dash, same colour, because they are the same curve — only their
              provenance differs, and the caption carries that. */}
          <path
            d={seriesPath(backfit, scale, from, to)}
            fill="none"
            stroke="#64748b"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
          <path
            d={seriesPath(forecast, scale, from, to)}
            fill="none"
            stroke="#64748b"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
        </>
      )}

      {showActual && (
        <path
          d={seriesPath(actual, scale, from, to)}
          fill="none"
          stroke={colour}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
      )}

      {showDivider && (
        <g>
          <line
            x1={scale.x(projectionStart)}
            y1={PLOT.top - 6}
            x2={scale.x(projectionStart)}
            y2={bottom}
            stroke="#94a3b8"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
          <text
            x={scale.x(projectionStart) + 6}
            y={PLOT.top - 1}
            fontSize={9}
            className="fill-mv-muted"
          >
            engine projection from here · {monthLabel(firstMonth, projectionStart)}
          </text>
        </g>
      )}

      {/* The axis unit, rotated up the left edge. Without it the reader has a
          column of bare numbers and two charts whose units differ. */}
      <text
        x={12}
        y={height / 2}
        fontSize={9}
        textAnchor="middle"
        transform={`rotate(-90 12 ${height / 2})`}
        className="fill-mv-muted"
      >
        {axisLabel}
      </text>

      {xTicks.map((index) => (
        <text
          key={index}
          x={scale.x(index)}
          y={bottom + 15}
          fontSize={9}
          textAnchor="middle"
          className="fill-mv-muted"
        >
          {monthLabel(firstMonth, index)}
        </text>
      ))}
    </svg>
  );
}

function Legend({
  swatch,
  dashed = false,
  label,
}: {
  swatch?: string;
  dashed?: boolean;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {dashed ? (
        <svg width="22" height="8" aria-hidden="true">
          <line x1="0" y1="4" x2="22" y2="4" stroke="#64748b" strokeWidth="2" strokeDasharray="5 3" />
        </svg>
      ) : (
        <span
          aria-hidden="true"
          className="inline-block h-2.5 w-2.5 rounded-sm"
          style={{ background: swatch }}
        />
      )}
      {label}
    </span>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  title,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  title?: string;
}) {
  return (
    <label
      title={title}
      className="inline-flex cursor-pointer items-center gap-1.5 font-bold text-mv-slate"
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-mv-green-deep"
      />
      {label}
    </label>
  );
}

/**
 * The full record as a data URI, so Export CSV is a plain `<a download>` with no
 * click handler, no Blob and no object URL to revoke.
 *
 * Every series ships, including the nulls — a consumer needs to know which months
 * had no posting, and a CSV that silently drops them misrepresents the history.
 */
function buildCsv(record: ProductionRecord): string {
  const columns: [string, MonthlySeries][] = [
    ["gas_actual_mcf", record.gasActual],
    ["oil_actual_bbl", record.oilActual],
    ["gas_backfit_derived", record.gasBackfit],
    ["gas_forecast_mean", record.gasMean],
    ["gas_forecast_down", record.gasDown],
    ["gas_forecast_high", record.gasHigh],
    ["oil_backfit_derived", record.oilBackfit],
    ["oil_forecast_mean", record.oilMean],
    ["oil_forecast_down", record.oilDown],
    ["oil_forecast_high", record.oilHigh],
  ];
  const rows = [["month", ...columns.map(([name]) => name)].join(",")];
  for (let i = 0; i < record.months; i += 1) {
    rows.push(
      [
        monthLabel(record.firstMonth, i),
        ...columns.map(([, series]) => series[i] ?? ""),
      ].join(","),
    );
  }
  return `data:text/csv;charset=utf-8,${encodeURIComponent(rows.join("\n"))}`;
}
