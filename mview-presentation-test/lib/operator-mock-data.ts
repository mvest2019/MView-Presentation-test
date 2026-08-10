/**
 * TEMPORARY FIXTURE — delete this file when the Operator API lands.
 *
 * There is no Operator endpoint yet, so the directory renders from the extract
 * embedded in the Know Your Operators prototype (`MV_M` + `MV_PLAY_IX` in the
 * v45 file). Nothing here is fetched, and no endpoint is assumed.
 *
 * What is real: operator name, cumulative production (BOE), lease count, county
 * count, and each operator's rank within a play. Those come from Railroad
 * Commission filings via the prototype.
 *
 * What is NOT real, and is labelled "illustrative" wherever it renders:
 *   · operator number — a six-digit RRC-shaped number derived from the name
 *   · the oil/gas split — cumulative BOE divided into bbl and Mcf
 *   · active/inactive status — stands in for the live P-5 status
 *
 * The derivations are deterministic hashes of the operator name, copied from the
 * prototype so the build shows the same figures the design was reviewed against.
 * They are placeholders with a stable appearance, not estimates — do not let
 * them reach a surface that reads as reported data.
 *
 * Storage mirrors the prototype: one master row per operator (statewide figures
 * are constant per operator across plays) plus a per-play ordered index list.
 */

import type { Operator, OperatorStatus } from "./operator-types";

/** `[name, cumulative BOE, leases, counties]` — the prototype's `MV_M`. */
type MasterRow = readonly [string, number, number, number];

