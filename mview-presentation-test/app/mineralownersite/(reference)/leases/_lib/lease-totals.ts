import { leaseRecords } from "./lease-records";

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
