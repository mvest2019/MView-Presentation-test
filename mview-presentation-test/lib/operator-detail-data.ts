/**
 * TEMPORARY FIXTURE — delete when an operator detail endpoint exists.
 *
 * WHAT IS AND IS NOT HERE. Ten candidate endpoints were probed against the dev
 * host — `/operators/{no}`, `/{slug}`, `/detail`, `/counties`, `/leases`,
 * `/production`, `/wells`, `/summary` — and every one answers 404. Only
 * `/operators/{no}/logo` exists. So the detail page is fixture-backed, and this
 * file holds the parts the other fixtures do not:
 *
 *   · per-county production, which the prototype ships for ONE operator
 *   · that operator's top 40 leases by lifetime oil
 *   · the three blocks the prototype hardcodes
 *
 * Operator identity, volumes, address and rank come from
 * `operator-statistics-data.ts`; the annual series from `operator-compare-data.ts`.
 * Neither is duplicated here.
 *
 * FIVE COUNTIES REPORT A WELL AND NO PRODUCTION. The source omits `oil`/`gas`
 * for those and reports `boe: 0`; they are written as zeros, because a well on
 * record with nothing produced is a fact, not a gap.
 *
 * ONLY PIONEER HAS COUNTY AND LEASE DETAIL. The prototype gates both on
 * `IS_PIO = NO === '665748'`, and no other operator has a row in either map. That
 * is why the page renders those two sections for one operator and an explicit
 * "not in this extract" state for the rest, rather than inventing them.
 */

/** The one operator the prototype ships county and lease detail for. */
export const DETAILED_OPERATOR_NUMBER = "665748";

export interface OperatorCountyRow {
  /** Upper case, as the regulator files it. */
  county: string;
  wells: number;
  /** Of those wells, how many are producing. */
  producing: number;
  leases: number;
  /** Barrels of oil equivalent. */
  boe: number;
  /** Barrels. */
  oil: number;
  /** Mcf. */
  gas: number;
}

export interface OperatorLeaseRow {
  name: string;
  number: string;
  county: string;
  /** Lifetime barrels. */
  oil: number;
  /** Lifetime Mcf. */
  gas: number;
}

/**
 * Per-county production, keyed by operator number, ordered by BOE descending.
 * 84 counties for the one operator that has them.
 */
export const OPERATOR_COUNTY_ROWS: Readonly<
  Record<string, readonly OperatorCountyRow[]>
