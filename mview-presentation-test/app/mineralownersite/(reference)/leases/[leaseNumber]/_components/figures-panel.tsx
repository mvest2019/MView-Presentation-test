"use client";

import { useMemo, useState } from "react";

import { Card } from "../../../../_components/ui/card";
import {
  Banknote,
  CalendarDays,
  Flame,
  Landmark,
  Layers,
  TrendingUp,
} from "lucide-react";

import { KpiTile } from "../../../../_components/ui/kpi-tile";
import { LeaseOverviewHeader } from "./lease-overview-header";
import { RangePresets } from "../../_components/financials/range-presets";
import { ChartBrush } from "../../_components/financials/chart-brush";
import { SegmentedControl } from "../../../../_components/ui/segmented-control";
import { PillStrip } from "../../_components/financials/pill-strip";
import {
  CHART_MODES,
  CHART_MODE_COPY,
  type ChartMode,
} from "../../_components/financials/chart-modes";
import { financialsSeries } from "../../_lib/financials-series";
import {
  formatAcres,
  formatCompactDollars,
  formatCompactVolume,
  formatDecimalInterest,
  formatDollars,
} from "../../_lib/lease-format";
import { shortMonthLabel } from "../../_lib/months";
import { cashAt } from "../../_lib/price-deck";
import {
  leaseCountyExplainer,
  leaseGasExplainer,
  leaseLastMonthExplainer,
  leaseShapeExplainer,
  leaseValueExplainer,
  leaseYearExplainer,
} from "../_lib/explainers-lease";
import type { LeaseReport } from "../_lib/lease-report";
import { ExplainerDrawer, type Explainer } from "./explainer-drawer";
import { LeaseChart, type LeaseChartSeries } from "./lease-chart";

/**
 * THE FIGURES — six tiles and the production chart, at whichever scope is chosen.
 *
 * ── THE SCOPE SWITCH IS WHY THESE SHARE A COMPONENT ──
 *
 * "Your share" and "Whole lease" are the same figures divided by a number
 * between one and a hundred, and a reader who takes one for the other is wrong
 * by their entire decimal interest. So the switch, the tiles and the chart are
 * one piece of state: there is no arrangement of this page in which the tiles
 * show one scope and the chart the other.
 *
 * The caption beside the switch always names the actual interest, because
 * "your share" means nothing without the number it is a share of.
 *
 * ── THE WINDOW IS THE SAME 49 MONTHS THE PORTFOLIO CHART USES ──
 *
 * Two years either side of the last filing, and the brush underneath moves it.
 * Consistency between the two charts matters more than tuning each one: a
 * reader comparing a lease against the portfolio should not have to check the
 * axes first.
 */

type FigureScope = "share" | "lease";

const DEFAULT_WINDOW_MONTHS = 49;

