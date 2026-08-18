/*
 * Drawing individual wells, once the map is close enough to show them.
 *
 * Each well names a legend symbol in its `icon` field — "Plugged Oil", "Dry
 * Hole" and so on — and the legends endpoint gives the image for that name, so
 * the map draws exactly what the legend promises rather than a second set of
 * marks that has to be kept in step with it.
 *
 * A deviated well is drawn as its bore, not as one dot: the service sends a
 * `path` from the surface hole to the bottom hole, and on a modern lateral
 * those are a mile or more apart. Where the two ends coincide — a vertical
 * well — there is nothing to draw but the mark.
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

const BOTTOM_HOLE_SYMBOL = {
  type: "simple-marker",
  style: "circle",
  size: 6,
  color: [0, 0, 0, 0],
  outline: { color: [94, 100, 106, 0.66], width: 1 },
};

/** A path worth drawing: two or more points, and not all the same one. */
function borePath(well: MapWell): [number, number][] | null {
  const path = well.path?.filter(
    (point) => Array.isArray(point) && point.length >= 2,
  );
  if (!path || path.length < 2) return null;

  const [firstLon, firstLat] = path[0];
  const moves = path.some(
    ([lon, lat]) => lon !== firstLon || lat !== firstLat,
  );

  return moves ? path : null;
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
    const attributes = {
      api: well.api,
      lon: well.lon,
      lat: well.lat,
      lease: well.lease,
      well: well.well,
      operator: well.operator,
      status: well.status,
      wtype: well.wtype,
      county: well.county,
    };

    const path = borePath(well);
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

      const [bhLon, bhLat] = path[path.length - 1];
      bores.push(
        new Graphic({
          geometry: {
            type: "point",
            longitude: bhLon,
            latitude: bhLat,
            spatialReference: { wkid: 4326 },
          },
          symbol: BOTTOM_HOLE_SYMBOL,
          attributes,
        }),
      );
    }

    marks.push(
      new Graphic({
        geometry: { type: "point", longitude: well.lon, latitude: well.lat },
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
