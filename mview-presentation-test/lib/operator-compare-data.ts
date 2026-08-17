/**
 * TEMPORARY FIXTURE — delete when a compare endpoint exists.
 *
 * Ten years of filed annual production for the operators the Compare Operator
 * Production page can chart. Extracted verbatim from the approved prototype's
 * `MV_CMP_ANNUAL` (and `KYO_TOPCTY` for the most-active counties), so the page
 * renders the same figures the design was reviewed against.
 *
 * WHY A FIXTURE. No endpoint we have returns an annual series.
 * `POST /api/v1/operators/search` carries only `*_current_quarter` and
 * `*_previous_quarter` — two quarters, not ten years. Until a compare endpoint
 * lands, this is the only source, which is also why the page can compare
 * 8 operators rather than all 24,744 in the directory.
 *
 * Every figure here is real filed data. `oil` is barrels, `gas` is Mcf, and
 * `boe` is the operator's barrels of oil equivalent as the prototype computed it
 * (gas at 15:1). Nothing is derived at render time.
 *
 * Names arrive from the regulator in upper case; `name` is the display form and
 * `filedName` keeps the original for matching against the search API later.
 */

export interface OperatorCompareYear {
  year: number;
  /** Barrels. */
  oil: number;
  /** Mcf. */
  gas: number;
  /** Barrels of oil equivalent. */
  boe: number;
}

export interface OperatorCompareRecord {
  /**
   * The API's own `operator_name_url`, so a link built from it lands on the same
   * `/operators/{slug}` the directory table links to. Read from the live search
   * response rather than derived — deriving it produced `chevron-usa-inc` where
   * the record actually says `chevron-u-s-a-inc`.
   */
  slug: string;
  /** Display name — the API's `cleaned_operator_name`. */
  name: string;
  /** The regulator's upper-case filed name, for future API matching. */
  filedName: string;
  operatorNumber: string;
  /** Lifetime BOE across the filed record. */
  boeTotal: number;
  leases: number;
  counties: number;
  /** Most-active counties, highest first. */
  topCounties: string[];
  series: OperatorCompareYear[];
}

/** The years every record covers, ascending. */
export const COMPARE_YEARS: readonly number[] = [2016,2017,2018,2019,2020,2021,2022,2023,2024,2025];

