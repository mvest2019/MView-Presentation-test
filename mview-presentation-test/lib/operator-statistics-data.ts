/**
 * TEMPORARY FIXTURE — delete when a statistics endpoint exists.
 *
 * The 30 Texas operators the Compare Operator Statistics page can put
 * head-to-head, in statewide rank order by reported production. Extracted verbatim
 * from the approved prototype's `KYO_OPS` (lifetime volumes, leases, counties),
 * `KYO_ADDR` (RRC P-5 physical address), `KYO_TOPCTY` (most-active counties) and
 * `MV_CMP_ANNUAL` (the annual series behind `trend`).
 *
 * WHY A FIXTURE. `POST /api/v1/operators/search` carries two quarters per
 * operator and no address, no lifetime oil/gas split and no annual history — none
 * of the four blocks this page renders. Until an endpoint covers them this is the
 * only source, which is also why the picker offers 30 operators rather
 * than the directory's 24,744. Swap it behind `lib/operator-statistics.ts`; nothing
 * above that file reads this one.
 *
 * RELATION TO `operator-compare-data.ts`. That fixture holds the ten-year series
 * for the 8 operators the production page charts; this one holds lifetime
 * totals for all 30 plus a five-year `trend`. Both were extracted from the
 * same prototype constants, and the extractor asserts that every figure the two
 * sources share is identical, so they cannot describe one operator differently.
 *
 * Every figure is real filed data. `oilTotal` is barrels, `gasTotal` is Mcf,
 * `boeTotal` is barrels of oil equivalent at 15:1. Names and slugs are the search
 * API's `cleaned_operator_name` and `operator_name_url`, read from the live
 * endpoint rather than derived, so a link built from `slug` lands where the
 * operator directory's own links land.
 */

export interface OperatorStatisticsRecord {
  /** Position in the statewide production ranking. */
  rank: number;
  /** The API's `operator_name_url` — `/operators/{slug}`. */
  slug: string;
  /** The API's `cleaned_operator_name`. */
  name: string;
  /** The regulator's upper-case filed name, for future API matching. */
  filedName: string;
  operatorNumber: string;
  /** Lifetime barrels of oil equivalent, 15:1. */
  boeTotal: number;
  /** Lifetime barrels. */
  oilTotal: number;
  /** Lifetime Mcf. */
  gasTotal: number;
  leases: number;
  counties: number;
  /** RRC P-5 physical address, or null when none is on file. */
  headquarters: string | null;
  /** Three most-active counties, upper case as filed, highest first. */
  topCounties: string[];
  /**
   * Annual BOE for `STATISTICS_TREND_YEARS`, or null for the operators with no
   * filed annual series in this extract — 22 of 30. The page shows
   * those as em dashes rather than zeros; a missing series is not no production.
   */
  trend: number[] | null;
}

/** The five years the trend block covers, ascending. */
export const STATISTICS_TREND_YEARS: readonly number[] = [2021,2022,2023,2024,2025];

