"use client";

import { useMemo, useState } from "react";

import { Card } from "../../../../_components/ui/card";
import {
  SCOPE_COPY,
  OWNER_SHARE,
  type FinancialsScope,
} from "../../_lib/financials-record";
import { financialsSeries } from "../../_lib/financials-series";
import { cashAt } from "../../_lib/price-deck";
import { monthLabel, shortMonthLabel } from "../../_lib/months";
import { CHART_MODES, CHART_MODE_COPY, chartTitle, type ChartMode } from "./chart-modes";
import { ChartBrush } from "./chart-brush";
import { FinancialsTiles } from "./financials-tiles";
import { MonthTable } from "./month-table";
import { PillStrip } from "./pill-strip";
import { RangePresets, windowAround } from "./range-presets";
import { SeriesChart, type ChartSeries } from "./series-chart";

/** Jul 2024 to Jul 2028 — the two years either side of the last filing. */
const DEFAULT_WINDOW_MONTHS = 49;

/**
 * THE FINANCIALS TAB — three headlines and one chart, read at either scope.
 *
 * ── WHAT IT OWNS ──
 *
 * Four pieces of state and nothing else: the scope, the chart mode, and the two
 * ends of the visible window. Every figure below is derived from those, so
 * there is no way for the tiles to be showing the owner's share while the chart
 * shows the lease's — which is the one defect a panel with a scope switch is
 * prone to.
 *
 * ── THE SCOPE SWITCH IS THE TOP CONTROL FOR A REASON ──
 *
 * "Full lease" and "Your share" are the same figures a thousand-fold apart, and
 * a reader who mistakes one for the other is out by the whole decimal interest.
 * So it sits above the tiles rather than beside the chart, every tile label
 * repeats which one is showing ("Your cash", "Lease cash"), and the caption
 * beside it states the blended interest in words.
 *
 * ── THE WINDOW STARTS ASTRIDE THE JOIN ──
 *
 * Not at the start of the record and not at the end: the default window is the
 * two years either side of the last filing, so the first thing on screen is the
 * handover from what was filed to what is modelled. The record's first decade —
 * one lease, almost flat — is a scroll away in the strip underneath, where it
 * is context rather than four fifths of the picture.
 */
export function FinancialsPanel() {
  const [scope, setScope] = useState<FinancialsScope>("share");
  const [mode, setMode] = useState<ChartMode>("both");
  const [range, setRange] = useState(() =>
    windowAround(DEFAULT_WINDOW_MONTHS, financialsSeries.lastPostedIndex, financialsSeries.length),
  );

  /* The three streams, at the chosen scope. Recomputed only when the scope
     changes — these are 261-element arrays and the window moves on every frame
     of a brush drag. */
  const streams = useMemo(() => {
    const factor = scope === "share" ? OWNER_SHARE : 1;
    const gas = financialsSeries.gas.map((value) => value * factor);
    const oil = financialsSeries.oil.map((value) => value * factor);
    /* Priced through the same deck the table below uses, so a month read off
       the cash line and the same month read out of the table agree — including
       the seasonal swing, which is most of what the cash line's shape IS. */
    const cash = gas.map((value, index) =>
      cashAt({
        gas: value,
        oil: oil[index],
        monthOfYear: (financialsSeries.firstMonth + index) % 12,
        index,
        filed: index <= financialsSeries.lastPostedIndex,
      }),
    );
    return { gas, oil, cash };
  }, [scope]);

  const { left, right } = seriesFor(mode, streams);
  const firstMonth = financialsSeries.firstMonth;
  const months = range.to - range.from + 1;
  const labelFor = (index: number) => shortMonthLabel(firstMonth + index);

  return (
    <div>
      <div className="mb-3.5 flex flex-wrap items-center gap-3">
        <PillStrip
          label="Whose figures to show"
          tone="green"
          value={scope}
          onChange={setScope}
          options={[
            { value: "lease", label: SCOPE_COPY.lease.label },
            { value: "share", label: SCOPE_COPY.share.label },
          ]}
        />
        <p className="text-[12.5px] text-mv-muted">{SCOPE_COPY[scope].caption}</p>
      </div>

      <FinancialsTiles scope={scope} />

      <Card padded={false} className="px-[18px] py-4">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <PillStrip
            label="What to plot"
            tone="dark"
            value={mode}
            onChange={setMode}
            options={CHART_MODES}
          />
          <p className="text-[12.5px] text-mv-muted">{CHART_MODE_COPY[mode].note}</p>
        </div>

        <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-bold">{chartTitle(mode, scope)}</h3>
            <p className="text-[11.5px] text-mv-muted">
              solid to {monthLabel(firstMonth + financialsSeries.lastPostedIndex)},
              lighter after
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-[11.5px] font-semibold">
            <LegendKey tone="gas" label={left.label} />
            {right && <LegendKey tone="oil" label={right.label} />}
          </div>
        </div>

        <SeriesChart
          left={left}
          right={right}
          from={range.from}
          to={range.to}
          lastPostedIndex={financialsSeries.lastPostedIndex}
          firstMonth={firstMonth}
          summary={`${chartTitle(mode, scope)}, ${labelFor(range.from)} to ${labelFor(range.to)}. Filed through ${monthLabel(firstMonth + financialsSeries.lastPostedIndex)}; modelled after that.`}
        />

        <div className="mt-3 mb-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11.5px] text-mv-muted tabular-nums">
            Showing {labelFor(range.from)} to {labelFor(range.to)} · {months}{" "}
            months of {financialsSeries.length}
          </p>
          <RangePresets
            months={months}
            lastPostedIndex={financialsSeries.lastPostedIndex}
            length={financialsSeries.length}
            onChange={setRange}
          />
        </div>

        <ChartBrush
          values={streams.gas}
          from={range.from}
          to={range.to}
          onChange={setRange}
          labelFor={labelFor}
        />
      </Card>

      {/* THE FIGURES BEHIND THE PICTURE, directly under it and at the same
          scope. A reader who wants the exact value of a month cannot read one
          off a polyline — see the note in `month-table.tsx`. */}
      <MonthTable scope={scope} />
    </div>
  );
}

/** A 10px rule in the series' own colour, then its name. */
function LegendKey({ tone, label }: { tone: "gas" | "oil"; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={`inline-block h-[3px] w-4 rounded-full ${
          tone === "gas" ? "bg-mv-green-deep" : "bg-mv-sand"
        }`}
      />
      {label}
    </span>
  );
}

/**
 * WHICH SERIES EACH MODE PLOTS, AND AGAINST WHICH AXIS.
 *
 * The single-stream modes deliberately put their one series on the LEFT axis
 * rather than keeping oil on the right where the combined view has it: an axis
 * on the right with nothing on the left reads as a chart missing half its
 * scale.
 */
function seriesFor(
  mode: ChartMode,
  streams: { gas: number[]; oil: number[]; cash: number[] },
): { left: ChartSeries; right?: ChartSeries } {
  const gas: ChartSeries = {
    values: streams.gas,
    tone: "gas",
    label: "Gas · MCF",
    money: false,
  };
  const oil: ChartSeries = {
    values: streams.oil,
    tone: "oil",
    label: "Oil · BBL",
    money: false,
  };

  if (mode === "gas") return { left: gas };
  if (mode === "oil") return { left: { ...oil, tone: "oil" } };
  if (mode === "cash") {
    return {
      left: {
        values: streams.cash,
        tone: "cash",
        label: "Cash · $",
        money: true,
      },
    };
  }
  return { left: gas, right: oil };
}