/** Ordered by lifetime BOE, which is the order the pickers offer. */
export const OPERATOR_COMPARE_RECORDS: readonly OperatorCompareRecord[] =
[
  {
    "slug": "pioneer-natural-res-usa-inc",
    "filedName": "PIONEER NATURAL RES. USA, INC.",
    "name": "Pioneer Natural RES USA, Inc",
    "operatorNumber": "665748",
    "boeTotal": 2367474174,
    "leases": 10264,
    "counties": 79,
    "topCounties": [
      "MIDLAND",
      "UPTON",
      "MARTIN"
    ],
    "series": [
      {
        "year": 2016,
        "oil": 77234383,
        "gas": 231369354,
        "boe": 92659007
      },
      {
        "year": 2017,
        "oil": 84683619,
        "gas": 237822896,
        "boe": 100538479
      },
      {
        "year": 2018,
        "oil": 101492648,
        "gas": 273218380,
        "boe": 119707207
      },
      {
        "year": 2019,
        "oil": 110080841,
        "gas": 287010238,
        "boe": 129214857
      },
      {
        "year": 2020,
        "oil": 107932517,
        "gas": 302345798,
        "boe": 128088904
      },
      {
        "year": 2021,
        "oil": 173846678,
        "gas": 490901937,
        "boe": 206573474
      },
      {
        "year": 2022,
        "oil": 181365027,
        "gas": 591099486,
        "boe": 220771659
      },
      {
        "year": 2023,
        "oil": 188539593,
        "gas": 679347356,
        "boe": 233829417
      },
      {
        "year": 2024,
        "oil": 199389780,
        "gas": 756402546,
        "boe": 249816616
      },
      {
        "year": 2025,
        "oil": 214403548,
        "gas": 786427495,
        "boe": 266832048
      }
    ]
  },
  {
    "slug": "eog-resources-inc",
    "filedName": "EOG RESOURCES, INC.",
    "name": "EOG Resources, Inc",
    "operatorNumber": "253162",
    "boeTotal": 2109092343,
    "leases": 11366,
    "counties": 110,
    "topCounties": [
      "GONZALES",
      "MONTAGUE",
      "KLEBERG"
    ],
    "series": [
      {
        "year": 2016,
        "oil": 98507431,
        "gas": 380321894,
        "boe": 123862224
      },
      {
        "year": 2017,
        "oil": 102514636,
        "gas": 299997796,
        "boe": 122514489
      },
      {
        "year": 2018,
        "oil": 120089298,
        "gas": 347075114,
        "boe": 143227639
      },
      {
        "year": 2019,
        "oil": 131771285,
        "gas": 419822087,
        "boe": 159759424
      },
      {
        "year": 2020,
        "oil": 112717404,
        "gas": 393033585,
        "boe": 138919643
      },
      {
        "year": 2021,
        "oil": 106161181,
        "gas": 396341854,
        "boe": 132583971
      },
      {
        "year": 2022,
        "oil": 98189063,
        "gas": 458491784,
        "boe": 128755182
      },
      {
        "year": 2023,
        "oil": 93489077,
        "gas": 529115986,
        "boe": 128763476
      },
      {
        "year": 2024,
        "oil": 90672297,
        "gas": 507951487,
        "boe": 124535729
      },
      {
        "year": 2025,
        "oil": 86348598,
        "gas": 580290959,
        "boe": 125034662
      }
    ]
  },
  {
    "slug": "xto-energy-inc",
    "filedName": "XTO ENERGY INC.",
    "name": "XTO Energy, Inc",
    "operatorNumber": "945936",
    "boeTotal": 1706939749,
    "leases": 13180,
    "counties": 108,
    "topCounties": [
      "MIDLAND",
      "GAINES",
      "ECTOR"
    ],
    "series": [
      {
        "year": 2016,
        "oil": 33919049,
        "gas": 642238780,
        "boe": 76734968
      },
      {
        "year": 2017,
        "oil": 34212733,
        "gas": 609500150,
        "boe": 74846076
      },
      {
        "year": 2018,
        "oil": 45670394,
        "gas": 595964786,
        "boe": 85401380
      },
      {
        "year": 2019,
        "oil": 69024929,
        "gas": 719844376,
        "boe": 117014554
      },
      {
        "year": 2020,
        "oil": 71490635,
        "gas": 703943573,
        "boe": 118420207
      },
      {
        "year": 2021,
        "oil": 69941117,
        "gas": 751454425,
        "boe": 120038079
      },
      {
        "year": 2022,
        "oil": 74773462,
        "gas": 607074460,
        "boe": 115245093
      },
      {
        "year": 2023,
        "oil": 74796283,
        "gas": 531084636,
        "boe": 110201925
      },
      {
        "year": 2024,
        "oil": 72612571,
        "gas": 408344183,
        "boe": 99835517
      },
      {
        "year": 2025,
        "oil": 66756240,
        "gas": 355443007,
        "boe": 90452440
      }
    ]
  },
  {
    "slug": "occidental-permian-ltd",
    "filedName": "OCCIDENTAL PERMIAN LTD.",
    "name": "Occidental Permian, Ltd",
    "operatorNumber": "617544",
    "boeTotal": 1291678867,
    "leases": 743,
    "counties": 24,
    "topCounties": [
      "YOAKUM",
      "ECTOR",
      "GAINES"
    ],
    "series": [
      {
        "year": 2016,
        "oil": 42766077,
        "gas": 64803209,
        "boe": 47086291
      },
      {
        "year": 2017,
        "oil": 40167085,
        "gas": 64914116,
        "boe": 44494693
      },
      {
        "year": 2018,
        "oil": 38862984,
        "gas": 64063143,
        "boe": 43133860
      },
      {
        "year": 2019,
        "oil": 34404516,
        "gas": 59760036,
        "boe": 38388518
      },
      {
        "year": 2020,
        "oil": 35783085,
        "gas": 54684260,
        "boe": 39428702
      },
      {
        "year": 2021,
        "oil": 34474931,
        "gas": 55246721,
        "boe": 38158046
      },
      {
        "year": 2022,
        "oil": 32223599,
        "gas": 52622793,
        "boe": 35731785
      },
      {
        "year": 2023,
        "oil": 33239636,
        "gas": 58501982,
        "boe": 37139768
      },
      {
        "year": 2024,
        "oil": 33669184,
        "gas": 68827708,
        "boe": 38257698
      },
      {
        "year": 2025,
        "oil": 33602815,
        "gas": 80093322,
        "boe": 38942370
      }
    ]
  },
  {
    "slug": "diamondback-ep-llc",
    "filedName": "DIAMONDBACK E&P LLC",
    "name": "Diamondback E&P, LLC",
    "operatorNumber": "217012",
    "boeTotal": 1188206430,
    "leases": 5589,
    "counties": 22,
    "topCounties": [
      "MARTIN",
      "MIDLAND",
      "ECTOR"
    ],
    "series": [
      {
        "year": 2016,
        "oil": 14598427,
        "gas": 22410889,
        "boe": 16092486
      },
      {
        "year": 2017,
        "oil": 27229893,
        "gas": 40026135,
        "boe": 29898302
      },
      {
        "year": 2018,
        "oil": 40883634,
        "gas": 64157256,
        "boe": 45160784
      },
      {
        "year": 2019,
        "oil": 80850333,
        "gas": 182739785,
        "boe": 93032985
      },
      {
        "year": 2020,
        "oil": 80220039,
        "gas": 229987816,
        "boe": 95552560
      },
      {
        "year": 2021,
        "oil": 88236064,
        "gas": 265362854,
        "boe": 105926921
      },
      {
        "year": 2022,
        "oil": 103541178,
        "gas": 323678281,
        "boe": 125119730
      },
      {
        "year": 2023,
        "oil": 122477733,
        "gas": 366775440,
        "boe": 146929429
      },
      {
        "year": 2024,
        "oil": 127637671,
        "gas": 387028552,
        "boe": 153439574
      },
      {
        "year": 2025,
        "oil": 211262196,
        "gas": 802231045,
        "boe": 264744266
      }
    ]
  },
  {
    "slug": "devon-energy-production-co-lp",
    "filedName": "DEVON ENERGY PRODUCTION CO, L.P.",
    "name": "Devon Energy Production Co, LP",
    "operatorNumber": "216378",
    "boeTotal": 1184992447,
    "leases": 14447,
    "counties": 114,
    "topCounties": [
      "KARNES",
      "WISE",
      "DE WITT"
    ],
    "series": [
      {
        "year": 2016,
        "oil": 44047012,
        "gas": 601048220,
        "boe": 84116893
      },
      {
        "year": 2017,
        "oil": 34503669,
        "gas": 485443607,
        "boe": 66866576
      },
      {
        "year": 2018,
        "oil": 27980163,
        "gas": 386812806,
        "boe": 53767683
      },
      {
        "year": 2019,
        "oil": 22532382,
        "gas": 332145893,
        "boe": 44675442
      },
      {
        "year": 2020,
        "oil": 22021174,
        "gas": 259020923,
        "boe": 39289236
      },
      {
        "year": 2021,
        "oil": 17532427,
        "gas": 79407435,
        "boe": 22826256
      },
      {
        "year": 2022,
        "oil": 19713024,
        "gas": 87434296,
        "boe": 25541977
      },
      {
        "year": 2023,
        "oil": 27686275,
        "gas": 98839347,
        "boe": 34275565
      },
      {
        "year": 2024,
        "oil": 31544857,
        "gas": 115780448,
        "boe": 39263554
      },
      {
        "year": 2025,
        "oil": 27906187,
        "gas": 100370735,
        "boe": 34597569
      }
    ]
  },
  {
    "slug": "chevron-u-s-a-inc",
    "filedName": "CHEVRON U. S. A. INC.",
    "name": "Chevron USA, Inc",
    "operatorNumber": "148113",
    "boeTotal": 1116538489,
    "leases": 5901,
    "counties": 75,
    "topCounties": [
      "MIDLAND",
      "CULBERSON",
      "PANOLA"
    ],
    "series": [
      {
        "year": 2016,
        "oil": 17646152,
        "gas": 74563112,
        "boe": 22617026
      },
      {
        "year": 2017,
        "oil": 18635228,
        "gas": 78479994,
        "boe": 23867228
      },
      {
        "year": 2018,
        "oil": 32187823,
        "gas": 124098429,
        "boe": 40461052
      },
      {
        "year": 2019,
        "oil": 45825673,
        "gas": 163876058,
        "boe": 56750744
      },
      {
        "year": 2020,
        "oil": 52837098,
        "gas": 224200675,
        "boe": 67783810
      },
      {
        "year": 2021,
        "oil": 42191991,
        "gas": 237010561,
        "boe": 57992695
      },
      {
        "year": 2022,
        "oil": 47671029,
        "gas": 248852374,
        "boe": 64261187
      },
      {
        "year": 2023,
        "oil": 46667092,
        "gas": 246971080,
        "boe": 63131831
      },
      {
        "year": 2024,
        "oil": 45560249,
        "gas": 277867495,
        "boe": 64084749
      },
      {
        "year": 2025,
        "oil": 45795574,
        "gas": 303135965,
        "boe": 66004638
      }
    ]
  },
  {
    "slug": "apache-corporation",
    "filedName": "APACHE CORPORATION",
    "name": "Apache Corporation",
    "operatorNumber": "027200",
    "boeTotal": 1010967673,
    "leases": 7976,
    "counties": 123,
    "topCounties": [
      "REAGAN",
      "GLASSCOCK",
      "HOWARD"
    ],
    "series": [
      {
        "year": 2016,
        "oil": 35977114,
        "gas": 161666114,
        "boe": 46754855
      },
      {
        "year": 2017,
        "oil": 33575672,
        "gas": 169547503,
        "boe": 44878839
      },
      {
        "year": 2018,
        "oil": 38623225,
        "gas": 278481974,
        "boe": 57188690
      },
      {
        "year": 2019,
        "oil": 39056997,
        "gas": 340133693,
        "boe": 61732577
      },
      {
        "year": 2020,
        "oil": 32069963,
        "gas": 325021807,
        "boe": 53738083
      },
      {
        "year": 2021,
        "oil": 25493415,
        "gas": 283617601,
        "boe": 44401255
      },
      {
        "year": 2022,
        "oil": 26789024,
        "gas": 270071154,
        "boe": 44793768
      },
      {
        "year": 2023,
        "oil": 30284845,
        "gas": 263098176,
        "boe": 47824723
      },
      {
        "year": 2024,
        "oil": 49210062,
        "gas": 267716962,
        "boe": 67057859
      },
      {
        "year": 2025,
        "oil": 59271733,
        "gas": 335681882,
        "boe": 81650525
      }
    ]
  }
];