> = {
  "665748": [
  {
    "county": "MIDLAND",
    "wells": 5987,
    "producing": 3524,
    "leases": 2415,
    "boe": 857164689,
    "oil": 707444489,
    "gas": 2245803004
  },
  {
    "county": "MARTIN",
    "wells": 3519,
    "producing": 2270,
    "leases": 1777,
    "boe": 428729896,
    "oil": 375553482,
    "gas": 797646223
  },
  {
    "county": "UPTON",
    "wells": 3550,
    "producing": 1964,
    "leases": 1115,
    "boe": 386333245,
    "oil": 315512176,
    "gas": 1062316049
  },
  {
    "county": "REAGAN",
    "wells": 2440,
    "producing": 1345,
    "leases": 734,
    "boe": 203124558,
    "oil": 153610266,
    "gas": 742714394
  },
  {
    "county": "GLASSCOCK",
    "wells": 1701,
    "producing": 862,
    "leases": 669,
    "boe": 143512865,
    "oil": 122697933,
    "gas": 312223986
  },
  {
    "county": "DE WITT",
    "wells": 288,
    "producing": 210,
    "leases": 270,
    "boe": 73089256,
    "oil": 48272054,
    "gas": 372258035
  },
  {
    "county": "KARNES",
    "wells": 290,
    "producing": 228,
    "leases": 245,
    "boe": 64841066,
    "oil": 50970931,
    "gas": 208052037
  },
  {
    "county": "LIVE OAK",
    "wells": 274,
    "producing": 203,
    "leases": 204,
    "boe": 43108015,
    "oil": 30272475,
    "gas": 192533103
  },
  {
    "county": "ANDREWS",
    "wells": 346,
    "producing": 254,
    "leases": 101,
    "boe": 42545091,
    "oil": 38057869,
    "gas": 67308342
  },
  {
    "county": "IRION",
    "wells": 487,
    "producing": 164,
    "leases": 148,
    "boe": 23072179,
    "oil": 14591634,
    "gas": 127208178
  },
  {
    "county": "POTTER",
    "wells": 43,
    "producing": 14,
    "leases": 548,
    "boe": 18829184,
    "oil": 1477,
    "gas": 282415617
  },
  {
    "county": "BEE",
    "wells": 55,
    "producing": 14,
    "leases": 115,
    "boe": 16620314,
    "oil": 368507,
    "gas": 243777107
  },
  {
    "county": "MOORE",
    "wells": 8,
    "producing": 0,
    "leases": 266,
    "boe": 12302360,
    "oil": 255,
    "gas": 184531576
  },
  {
    "county": "WARD",
    "wells": 16,
    "producing": 9,
    "leases": 82,
    "boe": 6964464,
    "oil": 6279052,
    "gas": 10281191
  },
  {
    "county": "HOWARD",
    "wells": 21,
    "producing": 12,
    "leases": 49,
    "boe": 6057130,
    "oil": 5319897,
    "gas": 11058495
  },
  {
    "county": "MONTAGUE",
    "wells": 211,
    "producing": 158,
    "leases": 159,
    "boe": 4669324,
    "oil": 2167748,
    "gas": 37523645
  },
  {
    "county": "PECOS",
    "wells": 4,
    "producing": 0,
    "leases": 44,
    "boe": 4446345,
    "oil": 4100372,
    "gas": 5189596
  },
  {
    "county": "CROCKETT",
    "wells": 25,
    "producing": 1,
    "leases": 274,
    "boe": 4165461,
    "oil": 157214,
    "gas": 60123710
  },
  {
    "county": "LA SALLE",
    "wells": 38,
    "producing": 19,
    "leases": 27,
    "boe": 3538653,
    "oil": 2230728,
    "gas": 19618886
  },
  {
    "county": "REEVES",
    "wells": 1,
    "producing": 0,
    "leases": 62,
    "boe": 3123047,
    "oil": 2701797,
    "gas": 6318752
  },
  {
    "county": "ZAPATA",
    "wells": 2,
    "producing": 0,
    "leases": 94,
    "boe": 2755580,
    "oil": 13671,
    "gas": 41128649
  },
  {
    "county": "WINKLER",
    "wells": 10,
    "producing": 9,
    "leases": 91,
    "boe": 1916829,
    "oil": 1627497,
    "gas": 4339991
  },
  {
    "county": "LAVACA",
    "wells": 47,
    "producing": 1,
    "leases": 80,
    "boe": 1849112,
    "oil": 203891,
    "gas": 24678327
  },
  {
    "county": "MITCHELL",
    "wells": 13,
    "producing": 0,
    "leases": 18,
    "boe": 1847336,
    "oil": 1823961,
    "gas": 350634
  },
  {
    "county": "HARTLEY",
    "wells": 2,
    "producing": 0,
    "leases": 35,
    "boe": 1573798,
    "oil": 0,
    "gas": 23606977
  },
  {
    "county": "ATASCOSA",
    "wells": 14,
    "producing": 14,
    "leases": 10,
    "boe": 1547741,
    "oil": 1494297,
    "gas": 801663
  },
  {
    "county": "PARKER",
    "wells": 39,
    "producing": 3,
    "leases": 116,
    "boe": 1205804,
    "oil": 49595,
    "gas": 17343142
  },
  {
    "county": "CRANE",
    "wells": 3,
    "producing": 0,
    "leases": 7,
    "boe": 1012998,
    "oil": 897360,
    "gas": 1734579
  },
  {
    "county": "WISE",
    "wells": 36,
    "producing": 27,
    "leases": 44,
    "boe": 966701,
    "oil": 310469,
    "gas": 9843481
  },
  {
    "county": "DAWSON",
    "wells": 35,
    "producing": 29,
    "leases": 56,
    "boe": 859507,
    "oil": 791524,
    "gas": 1019754
  },
  {
    "county": "FREESTONE",
    "wells": 15,
    "producing": 0,
    "leases": 24,
    "boe": 794398,
    "oil": 353,
    "gas": 11910678
  },
  {
    "county": "HUTCHINSON",
    "wells": 2,
    "producing": 0,
    "leases": 27,
    "boe": 598421,
    "oil": 0,
    "gas": 8976319
  },
  {
    "county": "GARZA",
    "wells": 1,
    "producing": 1,
    "leases": 4,
    "boe": 469797,
    "oil": 457802,
    "gas": 179930
  },
  {
    "county": "CARSON",
    "wells": 0,
    "producing": 0,
    "leases": 14,
    "boe": 421208,
    "oil": 0,
    "gas": 6318123
  },
  {
    "county": "ECTOR",
    "wells": 11,
    "producing": 11,
    "leases": 2,
    "boe": 338006,
    "oil": 312784,
    "gas": 378332
  },
  {
    "county": "GOLIAD",
    "wells": 16,
    "producing": 0,
    "leases": 38,
    "boe": 299699,
    "oil": 51698,
    "gas": 3720028
  },
  {
    "county": "WILLACY",
    "wells": 0,
    "producing": 0,
    "leases": 13,
    "boe": 286063,
    "oil": 256345,
    "gas": 445772
  },
  {
    "county": "DENTON",
    "wells": 1,
    "producing": 0,
    "leases": 31,
    "boe": 285128,
    "oil": 5355,
    "gas": 4196600
  },
  {
    "county": "LEON",
    "wells": 5,
    "producing": 0,
    "leases": 24,
    "boe": 284702,
    "oil": 19043,
    "gas": 3984897
  },
  {
    "county": "HEMPHILL",
    "wells": 0,
    "producing": 0,
    "leases": 48,
    "boe": 273759,
    "oil": 29399,
    "gas": 3665414
  },
  {
    "county": "TERRY",
    "wells": 3,
    "producing": 0,
    "leases": 12,
    "boe": 250234,
    "oil": 249806,
    "gas": 6424
  },
  {
    "county": "ROBERTS",
    "wells": 0,
    "producing": 0,
    "leases": 48,
    "boe": 237562,
    "oil": 10791,
    "gas": 3401569
  },
  {
    "county": "MCMULLEN",
    "wells": 5,
    "producing": 1,
    "leases": 3,
    "boe": 230718,
    "oil": 76447,
    "gas": 2314071
  },
  {
    "county": "KENEDY",
    "wells": 32,
    "producing": 0,
    "leases": 28,
    "boe": 140308,
    "oil": 63454,
    "gas": 1152824
  },
  {
    "county": "SCHLEICHER",
    "wells": 1,
    "producing": 0,
    "leases": 24,
    "boe": 92746,
    "oil": 43065,
    "gas": 745228
  },
  {
    "county": "VAL VERDE",
    "wells": 1,
    "producing": 0,
    "leases": 7,
    "boe": 89736,
    "oil": 1403,
    "gas": 1325004
  },
  {
    "county": "OLDHAM",
    "wells": 0,
    "producing": 0,
    "leases": 2,
    "boe": 85712,
    "oil": 0,
    "gas": 1285695
  },
  {
    "county": "HIDALGO",
    "wells": 11,
    "producing": 0,
    "leases": 27,
    "boe": 83430,
    "oil": 18650,
    "gas": 971708
  },
  {
    "county": "GAINES",
    "wells": 13,
    "producing": 13,
    "leases": 15,
    "boe": 79812,
    "oil": 76579,
    "gas": 48505
  },
  {
    "county": "BRAZORIA",
    "wells": 0,
    "producing": 0,
    "leases": 5,
    "boe": 75531,
    "oil": 1797,
    "gas": 1106020
  },
  {
    "county": "ROBERTSON",
    "wells": 1,
    "producing": 0,
    "leases": 4,
    "boe": 47761,
    "oil": 127,
    "gas": 714514
  },
  {
    "county": "LOVING",
    "wells": 5,
    "producing": 0,
    "leases": 3,
    "boe": 43882,
    "oil": 40562,
    "gas": 49809
  },
  {
    "county": "LIBERTY",
    "wells": 0,
    "producing": 0,
    "leases": 3,
    "boe": 42475,
    "oil": 27191,
    "gas": 229262
  },
  {
    "county": "TOM GREEN",
    "wells": 6,
    "producing": 0,
    "leases": 1,
    "boe": 38130,
    "oil": 20553,
    "gas": 263658
  },
  {
    "county": "PALO PINTO",
    "wells": 3,
    "producing": 0,
    "leases": 2,
    "boe": 20833,
    "oil": 2091,
    "gas": 281132
  },
  {
    "county": "SCURRY",
    "wells": 0,
    "producing": 0,
    "leases": 1,
    "boe": 19647,
    "oil": 19603,
    "gas": 660
  },
  {
    "county": "ORANGE",
    "wells": 0,
    "producing": 0,
    "leases": 4,
    "boe": 14797,
    "oil": 5975,
    "gas": 132330
  },
  {
    "county": "OCHILTREE",
    "wells": 0,
    "producing": 0,
    "leases": 7,
    "boe": 10167,
    "oil": 4483,
    "gas": 85267
  },
  {
    "county": "DUVAL",
    "wells": 0,
    "producing": 0,
    "leases": 1,
    "boe": 6908,
    "oil": 28,
    "gas": 103201
  },
  {
    "county": "HIGH IS-LB",
    "wells": 1,
    "producing": 0,
    "leases": 1,
    "boe": 6223,
    "oil": 162,
    "gas": 90927
  },
  {
    "county": "MATAGORDA",
    "wells": 0,
    "producing": 0,
    "leases": 9,
    "boe": 5052,
    "oil": 0,
    "gas": 75787
  },
  {
    "county": "CALHOUN",
    "wells": 0,
    "producing": 0,
    "leases": 1,
    "boe": 4352,
    "oil": 1467,
    "gas": 43276
  },
  {
    "county": "WEBB",
    "wells": 0,
    "producing": 0,
    "leases": 4,
    "boe": 4015,
    "oil": 589,
    "gas": 51399
  },
  {
    "county": "BRAZOS",
    "wells": 2,
    "producing": 0,
    "leases": 2,
    "boe": 3648,
    "oil": 2848,
    "gas": 12011
  },
  {
    "county": "KING",
    "wells": 0,
    "producing": 0,
    "leases": 6,
    "boe": 3355,
    "oil": 7,
    "gas": 50230
  },
  {
    "county": "JACKSON",
    "wells": 0,
    "producing": 0,
    "leases": 1,
    "boe": 3233,
    "oil": 0,
    "gas": 48497
  },
  {
    "county": "BURLESON",
    "wells": 0,
    "producing": 0,
    "leases": 1,
    "boe": 2260,
    "oil": 2260,
    "gas": 0
  },
  {
    "county": "STERLING",
    "wells": 1,
    "producing": 0,
    "leases": 1,
    "boe": 2167,
    "oil": 210,
    "gas": 29364
  },
  {
    "county": "HANSFORD",
    "wells": 0,
    "producing": 0,
    "leases": 3,
    "boe": 1876,
    "oil": 64,
    "gas": 27194
  },
  {
    "county": "SHERMAN",
    "wells": 0,
    "producing": 0,
    "leases": 7,
    "boe": 1695,
    "oil": 0,
    "gas": 25432
  },
  {
    "county": "LIPSCOMB",
    "wells": 0,
    "producing": 0,
    "leases": 1,
    "boe": 962,
    "oil": 59,
    "gas": 13552
  },
  {
    "county": "BROOKS",
    "wells": 0,
    "producing": 0,
    "leases": 2,
    "boe": 833,
    "oil": 12,
    "gas": 12329
  },
  {
    "county": "STARR",
    "wells": 1,
    "producing": 0,
    "leases": 1,
    "boe": 352,
    "oil": 0,
    "gas": 5282
  },
  {
    "county": "BORDEN",
    "wells": 1,
    "producing": 0,
    "leases": 0,
    "boe": 0,
    "oil": 0,
    "gas": 0
  },
  {
    "county": "COKE",
    "wells": 0,
    "producing": 0,
    "leases": 1,
    "boe": 0,
    "oil": 0,
    "gas": 0
  },
  {
    "county": "MUSTANG IS-SB",
    "wells": 1,
    "producing": 0,
    "leases": 0,
    "boe": 0,
    "oil": 0,
    "gas": 0
  },
  {
    "county": "NUECES",
    "wells": 2,
    "producing": 0,
    "leases": 1,
    "boe": 0,
    "oil": 0,
    "gas": 0
  },
  {
    "county": "COOKE",
    "wells": 1,
    "producing": 1,
    "leases": 0,
    "boe": 0,
    "oil": 0,
    "gas": 0
  },
  {
    "county": "VICTORIA",
    "wells": 1,
    "producing": 0,
    "leases": 1,
    "boe": 0,
    "oil": 0,
    "gas": 0
  },
  {
    "county": "SOMERVELL",
    "wells": 1,
    "producing": 0,
    "leases": 0,
    "boe": 0,
    "oil": 0,
    "gas": 0
  },
  {
    "county": "WHARTON",
    "wells": 0,
    "producing": 0,
    "leases": 1,
    "boe": 0,
    "oil": 0,
    "gas": 0
  },
  {
    "county": "RAINS",
    "wells": 1,
    "producing": 0,
    "leases": 0,
    "boe": 0,
    "oil": 0,
    "gas": 0
  },
  {
    "county": "JEFFERSON",
    "wells": 0,
    "producing": 0,
    "leases": 1,
    "boe": 0,
    "oil": 0,
    "gas": 0
  },
  {
    "county": "COLORADO",
    "wells": 0,
    "producing": 0,
    "leases": 2,
    "boe": 0,
    "oil": 0,
    "gas": 0
  }
],
};

