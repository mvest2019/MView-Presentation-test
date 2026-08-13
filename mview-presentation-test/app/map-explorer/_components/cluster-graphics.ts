/*
 * The bubbles: what one is, how big it draws, and how an API cluster becomes
 * one. The projection lives here too, because the extent has to be in degrees
 * before the clusters can be asked for.
 */

import { type MapCluster } from "@/lib/map-api";

type GraphicCtor = new (props: Record<string, unknown>) => unknown;

export type ClusterTone = "olive" | "brown";

export type WellCluster = {
  /** `[longitude, latitude]`. */
  at: [number, number];
  count: number;
  tone: ClusterTone;
  /** Year of the most recent well, when the source reports one. */
  newestYear: number | null;
  /** The county each bubble sits over, for the hover card's title. */
  name: string;
  /** Share of the cluster producing oil, as a percentage. */
  oilShare: number;
};

/** The two bubble fills in the mock, as `[r, g, b, a]`. */
export const CLUSTER_FILL: Record<ClusterTone, [number, number, number, number]> =
  {
    olive: [138, 140, 102, 0.88],
    brown: [156, 122, 85, 0.88],
  };

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
 * The tone splits on what the cluster mostly produces — oil-leaning olive,
 * gas-leaning brown — which is the distinction the two fills carried when the
 * bubbles were static. The API reports no drill date, so `newestYear` is null
 * and the cards that showed it simply do not.
 */
export function toWellCluster(cluster: MapCluster): WellCluster {
  return {
    at: [cluster.lon, cluster.lat],
    count: cluster.count,
    tone: cluster.sharePct.oil >= cluster.sharePct.gas ? "olive" : "brown",
    newestYear: null,
    name: cluster.name || cluster.topCounty,
    oilShare: cluster.sharePct.oil,
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
  return clusters.flatMap(({ at: [longitude, latitude], count, tone }) => {
    const diameter = clusterDiameter(count);
    const fontSize = clusterFontSize(diameter);

    const geometry = { type: "point", longitude, latitude };

    return [
      new Graphic({
        geometry,
        symbol: {
          type: "simple-marker",
          size: diameter,
          color: CLUSTER_FILL[tone],
          outline: { color: [255, 255, 255, 0.75], width: 1.5 },
        },
      }),
      new Graphic({
        geometry,
        symbol: {
          type: "text",
          text: formatCount(count),
          color: "#ffffff",
          horizontalAlignment: "center",
          verticalAlignment: "middle",
          font: { size: fontSize, weight: "bold", family: "sans-serif" },
        },
      }),
    ];
  });
}
