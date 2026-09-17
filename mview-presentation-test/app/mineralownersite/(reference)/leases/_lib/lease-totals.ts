import type { LeaseTotals } from "../_api/leases-api";
import { leaseRecords } from "./lease-records";
import type { LeaseRecord } from "./lease-types";

/**
 * EVERY PORTFOLIO-WIDE FIGURE ON THE PAGE, DERIVED ONCE.
 *
 * The dark band, the header line and the table's totals row all print the same
 * six or seven facts, and they have to agree — a header that says ten wells
 * above a table whose well column sums to nine is the kind of defect a reader
 * notices before anything else on the screen. So they are summed here, from the
 * records, rather than typed three times.
 *
 * `horizontalWells` IS THE ONE FIGURE THAT IS NOT A SUM. How a well was drilled
 * is a fact about the well, and the well master is not part of this module's
 * fixture — the band's "2 drilled sideways" caption comes from the design and is
 * carried as a constant so it is obvious it is stated rather than computed.
 */

function distinct(values: string[]): number {
  return new Set(values).size;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export const portfolioSummary = {
  leaseCount: leaseRecords.length,
  mvestimate: sum(leaseRecords.map((lease) => lease.mvestimate)),
  countyAppraised: sum(leaseRecords.map((lease) => lease.countyAppraised)),
  wells: sum(leaseRecords.map((lease) => lease.wells)),
  reservoirs: distinct(leaseRecords.map((lease) => lease.reservoir)),
  operators: distinct(leaseRecords.map((lease) => lease.operator)),
  counties: distinct(leaseRecords.map((lease) => lease.county)),
  gasMcf: sum(leaseRecords.map((lease) => lease.production.gasMcf)),
  oilBbl: sum(leaseRecords.map((lease) => lease.production.oilBbl)),
  /** Stated, not derived — see the note above. */
  horizontalWells: 2,
  /** The appraisal year the county column is quoted from. */
  rollYear: 2025,
} as const;

/**
 * THE SAME FIGURES, SUMMED FROM WHATEVER SET IS BEING SHOWN.
 *
 * `portfolioSummary` above is this over the fixture, computed once at module
 * load. This is the function behind it, for the one caller that has a different
 * set in hand: the UNCLAIMED state, which shows the sample leases and needs a
 * band whose five figures agree with the list underneath them.
 *
 * ── IT IS NOT USED FOR A CLAIMED RECORD, AND MUST NOT BE ──
 *
 * There the figures come from the service's own `totals` block, which describes
 * the WHOLE record — every lease, not the page of them this browser happens to
 * be holding. Summing rows there would quietly restate the headline every time
 * a filter narrowed the table. See `LeaseTotals` in `_api/leases-api.ts`.
 *
 * TWO FIELDS ARE STATED RATHER THAN SUMMED, for the reason the note at the top
 * of this file gives about `horizontalWells`: how a well was drilled and which
 * year the county roll is from are facts about the well master and the county,
 * and neither is in a lease record to be added up.
 */
export function totalsFromRecords(leases: LeaseRecord[]): LeaseTotals {
  return {
    leaseCount: leases.length,
    wellCount: sum(leases.map((lease) => lease.wells)),
    reservoirCount: distinct(leases.map((lease) => lease.reservoir)),
    counties: distinct(leases.map((lease) => lease.county)),
    operators: distinct(leases.map((lease) => lease.operator)),
    deviatedCount: portfolioSummary.horizontalWells,
    gasToDate: sum(leases.map((lease) => lease.production.gasMcf)),
    ownerValue: sum(leases.map((lease) => lease.mvestimate)),
    appraisedValue: sum(leases.map((lease) => lease.countyAppraised)),
    rollYear: portfolioSummary.rollYear,
    rosterNote: "",
  };
}