const MASTER: readonly MasterRow[] = [
  ["Pioneer Natural RES USA, Inc", 2367474175, 10324, 79],
  ["EOG Resources, Inc", 2109092344, 11403, 110],
  ["XTO Energy, Inc", 1706939750, 13183, 108],
  ["Devon Energy Production Co, LP", 1184992447, 14472, 114],
  ["Chevron USA, Inc", 1116538490, 5910, 75],
  ["Apache Corporation", 1010967674, 8035, 123],
  ["Anadarko E&P Onshore, LLC", 997584837, 8656, 30],
  ["Burlington Resources O&G Co, LP", 915213884, 3572, 42],
  ["Marathon Oil EF, LLC", 675411408, 2117, 11],
  ["Endeavor Energy Resources, LP", 607820209, 3622, 59],
  ["Chesapeake Operating, Inc", 551739144, 8333, 124],
  ["Chesapeake Operating, LLC", 503755054, 7029, 67],
  ["SM Energy Company", 500651883, 2130, 28],
  ["Cimarex Energy Co", 448973579, 1318, 30],
  ["Exxon, Corp", 396089559, 5666, 101],
  ["OXY USA, Inc", 388186505, 3901, 67],
  ["Conocophillips Company", 357665159, 5720, 48],
  ["Mobil Producing TX & NM, Inc", 345231591, 1839, 49],
  ["Encana Oil & Gas USA, Inc", 326473285, 2938, 59],
  ["BPX Operating Company", 320991061, 2348, 19],
  ["Ovintiv USA, Inc", 320942811, 1655, 16],
  ["Exxon Mobil Corporation", 319423762, 3974, 71],
  ["Lewis Petro Properties, Inc", 304613284, 3207, 7],
  ["Texaco E&P, Inc", 299910840, 4578, 105],
  ["Marathon Oil Company", 286852864, 1516, 79],
  ["Crownquest Operating, LLC", 271810547, 1233, 35],
  ["Shell Western E&P", 267518778, 2115, 25],
  ["Amoco Production Company", 262293619, 3707, 58],
  ["Union Pacific Resources Company", 239940997, 5989, 76],
  ["Murphy Expl & Prod Co - USA", 234309183, 325, 8],
  ["Hilcorp Energy Company", 225165748, 13439, 75],
  ["Shell Western E&P, Inc", 219647532, 1410, 36],
  ["BP America Production Company", 208730343, 4467, 50],
  ["Hunt Oil Company", 206107534, 1026, 50],
  ["Anadarko Petroleum Corporation", 199886219, 1998, 55],
  ["Amerada HESS Corporation", 191619943, 280, 28],
  ["Fasken Oil AND Ranch, Ltd", 187411142, 628, 26],
  ["Conoco, Inc", 184174771, 3418, 44],
  ["Permian Resources Operating, LLC", 172656155, 1483, 15],
  ["Anadarko E&P Company, LP", 169735546, 6500, 49],
  ["Enervest Operating, LLC", 161218840, 13610, 80],
  ["SN EF Maverick, LLC", 160656717, 1719, 4],
  ["Magnolia Oil & Gas Operating, LLC", 158642348, 2136, 19],
  ["EP Energy E&P Company, LP", 156824175, 1815, 31],
  ["Rosetta Resources Operating, LP", 154542084, 1478, 22],
  ["Noble Energy, Inc", 146407447, 1239, 31],
  ["Aethon Energy Operating, LLC", 138850079, 805, 12],
  ["Phillips Petroleum Company", 130091538, 2563, 57],
  ["Silverbow Resources Oper, LLC", 129750036, 1731, 11],
  ["BHP Billiton PET Txla OP Co", 126707336, 748, 16],
  ["OXY USA WTP, LP", 388851008, 913, 28],
  ["Energen Resources Corporation", 195952375, 1071, 27],
  ["Mewbourne Oil Company", 174796601, 1526, 19],
  ["Rockcliff Energy Operating, LLC", 133865341, 1747, 9],
  ["Sabine Oil & Gas Corporation", 122328212, 2048, 21],
  ["Merit Energy Company", 117773115, 5873, 95],
  ["Exco Operating Company, LP", 113667651, 1216, 15],
  ["Arco Permian", 106300923, 599, 19],
  ["Verdun Oil & Gas, LLC", 102715245, 632, 14],
  ["Samson Lone Star, LLC", 101516365, 3232, 77],
  ["Penn Virginia Oil & Gas, LP", 99703638, 808, 15],
  ["Union Oil Company OF California", 98337845, 871, 56],
  ["Continental Resources, Inc", 91625682, 471, 11],
  ["Comstock Oil & Gas, LLC", 89734729, 1166, 12],
  ["Basa Resources, Inc", 85209249, 1324, 44],
  ["Forest Oil Corporation", 83882920, 3708, 64],
  ["Unit Petroleum Company", 80592696, 1821, 64],
  ["Linn Operating, Inc", 77546967, 4040, 51],
  ["Williams Clayton Energy, Inc", 77122474, 878, 39],
  ["Sheridan Production Company, LLC", 76820223, 2993, 32],
  ["Valence Operating Company", 76232102, 1315, 41],
  ["Enron Oil & Gas Company", 76133713, 2593, 60],
  ["Pennzoil Exploration & Prod Co", 75616563, 1855, 55],
  ["Sandridge Expl AND Prod, LLC", 75517722, 2256, 26],
  ["Legacy Reserves Operating, LP", 74562709, 2627, 57],
  ["Samson Lone Star, LP", 72473003, 2576, 90],
  ["Newfield Exploration Company", 70736882, 1153, 41],
  ["Occidental Permian, Ltd", 1291678867, 743, 24],
  ["Diamondback E&P, LLC", 1188206430, 5596, 22],
  ["COG Operating, LLC", 832367277, 2652, 39],
  ["Kinder Morgan Production Co, LLC", 420496886, 69, 9],
  ["WPX Energy Permian, LLC", 351230503, 1116, 6],
  ["Parsley Energy Operations, LLC", 221720244, 1347, 14],
  ["Altura Energy, Ltd", 220496985, 501, 25],
  ["Laredo Petroleum, Inc", 195029261, 1175, 17],
  ["Callon Petroleum Operating Co", 158795221, 564, 17],
  ["Surge Operating, LLC", 196816837, 328, 5],
  ["Birch Operations, Inc", 146173384, 382, 6],
  ["TEP Barnett USA, LLC", 100877063, 2948, 9],
  ["Javelin Energy Partners Mgmt, LLC", 97175355, 3309, 12],
  ["Blackbeard Operating, LLC", 92301955, 4120, 35],
  ["Denbury Onshore, LLC", 89282612, 744, 11],
  ["Coastal Oil & Gas Corporation", 88980861, 1457, 46],
  ["Kinder Morgan Production Co, LP", 87667318, 59, 11],
  ["Geosouthern Energy Corporation", 83607497, 608, 17],
  ["Citation Oil & Gas, Corp", 78444669, 588, 37],
  ["EL Paso Production Oil & Gas Co", 76770620, 1859, 26],
  ["QEP Energy Company", 96396530, 632, 13],
  ["Oryx Energy Company", 73732264, 1585, 51],
  ["Range Production Company", 64567961, 1986, 73],
  ["Halcon Operating Co, Inc", 63999910, 497, 21],
  ["Scout Energy Management, LLC", 58796373, 8598, 58],
  ["Cabot Oil & Gas Corporation", 58202688, 834, 46],
];

