/*
 * Export — what the map is showing, as a spreadsheet.
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
import { downloadSheet, type SheetColumn } from "./xlsx";

export type Bounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

const WELL_FILENAME = "mineral-view-wells.xlsx";

/** What the bubbles on screen are, which the file is named and labelled for. */
export type ClusterTier = "clusters" | "sub-clusters";

function inside(lon: number, lat: number, bounds: Bounds): boolean {
  return (
    lon >= bounds.west &&
    lon <= bounds.east &&
    lat >= bounds.south &&
    lat <= bounds.north
  );
}

/*
 * Every column a well row can fill, and where each reads from.
 *
 * Which of them a file ends up with depends on the rows: the extent feed
 * carries the lease, the well number and the operator, and `matched-wells`
 * does not. A column no row can fill is left out rather than written as a
 * stripe of empty cells.
 */
const WELL_COLUMNS: (SheetColumn & {
  read: (well: MapWell) => string | number | null | undefined;
})[] = [
  { head: "API No.", width: 15, read: (well) => well.api },
  { head: "Lease", width: 30, read: (well) => well.lease },
  { head: "Well", width: 12, read: (well) => well.well },
  { head: "Operator", width: 34, read: (well) => well.operator },
  { head: "Status", width: 15, read: (well) => well.status },
  /* The extent feed names the type outright; the filtered one names the
     symbol, which is the same fact under another name. */
  { head: "Type", width: 17, read: (well) => well.wtype ?? well.icon },
  { head: "Direction", width: 13, read: (well) => well.profile },
  { head: "Record", width: 17, read: (well) => well.recordType },
  { head: "County", width: 16, read: (well) => well.county },
  {
    head: "Longitude",
    width: 12,
    format: "coordinate",
    read: (well) => well.lon,
  },
  {
    head: "Latitude",
    width: 12,
    format: "coordinate",
    read: (well) => well.lat,
  },
];

const filled = (value: string | number | null | undefined) =>
  value !== null && value !== undefined && value !== "";

/**
 * What a cell says where the record says nothing.
 *
 * A dash, as the table and the summary show it: an empty cell reads as a
 * column nobody filled in, where a dash says the well has no figure. Numbers
 * still add up — a spreadsheet skips text when it totals a column.
 */
const NOTHING_MARK = "-";

const shown = (value: string | number | null | undefined) =>
  filled(value) ? value : NOTHING_MARK;

/**
 * Downloads whichever of the two the map is drawing. Returns how many rows
 * went out, so the caller can say when there was nothing to export.
 */
export function exportVisible(
  clusters: WellCluster[],
  wells: MapWell[],
  /** Null to send everything loaded — which is what a filter asked for. */
  bounds: Bounds | null,
  /** Which tier the bubbles are, where bubbles are what is being sent. */
  tier: ClusterTier = "clusters",
): number {
  if (wells.length > 0) {
    const visible = bounds
      ? wells.filter((well) => inside(well.lon, well.lat, bounds))
      : wells;
    if (visible.length === 0) return 0;

    const columns = WELL_COLUMNS.filter((column) =>
      visible.some((well) => filled(column.read(well))),
    );

    downloadSheet(
      WELL_FILENAME,
      "Wells",
      columns,
      visible.map((well) => columns.map((column) => shown(column.read(well)))),
    );
    return visible.length;
  }

  const visible = bounds
    ? clusters.filter((cluster) => inside(cluster.at[0], cluster.at[1], bounds))
    : clusters;
  if (visible.length === 0) return 0;

  /* The tier is named in the first column's heading and in the file's name,
     so a column repeating it on every row said nothing. What the three
     figures count is spelled out: "oil" beside "wells" reads as a volume. */
  const named = tier === "sub-clusters" ? "Sub-Cluster Name" : "Cluster Name";

  const columns: SheetColumn[] = [
    { head: named, width: 30 },
    { head: "County", width: 16 },
    /* One line, like every other cell. Wrapped, twenty-five county names
       made a row six lines deep and the sheet unreadable — the value is all
       there, and the column widens with a double-click when it is wanted. */
    { head: "Counties", width: 46 },
    { head: "Longitude", width: 12, format: "coordinate" },
    { head: "Latitude", width: 12, format: "coordinate" },
    { head: "Wells", width: 12, format: "integer" },
    { head: "Oil Wells", width: 12, format: "integer" },
    { head: "Gas Wells", width: 12, format: "integer" },
    { head: "Oil/Gas Wells", width: 14, format: "integer" },
  ];

  downloadSheet(
    `mineral-view-${tier}.xlsx`,
    tier === "sub-clusters" ? "Sub-clusters" : "Clusters",
    columns,
    visible.map((cluster) => [
      shown(cluster.name),
      shown(cluster.topCounty),
      /* Semicolons, not commas: the list is one value, and a comma inside it
         is the classic way to have a spreadsheet split it into columns. */
      shown(cluster.counties.join("; ")),
      cluster.at[0],
      cluster.at[1],
      cluster.count,
      cluster.oil,
      cluster.gas,
      cluster.oilGas,
    ]),
  );
  return visible.length;
}
