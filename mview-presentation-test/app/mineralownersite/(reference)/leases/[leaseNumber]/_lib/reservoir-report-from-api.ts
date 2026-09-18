import type {
  WireReservoir,
  WireReservoirMapWell,
  WireReservoirWell,
  WireReservoirs,
} from "../../_api/leases-api";
import { leaseRouteSlug } from "../../_lib/lease-routes";
import type { LeaseRecord } from "../../_lib/lease-types";
import type { WellRecord } from "../../_lib/well-records";
import type { ReservoirReport, ReservoirWell } from "./reservoir-report";

/**
 * THE RESERVOIR REPORT, AS THE SERVICE ANSWERS IT.
 *
 * ── THE SAME ARRANGEMENT AS THE LEASE REPORT ──
 *
 * `buildReservoirReport` derives this from the fixture and a local price deck;
 * this reads it off the service. Both produce one `ReservoirReport`, so the
 * seven cards on the tab are written once. See `lease-report-from-api.ts` for
 * the reasoning — it is the same, and the same rule applies: transcription,
 * not arithmetic.
 *
 * ── WHICH FIGURES ARE THE ROCK'S AND WHICH ARE THE READER'S ──
 *
 * The service keeps them apart and so does this. `gas_to_date`, `oil_to_date`,
 * the depths, the peak and the decline are facts about the reservoir at 100% —
 * a volume belongs to nobody. `cash_filed` and `cash_projected` are the
 * reader's own share. Mixing the two is the error this whole page is arranged
 * to avoid, which is why the chart plots gross volumes and share cash.
 *
 * ── A RESERVOIR CAN HAVE WELLS AND NO PRODUCTION ──
 *
 * When the rock is identified from the well roster rather than from an
 * allocation, `series` comes back empty with `seam: -1` — 138 wells, real
 * depths, not one attributed month. Every figure derived from the series is
 * then zero, and `series.labels.length === 0` is what the chart card reads to
 * say so rather than draw an empty axis.
 *
 * ── THE TWO WELL ARRAYS ARE ONE SET OF WELLS, JOINED ON THE API NUMBER ──
 *
 * `reservoir.wells[]` carries what a well has produced and where it is
 * perforated; `reservoir.map.wells[]` carries where the hole is. The table
 * needs the first, the map needs the second, and they are the same wells — so
 * they are joined here rather than in two components that would each have to
 * know about the other's array.
 */

