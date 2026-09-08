/**
 * THE WEEKLY REPORT'S TYPES — the reference's own declarations.
 *
 * `WeeklyView.tsx` imports `WeeklyReport`, `Verdict` and `WeeklyBar` from
 * `@/lib/weekly`, so this module stands in for that import. Every declaration
 * below is copied verbatim out of `src/lib/weekly.ts` in the reference build —
 * all sixteen of them, comments included. What is NOT copied is the 1,300 lines
 * of BUILDER beneath them: the report is assembled on the reference's server
 * from Mongo, and the assembled object is what this build carries in its
 * fixture. Types are the contract; the builder is the thing a backend will
 * eventually be.
 *
 * So when the fixture is replaced by a real API, these types are what the API
 * must satisfy, and nothing in `WeeklyView.tsx` has to change.
 */

export type Verdict = 'good' | 'watch' | 'flag' | 'quiet';

export interface WeeklyAnswer {
  n: number;
  question: string;
  verdict: Verdict;
  /** the answer in one line, which is what most readers will take away */
  short: string;
  /** the paragraph behind it */
  body: string;
  page: number;
}

export interface WeeklyStat {
  label: string;
  value: string;
  sub?: string;
  tone?: 'up' | 'down' | 'warn';
}

export interface WeeklyRow {
  key: string;
  cells: string[];
  mine?: boolean;
}

export interface WeeklyTable {
  head: string[];
  rows: WeeklyRow[];
  /** said instead of an empty table */
  empty?: string | null;
  note?: string;
}

export interface WeeklyPage {
  n: number;
  title: string;
  kicker: string;
  lead: string;
  stats: WeeklyStat[];
  tables: WeeklyTable[];
  paras: string[];
  /** the one line at the foot of the page */
  note: string | null;
}

export interface WeeklyBar {
  label: string;
  sub: string | null;
  value: number;
  display: string;
  /** 0-100, already scaled against the biggest bar */
  share: number;
  mine: boolean;
}

export interface WeeklyExplain {
  page: number;
  summary: string;
  paras: string[];
}

export interface WeeklyRailItem {
  id: string;
  mark: string;
  title: string;
  sub: string;
  minutes: number;
}

export interface WeeklyEstimate {
  month_label: string | null;
  low: string;
  high: string;
  mid: string;
  low_n: number;
  high_n: number;
  mid_n: number;
  quarter_label: string;
  quarter_low: string;
  quarter_high: string;
  six_year: string;
  basis: string;
  why_range: string[];
  narrower: string;
  /** null when the model does not reach the month */
  unavailable: string | null;
}

export interface WeeklyDated {
  when: string;
  what: string;
  detail: string;
}

export interface WeeklyDriver {
  headline: string;
  text: string;
  source: string;
  href: string;
}

export interface WeeklyMonthly {
  title: string;
  issue: string;
  closed_label: string | null;
  find: string;
  stats: WeeklyStat[];
  table: WeeklyTable;
  note: string;
}

export interface WeeklyArchiveItem {
  week_ending_iso: string;
  week_ending_label: string;
  line: string;
  quiet: boolean;
}

export interface WeeklyWatch {
  signal: string;
  where: string;
  trigger: string;
  we_would: string;
}

export interface WeeklyReport {
  /** the Saturday this issue covers up to */
  week_ending_iso: string;
  week_ending_label: string;
  window_from_iso: string;
  window_from_label: string;
  window_label: string;
  built_label: string;

  owner_name: string;
  owner_first: string;
  owner_record: string;
  lease_count: number;
  counties: string[];

  /** true when nothing in the window touched the owner's own acreage */
  quiet: boolean;
  verdict: Verdict;
  headline: string;
  bottom_line: string;

  answers: WeeklyAnswer[];
  exec: { tone: Verdict; text: string }[];
  /** the coffee promise, in the report's own words */
  promise: string;
  /** what the leases posted, biggest first — page 2's chart */
  volume_bars: WeeklyBar[];
  /** where the estimate lives — page 5's chart */
  value_bars: WeeklyBar[];
  explains: WeeklyExplain[];
  /** the four figures a weekly summary cannot show — see `insights` below */
  insights: WeeklyStat[];
  depth: string[];
  /** the report's one visible path */
  rail: WeeklyRailItem[];
  read_minutes: number;
  /** the number people open it for */
  estimate: WeeklyEstimate;
  /** what is coming, with a date already on it */
  calendar: WeeklyDated[];
  /** why the price moved, with the public source beside each reason */
  drivers: WeeklyDriver[];
  /** the keeper — the month that closed */
  monthly: WeeklyMonthly | null;
  /** every issue kept */
  archive: WeeklyArchiveItem[];
  /** what this report would say on a week with nothing in it */
  quiet_week_note: string;
  pages: WeeklyPage[];
  watch: { items: string[]; table: WeeklyTable };

  /** the week against the week before it */
  compare: { this_week: number; last_week: number; change_pct: number | null };
  /** the events the window actually contains, newest first */
  events: TimelineEvent[];

  /** week-on-week price moves, computed from the daily history */
  prices: {
    key: string; label: string; display: string; unit: string;
    week_change_pct: number | null; as_of: string | null; matters: string;
  }[];

  sources: { label: string; detail: string }[];
  disclaimer: string;
  page_count: number;
}

/* ============================================================ timeline.ts
   `WeeklyReport.events` is a list of the reference's `TimelineEvent`, and
   `weekly-render.ts` walks it to build the CSV and the "every filing dated
   inside this week" rows. So the four declarations that shape one are copied
   here too, verbatim from `src/lib/timeline.ts`, rather than the field being
   loosened to `unknown[]` — the renderer reads `when_label`, `kind_label`,
   `title`, `lease_name` and `operator_name` off it by name.
   ============================================================================ */

export type EventKind =
  | 'permit' | 'completion' | 'production' | 'adjacent' | 'status' | 'operator';

/** where the row sits, and therefore what a mile button can do with it */
export type EventScope =
  /** on a lease this owner holds */
  | 'yours'
  /** measured: a real distance in miles from the owner's own wells */
  | 'ring'
  /** county-matched: real, dated, but not placeable on a map */
  | 'county';

export interface EventStat { label: string; value: string; sub?: string; tone?: 'up' | 'down' | 'warn' }

export type RingKey = '1' | '3' | '5';

export interface TimelineEvent {
  id: string;
  kind: EventKind;
  /** the label shown on the kind pill */
  kind_label: string;
  title: string;
  body: string;
  /** true only when the record proves it is on a lease the owner holds */
  is_mine: boolean;
  scope: EventScope;
  /** measured miles from the owner's nearest well; null when unmeasurable */
  distance_mi: number | null;
  /** the ring this row falls in, or null when it cannot be placed */
  ring: 1 | 3 | 5 | null;
  lease_id: string | null;
  lease_name: string | null;
  county: string | null;
  operator_name: string | null;
  /** fixed width, eight characters: "YYYYMMDD" for a day, "YYYYMM00" for a
   *  month, "" when the row carries no date at all */
  sort_key: string;
  /** the month this row belongs to, for the per-kind monthly counts */
  cycle: string | null;
  when_label: string | null;
  /** a standing fact rather than a dated event — see rule 2 */
  standing: boolean;
  stats: EventStat[];
  /** adjacent rows only: the same stats at each ring, so a mile button works */
  ring_stats: Record<RingKey, EventStat[]> | null;
  /** which drawer this row opens */
  ctx: string;
}