export function FiguresPanel({ report }: { report: LeaseReport }) {
  const { lease } = report;
  const [scope, setScope] = useState<FigureScope>("share");
  const [explainer, setExplainer] = useState<Explainer | null>(null);
  const [mode, setMode] = useState<ChartMode>("both");
  /* WHOSE SERIES THIS PANEL IS DRAWING.
     A served lease carries its own months — see `LeaseReport.series` — and a
     fixture lease is a row of the shared table. Everything below reads the
     window, the seam and the axis off whichever of the two is in hand, so the
     chart, the brush and the readout cannot end up describing different
     months. */
  const served = report.series;
  const length = served ? served.labels.length : financialsSeries.length;
  const postedThrough = served
    ? served.lastPostedIndex
    : financialsSeries.lastPostedIndex;

  const [range, setRange] = useState(() => {
    const behind = Math.round((DEFAULT_WINDOW_MONTHS - 1) * 0.48);
    const from = Math.max(0, postedThrough - behind);
    return {
      from,
      to: Math.min(from + DEFAULT_WINDOW_MONTHS - 1, length - 1),
    };
  });

  const factor = scope === "share" ? lease.decimalInterest : 1;

  /** How wide the window is now — which preset reads as pressed. */
  const months = range.to - range.from + 1;

  const streams = useMemo(() => {
    /* THE SERVICE SENDS BOTH SCOPES, so the toggle picks one rather than
       multiplying the other by the decimal: its own arithmetic and ours round
       differently, and this panel prints the result to the dollar. */
    if (served) return scope === "share" ? served.share : served.gross;

    const series = financialsSeries.byLease.find(
      (entry) => entry.slug === lease.slug,
    );
    const gas = (series?.gas ?? []).map((value) => value * factor);
    const oil = (series?.oil ?? []).map((value) => value * factor);
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
  }, [served, scope, lease.slug, factor]);

  const { left, right } = seriesFor(mode, streams);
  const labelFor = (index: number) =>
    served
      ? (served.labels[index] ?? "")
      : shortMonthLabel(financialsSeries.firstMonth + index);

  return (
    <div>
      <LeaseOverviewHeader lease={lease} />

      <Card
        padded={false}
        className="mt-4 flex flex-wrap items-center gap-3 px-[18px] py-3"
      >
        <span className="text-[10.5px] font-bold tracking-[0.08em] text-mv-muted uppercase">
          Figures
        </span>
        <PillStrip
          label="Whose figures to show"
          tone="dark"
          value={scope}
          onChange={setScope}
          options={[
            { value: "share", label: "Your share" },
            { value: "lease", label: "Whole lease" },
          ]}
        />
        <p className="text-[12.5px] text-mv-muted">
          {scope === "share"
            ? `at your decimal interest of ${formatDecimalInterest(lease.decimalInterest)}`
            : "the whole lease, before any decimal interest is applied"}
        </p>
      </Card>

      <div className="mt-4 grid gap-[18px] sm:grid-cols-2 xl:grid-cols-3">
        <KpiTile
          locked
          size="sm"
          flat
          icon={<CalendarDays className="h-[18px] w-[18px]" />}
          onExplain={() => setExplainer(leaseLastMonthExplainer(report, scope))}
          label={`${scopeWord(scope)} · last posted month`}
          value={formatDollars(
            report.lastMonthShare * scale(scope, lease.decimalInterest),
          )}
          basis={report.lastMonthLabel}
        />
        <KpiTile
          locked
          size="sm"
          flat
          icon={<Banknote className="h-[18px] w-[18px]" />}
          onExplain={() => setExplainer(leaseYearExplainer(report, scope))}
          label={`${scopeWord(scope)} · this year so far`}
          value={formatDollars(
            report.yearToDateShare * scale(scope, lease.decimalInterest),
          )}
          basis={`12 filed months to ${report.lastPosting}`}
        />
        <KpiTile
          size="sm"
          flat
          icon={<Flame className="h-[18px] w-[18px]" />}
          onExplain={() => setExplainer(leaseGasExplainer(report, scope))}
          label={`Gas filed to date · ${scopeWord(scope).toLowerCase()}`}
          value={`${formatCompactVolume(report.gasFiled * scale(scope, lease.decimalInterest))} MCF`}
          basis={`${formatCompactVolume(report.oilFiled * scale(scope, lease.decimalInterest))} BBL of oil · ${report.postedMonths} posted months`}
        />
        <KpiTile
          locked
          size="sm"
          flat
          icon={<TrendingUp className="h-[18px] w-[18px]" />}
          onExplain={() => setExplainer(leaseValueExplainer(report, scope))}
          label={`Value · ${scopeWord(scope).toLowerCase()}`}
          value={formatCompactDollars(
            report.yourValue * scale(scope, lease.decimalInterest),
          )}
          basis={`range ${formatCompactDollars(report.yourValueLow * scale(scope, lease.decimalInterest))} – ${formatCompactDollars(report.yourValueHigh * scale(scope, lease.decimalInterest))}`}
        />
        <KpiTile
          size="sm"
          flat
          icon={<Landmark className="h-[18px] w-[18px]" />}
          onExplain={() => setExplainer(leaseCountyExplainer(report, scope))}
          label="County appraised · your interest"
          value={formatCompactDollars(report.countyYourInterest)}
          basis={`${report.countyAgreementPercent.toFixed(1)}% of the model's figure`}
        />
        <KpiTile
          size="sm"
          flat
          icon={<Layers className="h-[18px] w-[18px]" />}
          onExplain={() => setExplainer(leaseShapeExplainer(report, scope))}
          label="Wells · acres · reservoir"
          value={`${lease.wells} / ${lease.wells}`}
          basis={`${formatAcres(lease.acres)} acres · ${lease.reservoir}`}
        />
      </div>

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
            {scope === "share"
              ? `the same month at this lease's own decimal interest of ${formatDecimalInterest(lease.decimalInterest)}`
              : CHART_MODE_COPY[mode].note}
          </p>
          {/* 2 YR · 5 YR · 10 YR · ALL, WHICH THIS TAB DID NOT HAVE.
              The brush under the chart could always set the window, but only by
              dragging — there was no way to ask for five years on the tab most
              readers open first, while both of the other two offered it. The
              presets are the same component and the same arithmetic, so a
              window means the same thing on all three.

              `ml-auto` rather than `justify-between` on the row: the note
              beside the control varies with `scope` and `mode`, and the presets
              stay pinned right whether it wraps or not. */}
          <div className="ml-auto">
            <RangePresets
              months={months}
              lastPostedIndex={postedThrough}
              length={length}
              onChange={setRange}
            />
          </div>
        </div>

        <LeaseChart
          left={left}
          right={right}
          from={range.from}
          to={range.to}
          postedThrough={postedThrough}
          labelAt={labelFor}
          summary={`${CHART_MODE_COPY[mode].title} for ${lease.name}, ${labelFor(range.from)} to ${labelFor(range.to)}. Filed through ${report.lastPosting}; modelled after that.`}
        />

        <p className="mt-2 text-[12px] leading-[1.55] text-mv-slate">
          <strong>Drag either handle</strong> to change the window, or use the
          arrow keys once a handle has focus — shift moves a year at a time.
          Every figure is that net volume multiplied by your own decimal
          interest on this lease.
        </p>

        <div className="mt-2">
          <ChartBrush
            values={streams.gas}
            from={range.from}
            to={range.to}
            onChange={setRange}
            labelFor={labelFor}
          />
        </div>
      </Card>

      <ExplainerDrawer
        explainer={explainer}
        onClose={() => setExplainer(null)}
      />
    </div>
  );
}

function scopeWord(scope: FigureScope): string {
  return scope === "share" ? "Your share" : "Whole lease";
}

/** The tiles hold the owner's figures; the whole lease divides back out. */
function scale(scope: FigureScope, interest: number): number {
  return scope === "share" ? 1 : 1 / interest;
}

function seriesFor(
  mode: ChartMode,
  streams: { gas: number[]; oil: number[]; cash: number[] },
): { left: LeaseChartSeries; right?: LeaseChartSeries } {
  const gas: LeaseChartSeries = {
    values: streams.gas,
    tone: "gas",
    title: "Gas · MCF / month",
    money: false,
  };
  const oil: LeaseChartSeries = {
    values: streams.oil,
    tone: "oil",
    title: "Oil · BBL / month",
    money: false,
  };

  if (mode === "gas") return { left: gas };
  if (mode === "oil") return { left: oil };
  if (mode === "cash") {
    return {
      left: {
        values: streams.cash,
        tone: "cash",
        title: "Cash · $ / month",
        money: true,
      },
    };
  }
  return { left: gas, right: oil };
}
