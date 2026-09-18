"use client";

import { useState } from "react";

import { Card } from "../../../../_components/ui/card";
import {
  ReadoutCard,
  ReadoutMarks,
  readoutValue,
  type Readout,
} from "../../_components/financials/chart-readout";
import {
  AXIS_LABEL_Y,
  CHART,
  PLOT,
  axisMax,
  formatTick,
  labelIndices,
  xAt,
  yAt,
} from "../../_lib/chart-geometry";
import { financialsSeries } from "../../_lib/financials-series";
import { formatCount } from "../../_lib/lease-format";
import { shortMonthLabel } from "../../_lib/months";
import type { LeaseReport } from "../_lib/lease-report";

/**
 * "FILED TO DATE, AND WHAT IS STILL TO COME" — the running total, not the rate.
 *
 * ── A CUMULATIVE CURVE ANSWERS A QUESTION A MONTHLY ONE CANNOT ──
 *
 * The chart above this shows a lease declining, which every lease does and which
 * tells a reader nothing about how much is left. This one shows the total
 * flattening out: where the curve stops climbing is where the lease stops
 * paying, and the height of the pale band is the only figure on the page that
 * speaks to how long that is.
 *
 * ── THE PALE BAND IS THE MODEL AND IT IS DRAWN ON TOP, NOT BESIDE ──
 *
 * Filed and projected are the same quantity continuing, so they are one shape
 * in two tones rather than two shapes. The dashed rule is where the filings
 * stop; everything above and right of it is the model's, and the chips under
 * the axis name both halves.
 */
