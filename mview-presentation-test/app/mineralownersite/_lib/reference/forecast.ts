/**
 * PRODUCTION & FORECAST'S TYPES — the reference's own declarations.
 *
 * `ProductionView.tsx` and `ForecastChart.tsx` import `ForecastLease`,
 * `ForecastMonth` and `ForecastStat` from `@/lib/forecast`, so this module
 * stands in for that import. Every declaration below is copied verbatim out of
 * `src/lib/forecast.ts` in the reference build, comments included.
 *
 * What is NOT copied is the 1,000 lines of BUILDER beneath them. The reference
 * assembles this payload on its server from five Mongo sources — the value
 * model's monthly cash-flow rows, the state's monthly production filings, its
 * disposition filing, the decline model and the well roster — and the
 * assembled object is what this build carries in its fixture. Types are the
 * contract; the builder is the thing a backend will eventually be.
 *
 * So when the fixture is replaced by a real API, these types are what it must
 * satisfy, and nothing in either component has to change.
 */
import type { ChartSpec } from './chart';

export interface Boundary {
  /** the newest month the state has posted, across every lease */
  history_end: string | null;
  history_end_label: string | null;
  /** the first month the model projects */
  forecast_start: string | null;
  forecast_start_label: string | null;
  forecast_end: string | null;
  forecast_end_label: string | null;
  /** the month the reader is standing in */
  this_month: string;
  this_month_label: string | null;
  /** whole months between the newest posted month and this one — measured */
  lag_months: number | null;
  /** did that land inside the posting lag the state works to */
  lag_expected: boolean;
  /** how many of the leases put the boundary in the same place */
  leases_agreeing: number;
  lease_count: number;
  /** months of projection ahead of the boundary */
  forecast_months: number;
  /** the months already produced that nobody can see yet */
  blind_months: string[];
  blind_labels: string[];
  blind_note: string;
  note: string;
}

export interface ForecastMonth {
  cycle: string;
  label: string | null;
  short: string | null;
  forecast: boolean;
  /** the whole lease month, as posted */
  gas_gross: number;
  /** less the volume removed before the sales meter */
  gas_net: number;
  oil_gross: number;
  oil_net: number;
  /** the owner's part, after each lease's own decimal interest */
  gas_share: number;
  oil_share: number;
  /** the model's money for the month, owner share, and its band */
  value_share: number;
  value_share_low: number;
  value_share_high: number;
  /**
   * THAT MONEY SPLIT BY PRODUCT, which is not the volume split.
   *
   * Measured: `gas_cashflow + oil_cashflow` equals `total_cashflow` exactly on
   * every row, so these two always add to `value_share` and no scaling is
   * needed to make the parts agree with the whole.
   */
  gas_value_share: number;
  oil_value_share: number;
  /** the price deck the row was run on */
  gas_price: number;
  oil_price: number;
  /** the state's own disposition deduction — filed months only */
  removed: number | null;
  removed_pct: number | null;
  /** how many leases contributed a posted month here */
  leases_posted: number;
}

export interface ForecastLease {
  lease_id: string;
  label: string;
  lease_name: string | null;
  lease_number: string | null;
  county: string | null;
  operator_name: string | null;
  field_name: string | null;
  interest: number;
  interest_label: string | null;
  acres: number | null;
  well_count: number;
  status: string | null;
  active: boolean;

  first_posting: string | null;
  first_posting_label: string | null;
  history_end: string | null;
  history_end_label: string | null;
  forecast_start: string | null;
  forecast_start_label: string | null;
  months_posted: number;

  /* produced to date — lifetime, from the state's postings */
  gas_to_date: number;
  oil_to_date: number;
  gas_to_date_share: number;
  oil_to_date_share: number;

  /* the last month posted */
  last_gas: number;
  last_gas_net: number;
  last_oil: number;
  last_gas_share: number;
  last_oil_share: number;

  /* the first projected month — the decline-anchored current rate */
  rate_gas: number | null;
  rate_gas_net: number | null;
  rate_oil: number | null;
  rate_gas_share: number | null;
  rate_oil_share: number | null;

  /** compounded month over month across the projection, per cent per month */
  decline_gas_pct: number | null;
  decline_oil_pct: number | null;

  /* the next twelve projected months */
  year_gas: number | null;
  year_oil: number | null;
  year_gas_share: number | null;
  year_oil_share: number | null;
  year_value_share: number | null;

  /* the whole projection */
  reserves_gas: number | null;
  reserves_oil: number | null;
  reserves_gas_share: number | null;
  reserves_oil_share: number | null;

  /* produced plus remaining */
  eur_gas: number | null;
  eur_oil: number | null;
  /** the independent decline model's own figures, where it carries them */
  reserves_gas_model: number | null;
  eur_gas_model: number | null;
  eur_oil_model: number | null;

