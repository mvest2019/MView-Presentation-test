/*
 * Export CSV — what the map is showing, as a file.
 *
 * "Showing" means inside the current extent, not everything the last request
 * returned: the bubbles are only re-fetched when the zoom band changes, so
 * after a pan the loaded set reaches beyond the screen. Filtering here keeps
 * the file honest about what was on screen when the button was pressed.
 *
 * Unless a filter is applied. Then the reader asked for a set — "2,192 wells",
 * as the map itself said — and handing over only the part of it that fits the
 * window is a different answer to the question. `bounds` is null for that, and
 * every row goes.
 */

import { type MapWell } from "@/lib/map-api";

import { type WellCluster } from "./cluster-graphics";

export type Bounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

const CLUSTER_FILENAME = "mineral-view-clusters.csv";
const WELL_FILENAME = "mineral-view-wells.csv";

function inside(lon: number, lat: number, bounds: Bounds): boolean {
  return (
    lon >= bounds.west &&
    lon <= bounds.east &&
    lat >= bounds.south &&
    lat <= bounds.north
  );
}

/** One value, as a field: empty where there is none, quoted where it needs it. */
function cell(value: string | number | null | undefined): string {
  /* Not `String(value)`: on a missing field that writes the word "undefined"
     into the file, which reads as data. The rows from `matched-wells` carry
     fewer columns than the extent rows do, so this is the common case rather
     than the odd one. */
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function download(
  rows: (string | number | null | undefined)[][],
  filename: string,
): void {
  const url = URL.createObjectURL(
    new Blob([rows.map((row) => row.map(cell).join(",")).join("\r\n")], {
      type: "text/csv;charset=utf-8",
    }),
  );

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/*
 * Every column a well row can fill, and where each reads from.
 *
 * Which of them a file ends up with depends on the rows: the extent feed
 * carries the lease, the well number and the operator, and `matched-wells`
 * does not. A column no row can fill is left out rather than written as a
 * stripe of empty cells.
 */
const WELL_COLUMNS: {
  head: string;
  read: (well: MapWell) => string | number | null | undefined;
}[] = [
  { head: "api", read: (well) => well.api },
  { head: "lease", read: (well) => well.lease },
  { head: "well", read: (well) => well.well },
  { head: "operator", read: (well) => well.operator },
  { head: "status", read: (well) => well.status },
  /* The extent feed names the type outright; the filtered one names the
     symbol, which is the same fact under another name. */
  { head: "type", read: (well) => well.wtype ?? well.icon },
  { head: "direction", read: (well) => well.profile },
  { head: "record", read: (well) => well.recordType },
  { head: "county", read: (well) => well.county },
  { head: "longitude", read: (well) => well.lon },
  { head: "latitude", read: (well) => well.lat },
];

const filled = (value: string | number | null | undefined) =>
  value !== null && value !== undefined && value !== "";

/**
 * Downloads whichever of the two the map is drawing. Returns how many rows
 * went out, so the caller can say when there was nothing to export.
 */
export function exportVisible(
  clusters: WellCluster[],
  wells: MapWell[],
  /** Null to send everything loaded — which is what a filter asked for. */
  bounds: Bounds | null,
): number {
  if (wells.length > 0) {
    const visible = bounds
      ? wells.filter((well) => inside(well.lon, well.lat, bounds))
      : wells;
    if (visible.length === 0) return 0;

    const columns = WELL_COLUMNS.filter((column) =>
      visible.some((well) => filled(column.read(well))),
    );

    download(
      [
        columns.map((column) => column.head),
        ...visible.map((well) => columns.map((column) => column.read(well))),
      ],
      WELL_FILENAME,
    );
    return visible.length;
  }

  const visible = bounds
    ? clusters.filter((cluster) => inside(cluster.at[0], cluster.at[1], bounds))
    : clusters;
  if (visible.length === 0) return 0;

  download(
    [
      ["name", "longitude", "latitude", "wells", "oil", "gas", "oil_gas"],
      ...visible.map((cluster) => [
        cluster.name,
        cluster.at[0],
        cluster.at[1],
        cluster.count,
        cluster.oil,
        cluster.gas,
        cluster.oilGas,
      ]),
    ],
    CLUSTER_FILENAME,
  );
  return visible.length;
}
