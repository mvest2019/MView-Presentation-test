/**
 * THE PAYLOAD CONTRACT — the one type the Dashboard and the Weekly Report read.
 *
 * THIS IS THE SEAM. Every ported component takes `Payload` and nothing else:
 * no fetch, no fixture import, no knowledge of where the figures came from.
 * Today `_lib/reference/owner-data.ts` fills it from a committed JSON capture;
 * tomorrow that one module calls a backend and not a line of UI changes. That
 * is the whole reason this type exists as a file rather than as an inline
 * shape.
 *
 * NOT AUTHORED. In the reference build (`mineral-owner-site-2.0`) this is
 * `Payload` in `src/lib/payload.ts`, and most of it is INFERRED there —
 * `Snapshot` is declared as `NonNullable<Awaited<ReturnType<typeof build>>>`,
 * so there is no interface to copy for the totals, the as-of block, the series,
 * the operator roll-up, the reserves, the rings or the coverage. There is
 * nothing to transcribe, only a shape to recover. It was recovered
 * mechanically, and the passes are reproducible:
 *
 *   1  INFER from the captured payload, unioning every element of every array
 *      so a field that is a string on one row and null on another comes out
 *      `string | null` rather than whichever the first row happened to be.
 *
 *   2  RECONCILE against the reference's own declared interfaces — `LeaseRow`
 *      and `Well` in `serving.ts`, `Alert` and `AlertStat` in `alerts.ts`,
 *      `ActivityItem` in `sources/activity.ts`, `TimelineEvent` in
 *      `timeline.ts`, `ResolvedOwner` in `sources/owners.ts` and the rest.
 *      Inference can only see one owner's values, so a field this record
 *      happens to fill would otherwise be typed as never-null. 212 property
 *      lines were corrected this way.
 *
 *   3  SPLICE the shapes inference cannot express: `weekly` is the
 *      reference's `WeeklyReport` (its sixteen declarations copied verbatim
 *      into ./weekly), `drawers` is a Record keyed by data
 *      (`lease:02_290271`), and the arrays that are empty on this record are
 *      named from the reference instead of left as `unknown[]`.
 *
 * The type is therefore as wide as the reference's, never wider, and it is
 * checked by `tsc` against both the fixture and the twelve ported components —
 * the only check that matters, because a component that compiles against this
 * reads the same fields the reference component read.
 */
import type { WeeklyReport } from './weekly';
import type { ForecastPayload } from './forecast';
import type { ChartSpec } from './chart';

/* ---------------------------------------------------------------- alerts.ts */
export type AlertCategory = 'money' | 'activity' | 'models' | 'community';
export type AlertSeverity = 'action' | 'important' | 'context';
/** The delivery class, which is a METHOD taxonomy — Professional view only. */
export type AlertClass = 'Urgent' | 'Important digest' | 'Educational' | 'Community';

export interface AlertStat {
  /** short enough to sit in a chip - three or four words */
  label: string;
  value: string;
  /** the qualifier that stops the figure being misread */
  sub?: string;
  /** 'up' and 'down' colour the figure; 'flat' and undefined leave it neutral */
  tone?: 'up' | 'down' | 'flat' | 'warn';
}

/* -------------------------------------------------------------- timeline.ts */
/** the six kinds of thing the activity timeline carries — the reference's own
 *  `EventKind`. Declared rather than inferred: this record happens to hold
 *  only permits and completions, so pass 1 would have narrowed it to two. */
export type EventKind =
  | 'permit' | 'completion' | 'production' | 'adjacent' | 'status' | 'operator';

/** the three measured bands, as the object keys `rings.rings` uses */
export type RingKey = '1' | '3' | '5';

/** a figure carried on a timeline row — the reference's `EventStat` */
export interface EventStat {
  label: string;
  value: string;
  sub?: string;
  tone?: 'up' | 'down' | 'warn';
}

/** where the row sits, and therefore what a mile button can do with it */
export type EventScope =
  /** on a lease this owner holds */
  | 'yours'
  /** measured: a real distance in miles from the owner's own wells */
  | 'ring'
  /** county-matched: real, dated, but not placeable on a map */
  | 'county';