/**
 * Leases on record, keyed by operator number, ordered by lifetime oil descending.
 * The prototype ships the top 40; the full set needs the endpoint.
 */
export const OPERATOR_LEASES: Readonly<
  Record<string, readonly OperatorLeaseRow[]>
> = {
  "665748": [
  {
    "name": "XBC GIDDINGS ESTATE",
    "number": "16349",
    "county": "UPTON",
    "oil": 43613035,
    "gas": 150120116
  },
  {
    "name": "TEXAS TEN Y PU",
    "number": "46263",
    "county": "MIDLAND",
    "oil": 39071543,
    "gas": 114765362
  },
  {
    "name": "SPRABERRY DRIVER UNIT",
    "number": "15400",
    "county": "REAGAN",
    "oil": 33842791,
    "gas": 133533063
  },
  {
    "name": "SHACKELFORD SPRABERRY UNIT",
    "number": "18187",
    "county": "MIDLAND",
    "oil": 27496344,
    "gas": 89462441
  },
  {
    "name": "SCHARBAUER RANCH",
    "number": "37534",
    "county": "MARTIN",
    "oil": 23661122,
    "gas": 39470506
  },
  {
    "name": "UNIVERSITY \"7-43\"",
    "number": "40532",
    "county": "ANDREWS",
    "oil": 22790631,
    "gas": 45704469
  },
  {
    "name": "HUTT, DONALD L.'C'",
    "number": "37123",
    "county": "MIDLAND",
    "oil": 22667562,
    "gas": 73270010
  },
  {
    "name": "HUTT, DONALD L. FEE",
    "number": "06414",
    "county": "MIDLAND",
    "oil": 17383832,
    "gas": 60359302
  },
  {
    "name": "PEMBROOK UNIT",
    "number": "04088",
    "county": "UPTON",
    "oil": 15780322,
    "gas": 34474568
  },
  {
    "name": "PRESTON SPRABERRY UNIT",
    "number": "18551",
    "county": "MIDLAND",
    "oil": 13284342,
    "gas": 46056790
  },
  {
    "name": "ROCKER B",
    "number": "14573",
    "county": "IRION",
    "oil": 12866263,
    "gas": 105770459
  },
  {
    "name": "MIDKIFF UNIT",
    "number": "15254",
    "county": "MIDLAND",
    "oil": 10688396,
    "gas": 51698445
  },
  {
    "name": "SHACKELFORD",
    "number": "46106",
    "county": "MIDLAND",
    "oil": 10401099,
    "gas": 40440546
  },
  {
    "name": "NORTH PEMBROOK SPRABERRY UNIT",
    "number": "03913",
    "county": "UPTON",
    "oil": 10328417,
    "gas": 28092364
  },
  {
    "name": "UNIVERSITY \"2-20\"",
    "number": "16589",
    "county": "REAGAN",
    "oil": 8113300,
    "gas": 24195881
  },
  {
    "name": "TEXAS TEN 'AA'",
    "number": "44078",
    "county": "MIDLAND",
    "oil": 7896614,
    "gas": 23907415
  },
  {
    "name": "O DANIEL, E. T.",
    "number": "06451",
    "county": "MIDLAND",
    "oil": 7684643,
    "gas": 18906195
  },
  {
    "name": "PRESTON 5",
    "number": "47241",
    "county": "MIDLAND",
    "oil": 6928324,
    "gas": 43633405
  },
  {
    "name": "GERMANIA SPRABERRY UNIT",
    "number": "21487",
    "county": "MIDLAND",
    "oil": 6000237,
    "gas": 11616159
  },
  {
    "name": "MCCLINTIC -E-",
    "number": "06390",
    "county": "MIDLAND",
    "oil": 5749394,
    "gas": 18315824
  },
  {
    "name": "UNIVERSITY \"3-19\"",
    "number": "17382",
    "county": "UPTON",
    "oil": 5322993,
    "gas": 16008363
  },
  {
    "name": "RAY REED 32",
    "number": "20252",
    "county": "UPTON",
    "oil": 5311443,
    "gas": 24167373
  },
  {
    "name": "GERMANIA 45",
    "number": "49324",
    "county": "MIDLAND",
    "oil": 5285116,
    "gas": 10085266
  },
  {
    "name": "MERCHANT UNIT",
    "number": "04426",
    "county": "REAGAN",
    "oil": 5236485,
    "gas": 33172371
  },
  {
    "name": "GERMANIA 42",
    "number": "48935",
    "county": "MIDLAND",
    "oil": 4744179,
    "gas": 13248269
  },
  {
    "name": "NORTHEAST SCHARBAUER",
    "number": "50323",
    "county": "MARTIN",
    "oil": 4577501,
    "gas": 8100781
  },
  {
    "name": "ARICK-HOOPER UNIT",
    "number": "53496",
    "county": "MIDLAND",
    "oil": 4018096,
    "gas": 14562072
  },
  {
    "name": "PRESTON B",
    "number": "47855",
    "county": "MIDLAND",
    "oil": 3842022,
    "gas": 23210529
  },
  {
    "name": "UNIVERSITY 7-28 PU",
    "number": "51198",
    "county": "MARTIN",
    "oil": 3806513,
    "gas": 5496103
  },
  {
    "name": "ALDWELL K R 40",
    "number": "18929",
    "county": "REAGAN",
    "oil": 3732332,
    "gas": 18659696
  },
  {
    "name": "UNIVERSITY \"1-32\"",
    "number": "16296",
    "county": "REAGAN",
    "oil": 3679183,
    "gas": 5517237
  },
  {
    "name": "SHERROD UNIT",
    "number": "04947",
    "county": "REAGAN",
    "oil": 3622758,
    "gas": 8765095
  },
  {
    "name": "DRIVER 27",
    "number": "21036",
    "county": "REAGAN",
    "oil": 3189411,
    "gas": 25344643
  },
  {
    "name": "SINOR RANCH A",
    "number": "10786",
    "county": "LIVE OAK",
    "oil": 3077522,
    "gas": 3284758
  },
  {
    "name": "CHEATHAM HOUSTON B",
    "number": "48500",
    "county": "GLASSCOCK",
    "oil": 3017240,
    "gas": 5167217
  },
  {
    "name": "UNIVERSITY \"3-14\"",
    "number": "16524",
    "county": "UPTON",
    "oil": 3004275,
    "gas": 6799003
  },
  {
    "name": "O BRIEN B",
    "number": "46785",
    "county": "MIDLAND",
    "oil": 2957369,
    "gas": 9024543
  },
  {
    "name": "PRESTON A",
    "number": "46162",
    "county": "MIDLAND",
    "oil": 2949887,
    "gas": 16585938
  },
  {
    "name": "TURNER H R40",
    "number": "46907",
    "county": "MIDLAND",
    "oil": 2917745,
    "gas": 9354808
  },
  {
    "name": "PEMBROOK 4",
    "number": "19059",
    "county": "UPTON",
    "oil": 2828256,
    "gas": 5224464
  }
],
};

