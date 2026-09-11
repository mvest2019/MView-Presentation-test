import type { LeaseSourceRow } from "./lease-types";

/**
 * "WHERE EACH FIGURE COMES FROM" — the four feeds behind this page.
 *
 * A PROVENANCE TABLE, NOT A CREDITS LIST. Every column on the lease table is
 * answered by exactly one of these, and the card exists so a reader who doubts a
 * number can see which record it came off and how current that record is. The
 * `asOf` column is the honest half: a figure from a roll that is refreshed once
 * a year should not sit beside a monthly filing without saying so.
 */
export const leaseSourceRows: LeaseSourceRow[] = [
  {
    source: "Lease well roster",
    answers: "which wells belong to each of your leases",
    asOf: "per-lease, as filed",
  },
  {
    source: "Texas well master",
    answers:
      "what each well is, how it was completed, and where it goes underground",
    asOf: "per-well, as filed",
  },
  {
    source: "Allocation model",
    answers: "production split from the lease down to the individual well",
    asOf: "monthly, with each filing",
  },
  {
    source: "County appraisal roll",
    answers: "the decimal interest behind every owner-share figure",
    asOf: "roll year 2025",
  },
];
