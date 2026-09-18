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
 * ── IT OPENS ASTRIDE THE LAST FILING, LIKE THE LEASE REPORT ──
 *
 * It opened on the whole record, on the reasoning that this page asks what the
 * hole has DONE and that needs the ramp, the peak and the tail. On a served
 * well that is two hundred months in one screen: the recent shape — the part a
 * reader can act on — is a few pixels wide at the right-hand edge, and the
 * handles sit at the extremes where there is nothing to drag away from.
 *
 * Four years, a little under half of them behind the last filed month, which is
 * the window `FiguresPanel` opens on. It puts the seam near the middle, so the
 * filed months and what the model expects next are both legible, and it leaves
 * the brush with somewhere to go in either direction. The record is still all
 * there — the handles and the presets reach it.
 */
/** Four years and a month — the window the lease report's own chart opens on. */
const DEFAULT_WINDOW_MONTHS = 49;

export function WellChartCard({ report }: { report: WellReport }) {
  const [mode, setMode] = useState<ChartMode>("both");
  const [range, setRange] = useState(() => {
    /* The seam this window is built around. `report.series` is in hand on the
       first render — the tab does not draw until the read has answered — so
       this needs no effect to correct itself afterwards. */
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

  /* WHOSE MONTHS THESE ARE. A served well carries its own allocation — see
     `WellReport.series` — and a fixture well is a share of its lease's row in
     the shared table. The lookup below finds nothing for a served lease, which
     drew an empty chart across a 228-month axis belonging to neither. */
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

  /* A WELLBORE WITH NO ALLOCATED MONTHS HAS NO CHART. The filings, the depths
     and the map below are all real; what is missing is the split of the lease's
     volumes down to this hole. An axis with no line on it reads as a broken
     card, so the card says which of the two it is. */
  if (served && length === 0) {
    return (
      <Card padded={false} className="mt-4 px-[22px] py-[18px]">
        <h3 className="text-[15px] font-bold">
          Well {report.well.name} — no month-by-month record
        </h3>
        <p className="mt-1.5 text-[12.5px] leading-[1.6] text-mv-muted">
          The lease files production, but none of it is allocated to this
          wellbore month by month. Everything else on this page — the hole, its
          filings and where it sits — comes from the state&apos;s own record and
          is unaffected.
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
        <p className="text-[12.5px] text-mv-muted">
          {CHART_MODE_COPY[mode].note}
        </p>
      </div>

      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-bold">
            Well {report.well.name} —{" "}
            {CHART_MODE_COPY[mode].title.toLowerCase()}
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
        lastPostedIndex={postedThrough}
        firstMonth={financialsSeries.firstMonth}
        labelAt={served ? labelFor : undefined}
        summary={`Well ${report.well.name}, ${CHART_MODE_COPY[mode].title.toLowerCase()}, ${labelFor(range.from)} to ${labelFor(range.to)}. Filed through ${report.newestFiledMonth}; modelled after that.`}
      />

      <div className="mt-3 mb-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11.5px] text-mv-muted tabular-nums">
          Showing {labelFor(range.from)} to {labelFor(range.to)} · {months}{" "}
          months of {wholeRecord}
        </p>
        <RangePresets
          months={months}
          lastPostedIndex={postedThrough}
          length={length}
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
