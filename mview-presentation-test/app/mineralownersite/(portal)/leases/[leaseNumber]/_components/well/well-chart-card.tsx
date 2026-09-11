"use client";

import { useMemo, useState } from "react";

import { Card } from "../../../../../_components/ui/card";
import { ChartBrush } from "../../../_components/financials/chart-brush";
import {
  CHART_MODES,
  CHART_MODE_COPY,
  type ChartMode,
} from "../../../_components/financials/chart-modes";
import { PillStrip } from "../../../_components/financials/pill-strip";
import { RangePresets } from "../../../_components/financials/range-presets";
import {
  SeriesChart,
  type ChartSeries,
} from "../../../_components/financials/series-chart";
import { financialsSeries } from "../../../_lib/financials-series";
import { shortMonthLabel } from "../../../_lib/months";
import { cashAt } from "../../../_lib/price-deck";
import type { WellReport } from "../../_lib/well-report";

/**
 * THE WELLBORE'S OWN PRODUCTION, allocated to it.
 *
 * ── "ALLOCATED TO THIS WELLBORE" IS IN THE SUBHEADING FOR A REASON ──
 *
 * Texas files production at the LEASE. Where a lease has one well the two are
 * the same series; where it has several, the state does not say which hole made
 * what, so this is the lease's filing divided between its wells. Calling that
 * "produced by this well" would claim a measurement nobody took.
 *
 * ── THE WHOLE RECORD BY DEFAULT ──
 *
 * Same call as the reservoir report: the question here is what this hole has
 * DONE, and that needs the ramp, the peak and the tail. The brush narrows it.
 */
export function WellChartCard({ report }: { report: WellReport }) {
  const [mode, setMode] = useState<ChartMode>("both");
  const [range, setRange] = useState({ from: report.from, to: report.to });

  const streams = useMemo(() => {
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
  }, [report.lease.slug, report.lease.decimalInterest]);

  const { left, right } = seriesFor(mode, streams);
  const labelFor = (index: number) =>
    shortMonthLabel(financialsSeries.firstMonth + index);
  const months = range.to - range.from + 1;
  const wholeRecord = report.to - report.from + 1;

  return (
    <Card padded={false} className="mt-4 px-[18px] py-4">
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
          <h3 className="text-[15px] font-bold">
            Well {report.well.name} — {CHART_MODE_COPY[mode].title.toLowerCase()}
          </h3>
          <p className="text-[11.5px] text-mv-muted">
            allocated to this wellbore · solid to {report.newestFiledMonth},
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
        firstMonth={financialsSeries.firstMonth}
        summary={`Well ${report.well.name}, ${CHART_MODE_COPY[mode].title.toLowerCase()}, ${labelFor(range.from)} to ${labelFor(range.to)}. Filed through ${report.newestFiledMonth}; modelled after that.`}
      />

      <div className="mt-3 mb-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11.5px] text-mv-muted tabular-nums">
          Showing {labelFor(range.from)} to {labelFor(range.to)} · {months} months
          of {wholeRecord}
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
  );
}

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
      left: { values: streams.cash, tone: "cash", label: "Cash · $", money: true },
    };
  }
  return { left: gas, right: oil };
}
