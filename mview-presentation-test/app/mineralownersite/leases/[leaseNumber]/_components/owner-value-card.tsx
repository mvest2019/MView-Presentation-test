import { Badge } from "../../../_components/ui/badge";
import { portalGate } from "../../../_components/ui/portal-gating";
import {
  formatDecimalInterest,
  formatDollars,
} from "../../_lib/lease-format";
import type { LeaseReportRecord } from "../_lib/lease-report-types";

/**
 * THE OWNER CARD — one big number, and everything that supports it.
 *
 * ── WHY ONLY ONE FIGURE IS LARGE ──
 *
 * An earlier pass rendered six dollar figures and four owner-count fields at the
 * same size and weight, each with its own explanatory subtitle. The note against
 * it was "too much information, hard to digest" — nothing told the eye where to
 * start, and the least important number carried the most text.
 *
 * One question matters here: what is this worth to me. So the owner's share is
 * the only big thing on the card, and every other figure the design asks for is
 * still present — demoted to a quiet supporting row, grouped under the heading
 * that names the decimal interest they all hang off.
 *
 * ── EVERY DERIVATION IS BEHIND ONE DISCLOSURE ──
 *
 * The ÷DI arithmetic, the estimate-not-an-appraisal statement, the range
 * assumptions, and the honest "owner counts are pending" all live in a single
 * `<details>`: reachable, smaller, later — never absent. Five separate
 * footnotes is how a card becomes a wall.
 *
 * A NATIVE `<details>`, not the shared `ExplainPanel`, for one reason: this one
 * sits on the dark card and needs its own light-on-dark palette. Reaching for the
 * shared component and overriding six colours would be more code than this.
 *
 * ── WHAT IS DELIBERATELY ABSENT ──
 *
 * The status row ("Producing · 1 of 1 wells") — it lives once, in the title card.
 * The working-interest row — the operator row above says it once. Both were
 * removed from this card in the design for exactly that reason.
 */