/**
 * Per-play indexes into `MASTER`, in the play's own production rank order —
 * the prototype's `MV_PLAY_IX`. Position in the array *is* the rank, so these
 * lists must not be re-sorted.
 */
const PLAY_INDEX: Record<string, readonly number[]> = {
  Buda: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49],
  Woodbine: [0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 23, 24, 25, 26, 27, 28, 30, 31, 32, 33, 34, 51, 35, 52, 39, 40, 42, 43, 44, 45, 46, 53, 47, 49, 54, 55, 56, 57, 58],
  "Austin Chalk": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 50, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 53, 47],
  "East Texas": [0, 1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 23, 24, 27, 28, 30, 31, 32, 33, 34, 51, 35, 37, 52, 39, 40, 43, 44, 45, 46, 53, 47, 49, 54, 55, 56, 57, 59, 60, 61, 62, 63],
  "Bossier Shale": [0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 23, 24, 27, 28, 30, 31, 32, 33, 34, 51, 35, 52, 39, 40, 42, 43, 45, 46, 53, 47, 49, 54, 55, 56, 57, 59, 60, 61, 63],
  Haynesville: [1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 14, 15, 16, 17, 18, 19, 21, 23, 24, 27, 28, 30, 31, 32, 33, 51, 35, 52, 39, 40, 43, 45, 46, 53, 47, 54, 55, 56, 57, 59, 61, 63, 64, 65, 66, 67, 68, 69, 70, 71],
  "Haynesville Shale": [1, 2, 3, 4, 5, 6, 10, 11, 12, 14, 15, 16, 18, 19, 20, 21, 23, 24, 27, 28, 30, 32, 34, 39, 40, 43, 45, 46, 53, 47, 49, 54, 55, 56, 59, 60, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76],
  "Delaware Basin": [0, 1, 2, 77, 78, 3, 4, 5, 6, 7, 79, 8, 9, 10, 11, 13, 80, 14, 50, 15, 16, 81, 17, 18, 19, 21, 23, 24, 25, 26, 27, 28, 30, 82, 83, 31, 32, 33, 34, 51, 84, 35, 36, 37, 52, 38, 40, 85, 44, 45],
  "Eagle Ford": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 50, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 47, 48, 49],
  "Midland Basin": [0, 1, 2, 77, 78, 3, 4, 5, 7, 79, 9, 10, 12, 13, 80, 14, 50, 15, 16, 17, 18, 20, 21, 23, 24, 25, 26, 27, 28, 29, 30, 82, 83, 31, 32, 33, 34, 86, 51, 84, 35, 36, 37, 52, 38, 39, 40, 85, 43, 45],
  "Permian Basin": [0, 1, 2, 77, 78, 3, 4, 5, 6, 7, 79, 8, 9, 10, 11, 12, 13, 80, 14, 50, 15, 16, 81, 17, 18, 19, 20, 21, 23, 24, 25, 26, 27, 28, 29, 30, 82, 83, 31, 32, 33, 34, 86, 51, 84, 35, 36, 37, 52, 38],
  "West Texas": [0, 1, 2, 77, 78, 3, 4, 5, 6, 7, 79, 8, 9, 10, 11, 12, 13, 80, 14, 50, 15, 16, 81, 17, 18, 19, 20, 21, 23, 24, 25, 26, 27, 28, 29, 30, 82, 83, 31, 32, 33, 34, 86, 51, 84, 35, 36, 37, 52, 38],
  Woodford: [0, 1, 2, 77, 78, 3, 4, 5, 6, 7, 79, 8, 9, 10, 12, 13, 80, 14, 50, 15, 16, 81, 17, 18, 20, 21, 23, 24, 25, 26, 27, 28, 29, 30, 82, 83, 31, 32, 33, 34, 51, 84, 35, 36, 37, 52, 38, 39, 40, 85],
  "Barnett Shale": [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 14, 50, 15, 17, 18, 19, 20, 22, 23, 24, 25, 26, 28, 29, 30, 31, 34, 40, 85, 42, 46, 47, 49, 55, 58, 88, 61, 89, 90, 91, 92, 93, 64, 65, 94, 66, 95, 68, 96],
  "Granite Wash": [0, 1, 2, 3, 4, 5, 7, 9, 10, 11, 13, 14, 15, 16, 17, 18, 21, 23, 24, 25, 27, 28, 32, 34, 84, 37, 52, 40, 44, 45, 47, 55, 59, 61, 97, 90, 65, 66, 95, 67, 71, 72, 73, 74, 98, 75, 99, 100, 101, 102],
  Anadarko: [0, 1, 2, 3, 4, 5, 7, 9, 10, 11, 13, 14, 15, 16, 17, 18, 21, 23, 24, 27, 28, 32, 34, 84, 37, 52, 40, 44, 45, 47, 54, 55, 59, 61, 97, 90, 65, 66, 95, 67, 70, 71, 72, 73, 74, 98, 75, 76, 99, 101],
  "Central Basin Platform": [0, 1, 2, 77, 78, 3, 4, 5, 79, 9, 10, 12, 13, 14, 50, 15, 16, 17, 18, 20, 21, 23, 24, 25, 27, 30, 83, 31, 32, 33, 34, 51, 36, 37, 52, 38, 40, 85, 87, 47, 54, 55, 57, 59, 61, 97, 90, 62, 92, 93],
};