  /* money, owner share */
  next_month_low: number | null;
  next_month_high: number | null;
  next_month_mid: number | null;
  quarter_low: number | null;
  quarter_high: number | null;
  quarter_mid: number | null;
  six_year: number;

  /* the disposition split for this lease */
  route_code: string | null;
  route_share: number | null;
  removed_pct: number | null;
  removed_total: number | null;

  /** the aligned series for this lease alone — what the chart draws */
  months: ForecastMonth[];
  /** index of the first projected month in `months`, -1 when there is none */
  seam: number;
  /**
   * How far through this lease's whole life the record already is, by gas.
   *
   * Produced to date over produced-plus-remaining. It is the one figure that
   * says whether a lease is early or late, and no volume anywhere else on the
   * page carries it.
   */
  pct_produced: number | null;
  /** how far the projection's first month sits from the last posted one */
  step_pct: number | null;
  note: string | null;
}

export interface ForecastStat {
  label: string;
  value: string;
  sub: string | null;
  tone?: 'up' | 'down' | 'warn';
  /**
   * The explainer panel that goes into this figure in depth.
   *
   * A key in `Payload.drawers`, so the panel is the same one every other
   * surface opens rather than a second mechanism. A figure with no key is
   * rendered as a plain card and not as something clickable — a card that
   * looks pressable and does nothing is worse than one that does not.
   */
  key?: string;
}

export interface ForecastRoute {
  code: string;
  volume: number;
  share: number;
  leases: number;
  removed: number;
  removed_pct: number | null;
}

export interface ForecastTotals {
  lease_count: number;
  active_count: number;
  counties: number;
  operators: number;
  gas_to_date: number;
  oil_to_date: number;
  gas_to_date_share: number;
  oil_to_date_share: number;
  last_gas: number;
  last_oil: number;
  rate_gas: number;
  rate_oil: number;
  year_gas: number;
  year_oil: number;
  year_gas_share: number;
  year_oil_share: number;
  reserves_gas: number;
  reserves_oil: number;
  reserves_gas_share: number;
  reserves_oil_share: number;
  eur_gas: number;
  eur_oil: number;
  next_month_low: number;
  next_month_high: number;
  next_month_mid: number;
  quarter_low: number;
  quarter_high: number;
  quarter_mid: number;
  six_year: number;
  decline_gas_pct: number | null;
  reserve_life_years: number | null;
}

export interface ForecastYear {
  year: string;
  gas_value_share: number;
  oil_value_share: number;
  value_share: number;
  gas_vol: number;
  oil_vol: number;
  /** false for a year that is only partly projected — the current one */
  whole: boolean;
  months: number;
}

export interface Depletion {
  gas_produced: number;
  gas_remaining: number;
  gas_eur: number;
  gas_pct: number | null;
  oil_produced: number;
  oil_remaining: number;
  oil_eur: number;
  oil_pct: number | null;
  /** the month by which half of everything still to come has been produced */
  half_by: string | null;
  half_by_label: string | null;
  half_by_months: number | null;
  note: string;
}

export interface ForecastPayload {
  boundary: Boundary;
  /** the portfolio series, both halves, aligned */
  months: ForecastMonth[];
  /** index in `months` of the first projected month, -1 if there is none */
  seam: number;
  leases: ForecastLease[];
  totals: ForecastTotals;
  /** the three estimate cards at the top */
  cards: { key: string; label: string; value: string; sub: string; est: boolean }[];
  /** gross to removed to net, over the whole filed record */
  disposition: {
    available: boolean;
    accounted: number;
    removed: number;
    net: number;
    removed_pct: number | null;
    oil_sold: number;
    oil_total: number;
    /** the routes this record uses, largest first */
    routes: ForecastRoute[];
    /** the forward shrinkage the model applies, measured off the projection */
    forward_pct: number | null;
    months: { cycle: string; label: string | null; accounted: number;
              removed: number; removed_pct: number | null }[];
    note: string;
    why: string;
  };
  insights: ForecastStat[];
  /** the second row: the figures about the life of the record */
  stats: ForecastStat[];
  /** owner-share money per calendar year, split by product */
  annual: ForecastYear[];
  depletion: Depletion;
  /** the model's own price path, first projected month to last */
  deck: {
    gas_first: number; gas_last: number;
    oil_first: number; oil_last: number;
    first_label: string | null; last_label: string | null;
    note: string;
  } | null;
  /** the best month the record ever filed, and how far under it today sits */
  peak: {
    cycle: string; label: string | null; gas: number;
    off_pct: number | null; years_ago: number | null;
  } | null;
  /** the oil / gas split of the FORECAST money — not the volume split */
  mix: { gas_pct: number; oil_pct: number; note: string } | null;
  /** the reading of the page: short findings, not paragraphs */
  findings: { label: string; text: string }[];
  charts: ChartSpec[];
  units: { unit: string; of: string; body: string }[];
  /** every claim on the page, and which filing it came from */
  provenance: { name: string; gives: string; fresh: string }[];
}
