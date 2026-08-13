/*
 * The maths behind the map's tools: what falls inside a drawn rectangle, a
 * watch circle or a measured tract, and the CSV each one downloads.
 *
 * Pure functions over plain numbers — no Esri view, no React. Each takes the
 * clusters it should count, so the view hands them whatever is on screen.
 */

import { type AreaMeasurement } from "./measure-area-panel";
import { type NearbyStats } from "./nearby-panel";
import { type WellCluster } from "./cluster-graphics";

export type LonLat = { longitude: number; latitude: number };

/** A picked point and the circle drawn around it. */
export type Nearby = {
  at: LonLat;
  radiusMiles: number;
  stats: NearbyStats;
};

/** The two Esri pieces the maths needs — the rest of the SDK stays out. */
export type PointCtor = new (props: {
  longitude: number;
  latitude: number;
  spatialReference: { wkid: number };
}) => unknown;

export type GeodesicUtils = {
  /** Ellipsoidal, not great-circle — worth ~0.5% over a few hundred miles. */
  geodesicDistance(
    from: unknown,
    to: unknown,
    unit: "meters",
  ): { distance: number };
  /** `azimuth` is degrees clockwise from north. */
  pointFromDistance(from: unknown, meters: number, azimuth: number): LonLat;
};

const AREA_CSV_FILENAME = "mineral-view-area.csv";
const WATCH_CSV_FILENAME = "mineral-view-nearby.csv";

/** A drawn rectangle, in degrees. */
export type Area = { west: number; south: number; east: number; north: number };

export const METRES_PER_MILE = 1609.344;

/**
 * Clusters whose centre falls inside the rectangle.
 *
 * Cluster-level, not well-level: the map only holds the aggregated bubbles, so
 * a cluster is in or out as a whole. Against the real well layer this becomes a
 * spatial query and the count gets exact.
 */
export function clustersInArea(clusters: WellCluster[], area: Area) {
  return clusters.filter(
    ({ at: [longitude, latitude] }) =>
      longitude >= area.west &&
      longitude <= area.east &&
      latitude >= area.south &&
      latitude <= area.north,
  );
}

/**
 * What the watch card reports.
 *
 * Same caveat as the drawn area: the map holds aggregated bubbles, not
 * individual bores, so "wells" counts whole clusters falling inside the circle
 * and "nearest bore" measures to a cluster centre. Permits are always zero —
 * there is no permit layer to read. All three become real queries once the well
 * layer lands; only the numbers change, not this card.
 */
export function nearbyStats(
  clusters: WellCluster[],
  at: LonLat,
  radiusMiles: number,
  geodesic: GeodesicUtils,
  Point: PointCtor,
): NearbyStats {
  const centre = new Point({
    longitude: at.longitude,
    latitude: at.latitude,
    spatialReference: { wkid: 4326 },
  });

  const radiusMetres = radiusMiles * METRES_PER_MILE;
  let wells = 0;
  let inside = 0;
  let newestYear: number | null = null;
  let nearest = Infinity;

  for (const cluster of clusters) {
    const metres = geodesic.geodesicDistance(
      centre,
      new Point({
        longitude: cluster.at[0],
        latitude: cluster.at[1],
        spatialReference: { wkid: 4326 },
      }),
      "meters",
    ).distance;

    if (metres <= radiusMetres) {
      wells += cluster.count;
      inside += 1;
      if (
        cluster.newestYear !== null &&
        (newestYear === null || cluster.newestYear > newestYear)
      ) {
        newestYear = cluster.newestYear;
      }
    }
    if (metres < nearest) nearest = metres;
  }

  return {
    permits: 0,
    wells,
    nearestBoreMiles: nearest === Infinity ? null : nearest / METRES_PER_MILE,
    // The clusters carry no operator attribution, so everything inside falls
    // into the same catch-all bucket the county list uses.
    operators: inside ? [{ name: "All other operators", count: inside }] : [],
    newestYear,
  };
}

/**
 * The county the point sits in.
 *
 * NOTE: this is Esri's public *sample* server — fine for a prototype, not
 * something to ship against. Swap in the counties layer the live map already
 * uses (`mview-portal.mineralview.com/gis/counties.geojson`) before release.
 * Returns null on any failure; the card just drops the "· County" suffix.
 */
const COUNTY_QUERY_URL =
  "https://sampleserver6.arcgisonline.com/arcgis/rest/services/USA/MapServer/3/query";

