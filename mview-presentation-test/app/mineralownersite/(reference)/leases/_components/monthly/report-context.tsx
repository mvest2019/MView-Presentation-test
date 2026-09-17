"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import {
  formatAcres,
  formatCompactDollars,
  formatCompactVolume,
  formatCount,
  formatDecimalInterest,
  formatDollars,
} from "../../_lib/lease-format";
import { portfolioSummary, totalsFromRecords } from "../../_lib/lease-totals";
import { sampleLeaseRecords } from "../../_lib/sample-leases";

/**
 * THE MONTHLY REPORT'S TWO ANSWERS TO "WHOSE RECORD IS THIS".
 *
 * ── WHAT THE UNCLAIMED READER SEES, AND WHY IT IS BOTH THINGS ──
 *
 * A visitor who has not claimed a record gets the report's whole structure —
 * twelve pages, every heading, every sentence — with two substitutions:
 *
 *   THE IDENTITIES ARE THE SAMPLE SET'S. The same ten sample leases the lease
 *   list and the value band already switch to in this state, so a reader
 *   moving between the tabs is not shown two different portfolios.
 *
 *   THE FIGURES ARE WITHHELD, not scaled and not invented — every number
 *   renders as `•••`. A masked number is obviously withheld; a plausible one
 *   would read as a fact about a record this visitor has no claim to.
 *
 * Dates are NOT masked. The report is dated "June 2026" throughout and that is
 * the one thing worth showing truthfully: a sample dated in the past reads as a
 * broken product rather than a preview. This is the same rule the reference
 * build's own sample transform states at length — see `_lib/reference/sample.ts`.
 *
 * ── WHY A CONTEXT AND NOT A PROP ON TWELVE PAGES ──
 *
 * Every page formats its own figures, and threading both a totals object and a
 * formatter set through twelve components — several of which pass them down
 * again to cards and lists — is twelve chances for one page to be handed the
 * real set while its neighbour gets the sample. One provider, and a page cannot
 * disagree with the page before it.
 */

export interface ReportFormat {
  count: (value: number) => string;
  dollars: (value: number) => string;
  compactDollars: (value: number) => string;
  compactVolume: (value: number) => string;
  decimalInterest: (value: number) => string;
  acres: (value: number) => string;
  /** A bare number or count interpolated into a sentence. */
  num: (value: number | string) => string;
}

export interface ReportContextValue {
  /** The record's portfolio-wide figures — sample when unclaimed. */
  summary: typeof portfolioSummary;
  fmt: ReportFormat;
  /** True when the figures are being withheld. */
  masked: boolean;
}

/** Every number gone, the unit kept — "$•••", "••• MCF", "•••%". */
const MASK = "•••";

const REAL: ReportFormat = {
  count: formatCount,
  dollars: formatDollars,
  compactDollars: formatCompactDollars,
  compactVolume: formatCompactVolume,
  decimalInterest: formatDecimalInterest,
  acres: formatAcres,
  num: (value) => String(value),
};

/* THE UNIT SURVIVES THE MASK. "••• MCF" still says what is being withheld and
   in what; a bare "•••" says only that something is missing. The dollar sign
   stays ahead of the bullets for the same reason. */
const MASKED: ReportFormat = {
  count: () => MASK,
  dollars: () => `$${MASK}`,
  compactDollars: () => `$${MASK}`,
  compactVolume: () => MASK,
  decimalInterest: () => MASK,
  acres: () => MASK,
  num: () => MASK,
};

const Ctx = createContext<ReportContextValue | null>(null);

/**
 * The report's figures and formatters.
 *
 * FALLS BACK TO THE REAL SET outside the provider rather than throwing: a page
 * rendered on its own in a test or a story should show its own fixture, not
 * crash, and nothing about that path reaches a reader.
 */
export function useReport(): ReportContextValue {
  return (
    useContext(Ctx) ?? { summary: portfolioSummary, fmt: REAL, masked: false }
  );
}

export function ReportProvider({
  unclaimed,
  children,
}: {
  unclaimed: boolean;
  children: ReactNode;
}) {
  const value = useMemo<ReportContextValue>(
    () => ({
      /* `totalsFromRecords` returns the API's `LeaseTotals` shape; the pages
         read the fixture's `portfolioSummary` shape, which carries the same
         counts under its own names plus two stated constants. Mapped here so
         the twelve pages keep one vocabulary. */
      summary: unclaimed ? sampleSummary() : portfolioSummary,
      fmt: unclaimed ? MASKED : REAL,
      masked: unclaimed,
    }),
    [unclaimed],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The sample set's portfolio figures, in the shape the pages already read. */
function sampleSummary(): typeof portfolioSummary {
  const totals = totalsFromRecords(sampleLeaseRecords);
  return {
    ...portfolioSummary,
    leaseCount: totals.leaseCount,
    mvestimate: totals.ownerValue,
    countyAppraised: totals.appraisedValue,
    wells: totals.wellCount,
    reservoirs: totals.reservoirCount,
    operators: totals.operators,
    counties: totals.counties,
    gasMcf: totals.gasToDate,
    oilBbl: sampleLeaseRecords.reduce(
      (total, lease) => total + lease.production.oilBbl,
      0,
    ),
  };
}
