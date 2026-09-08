import type { ProductionRecord } from "./lease-report-types";

/**
 * POSTED PRODUCTION vs THE DECLINE CURVE — 237 months of a real well.
 *
 * ── WHOSE RECORD THIS IS ──
 *
 * CROW A well 2H, RRC lease 266110, Karnes County — the same pilot unit the map
 * panel draws, and its measured survey is one of the two on that map. First
 * posted month Oct 2012.
 *
 * The Smith Gas Unit is a fictional fixture with no posted history in any source,
 * and this product does not draw plausible-looking curves for leases nobody has
 * measured. So the chart renders a real record and labels it as one, in the same
 * breath as the map above it. When a claimed lease is wired, the same renderer
 * draws that lease.
 *
 * ── THE SIX SERIES, AND WHICH ARE MEASURED ──
 *
 *   gasActual · oilActual      MEASURED. What the operator posted to the RRC,
 *                              month by month. `null` past the last posting.
 *   gasMean/Down/High and      THE MODEL. The engine's published ARPS decline,
 *   oilMean/Down/High          which only begins at the prediction date — hence
 *                              the long null head on each.
 *   gasBackfit · oilBackfit    DERIVED, and labelled so on screen. An Arps form
 *                              least-squares fitted to the same posted history,
 *                              so the dashed curve can be seen running THROUGH
 *                              the history it was fitted to rather than
 *                              appearing out of nowhere at the forecast date.
 *                              Our arithmetic on the real record — never
 *                              presented as the engine's output.
 *
 * `fit` IS NULL AND MUST STAY NULL until the modeling team publishes a
 * goodness-of-fit per curve. The chip reads "pending"; no collection publishes
 * this number and the page will not invent one.
 *
 * ── ⚠ ONE MONTH IS MISSING FROM THE EXTRACTED COPY OF THIS DATA ──
 *
 * SOURCE: `owner/v42.html`, NOT `owner/src/scripts/route-groups.js`. That
 * extracted script is not valid JavaScript: a `{{metric:operators_directory}}`
 * template placeholder was substituted into the middle of this very array,
 * turning `535,7024,719,263` into `535,70{{metric:operators_directory}},263` —
 * losing one value outright and corrupting another. `node --check` rejects the
 * file, so every one of its 132 functions is undefined when it loads alone.
 *
 * Four of the fourteen scripts under `src/scripts/` fail to parse; `MV_CTX` is
 * left as a bare `var MV_CTX = ,`. The single-file `owner/v42.html` has none of
 * this — zero placeholders, and this payload parses clean. Treat v42 as the
 * authoritative artifact and the extracted scripts as a lossy by-product.
 * The values below are the clean ones.
 */
