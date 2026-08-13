/*
 * Drawing individual wells, once the map is close enough to show them.
 *
 * Each well names a legend symbol in its `icon` field — "Plugged Oil", "Dry
 * Hole" and so on — and the legends endpoint gives the image for that name, so
 * the map draws exactly what the legend promises rather than a second set of
 * marks that has to be kept in step with it.
 */

import { type MapWell } from "@/lib/map-api";

type GraphicCtor = new (props: Record<string, unknown>) => unknown;

/** Icon size on screen, in pixels. Small enough to read a field of them. */
const WELL_ICON_SIZE = 16;

/** The mark for a well whose `icon` the legend does not cover. */
const FALLBACK_SYMBOL = {
  type: "simple-marker",
  size: 6,
  color: [46, 143, 109, 0.9],
  outline: { color: [255, 255, 255, 0.9], width: 1 },
};

export function buildWellGraphics(
  Graphic: GraphicCtor,
  wells: MapWell[],
  iconByDescription: Map<string, string>,
): unknown[] {
  return wells.map((well) => {
    const url = iconByDescription.get(well.icon);

    return new Graphic({
      geometry: { type: "point", longitude: well.lon, latitude: well.lat },
      symbol: url
        ? {
            type: "picture-marker",
            url,
            width: WELL_ICON_SIZE,
            height: WELL_ICON_SIZE,
          }
        : FALLBACK_SYMBOL,
      attributes: {
        api: well.api,
        lease: well.lease,
        well: well.well,
        operator: well.operator,
        status: well.status,
        wtype: well.wtype,
        county: well.county,
      },
    });
  });
}
