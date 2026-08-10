/**
 * The well-count bubbles the explorer mock shows over Texas.
 *
 * Positions were reverse-projected from the mock itself: its readout pins the
 * view at -100.0199, 31.2534 / 1:7,262,011 in a 1900px-wide viewport, so every
 * bubble's pixel centre maps back to a real coordinate. They land where you'd
 * expect — 212k in the Permian, 55k in the Panhandle, 78k in the Eagle Ford,
 * 21k over the Barnett — which is the check that the projection was right.
 *
 * This is mock data standing in for the real aggregation. When the well layer
 * is wired up, delete this file and let a FeatureLayer cluster server-side;
 * nothing else here depends on the numbers.
 */

export type ClusterTone = "olive" | "brown";

export type WellCluster = {
  /** `[longitude, latitude]`. */
  at: [number, number];
  count: number;
  tone: ClusterTone;
};

/** The two bubble fills in the mock, as `[r, g, b, a]`. */
export const CLUSTER_FILL: Record<ClusterTone, [number, number, number, number]> =
  {
    olive: [138, 140, 102, 0.88],
    brown: [156, 122, 85, 0.88],
  };

/** Statewide total in the mock's toolbar. */
export const WELLS_STATEWIDE = 1_217_270;

export const wellClusters: WellCluster[] = [
  { at: [-102.505, 35.123], count: 10000, tone: "olive" },
  { at: [-101.073, 35.053], count: 55000, tone: "olive" },
  { at: [-102.488, 34.286], count: 3100, tone: "olive" },
  { at: [-101.28, 34.457], count: 40000, tone: "olive" },
  { at: [-102.281, 32.848], count: 6600, tone: "olive" },
  { at: [-101.038, 32.79], count: 92000, tone: "olive" },
  { at: [-99.968, 33.007], count: 6800, tone: "olive" },
  { at: [-96.844, 33.022], count: 3300, tone: "olive" },
  { at: [-95.204, 32.703], count: 34000, tone: "brown" },
  { at: [-97.931, 32.237], count: 21000, tone: "olive" },
  { at: [-95.36, 31.871], count: 63000, tone: "brown" },
  { at: [-96.809, 31.783], count: 3100, tone: "olive" },
  { at: [-101.47, 31.666], count: 212000, tone: "olive" },
  { at: [-102.436, 31.812], count: 19000, tone: "olive" },
  { at: [-103.8, 31.695], count: 5400, tone: "brown" },
  { at: [-99.623, 31.842], count: 3800, tone: "olive" },
  { at: [-101.125, 31.017], count: 14000, tone: "olive" },
  { at: [-102.799, 30.884], count: 9000, tone: "brown" },
  { at: [-103.869, 30.557], count: 3400, tone: "olive" },
  { at: [-99.295, 30.602], count: 8200, tone: "olive" },
  { at: [-98.587, 30.528], count: 39000, tone: "olive" },
  { at: [-96.775, 30.542], count: 3300, tone: "olive" },
  { at: [-95.239, 30.587], count: 3700, tone: "olive" },
  { at: [-98.432, 29.466], count: 78000, tone: "olive" },
  { at: [-99.502, 28.969], count: 47000, tone: "brown" },
  { at: [-99.847, 28.439], count: 36000, tone: "brown" },
  { at: [-96.758, 29.03], count: 47000, tone: "brown" },
  { at: [-98.605, 27.647], count: 9100, tone: "olive" },
  { at: [-98.656, 27.172], count: 29000, tone: "brown" },
  { at: [-99.209, 27.111], count: 9000, tone: "brown" },
];

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