/* --------------------------------------------------------------------------
   The three blocks the prototype hardcodes.

   These are literals in its markup — its renderer never touches them — and they
   describe one operator: Martin County growth, a pending transfer to ExxonMobil,
   wells named Shackelford Spraberry. Rendering them under another operator's name
   would publish invented figures about a real company, so they are keyed to the
   operator they were written for and shown only there.

   Two of the three carry the design's own visible "illustrative until the live RRC
   feed wires" note. `whatChanged` did not, so `OPERATOR_ILLUSTRATIVE_NOTE` gives
   it the same disclosure its siblings already have.
   -------------------------------------------------------------------------- */

export const OPERATOR_ILLUSTRATIVE_NOTE =
  "Illustrative until the live RRC feed wires.";

export interface ConditionCard {
  label: string;
  value: string;
  unit?: string;
  /**
   * The change chip. All three are optional together: the API has no twelve-month
   * comparison for producing leases, so that card renders without a chip rather
   * than with a computed one.
   */
  direction?: "up" | "down";
  delta?: string;
  window?: string;
  foot: string;
  /**
   * Put `foot` on the chip's line rather than under it.
   *
   * ONLY WHERE THE FOOT IS ITSELF A COMPARISON. The BOE card's foot is its
   * year-on-year change, a sibling of the month-on-month chip beside it, so the two
   * belong on one line — and that card's value is long enough to take the whole first
   * line, which left the chip's row half empty with the comparison stranded below it.
   * The other three cards' feet are context rather than comparisons ("of 10,324 on
   * record"), and they stay where they are.
   */
  footInline?: boolean;
  icon: "production" | "leases" | "permits" | "completions";
}