export function CumulativeCard({ report }: { report: LeaseReport }) {
  const series = report.cumulativeGas;
  /** Whether there is a curve at all — see the note in the body. */
  const hasGas = series.some((value) => value > 0);
  /* A SERVED LEASE NAMES ITS OWN POINTS. Its curve is however many months the
     service sent, on its own calendar; the fixture's curve is a row of the
     shared table and is named off `firstMonth`. Running the axis to the shared
     table's length on a served curve would plot 75 points across 296 slots and
     label them with somebody else's months. */
  const labels = report.cumulativeLabels;
  const nameOf = (index: number) =>
    labels
      ? (labels[index] ?? "")
      : shortMonthLabel(financialsSeries.firstMonth + index);

  /* ── WHERE THE CURVE STARTS ──
     A SERVED LEASE STARTS WHERE ITS OWN ARRAY STARTS — index 0, zeros and all.
     The service sends `cumulative[]` already trimmed to this lease: the first
     point is the lease's own first quarter, so a leading zero is not padding,
     it is the quarter the lease existed and filed nothing. Skipping those made
     the axis open at "Sep 2013" while the payload's first point was "Dec 2012",
     and a chart whose first month disagrees with the first row of the response
     is a chart nobody can check.

     THE FIXTURE PATH STILL SKIPS THEM, because there the curve is a row of one
     shared 296-month calendar running from 1993 — every lease carries a decade
     or more of flat zero before it was drilled, and that is padding rather than
     record. */
  const from = labels ? 0 : series.findIndex((value) => value > 0);
  const to = (labels ? labels.length : financialsSeries.length) - 1;
  const max = axisMax(series[to]);
  const splitX = xAt(report.cumulativeFiledIndex, from, to);

  /* ── THE HOVER READOUT ──
     The same card the month-by-month chart and the financials chart drop, from
     `chart-readout.tsx`, so a reader meets one tooltip on every chart in the
     module rather than a different one per card. It shares this chart's
     geometry — both measure in the same 1000-unit viewBox — so the guide line
     lands on the point rather than near it.

     ONE ROW, because the curve is one line. A cumulative chart's slope is the
     rate, and a "this month" figure would be tempting to add here and wrong:
     `cumulative[]` is sampled by the service rather than monthly, so the gap
     between two points is not a month and the difference between them is not a
     month's gas. The monthly figures have their own chart. */
  const [readout, setReadout] = useState<Readout | null>(null);

  function track(event: React.PointerEvent<SVGRectElement>): void {
    const box = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!box || box.width === 0) return;

    const unitsX = ((event.clientX - box.left) / box.width) * CHART.width;
    const span = Math.max(to - from, 1);
    const raw = from + ((unitsX - PLOT.left) / (PLOT.right - PLOT.left)) * span;
    const index = Math.min(to, Math.max(from, Math.round(raw)));
    const value = series[index] ?? 0;

    setReadout({
      index,
      month: nameOf(index),
      /* `cumulativeFiledIndex` is the last point still on the filed record, so
         everything past it is the model's — which is the same line the chart
         draws its divider on. */
      posted: index <= report.cumulativeFiledIndex,
      pointDepth: (yAt(value, max) - PLOT.top) / (PLOT.bottom - PLOT.top),
      rows: [
        {
          tone: "gas",
          label: "Running total · MCF",
          value: readoutValue(value, "Running total · MCF", false),
        },
      ],
    });
  }

  return (
    <Card padded={false} className="mt-4 px-[22px] py-[18px]">
      <h3 className="text-[15px] font-bold">
        Filed to date, and what is still to come
      </h3>
      <p className="mt-0.5 text-[12px] text-mv-muted">
        your share of the gas, as a running total
      </p>

      {/* A LEASE THAT HAS NEVER FILED GAS HAS NO GAS CURVE, and this card is
          about gas alone. The fixture's ten leases all produce some, so the
          chart below had never met a series that is zero all the way along —
          it divided by that zero and drew `L56.0,NaN`, which a browser refuses
          to render and reports as a broken path on every repaint.

          An oil lease is the ordinary case for this, not an edge one: it is
          the whole point of `oil_share` sitting beside `gas_share` on the
          record. The oil totals are printed by the reserves card above; what
          belongs here is the reason this one is empty. */}
      {!hasGas ? (
        <p className="mt-3 text-[12.5px] leading-[1.6] text-mv-slate">
          This lease has filed no gas — its production is oil. The oil totals,
          filed and still to come, are in the panel above.
        </p>
      ) : (
        <>
          {/* THE POSITIONED PARENT IS THE CHART ALONE, not the chart and its
              caption. `ReadoutCard` places itself by percentage of this box's
              height, so a paragraph inside it would push the tooltip down the
              plot by however many lines the paragraph happens to wrap to. */}
          <div className="relative">
            {readout && <ReadoutCard readout={readout} from={from} to={to} />}

            <svg
              viewBox={`0 0 ${CHART.width} ${AXIS_LABEL_Y + 14}`}
              className="mt-3 w-full"
              role="img"
              aria-label={`Running total of your gas from this lease: ${formatCount(Math.round(report.gasProduced))} MCF filed through ${report.lastPosting}, and a further ${formatCount(Math.round(report.gasReserves))} MCF projected.`}
            >
              {[0, max / 2, max].map((value) => (
                <g key={value}>
                  <line
                    x1={PLOT.left}
                    x2={PLOT.right}
                    y1={yAt(value, max)}
                    y2={yAt(value, max)}
                    className="stroke-mv-line"
                    strokeWidth={1}
                  />
                  <text
                    x={PLOT.left - 10}
                    y={yAt(value, max) + 4}
                    textAnchor="end"
                    className="fill-mv-muted text-[10px] font-semibold"
                  >
                    {formatTick(value, false)}
                  </text>
                </g>
              ))}

              {/* The whole curve in the pale tone, then the filed part painted over
            it — one shape, two tones, and no seam at the join. */}
              <path
                d={areaPath(series, from, to, max)}
                className="fill-mv-green-deep/25"
              />
              <path
                d={areaPath(series, from, report.cumulativeFiledIndex, max)}
                className="fill-mv-green-deep/85"
              />

              <line
                x1={splitX}
                x2={splitX}
                y1={PLOT.top}
                y2={PLOT.bottom}
                className="stroke-mv-line-strong"
                strokeWidth={1}
                strokeDasharray="4 4"
              />

              {labelIndices(from, to, 5).map((index) => (
                <text
                  key={index}
                  x={xAt(index, from, to)}
                  y={AXIS_LABEL_Y}
                  textAnchor="middle"
                  className="fill-mv-muted text-[10px]"
                >
                  {nameOf(index)}
                </text>
              ))}

              {/* AT THE TOP, ON THE DIVIDER, rather than in two pills under the axis.
            The label belongs to the line it names: beside it, a reader takes in
            "this side filed, that side modelled" in the same glance that finds
            the divider. Under the axis the pills sat below the months, a row
            away from the thing they described.

            The arrows are the half that makes it work — two words either side
            of a line are otherwise just two words near a line. */}
              <text
                x={splitX - 12}
                y={PLOT.top + 2}
                textAnchor="end"
                className="fill-mv-muted text-[10px] font-bold tracking-[0.08em] uppercase"
              >
                ← Filed
              </text>
              <text
                x={splitX + 12}
                y={PLOT.top + 2}
                textAnchor="start"
                className="fill-mv-green-deep text-[10px] font-bold tracking-[0.08em] uppercase"
              >
                Projected →
              </text>
              {readout && (
                <ReadoutMarks
                  readout={readout}
                  from={from}
                  to={to}
                  points={[
                    { tone: "gas", y: yAt(series[readout.index] ?? 0, max) },
                  ]}
                />
              )}

              {/* THE SURFACE THE POINTER IS TRACKED ON. Transparent and over the
                whole plot, so a reader does not have to find the line — the
                nearest point is whichever month they are above. */}
              <rect
                aria-hidden="true"
                x={PLOT.left}
                y={PLOT.top}
                width={PLOT.right - PLOT.left}
                height={PLOT.bottom - PLOT.top}
                fill="transparent"
                onPointerMove={track}
                onPointerLeave={() => setReadout(null)}
              />
            </svg>
          </div>

          <p className="mt-3 text-[12.5px] leading-[1.6] text-mv-slate">
            <strong>{formatCount(Math.round(report.gasProduced))} MCF</strong>{" "}
            of gas has reached you from this lease so far. The model projects a
            further{" "}
            <strong>{formatCount(Math.round(report.gasReserves))} MCF</strong>{" "}
            before the curve runs out — the height of the pale band, and the
            only figure here that speaks to how long this lease keeps paying.
          </p>
        </>
      )}
    </Card>
  );
}

/** The area under a running total, closed along the floor. */
function areaPath(
  values: number[],
  from: number,
  to: number,
  max: number,
): string {
  const points: string[] = [];
  for (let index = from; index <= to; index += 1) {
    points.push(
      `${xAt(index, from, values.length - 1).toFixed(1)},${yAt(values[index], max).toFixed(1)}`,
    );
  }
  const left = xAt(from, from, values.length - 1).toFixed(1);
  const right = xAt(to, from, values.length - 1).toFixed(1);
  return `M${left},${PLOT.bottom}L${points.join("L")}L${right},${PLOT.bottom}Z`;
}
