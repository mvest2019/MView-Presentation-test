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
  /** Year of the most recent well or permit in the cluster. Mock values. */
  newestYear: number;
  /** The county each bubble sits over, for the hover card's title. */
  name: string;
  /** Share of the cluster producing oil, as a percentage. Mock values. */
  oilShare: number;
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
  { at: [-102.505, 35.123], count: 10000, tone: "olive", newestYear: 2019, name: "Oldham", oilShare: 41 },
  { at: [-101.073, 35.053], count: 55000, tone: "olive", newestYear: 2021, name: "Gray", oilShare: 48 },
  { at: [-102.488, 34.286], count: 3100, tone: "olive", newestYear: 2017, name: "Castro", oilShare: 33 },
  { at: [-101.28, 34.457], count: 40000, tone: "olive", newestYear: 2022, name: "Swisher", oilShare: 52 },
  { at: [-102.281, 32.848], count: 6600, tone: "olive", newestYear: 2020, name: "Gaines", oilShare: 71 },
  { at: [-101.038, 32.79], count: 92000, tone: "olive", newestYear: 2024, name: "Garza", oilShare: 60 },
  { at: [-99.968, 33.007], count: 6800, tone: "olive", newestYear: 2018, name: "Haskell", oilShare: 55 },
  { at: [-96.844, 33.022], count: 3300, tone: "olive", newestYear: 2016, name: "Grayson", oilShare: 38 },
  { at: [-95.204, 32.703], count: 34000, tone: "brown", newestYear: 2023, name: "Gregg", oilShare: 29 },
  { at: [-97.931, 32.237], count: 21000, tone: "olive", newestYear: 2022, name: "Johnson", oilShare: 22 },
  { at: [-95.36, 31.871], count: 63000, tone: "brown", newestYear: 2024, name: "Rusk", oilShare: 31 },
  { at: [-96.809, 31.783], count: 3100, tone: "olive", newestYear: 2015, name: "Limestone", oilShare: 44 },
  { at: [-101.47, 31.666], count: 212000, tone: "olive", newestYear: 2025, name: "Glasscock", oilShare: 74 },
  { at: [-102.436, 31.812], count: 19000, tone: "olive", newestYear: 2023, name: "Ector", oilShare: 69 },
  { at: [-103.8, 31.695], count: 5400, tone: "brown", newestYear: 2021, name: "Reeves", oilShare: 63 },
  { at: [-99.623, 31.842], count: 3800, tone: "olive", newestYear: 2022, name: "Coleman", oilShare: 57 },
  { at: [-101.125, 31.017], count: 14000, tone: "olive", newestYear: 2023, name: "Crockett", oilShare: 66 },
  { at: [-102.799, 30.884], count: 9000, tone: "brown", newestYear: 2020, name: "Pecos", oilShare: 58 },
  { at: [-103.869, 30.557], count: 3400, tone: "olive", newestYear: 2018, name: "Jeff Davis", oilShare: 35 },
  { at: [-99.295, 30.602], count: 8200, tone: "olive", newestYear: 2019, name: "Menard", oilShare: 49 },
  { at: [-98.587, 30.528], count: 39000, tone: "olive", newestYear: 2024, name: "Burnet", oilShare: 46 },
  { at: [-96.775, 30.542], count: 3300, tone: "olive", newestYear: 2017, name: "Burleson", oilShare: 53 },
  { at: [-95.239, 30.587], count: 3700, tone: "olive", newestYear: 2016, name: "Polk", oilShare: 27 },
  { at: [-98.432, 29.466], count: 78000, tone: "olive", newestYear: 2025, name: "Bexar", oilShare: 64 },
  { at: [-99.502, 28.969], count: 47000, tone: "brown", newestYear: 2023, name: "Zavala", oilShare: 72 },
  { at: [-99.847, 28.439], count: 36000, tone: "brown", newestYear: 2022, name: "Dimmit", oilShare: 68 },
  { at: [-96.758, 29.03], count: 47000, tone: "brown", newestYear: 2021, name: "DeWitt", oilShare: 39 },
  { at: [-98.605, 27.647], count: 9100, tone: "olive", newestYear: 2019, name: "McMullen", oilShare: 61 },
  { at: [-98.656, 27.172], count: 29000, tone: "brown", newestYear: 2020, name: "Duval", oilShare: 43 },
  { at: [-99.209, 27.111], count: 9000, tone: "brown", newestYear: 2018, name: "Webb", oilShare: 25 },
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
