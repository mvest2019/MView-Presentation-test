import { wellRecords } from "../../_lib/well-records";

/**
 * THE PIECES BOTH LEASE MAPS SHARE.
 *
 * The well report's map and the reservoir report's map are the same control
 * over different subjects: the same six basemaps, the same distance rings, the
 * same recentre button. They were diverging — the reservoir map still had three
 * basemaps and no rings after the well map got six and gained them — so the
 * parts that must not differ live here and both import them.
 *
 * ANYTHING GENUINELY PER-MAP STAYS IN ITS OWN FILE: what is drawn on it, what
 * the hover panel says, and where the view is centred.
 */

export type Basemap =
  | "satellite"
  | "hybrid"
  | "topo-vector"
  | "streets-vector"
  | "terrain"
  | "gray-vector";

/**
 * THE SIX BASEMAPS, AND EACH ONE ANSWERS A DIFFERENT QUESTION ABOUT THE GROUND.
 *
 *   Satellite  what is actually there — the pad, the road cut, the tree line
 *   Hybrid     the same imagery with the roads and place names drawn on, which
 *              is the one that answers "whose land is that next to mine"
 *   Topo       contours and water, for how the ground lies
 *   Street     the road network alone, for getting to it
 *   Terrain    relief with almost nothing else, so shape is all that shows
 *   Light      a near-blank grey canvas: the well marks are the only thing with
 *              colour on it, which is the one to use when reading the wellbore
 *              paths rather than the ground
 *
 * ORDER IS IMAGERY FIRST, ABSTRACTION LAST. A reader opening a map of their own
 * acreage wants to see it before they want a diagram of it, so the default is
 * Satellite and the drawn maps follow.
 */
export const BASEMAPS: { value: Basemap; label: string }[] = [
  { value: "satellite", label: "Satellite" },
  { value: "hybrid", label: "Hybrid" },
  { value: "topo-vector", label: "Topo" },
  { value: "streets-vector", label: "Street" },
  { value: "terrain", label: "Terrain" },
  { value: "gray-vector", label: "Light" },
];

/** How far each ring pill reaches, in miles. Keyed by the pill's own label. */
export const RING_MILES: Record<string, number> = {
  "1 mi": 1,
  "3 mi": 3,
  "5 mi": 5,
};

/** Zoom levels that frame each ring. Bigger ring, wider view. */
export const RING_ZOOM: Record<string, number> = {
  lease: 15,
  "1 mi": 13.5,
  "3 mi": 12.2,
  "5 mi": 11.4,
};

/** Mean earth radius, miles — the sphere both bits of maths below run on. */
const EARTH_MILES = 3958.8;

/**
 * GREAT-CIRCLE DISTANCE, for counting what falls inside a ring.
 *
 * Small enough distances that the curvature barely matters, but the formula is
 * three lines and gets the counts right rather than nearly right.
 */
export function milesBetween(a: [number, number], b: [number, number]): number {
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad;
  const dLng = (a[0] - b[0]) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_MILES * Math.asin(Math.sqrt(h));
}

/**
 * How many OTHER wells sit inside each ring around a point.
 *
 * `exclude` is the set of API numbers already drawn on the map, so a map of one
 * well does not count itself and a map of a reservoir's four wells does not
 * count those four as neighbours of themselves.
 */
export function ringCounts(
  centre: [number, number],
  exclude: ReadonlySet<string>,
): { label: string; count: number }[] {
  const distances = wellRecords
    .filter((entry) => !exclude.has(entry.api))
    .map((entry) => milesBetween(centre, entry.surface));

  return Object.entries(RING_MILES).map(([label, miles]) => ({
    label,
    count: distances.filter((distance) => distance <= miles).length,
  }));
}

/**
 * A RING OF POINTS A GIVEN DISTANCE FROM A POINT, ON THE SPHERE.
 *
 * WHY NOT `radius / 69` IN DEGREES: a degree of longitude is only 69 miles at
 * the equator and narrows with the cosine of the latitude, so the easy version
 * draws an ellipse that is too wide — at this latitude a "5 mi" ring would
 * overstate the east-west reach by about a fifth, while the count on the pill
 * beside it is measured properly. A ring that disagrees with its own number is
 * worse than no ring.
 *
 * This is the destination-point formula walked around the compass, so every
 * point on the ring is genuinely the stated distance out. `path[0]` is due
 * NORTH, which is where the label rides — a quarter of the way round is east,
 * and putting the labels there strung them out sideways in a row instead of
 * sitting on their own arcs.
 */
export function ringPath(
  [lon, lat]: [number, number],
  miles: number,
  steps = 90,
): [number, number][] {
  const rad = Math.PI / 180;
  const d = miles / EARTH_MILES;
  const lat1 = lat * rad;
  const lon1 = lon * rad;
  const points: [number, number][] = [];

  for (let step = 0; step <= steps; step += 1) {
    const bearing = (step / steps) * 2 * Math.PI;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d) +
        Math.cos(lat1) * Math.sin(d) * Math.cos(bearing),
    );
    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(d) * Math.cos(lat1),
        Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
      );
    points.push([lon2 / rad, lat2 / rad]);
  }
  return points;
}

/**
 * The dashed circle and its label, as Esri symbol descriptions.
 *
 * Returned as plain objects rather than `Graphic` instances so this file stays
 * free of the ArcGIS modules — the caller has already loaded them and passes
 * each through its own `new Graphic(...)`.
 */
export function ringSymbols(
  centre: [number, number],
  outerMiles: number,
): { geometry: Record<string, unknown>; symbol: Record<string, unknown> }[] {
  const out: {
    geometry: Record<string, unknown>;
    symbol: Record<string, unknown>;
  }[] = [];

  for (const [label, miles] of Object.entries(RING_MILES)) {
    if (miles > outerMiles) continue;
    const path = ringPath(centre, miles);
    const north = path[0];

    out.push({
      geometry: { type: "polyline", paths: [path] },
      symbol: {
        type: "simple-line",
        color: [255, 255, 255, 0.92],
        width: 1.4,
        style: "dash",
      },
    });
    out.push({
      geometry: { type: "point", longitude: north[0], latitude: north[1] },
      symbol: {
        type: "text",
        text: label,
        color: [255, 255, 255, 1],
        haloColor: [15, 23, 42, 0.85],
        haloSize: 1.4,
        yoffset: 5,
        font: { size: 10, weight: "bold" },
      },
    });
  }

  return out;
}
