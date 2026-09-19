import type {
  WireMonthly,
  WireMonthlyAnalysis,
  WireMonthlyRow,
} from "../_api/leases-api";
import { leaseRouteSlug } from "./lease-routes";
import type {
  MonthlyReport,
  ReportLeaseRow,
  ReportYear,
  ServedMonthly,
} from "./monthly-report";

/**
 * THE TWELVE-PAGE MONTHLY REPORT, AS THE SERVICE ANSWERS IT.
 *
 * ── ONE CALL, TWELVE PAGES, NOTHING RECOMPUTED ──
 *
 * `buildMonthlyReport` derives the same report from the fixture series and a
 * local price deck. This reads it off `GET /leases/monthly`. Both produce one
 * `MonthlyReport`, so the pages are written once — see `lease-report-from-api`
 * for the arrangement and the reason.
 *
 * The rule is the same and it matters more here than anywhere else in the
 * module: the whole point of one call serving twelve pages is that page 5's
 * column total IS page 2's headline. Re-summing the rows to get the header
 * would give two figures that agree to the dollar until one lease stops filing.
 *
 * ── THE ONE JOIN ──
 *
 * `rows[]` is the month — what each lease paid, 14 fields, already ordered by
 * what it paid. `lease_analysis[]` is the lease's own shape and its trailing
 * twelve filed months, 19 fields. One row per lease in each, joined on
 * `lease_id`. On a 782-lease record the two are 94% of the payload.
 *
 * ── `null` IS NOT `0` ──
 *
 * `change_pct` is null where either month is absent: a lease that has not filed
 * has not fallen 100%, and the column draws a dash. `vs_year_ago_pct` is null
 * where the model carries nothing twelve months back — a record that young has
 * no year to compare against, which is not a year that paid nothing. Both stay
 * null all the way to the view rather than being floored here.
 *
 * ── BOTH BASES TRAVEL TOGETHER ──
 *
 * `*_gross` is the whole lease and `*_share` is at the owner's own decimal.
 * They are read off the same row and neither is ever derived from the other by
 * multiplying — the interest varies per lease and the service has already
 * applied it.
 */