export async function lookupCounty(at: LonLat): Promise<string | null> {
  const params = new URLSearchParams({
    f: "json",
    returnGeometry: "false",
    outFields: "NAME",
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    geometry: JSON.stringify({
      x: at.longitude,
      y: at.latitude,
      spatialReference: { wkid: 4326 },
    }),
  });

  try {
    const response = await fetch(`${COUNTY_QUERY_URL}?${params}`);
    const body = await response.json();

    // Field casing is not guaranteed — this service echoes `NAME` back as
    // `name`. Take whichever key came home rather than assuming.
    const attributes: Record<string, unknown> =
      body?.features?.[0]?.attributes ?? {};
    const name = attributes.NAME ?? attributes.name;
    return typeof name === "string" ? name : null;
  } catch {
    return null;
  }
}

export function downloadNearbyCsv(
  clusters: WellCluster[],
  watch: Nearby,
  geodesic: GeodesicUtils,
  Point: PointCtor,
): void {
  const centre = new Point({
    longitude: watch.at.longitude,
    latitude: watch.at.latitude,
    spatialReference: { wkid: 4326 },
  });
  const radiusMetres = watch.radiusMiles * METRES_PER_MILE;

  const rows: (string | number)[][] = [
    ["longitude", "latitude", "wells", "newest_year"],
  ];

  for (const cluster of clusters) {
    const metres = geodesic.geodesicDistance(
      centre,
      new Point({
        longitude: cluster.at[0],
        latitude: cluster.at[1],
        spatialReference: { wkid: 4326 },
      }),
      "meters",
    ).distance;
    if (metres <= radiusMetres) {
      // Blank rather than "null" — the source reports no drill year.
      rows.push([
        cluster.at[0],
        cluster.at[1],
        cluster.count,
        cluster.newestYear ?? "",
      ]);
    }
  }

  const url = URL.createObjectURL(
    new Blob([rows.map((row) => row.join(",")).join("\r\n")], {
      type: "text/csv;charset=utf-8",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = WATCH_CSV_FILENAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Area, perimeter and contents of a closed tract.
 *
 * The area uses the spherical-excess formula rather than Esri's
 * `geodesicAreas`, which would mean loading two more geometry modules to get a
 * result that differs by well under a percent at these sizes. The perimeter is
 * a sum of great-circle hops between corners.
 */
export function measureTract(
  clusters: WellCluster[],
  points: LonLat[],
): AreaMeasurement {
  const R = 6378137;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  let sum = 0;
  let perimetreMetres = 0;

  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];

    sum +=
      (toRad(b.longitude) - toRad(a.longitude)) *
      (2 + Math.sin(toRad(a.latitude)) + Math.sin(toRad(b.latitude)));

    // Haversine — the corners are far apart, so a flat approximation would
    // drift badly across a tract this size.
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a.latitude)) *
        Math.cos(toRad(b.latitude)) *
        Math.sin(dLon / 2) ** 2;
    perimetreMetres += 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  const squareMetres = Math.abs((sum * R * R) / 2);
  const squareMiles = squareMetres / 2_589_988.11;
  const acres = squareMetres / 4046.856;

  let wellsInside = 0;
  for (const cluster of clusters) {
    if (pointInRing(cluster.at[0], cluster.at[1], points)) {
      wellsInside += cluster.count;
    }
  }

  return {
    acres,
    squareMiles,
    perimeterMiles: perimetreMetres / METRES_PER_MILE,
    wellsInside,
    // No permit layer to read, same as the watch card.
    permitsInside: 0,
    // A section is one square mile.
    wellsPerSection: squareMiles ? wellsInside / squareMiles : 0,
  };
}

/** Ray casting, on plain lon/lat — exact enough for a hand-drawn tract. */
export function pointInRing(lon: number, lat: number, ring: LonLat[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].longitude;
    const yi = ring[i].latitude;
    const xj = ring[j].longitude;
    const yj = ring[j].latitude;
    if (
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

export function wellsInArea(clusters: WellCluster[], area: Area): number {
  return clustersInArea(clusters, area).reduce(
    (total, { count }) => total + count,
    0,
  );
}

export function downloadAreaCsv(clusters: WellCluster[], area: Area): void {
  const rows = [
    ["longitude", "latitude", "wells"],
    ...clustersInArea(clusters, area).map(({ at, count }) => [
      at[0],
      at[1],
      count,
    ]),
  ];

  const url = URL.createObjectURL(
    new Blob([rows.map((row) => row.join(",")).join("\r\n")], {
      type: "text/csv;charset=utf-8",
    }),
  );

  const link = document.createElement("a");
  link.href = url;
  link.download = AREA_CSV_FILENAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
