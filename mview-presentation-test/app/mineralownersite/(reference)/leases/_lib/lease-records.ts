import type { LeaseOwnerRecord, LeaseRecord } from "./lease-types";

/**
 * THE TEN LEASES ON RECORD PLATIS SYDNEY KAY.
 *
 * STATIC FIXTURE, TRANSCRIBED FROM THE DESIGN — every value below is the figure
 * the design prints for this owner: the money, the county roll, the decimal
 * interest, the volumes filed to date and the month of the last filing. Nothing
 * is computed here and nothing is rounded here; the display rounding (`$1.36M`,
 * `28.02M`) lives in `lease-format.ts` so the underlying number stays available
 * to sort and sum.
 *
 * WHY THE ORDER IS THIS ORDER: highest MVestimate first, which is the page's
 * default sort ("Production value — high to low"). The array is the default
 * view, so a reader who never touches the sort control sees the design's own
 * row order.
 *
 * WIRING THIS TO THE DATABASE means replacing this module and nothing else —
 * every component reads `LeaseRecord`, not this array.
 */

export const leaseOwnerRecord: LeaseOwnerRecord = {
  name: "Platis Sydney Kay",
};

const HURD = "Hurd Enterprises, Ltd";
const WILCOX = "WILCOX 10400";
const DE_WITT = "DE WITT";

export const leaseRecords: LeaseRecord[] = [
  {
    number: "290271",
    slug: "290271-mccabe-etal-gu",
    name: "MCCABE ETAL GU",
    status: "Producing",
    acres: 629.2,
    firstPosting: "June 2020",
    mvestimate: 1_363_000,
    countyAppraised: 1_844_170,
    county: DE_WITT,
    operator: HURD,
    reservoir: WILCOX,
    wells: 1,
    decimalInterest: 0.05138,
    production: { gasMcf: 6_385_191, oilBbl: 525_277 },
    lastPosted: { month: "June 2026", gasMcf: 77_818 },
  },
  {
    number: "295647",
    slug: "295647-mccabe-etal-gu",
    name: "MCCABE ETAL GU",
    status: "Producing",
    acres: 525.1,
    firstPosting: "July 2023",
    mvestimate: 1_302_000,
    countyAppraised: 1_118_240,
    county: DE_WITT,
    operator: HURD,
    reservoir: WILCOX,
    wells: 1,
    decimalInterest: 0.05138,
    production: { gasMcf: 1_401_024, oilBbl: 201_343 },
    lastPosted: { month: "June 2026", gasMcf: 39_685 },
  },
  {
    number: "290827",
    slug: "290827-mccabe-etal-gu",
    name: "MCCABE ETAL GU",
    status: "Producing",
    acres: 525.1,
    firstPosting: "May 2021",
    mvestimate: 545_200,
    countyAppraised: 750_620,
    county: DE_WITT,
    operator: HURD,
    reservoir: WILCOX,
    wells: 1,
    decimalInterest: 0.05138,
    production: { gasMcf: 3_829_487, oilBbl: 299_796 },
    lastPosted: { month: "June 2026", gasMcf: 38_198 },
  },
  {
    number: "292830",
    slug: "292830-cook-kaiser-gu",
    name: "COOK-KAISER GU",
    status: "Producing",
    acres: 160,
    firstPosting: "March 2022",
    mvestimate: 306_400,
    countyAppraised: 519_830,
    county: DE_WITT,
    operator: HURD,
    reservoir: WILCOX,
    wells: 1,
    decimalInterest: 0.023219,
    production: { gasMcf: 4_087_158, oilBbl: 370_296 },
    lastPosted: { month: "June 2026", gasMcf: 57_795 },
  },
  {
    number: "295750",
    slug: "295750-mccabe-etal-gu",
    name: "MCCABE ETAL GU",
    status: "Producing",
    acres: 525.1,
    firstPosting: "August 2023",
    mvestimate: 306_100,
    countyAppraised: 706_760,
    county: DE_WITT,
    operator: HURD,
    reservoir: WILCOX,
    wells: 1,
    decimalInterest: 0.05138,
    production: { gasMcf: 2_125_033, oilBbl: 134_966 },
    lastPosted: { month: "June 2026", gasMcf: 36_646 },
  },
  {
    number: "294204",
    slug: "294204-mccabe-etal-gu",
    name: "MCCABE ETAL GU",
    status: "Producing",
    acres: 525.1,
    firstPosting: "February 2023",
    mvestimate: 304_300,
    countyAppraised: 605_570,
    county: DE_WITT,
    operator: HURD,
    reservoir: WILCOX,
    wells: 1,
    decimalInterest: 0.05138,
    production: { gasMcf: 2_114_688, oilBbl: 161_090 },
    lastPosted: { month: "June 2026", gasMcf: 31_688 },
  },
  {
    number: "296278",
    slug: "296278-cook-kaiser-gu",
    name: "COOK-KAISER GU",
    status: "Producing",
    acres: 160,
    firstPosting: "December 2023",
    mvestimate: 183_400,
    countyAppraised: 151_180,
    county: DE_WITT,
    operator: HURD,
    reservoir: WILCOX,
    wells: 1,
    decimalInterest: 0.023219,
    production: { gasMcf: 1_418_527, oilBbl: 94_140 },
    lastPosted: { month: "June 2026", gasMcf: 31_034 },
  },
  {
    /* No lease number on the filings for this unit — see `LeaseRecord`. */
    number: null,
    slug: "kaiser-gas-unit",
    name: "KAISER GAS UNIT",
    status: "Producing",
    acres: 100,
    firstPosting: "January 2024",
    mvestimate: 79_300,
    countyAppraised: 178_550,
    county: DE_WITT,
    operator: "Kaler Energy, Corp",
    reservoir: WILCOX,
    wells: 1,
    decimalInterest: 0.038375,
    production: { gasMcf: 675_624, oilBbl: 43_781 },
    lastPosted: { month: "May 2026", gasMcf: 10_108 },
  },
  {
    number: "293026",
    slug: "293026-mccabe-etal-gu",
    name: "MCCABE ETAL GU",
    status: "Producing",
    acres: 525.1,
    firstPosting: "May 2022",
    mvestimate: 37_400,
    countyAppraised: 154_520,
    county: DE_WITT,
    operator: HURD,
    reservoir: WILCOX,
    wells: 1,
    decimalInterest: 0.05138,
    production: { gasMcf: 1_341_241, oilBbl: 109_098 },
    lastPosted: { month: "June 2026", gasMcf: 16_489 },
  },
  {
    number: null,
    slug: "cook-gas-unit",
    name: "COOK GAS UNIT",
    status: "Producing",
    acres: 638.8,
    firstPosting: "April 2009",
    mvestimate: 11_800,
    countyAppraised: 3_680,
    county: DE_WITT,
    operator: "Blackbrush O&G, LLC",
    reservoir: "EDWARDS",
    wells: 1,
    decimalInterest: 0.010748,
    production: { gasMcf: 4_644_413, oilBbl: 180 },
    lastPosted: { month: "June 2026", gasMcf: 5_213 },
  },
];
