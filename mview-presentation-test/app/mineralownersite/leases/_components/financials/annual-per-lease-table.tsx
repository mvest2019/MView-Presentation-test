"use client";

import Link from "next/link";

import { useLeasePicker } from "../list/use-lease-picker";

import { EstimateBadge } from "../../../_components/ui/badge";
import { portalGate } from "../../../_components/ui/portal-gating";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "../../../_components/ui/table";
import {
  formatApproxDollars,
  formatDollars,
  formatLeaseTitle,
} from "../../_lib/lease-format";
import { leaseRecords } from "../../_lib/lease-records";
import { leaseReportPath } from "../../_lib/lease-routes";
import { annualShare, annualTotal, mvestimateTotal } from "../../_lib/lease-totals";
import type { LeaseRecord } from "../../_lib/lease-types";

/**
 * PER-LEASE ANNUAL VIEW — the six-year figure, and a sixth of it.
 *
 * THE COLUMN NOW SUMS TO ITS OWN TOTAL. In the prototype it did not: the footer
 * printed `≈ $4,390` (which is $26,340 ÷ 6) while the rows above it used a
 * divisor nearer 5.5, so adding the column up gave roughly $4,750. `annualShare`
 * divides by six for every row — see the note on it in `lease-totals.ts` — so the
 * rows and the footer are the same arithmetic.
 *
 * THE BASIS COLUMN IS THE POINT OF THE TABLE. Two leases are *derived* from a
 * captured report curve; the rest are a *straight-line* split of a six-year
 * model output; the inactive three have no projection at all and show a county
 * figure. Those are three different degrees of confidence in the same-looking
 * dollar, and the column says which is which on every row rather than once in a
 * footnote.
 */

function basisFor(lease: LeaseRecord): string {
  if (lease.mvestimate === 0) {
    return "No projected income — county 2026 value shown";
  }
  /* Ledbetter is the one lease with a fully captured cash-flow curve, so its
     figure is derived from real monthly data rather than split from a total. */
  return lease.number === "74318"
    ? "Derived — report curve × DI"
    : "Illustrative — straight-line";
}

/**
 * A CLIENT COMPONENT, for one reason: the lapsed lease picker.
 *
 * The design gates BOTH lease tables — this one and the wide table on the My
 * Leases tab — because "both are gated so no view leaks past the lock". A lock
 * that holds on one tab and not the other is not a lock, and this table lists
 * the same ten leases with the same money beside them.
 *
 * The picker state is read from an external store rather than passed in, so this
 * table stays in step with the other without either knowing the other exists.
 * See `useLeasePicker`.
 */
export function AnnualPerLeaseTable() {
  const { picker, lockNotice } = useLeasePicker();

  return (
    <section>
      <h4 className="mt-[18px] mb-2 text-[15px] font-bold">
        Per-lease annual view
      </h4>

      {lockNotice && (
        <div
          role="status"
          className="mb-2.5 rounded-mv border border-mv-portal-gold/40 bg-mv-sand-tint p-3 text-[12.5px] font-semibold text-mv-amber"
        >
          {lockNotice}
        </div>
      )}

      <TableScroll>
        <Table minWidth={720}>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Lease (no.)</TableHeaderCell>
              <TableHeaderCell>County</TableHeaderCell>
              <TableHeaderCell numeric>MVestimate · 6 yr</TableHeaderCell>
              <TableHeaderCell numeric>≈ per year</TableHeaderCell>
              <TableHeaderCell>Basis</TableHeaderCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {leaseRecords.map((lease) => (
              <TableRow
                key={lease.number}
                interactive
                className={
                  picker
                    ? lease.number === picker.activeLease
                      ? "lp-active"
                      : "lp-locked"
                    : undefined
                }
              >
                <TableCell>
                  <Link
                    href={leaseReportPath(lease.number)}
                    className="font-bold text-mv-green-deep"
                  >
                    {formatLeaseTitle(lease.name, lease.number)}
                  </Link>
                  {picker && lease.number === picker.activeLease && (
                    <span className="lp-activetag">LIVE</span>
                  )}
                  {picker && lease.number !== picker.activeLease && (
                    <button
                      type="button"
                      className="lp-lockbtn"
                      onClick={() => picker.onPick(lease.number)}
                    >
                      <span aria-hidden="true">🔒 </span>Make this live
                    </button>
                  )}
                </TableCell>
                <TableCell>{lease.county}</TableCell>
                {/*
                  THE CLAIMED GATE, COLUMNS 3 · 4 — the design's own
                  `#lsPanelFin tbody td:nth-child(3),(4)`. Lease name, county and
                  the basis column stay sharp; only the two money columns blur.
                */}
                <TableCell numeric className={portalGate.lockedValue}>
                  {lease.mvestimate > 0 ? (
                    formatDollars(lease.mvestimate)
                  ) : (
                    <>
                      <strong className="text-mv-green-deep">
                        {formatDollars(lease.countyAppraised)}
                      </strong>
                      <span className="block text-[10px] font-normal whitespace-nowrap text-mv-muted">
                        county appraised value
                      </span>
                    </>
                  )}
                </TableCell>
                <TableCell numeric className={portalGate.lockedValue}>
                  {lease.mvestimate > 0
                    ? formatApproxDollars(annualShare(lease))
                    : "$0"}
                </TableCell>
                <TableCell className="text-[10px] text-mv-muted">
                  {basisFor(lease)}
                </TableCell>
              </TableRow>
            ))}

            {/* Not a lease, but an all-ten figure — `lp-totalrow` blurs it in the
                lapsed state, first cell excepted. */}
            <TableRow tone="total" className={picker ? "lp-totalrow" : undefined}>
              <TableCell>Total</TableCell>
              <TableCell />
              <TableCell numeric className={portalGate.lockedValue}>
                {formatDollars(mvestimateTotal)}
              </TableCell>
              <TableCell numeric className={portalGate.lockedValue}>
                {formatApproxDollars(annualTotal)}
              </TableCell>
              <TableCell>
                <EstimateBadge plural />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableScroll>
    </section>
  );
}
