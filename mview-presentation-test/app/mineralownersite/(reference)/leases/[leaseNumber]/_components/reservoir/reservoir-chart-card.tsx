"use client";

import { useMemo, useState } from "react";

import { Card } from "../../../../../_components/ui/card";
import { ChartBrush } from "../../../_components/financials/chart-brush";
import {
  CHART_MODES,
  CHART_MODE_COPY,
  type ChartMode,
} from "../../../_components/financials/chart-modes";
import { SegmentedControl } from "../../../../../_components/ui/segmented-control";
import { RangePresets } from "../../../_components/financials/range-presets";
import { financialsSeries } from "../../../_lib/financials-series";
import { shortMonthLabel } from "../../../_lib/months";
import { cashAt } from "../../../_lib/price-deck";
import type { ReservoirReport } from "../../_lib/reservoir-report";
import {
  SeriesChart,
  type ChartSeries,
} from "../../../_components/financials/series-chart";

/**
 * THE RESERVOIR'S OWN PRODUCTION, every well in it summed.
 *
 * ── IT OPENS ON THE SAME WINDOW AS THE OTHER TWO TABS ──
 *
 * Forty-nine months sat astride the last filing, which is what the lease
 * report's chart and the well report's chart both open on.
 *
 * It used to open on the whole record — 228 months here — on the argument that
 * the question about a ROCK is what it has done over its whole life: the ramp
 * when the wells came on, the peak, the long tail. That reads well on its own
 * and badly beside the other two. A reader moves between the three tabs of one
 * lease, and when each opens on a different span the curves cannot be compared
 * by eye, which is the first thing anyone does with three charts of the same
 * thing. The whole record is still one click away on "All", and that is where
 * a question about the whole life belongs.
 *
 * ── WHOLE-LEASE VOLUMES ──
 *
 * A volume is a physical fact about the rock and belongs to nobody. Cash flow
 * is the one mode that switches to the reader's own interest, because a dollar
 * figure at 100% would be a number nobody is owed.
 */
/** Four years and a month — the window the other two tabs' charts open on. */
const DEFAULT_WINDOW_MONTHS = 49;

export function ReservoirChartCard({ report }: { report: ReservoirReport }) {
  const [mode, setMode] = useState<ChartMode>("both");
  const [range, setRange] = useState(() => {
    /* The seam the window is built around. `report.series` is in hand on the
       first render — the tab does not draw until the read has answered — so
       this needs no effect to correct itself afterwards.

       The 0.48 is what puts just under half the window behind the last filing:
       the same arithmetic `windowAround` uses for the presets, so the default
       and a preset of the same width mean the same span. */
    const posted = report.series
      ? report.series.lastPostedIndex
      : financialsSeries.lastPostedIndex;
    const total = report.series
      ? report.series.labels.length
      : financialsSeries.length;

    const behind = Math.round((DEFAULT_WINDOW_MONTHS - 1) * 0.48);
    const from = Math.max(report.from, posted - behind);
    return {
      from,
      to: Math.min(from + DEFAULT_WINDOW_MONTHS - 1, total - 1, report.to),
    };
  });

  /* WHOSE SERIES THIS IS. A served reservoir carries its own months — every
     well in that one rock summed — and a fixture lease is a row of the shared
     table. See `ReservoirReport.series`. */
  const served = report.series;

  const streams = useMemo(() => {
    if (served) return { gas: served.gas, oil: served.oil, cash: served.cash };

    const series = financialsSeries.byLease.find(
      (entry) => entry.slug === report.lease.slug,
    );
    const gas = series?.gas ?? [];
    const oil = series?.oil ?? [];
    const cash = gas.map((value, index) =>
      cashAt({
        gas: value * report.lease.decimalInterest,
        oil: oil[index] * report.lease.decimalInterest,
        monthOfYear: (financialsSeries.firstMonth + index) % 12,
        index,
        filed: index <= financialsSeries.lastPostedIndex,
      }),
    );
    return { gas, oil, cash };
  }, [served, report.lease.slug, report.lease.decimalInterest]);

  const { left, right } = seriesFor(mode, streams);
  const labelFor = (index: number) =>
    served
      ? (served.labels[index] ?? "")
      : shortMonthLabel(financialsSeries.firstMonth + index);
  const postedThrough = served
    ? served.lastPostedIndex
    : financialsSeries.lastPostedIndex;
  const length = served ? served.labels.length : financialsSeries.length;
  const months = range.to - range.from + 1;
  const wholeRecord = report.to - report.from + 1;

  /* NOTHING TO PLOT IS AN ANSWER, NOT AN ERROR. A reservoir the service
     identified from the well roster rather than from an allocation has wells,
     depths and operators but not one attributed month — `CONSOLIDATED` on
     `08_46924` has 138 wells and an empty series. An axis with no line on it
     reads as a broken chart, so the card says which of the two it is. */
  if (served && length === 0) {
    return (
      <Card padded={false} className="mt-4 px-[22px] py-[18px]">
        <h3 className="text-[15px] font-bold">
          {report.name} — no month-by-month record
        </h3>
        <p className="mt-1.5 text-[12.5px] leading-[1.6] text-mv-muted">
          The state files production against this lease, but none of it is
          allocated to {report.name} month by month — this rock was identified
          from the well roster, not from an allocation. The wells, their depths
          and where they sit are all below and are real; what is missing is the
          split of the volumes between this reservoir and the others on the
          lease.
        </p>
      </Card>
    );
  }

  return (
    <Card padded={false} className="mt-4 px-[18px] py-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SegmentedControl
          label="What to plot"
          tone="dark"
          value={mode}
          onChange={setMode}
          options={CHART_MODES}
        />
        {/* THE PRESETS SIT WITH THE OTHER CONTROL, NOT UNDER THE CHART.
            They were below the plot next to the "showing…" readout, which put
            the two things that CHANGE the chart at opposite ends of the card
            and left this row half empty. `ml-auto` rather than
            `justify-between`, so the presets stay pinned right however wide
            the control beside them ends up. */}
        <div className="ml-auto">
          <RangePresets
            months={months}
            lastPostedIndex={postedThrough}
            length={length}
            onChange={setRange}
          />
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-bold">
            {report.name} — {CHART_MODE_COPY[mode].title.toLowerCase()}
          </h3>
          <p className="text-[11.5px] text-mv-muted">
            every well in it, summed · solid to {report.filedTo}, lighter after
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
        lastPostedIndex={postedThrough}
        firstMonth={financialsSeries.firstMonth}
        labelAt={served ? labelFor : undefined}
        summary={`${report.name}, ${CHART_MODE_COPY[mode].title.toLowerCase()}, ${labelFor(range.from)} to ${labelFor(range.to)}. Filed through ${report.filedTo}; modelled after that.`}
      />

      <p className="mt-3 mb-2 text-[11.5px] text-mv-muted tabular-nums">
        Showing {labelFor(range.from)} to {labelFor(range.to)} · {months} months
        of {wholeRecord}
      </p>

      <ChartBrush
        values={streams.gas}
        from={range.from}
        to={range.to}
        onChange={setRange}
        labelFor={labelFor}
      />
    </Card>
  );
}

function LegendKey({ tone, label }: { tone: "gas" | "oil"; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={`inline-block h-[3px] w-4 rounded-full ${
          tone === "gas" ? "bg-mv-green-deep" : "bg-mv-oil"
        }`}
      />
      {label}
    </span>
  );
}

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
  if (mode === "oil") return { left: oil };
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
