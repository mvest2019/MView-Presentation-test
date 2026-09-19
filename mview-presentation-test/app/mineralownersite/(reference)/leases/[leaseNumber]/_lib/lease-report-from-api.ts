import type { WireLeaseReport } from "../../_api/leases-api";
import { leaseRouteSlug } from "../../_lib/lease-routes";
import type { LeaseRecord } from "../../_lib/lease-types";
import type { LeaseReport, LeaseStep, MonthCell } from "./lease-report";

/**
 * THE LEASE REPORT, AS THE SERVICE ANSWERS IT.
 *
 * ── WHY THIS SITS BESIDE `buildLeaseReport` RATHER THAN REPLACING IT ──
 *
 * The same reason `financials-rows.ts` sits beside `monthly-rows.ts`. That
 * builder derives eighty-odd figures from ten fixture leases and a local price
 * deck; this one reads them off a document the service assembled. They produce
 * the SAME `LeaseReport`, so every card on the page is written once and neither
 * source gets its own layout. The fixture path is what an unclaimed visitor
 * reads — see the sample twin in `page.tsx` — so it is not dead code waiting to
 * be deleted.
 *
 * ── NOTHING IS RECOMPUTED THAT THE SERVICE ALREADY DECIDED ──
 *
 * The rule here is transcription, not arithmetic. `owner_value_low`, the
 * twelve months ahead, the per-acre figure, the decline rate and the ranking
 * all arrive already worked out, and re-deriving any of them in the browser
 * would give the page two answers to one question that differ in the third
 * decimal — the failure that made the financials chart and its own table
 * disagree by a month. Three things are computed here and each is a ratio
 * between two figures on this same payload: the county's agreement, the
 * produced-versus-remaining split, and the gas half of the revenue mix.
 *
 * ── EVERY FIELD IS OPTIONAL UPSTREAM, SO EVERY READ HAS A FLOOR ──
 *
 * The payload is assembled from several records and any of them can be thin for
 * a given lease: `ratios.season` comes back empty on an oil lease, `vs_model`
 * is empty when the model holds no expectation for the last filed month, and
 * `decline_pct` and `yield_bbl_per_mmcf` are null on a lease with no gas. A
 * missing figure becomes zero or an empty string here rather than `undefined`,
 * because `LeaseReport` is what eight cards destructure and one `undefined`
 * reaching a `.toFixed()` is a blank page.
 *
 * WHERE THAT WOULD PRINT A FALSEHOOD IT IS SAID INSTEAD. An absent `vs_model`
 * is not a zero miss — it is no expectation on file — so `modelNote` carries
 * the service's own sentence and the card prints that in place of "+0.0%
 * against what the model wanted". See `measures-card.tsx`.
 */

/** The twelve initials the seasonality strip is drawn on. */
const MONTH_INITIALS = [
  "J",
  "F",
  "M",
  "A",
  "M",
  "J",
  "J",
  "A",
  "S",
  "O",
  "N",
  "D",
];

