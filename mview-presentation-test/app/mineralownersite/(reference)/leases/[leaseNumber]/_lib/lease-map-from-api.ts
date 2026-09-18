import type { WireLeaseMap, WireReservoirMapWell } from "../../_api/leases-api";
import type { WellRecord } from "../../_lib/well-records";
import { RING_MILES } from "./map-shared";

/**
 * WHERE ONE LEASE'S WELLS ARE, AS THE MAP CARD READS THEM.
 *
 * ── WHAT THIS REPLACES ──
 *
 * `WellsMapCard` read the fixture: `wellsForLease(slug)` for the holes and
 * `ringCounts` for the neighbours, which measures distances against the ten
 * fixture leases' own wells. On a served lease the first returns nothing — an
 * empty map — and the second counts a fixture that has no bearing on the lease
 * being read.
 *
 * Three more lines on that card were typed in rather than read, and each was
 * wrong on a real lease:
 *
 *   "{wells} surface · {wells} bottom hole"   the service says 138 surface and
 *                                             ZERO bottom holes on this lease
 *   "0 recorded · {wells} estimated path"     it says none of either
 *   the whole "no traced unit boundary" note  it sends its own, per lease
 *
 * A count assumed from another count is not a count. All four now come off
 * `ground`.
 *
 * ── THE RINGS ARE THE SERVICE'S, MEASURED FROM THE RIGHT WELLS ──
 *
 * `neighbour_bands` is keyed by miles — 1, 3, 5 — and the card's pills are
 * labelled from `RING_MILES`, so the two are joined on the number rather than
 * on the label text. The service measures well-to-well from THIS lease's own
 * wells and excludes them from the count, which is the same rule `ringCounts`
 * was written to follow and could only approximate.
 */

export interface LeaseMapData {
  /** Every hole on the lease, in the shape the map and its tooltip read. */
  wells: LeaseMapWell[];
  /** One per ring pill, in the card's own order. */
  rings: { label: string; count: number }[];
  /** The summary line above the map. */
  ground: {
    acres: number;
    surfaceHoles: number;
    bottomHoles: number;
    pathsMeasured: number;
    pathsEstimated: number;
  };
  /** Why there is no unit outline drawn, in the service's words. */
  outlineNote?: string;
  /** What the spread of the wells amounts to. */
  mapNote?: string;
}

/**
 * A well on the lease map.
 *
 * `openTopFt` and `openBottomFt` are ZERO here and that is not a gap in the
 * mapping: this endpoint does not carry perforations. Where a hole is open is
 * a question about the rock it is open INTO, so the reservoir call answers it
 * and the tooltip below says "not recorded" rather than printing "0–0 ft".
 */
export type LeaseMapWell = Pick<
  WellRecord,
  | "api"
  | "name"
  | "drilled"
  | "depthFt"
  | "openTopFt"
  | "openBottomFt"
  | "lateralFt"
  | "bearing"
  | "surface"
  | "bottom"
> & { gasFiled: number };

function num(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function text(value: string | null | undefined): string {
  return typeof value === "string" ? value : "";
}

/** `"HORIZONTAL"` → the union the map's symbols are keyed on. */
function profileOf(value: string | null | undefined): WellRecord["drilled"] {
  const raw = (value ?? "").toUpperCase();
  if (raw.includes("HORIZONTAL")) return "HORIZONTAL";
  if (raw.includes("VERTICAL")) return "VERTICAL";
  return "DIRECTIONAL";
}

/**
 * One hole.
 *
 * `[lon, lat]` AND NOT `[lat, lon]` — the order the map expects and the reverse
 * of how the payload names them. A swapped pair puts west Texas in the Indian
 * Ocean and does it silently.
 *
 * A well with no filed bottom hole gets its surface for both ends, so the map
 * draws a point rather than a line to `0,0`.
 */
function wellFrom(wire: WireReservoirMapWell): LeaseMapWell {
  const lon = num(wire.lon);
  const lat = num(wire.lat);
  const hasBottom =
    typeof wire.bh_lon === "number" && typeof wire.bh_lat === "number";

  return {
    api: text(wire.api10),
    name: text(wire.well_number) || text(wire.api10),
    drilled: profileOf(wire.profile),
    depthFt: num(wire.depth_ft),
    openTopFt: 0,
    openBottomFt: 0,
    lateralFt: wire.lateral_ft ?? null,
    bearing: wire.bearing_compass ?? null,
    surface: [lon, lat],
    bottom: hasBottom ? [num(wire.bh_lon), num(wire.bh_lat)] : [lon, lat],
    /* NOT ON THIS PAYLOAD. The map sizes nothing by volume and the tooltip does
       not print it; the wells table on the lease report is where a well's
       filed gas belongs. Zero rather than a borrowed figure. */
    gasFiled: 0,
  };
}

export function leaseMapFromApi(wire: WireLeaseMap): LeaseMapData {
  const bands = wire.neighbour_bands ?? [];
  const ground = wire.ground ?? {};

  return {
    wells: (wire.map?.wells ?? []).map(wellFrom),

    /* The card's own three pills, in its own order, each filled from the band
       that matches its mileage. A radius the service did not answer for reads
       as zero rather than vanishing — a missing pill would change the control
       from lease to lease. */
    rings: Object.entries(RING_MILES).map(([label, miles]) => ({
      label,
      count: num(bands.find((band) => band.band === miles)?.wells),
    })),

    ground: {
      acres: num(ground.acres),
      surfaceHoles: num(ground.surface_holes),
      bottomHoles: num(ground.bottom_holes),
      pathsMeasured: num(ground.paths_measured),
      pathsEstimated: num(ground.paths_estimated),
    },

    outlineNote: text(ground.outline_note) || undefined,
    mapNote: text(wire.map?.note) || undefined,
  };
}