/* ---------------------------------------------------------------------------
   Deterministic derivations — the prototype's, character for character.
   Same name in, same figure out, so the page matches the reviewed design.
   --------------------------------------------------------------------------- */

/** FNV-1a. Used for the operator number and the oil/gas split. */
function hashFnv(input: string): number {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

/** djb2-ish, reduced to 0–99. Drives the last-production bucket. */
function hashMod100(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash % 100;
}

/** Six-digit RRC-shaped operator number. Illustrative. */
function operatorNo(name: string): number {
  return 100000 + (hashFnv(`${name}~opno`) % 900000);
}

/** Oil's share of cumulative BOE, 0.20–0.80. Illustrative. */
function oilFraction(name: string): number {
  return 0.2 + (hashFnv(`${name}~split`) % 61) / 100;
}

/**
 * Which bucket the operator's last reported production falls in. The top five
 * of any play are always treated as recent; the rest hash into a bucket.
 * `playIndex` is 0-based, matching the prototype's `x.i`.
 */
export function lastProductionBucket(
  name: string,
  playIndex: number,
): "90d" | "12mo" | "older" {
  if (playIndex < 5) return "90d";
  const hash = hashMod100(name);
  if (hash < 55) return "90d";
  if (hash < 85) return "12mo";
  return "older";
}

/** Anything but a stale last-production bucket reads as active. Illustrative. */
function statusFor(name: string, playIndex: number): OperatorStatus {
  return lastProductionBucket(name, playIndex) === "older"
    ? "inactive"
    : "active";
}

function toOperator(row: MasterRow, play: string, playIndex: number): Operator {
  const [name, boe, leases, counties] = row;
  const oilShare = oilFraction(name);
  return {
    name,
    operatorNo: operatorNo(name),
    boe,
    oilBbl: Math.round(boe * oilShare),
    // 6 Mcf ≈ 1 BOE, so the gas remainder is scaled up by six.
    gasMcf: Math.round(boe * (1 - oilShare) * 6),
    leases,
    counties,
    status: statusFor(name, playIndex),
    play,
    playRank: playIndex + 1,
  };
}

/** Play names for the Play type select, alphabetical as in the prototype. */
export const PLAY_NAMES: readonly string[] = Object.keys(PLAY_INDEX).sort();

/**
 * Every play's ranked operator list. Built once at module load — this is a
 * static fixture, so there is nothing to invalidate.
 */
export const OPERATORS_BY_PLAY: Readonly<Record<string, Operator[]>> =
  Object.fromEntries(
    Object.entries(PLAY_INDEX).map(([play, indexes]) => [
      play,
      indexes.map((masterIndex, rank) =>
        toOperator(MASTER[masterIndex], play, rank),
      ),
    ]),
  );
