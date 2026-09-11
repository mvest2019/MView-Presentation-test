import { financialsSeries } from "../../_lib/financials-series";
import { leaseRecords } from "../../_lib/lease-records";
import type { LeaseRecord } from "../../_lib/lease-types";
import { monthLabel } from "../../_lib/months";
import { cashAt } from "../../_lib/price-deck";
import { wellRecords, wellsForLease, type WellRecord } from "../../_lib/well-records";

/**
 * THE WELL REPORT'S FIGURES — one hole in the ground.
 *
 * ── THE SMALLEST SCOPE IN THE PRODUCT, AND THE ONLY ONE THAT IS PHYSICAL ──
 *
 * A lease is a legal object and a reservoir is a geological one. A wellbore is
 * neither: it is a hole somebody drilled on a particular day to a particular
 * depth, and almost everything on this page is a measurement of it. That is why
 * the page can say things the two above it cannot — how much of the hole is
 * actually open to the rock, how far the bottom sits from the top, how this
 * completion did against the others in the same reservoir.
 *
 * ── "ALLOCATED", NOT "PRODUCED BY" ──
 *
 * Texas files production at the LEASE. Where a lease has one well those are the
 * same number; where it has several the state does not say which hole made what,
 * so the volumes here are the lease's, allocated to this wellbore. The page uses
 * the word "allocated" throughout rather than implying a measurement nobody took.
 *
 * ── THE COMPARISON SET IS THE RESERVOIR, NOT THE LEASE ──
 *
 * A completion is compared with the wells in the same rock, whatever lease each
 * one happens to sit on, because that is the set it is geologically comparable
 * with. Comparing it against the other wells on its own lease would compare it
 * with whatever else its operator chose to drill nearby.
 */

export interface WellFiling {
  name: string;
  type: string;
  drilled: string;
  recompleted: string;
  /** The perforated interval this filing records, or null where it records none. */
  perforated: string | null;
  fracced: boolean;
}

export interface WellReport {
  lease: LeaseRecord;
  well: WellRecord;

  /* ── the six tiles ──────────────────────────────────────────────────── */
  gasFiled: number;
  oilFiled: number;
  newestFiledMonth: string;
  paidYouFiled: number;
  stillAheadCash: number;
  stillAheadGas: number;
  bestMonthGas: number;
  bestMonth: string;
  openFeet: number;

  /* ── how much is left ───────────────────────────────────────────────── */
  allocatedMonths: number;
  gasReserves: number;
  oilReserves: number;
  gasProducedPercent: number;
  oilProducedPercent: number;
  oilYield: number;

  /* ── the wellbore ───────────────────────────────────────────────────── */
  /** The API with the wellbore suffix the state appends. */
  wellboreApi: string;
  fieldLabel: string;
  trueVerticalFt: number;
  measuredFt: number;
  /** How far past true vertical the hole runs. */
  extraHoleFt: number;
  /** The angle the bottom hole sits at from the surface hole. */
  bottomAngle: number | null;
  spudded: string;
  ageYears: number;
  firstProduction: string;
  gasPerFootOpen: number;
  declinePerMonth: number | null;
  trailingAverageGas: number;
  openPercentOfHole: number;

  /* ── against the others in the same rock ────────────────────────────── */
  reservoir: string;
  peerCount: number;
  rankByGas: number;
  peerGasPerFootOpen: number;
  gasPerFootVsPeersPercent: number;
  openIntervalSharePercent: number;
  gasSharePercent: number;

  /* ── the filings, the chart and the map ─────────────────────────────── */
  filings: WellFiling[];
  from: number;
  to: number;
  /** How many other wells sit within each ring. */
  neighbours: { label: string; count: number }[];
}

function seriesFor(slug: string) {
  const found = financialsSeries.byLease.find((entry) => entry.slug === slug);
  if (!found) throw new Error(`No series for lease ${slug}`);
  return found;
}

