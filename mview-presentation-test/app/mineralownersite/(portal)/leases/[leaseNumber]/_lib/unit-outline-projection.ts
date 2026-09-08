import { CROW_A_BOUNDARY_PX } from "./unit-outline-data";
import type { UnitOutlineRecord } from "./lease-report-types";

/**
 * THE MAP'S GEOMETRY — pure functions, no DOM, no React.
 *
 * Everything the panel needs to turn lon/lat into SVG coordinates lives here so
 * it can be reasoned about (and corrected) without a browser. The prototype did
 * all of this inline while also creating elements, which is why its projection
 * and its rendering could not be separated.
 *
 * ── THE ONE INVARIANT ──
 *
 * The unit boundary and the plat overlay's affine transform were BOTH solved in
 * the same 960×640 pixel frame. Any change to how one is projected has to be
 * made to the other or the traced boundary slides off the plat it was traced
 * from. That is why `FRAME` is a constant here rather than a prop, and why the
 * boundary is stored in pixels and converted (rather than stored in lon/lat).
 */

export const FRAME = { width: 960, height: 640 } as const;

export type Bbox = readonly [number, number, number, number];

export interface Projection {
  x: (lon: number) => number;
  y: (lat: number) => number;
}

/** Maps lon/lat inside `bbox` onto the 960×640 frame. */
export function project(bbox: Bbox): Projection {
  const [west, south, east, north] = bbox;
  return {
    x: (lon) => ((lon - west) / (east - west)) * FRAME.width,
    y: (lat) => ((north - lat) / (north - south)) * FRAME.height,
  };
}

/**
 * The Esri World Imagery raster for a bbox, at the frame's own size.
 *
 * A SINGLE RASTER EXPORT, not a tile pyramid — which is what the prototype uses
 * and what keeps this a static `<image href>` with no map library, no client
 * fetching and no key. The trade is that panning past the frame shows no new
 * ground; the design's answer to "show me more" is the Zoom-out button, which
 * requests a second, wider export.
 */
export function imageryUrl(bbox: Bbox): string {
  return (
    "https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export?bbox=" +
    bbox.map((v) => v.toFixed(6)).join(",") +
    `&bboxSR=4326&size=${FRAME.width},${FRAME.height}&format=png&f=image`
  );
}

/** The digitized boundary as `points` for an SVG `<polygon>`, in `bbox`'s frame. */
export function boundaryPoints(record: UnitOutlineRecord, bbox: Bbox): string {
  const unit = record.bbox;
  const p = project(bbox);
  return CROW_A_BOUNDARY_PX.map(([px, py]) => {
    /* Pixels → lon/lat in the UNIT frame (where the trace was solved), then
       forward into whichever frame is being drawn. Two steps, deliberately: it
       is the only way the same trace can render in both views. */
    const lon = unit[0] + (px / FRAME.width) * (unit[2] - unit[0]);
    const lat = unit[3] - (py / FRAME.height) * (unit[3] - unit[1]);
    return `${p.x(lon).toFixed(1)},${p.y(lat).toFixed(1)}`;
  }).join(" ");
}

/**
 * The affine that carries the plat overlay from the unit frame into the wide one.
 *
 * In the zoomed-out view the imagery covers `bbox_wide`, so anything solved
 * against `bbox` — the plat quad, and only the plat quad — needs one transform
 * to stay on the ground it belongs to. Scale and translate only; no rotation,
 * because both frames are north-up.
 */
export function wideViewMatrix(record: UnitOutlineRecord): string {
  const [uw, us, ue, un] = record.bbox;
  const [ww, ws, we, wn] = record.bbox_wide;
  const kx = (ue - uw) / (we - ww);
  const ky = (un - us) / (wn - ws);
  const tx = (FRAME.width * (uw - ww)) / (we - ww);
  const ty = (FRAME.height * (wn - un)) / (wn - ws);
  return `matrix(${kx.toFixed(6)} 0 0 ${ky.toFixed(6)} ${tx.toFixed(2)} ${ty.toFixed(2)})`;
}

/** `"25531770"` → `"42-255-31770"`. The RRC's own 14-digit shape, abbreviated. */
export function formatApi(api8: string): string {
  return `42-${api8.slice(0, 3)}-${api8.slice(3)}`;
}

/**
 * SURFACE HOLES, CLUSTERED BY PAD.
 *
 * Wells on a shared pad sit a few metres apart, which at this scale is about one
 * pixel — twenty-one separate white dots would render as a blob. Anything within
 * 16px of an existing cluster joins it and the cluster is drawn once with a
 * count, so a 21-well unit stays readable at full frame.
 *
 * The cluster's position is the running MEAN of its members, not the first one
 * found, so the marker sits in the middle of the pad rather than on its edge.
 */
export interface SurfacePad {
  x: number;
  y: number;
  count: number;
  names: string[];
}

export function clusterSurfaceHoles(
  wells: UnitOutlineRecord["wells"],
  p: Projection,
): SurfacePad[] {
  const pads: (SurfacePad & { sx: number; sy: number })[] = [];

  for (const well of wells) {
    const x = p.x(well.s[0]);
    const y = p.y(well.s[1]);
    const label = well.well ?? `API ${well.api}`;
    const hit = pads.find((pad) => Math.hypot(pad.x - x, pad.y - y) < 16);

    if (hit) {
      hit.sx += x;
      hit.sy += y;
      hit.count += 1;
      hit.x = hit.sx / hit.count;
      hit.y = hit.sy / hit.count;
      hit.names.push(label);
    } else {
      pads.push({ x, y, sx: x, sy: y, count: 1, names: [label] });
    }
  }

  return pads.map(({ x, y, count, names }) => ({ x, y, count, names }));
}