/** Ordered by statewide rank, which is the order the picker offers. */
export const OPERATOR_STATISTICS_RECORDS: readonly OperatorStatisticsRecord[] =
[
  {
    "rank": 1,
    "slug": "pioneer-natural-res-usa-inc",
    "name": "Pioneer Natural RES USA, Inc",
    "filedName": "PIONEER NATURAL RES. USA, INC.",
    "operatorNumber": "665748",
    "boeTotal": 2367474174,
    "oilTotal": 1889325683,
    "gasTotal": 7172227377,
    "leases": 10264,
    "counties": 79,
    "headquarters": "777 Hidden Ridge, Irving, TX 75038",
    "topCounties": [
      "MIDLAND",
      "UPTON",
      "MARTIN"
    ],
    "trend": [
      206573474,
      220771659,
      233829417,
      249816616,
      266832048
    ]
  },
  {
    "rank": 2,
    "slug": "eog-resources-inc",
    "name": "EOG Resources, Inc",
    "filedName": "EOG RESOURCES, INC.",
    "operatorNumber": "253162",
    "boeTotal": 2109092343,
    "oilTotal": 1470785645,
    "gasTotal": 9574600479,
    "leases": 11366,
    "counties": 110,
    "headquarters": "PO Box 2267, Midland, TX 79702",
    "topCounties": [
      "GONZALES",
      "MONTAGUE",
      "KLEBERG"
    ],
    "trend": [
      132583971,
      128755182,
      128763476,
      124535729,
      125034662
    ]
  },
  {
    "rank": 3,
    "slug": "xto-energy-inc",
    "name": "XTO Energy, Inc",
    "filedName": "XTO ENERGY INC.",
    "operatorNumber": "945936",
    "boeTotal": 1706939749,
    "oilTotal": 794373474,
    "gasTotal": 13688494138,
    "leases": 13180,
    "counties": 108,
    "headquarters": "22777 Springwoods Village Pkwy, Spring, TX 77389",
    "topCounties": [
      "MIDLAND",
      "GAINES",
      "ECTOR"
    ],
    "trend": [
      120038079,
      115245093,
      110201925,
      99835517,
      90452440
    ]
  },
  {
    "rank": 4,
    "slug": "occidental-permian-ltd",
    "name": "Occidental Permian, Ltd",
    "filedName": "OCCIDENTAL PERMIAN LTD.",
    "operatorNumber": "617544",
    "boeTotal": 1291678867,
    "oilTotal": 1138857455,
    "gasTotal": 2292321181,
    "leases": 743,
    "counties": 24,
    "headquarters": "5 Greenway Plaza Ste 110, Houston, TX 77046",
    "topCounties": [
      "YOAKUM",
      "ECTOR",
      "GAINES"
    ],
    "trend": [
      38158046,
      35731785,
      37139768,
      38257698,
      38942370
    ]
  },
  {
    "rank": 5,
    "slug": "diamondback-ep-llc",
    "name": "Diamondback E&P, LLC",
    "filedName": "DIAMONDBACK E&P LLC",
    "operatorNumber": "217012",
    "boeTotal": 1188206430,
    "oilTotal": 988661465,
    "gasTotal": 2993174481,
    "leases": 5589,
    "counties": 22,
    "headquarters": "500 W Texas Ave Ste 100, Midland, TX 79701",
    "topCounties": [
      "MARTIN",
      "MIDLAND",
      "ECTOR"
    ],
    "trend": [
      105926921,
      125119730,
      146929429,
      153439574,
      264744266
    ]
  },
  {
    "rank": 6,
    "slug": "devon-energy-production-co-lp",
    "name": "Devon Energy Production Co, LP",
    "filedName": "DEVON ENERGY PRODUCTION CO, L.P.",
    "operatorNumber": "216378",
    "boeTotal": 1184992447,
    "oilTotal": 496591155,
    "gasTotal": 10326019387,
    "leases": 14447,
    "counties": 114,
    "headquarters": "333 West Sheridan Ave, Oklahoma City, OK 73102",
    "topCounties": [
      "KARNES",
      "WISE",
      "DE WITT"
    ],
    "trend": [
      22826256,
      25541977,
      34275565,
      39263554,
      34597569
    ]
  },
  {
    "rank": 7,
    "slug": "chevron-u-s-a-inc",
    "name": "Chevron USA, Inc",
    "filedName": "CHEVRON U. S. A. INC.",
    "operatorNumber": "148113",
    "boeTotal": 1116538489,
    "oilTotal": 761576464,
    "gasTotal": 5324430389,
    "leases": 5901,
    "counties": 75,
    "headquarters": "6301 Deauville Blvd, Midland, TX 79706",
    "topCounties": [
      "MIDLAND",
      "CULBERSON",
      "PANOLA"
    ],
    "trend": [
      57992695,
      64261187,
      63131831,
      64084749,
      66004638
    ]
  },
  {
    "rank": 8,
    "slug": "apache-corporation",
    "name": "Apache Corporation",
    "filedName": "APACHE CORPORATION",
    "operatorNumber": "027200",
    "boeTotal": 1010967673,
    "oilTotal": 713305332,
    "gasTotal": 4464935129,
    "leases": 7976,
    "counties": 123,
    "headquarters": "2000 W Sam Houston Pkwy S Ste 200, Houston, TX 77042",
    "topCounties": [
      "REAGAN",
      "GLASSCOCK",
      "HOWARD"
    ],
    "trend": [
      44401255,
      44793768,
      47824723,
      67057859,
      81650525
    ]
  },
  {
    "rank": 9,
    "slug": "anadarko-ep-onshore-llc",
    "name": "Anadarko E&P Onshore, LLC",
    "filedName": "ANADARKO E&P ONSHORE LLC",
    "operatorNumber": "020528",
    "boeTotal": 997584836,
    "oilTotal": 750977366,
    "gasTotal": 3699112064,
    "leases": 8656,
    "counties": 30,
    "headquarters": "5 Greenway Plaza Ste 110, Houston, TX 77046",
    "topCounties": [
      "LOVING",
      "REEVES",
      "WARD"
    ],
    "trend": null
  },
  {
    "rank": 10,
    "slug": "burlington-resources-o-g-co-lp",
    "name": "Burlington Resources O&G Co, LP",
    "filedName": "BURLINGTON RESOURCES O & G CO LP",
    "operatorNumber": "109333",
    "boeTotal": 915213883,
    "oilTotal": 697199988,
    "gasTotal": 3270208437,
    "leases": 3571,
    "counties": 42,
    "headquarters": "PO Box 2197, Houston, TX 77252",
    "topCounties": [
      "DE WITT",
      "KARNES",
      "LIVE OAK"
    ],
    "trend": null
  },
  {
    "rank": 11,
    "slug": "cog-operating-llc",
    "name": "COG Operating, LLC",
    "filedName": "COG OPERATING LLC",
    "operatorNumber": "166150",
    "boeTotal": 832367276,
    "oilTotal": 684819416,
    "gasTotal": 2213217908,
    "leases": 2646,
    "counties": 39,
    "headquarters": "600 W Illinois Ave, Midland, TX 79701",
    "topCounties": [
      "UPTON",
      "MIDLAND",
      "ANDREWS"
    ],
    "trend": null
  },
  {
    "rank": 12,
    "slug": "marathon-oil-ef-llc",
    "name": "Marathon Oil EF, LLC",
    "filedName": "MARATHON OIL EF LLC",
    "operatorNumber": "525398",
    "boeTotal": 675411407,
    "oilTotal": 561499097,
    "gasTotal": 1708684662,
    "leases": 2117,
    "counties": 11,
    "headquarters": "990 Town & Country Blvd, Houston, TX 77024",
    "topCounties": [
      "KARNES",
      "ATASCOSA",
      "LIVE OAK"
    ],
    "trend": null
  },
  {
    "rank": 13,
    "slug": "endeavor-energy-resources-lp",
    "name": "Endeavor Energy Resources, LP",
    "filedName": "ENDEAVOR ENERGY RESOURCES L.P.",
    "operatorNumber": "251726",
    "boeTotal": 607820209,
    "oilTotal": 507674675,
    "gasTotal": 1502183011,
    "leases": 3607,
    "counties": 59,
    "headquarters": "110 N Marienfeld St, Midland, TX 79701",
    "topCounties": [
      "REAGAN",
      "HOWARD",
      "MIDLAND"
    ],
    "trend": null
  },
  {
    "rank": 14,
    "slug": "chesapeake-operating-inc",
    "name": "Chesapeake Operating, Inc",
    "filedName": "CHESAPEAKE OPERATING, INC.",
    "operatorNumber": "147715",
    "boeTotal": 551739144,
    "oilTotal": 169607196,
    "gasTotal": 5731979222,
    "leases": 8322,
    "counties": 124,
    "headquarters": "PO Box 18496, Oklahoma City, OK 73154",
    "topCounties": [
      "CARSON",
      "NACOGDOCHES",
      "ZAPATA"
    ],
    "trend": null
  },
  {
    "rank": 15,
    "slug": "chesapeake-operating-llc",
    "name": "Chesapeake Operating, LLC",
    "filedName": "CHESAPEAKE OPERATING, L.L.C.",
    "operatorNumber": "147699",
    "boeTotal": 503755054,
    "oilTotal": 369224456,
    "gasTotal": 2017958971,
    "leases": 7021,
    "counties": 67,
    "headquarters": "PO Box 18496, Oklahoma City, OK 73154",
    "topCounties": [
      "MCMULLEN",
      "DIMMIT",
      "LA SALLE"
    ],
    "trend": null
  },
  {
    "rank": 16,
    "slug": "sm-energy-company",
    "name": "SM Energy Company",
    "filedName": "SM ENERGY COMPANY",
    "operatorNumber": "788997",
    "boeTotal": 500651882,
    "oilTotal": 319578366,
    "gasTotal": 2716102750,
    "leases": 2129,
    "counties": 28,
    "headquarters": "6301 Holiday Hill Rd Bldg 1, Midland, TX 79707",
    "topCounties": [
      "WEBB",
      "UPTON",
      "HOWARD"
    ],
    "trend": null
  },
  {
    "rank": 17,
    "slug": "cimarex-energy-co",
    "name": "Cimarex Energy Co",
    "filedName": "CIMAREX ENERGY CO.",
    "operatorNumber": "153438",
    "boeTotal": 448973578,
    "oilTotal": 278594887,
    "gasTotal": 2555680379,
    "leases": 1318,
    "counties": 30,
    "headquarters": "6001 Deauville Blvd Ste 300N, Midland, TX 79706",
    "topCounties": [
      "REEVES",
      "JEFFERSON",
      "PECOS"
    ],
    "trend": null
  },
  {
    "rank": 18,
    "slug": "kinder-morgan-production-co-llc",
    "name": "Kinder Morgan Production Co, LLC",
    "filedName": "KINDER MORGAN PRODUCTION CO LLC",
    "operatorNumber": "463316",
    "boeTotal": 420496885,
    "oilTotal": 343624931,
    "gasTotal": 1153079323,
    "leases": 69,
    "counties": 9,
    "headquarters": "6 Desta Drive Ste 6000, Midland, TX 79705",
    "topCounties": [
      "SCURRY",
      "PECOS",
      "CRANE"
    ],
    "trend": null
  },
  {
    "rank": 19,
    "slug": "exxon-corp",
    "name": "Exxon, Corp",
    "filedName": "EXXON CORP.",
    "operatorNumber": "257097",
    "boeTotal": 396089558,
    "oilTotal": 220888340,
    "gasTotal": 2628018281,
    "leases": 5622,
    "counties": 101,
    "headquarters": "PO Box 4358, Houston, TX 77210",
    "topCounties": [
      "KLEBERG",
      "BROOKS",
      "KENEDY"
    ],
    "trend": null
  },
  {
    "rank": 20,
    "slug": "oxy-usa-wtp-lp",
    "name": "OXY USA WTP, LP",
    "filedName": "OXY USA WTP LP",
    "operatorNumber": "630555",
    "boeTotal": 388851007,
    "oilTotal": 330708911,
    "gasTotal": 872131448,
    "leases": 913,
    "counties": 28,
    "headquarters": "5 Greenway Plaza Ste 110, Houston, TX 77046",
    "topCounties": [
      "YOAKUM",
      "ECTOR",
      "KENT"
    ],
    "trend": null
  },
  {
    "rank": 21,
    "slug": "oxy-usa-inc",
    "name": "OXY USA, Inc",
    "filedName": "OXY USA INC.",
    "operatorNumber": "630591",
    "boeTotal": 388186504,
    "oilTotal": 288724701,
    "gasTotal": 1491927058,
    "leases": 3899,
    "counties": 67,
    "headquarters": "5 Greenway Plaza Ste 110, Houston, TX 77046",
    "topCounties": [
      "GAINES",
      "ECTOR",
      "ANDREWS"
    ],
    "trend": null
  },
  {
    "rank": 22,
    "slug": "conocophillips-company",
    "name": "Conocophillips Company",
    "filedName": "CONOCOPHILLIPS COMPANY",
    "operatorNumber": "172232",
    "boeTotal": 357665159,
    "oilTotal": 148385687,
    "gasTotal": 3139192083,
    "leases": 5718,
    "counties": 48,
    "headquarters": "600 W Illinois Ave, Midland, TX 79701",
    "topCounties": [
      "HOWARD",
      "ECTOR",
      "WEBB"
    ],
    "trend": null
  },
  {
    "rank": 23,
    "slug": "wpx-energy-permian-llc",
    "name": "WPX Energy Permian, LLC",
    "filedName": "WPX ENERGY PERMIAN, LLC",
    "operatorNumber": "942623",
    "boeTotal": 351230502,
    "oilTotal": 269053634,
    "gasTotal": 1232653029,
    "leases": 1116,
    "counties": 6,
    "headquarters": "333 West Sheridan Ave, Oklahoma City, OK 73102",
    "topCounties": [
      "LOVING",
      "WINKLER",
      "REEVES"
    ],
    "trend": null
  },
  {
    "rank": 24,
    "slug": "mobil-producing-tx-nm-inc",
    "name": "Mobil Producing TX & NM, Inc",
    "filedName": "MOBIL PRODUCING TX. & N.M. INC.",
    "operatorNumber": "572550",
    "boeTotal": 345231590,
    "oilTotal": 192169242,
    "gasTotal": 2295935229,
    "leases": 1837,
    "counties": 49,
    "headquarters": "22777 Springwoods Village Pkwy, Spring, TX 77389",
    "topCounties": [
      "JACKSON",
      "JIM WELLS",
      "HIDALGO"
    ],
    "trend": null
  },
  {
    "rank": 25,
    "slug": "encana-oil-gasusa-inc",
    "name": "Encana Oil & Gas USA, Inc",
    "filedName": "ENCANA OIL & GAS(USA) INC.",
    "operatorNumber": "251691",
    "boeTotal": 326473285,
    "oilTotal": 192872932,
    "gasTotal": 2004005300,
    "leases": 2937,
    "counties": 59,
    "headquarters": "370 17th Street Ste 1700, Denver, CO 80202",
    "topCounties": [
      "FREESTONE",
      "DENTON",
      "PARKER"
    ],
    "trend": null
  },
  {
    "rank": 26,
    "slug": "bpx-operating-company",
    "name": "BPX Operating Company",
    "filedName": "BPX OPERATING COMPANY",
    "operatorNumber": "085408",
    "boeTotal": 320991060,
    "oilTotal": 194643306,
    "gasTotal": 1895216320,
    "leases": 2348,
    "counties": 19,
    "headquarters": "1700 Platte St, Denver, CO 80202",
    "topCounties": [
      "DE WITT",
      "REEVES",
      "MCMULLEN"
    ],
    "trend": null
  },
  {
    "rank": 27,
    "slug": "ovintiv-usa-inc",
    "name": "Ovintiv USA, Inc",
    "filedName": "OVINTIV USA INC.",
    "operatorNumber": "628658",
    "boeTotal": 320942810,
    "oilTotal": 264104606,
    "gasTotal": 852573074,
    "leases": 1653,
    "counties": 16,
    "headquarters": "370 17th Street Ste 1700, Denver, CO 80202",
    "topCounties": [
      "MARTIN",
      "MIDLAND",
      "HOWARD"
    ],
    "trend": null
  },
  {
    "rank": 28,
    "slug": "exxon-mobil-corporation",
    "name": "Exxon Mobil Corporation",
    "filedName": "EXXON MOBIL CORPORATION",
    "operatorNumber": "257128",
    "boeTotal": 319423761,
    "oilTotal": 161363482,
    "gasTotal": 2370904198,
    "leases": 3967,
    "counties": 71,
    "headquarters": "22777 Springwoods Village Pkwy, Spring, TX 77389",
    "topCounties": [
      "BROOKS",
      "FRANKLIN",
      "KLEBERG"
    ],
    "trend": null
  },
  {
    "rank": 29,
    "slug": "lewis-petro-properties-inc",
    "name": "Lewis Petro Properties, Inc",
    "filedName": "LEWIS PETRO PROPERTIES, INC.",
    "operatorNumber": "499978",
    "boeTotal": 304613284,
    "oilTotal": 31158853,
    "gasTotal": 4101816465,
    "leases": 3207,
    "counties": 7,
    "headquarters": "10101 Reunion Place Ste 1000, San Antonio, TX 78216",
    "topCounties": [
      "WEBB",
      "LA SALLE",
      "DIMMIT"
    ],
    "trend": null
  },
  {
    "rank": 30,
    "slug": "texaco-e-p-inc",
    "name": "Texaco E&P, Inc",
    "filedName": "TEXACO E & P INC.",
    "operatorNumber": "844118",
    "boeTotal": 299910839,
    "oilTotal": 188791020,
    "gasTotal": 1666797296,
    "leases": 4547,
    "counties": 105,
    "headquarters": "11111 S Wilcrest, Houston, TX 77099",
    "topCounties": [
      "HOCKLEY",
      "MARTIN",
      "GREGG"
    ],
    "trend": null
  }
];
