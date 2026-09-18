import type {
  WireReservoirMapWell,
  WireWell,
  WireWellCompletion,
  WireWells,
} from "../../_api/leases-api";
import { leaseRouteSlug } from "../../_lib/lease-routes";
import type { LeaseRecord } from "../../_lib/lease-types";
import type { WellRecord } from "../../_lib/well-records";
import { RING_MILES } from "./map-shared";
import type { WellFiling, WellReport } from "./well-report";

/**
 * ONE WELL'S REPORT, AS THE SERVICE ANSWERS IT.
 *
 * ── THE SAME ARRANGEMENT AS THE OTHER TWO ──
 *
 * `buildWellReport` derives this from the fixture; this reads it off
 * `/leases/wells`. Both produce one `WellReport`, so the seven cards on the tab
 * are written once. Transcription, not arithmetic — see
 * `lease-report-from-api.ts` for the reasoning behind the rule.
 *
 * ── THE FILINGS ARE THE PAPERWORK, NOT THE PRODUCTION ──
 *
 * `completions[]` is every form the state holds for this wellbore: when it was
 * spudded, what was permitted, where it was perforated, whether it was fracced,
 * and — for about half of them — a scanned packet. A filing without a packet is
 * a gap in what was captured rather than a filing that was never made, which is
 * why the document is modelled as nullable and the Attachments card counts them
 * rather than assuming.
 *
 * ── A WELL CAN HAVE ALL OF THAT AND NO PRODUCTION ──
 *
 * Where the allocation store holds no row for the wellbore, `series` is empty
 * and every volume is zero: the hole is real and its months are simply not
 * split out from the lease total. `note` is the service saying so, and the tab
 * prints it instead of drawing a chart of nothing.
 */

