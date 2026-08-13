/*
 * The bubbles: what one is, how big it draws, and how an API cluster becomes
 * one. The projection lives here too, because the extent has to be in degrees
 * before the clusters can be asked for.
 */

import { type MapCluster } from "@/lib/map-api";

type GraphicCtor = new (props: Record<string, unknown>) => unknown;

export type WellCluster = {
  /** `[longitude, latitude]`. */
  at: [number, number];
  count: number;
  /** Year of the most recent well, when the source reports one. */
  newestYear: number | null;
  /** The county each bubble sits over, for the hover card's title. */
  name: string;
  /** The mix inside the cluster: how many of each, and their share. */
  oil: number;
  gas: number;
  oilGas: number;
  oilShare: number;
  gasShare: number;
  oilGasShare: number;
};

/*
 * The colour scale.
 *
 * One hue, five shades, light to dark with the count, so a field of bubbles
 * reads as a heat map at a glance.
 *
 * Every fill is OPAQUE. A translucent bubble takes its colour from whatever is
 * behind it, so the same band came out one colour over streets, another over
 * imagery and another over the dark basemap — which is exactly the thing a
 * scale must not do. Solid fills plus a white ring keep a band looking like
 * that band on every basemap, light or dark.
 *
 * The breaks are decade-ish rather than even, because the counts are not: one
 * extent holds bubbles of 1 and of 288,000, and even breaks would put all but
 * one of them in the first band.
 *
 * `from` is the lowest count in the band, ordered high to low so the first
 * match wins.
 */
export const CLUSTER_SCALE: {
  from: number;
  label: string;
  fill: [number, number, number];
  ink: string;
}[] = [
  /*
   * The palette's greens, lightened a step — at full strength an opaque
   * bubble sits on the map like a sticker, and there are a lot of them.
   *
   * The floor is the constraint at the other end: the palest band still has to
   * be a green over a pale basemap, so the scale bottoms out at #DBEEE2 rather
   * than fading to near-white. Five bands between that and the top is as far
   * apart as they can be while all five stay visible.
   *
   * One ink for all five. The label has to be legible on the palest fill, and
   * a dark green clears that everywhere — white only ever worked on the
   * darkest, and a label that changes colour halfway down a scale reads as a
   * second meaning.
   */
  { from: 50_000, label: "50k+", fill: [76, 190, 116], ink: "#0d3b1f" },
  { from: 10_000, label: "10k – 50k", fill: [122, 202, 154], ink: "#0d3b1f" },
  { from: 1_000, label: "1k – 10k", fill: [159, 214, 180], ink: "#0d3b1f" },
  { from: 100, label: "100 – 1k", fill: [191, 227, 204], ink: "#0d3b1f" },
  { from: 0, label: "Under 100", fill: [219, 238, 226], ink: "#0d3b1f" },
];

/** The band a count falls in. The last entry starts at 0, so this never fails. */
export function clusterBand(count: number) {
  return (
    CLUSTER_SCALE.find((band) => count >= band.from) ??
    CLUSTER_SCALE[CLUSTER_SCALE.length - 1]
  );
}

/**
 * Bubble diameter in pixels. Area-proportional (hence the square root), fitted
 * to the mock: 3.3k reads ~28px, 212k reads ~106px.
 */
export function clusterDiameter(count: number): number {
  return 16 + 0.2 * Math.sqrt(count);
}

/**
 * Label size for a bubble of the given diameter. Fitted to two points off the
 * mock — a 108px bubble carries 15px text, a 27px bubble 10px — because the
 * label does not scale with the bubble: small bubbles need proportionally
 * larger text to stay readable, so a flat ratio reads wrong at both ends.
 */
export function clusterFontSize(diameter: number): number {
  return Math.min(15.5, Math.max(9.5, 8.3 + 0.0617 * diameter));
}

/** `212000 → "212k"`, `9100 → "9.1k"` — the mock's own rounding. */
export function formatCount(count: number): string {
  if (count < 1000) return String(count);
  const thousands = count / 1000;
  return `${thousands < 10 ? thousands.toFixed(1) : Math.round(thousands)}k`;
}

/*
 * Web Mercator metres back to degrees. Esri reports the view's extent in the
 * basemap's spatial reference, and the API wants plain lon/lat.
 */
const EARTH_RADIUS_METRES = 6378137;

export function mercatorToLongitude(x: number): number {
  return (x / EARTH_RADIUS_METRES) * (180 / Math.PI);
}

export function mercatorToLatitude(y: number): number {
  return (
    (2 * Math.atan(Math.exp(y / EARTH_RADIUS_METRES)) - Math.PI / 2) *
    (180 / Math.PI)
  );
}

/**
 * An API cluster in the shape the map draws.
 *
 * Every bubble carries the same fill — it is a count, and colouring it by
 * what the cluster mostly produces implied a distinction the number does not
 * make. The API reports no drill date, so `newestYear` is null and the cards
 * that showed it simply do not.
 */
export function toWellCluster(cluster: MapCluster): WellCluster {
  return {
    at: [cluster.lon, cluster.lat],
    count: cluster.count,
    newestYear: null,
    name: cluster.name || cluster.topCounty,
    oil: cluster.oil,
    gas: cluster.gas,
    oilGas: cluster.oilGas,
    oilShare: cluster.sharePct.oil,
    gasShare: cluster.sharePct.gas,
    oilGasShare: cluster.sharePct.oilGas,
  };
}

/**
 * One filled circle plus one label per cluster. Sizes are in screen pixels, so
 * the bubbles hold their size as you zoom — the same behaviour the mock shows,
 * and what a server-side cluster layer would do once it replaces this.
 */
export function buildClusterGraphics(
  Graphic: GraphicCtor,
  clusters: WellCluster[],
): unknown[] {
  return clusters.flatMap(({ at: [longitude, latitude], count }) => {
    const diameter = clusterDiameter(count);
    const fontSize = clusterFontSize(diameter);
    const band = clusterBand(count);

    const geometry = { type: "point", longitude, latitude };

    return [
      new Graphic({
        geometry,
        symbol: {
          type: "simple-marker",
          size: diameter,
          color: band.fill,
          // White, not the boundary colour: the ring is what separates a
          // bubble from the basemap, and it has to do that over imagery and
          // over a dark map as well as over paper.
          outline: { color: [255, 255, 255, 0.95], width: 2 },
        },
      }),
      new Graphic({
        geometry,
        symbol: {
          type: "text",
          text: formatCount(count),
          color: band.ink,
          horizontalAlignment: "center",
          verticalAlignment: "middle",
          font: { size: fontSize, weight: "bold", family: "sans-serif" },
        },
      }),
    ];
  });
}
