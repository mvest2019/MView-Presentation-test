"use client";

import { useMemo, useState } from "react";

import { Card } from "../../../../_components/ui/card";
import { KpiTile } from "../../../../_components/ui/kpi-tile";
import { ChartBrush } from "../../_components/financials/chart-brush";
import { PillStrip } from "../../_components/financials/pill-strip";
import { CHART_MODES, CHART_MODE_COPY, type ChartMode } from "../../_components/financials/chart-modes";
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
import type { LeaseReport } from "../_lib/lease-report";
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
  const [mode, setMode] = useState<ChartMode>("both");
  const [range, setRange] = useState(() => {
    const behind = Math.round((DEFAULT_WINDOW_MONTHS - 1) * 0.48);
    const from = Math.max(0, financialsSeries.lastPostedIndex - behind);
    return { from, to: Math.min(from + DEFAULT_WINDOW_MONTHS - 1, financialsSeries.length - 1) };
  });

  const factor = scope === "share" ? lease.decimalInterest : 1;

  const streams = useMemo(() => {
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
  }, [lease.slug, factor]);

  const { left, right } = seriesFor(mode, streams);
  const labelFor = (index: number) =>
    shortMonthLabel(financialsSeries.firstMonth + index);

  return (
    <div>
      <Card padded={false} className="mt-4 flex flex-wrap items-center gap-3 px-[18px] py-3">
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
          label={`${scopeWord(scope)} · last posted month`}
          value={formatDollars(report.lastMonthShare * scale(scope, lease.decimalInterest))}
          basis={report.lastMonthLabel}
        />
        <KpiTile
          locked
          label={`${scopeWord(scope)} · this year so far`}
          value={formatDollars(report.yearToDateShare * scale(scope, lease.decimalInterest))}
          basis={`12 filed months to ${report.lastPosting}`}
        />
        <KpiTile
          label={`Gas filed to date · ${scopeWord(scope).toLowerCase()}`}
          value={`${formatCompactVolume(report.gasFiled * scale(scope, lease.decimalInterest))} MCF`}
          basis={`${formatCompactVolume(report.oilFiled * scale(scope, lease.decimalInterest))} BBL of oil · ${report.postedMonths} posted months`}
        />
        <KpiTile
          locked
          label={`Value · ${scopeWord(scope).toLowerCase()}`}
          value={formatCompactDollars(
            report.yourValue * scale(scope, lease.decimalInterest),
          )}
          basis={`range ${formatCompactDollars(report.yourValueLow * scale(scope, lease.decimalInterest))} – ${formatCompactDollars(report.yourValueHigh * scale(scope, lease.decimalInterest))}`}
        />
        <KpiTile
          label="County appraised · your interest"
          value={formatCompactDollars(report.countyYourInterest)}
          basis={`${report.countyAgreementPercent.toFixed(1)}% of the model's figure`}
        />
        <KpiTile
          label="Wells · acres · reservoir"
          value={`${lease.wells} / ${lease.wells}`}
          basis={`${formatAcres(lease.acres)} acres · ${lease.reservoir}`}
        />
      </div>

      <Card padded={false} className="mt-4 px-[18px] py-4">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <PillStrip
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
        </div>

        <LeaseChart
          left={left}
          right={right}
          from={range.from}
          to={range.to}
          summary={`${CHART_MODE_COPY[mode].title} for ${lease.name}, ${labelFor(range.from)} to ${labelFor(range.to)}. Filed through ${report.lastPosting}; modelled after that.`}
        />

        <p className="mt-2 text-[12px] leading-[1.55] text-mv-slate">
          <strong>Drag either handle</strong> to change the window, or use the
          arrow keys once a handle has focus — shift moves a year at a time.
          Every figure is that net volume multiplied by your own decimal interest
          on this lease.
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
