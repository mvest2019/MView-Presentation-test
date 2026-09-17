"use client";

import { useEffect, useMemo, useState } from "react";

import { Card } from "../../../../_components/ui/card";
import { Notice } from "../../../../_components/ui/notice";
import {
  fetchLeaseFinancials,
  LeasesApiError,
  type LeaseFinancials,
} from "../../_api/leases-api";
import { SCOPE_COPY, type FinancialsScope } from "../../_lib/financials-record";
import { monthLabel, shortMonthLabel } from "../../_lib/months";
import { CHART_MODES, CHART_MODE_COPY, chartTitle, type ChartMode } from "./chart-modes";
import { ChartBrush } from "./chart-brush";
import { FinancialsTiles } from "./financials-tiles";
import { MonthTable } from "./month-table";
import { SegmentedControl } from "../../../../_components/ui/segmented-control";
import { PillStrip } from "./pill-strip";
import { RangePresets, windowAround } from "./range-presets";
import { SeriesChart, type ChartSeries } from "./series-chart";

/** Jul 2024 to Jul 2028 — the two years either side of the last filing. */
const DEFAULT_WINDOW_MONTHS = 49;

/**
 * THE FINANCIALS TAB — three headlines and one chart, read at either scope.
 *
 * ── IT READS THE BACKEND NOW, NOT A FIXTURE ──
 *
 * `GET /api/v1/leases/financials` through the module's own API layer — see
 * `_api/leases-api.ts` for the mapping and `app/api/leases/[endpoint]/route.ts`
 * for why the call goes through our origin. Nothing on screen moved: the same
 * tiles, the same chart, the same table, filled from the member's own record
 * instead of `_lib/financials-record.ts`.
 *
 * THREE OUTCOMES, ALL HANDLED HERE. A request that is still running, one that
 * failed, and one that answered. The loading and failed states are this
 * component's own because they belong to the fetch; everything below the fetch
 * is `FinancialsView`, which only ever sees a loaded record and so keeps every
 * piece of state it had.
 *
 * SPLIT IN TWO FOR THE STATE'S SAKE, not for tidiness. The window the brush
 * moves is initialised from the last FILED month, which is a fact about the
 * response — so it cannot be a `useState` initialiser in a component that
 * renders before the response exists. Mounting the view once the record is in
 * hand means no conditional hooks and no effect re-seeding a range the reader
 * has already dragged.
 *
 * ── THE PRICE DECK IS GONE FROM THIS PANEL ──
 *
 * The cash line used to be gas and oil run through `cashAt` in the browser. The
 * response carries `cash_gross` and `cash_share` per month, so the money on the
 * chart is now the money the service calculated. One less place for our
 * arithmetic to disagree with the statement a reader is holding.
 */
export function FinancialsPanel() {
  const [data, setData] = useState<LeaseFinancials | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let live = true;

    /* NOTHING IS SET SYNCHRONOUSLY HERE. The effect runs once, on mount, with
       both pieces of state already at their initial values, so a `setError(null)`
       before the call would be a no-op that re-renders — and the one
       `react-hooks/set-state-in-effect` is pointing at. The two writes below
       are in async callbacks, which is what an effect is for. */
    fetchLeaseFinancials(controller.signal)
      .then((record) => {
        if (live) setData(record);
      })
      .catch((cause: unknown) => {
        /* Our own unmount, not a failure — the component is going away and has
           nothing to report. */
        if (controller.signal.aborted || !live) return;
        setError(
          cause instanceof LeasesApiError
            ? cause.message
            : "Could not load your lease financials.",
        );
      });

    return () => {
      live = false;
      controller.abort();
    };
  }, []);

  if (error) {
    return (
      <Notice tone="amber" glyph="⚠">
        {error}
      </Notice>
    );
  }

  if (!data) return <FinancialsLoading />;

  return <FinancialsView data={data} />;
}

/**
 * WHILE THE RECORD IS ON ITS WAY.
 *
 * Blocks the shape the panel is about to take — three tiles and a chart — at
 * the heights they render at, so the tab does not jump when the answer lands
 * and the page below it does not reflow. `aria-busy` with a live label, because
 * a screen reader gets nothing at all from three grey rectangles.
 */
function FinancialsLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your lease financials…</span>
      <div className="mb-4 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div
            key={key}
            className="h-[108px] animate-pulse rounded-mv border border-mv-line bg-mv-portal-wash"
          />
        ))}
      </div>
      <Card padded={false} className="px-[18px] py-4">
        <div className="h-[260px] animate-pulse rounded-mv bg-mv-portal-wash" />
      </Card>
    </div>
  );
}

/**
 * THE PANEL PROPER, given a record.
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
 * THE TWO SCOPES ARE TWO SETS OF FIGURES FROM THE RESPONSE, not one set and a
 * multiplier — the service sends both, so switching picks rather than scales.
 *
 * ── THE WINDOW STARTS ASTRIDE THE JOIN ──
 *
 * Not at the start of the record and not at the end: the default window is the
 * two years either side of the last filing, so the first thing on screen is the
 * handover from what was filed to what is modelled. The record's first decade —
 * one lease, almost flat — is a scroll away in the strip underneath, where it
 * is context rather than four fifths of the picture.
 */
function FinancialsView({ data }: { data: LeaseFinancials }) {
  const [scope, setScope] = useState<FinancialsScope>("share");
  const [mode, setMode] = useState<ChartMode>("both");
  const [range, setRange] = useState(() =>
    windowAround(DEFAULT_WINDOW_MONTHS, data.lastPostedIndex, data.length),
  );

  /* The three streams at the chosen scope — a pick, not a calculation. Memoised
     because these are 500-element arrays and the window moves on every frame of
     a brush drag. */
  const streams = useMemo(
    () => (scope === "share" ? data.share : data.lease),
    [scope, data],
  );

  const { left, right } = seriesFor(mode, streams);
  const firstMonth = data.firstMonth;
  const months = range.to - range.from + 1;
  const labelFor = (index: number) => shortMonthLabel(firstMonth + index);
  const filedThrough = monthLabel(firstMonth + data.lastPostedIndex);

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

      <FinancialsTiles
        scope={scope}
        totals={scope === "share" ? data.totals.share : data.totals.lease}
        filedThrough={data.historyEndLabel}
      />

      <Card padded={false} className="px-[18px] py-4">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SegmentedControl
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
              solid to {filedThrough}, lighter after
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
          lastPostedIndex={data.lastPostedIndex}
          firstMonth={firstMonth}
          summary={`${chartTitle(mode, scope)}, ${labelFor(range.from)} to ${labelFor(range.to)}. Filed through ${filedThrough}; modelled after that.`}
        />

        <div className="mt-2 mb-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11.5px] text-mv-muted tabular-nums">
            Showing {labelFor(range.from)} to {labelFor(range.to)} · {months}{" "}
            months of {data.length}
          </p>
          <RangePresets
            months={months}
            lastPostedIndex={data.lastPostedIndex}
            length={data.length}
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
      <MonthTable data={data} scope={scope} />
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
          tone === "gas" ? "bg-mv-green-deep" : "bg-mv-oil"
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
