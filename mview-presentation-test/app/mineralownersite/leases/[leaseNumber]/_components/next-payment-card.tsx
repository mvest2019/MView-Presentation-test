import { Badge } from "../../../_components/ui/badge";
import { PrototypeButton } from "../../../_components/ui/prototype-button";
import { portalGate } from "../../../_components/ui/portal-gating";
import { formatDollars } from "../../_lib/lease-format";
import type { LeaseReportRecord } from "../_lib/lease-report-types";

/**
 * "WHAT THIS UNIT LOOKS SET TO PAY YOU NEXT" — two ranges, and why they are ranges.
 *
 * ── A RANGE, NEVER A POINT ──
 *
 * This is the number an owner actually opens the page for, and it is the easiest
 * one to overstate. A gas unit's cheque depends on how rich its gas is, on
 * flaring, and on gathering and compression deducts that differ lease by lease
 * and that we cannot see in advance. A single figure would imply we can see all
 * of it. So the card leads with a range, prints the midpoint underneath in
 * smaller type, and the badge says "estimate with a range — not a promise".
 *
 * ── AND NO ACCURACY CLAIM ──
 *
 * The disclosure offers a way to narrow it — give us the division order and the
 * last few cheques and we fit the model against what was actually paid — and
 * then explicitly declines to claim an accuracy figure today, because that
 * number only exists once there is something to measure against. Withholding a
 * flattering statistic you cannot support is the whole point of the paragraph.
 *
 * ── NOT RENDERED WITHOUT A CURVE ──
 *
 * Eight of the ten leases have no captured decline curve, so there is nothing to
 * project. The card returns null for them rather than printing $0 – $0, and the
 * owner card above says why in its place.
 */
export function NextPaymentCard({ report }: { report: LeaseReportRecord }) {
  if (report.nextMonth.high <= 0) return null;

  const midpoint = (low: number, high: number) => Math.round((low + high) / 2);

  return (
    <div className="my-2.5 mb-4 rounded-mv border-2 border-mv-green bg-mv-card p-[22px] shadow-mv">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="mb-1 text-[15px] font-bold">
          What this unit looks set to pay you next
        </h4>
        <Badge tone="estimate" size="xs">
          Estimate with a range — not a promise
        </Badge>
      </div>

      <div className="my-2 grid gap-3 sm:grid-cols-2">
        {[report.nextMonth, report.nextQuarter].map((range) => (
          <div key={range.label}>
            <span className="text-[10px] font-extrabold tracking-[0.05em] text-mv-muted uppercase">
              {range.label}
            </span>
            <div
              className={`text-[22px] font-extrabold tabular-nums ${portalGate.lockedValue}`}
            >
              {formatDollars(range.low)} – {formatDollars(range.high)}
            </div>
            <div className={`text-[10px] text-mv-muted ${portalGate.lockedValue}`}>
              midpoint about {formatDollars(midpoint(range.low, range.high))}
            </div>
          </div>
        ))}
      </div>

      <p className="my-1.5 text-[13px]">
        Ranges, not points — a gas unit&rsquo;s cheque depends on gas richness,
        flaring and deducts we cannot see in advance.
      </p>

      <details className="mb-2">
        <summary className="cursor-pointer list-none text-[11px] font-bold text-mv-green-deep [&::-webkit-details-marker]:hidden">
          Read more — why a range, on a gas unit in particular →
        </summary>
        <div className="mt-1.5 text-[13px]">
          <p className="mb-2">
            Gas is paid on more than the headline price. We hold the benchmark
            flat across the whole window, but what a unit actually earns depends
            on how <em>rich</em> its gas is — liquids-heavy gas can be worth
            considerably more than dry gas from the same field — and on the
            gathering and compression deducts the operator takes before the
            cheque is written. Those deducts differ lease by lease and are not in
            the public record.
          </p>
          <p>
            Give us your division order and your last five cheques on this unit
            and we fit our model against what you were actually paid, then carry
            that correction forward and tell you how big it was.{" "}
            <strong>We are not claiming an accuracy figure today</strong> — that
            number only exists once there is something to measure against.
          </p>
        </div>
      </details>

      {/* The design's own pair: a green primary that acknowledges the click,
          and a ghost link to how the estimate is built. The Back button that
          used to sit here was mine — the report already has one above the
          breadcrumb. */}
      <div className="flex flex-wrap gap-2">
        <PrototypeButton
          variant="primary"
          acknowledgement="Upload opens here ✓ (prototype)"
          title="Upload a division order and check stubs to narrow this range"
        >
          ⌲ Make this estimate more accurate
        </PrototypeButton>
        <PrototypeButton
          acknowledgement="Weekly report opens here ✓ (prototype)"
          title="How the estimate is built"
        >
          How the estimate is built →
        </PrototypeButton>
      </div>
    </div>
  );
}