export const crowA2HProduction: ProductionRecord = {
  unit: "CROW A",
  well: "2H",
  rrcLease: "266110",
  county: "Karnes",
  /** First posted month, `YYYY-MM`. Index 0 of every series below. */
  firstMonth: "2012-10",
  months: 237,
  /** Estimated ultimate recovery, produced to date, and reserves left. */
  eurGas: 1249684,
  producedGas: 1238007,
  reservesGas: 11677,
  eurOil: 243647,
  producedOil: 241652,
  reservesOil: 1995,
  /** See the note above: null until the engine publishes one. */
  fit: null,
  gasActual: [8820,19840,55755,79068,64744,57812,56662,45534,44756,44908,49586,52355,47589,17952,26319,23429,19075,19015,17229,13933,14193,15062,15965,13428,12459,10849,12395,9344,10012,10023,10800,9837,9944,9256,9742,8970,8772,8271,8043,8120,2089,2730,3699,5059,4181,4111,11682,8605,7925,4918,5021,5464,5279,5511,5922,5902,4625,3635,3426,4898,4392,3547,4100,3041,2678,3440,3324,3448,3037,3285,3255,3179,2984,2502,2283,4231,4310,4203,3725,4396,4265,4097,3807,3486,3378,2408,3425,0,2881,3039,3988,3163,1180,736,657,3263,3542,3119,2127,0,0,1716,0,2358,3801,1083,160,5141,0,1760,302,226,802,1245,526,542,689,633,596,589,558,491,0,0,0,0,462,1118,1087,535,7024,719,263,113,53,21,111,122,123,83,65,31,28,9,0,0,0,0,116,151,149,129,105,316,343,421,304,222,274,166,210,0,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
  oilActual: [2408,4998,12689,17032,13943,12944,11621,9065,9091,7924,6760,6428,6351,3436,5546,4877,3845,3763,3317,3131,2778,2884,2791,2461,2367,2244,2238,2005,1906,1999,1886,1771,1736,1490,1614,1468,1465,1359,1384,1345,263,568,782,1179,889,901,1955,1288,1086,731,860,964,858,903,1142,890,871,864,592,887,877,804,791,894,777,876,824,831,782,782,763,776,741,679,425,814,749,770,714,769,681,716,695,639,686,376,705,0,757,792,816,687,685,748,700,672,663,594,481,33,30,382,23,562,1062,485,189,40,7,167,38,50,115,187,126,150,177,174,235,167,156,151,84,28,43,60,128,224,216,97,128,87,62,51,49,45,48,49,48,48,54,53,51,48,56,45,38,57,58,68,62,62,57,44,55,47,49,43,67,37,36,0,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
  gasMean: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,256,252,247,243,239,236,232,228,224,221,217,214,211,207,204,201,198,195,192,189,186,183,181,178,175,173,170,168,165,163,161,158,156,154,152,149,147,145,143,141,139,137,136,134,132,130,128,127,125,123,122,120,119,117,116,114,113,111,110,108,107,106,104,103,102,100,99,98,97,96,94,93,92,91,90,89],
  gasDown: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,219,215,211,207,203,199,195,192,188,184,181,178,174,171,168,165,161,158,155,153,150,147,144,142,139,136,134,131,129,126,124,122,120,117,115,113,111,109,107,105,103,101,99,97,96,94,92,90,89,87,85,84,82,81,79,78,76,75,73,72,71,69,68,67,65,64,63,62,60,59,58,57,56,55,54,52],
  gasHigh: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,292,288,284,280,276,272,268,264,261,257,254,250,247,244,240,237,234,231,228,225,223,220,217,214,212,209,207,204,202,199,197,195,192,190,188,186,184,182,180,178,176,174,172,170,168,167,165,163,161,160,158,157,155,153,152,150,149,148,146,145,143,142,141,139,138,137,136,134,133,132,131,130,129,127,126,125],
  oilMean: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,44,43,42,42,41,40,40,39,38,38,37,37,36,35,35,34,34,33,33,32,32,31,31,30,30,30,29,29,28,28,27,27,27,26,26,26,25,25,24,24,24,23,23,23,23,22,22,22,21,21,21,21,20,20,20,19,19,19,19,19,18,18,18,18,17,17,17,17,17,16,16,16,16,16,15,15],
  oilDown: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,37,37,36,35,35,34,33,33,32,32,31,30,30,29,29,28,28,27,27,26,26,25,25,24,24,23,23,22,22,22,21,21,20,20,20,19,19,19,18,18,18,17,17,17,16,16,16,15,15,15,15,14,14,14,14,13,13,13,13,12,12,12,12,11,11,11,11,11,10,10,10,10,10,9,9,9],
  oilHigh: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,50,49,48,48,47,46,46,45,45,44,43,43,42,42,41,41,40,40,39,39,38,38,37,37,36,36,35,35,34,34,34,33,33,32,32,32,31,31,31,30,30,30,29,29,29,28,28,28,28,27,27,27,26,26,26,26,25,25,25,25,24,24,24,24,24,23,23,23,23,23,22,22,22,22,22,21],
  gasBackfit: [null,null,null,45386,43615,41913,40277,38705,37194,35743,34348,33007,31719,30481,29291,28148,27050,25994,24979,24005,23068,22167,21302,20471,19672,18904,18166,17457,16776,16121,15492,14887,14306,13748,13211,12696,12200,11724,11267,10827,10404,9998,9608,9233,8873,8526,8194,7874,7567,7271,6987,6715,6453,6201,5959,5726,5503,5288,5082,4883,4693,4510,4334,4164,4002,3846,3696,3551,3413,3280,3152,3029,2910,2797,2688,2583,2482,2385,2292,2203,2117,2034,1955,1878,1805,1735,1667,1602,1539,1479,1421,1366,1313,1261,1212,1165,1119,1076,1034,993,955,917,882,847,814,782,752,722,694,667,641,616,592,569,547,525,505,485,466,448,431,414,398,382,367,353,339,326,313,301,289,278,267,257,247,237,228,219,210,202,194,187,179,172,166,159,153,147,141,136,130,125,120,116,111,107,103,99,95,91,88,84,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
  oilBackfit: [null,null,null,5218,5055,4898,4745,4598,4455,4316,4182,4051,3925,3803,3685,3570,3459,3351,3247,3146,3048,2953,2861,2772,2686,2602,2521,2443,2367,2293,2222,2152,2085,2021,1958,1897,1838,1780,1725,1671,1619,1569,1520,1473,1427,1383,1339,1298,1257,1218,1180,1144,1108,1073,1040,1008,976,946,916,888,860,834,808,782,758,735,712,689,668,647,627,608,589,570,553,535,519,503,487,472,457,443,429,416,403,390,378,366,355,344,333,323,313,303,294,284,276,267,259,251,243,235,228,221,214,207,201,195,189,183,177,171,166,161,156,151,146,142,137,133,129,125,121,117,114,110,107,103,100,97,94,91,88,86,83,80,78,75,73,71,69,66,64,62,60,59,57,55,53,52,50,48,47,45,44,43,41,40,39,38,36,35,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
};
