import { lastFiledMonth } from "./financials-record";
import { portfolioSummary } from "./lease-totals";
import type { LeaseSourceRow } from "./lease-types";

/**
 * "WHERE EACH FIGURE COMES FROM" — the four feeds behind the lease table.
 *
 * ── A PROVENANCE TABLE, NOT A CREDITS LIST ──
 *
 * Every column on the table above is answered by exactly one of these, and the
 * card exists so a reader who doubts a number can see which record it came off.
 *
 * ── THE "AS OF" COLUMN IS THE HONEST HALF ──
 *
 * Two of these feeds have no single date — a well roster is filed per lease and
 * the well master per well, so "per-lease records" and "per-well filings" say
 * what the cadence is rather than inventing a stamp. The two that DO have a
 * date get it: the allocation runs to the last filed month, and the roll is
 * restated once a year. A figure off a roll that is refreshed annually should
 * not sit beside a monthly filing without the difference being visible.
 *
 * BOTH DATES ARE DERIVED, not typed. The allocation date is the record's own
 * last filed month and the roll year is the one the value band quotes, so
 * neither can drift from the figures the card is explaining.
 */
export const leaseSourceRows: LeaseSourceRow[] = [
  {
    source: "Lease well roster",
    answers: "which wells belong to each of your leases",
    asOf: "per-lease records",
  },
  {
    source: "Texas well master",
    answers:
      "what each well is, how it was completed, and where it goes underground",
    asOf: "per-well filings",
  },
  {
    source: "Allocation model",
    answers: "production split from the lease down to the individual well",
    asOf: lastFiledMonth,
  },
  {
    source: "County appraisal roll",
    answers: "the decimal interest behind every owner-share figure",
    asOf: `roll year ${portfolioSummary.rollYear}`,
  },
];