function num(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function text(value: string | null | undefined): string {
  return typeof value === "string" ? value : "";
}

/** `null` and `undefined` both mean "not computable" and stay that way. */
function maybe(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** `"15.64276 (1564.276%)"` → `15.64276`. */
function parseInterest(label: string | undefined): number {
  const first = /-?\d+(\.\d+)?/.exec(label ?? "");
  return first ? Number(first[0]) : 0;
}

/** Days in the report's own month, so a per-day rate is that month's rate. */
function daysIn(cycle: string): number {
  const year = Number(cycle.slice(0, 4));
  const month = Number(cycle.slice(4, 6));
  return year > 0 && month > 0 ? new Date(year, month, 0).getDate() : 30;
}

/**
 * One lease, from both arrays.
 *
 * `reservoir` IS A STRING ON `rows[]` AND AN ARRAY ON `lease_analysis[]` — the
 * same fact in two shapes across one join. The row's string is taken because
 * that is what the side-by-side column prints; the array is what page 4 lists.
 */
function rowFrom(
  row: WireMonthlyRow,
  analysis: WireMonthlyAnalysis | undefined,
  cycle: string,
): ReportLeaseRow {
  const year = analysis?.year ?? {};
  const label = text(row.label) || text(analysis?.label);
  const days = daysIn(cycle);
  const monthGas = num(row.gas_share);

  /* The month against the lease's own trailing average, which is what the cash
     flow page reads it against. The average is a RATE and the month is a
     TOTAL, so the month is put on the same footing before they are compared —
     dividing a month's gas by the days in that month, not in an average one. */
  const avgGasPerDay = num(year.gas_avg_d);
  const monthGasPerDay = days > 0 ? num(row.gas_gross) / days : 0;
  const vsAveragePercent =
    avgGasPerDay > 0 ? (monthGasPerDay / avgGasPerDay - 1) * 100 : 0;

  const gas = monthGas;
  const oil = num(row.oil_share);

  return {
    slug: leaseRouteSlug(row.lease_id, null, label),
    title: label,
    county: text(row.county) || text(analysis?.county),
    operator: text(row.operator_name) || text(analysis?.operator_name),
    reservoir: text(row.reservoir) || text(analysis?.reservoirs?.[0]),
    acres: num(analysis?.acres),
    wells: num(row.wells ?? analysis?.wells),
    /* NOT ON THIS PAYLOAD — the monthly report is about one month, and when a
       lease first produced belongs to the lease report. Empty rather than a
       date invented to fill the field. */
    firstPosting: "",
    decimalInterest: parseInterest(row.interest_label),

    filed: row.reported !== false,
    wholeGas: num(row.gas_gross),
    yourGas: gas,
    yourOil: oil,
    yourShare: num(row.cash_share),
    leaseRevenue: num(analysis?.lease_cash),
    /* Null all the way through: a lease that has not filed has not fallen. */
    changePercent: maybe(row.change_pct),

    gasPerDay: num(analysis?.month_gas_d),
    oilPerDay: num(analysis?.month_oil_d),

    trailing: {
      avgGasPerDay,
      avgOilPerDay: num(year.oil_avg_d),
      lowGasPerDay: num(year.gas_lo_d),
      highGasPerDay: num(year.gas_hi_d),
      bestMonth: text(year.peak_label),
      worstMonth: text(year.trough_label),
      bestCashMonth: text(year.rev_hi_label),
      bestCash: num(year.rev_hi),
      thinCashMonth: text(year.rev_lo_label),
      thinCash: num(year.rev_lo),
      vsAveragePercent,
    },

    /* Barrels per thousand MCF — which product carries the money. Zero gas has
       no ratio rather than an infinite one. */
    barrelsPerMmcf: gas > 0 ? (oil / gas) * 1000 : 0,
    /* NOT SENT BY THIS ENDPOINT. The lease report answers the model comparison
       per lease; the monthly report does not carry one, and a zero here is read
       as "no miss" by the cash-flow page — see the note there. */
    modelMissPercent: 0,
    operatorRange: text(analysis?.past_operators?.[0]),
    /* THE SERVICE'S OWN WORDS about the wells, printed rather than recomposed.
       "4 wells, 4 drilled sideways" says something the well COUNT does not, and
       nothing on this payload would let the page work it out. */
    wellNote: text(analysis?.well_note),
    completionSpan: text(analysis?.completion_span),
    pastOperators: Array.isArray(analysis?.past_operators)
      ? analysis.past_operators
      : [],
  };
}

function servedFrom(wire: WireMonthly): ServedMonthly {
  const outlook = wire.outlook ?? {};
  const development = wire.development ?? {};

  return {
    owner: text(wire.owner),
    builtAt: text(wire.built_at),
    cycle: text(wire.cycle),
    filed: wire.filed !== false,

    months: (wire.available ?? []).map((month) => ({
      cycle: text(month.cycle),
      label: text(month.label),
      filed: month.filed !== false,
    })),

    pages: (wire.pages ?? []).map((page) => ({
      no: num(page.no),
      title: text(page.title),
      lead: text(page.lead),
    })),

    summary: (wire.summary ?? []).map((block) => ({
      heading: text(block.heading),
      bullets: Array.isArray(block.bullets) ? block.bullets : [],
    })),

    stats: (wire.stats ?? []).map((stat) => ({
      label: text(stat.label),
      value: text(stat.value),
      sub: text(stat.sub),
      tone: stat.tone,
    })),
    insights: Array.isArray(wire.insights) ? wire.insights : [],
    note: text(wire.note),

    revenue: (wire.revenue ?? []).map((month) => ({
      cycle: text(month.cycle),
      label: text(month.label),
      gasCash: num(month.gas_cash),
      oilCash: num(month.oil_cash),
      /* THE DIVIDER IS THIS FLAG AND NOTHING ELSE. It used to be OR'd across
         every lease upstream, so one modelled row in a past month flagged the
         whole month projected and a 782-lease record came back with no solid
         section at all. It is now the forecast boundary itself. */
      forecast: month.forecast === true,
    })),
    revenueNote: text(wire.revenue_note),

    outlook: {
      fromMonth: text(outlook.from_label),
      toMonth: text(outlook.to_label),
      gasPerDayStart: num(outlook.gas_start_d),
      gasPerDayEnd: num(outlook.gas_end_d),
      gasChangePercent: num(outlook.gas_change_pct),
      oilPerDayStart: num(outlook.oil_start_d),
      oilPerDayEnd: num(outlook.oil_end_d),
      oilChangePercent: num(outlook.oil_change_pct),
      shareStart: num(outlook.cash_start),
      shareEnd: num(outlook.cash_end),
      shareChangePercent: num(outlook.cash_change_pct),
      oilRevenuePercent: num(outlook.oil_share_pct),
      gasRevenuePercent: num(outlook.gas_share_pct),
      bullets: Array.isArray(outlook.bullets) ? outlook.bullets : [],
      note: text(outlook.note),
    },

    development: {
      probability: num(development.probability),
      probabilityLabel: text(development.probability_label),
      verdict: text(development.verdict),
      rings: (development.rings ?? []).map((ring) => ({
        ring: `${num(ring.radius_mi)} mile${num(ring.radius_mi) === 1 ? "" : "s"}`,
        permits: num(ring.permits),
        /* THE COLUMN IS "LEASES" AND THE FIELD IS `neighbours`. The names
           differ and the join is by position in the row, not by name — writing
           it down here is the only place that mismatch is visible. */
        leases: num(ring.neighbours),
        operators: num(ring.operators),
        producing: num(ring.producing),
      })),
      bullets: Array.isArray(development.bullets) ? development.bullets : [],
      note: text(development.note),
    },

    operators: (wire.operators ?? []).map((operator) => ({
      name: text(operator.name),
      number: operator.number == null ? "" : String(operator.number),
      leases: num(operator.leases),
      leaseNames: Array.isArray(operator.lease_names)
        ? operator.lease_names
        : [],
      counties: Array.isArray(operator.counties) ? operator.counties : [],
      tenureLabel: text(operator.tenure_label),
      cumGas: num(operator.cum_gas),
      cumOil: num(operator.cum_oil),
      ownerValue: num(operator.owner_value),
      sharePercent: num(operator.share_pct),
      overview: text(operator.overview),
      insight: text(operator.insight),
      monthGas: num(operator.month_gas),
      monthOil: num(operator.month_oil),
      wells: num(operator.wells),
    })),

    commodities: (wire.commodities ?? []).map((price) => ({
      label: text(price.label),
      unit: text(price.unit),
      /* PRE-FORMATTED AND RENDERED AS SENT. Gas quotes to a tenth of a cent and
         propane to three decimals; re-rounding either to two turns a real move
         into no move. */
      display: text(price.display),
      changePercent: num(price.change_pct),
      stamp: text(price.as_of),
      note: text(price.desc),
      means: text(price.means),
    })),
    commodityNote: text(wire.commodity_note),

    news: (wire.news ?? []).map((item) => ({
      operator: text(item.operator),
      title: text(item.title),
      summary: text(item.body),
      date: text(item.when),
      /* `false` earns the "not one of yours" badge — an operator in the same
         rock the reader does not hold. */
      mine: item.mine !== false,
    })),
    newsNote: text(wire.news_note),

    method: (wire.method ?? []).map((step) => ({
      no: num(step.no),
      title: text(step.title),
      text: text(step.text),
    })),
    disclaimer: Array.isArray(wire.disclaimer) ? wire.disclaimer : [],
  };
}

export function monthlyReportFromApi(wire: WireMonthly): MonthlyReport {
  const totals = wire.totals ?? {};
  const cycle = text(wire.cycle);

  /* The join. `rows[]` leads because it is already ordered by what each lease
     paid, which is the order every per-lease page wants. */
  const byId = new Map(
    (wire.lease_analysis ?? []).map((entry) => [entry.lease_id, entry]),
  );
  const leases = (wire.rows ?? []).map((row) =>
    rowFrom(row, byId.get(row.lease_id), cycle),
  );

  /* The steepest mover either way, over leases that actually filed — a lease
     with no month has not moved, and `change_pct` is null for it. */
  const moved = leases.filter((lease) => lease.changePercent !== null);
  const byChange = [...moved].sort(
    (a, b) => (a.changePercent ?? 0) - (b.changePercent ?? 0),
  );

  const years: ReportYear[] = (wire.years ?? []).map((year) => ({
    year: Number(year.year) || 0,
    gas: num(year.gas_share),
    oil: num(year.oil_share),
    share: num(year.cash_share),
    /* THE BOUNDARY YEAR IS THE ONE STILL BEING FILED, and it is counted across
       the portfolio rather than per lease — twelve leases filing January is one
       filed month of the year. Marking it is what stops "2026 pays less than
       2027" reading as the curve rather than as the boundary. */
    partial: num(year.filed_months) < num(year.months),
  }));

  const top = wire.top_lease ?? {};

  return {
    /* WHERE THIS MONTH SITS IN THE PICKER'S OWN LIST.
       The select is driven by position — `value={report.index}` — so a report
       that always reported 0 always highlighted the FIRST option. Switching to
       October 2025 fetched October and drew October, and left the dropdown
       reading "June 2026": the newest month, because that is `available[0]`.

       `available[]` and `cycle` both come off this payload, so the position is
       the one the service itself puts this month at. -1 — a month not in its
       own list — falls back to the first rather than unsetting the select. */
    index: Math.max(
      (wire.available ?? []).findIndex((month) => month.cycle === cycle),
      0,
    ),
    month: text(wire.label),
    priorMonth: text(wire.prev_label),
    yearAgoMonth: text(wire.year_ago_label),

    leaseCount: num(totals.leases),
    filedCount: num(totals.reporting),

    yourShare: num(totals.cash_share),
    yourGas: num(totals.gas_share),
    yourOil: num(totals.oil_share),
    wholeGas: num(totals.gas_gross),

    vsYearAgoPercent: maybe(wire.vs_year_ago_pct),
    topLease: {
      title: text(top.label),
      gasPercent: num(top.gas_pct),
      sharePercent: num(top.share_pct),
    },
    steepestFall: byChange[0] ?? null,
    steepestRise: byChange[byChange.length - 1] ?? null,

    leases,
    years,

    served: servedFrom(wire),
  };
}