/**
 * The working behind one finding, as the analysis service computes it.
 *
 * IT SHIPS WITH THE PANEL, so opening a row is instant and costs no request. Every
 * figure here is already computed upstream and only formatted for display — the UI
 * must never become a second place a number is worked out, or there are two
 * definitions of the same figure.
 */
export interface ChangeEvidence {
  /** What the measure means, in a sentence a mineral owner can act on. */
  why: string;
  /** Label / value / qualifier, as a small table. */
  rows: readonly { k: string; v: string; note: string }[];
  /** How the figure was measured, for someone who wants to check it. */
  method: string;
  /** An optional series for a sparkline; `on` marks the month in question. */
  series: readonly { label: string; value: number; on: boolean }[];
}

export interface ChangeRow {
  kind: "up" | "down" | "add" | "flag" | "swap";
  headline: string;
  detail: string;
  source: string;
  /**
   * Present on rows from the analysis service, absent on the fixture rows — which is
   * why it is optional rather than required. A row without it simply does not expand.
   */
  evidence?: ChangeEvidence;
}

export const OPERATOR_CONDITION_CARDS: Readonly<
  Record<string, readonly ConditionCard[]>
> = {
  "665748": [
    { label: "Latest monthly BOE", value: "19.8", unit: "MMBOE", direction: "up", delta: "1.4%", window: "MoM", foot: "vs Apr 2025: −4.2%", icon: "production" },
    { label: "Producing leases", value: "6,910", direction: "down", delta: "214", window: "12 mo", foot: "of 10,264 on record", icon: "leases" },
    { label: "New permits · 90d", value: "34", direction: "down", delta: "8", window: "vs prior qtr", foot: "365d: 141", icon: "permits" },
    { label: "Completions · 90d", value: "21", direction: "up", delta: "3", window: "vs prior qtr", foot: "12 to first prod.", icon: "completions" },
  ],
};

