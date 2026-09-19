/**
 * Framing a box of wells into the visible part of the map.
 *
 * Extracted from the filter-apply path in `map-explorer-view.tsx`, where it
 * was written inline and worked well. The claimed-leases view needs the same
 * answer for a different box, and the arithmetic below is the kind that is
 * subtly wrong the second time somebody writes it — latitude compression and
 * the rail's covered strip are both easy to leave out and neither shows up
 * until a particular shape of selection lands off-centre.
 *
 * Returns a CENTRE AND A SCALE, not an extent: a plain object is not an Esri
 * `Geometry` and `goTo` will not autocast one.
 */

/** The box to frame, in degrees. */
export type DegreeBox = {
  north: number;
  south: number;
  east: number;
  west: number;
};

/** What the caller knows about the map surface. */
export type ViewSize = { width: number; height: number };

/** Metres in a degree of latitude, near enough for choosing a scale. */
const DEGREE_METRES = 111_320;

/**
 * The smallest box worth fitting, in degrees.
 *
 * A single well is a box of zero size, and dividing by it puts the scale at
 * infinity. Floored, one well frames as a small neighbourhood instead.
 */
const MIN_DEGREES = 0.05;

/** How much of the frame the box is allowed to fill, leaving a margin. */
const FILL = 0.86;

/** The narrowest the map is assumed to be, so a collapsed pane cannot divide by ~0. */
const MIN_USABLE_WIDTH = 240;
const MIN_USABLE_HEIGHT = 200;

export function centreAndScaleFor(
  box: DegreeBox,
  view: ViewSize,
  options: {
    /**
     * Pixels of map hidden behind the filters rail, if it is open. The box is
     * centred in what is VISIBLE, not in the surface, so a selection does not
     * sit half under the panel.
     */
    covered?: number;
    /** The furthest out this is allowed to leave the map. */
    maxScale?: number;
    /** And the closest in — a single well should not fill the screen. */
    minScale?: number;
  } = {},
): { center: [number, number]; scale: number } {
  const { covered = 0, maxScale, minScale } = options;

  /*
   * Fitted per axis. Both sides matter: a box four degrees wide and one deep
   * is not framed by treating it as four degrees square, and a degree of
   * longitude at this latitude is only five sixths of a degree of latitude.
   */
  const midLat = (box.south + box.north) / 2;
  const lonMetres = DEGREE_METRES * Math.cos((midLat * Math.PI) / 180);

  const wide = Math.max(box.east - box.west, MIN_DEGREES);
  const deep = Math.max(box.north - box.south, MIN_DEGREES);

  const usableWidth = Math.max(view.width - covered, MIN_USABLE_WIDTH);
  const usableHeight = Math.max(view.height, MIN_USABLE_HEIGHT);

  const metresPerPixel = Math.max(
    (wide * lonMetres) / (usableWidth * FILL),
    (deep * DEGREE_METRES) / (usableHeight * FILL),
  );

  /* Half the covered strip, in degrees: the box's middle has to land in the
     middle of what is visible, not of the surface. */
  const nudge = ((covered / 2) * metresPerPixel) / lonMetres;

  /* 96 dots per inch over 0.0254 metres per inch — the scale denominator Esri
     means by `view.scale`. */
  let scale = (metresPerPixel * 96) / 0.0254;
  if (maxScale !== undefined) scale = Math.min(scale, maxScale);
  if (minScale !== undefined) scale = Math.max(scale, minScale);

  return {
    center: [(box.west + box.east) / 2 - nudge, midLat],
    scale,
  };
}