function num(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function text(value: string | null | undefined): string {
  return typeof value === "string" ? value : "";
}

/** `"15.64276 (1564.276%)"` → `15.64276`, the same rule the list read uses. */
function parseInterest(label: string | undefined): number {
  const first = /-?\d+(\.\d+)?/.exec(label ?? "");
  return first ? Number(first[0]) : 0;
}

/**
 * The lease itself, in the shape the rest of the module already speaks.
 *
 * THE SLUG IS `leaseRouteSlug`, THE SAME BUILDER EVERY OTHER LIST USES. It was
 * `leaseSlug`, which appends the kebab-cased name — so this lease called itself
 * `02_269507-betty-kennedy-unit-a` while the ranking bars and the table called
 * it `02_269507`. Nothing errored; the page simply never recognised itself. The
 * bar for the lease being read is drawn dark and the others grey, and with the
 * two spellings apart NO bar ever matched, so the whole chart came out grey and
 * the reader could not see which one was theirs. `lease_name` and not `label`: the label
 * carries a disambiguating `(08_46924)` on some leases and not others, and a
 * heading should not read differently depending on whether the service felt the
 * need.
 */
function recordFrom(wire: NonNullable<WireLeaseReport["lease"]>): LeaseRecord {
  const name = text(wire.lease_name) || text(wire.label);
  const number = wire.lease_number ? String(wire.lease_number) : null;

  return {
    id: wire.lease_id,
    number,
    slug: leaseRouteSlug(wire.lease_id, number, name),
    name,
    status: text(wire.lease_status),
    acres: num(wire.acres),
    firstPosting: text(wire.first_prod_label),
    mvestimate: num(wire.owner_value),
    countyAppraised: num(wire.appraised_value),
    county: text(wire.county),
    operator: text(wire.operator_name),
    reservoir: text(wire.reservoirs?.[0]?.name),
    wells: num(wire.well_count),
    producingWells: wire.producing_wells,
    /* `interest` when the service sends the decimal outright, and the label
       parsed only as a fallback — the label is a display string and the decimal
       beside it is the number. */
    decimalInterest: wire.interest ?? parseInterest(wire.interest_label),
    types: Array.isArray(wire.well_types) ? wire.well_types : [],
    production: {
      gasMcf: num(wire.gas_to_date),
      oilBbl: num(wire.oil_to_date),
    },
    lastPosted: {
      month: text(wire.last_posted_label),
      gasMcf: num(wire.last_posted_gas),
    },
  };
}

/**
 * ONE BAR PER LEASE ON THE RECORD, biggest first — what the ranking card draws.
 *
 * THESE ARE THE BIGGEST FEW, NOT ALL OF THEM. The card was written against a
 * ten-lease fixture and draws a bar for every entry it is handed; this record
 * holds 782, and 782 hairlines is not a chart. The card's own sentences are
 * unaffected because they count with `total` and `recordTotal`, which are the
 * whole record either way — only the bars are the top of it.
 */
export interface RecordBar {
  slug: string;
  label: string;
  value: number;
}

export function leaseReportFromApi(
  wire: WireLeaseReport,
  recordBars: RecordBar[],
  neighbours?: { previous: LeaseStep; next: LeaseStep },
): LeaseReport {
  const source = wire.lease ?? {};
  const lease = recordFrom(source);

  const year = source.year ?? {};
  const ratios = source.ratios ?? {};
  const standing = source.standing ?? {};
  const priceTest = source.price_test ?? {};

  const yourValue = num(source.owner_value);
  const countyYourInterest = num(source.appraised_value);

  /* ── the twelve months ahead ─────────────────────────────────────────── */
  const forward: MonthCell[] = (source.ahead ?? []).map((month) => ({
    label: text(month.label),
    gas: num(month.gas),
    oil: num(month.oil),
    /* THE BAND IS THE SERVICE'S OWN, not this figure widened by a local
       constant. `RANGE_SPREAD` is the fixture's stand-in for a spread nobody
       had measured; `low` and `high` are the model's. */
    shareLow: num(month.low),
    shareHigh: num(month.high),
  }));

  /* `at_deck` is the service's total for the same twelve months, so it is taken
     rather than re-summed — the two agree, and only one of them can be wrong. */
  const forwardTotal =
    typeof priceTest.at_deck === "number"
      ? priceTest.at_deck
      : forward.reduce((total, cell) => total + cell.shareLow, 0);

  /* ── the cumulative curve ────────────────────────────────────────────── */
  const cumulative = source.cumulative ?? [];
  const cumulativeGas = cumulative.map((point) =>
    point.forecast ? num(point.proj_gas) : num(point.filed_gas),
  );
  /* The last point still on the filed record. `-1` when every point is a
     forecast, which the card reads as "nothing filed yet" rather than as the
     first point. */
  let cumulativeFiledIndex = -1;
  cumulative.forEach((point, index) => {
    if (!point.forecast) cumulativeFiledIndex = index;
  });

  /* ── produced against still to come ──────────────────────────────────── */
  const gasProduced = num(source.gas_to_date_share);
  const gasReserves = num(source.reserves_gas_share);
  const oilProduced = num(source.oil_to_date_share);
  const oilReserves = num(source.reserves_oil_share);

  /* ── the month the lease last filed ──────────────────────────────────── */
  const months = source.months ?? [];
  /* `seam` is the count of posted months, so the last of them is one before it.
     This is the same off-by-one the financials chart and its table disagreed
     over: the label is authoritative where there is one, and the seam is the
     fallback. */
  const fromLabel = months.findIndex(
    (month) => text(month.label) === text(source.last_posted_label),
  );
  const fromSeam =
    typeof source.seam === "number" && source.seam > 0 ? source.seam - 1 : -1;
  const lastPostedIndex = fromLabel >= 0 ? fromLabel : fromSeam;
  const lastMonthShare =
    lastPostedIndex >= 0 ? num(months[lastPostedIndex]?.cash_share) : 0;

  /* ── how the last filing measured against the model ──────────────────── */
  const vsModel = source.vs_model?.[0];

  /* ── which calendar months pay ───────────────────────────────────────── */
  const season = ratios.season ?? [];
  const seasonality =
    season.length > 0
      ? season.map((entry, index) => ({
          month: text(entry.month) || MONTH_INITIALS[index % 12],
          percent: num(entry.pct ?? entry.percent),
        }))
      : /* EMPTY IS THE ANSWER ON AN OIL LEASE, and a flat strip is what that
           looks like. Twelve zeroes rather than an empty array, because the
           chart draws a fixed twelve columns and would otherwise collapse. */
        MONTH_INITIALS.map((month) => ({ month, percent: 0 }));

  const recordTotal =
    typeof standing.share_value_pct === "number" && standing.share_value_pct > 0
      ? /* The record's whole value, from this lease's share of it. Exact to the
           penny against the picker's own `record_value`, and it costs no second
           read. */
        yourValue / (standing.share_value_pct / 100)
      : recordBars.reduce((total, bar) => total + bar.value, 0);

  const oilSharePercent = num(ratios.oil_share_pct);

  return {
    lease,
    position: num(standing.rank_value),
    total: num(standing.of),
    firstPosting: text(source.first_prod_label),
    lastPosting: text(source.last_posted_label),
    postedMonths: num(source.months_posted),

    yourValue,
    yourValueLow: num(source.owner_value_low),
    yourValueHigh: num(source.owner_value_high),
    grossValuation: num(source.gross_value),
    countyYourInterest,
    countyAgreementPercent:
      yourValue > 0 ? (countyYourInterest / yourValue) * 100 : 0,
    nextMonthLabel: text(source.next_month_label),
    nextMonthLow: num(source.next_month_low),
    nextMonthHigh: num(source.next_month_high),
    nextQuarterLow: num(source.quarter_low),
    nextQuarterHigh: num(source.quarter_high),

    lastMonthShare,
    lastMonthLabel: text(source.last_posted_label),
    yearToDateShare: num(year.cash_total),
    gasFiled: gasProduced,
    oilFiled: oilProduced,

    cumulativeGas,
    cumulativeFiledIndex,
    cumulativeLabels: cumulative.map((point) => text(point.short)),
    gasProduced,
    gasReserves,
    oilProduced,
    oilReserves,
    gasProducedPercent:
      gasProduced + gasReserves > 0
        ? (gasProduced / (gasProduced + gasReserves)) * 100
        : 0,
    oilProducedPercent:
      oilProduced + oilReserves > 0
        ? (oilProduced / (oilProduced + oilReserves)) * 100
        : 0,

    trailingFrom: text(year.from_label),
    trailingTo: text(year.to_label),
    gasPerDayLow: num(year.gas_lo_d),
    gasPerDayHigh: num(year.gas_hi_d),
    gasPerDayAvg: num(year.gas_avg_d),
    oilPerDayLow: num(year.oil_lo_d),
    oilPerDayHigh: num(year.oil_hi_d),
    oilPerDayAvg: num(year.oil_avg_d),
    strongestMonth: text(year.peak_label),
    thinnestMonth: text(year.trough_label),
    bestMonthForYou: text(year.rev_hi_label),
    bestMonthShare: num(year.rev_hi),
    thinnestMonthForYou: text(year.rev_lo_label),
    thinnestMonthShare: num(year.rev_lo),
    declinePerMonth: num(year.decline_pct),
    oilYield: num(year.yield_bbl_per_mmcf),
    trailingGas: num(year.gas_total),
    trailingOil: num(year.oil_total),
    trailingShare: num(year.cash_total),
    seasonality,

    forward,
    forwardTotal,
    forwardLowDeck: num(priceTest.down20),
    forwardHighDeck: num(priceTest.up20),

    rankByValue: num(standing.rank_value),
    rankLastMonth: num(standing.rank_month),
    rankGasEver: num(standing.rank_gas),
    shareOfRecordValue: num(standing.share_value_pct),
    shareOfRecordLastMonth: num(standing.share_month_pct),
    shareOfRecordGasEver: num(standing.share_gas_pct),
    recordBars,
    recordTotal,
    neighbours,

    modelWanted: num(vsModel?.expected),
    statePosted: num(vsModel?.posted),
    /* THE ONE FIGURE IN THIS BLOCK THE SERVICE DOES NOT SEND. It was read from
       a `miss_pct` that does not exist on the payload — an invented field name
       resolves to `undefined`, floors to 0, and the card then printed "+0.0%
       against what the model wanted" under two bars of visibly different
       lengths. On this lease the state posted 67,195 against an expected
       69,866: the filing came in 3.8% BELOW the model, and the page said it
       landed exactly on it.

       A ratio of two figures on this same payload, which is the one kind of
       arithmetic this file does. Zero expected has no percentage rather than an
       infinite one. */
    modelMissPercent:
      num(vsModel?.expected) > 0
        ? (num(vsModel?.posted) / num(vsModel?.expected) - 1) * 100
        : 0,
    /* Present ONLY when there is nothing to compare — the card branches on it,
       and a note beside a real comparison would be two explanations of one
       row. */
    modelNote: vsModel ? undefined : text(source.vs_model_note),

    valuePerAcre: num(ratios.per_acre_share),
    realisedGas: num(ratios.realised_gas),
    realisedOil: num(ratios.realised_oil),
    halfMadeBy: text(ratios.half_label),
    halfMadeInMonths: num(ratios.half_months),
    acresPerWell: num(ratios.acres_per_well),
    stateBehindMonths: num(ratios.lag_months),
    /* The service sends the oil half; the two are a split of one revenue, so
       the gas half is the remainder rather than a second read. */
    projectedGasPercent: oilSharePercent > 0 ? 100 - oilSharePercent : 0,
    projectedOilPercent: oilSharePercent,

    series: {
      labels: months.map((month) => text(month.short) || text(month.label)),
      share: {
        gas: months.map((month) => num(month.gas_share)),
        oil: months.map((month) => num(month.oil_share)),
        cash: months.map((month) => num(month.cash_share)),
      },
      gross: {
        gas: months.map((month) => num(month.gas_net)),
        oil: months.map((month) => num(month.oil_net)),
        cash: months.map((month) => num(month.cash_gross)),
      },
      lastPostedIndex,
    },
  };
}