export interface RecentWellRow {
  well: string;
  /** RRC API-14. Hardcoded in the prototype for this operator. */
  api: string;
  county: string;
  statusKind: string;
  status: string;
  type: string;
  lateral: string;
  firstProduction: string;
}

export const OPERATOR_RECENT_WELLS: Readonly<
  Record<string, readonly RecentWellRow[]>
> = {
  "665748": [
  {
    "well": "Shackelford Spraberry 18187-4H",
    "api": "42-329-40182",
    "county": "Midland",
    "statusKind": "first",
    "status": "First prod",
    "type": "Horiz.",
    "lateral": "11,240 ft",
    "firstProduction": "Mar 2026"
  },
  {
    "well": "Scharbauer Ranch 37534-9H",
    "api": "42-317-38771",
    "county": "Martin",
    "statusKind": "prod",
    "status": "Producing",
    "type": "Horiz.",
    "lateral": "12,010 ft",
    "firstProduction": "Feb 2026"
  },
  {
    "well": "University 7-43 40532-2H",
    "api": "42-003-41220",
    "county": "Andrews",
    "statusKind": "duc",
    "status": "Completed (DUC)",
    "type": "Horiz.",
    "lateral": "9,800 ft",
    "firstProduction": "—"
  },
  {
    "well": "Midkiff Unit 15254-6H",
    "api": "42-451-39004",
    "county": "Reagan",
    "statusKind": "perm",
    "status": "Permitted",
    "type": "Horiz.",
    "lateral": "10,500 ft",
    "firstProduction": "—"
  },
  {
    "well": "Preston Spraberry 18551-3H",
    "api": "42-329-40551",
    "county": "Midland",
    "statusKind": "prod",
    "status": "Producing",
    "type": "Horiz.",
    "lateral": "11,900 ft",
    "firstProduction": "Jan 2026"
  },
  {
    "well": "Rocker B 14573-1H",
    "api": "42-235-33128",
    "county": "Irion",
    "statusKind": "inact",
    "status": "Inactive (7 mo)",
    "type": "Horiz.",
    "lateral": "8,600 ft",
    "firstProduction": "2019"
  }
],
};

export const OPERATOR_CHANGE_ROWS: Readonly<
  Record<string, readonly ChangeRow[]>
> = {
  "665748": [
    { kind: "up", headline: "Production grew in Martin County", detail: "+6.3% TTM, now 23% of operator volume and the fastest-growing core county.", source: "RRC Form PR · processed Jun 2026" },
    { kind: "add", headline: "12 wells reached first production", detail: "in 90 days — 9 in Midland & Martin (2025–26 vintage).", source: "RRC Completions (W-2 / G-1)" },
    { kind: "down", headline: "Legacy-well decline offset ~60%", detail: "of new-well additions, keeping net TTM BOE slightly negative.", source: "Derived: base-decline vs new-completion waterfall" },
    { kind: "flag", headline: "8 fewer permits filed", detail: "than prior quarter — third straight quarter of easing activity.", source: "RRC Drilling Permits (W-1)" },
    { kind: "swap", headline: "147 leases show pending operator-transfer flags", detail: "to ExxonMobil IDs — expect gradual attribution shift.", source: "Derived: Form P-4 effective-date mapping" },
  ],
};
