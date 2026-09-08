/*
 * Drawing individual wells, once the map is close enough to show them.
 *
 * Each well names a legend symbol in its `icon` field — "Plugged Oil", "Dry
 * Hole" and so on — and the legends endpoint gives the image for that name, so
 * the map draws exactly what the legend promises rather than a second set of
 * marks that has to be kept in step with it.
 *
 * A horizontal or directional well is drawn as its bore, not as one dot: the
 * service sends a `path` from the surface hole to the bottom hole, and on a
 * modern lateral those are a mile or more apart.
 *
 * Which end carries which symbol is the Railroad Commission's convention, not
 * a choice: the hollow pentagon and diamond are *surface* location markers, and
 * the well's own symbol — the oil dot, the gas star, the plugged mark — belongs
 * at the bottom hole, where the well is producing from. Every other well is a
 * single mark at its one location.
 */

import { type MapWell } from "@/lib/map-api";

type GraphicCtor = new (props: Record<string, unknown>) => unknown;

/*
 * Icon size on screen, in pixels.
 *
 * Small: a well-dense county puts thousands of these on screen at once, and at
 * 16px they merged into blocks of colour with no individual wells left to see.
 */
const WELL_ICON_SIZE = 10;

/** The mark for a well whose `icon` the legend does not cover. */
const FALLBACK_SYMBOL = {
  type: "simple-marker",
  size: 5,
  color: [46, 143, 109, 0.9],
  outline: { color: [255, 255, 255, 0.9], width: 1 },
};

/*
 * The bore, and the ring at the end of it.
 *
 * Thin and grey: hundreds of these cross one another in a developed field, and
 * anything heavier read as a road on the basemap. The ring marks which end is
 * the bottom hole — without it a lateral is a line with two identical ends and
 * no way to tell which way the well was drilled.
 */
const BORE_SYMBOL = {
  type: "simple-line",
  color: [94, 100, 106, 0.52],
  width: 1,
};

/*
 * The surface hole of a deviated well.
 *
 * The legend has a symbol for each way a hole is drilled — a pentagon for
 * "Horizontal", a diamond for "Directional" — and the well says which it is in
 * `profile`, so the surface end of the line is marked with the legend's own
 * image rather than a shape of our invention. The plain ring only stands in
 * until the legend images have loaded.
 */
const SURFACE_HOLE_SIZE = 9;

const SURFACE_HOLE_SYMBOL = {
  type: "simple-marker",
  style: "circle",
  size: 6,
  color: [0, 0, 0, 0],
  outline: { color: [94, 100, 106, 0.66], width: 1 },
};

/*
 * The two profiles the legend draws a bore for.
 *
 * The line symbol is named "Horizontal/Directional Lines", so these are the
 * only wells that get one — and they are exactly the wells the legend has a
 * bottom-hole symbol for. A vertical well whose two ends differ by a couple of
 * hundred metres of drift is still a vertical well: it gets its surface mark
 * and nothing else.
 */
const BORE_PROFILES = new Set(["Horizontal", "Directional"]);

/** A path worth drawing: a bore profile, and two points that are not the same. */
function borePath(well: MapWell): [number, number][] | null {
  if (!well.profile || !BORE_PROFILES.has(well.profile)) return null;

  const path = well.path?.filter(
    (point) => Array.isArray(point) && point.length >= 2,
  );
  if (!path || path.length < 2) return null;

  const [firstLon, firstLat] = path[0];
  const moves = path.some(([lon, lat]) => lon !== firstLon || lat !== firstLat);

  return moves ? path : null;
}

/**
 * Where a well is marked on the map.
 *
 * The bottom of the bore where there is one, the single location where there
 * is not — the same point `buildWellGraphics` draws the symbol at. Anything
 * pointing at a well has to use this: on a two-mile lateral the surface hole
 * is nowhere near the icon somebody clicked.
 */
export function wellMarkPoint(well: MapWell): [number, number] {
  const path = borePath(well);
  return path ? path[path.length - 1] : [well.lon, well.lat];
}

/**
 * Where the well was drilled from — the top of the bore, or its only location
 * where there is no bore. Where the small collar symbol goes; the well's own
 * status symbol, and the ring that marks it, sit at the other end.
 */
export function wellSurfacePoint(well: MapWell): [number, number] {
  const path = borePath(well);
  return path ? path[0] : [well.lon, well.lat];
}

export function buildWellGraphics(
  Graphic: GraphicCtor,
  wells: MapWell[],
  iconByDescription: Map<string, string>,
): unknown[] {
  const bores: unknown[] = [];
  const marks: unknown[] = [];

  for (const well of wells) {
    const url = iconByDescription.get(well.icon);
    const identity = {
      api: well.api,
      lease: well.lease,
      well: well.well,
      operator: well.operator,
      status: well.status,
      wtype: well.wtype,
      county: well.county,
      recordType: well.recordType ?? "",
    };

    const path = borePath(well);
    // The well's own symbol goes at the bottom hole when there is a bore, and
    // at its only location when there is not.
    const [markLon, markLat] = wellMarkPoint(well);
    const attributes = {
      ...identity,
      // Where the symbol was actually drawn: the ring on a clicked well and
      // the hover card both come back to this, and on a two-mile lateral the
      // surface hole is nowhere near the mark that was clicked.
      lon: markLon,
      lat: markLat,
    };

    if (path) {
      // The bore carries the same attributes, so clicking the line opens the
      // well it belongs to rather than falling through to the map.
      bores.push(
        new Graphic({
          /*
           * Degrees, said out loud.
           *
           * Without `spatialReference` the autocast reads the numbers in the
           * view's own reference — Web Mercator metres — and -98.4 metres east
           * of Greenwich puts the bore in the Atlantic, off screen, which is
           * why no line appeared. The point geometries are safe because
           * `longitude`/`latitude` name their units; `paths` does not.
           */
          geometry: {
            type: "polyline",
            paths: [path],
            spatialReference: { wkid: 4326 },
          },
          symbol: BORE_SYMBOL,
          attributes,
        }),
      );

      const [surfaceLon, surfaceLat] = wellSurfacePoint(well);
      const profileUrl = well.profile
        ? iconByDescription.get(well.profile)
        : undefined;

      bores.push(
        new Graphic({
          geometry: {
            type: "point",
            longitude: surfaceLon,
            latitude: surfaceLat,
            spatialReference: { wkid: 4326 },
          },
          symbol: profileUrl
            ? {
                type: "picture-marker",
                url: profileUrl,
                width: SURFACE_HOLE_SIZE,
                height: SURFACE_HOLE_SIZE,
              }
            : SURFACE_HOLE_SYMBOL,
          attributes,
        }),
      );
    }

    marks.push(
      new Graphic({
        geometry: {
          type: "point",
          longitude: markLon,
          latitude: markLat,
          spatialReference: { wkid: 4326 },
        },
        symbol: url
          ? {
              type: "picture-marker",
              url,
              width: WELL_ICON_SIZE,
              height: WELL_ICON_SIZE,
            }
          : FALLBACK_SYMBOL,
        attributes,
      }),
    );
  }

  // Bores first: the surface marks sit on top of every line that crosses them.
  return [...bores, ...marks];
}
