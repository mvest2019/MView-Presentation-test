/*
 * Export CSV — what the map is showing, as a file.
 *
 * "Showing" means inside the current extent, not everything the last request
 * returned: the bubbles are only re-fetched when the zoom band changes, so
 * after a pan the loaded set reaches beyond the screen. Filtering here keeps
 * the file honest about what was on screen when the button was pressed.
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

/** Quotes a field only when it needs it — commas and quotes in operator names. */
function cell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function download(rows: (string | number)[][], filename: string): void {
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

/**
 * Downloads whichever of the two the map is drawing. Returns how many rows
 * went out, so the caller can say when there was nothing to export.
 */
export function exportVisible(
  clusters: WellCluster[],
  wells: MapWell[],
  bounds: Bounds,
): number {
  if (wells.length > 0) {
    const visible = wells.filter((well) => inside(well.lon, well.lat, bounds));
    if (visible.length === 0) return 0;

    download(
      [
        [
          "api",
          "lease",
          "well",
          "operator",
          "status",
          "type",
          "county",
          "longitude",
          "latitude",
        ],
        ...visible.map((well) => [
          well.api,
          well.lease,
          well.well,
          well.operator,
          well.status,
          well.wtype,
          well.county,
          well.lon,
          well.lat,
        ]),
      ],
      WELL_FILENAME,
    );
    return visible.length;
  }

  const visible = clusters.filter((cluster) =>
    inside(cluster.at[0], cluster.at[1], bounds),
  );
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