export function OwnerValueCard({ report }: { report: LeaseReportRecord }) {
  const { lease } = report;
  const hasRanges = report.nextMonth.high > 0;
  const midpoint = (low: number, high: number) => Math.round((low + high) / 2);

  return (
    <div
      role="group"
      aria-label="Your interest in this lease"
      /* `ultraKeep`: the design pins this card across all four tiers and the
         whole report stack — the Ultra sentence ends "your share: the number
         above", which needs a number above it. */
      className={`mb-3.5 rounded-mv p-[18px] text-white shadow-mv-lg bg-[linear-gradient(160deg,var(--color-mv-ink),var(--color-mv-portal-band-end))] ${portalGate.ultraKeep}`}
    >
      <div className="flex flex-wrap items-stretch gap-x-[26px] gap-y-3 px-0.5">
        <div className="flex min-w-[240px] flex-1 flex-col justify-center gap-1 px-1.5 pt-1.5 pb-1">
          <span className="text-[10.5px] font-extrabold tracking-[0.06em] text-mv-on-deep-accent uppercase">
            Your share — MVestimate value
          </span>
          <span
            /* The lapsed gate: this is an all-ten-lease-family figure in the
               sense the rule cares about — see `ValueBand`. The claimed gate is
               `cl-lock`, applied to the same element. */
            data-mv-portfolio-figure=""
            className={`text-[38px] leading-[1.02] font-extrabold tabular-nums text-mv-on-deep-accent min-[820px]:text-[46px] ${portalGate.lockedValue}`}
          >
            {lease.mvestimate > 0
              ? formatDollars(lease.mvestimate)
              : formatDollars(lease.countyAppraised)}
          </span>
          <span className="text-[11px] leading-[1.5] text-mv-on-deep-soft">
            {lease.mvestimate > 0 ? (
              <>
                the Mineral View estimate of <em>your</em> interest · six-year
                projection · <Badge tone="estimate" size="xs">Estimate — not an appraisal</Badge>
              </>
            ) : (
              <>
                the county&rsquo;s appraised value of <em>your</em> interest — the
                model projects no forward income on this lease, so the county
                figure is shown instead of a bare $0
              </>
            )}
          </span>
        </div>

        <div className="flex min-w-[260px] flex-1 flex-col justify-center border-mv-on-deep-accent/20 py-0.5 min-[820px]:border-l min-[820px]:pl-5">
          <div className="pb-0.5 text-[9.5px] font-extrabold tracking-[0.08em] text-mv-on-deep-soft uppercase">
            Your interest · DI {formatDecimalInterest(lease.decimalInterest)}
          </div>
          <ValueRow
            label={`County appraised — your interest · 2026`}
            value={formatDollars(lease.countyAppraised)}
          />
          {hasRanges ? (
            <>
              <ValueRow
                locked
                label={`Next month · ${report.nextMonth.label}`}
                value={`${formatDollars(report.nextMonth.low)} – ${formatDollars(report.nextMonth.high)}`}
              />
              <ValueRow
                locked
                label={`Next quarter · ${report.nextQuarter.label}`}
                value={`${formatDollars(report.nextQuarter.low)} – ${formatDollars(report.nextQuarter.high)}`}
              />
            </>
          ) : (
            <p className="py-1 text-[11px] leading-[1.5] text-mv-on-deep-soft">
              Forward monthly and quarterly ranges need this lease&rsquo;s decline
              curve, which is not captured in this build — so none is shown rather
              than one invented.
            </p>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-baseline gap-x-5 gap-y-1 border-t border-mv-on-deep-accent/20 px-1 pt-[7px] pb-0.5 text-[10.5px] text-mv-on-deep-soft">
        <span>
          Owner counts (mineral · royalty · override): pending — the
          interest-pool feed is not wired yet.
        </span>
        <details className="min-w-[240px] flex-1">
          <summary className="inline-block cursor-pointer list-none font-extrabold text-mv-on-deep-accent [&::-webkit-details-marker]:hidden">
            <span aria-hidden="true">ⓘ </span>How these figures are calculated —
            this card and the lease card above
          </summary>
          <div className="my-2 rounded-[10px] border border-mv-on-deep-accent/25 bg-mv-green-ink/55 px-[13px] py-2.5 text-[11.5px] leading-[1.55] text-mv-on-deep">
            {lease.mvestimate > 0 && report.depth === "full" && (
              <p className="mb-[7px]">
                <strong>
                  Your share — {formatDollars(lease.mvestimate)} (MVestimate).
                </strong>{" "}
                The unit&rsquo;s modeled six-year gross projection of{" "}
                {formatDollars(report.grossValuation)} × your decimal interest{" "}
                {formatDecimalInterest(lease.decimalInterest)} ≈{" "}
                {formatDollars(lease.mvestimate)}. Built from the public
                production record and our decline model —{" "}
                <strong>an estimate, not an appraisal</strong>.
              </p>
            )}
            <p className="mb-[7px]">
              <strong>
                County appraised — {formatDollars(lease.countyAppraised)}.
              </strong>{" "}
              {lease.county} CAD&rsquo;s 2026 tax value of <em>your</em>
              interest, read from the appraisal roll. Tax values and forward
              projections answer different questions, so a gap between them is a
              methodology difference, not an error.
            </p>
            {report.depth === "full" && (
              <p className="mb-[7px]">
                <strong>
                  Whole-unit appraised — ≈{" "}
                  {formatDollars(report.wholeUnitAppraised)} · derived.
                </strong>{" "}
                Our arithmetic, not a CAD figure: your interest&rsquo;s appraised{" "}
                {formatDollars(lease.countyAppraised)} ÷ DI{" "}
                {formatDecimalInterest(lease.decimalInterest)}. The county
                appraises interests, not units — no roll publishes this number.
              </p>
            )}
            {hasRanges && (
              <p className="mb-[7px]">
                <strong>
                  Next month {formatDollars(report.nextMonth.low)} –{" "}
                  {formatDollars(report.nextMonth.high)} (midpoint ~
                  {formatDollars(midpoint(report.nextMonth.low, report.nextMonth.high))})
                  · next quarter {formatDollars(report.nextQuarter.low)} –{" "}
                  {formatDollars(report.nextQuarter.high)} (midpoint ~
                  {formatDollars(midpoint(report.nextQuarter.low, report.nextQuarter.high))}).
                </strong>{" "}
                Ranges, never points: gas prices are held flat, and gathering and
                compression deducts differ lease by lease — we cannot see this
                operator&rsquo;s.
              </p>
            )}
            <p>
              <strong>Owner counts — pending.</strong> The interest-pool feed that
              would count the mineral, royalty and override owners on this unit is
              not wired yet, so we show no numbers rather than invented ones. The
              one working-interest party this record establishes is the operator,{" "}
              {lease.operator}.
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}

function ValueRow({
  label,
  value,
  locked = false,
}: {
  label: string;
  value: string;
  locked?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-3 py-[2.5px] text-xs">
      <span className="flex-1 font-semibold text-mv-on-deep-accent">
        {label}
      </span>
      <span
        className={`font-extrabold whitespace-nowrap tabular-nums text-mv-on-deep ${
          locked ? portalGate.lockedValue : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
