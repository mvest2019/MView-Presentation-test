import { Badge } from "../../../../_components/ui/badge";
import { Card, CardHeader } from "../../../../_components/ui/card";
import { DEVELOPMENT_RINGS } from "../../_lib/report-fixtures";
import { formatCount, formatDollars } from "../../_lib/lease-format";
import type { LeaseReport } from "../_lib/lease-report";

/**
 * "WHAT THIS PAGE FOUND" — the whole report as seven sentences, most notable
 * first.
 *
 * ── IT IS THE PAGE'S OWN SUMMARY, AND IT COMES AFTER THE EVIDENCE ──
 *
 * Not before: a reader who has just looked at two charts and a reserves ring
 * can check each sentence against what they saw, which is the only thing that
 * makes a generated summary worth trusting. Put first it would be a set of
 * claims to take on faith.
 *
 * ── EVERY LINE IS DERIVED, INCLUDING THE ONES THAT SOUND LIKE JUDGEMENTS ──
 *
 * "Gas is falling about 1.2% a month compounded" is arithmetic on the trailing
 * window; "it is only a warning if it steepens" is the sentence that stops the
 * arithmetic being read as alarm. That pairing — a number and what it does not
 * mean — is the house style for this whole product, and it is what separates a
 * report from a dashboard.
 */
export function FindingsCard({ report }: { report: LeaseReport }) {
  const { lease } = report;
  const inner = DEVELOPMENT_RINGS[0];

  const findings = [
    <>
      {inner.leases} neighbouring leases sit within a mile of this one, run by{" "}
      {inner.operators} operators, {inner.producing} of them producing.
    </>,
    <>
      Its last filing came in {report.modelMissPercent >= 0 ? "+" : ""}
      {report.modelMissPercent.toFixed(1)}% against what the model expected for
      that month. Where the two disagree the filing is the fact and the model is
      what was wrong.
    </>,
    <>
      The stream yields {report.oilYield.toFixed(1)} BBL of oil for every
      thousand MCF of gas. Which product carries your money depends on that ratio
      and on where the two prices sit — not on which is the bigger number.
    </>,
    <>
      Its strongest month was {report.strongestMonth} at{" "}
      {report.gasPerDayHigh.toFixed(1)} MCF a day and its thinnest{" "}
      {report.thinnestMonth} at {report.gasPerDayLow.toFixed(1)} — a{" "}
      {spread(report.gasPerDayLow, report.gasPerDayHigh)} spread across one year
      on the same wells.
    </>,
    <>
      Gas is falling about {report.declinePerMonth.toFixed(1)}% a month
      compounded across that window. That is what a decline curve does — it is
      only a warning if it steepens.
    </>,
    <>
      Over the last twelve filed months ({report.trailingFrom} to{" "}
      {report.trailingTo}) this lease ran at{" "}
      {report.gasPerDayAvg.toFixed(1)} MCF and {report.oilPerDayAvg.toFixed(1)}{" "}
      BBL a day, between {report.gasPerDayLow.toFixed(1)} and{" "}
      {report.gasPerDayHigh.toFixed(1)} MCF.
    </>,
    <>
      Your share of those months came to{" "}
      {formatDollars(report.trailingShare)}: best in{" "}
      {report.bestMonthForYou} at {formatDollars(report.bestMonthShare)},
      thinnest in {report.thinnestMonthForYou} at{" "}
      {formatDollars(report.thinnestMonthShare)}.
    </>,
    <>
      {lease.wells} of {lease.wells} well{lease.wells === 1 ? "" : "s"} on this
      lease {lease.wells === 1 ? "has" : "have"} a filed surface and bottom hole.
      Where no directional survey is recorded the map draws a straight line
      between the two — that is the state record, not the path the bit actually
      took.
    </>,
  ];

  return (
    <Card padded={false} className="mt-4 px-[22px] py-[18px]">
      <CardHeader
        title={<h3 className="text-[15px] font-bold">What this page found</h3>}
        action={
          <Badge tone="slate" size="xs">
            most notable first
          </Badge>
        }
      />

      <ul className="mt-3 divide-y divide-mv-line">
        {findings.map((finding, position) => (
          <li
            key={position}
            className="flex items-start gap-3 py-2.5 text-[13px] leading-[1.6] text-mv-slate"
          >
            <span
              aria-hidden="true"
              className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-mv-green"
            />
            <span className="min-w-0">{finding}</span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[11.5px] leading-[1.55] text-mv-muted">
        The filed record ends at {report.lastPosting} and the model carries this
        lease {formatCount(report.forward.length)} months further and beyond.
        Everything past that boundary is a projection at a fixed price deck.
      </p>
    </Card>
  );
}

/** "1.2×" — how far the best month ran ahead of the worst. */
function spread(low: number, high: number): string {
  return low > 0 ? `${(high / low).toFixed(1)}×` : "—";
}