/* --------------------------------------------------------------- drawers.ts */
export interface Drawer {
  title: string;
  sub: string;
  what: string;
  means: string;
  evidence: string[];
  next: string;
  chips: string[];
  /** the two to four figures this panel is ABOUT, shown as a band above the
   *  prose. The panel used to bury every number mid-sentence, so the reader had
   *  to read a paragraph to learn what it was worth. */
  stats?: AlertStat[];
  /** colours the header accent: what KIND of answer this is */
  tone?: 'money' | 'activity' | 'models' | 'record';
  /** a short series for the band, where one exists */
  spark?: number[] | null;
  spark_label?: string | null;
  /** chart DATA, rendered by components/LineChart. Built from the same
   *  numbers as the prose beside it, so the two cannot disagree the way a
   *  second client-side fetch could. */
  charts?: ChartSpec[];
}

export type { WeeklyReport, ForecastPayload };

export interface Payload {
  owner: {
    ownername: string;
    ownernumber: number | string;
    districtcode: string | null;
    roll_year: number;
    city: string | null;
    initials: string;
    first_name: string;
    identity_note: string;
    identities_matched: number;
    other_identities: { ownernumber: unknown; ownername: string | null;
      districtcode: string | null; leases: number }[];
    roll_rows: number;
    collapsed_rows: number;
    collapse_note: string;
  };
  as_of: {
    roll_year: number;
    data_month: string;
    data_month_label: string;
    prev_month: string;
    prev_month_label: string;
    newest_month_in_source: string;
    newest_month_in_source_label: string;
    unreported_tail_months: number;
    estimate_run_iso: string;
    estimate_run_label: string;
    decline_run_label: string;
    radius_rebuild_iso: string;
    radius_rebuild_label: string;
  };
  totals: {
    lease_count: number;
    producing_count: number;
    paused_count: number;
    reporting_count: number;
    behind_count: number;
    behind_leases: ({
      lease_name: string | null;
      anchor_label: string | null;
      months_behind: number | null;
    })[];
    valued_count: number;
    owner_value: number;
    owner_value_low: number;
    owner_value_high: number;
    gross_value: number;
    appraised_value: number;
    appraised_year: number;
    anchor_gas_net: number;
    anchor_oil_net: number;
    anchor_boe_net: number;
    prev_gas_net: number;
    prev_oil_net: number;
    prev_boe_net: number;
    gas_change_pct: number;
    oil_change_pct: number;
    boe_change_pct: number;
    has_gas: boolean;
    has_oil: boolean;
    ttm_gas_net: number;
    ttm_oil_net: number;
    life_gas_gross: number;
    life_oil_gross: number;
    reserves_gas_net: number;
    reserves_oil_net: number;
    acres: number | null;
    well_count: number;
    counties: string[];
    county_count: number;
    operator_names: string[];
    operator_count: number;
    plays: string[];
    value_delta_available: boolean;
    value_delta_reason: string;
    anchor_cycle: string | null;
  };
  leases: ({
    lease_id: string;
    lease_number: string | null;
    district_code: string | null;
    lease_name: string | null;
    lease_name_roll: string | null;
    county: string | null;
    operator_name: string | null;
    operator_number: string | null;
    completion_operator: string | null;
    field_name: string | null;
    play: string | null;
    oil_gas_code: string | null;
    acres: number | null;
    lease_status: string | null;
    in_production_record: boolean;
    interest_type: string | null;
    interest_value: number;
    appraised_value: number;
    first_production: string | null;
    first_production_label: string | null;
    months_reported: number;
    anchor_cycle: string | null;
    anchor_label: string | null;
    anchor_gas: number;
    anchor_oil: number;
    anchor_gas_net: number;
    anchor_oil_net: number;
    anchor_boe: number;
    anchor_boe_net: number;
    prev_cycle: string;
    prev_label: string;
    prev_gas: number;
    prev_oil: number;
    prev_boe: number;
    gas_change_pct: number;
    oil_change_pct: number | null;
    boe_change_pct: number;
    pending_months: number;
    producing_at_anchor: boolean;
    at_portfolio_anchor: boolean;
    months_behind: number | null;
    ttm_gas_net: number;
    ttm_oil_net: number;
    total_gas: number;
    total_oil: number;
    total_boe: number;
    gross_value: number;
    owner_value: number;
    owner_value_low: number;
    owner_value_high: number;
    value_available: boolean;
    probability: number | null;
    probability_note: string | null;
    probability_category: string | null;
    modelled: boolean;
    expected_cycle: string | null;
    expected_label: string | null;
    expected_gas: number | null;
    expected_oil: number | null;
    expected_gas_low: number | null;
    expected_gas_high: number | null;
    drift_pct: number | null;
    drift_basis: 'gas' | 'oil' | null;
    next_cycle: string | null;
    next_label: string | null;
    next_gas: number | null;
    next_oil: number | null;
    next_gas_low: number | null;
    next_gas_high: number | null;
    quarter_gas: number | null;
    quarter_gas_low: number | null;
    quarter_gas_high: number | null;
    quarter_oil: number | null;
    reserves_gas_net: number;
    reserves_oil_net: number;
    reserves_boe_net: number;
    forecast_to_label: string | null;
    permits_1mi: number;
    permit_numbers: string[];
    neighbours_1mi: number;
    rings: ({
      radius_mi: number;
      permits: number;
      neighbours: number;
    })[];
    wells: ({
      lease_id: string;
      api14: string;
      well_number: string | null;
      well_name: string | null;
      completion_operator: string | null;
      status: string | null;
      well_type: string | null;
      profile: string | null;
      spud_iso: string | null;
      spud_label: string | null;
      depth_ft: number | null;
      depth_basis: string | null;
      lat: number;
      lon: number;
      field_name: string | null;
      play: string | null;
      last_month_boe: number;
      reserve_gas: number;
      reserve_oil: number;
      age_years: number | null;
      nearest_well_mi: number | null;
      record_type: string | null;
      permit_status: string | null;
      status_number: string | null;
    })[];
    well_count: number;
    tenures: ({
      operator_no: string | null;
      operator_name: string | null;
      start: string | null;
      start_label: string | null;
      end: string | null;
      end_label: string | null;
      months: number;
      gas: number;
      oil: number;
    })[];
    operator_changes: number;
    monthly: ({
      cycle: string;
      label: string;
      gas: number;
      oil: number;
      gas_net: number;
      oil_net: number;
      boe: number;
      boe_net: number;
      reported: boolean;
    })[];
  })[];
  model_deck: {
    cycle: string;
    label: string;
    oil: number;
    gas: number;
    oil_change_pct: number;
    gas_change_pct: number;
    prior_label: string;
    history: ({
      cycle: string;
      label: string;
      oil: number;
      gas: number;
    })[];
    basis: string;
  };
  operators: {
    operators: ({
      operator_name: string;
      operator_no: string | null;
      lease_count: number;
      lease_names: string[];
      owner_share_value: number;
      last_month_gas_net: number;
      last_month_oil_net: number;
      producing: number;
    })[];
    operator_count: number;
    handovers: ({
      lease_id: string;
      cycle: string;
      cycle_label: string | null;
      from_operator: string | null;
      to_operator: string | null;
    })[];
    latest_handover: {
      lease_id: string;
      cycle: string;
      cycle_label: string | null;
      from_operator: string | null;
      to_operator: string | null;
    } | null;
    tenure_leases: number;
  };
  reserves: {
    reserves_boe: number;
    reserves_gas: number;
    reserves_oil: number;
    eur_gas: number;
    eur_oil: number;
    produced_boe: number;
    wells: number;
    modelled_leases: number;
    unmodelled_leases: number;
    probability_avg: number;
    probability_best: {
      lease_id: string;
      probability: number | null;
      probability_category: string | null;
      lease_name: string | null;
    } | null;
    forecast_to_label: string | null;
    updated_label: string | null;
  };
  radius: {
    "1": {
      radius_mi: string;
      permit_count: number;
      permits: string[];
      neighbour_lease_count: number;
      neighbour_leases: string[];
      leases_covered: number;
    };
    "3": {
      radius_mi: string;
      permit_count: number;
      permits: string[];
      neighbour_lease_count: number;
      neighbour_leases: string[];
      leases_covered: number;
    };
    "5": {
      radius_mi: string;
      permit_count: number;
      permits: string[];
      neighbour_lease_count: number;
      neighbour_leases: string[];
      leases_covered: number;
    };
  };
  radius_stamp: string | null;
  radius_note: string;
  nearby: {
    rows: ({
      id: string;
      kind: string;
      api14: string | null;
      api: string | null;
      lease_id: string | null;
      lease_name: string | null;
      well_number: string | null;
      operator_name: string | null;
      county: string | null;
      field_name: string | null;
      play: string | null;
      distance_mi: number;
      band: 1 | 3 | 5;
      dx_mi: number;
      dy_mi: number;
      direction: string | null;
      is_own: boolean;
      status: string | null;
      purpose: string | null;
      profile: string | null;
      well_type: string | null;
      tvd: number | null;
      age_years: number | null;
      last_month_gas: number | null;
      last_month_oil: number | null;
      reserve_oil: number | null;
      reserve_gas: number | null;
      first_prod_cycle: string | null;
      last_prod_cycle: string | null;
      date_iso: string | null;
      date_label: string | null;
      date_kind: string | null;
    })[];
    bands: {
      "1": {
        band: 1 | 3 | 5;
        rows: number;
        permits: number;
        completions: number;
        wellbores: number;
        producing: number;
        operators: number;
        nearest_mi: number | null;
        nearest_name: string | null;
        newest_iso: string | null;
        newest_label: string | null;
        last_month_gas: number;
        last_month_oil: number;
      };
      "3": {
        band: 1 | 3 | 5;
        rows: number;
        permits: number;
        completions: number;
        wellbores: number;
        producing: number;
        operators: number;
        nearest_mi: number | null;
        nearest_name: string | null;
        newest_iso: string | null;
        newest_label: string | null;
        last_month_gas: number;
        last_month_oil: number;
      };
      "5": {
        band: 1 | 3 | 5;
        rows: number;
        permits: number;
        completions: number;
        wellbores: number;
        producing: number;
        operators: number;
        nearest_mi: number | null;
        nearest_name: string | null;
        newest_iso: string | null;
        newest_label: string | null;
        last_month_gas: number;
        last_month_oil: number;
      };
    };
    anchors: number;
    unavailable: string | null;
    note: string;
    read_rows: number;
    capped: boolean;
  };
  rings: {
    rings: {
      "1": {
        radius_mi: number;
        key: RingKey;
        standing_permits: number;
        neighbour_leases: number;
        leases_covered: number;
        in_production_record: number;
        producing: number;
        not_producing: number;
        neighbour_operators: number;
        neighbours: ({
          lease_id: string;
          lease_name: string | null;
          operator_name: string | null;
          county: string | null;
          field_name: string | null;
          status: string | null;
          producing: boolean;
          total_gas: number;
          total_oil: number;
          last_cycle: string | null;
          last_label: string | null;
          last_gas: number;
          last_oil: number;
          rank_boe: number;
          months_reported: number;
          first_production_label: string | null;
        })[];
        last_cycle: string | null;
        last_label: string | null;
        last_gas: number;
        last_oil: number;
        series: ({
          cycle: string;
          label: string;
          gas: number;
          oil: number;
          leases: number;
        })[];
        measured: {
          band: 1 | 3 | 5;
          rows: number;
          permits: number;
          completions: number;
          wellbores: number;
          producing: number;
          operators: number;
          nearest_mi: number | null;
          nearest_name: string | null;
          newest_iso: string | null;
          newest_label: string | null;
          last_month_gas: number;
          last_month_oil: number;
        };
        headline: string;
      };
      "3": {
        radius_mi: number;
        key: RingKey;
        standing_permits: number;
        neighbour_leases: number;
        leases_covered: number;
        in_production_record: number;
        producing: number;
        not_producing: number;
        neighbour_operators: number;
        neighbours: ({
          lease_id: string;
          lease_name: string | null;
          operator_name: string | null;
          county: string | null;
          field_name: string | null;
          status: string | null;
          producing: boolean;
          total_gas: number;
          total_oil: number;
          last_cycle: string | null;
          last_label: string | null;
          last_gas: number;
          last_oil: number;
          rank_boe: number;
          months_reported: number;
          first_production_label: string | null;
        })[];
        last_cycle: string | null;
        last_label: string | null;
        last_gas: number;
        last_oil: number;
        series: ({
          cycle: string;
          label: string;
          gas: number;
          oil: number;
          leases: number;
        })[];
        measured: {
          band: 1 | 3 | 5;
          rows: number;
          permits: number;
          completions: number;
          wellbores: number;
          producing: number;
          operators: number;
          nearest_mi: number | null;
          nearest_name: string | null;
          newest_iso: string | null;
          newest_label: string | null;
          last_month_gas: number;
          last_month_oil: number;
        };
        headline: string;
      };
      "5": {
        radius_mi: number;
        key: RingKey;
        standing_permits: number;
        neighbour_leases: number;
        leases_covered: number;
        in_production_record: number;
        producing: number;
        not_producing: number;
        neighbour_operators: number;
        neighbours: ({
          lease_id: string;
          lease_name: string | null;
          operator_name: string | null;
          county: string | null;
          field_name: string | null;
          status: string | null;
          producing: boolean;
          total_gas: number;
          total_oil: number;
          last_cycle: string | null;
          last_label: string | null;
          last_gas: number;
          last_oil: number;
          rank_boe: number;
          months_reported: number;
          first_production_label: string | null;
        })[];
        last_cycle: string | null;
        last_label: string | null;
        last_gas: number;
        last_oil: number;
        series: ({
          cycle: string;
          label: string;
          gas: number;
          oil: number;
          leases: number;
        })[];
        measured: {
          band: 1 | 3 | 5;
          rows: number;
          permits: number;
          completions: number;
          wellbores: number;
          producing: number;
          operators: number;
          nearest_mi: number | null;
          nearest_name: string | null;
          newest_iso: string | null;
          newest_label: string | null;
          last_month_gas: number;
          last_month_oil: number;
        };
        headline: string;
      };
    };
    stamp: string | null;
    distance_unavailable: string | null;
    distance_note: string;
    looked_up: number;
    capped: boolean;
    cap: number;
    note: string;
  };
  series: {
    months: ({
      cycle: string;
      label: string;
      gas_net: number;
      oil_net: number;
      boe_net: number;
      leases: number;
    })[];
    window: number;
    peak_gas_net: number;
    peak_oil_net: number;
  };
  sources: ({
    name: string;
    gives: string;
    fresh: string | null;
  })[];
  coverage: {
    production: {
      have: number;
      of: number;
      pct: number;
    };
    valuation: {
      have: number;
      of: number;
      pct: number;
    };
    reserves: {
      have: number;
      of: number;
      pct: number;
    };
    radius: {
      have: number;
      of: number;
      pct: number;
    };
    wells: {
      have: number;
      of: number;
      pct: number;
    };
    operator_tenure: {
      have: number;
      of: number;
      pct: number;
    };
  };
  alerts: {
    items: ({
      id: string;
      category: AlertCategory;
      severity: AlertSeverity;
      klass: AlertClass;
      icon: string;
      title: string;
      body: string;
      why: string;
      lead_lease: string | null;
      lease_id: string | null;
      metric: number | null;
      metric_unit: string | null;
      event_label: string | null;
      detected_label: string | null;
      evidence: string[];
      action_label: string | null;
      action_href: string | null;
      link: string | null;
      next_step: string;
      stats: AlertStat[];
      spark: number[] | null;
      spark_label: string | null;
      unread: boolean;
      channels: string;
    })[];
    count: number;
    counts: {
      all: number;
      money: number;
      activity: number;
      models: number;
      community: number;
    };
    ledger: {
      leases: number;
      counties: number;
      adjacent_leases: number;
      standing_permits: number;
      production_filings: number;
      lease_months_read: number;
      alerts: number;
      action_count: number;
      rest_count: number;
      operators: number;
      wells: number;
      nearby_filings: number;
      since_label: string | null;
      last_read_label: string | null;
      price_month: string;
      price_annual: string;
      price_weekly: string;
      price_weekly_annual: string;
    };
    action_count: number;
    important_count: number;
    context_count: number;
    since_label: string | null;
    window_label: string;
    window_note: string;
    notes: string[];
    quiet: boolean;
    quiet_reason: string | null;
  };
  activities: {
    window_months: number;
    window_label: string;
    counties: string[];
    kpis_mine: ({
      key: string;
      label: string;
      value: string;
      sub: string;
      fresh: string | null;
      active: boolean;
      ctx: string;
    })[];
    kpis_nearby: ({
      key: string;
      label: string;
      value: string;
      sub: string;
      fresh: string | null;
      active: boolean;
      ctx: string;
    })[];
    mine: Payload['activities']['nearby'];
    nearby: ({
      id: string;
      kind: string;
      type_label: string;
      is_mine: boolean;
      lease_id: string | null;
      lease_name: string | null;
      lease_number: string | null;
      county: string | null;
      district_code: string | null;
      operator_name: string | null;
      well_number: string | null;
      well_type: string | null;
      well_status: string | null;
      profile: string | null;
      field_name: string | null;
      purpose: string | null;
      status: string | null;
      status_number: string | null;
      total_depth: number | null;
      legal_description: string | null;
      event_iso: string | null;
      event_label: string | null;
      event_cycle: string | null;
      seen_iso: string | null;
      seen_label: string | null;
      seen_ago: string | null;
      link: string | null;
      title: string | null;
      summary: string | null;
      website: string | null;
      presentation_url: string | null;
    })[];
    news: Payload['activities']['nearby'];
    production: ({
      lease_id: string;
      lease_name: string | null;
      cycle: string;
      cycle_label: string | null;
      gas_net: number;
      oil_net: number;
      gas: number;
      oil: number;
      operator_name: string | null;
      change_pct: number | null;
    })[];
    mine_empty_reason: string | null;
    news_empty_reason: string | null;
    status_note: string | null;
    monthly: ({
      cycle: string;
      label: string;
      permits: number;
      completions: number;
      status: string | null;
    })[];
    compare_90: {
      days: number;
      recent: number;
      prior: number;
      change_pct: number | null;
      recent_permits: number;
      prior_permits: number;
      recent_completions: number;
      prior_completions: number;
    };
    compare_180: {
      days: number;
      recent: number;
      prior: number;
      change_pct: number | null;
      recent_permits: number;
      prior_permits: number;
      recent_completions: number;
      prior_completions: number;
    };
    operators: ({
      operator_name: string | null;
      permits: number;
      completions: number;
      total: number;
    })[];
    fields: ({
      field_name: string | null;
      permits: number;
      completions: number;
      total: number;
    })[];
    counts: {
      mine: number;
      nearby: number;
      news: number;
      production: number;
      permits: number;
      completions: number;
      status: string | null;
    };
    newest_label: string | null;
  };
  timeline: {
    events: ({
      id: string;
      kind: EventKind;
      kind_label: string;
      title: string;
      body: string;
      is_mine: boolean;
      scope: EventScope;
      distance_mi: number | null;
      ring: 1 | 3 | 5 | null;
      lease_id: string | null;
      lease_name: string | null;
      county: string | null;
      operator_name: string | null;
      sort_key: string;
      cycle: string | null;
      when_label: string | null;
      standing: boolean;
      stats: EventStat[];
      ring_stats: Record<RingKey, EventStat[]> | null;
      ctx: string;
    })[];
    kinds: ({
      kind: EventKind;
      label: string;
      count: number;
      mine: number;
      ring: number;
      county: number;
      ctx: string;
      meaning: string;
      action: string;
      newest: string | null;
      spark: number[];
    })[];
    counts: {
      permit: number;
      completion: number;
      production: number;
      adjacent: number;
      status: string | null;
      operator: number;
    };
    mine_count: number;
    ring_count: number;
    county_count: number;
    standing_count: number;
    window_months: number;
    newest_label: string | null;
    range: {
      today_iso: string;
      today_key: string;
      cutoffs: {
        d30: string;
        d60: string;
        d90: string;
        m12: string;
      };
      floor_month: string;
      floor_key: string;
      newest_month: string | null;
      oldest_month: string | null;
      months: ({
        value: string;
        label: string;
      })[];
    };
    spark_months: string[];
    notes: string[];
  };
  /** the Saturday report — the reference's own `WeeklyReport`, whose sixteen
   *  type declarations are copied verbatim into ./weekly */
  weekly: WeeklyReport;
  /** Production and Forecast: the whole payload the route renders. The
   *  reference own `ForecastPayload`, nine declarations copied verbatim
   *  into ./forecast -- 261 months, ten leases with their own series,
   *  the boundary, the disposition, and the figures the page explains. */
  forecast: ForecastPayload;
  my_leases: {
    picker: ({
      lease_id: string;
      label: string;
      county: string | null;
      operator_name: string | null;
      wells: number;
      reservoirs: string[];
      owner_value: number;
    })[];
    leases: ({
      lease_id: string;
      label: string;
      lease_name: string | null;
      lease_number: string | null;
      district_code: string | null;
      county: string | null;
      operator_name: string | null;
      field_name: string | null;
      field_stem: string | null;
      acres: number | null;
      lease_status: string | null;
      interest: number;
      interest_label: string | null;
      owner_value: number;
      reservoirs: ({
        name: string;
        wells: number;
        basis: string;
      })[];
      well_apis: string[];
      well_count: number;
      first_prod_label: string | null;
      last_posted_label: string | null;
      months_posted: number;
      gas_to_date: number;
      oil_to_date: number;
      gas_to_date_share: number;
      oil_to_date_share: number;
      reserves_gas_share: number;
      depth_min: number | null;
      depth_max: number | null;
      deviated_count: number;
      stats: ({
        label: string;
        value: string;
        sub: string;
      })[];
      map: {
        wells: ({
          api14: string;
          label: string;
          well_number: string | null;
          lease_id: string;
          lease_label: string;
          reservoir: string | null;
          profile: string | null;
          lat: number;
          lon: number;
          bh_lat: number | null;
          bh_lon: number | null;
          deviated: boolean;
          lateral_ft: number | null;
          bearing_deg: number | null;
          bearing_compass: string | null;
          depth_ft: number | null;
          active: boolean;
        })[];
        min_lat: number;
        max_lat: number;
        min_lon: number;
        max_lon: number;
        span_ns_mi: number;
        span_ew_mi: number;
        deviated_count: number;
        note: string;
      } | null;
      note: string | null;
    })[];
    reservoirs: ({
      key: string;
      name: string;
      basis: string;
      basis_note: string;
      lease_ids: string[];
      well_apis: string[];
      lease_count: number;
      well_count: number;
      gas_to_date: number;
      oil_to_date: number;
      gas_forecast: number;
      oil_forecast: number;
      first_cycle_label: string | null;
      last_cycle_label: string | null;
      depth_min: number | null;
      depth_max: number | null;
      depth_avg: number | null;
      profiles: ({
        name: string;
        wells: number;
      })[];
      deviated_count: number;
      avg_lateral_ft: number | null;
      months: ({
        cycle: string;
        label: string;
        gas: number;
        oil: number;
      })[];
      share_of_portfolio_gas: number | null;
      stats: ({
        label: string;
        value: string;
        sub: string;
      })[];
      map: {
        wells: ({
          api14: string;
          label: string;
          well_number: string | null;
          lease_id: string;
          lease_label: string;
          reservoir: string | null;
          profile: string | null;
          lat: number;
          lon: number;
          bh_lat: number | null;
          bh_lon: number | null;
          deviated: boolean;
          lateral_ft: number | null;
          bearing_deg: number | null;
          bearing_compass: string | null;
          depth_ft: number | null;
          active: boolean;
        })[];
        min_lat: number;
        max_lat: number;
        min_lon: number;
        max_lon: number;
        span_ns_mi: number;
        span_ew_mi: number;
        deviated_count: number;
        note: string;
      } | null;
    })[];
    wells: ({
      api14: string;
      api10: string | null;
      well_number: string | null;
      well_name: string | null;
      label: string;
      lease_id: string;
      lease_label: string;
      reservoir_key: string;
      reservoir: string | null;
      reservoir_basis: 'column' | 'field name' | null;
      county: string | null;
      field_name: string | null;
      well_type: string | null;
      status: string | null;
      profile: string | null;
      completion_operator: string | null;
      operator_name: string | null;
      depth_ft: number | null;
      depth_basis: string | null;
      tvd_ft: number | null;
      md_ft: number | null;
      deviation_ft: number | null;
      lateral_ft: number | null;
      bearing_compass: string | null;
      bearing_deg: number | null;
      elevation_ft: number | null;
      spud_label: string | null;
      first_prod_label: string | null;
      age_years: number | null;
      completions: ({
        api14: string;
        spud_iso: string | null;
        spud_label: string | null;
        permit_iso: string | null;
        permit_label: string | null;
        permit_type: string | null;
        permit_number: string | null;
        drilled_iso: string | null;
        drilled_label: string | null;
        recompleted_iso: string | null;
        recompleted_label: string | null;
        first_prod_iso: string | null;
        first_prod_label: string | null;
        filing_purpose: string | null;
        filing_welltype: string | null;
        perf_top: number | null;
        perf_bottom: number | null;
        fracced: boolean | null;
        casing_size: string | null;
        tubing_size: string | null;
        test24_gas: number | null;
        test24_oil: number | null;
        test24_water: number | null;
        test24_label: string | null;
        reservoir: string | null;
      })[];
      completion_count: number;
      months: ({
        cycle: string;
        label: string;
        gas: number;
        oil: number;
      })[];
      filed_months: number;
      projected_months: number;
      gas_filed: number;
      oil_filed: number;
      gas_projected: number;
      oil_projected: number;
      last_filed_label: string | null;
      peak_gas: number | null;
      peak_gas_label: string | null;
      share_of_lease_gas: number | null;
      active: boolean;
      stats: ({
        label: string;
        value: string;
        sub: string;
      })[];
      map: {
        wells: ({
          api14: string;
          label: string;
          well_number: string | null;
          lease_id: string;
          lease_label: string;
          reservoir: string | null;
          profile: string | null;
          lat: number;
          lon: number;
          bh_lat: number | null;
          bh_lon: number | null;
          deviated: boolean;
          lateral_ft: number | null;
          bearing_deg: number | null;
          bearing_compass: string | null;
          depth_ft: number | null;
          active: boolean;
        })[];
        min_lat: number;
        max_lat: number;
        min_lon: number;
        max_lon: number;
        span_ns_mi: number;
        span_ew_mi: number;
        deviated_count: number;
        note: string;
      } | null;
      note: string | null;
    })[];
    map: {
      wells: ({
        api14: string;
        label: string;
        well_number: string | null;
        lease_id: string;
        lease_label: string;
        reservoir: string | null;
        profile: string | null;
        lat: number;
        lon: number;
        bh_lat: number | null;
        bh_lon: number | null;
        deviated: boolean;
        lateral_ft: number | null;
        bearing_deg: number | null;
        bearing_compass: string | null;
        depth_ft: number | null;
        active: boolean;
      })[];
      min_lat: number;
      max_lat: number;
      min_lon: number;
      max_lon: number;
      span_ns_mi: number;
      span_ew_mi: number;
      deviated_count: number;
      note: string;
    } | null;
    totals: {
      lease_count: number;
      well_count: number;
      reservoir_count: number;
      counties: number;
      operators: number;
      deviated_count: number;
      gas_to_date: number;
      oil_to_date: number;
      owner_value: number;
      depth_min: number | null;
      depth_max: number | null;
      roster_note: string;
    };
    history_end: string | null;
    history_end_label: string | null;
    stats: ({
      label: string;
      value: string;
      sub: string;
    })[];
    findings: ({
      label: string;
      text: string;
    })[];
    provenance: ({
      name: string;
      gives: string;
      fresh: string | null;
    })[];
  };
  /** the explainer copy behind every card, keyed by the string `open()` is
   *  called with — `value`, `permits`, `lease:<id>`, `well:<api14>`,
   *  `alert:<id>`. A Record, because the lease and well keys are data. */
  drawers: Record<string, Drawer>;
  ticker: {
    items: ({
      key: string;
      label: string;
      value: number;
      display: string;
      unit: string;
      desc: string;
      as_of: string;
      prev: number | null;
      change_pct: number | null;
      error: string | null;
      history: ({
        date: string;
        value: number;
      })[];
      low: number;
      high: number;
      change_30d_pct: number | null;
    })[];
    fetched_iso: string;
    source: string;
    basis: string;
    ok_count: number;
  } | null;
  built_at: string;
}


/* ---------------------------------------------------------------- the rows */
/**
 * The two ROW types the Alerts and Activities views take, derived from the
 * payload rather than re-declared beside it.
 *
 * In the reference these are `Alert` in `lib/alerts.ts` and `TimelineEvent` in
 * `lib/timeline.ts` — modules that also BUILD the rows, out of Mongo, and so
 * cannot come across. Deriving them here keeps the one seam this port has:
 * there is exactly one shape, the views cannot drift from what the payload
 * actually carries, and a field renamed above is a compile error below.
 */
export type Alert = Payload['alerts']['items'][number];
export type TimelineEvent = Payload['timeline']['events'][number];