function num(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function text(value: string | null | undefined): string {
  return typeof value === "string" ? value : "";
}

/** `"HORIZONTAL"` → the union the well record and the map icons speak. */
function profileOf(value: string | null | undefined): WellRecord["drilled"] {
  const raw = (value ?? "").toUpperCase();
  if (raw.includes("HORIZONTAL")) return "HORIZONTAL";
  if (raw.includes("VERTICAL")) return "VERTICAL";
  /* "ANGLED / DEVIATED", "not recorded", null — anything that is neither of the
     two named shapes is filed as directional, which is what the state's own
     catch-all means and what the map draws as a slanted hole. */
  return "DIRECTIONAL";
}

/**
 * The lease this reservoir sits on, in the shape the header and the map speak.
 *
 * ONLY WHAT THIS TAB READS. The reservoir payload carries a thinner lease block
 * than the lease report does — no forecast band, no ranking — and that is
 * enough: the cards here use the name, the county, the acreage, the interest
 * and the slug. Anything absent is floored rather than borrowed from elsewhere,
 * because a figure invented to fill a type is worse than a zero.
 */
function recordFrom(wire: NonNullable<WireReservoirs["lease"]>): LeaseRecord {
  const name = text(wire.lease_name) || text(wire.label);
  const number = wire.lease_no ? String(wire.lease_no) : null;

  return {
    id: wire.lease_id,
    number,
    slug: leaseRouteSlug(wire.lease_id, number, name),
    name,
    status: text(wire.lease_status),
    acres: num(wire.acres),
    firstPosting: text(wire.first_prod_label),
    mvestimate: num(wire.owner_value),
    countyAppraised: num(wire.appraised_value),
    county: text(wire.county),
    operator: text(wire.operator_name),
    reservoir: text(wire.reservoirs?.[0]?.name),
    wells: num(wire.well_count),
    producingWells: wire.producing_wells,
    decimalInterest: num(wire.interest),
    types: [],
    production: { gasMcf: 0, oilBbl: 0 },
    lastPosted: { month: text(wire.last_posted_label), gasMcf: 0 },
  };
}

/**
 * One well, from both arrays.
 *
 * `[lon, lat]` AND NOT `[lat, lon]`, which is the order the map component and
 * every GeoJSON reader expect and the opposite of how the payload names them.
 * A swapped pair puts west Texas in the Indian Ocean, silently.
 *
 * A well with no recorded bottom hole gets its surface again for both ends, so
 * the map draws a point rather than a line to `0,0` off the coast of Africa.
 */
function wellFrom(
  well: WireReservoirWell,
  position: WireReservoirMapWell | undefined,
  leaseSlug: string,
  reservoirName: string,
): ReservoirWell {
  const lon = num(position?.lon);
  const lat = num(position?.lat);
  const hasBottom =
    typeof position?.bh_lon === "number" &&
    typeof position?.bh_lat === "number";

  return {
    leaseSlug,
    name: text(well.well_number) || text(well.api10),
    api: text(well.api10),
    drilled: profileOf(well.profile ?? position?.profile),
    depthFt: num(well.depth_ft ?? position?.depth_ft),
    openTopFt: num(well.perf_top_ft),
    openBottomFt: num(well.perf_bottom_ft),
    lateralFt: position?.lateral_ft ?? null,
    bearing: position?.bearing_compass ?? null,
    cameOn: text(well.first_prod_label),
    /* The service sends one date — "Mar 14, 2021" — and it is the first
       production, so both readers of it get the same one rather than one of
       them getting a spud date that was never sent. */
    firstProduction: text(well.first_prod_label),
    /* The reservoir's name, NOT the state's field name — the payload does not
       carry the field here, and the two are different things (see
       `WellRecord.field`). Naming the reservoir is true; inventing a field
       would not be. */
    field: reservoirName,
    /* NOT SENT PER WELL by this endpoint. The table and the map render neither,
       so they are floored rather than guessed; the well report is where a
       well's own approval and its spud date belong. */
    type: "Gas",
    spudded: "",
    drilledBy: "",
    surface: [lon, lat],
    bottom: hasBottom
      ? [num(position?.bh_lon), num(position?.bh_lat)]
      : [lon, lat],

    gasFiled: num(well.gas_filed),
    sharePercent: num(well.share_pct),
    paidYou: num(well.cash_filed),
  };
}

/**
 * Which reservoir of the ones returned this report is about.
 *
 * The key when the caller had one and the service honoured it, and otherwise
 * the first — because an unkeyed call returns every reservoir on the lease and
 * the first is the one the lease report already names in its tab strip.
 */
export function pickReservoir(
  wire: WireReservoirs,
  key?: string | null,
): WireReservoir | undefined {
  const all = wire.reservoirs ?? [];
  if (all.length === 0) return undefined;
  if (!key) return all[0];

  const wanted = key.toUpperCase();
  return (
    all.find((entry) => (entry.reservoir_key ?? "").toUpperCase() === wanted) ??
    all[0]
  );
}

export function reservoirReportFromApi(
  wire: WireReservoirs,
  reservoir: WireReservoir,
): ReservoirReport {
  const lease = recordFrom(wire.lease ?? {});
  const name = text(reservoir.name) || text(reservoir.reservoir_key);

  /* ── the monthly series ──────────────────────────────────────────────── */
  const months = reservoir.series ?? [];
  const labels = months.map((month) => text(month.short) || text(month.label));
  const gas = months.map((month) => num(month.gas));
  const oil = months.map((month) => num(month.oil));
  const cash = months.map((month) => num(month.cash_share));

  /* The last month still on the filed record. Taken from the `forecast` flags
     rather than from `seam`, because those flags are what the chart tints and a
     seam that disagreed with them would draw the divider in the wrong place —
     the one mark on the chart a reader is entitled to trust. -1 when nothing
     is filed, which the chart reads as "no divider". */
  let lastPostedIndex = -1;
  months.forEach((month, index) => {
    if (!month.forecast) lastPostedIndex = index;
  });

  /* ── the wells, from both arrays ─────────────────────────────────────── */
  const positions = new Map(
    (reservoir.map?.wells ?? []).map((well) => [text(well.api10), well]),
  );
  const wells = (reservoir.wells ?? []).map((well) =>
    wellFrom(well, positions.get(text(well.api10)), lease.slug, name),
  );

  /* ── volumes, filed and still ahead ─────────────────────────────────── */
  const gasFiled = num(reservoir.gas_to_date);
  const oilFiled = num(reservoir.oil_to_date);
  const gasReserves = num(reservoir.gas_forecast);
  const oilReserves = num(reservoir.oil_forecast);

  const openTopFt = num(reservoir.perf_top_ft);
  const openBottomFt = num(reservoir.perf_bottom_ft);

  const peakGas = num(reservoir.peak_gas);
  const recentGas = num(reservoir.recent_avg_gas);

  return {
    lease,
    name,

    /* ── the six tiles ─────────────────────────────────────────────────── */
    wellCount: num(reservoir.well_count),
    leasesWithWells: num(reservoir.lease_count),
    gasFiled,
    /* The service states this as a percentage of everything allocated to the
       owner's wells — the same question the tile asks. */
    gasFiledPercentOfRecord: num(reservoir.share_of_portfolio_gas),
    oilFiled,
    newestFiledMonth: text(reservoir.last_cycle_label),
    paidYouFiled: num(reservoir.cash_filed),
    stillAheadCash: num(reservoir.cash_projected),
    stillAheadGas: gasReserves,
    openTopFt,
    openBottomFt,

    /* ── how much is left ──────────────────────────────────────────────── */
    gasReserves,
    oilReserves,
    /* `depleted_pct` is the service's own answer for gas and it is the figure
       the ring draws. Oil has no equivalent on this payload, so it is the ratio
       of the two oil figures already here rather than a second read. */
    gasProducedPercent: num(reservoir.depleted_pct),
    oilProducedPercent:
      oilFiled + oilReserves > 0
        ? (oilFiled / (oilFiled + oilReserves)) * 100
        : 0,
    oilYield: num(reservoir.yield_bbl_per_mmcf),

    /* ── the rock itself ───────────────────────────────────────────────── */
    depthFt: num(reservoir.depth_avg),
    directionalCount: num(reservoir.deviated_count),
    averageLateralFt: reservoir.avg_lateral_ft ?? null,
    operators: Array.isArray(reservoir.operators) ? reservoir.operators : [],
    filedFrom: text(reservoir.first_cycle_label),
    filedTo: text(reservoir.last_cycle_label),
    /* HOW MANY MONTHS ARE ACTUALLY POSTED, not how long the series runs — the
       series carries the forecast too, and counting those as filed is the one
       mistake a page about provenance cannot make. See the field's own note. */
    filedMonthCount: lastPostedIndex + 1,
    gasPerFootOpen: num(reservoir.gas_per_open_ft),
    openFeet: num(reservoir.open_ft_total),
    bestMonth: text(reservoir.peak_label),
    bestMonthGas: peakGas,
    trailingAverageGas: recentGas,
    /* How far below its peak the rock is running now. */
    bestMonthGapPercent:
      peakGas > 0 ? ((peakGas - recentGas) / peakGas) * 100 : 0,
    declinePerMonth: reservoir.decline_pct ?? null,
    wellsCameOn: text(reservoir.first_well_label),
    /* Years of remaining gas at the recent monthly rate. Zero when nothing is
       running, rather than an infinity. */
    yearsLeftAtRecentRate: recentGas > 0 ? gasReserves / recentGas / 12 : 0,
    /* FILED AND PROJECTED TOGETHER, which is what the card's own sentence says
       and what the service's own sentence says: "this rock is worth $128 an
       acre to you, filed and projected together". This divided the FILED cash
       alone and printed $120 against the service's $128 on the same screen —
       the two sentences sat four inches apart and disagreed. The whole point of
       a per-acre figure is to compare one rock with another, and half of one
       rock's money is not comparable to all of another's. */
    valuePerAcre:
      lease.acres > 0
        ? (num(reservoir.cash_filed) + num(reservoir.cash_projected)) /
          lease.acres
        : 0,
    /* OTHER leases and wells — the payload counts this one in, so it comes out
       again. The card's sentence is "beyond this lease you hold N more". */
    otherLeasesInRock: Math.max(num(reservoir.lease_count) - 1, 0),
    otherWellsInRock: 0,

    /* ── the chart and the table ───────────────────────────────────────── */
    from: 0,
    to: Math.max(labels.length - 1, 0),
    wells,

    series: { labels, gas, oil, cash, lastPostedIndex },
    basisNote: text(reservoir.basis_note) || undefined,
    insights: Array.isArray(reservoir.insights)
      ? reservoir.insights
      : undefined,
    mapNote: text(reservoir.map?.note) || undefined,
  };
}