function num(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function text(value: string | null | undefined): string {
  return typeof value === "string" ? value : "";
}

/** `"HORIZONTAL"` → the union the diagram and the map icons are keyed on. */
function profileOf(value: string | null | undefined): WellRecord["drilled"] {
  const raw = (value ?? "").toUpperCase();
  if (raw.includes("HORIZONTAL")) return "HORIZONTAL";
  if (raw.includes("VERTICAL")) return "VERTICAL";
  return "DIRECTIONAL";
}

/**
 * The well itself.
 *
 * `[lon, lat]` AND NOT `[lat, lon]` — the order every map reader expects and
 * the reverse of how the payload names them. A hole with no filed bottom gets
 * its surface for both ends, so the map draws a point rather than a line to the
 * Gulf of Guinea.
 */
function recordFrom(
  wire: WireWell,
  position: WireReservoirMapWell | undefined,
  leaseSlug: string,
): WellRecord {
  const lon = num(position?.lon);
  const lat = num(position?.lat);
  const hasBottom =
    typeof position?.bh_lon === "number" &&
    typeof position?.bh_lat === "number";

  return {
    leaseSlug,
    name: text(wire.well_number) || text(wire.api10),
    api: text(wire.api10),
    drilled: profileOf(wire.profile),
    depthFt: num(wire.depth_ft ?? wire.tvd_ft),
    openTopFt: num(wire.perf_top_ft),
    openBottomFt: num(wire.perf_bottom_ft),
    lateralFt: wire.lateral_ft ?? null,
    bearing: wire.bearing_compass ?? null,
    cameOn: text(wire.first_prod_label),
    field: text(wire.field_name),
    /* The state files one of two approvals and the payload names it. */
    type: text(wire.well_type).toUpperCase().startsWith("GAS") ? "Gas" : "Oil",
    spudded: text(wire.spud_label),
    firstProduction: text(wire.first_prod_label),
    drilledBy: text(wire.completion_operator) || text(wire.operator_name),
    surface: [lon, lat],
    bottom: hasBottom
      ? [num(position?.bh_lon), num(position?.bh_lat)]
      : [lon, lat],
    /* The legend row this hole is drawn as — see `WellRecord.icon`. */
    icon: text(position?.icon),
  };
}

/** The lease this well sits on, as much of it as this payload carries. */
function leaseFrom(wire: WireWells, well: WireWell): LeaseRecord {
  const name = text(well.lease_label);
  const number = wire.lease_number ? String(wire.lease_number) : null;

  return {
    id: wire.lease_id,
    number,
    slug: leaseRouteSlug(wire.lease_id, number, name),
    name,
    status: text(well.status),
    acres: 0,
    firstPosting: text(well.first_prod_label),
    mvestimate: 0,
    countyAppraised: 0,
    county: text(well.county),
    operator: text(well.operator_name),
    reservoir: text(well.reservoir),
    wells: 0,
    decimalInterest: 0,
    types: [],
    production: { gasMcf: num(well.gas_filed), oilBbl: num(well.oil_filed) },
    lastPosted: { month: text(well.last_filed_label), gasMcf: 0 },
  };
}

/**
 * One filing.
 *
 * `name` IS THE FORM'S PURPOSE, which is what the row is read by — "Well Record
 * Only", "Permit to Drill". The dates are printed as the service formatted
 * them; it knows which of spud, drilled and recompleted a given form actually
 * carries, and an empty one means that form did not record it.
 */
function filingFrom(wire: WireWellCompletion): WellFiling {
  const top = wire.perf_top;
  const bottom = wire.perf_bottom;

  return {
    name: text(wire.filing_purpose) || text(wire.permit_type) || "Filing",
    type: text(wire.filing_welltype) || text(wire.permit_type),
    drilled: text(wire.drilled_label) || text(wire.spud_label),
    recompleted: text(wire.recompleted_label) || text(wire.first_prod_label),
    /* Null where the form recorded no interval — the card draws a dash rather
       than "0–0 ft", which would read as a measurement of nothing. */
    perforated:
      typeof top === "number" && typeof bottom === "number"
        ? `${top.toLocaleString("en-US")}–${bottom.toLocaleString("en-US")} ft`
        : null,
    fracced: wire.fracced === true,
    /* ABOUT HALF THE ROWS CARRY A PACKET. No URL is a gap in what was scanned,
       not a filing that was never made — so the document is null and the
       Attachments card counts what is there. */
    document: wire.packet_url
      ? {
          permitType: text(wire.permit_type) || text(wire.filing_purpose),
          tracking: text(wire.tracking_no),
          filedOn:
            text(wire.recompleted_label) ||
            text(wire.drilled_label) ||
            text(wire.spud_label),
          /* The packet itself. Its presence is what put this row on the card
             in the first place, so by here it is known to be a string. */
          url: text(wire.packet_url) || null,
        }
      : null,
  };
}

/** Which well of the ones returned this report is about. */
export function pickWell(
  wire: WireWells,
  api10?: string | null,
): WireWell | undefined {
  const all = wire.wells ?? [];
  if (all.length === 0) return undefined;
  if (!api10) return all[0];
  return all.find((well) => well.api10 === api10) ?? all[0];
}

export function wellReportFromApi(wire: WireWells, well: WireWell): WellReport {
  const lease = leaseFrom(wire, well);
  const position = (well.map?.wells ?? []).find(
    (entry) => entry.api10 === well.api10,
  );
  const record = recordFrom(well, position, lease.slug);

  const gasFiled = num(well.gas_filed);
  const gasReserves = num(well.gas_projected);
  const oilFiled = num(well.oil_filed);
  const oilReserves = num(well.oil_projected);

  const trueVerticalFt = num(well.tvd_ft ?? well.depth_ft);
  const measuredFt = num(well.md_ft ?? well.depth_ft ?? well.tvd_ft);
  const openFeet = num(well.perf_thickness_ft);

  const bands = well.neighbour_bands ?? [];

  /* ── the well's own months ───────────────────────────────────────────── */
  const months = well.series ?? [];
  /* The last month still on the filed record, taken from the `forecast` flags
     rather than from `seam`: those flags are what the chart tints, and a seam
     that disagreed with them would put the divider where the shading is not. */
  let lastPostedIndex = -1;
  months.forEach((month, index) => {
    if (!month.forecast) lastPostedIndex = index;
  });

  return {
    lease,
    well: record,

    /* ── the six tiles ─────────────────────────────────────────────────── */
    gasFiled,
    oilFiled,
    newestFiledMonth: text(well.last_filed_label),
    paidYouFiled: num(well.cash_filed),
    stillAheadCash: num(well.cash_projected),
    stillAheadGas: gasReserves,
    bestMonthGas: num(well.peak_gas),
    bestMonth: text(well.peak_gas_label),
    openFeet,

    /* ── how much is left ──────────────────────────────────────────────── */
    allocatedMonths: num(well.filed_months),
    gasReserves,
    oilReserves,
    /* The service's own depletion where it has one; the ratio of the two
       figures already on this row where it has not. */
    gasProducedPercent:
      well.depleted_pct != null
        ? num(well.depleted_pct)
        : gasFiled + gasReserves > 0
          ? (gasFiled / (gasFiled + gasReserves)) * 100
          : 0,
    oilProducedPercent:
      well.oil_depleted_pct != null
        ? num(well.oil_depleted_pct)
        : oilFiled + oilReserves > 0
          ? (oilFiled / (oilFiled + oilReserves)) * 100
          : 0,
    oilYield: num(well.yield_bbl_per_mmcf),

    /* ── the wellbore ──────────────────────────────────────────────────── */
    wellboreApi: text(well.api10),
    fieldLabel: text(well.field_name),
    trueVerticalFt,
    measuredFt,
    /* How far past true vertical the hole runs. Never negative: a measured
       depth shallower than the vertical is a filing quirk, not a hole that
       goes up. */
    extraHoleFt: Math.max(measuredFt - trueVerticalFt, 0),
    bottomAngle: well.bearing_deg ?? null,
    spudded: text(well.spud_label),
    ageYears: num(well.age_years),
    firstProduction: text(well.first_prod_label),
    gasPerFootOpen: num(well.gas_per_open_ft),
    declinePerMonth: well.decline_pct ?? null,
    trailingAverageGas: num(well.recent_avg_gas),
    /* What share of the hole is open to the rock. */
    openPercentOfHole: measuredFt > 0 ? (openFeet / measuredFt) * 100 : 0,

    /* ── against the others in the same rock ───────────────────────────── */
    reservoir: text(well.reservoir),
    peerCount: num(well.reservoir_wells),
    rankByGas: num(well.rank_in_reservoir),
    peerGasPerFootOpen: num(well.peer_gas_per_open_ft),
    gasPerFootVsPeersPercent: num(well.gas_per_open_ft_vs_peers_pct),
    openIntervalSharePercent: num(well.open_interval_share_pct),
    gasSharePercent: num(well.share_of_reservoir_gas),

    /* ── the filings, the chart and the map ────────────────────────────── */
    filings: (well.completions ?? []).map(filingFrom),
    from: 0,
    /* The window is the series' own length when there is one — the counts are a
       fallback for a well with filings and no allocated months. */
    to: Math.max(
      (months.length || num(well.filed_months) + num(well.projected_months)) -
        1,
      0,
    ),
    /* The service measures well-to-well and keys the bands by miles; the card's
       pills are labelled from `RING_MILES`, so the two join on the number. */
    neighbours: Object.entries(RING_MILES).map(([label, miles]) => ({
      label,
      count: num(bands.find((band) => band.band === miles)?.wells),
    })),

    series: {
      labels: months.map((month) => text(month.short) || text(month.label)),
      gas: months.map((month) => num(month.gas)),
      oil: months.map((month) => num(month.oil)),
      cash: months.map((month) => num(month.cash_share)),
      lastPostedIndex,
    },
  };
}