/** "2020-03-10" -> "Mar 10, 2020". */
function formatDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Great-circle distance in miles between two [lng, lat] points.
 *
 * Small enough distances that the curvature barely matters, but the formula is
 * three lines and gets the ring counts right rather than nearly right.
 */
function milesBetween(a: [number, number], b: [number, number]): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(a[0] - b[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * THE TWO FILINGS EVERY PRODUCING WELLBORE CARRIES, derived from its own dates.
 *
 * A completion report ("Initial Potential") and the well record filed alongside
 * it. They are separate DOCUMENTS on the same hole rather than duplicates — a
 * recompletion later on would add a third — which is what the note under the
 * table says. Only the completion report records a perforated interval; the
 * well record does not, so its cell is a dash rather than a repeat.
 */
function buildFilings(well: WellRecord): WellFiling[] {
  const filed = formatDay(well.firstProduction);
  return [
    {
      name: "Initial Potential",
      type: "Producing",
      drilled: filed,
      recompleted: filed,
      perforated: `${well.openTopFt.toLocaleString("en-US")}–${well.openBottomFt.toLocaleString("en-US")} ft`,
      fracced: well.drilled !== "VERTICAL",
    },
    {
      name: "Well Record Only",
      type: "Producing",
      drilled: filed,
      recompleted: filed,
      perforated: null,
      fracced: false,
    },
  ];
}

export function buildWellReport(lease: LeaseRecord): WellReport {
  const wells = wellsForLease(lease.slug);
  const well = wells[0];
  const series = seriesFor(lease.slug);
  const { firstMonth, length } = financialsSeries;

  const filedThrough = series.filedThroughIndex;
  const from = series.gas.findIndex((value) => value > 0);
  const to = length - 1;
  /* One well on this lease, so it carries all of the lease's allocation. With
     several, each would take its share by filed volume. */
  const allocation = 1 / wells.length;

  let gasFiled = 0;
  let oilFiled = 0;
  let gasAhead = 0;
  let oilAhead = 0;
  let paidYou = 0;
  let stillAhead = 0;
  let bestMonthGas = 0;
  let bestMonth = "";
  let allocatedMonths = 0;

  for (let index = from; index <= to; index += 1) {
    const gas = series.gas[index] * allocation;
    const oil = series.oil[index] * allocation;
    const cash =
      cashAt({
        gas: series.gas[index] * lease.decimalInterest,
        oil: series.oil[index] * lease.decimalInterest,
        monthOfYear: (firstMonth + index) % 12,
        index,
        filed: index <= financialsSeries.lastPostedIndex,
      }) * allocation;

    if (index <= filedThrough) {
      gasFiled += gas;
      oilFiled += oil;
      paidYou += cash;
      allocatedMonths += 1;
      if (gas > bestMonthGas) {
        bestMonthGas = gas;
        bestMonth = monthLabel(firstMonth + index);
      }
    } else {
      gasAhead += gas;
      oilAhead += oil;
      stillAhead += cash;
    }
  }

  const trailingStart = Math.max(from, filedThrough - 11);
  let trailingGas = 0;
  let trailingMonths = 0;
  for (let index = trailingStart; index <= filedThrough; index += 1) {
    trailingGas += series.gas[index] * allocation;
    trailingMonths += 1;
  }
  const trailingAverageGas = trailingMonths > 0 ? trailingGas / trailingMonths : 0;

  const spanMonths = filedThrough - from;
  const decline =
    spanMonths > 11 && series.gas[from] > 0
      ? (1 - (series.gas[filedThrough] / series.gas[from]) ** (1 / spanMonths)) *
        100
      : null;

  const openFeet = well.openBottomFt - well.openTopFt;
  /* Measured depth runs past true vertical by roughly the lateral: the hole is
     longer than the ground is deep the moment it stops going straight down. */
  const measuredFt = well.depthFt + Math.round((well.lateralFt ?? 0) * 0.122);

  /* ── the peer set: your wells in the same reservoir, whatever lease ──── */
  const peers = wellRecords
    .map((entry) => {
      const peerLease = leaseRecords.find((row) => row.slug === entry.leaseSlug);
      return { well: entry, lease: peerLease };
    })
    .filter(
      (entry): entry is { well: WellRecord; lease: LeaseRecord } =>
        entry.lease?.reservoir === lease.reservoir,
    )
    .map(({ well: peer, lease: peerLease }) => ({
      peer,
      gas: peerLease.production.gasMcf,
      openFeet: peer.openBottomFt - peer.openTopFt,
    }));

  const peerGas = peers.reduce((total, entry) => total + entry.gas, 0);
  const peerOpenFeet = peers.reduce((total, entry) => total + entry.openFeet, 0);
  const peerGasPerFoot = peerOpenFeet > 0 ? peerGas / peerOpenFeet : 0;
  const gasPerFootOpen = openFeet > 0 ? gasFiled / openFeet : 0;

  const rankByGas =
    [...peers]
      .sort((a, b) => b.gas - a.gas)
      .findIndex((entry) => entry.peer.api === well.api) + 1;

  /* ── how close the other wells are ──────────────────────────────────── */
  const distances = wellRecords
    .filter((entry) => entry.api !== well.api)
    .map((entry) => milesBetween(well.surface, entry.surface));
  const within = (miles: number) =>
    distances.filter((distance) => distance <= miles).length;

  const spuddedDate = new Date(`${well.spudded}T00:00:00`);
  const newest = new Date(
    `${monthLabel(firstMonth + filedThrough).replace(" ", " 1, ")}`,
  );

  return {
    lease,
    well,

    gasFiled,
    oilFiled,
    newestFiledMonth: monthLabel(firstMonth + filedThrough),
    paidYouFiled: paidYou,
    stillAheadCash: stillAhead,
    stillAheadGas: gasAhead,
    bestMonthGas,
    bestMonth,
    openFeet,

    allocatedMonths,
    gasReserves: gasAhead,
    oilReserves: oilAhead,
    gasProducedPercent:
      gasFiled + gasAhead > 0 ? (gasFiled / (gasFiled + gasAhead)) * 100 : 0,
    oilProducedPercent:
      oilFiled + oilAhead > 0 ? (oilFiled / (oilFiled + oilAhead)) * 100 : 0,
    oilYield: gasFiled > 0 ? (oilFiled / gasFiled) * 1000 : 0,

    wellboreApi: `${well.api}-0000`,
    fieldLabel: `${well.field} (${lease.reservoir})`,
    trueVerticalFt: well.depthFt,
    measuredFt,
    extraHoleFt: measuredFt - well.depthFt,
    bottomAngle:
      well.lateralFt && well.lateralFt > 0
        ? Math.round(
            (Math.atan(well.lateralFt / well.depthFt) * 180) / Math.PI,
          )
        : null,
    spudded: formatDay(well.spudded),
    ageYears:
      (newest.getTime() - spuddedDate.getTime()) / (365.25 * 24 * 3600 * 1000),
    firstProduction: formatDay(well.firstProduction),
    gasPerFootOpen,
    declinePerMonth: decline,
    trailingAverageGas,
    openPercentOfHole: measuredFt > 0 ? (openFeet / measuredFt) * 100 : 0,

    reservoir: lease.reservoir,
    peerCount: peers.length,
    rankByGas,
    peerGasPerFootOpen: peerGasPerFoot,
    gasPerFootVsPeersPercent:
      peerGasPerFoot > 0 ? (gasPerFootOpen / peerGasPerFoot - 1) * 100 : 0,
    openIntervalSharePercent:
      peerOpenFeet > 0 ? (openFeet / peerOpenFeet) * 100 : 0,
    gasSharePercent: peerGas > 0 ? (gasFiled / peerGas) * 100 : 0,

    filings: buildFilings(well),
    from,
    to,
    neighbours: [
      { label: "1 mi", count: within(1) },
      { label: "3 mi", count: within(3) },
      { label: "5 mi", count: within(5) },
    ],
  };
}
