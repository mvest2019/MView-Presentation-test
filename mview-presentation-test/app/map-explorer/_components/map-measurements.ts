/*
 * The maths behind the map's tools: what falls inside a drawn rectangle, a
 * watch circle or a measured tract, and the CSV each one downloads.
 *
 * Pure functions over plain numbers — no Esri view, no React. Each takes the
 * clusters it should count, so the view hands them whatever is on screen.
 */

import { type AreaMeasurement } from "./measure-area-panel";
import { type MapLeaseNearby, type MapWell } from "@/lib/map-api";

import { type WellCluster } from "./cluster-graphics";

export type LonLat = { longitude: number; latitude: number };

/**
 * A picked point and the circle drawn around it.
 *
 * Geometry only. What is inside the circle is answered by
 * `/map/leases/{key}/nearby` for the lease under the point, not counted here —
 * the old local tally is gone, and with it the figures it could not know:
 * permits it always reported as nought, and wells it could only see if the map
 * had already loaded them.
 */
export type Nearby = {
  at: LonLat;
  radiusMiles: number;
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
  wells: MapWell[],
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

  /*
   * Individual wells where the map has them, bubbles where it does not.
   *
   * Past the well zoom there are no bubbles left, so counting only those
   * reported nought wells over a tract visibly full of them.
   */
  let wellsInside = 0;
  if (wells.length > 0) {
    for (const well of wells) {
      if (boreInRing(well, points)) wellsInside += 1;
    }
  } else {
    for (const cluster of clusters) {
      if (pointInRing(cluster.at[0], cluster.at[1], points)) {
        wellsInside += cluster.count;
      }
    }
  }

  return {
    acres,
    squareMiles,
    perimeterMiles: perimetreMetres / METRES_PER_MILE,
    wellsInside,
    /*
     * Not a zero — nothing to count from.
     *
     * The wells feed excludes permits outright: its own note says "dry holes,
     * permits, canceled locations, service wells and wells with no symbol are
     * excluded", and the status facet offers only Producing, Plugged, Service
     * and Shut-In. Reporting 0 would be a measurement; null is the truth.
     */
    permitsInside: null,
    // A section is one square mile.
    wellsPerSection: squareMiles ? wellsInside / squareMiles : 0,
  };
}

/**
 * Whether a well's bore meets the tract at all.
 *
 * Either end inside counts, and so does a bore that runs clean through — a
 * modern lateral is a mile or more long, so a tract can sit entirely between
 * one well's surface hole and its bottom hole.
 */
function boreInRing(well: MapWell, ring: LonLat[]): boolean {
  if (pointInRing(well.lon, well.lat, ring)) return true;

  const bhLon = well.bhLon ?? well.lon;
  const bhLat = well.bhLat ?? well.lat;
  if (bhLon === well.lon && bhLat === well.lat) return false;
  if (pointInRing(bhLon, bhLat, ring)) return true;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    if (
      segmentsCross(
        well.lon,
        well.lat,
        bhLon,
        bhLat,
        ring[j].longitude,
        ring[j].latitude,
        ring[i].longitude,
        ring[i].latitude,
      )
    ) {
      return true;
    }
  }

  return false;
}

/** Which side of AB a point falls on — positive, negative or on the line. */
function side(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  px: number,
  py: number,
): number {
  return (bx - ax) * (py - ay) - (by - ay) * (px - ax);
}

/** Whether AB and CD properly cross. Touching at an end does not count. */
function segmentsCross(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): boolean {
  const d1 = side(cx, cy, dx, dy, ax, ay);
  const d2 = side(cx, cy, dx, dy, bx, by);
  const d3 = side(ax, ay, bx, by, cx, cy);
  const d4 = side(ax, ay, bx, by, dx, dy);

  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  );
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

/**
 * Individual wells inside the drawn box.
 *
 * Separate from `wellsInArea`, which counts whole bubbles: past the well zoom
 * there are no bubbles left on the map, so counting them reported nought
 * wells over an area visibly full of them.
 */
export function wellsInBox(
  wells: { lon: number; lat: number }[],
  area: Area,
): number {
  return wells.filter(
    ({ lon, lat }) =>
      lon >= area.west &&
      lon <= area.east &&
      lat >= area.south &&
      lat <= area.north,
  ).length;
}


/**
 * The loaded wells nearest a point, closest first.
 *
 * Several rather than one, because the nearest well cannot always answer the
 * question asked of it: a fair number of records carry no lease number, and
 * without one there is no lease key to ask the service about. Walking outward
 * finds the nearest well that can.
 *
 * Which well is closest is all this has to get right, so it compares squared
 * degrees rather than calling the geodesic — with longitude scaled by the
 * cosine of the latitude, because a degree of longitude is shorter than a
 * degree of latitude everywhere but the equator. Without that correction, at
 * Texas latitudes an east-west gap reads about 15% nearer than it is, which is
 * enough to order two wells wrongly.
 *
 * A horizontal well is measured from both ends of its bore: the surface hole
 * can sit a mile from the part of the well that is actually under the point.
 */
export function nearestWellsTo(
  at: LonLat,
  wells: MapWell[],
  limit: number,
): MapWell[] {
  const scale = Math.cos((at.latitude * Math.PI) / 180);

  const measured = wells.map((well) => {
    const ends: [number, number][] = [[well.lon, well.lat]];
    if (well.bhLon !== undefined && well.bhLat !== undefined) {
      ends.push([well.bhLon, well.bhLat]);
    }

    let away = Infinity;
    for (const [lon, lat] of ends) {
      const east = (lon - at.longitude) * scale;
      const north = lat - at.latitude;
      away = Math.min(away, east * east + north * north);
    }

    return { well, away };
  });

  return measured
    .sort((one, other) => one.away - other.away)
    .slice(0, limit)
    .map(({ well }) => well);
}

/** A field needs quoting when it holds a comma, a quote or a line break. */
const CSV_QUOTE = new RegExp('[",\\n]');

/**
 * The filings the service returned, as a spreadsheet.
 *
 * The filings rather than the wells: the ring's well count is a total, and the
 * events are the only thing that comes back row by row.
 */
export function downloadNearbyFilings(nearby: MapLeaseNearby) {
  const cell = (value: string) =>
    CSV_QUOTE.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

  const rows = [
    [
      "type",
      "lease",
      "well",
      "api",
      "operator",
      "direction",
      "status",
      "date",
      "date basis",
      "miles",
      "bearing",
      "longitude",
      "latitude",
    ],
    ...nearby.events.map((event) => [
      event.type,
      event.leaseName,
      event.well,
      event.api,
      event.operator,
      event.direction ?? "",
      event.status ?? "",
      event.date ?? "",
      event.dateBasis ?? "",
      event.distanceMiles === null ? "" : String(event.distanceMiles),
      event.bearing ?? "",
      event.lon === null ? "" : String(event.lon),
      event.lat === null ? "" : String(event.lat),
    ]),
  ];

  const url = URL.createObjectURL(
    new Blob([rows.map((row) => row.map(cell).join(",")).join("\r\n")], {
      type: "text/csv;charset=utf-8",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `near-${nearby.lease.key}-${nearby.radiusMiles}mi.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
