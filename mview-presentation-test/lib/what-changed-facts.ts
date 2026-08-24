import "server-only";

import { formatCount, formatPercentChange } from "./operator-compare";
import type { ChangeEvidence, ChangeRow } from "./operator-detail-data";
import type {
  OperatorCondition,
  OperatorDetailsRecord,
  OperatorDetailsResponse,
} from "./operator-details-api";

/**
 * "What changed" measured from the operator details endpoint, with no Python service.
 *
 * WHY THIS EXISTS. The panel's findings used to come only from the analysis service,
 * which reads MongoDB — so it works on a machine that can reach that database and
 * nowhere else. Vercel cannot, which is the whole reason the section reported itself
 * unconfigured in production. This builds the same findings from
 * `/api/v1/operators/details`, the endpoint the detail page ALREADY reads, over public
 * HTTPS that a serverless function can reach.
 *
 * IT IS THE SAME FLOW THE MAP PAGE USES for its AI summary: a route handler fetches the
 * record from an API the deployment can reach, hands it to the model with the key held
 * server-side, and returns what came back. See `lib/ai-summary.ts` and
 * `app/api/permit-summary/route.ts` — this is the operator-page half of that pattern.
 *
 * THE MODEL STILL NEVER SUPPLIES A NUMBER. Every figure, direction and date below is
 * read from the response and formatted here; the model is handed finished findings and
 * asked only to rephrase them, exactly as it is on the service path. That invariant is
 * the reason the panel can be trusted at all, and moving the measurement into this file
 * does not relax it — `rewriteWording` still rejects any wording containing a figure
 * that was not in its input.
 *
 * PURE, and deliberately: no fetch and no React, so the findings can be checked against
 * a saved response without a network or a render.
 */

/** The panel's fields that this module can establish, alongside the rows. */
export interface MeasuredFindings {
  operatorName: string;
  /** The newest complete month on record — never today; production posts on a lag. */
  asOfLabel: string;
  activityDays: number;
  rows: ChangeRow[];
}

/** The activity windows the endpoint reports on. Both are 90-day quarters. */
const ACTIVITY_DAYS = 90;

/** `2026-05-26`/`2026-08-24` → `26 May – 24 Aug 2026`, for an evidence note. */
function windowLabel(range: unknown): string {
  const span = range as { from?: unknown; to?: unknown } | undefined;
  const from = typeof span?.from === "string" ? span.from : "";
  const to = typeof span?.to === "string" ? span.to : "";
  if (from === "" || to === "") return "";
  return `${from} to ${to}`;
}

/**
 * A signed whole number — `+34`, `−101`.
 *
 * A TRUE MINUS SIGN, not a hyphen, because these are read as prose. The numeric guard
 * in `what-changed-ai.ts` strips neither, and it compares digits, so the glyph choice
 * cannot affect whether a rewrite validates.
 */
function signedCount(value: number): string {
  return value >= 0 ? `+${formatCount(value)}` : `−${formatCount(-value)}`;
}

function evidence(
  why: string,
  method: string,
  rows: readonly { k: string; v: string; note: string }[],
): ChangeEvidence {
  return { why, method, rows, series: [] };
}

/**
 * Latest filed month against the month before it, and against the same month a year
 * earlier.
 *
 * `direction` IS TAKEN FROM THE RESPONSE, NOT DERIVED from the percentage. The endpoint
 * reports `"flat"` — measurable on Diamondback's year-on-year, which moves 0% — and a
 * local `change >= 0 ? "up" : "down"` would print that as a rise. `flat` maps to the
 * neutral `flag` kind rather than being forced into one of the two arrows.
 */
function productionRows(condition: OperatorCondition): ChangeRow[] {
  const latest = condition.latest_monthly_boe;
  const rows: ChangeRow[] = [];

  // A non-producer — a services company, say — returns this block with every field
  // null. There is no production finding to make, and inventing "0" would be a claim.
  if (latest.boe === null || latest.month_label === null) return rows;

  const mmboe = latest.mmboe === null ? null : `${latest.mmboe.toFixed(2)} MMBOE`;

  for (const [comparison, window] of [
    [latest.mom, "the month before"],
    [latest.yoy, "the same month a year earlier"],
  ] as const) {
    if (comparison.change_percent === null || comparison.month_label === null) {
      continue;
    }

    const flat = comparison.direction !== "up" && comparison.direction !== "down";
    const percent = formatPercentChange(comparison.change_percent);

    rows.push({
      kind: flat ? "flag" : comparison.direction === "up" ? "up" : "down",
      headline: flat
        ? `Production held level against ${window}`
        : `Production ${comparison.direction === "up" ? "rose" : "fell"} ${percent} against ${window}`,
      detail:
        `${latest.month_label} filed ${formatCount(Math.round(latest.boe))} BOE` +
        `${mmboe === null ? "" : ` (${mmboe})`}, against ` +
        `${formatCount(Math.round(comparison.boe ?? 0))} BOE in ${comparison.month_label}.`,
      source: "Filed production record",
      evidence: evidence(
        "Filed volume is the figure a royalty cheque is calculated from, so a move here reaches an owner's statement before it reaches a headline.",
        "Both months as filed, returned by the operator details endpoint. Production posts on a lag, so the latest month is not the current one.",
        [
          {
            k: latest.month_label,
            v: `${formatCount(Math.round(latest.boe))} BOE`,
            note: mmboe ?? "",
          },
          {
            k: comparison.month_label,
            v: `${formatCount(Math.round(comparison.boe ?? 0))} BOE`,
            note: "",
          },
          { k: "Change", v: percent, note: flat ? "reported flat" : "" },
        ],
      ),
    });
  }

  return rows;
}

/** Permits filed in the last 90 days against the quarter before. */
function permitRow(condition: OperatorCondition): ChangeRow | null {
  const permits = condition.new_permits_90d;
  if (typeof permits?.count !== "number") return null;

  const rising = permits.direction === "up";
  const span = windowLabel((permits as { window?: unknown }).window);

  return {
    kind: rising ? "up" : "down",
    headline: `${formatCount(permits.count)} new permits in the last 90 days`,
    detail:
      `${signedCount(permits.change)} against ${formatCount(permits.prior_quarter_count)} ` +
      `in the prior quarter; ${formatCount(permits.count_365d)} over the last 365 days.`,
    source: "Filed drilling permits",
    evidence: evidence(
      "A permit is the earliest public signal that an operator intends to drill, so the count leads production by months rather than following it.",
      `Permits filed in the trailing 90 days${span === "" ? "" : ` (${span})`}, counted against the 90 days before that.`,
      [
        { k: "Last 90 days", v: formatCount(permits.count), note: span },
        {
          k: "Prior quarter",
          v: formatCount(permits.prior_quarter_count),
          note: windowLabel(
            (permits as { prior_quarter_window?: unknown }).prior_quarter_window,
          ),
        },
        { k: "Change", v: signedCount(permits.change), note: "" },
        { k: "Last 365 days", v: formatCount(permits.count_365d), note: "" },
      ],
    ),
  };
}

/**
 * Completions in the last 90 days.
 *
 * REPORTED AGAINST THE SAME QUARTER LAST YEAR, not only the prior one. Completions are
 * seasonal, and the endpoint supplies both comparisons — using only the sequential one
 * would read a winter-to-summer swing as a change in behaviour.
 */
function completionRow(condition: OperatorCondition): ChangeRow | null {
  const completions = condition.completions_90d;
  if (typeof completions?.count !== "number") return null;

  const rising = completions.direction_vs_same_quarter_last_year === "up";

  return {
    kind: rising ? "up" : "down",
    headline: `${formatCount(completions.count)} completions in the last 90 days`,
    detail:
      `${signedCount(completions.change_vs_same_quarter_last_year)} against ` +
      `${formatCount(completions.same_quarter_last_year_count)} in the same quarter last year, and ` +
      `${signedCount(completions.change_vs_prior_quarter)} against ${formatCount(completions.prior_quarter_count)} ` +
      `in the prior quarter. ${formatCount(completions.producing_count)} of them are already producing.`,
    source: "Filed completion records",
    evidence: evidence(
      "A completion is the point a permitted well starts to matter to an owner: it is the step between a drilled hole and a producing lease.",
      "Completions in the trailing 90 days, counted against both the previous quarter and the same quarter a year earlier, because completions run seasonally.",
      [
        { k: "Last 90 days", v: formatCount(completions.count), note: "" },
        {
          k: "Same quarter last year",
          v: formatCount(completions.same_quarter_last_year_count),
          note: signedCount(completions.change_vs_same_quarter_last_year),
        },
        {
          k: "Prior quarter",
          v: formatCount(completions.prior_quarter_count),
          note: signedCount(completions.change_vs_prior_quarter),
        },
        {
          k: "Already producing",
          v: formatCount(completions.producing_count),
          note: `of ${formatCount(completions.count)}`,
        },
        { k: "Last 365 days", v: formatCount(completions.count_365d), note: "" },
      ],
    ),
  };
}

/**
 * How much of the lease book is actually producing.
 *
 * A LEVEL, NOT A CHANGE, and it is included anyway: the endpoint carries no history for
 * this figure, and the share of leases in production is the single number that decides
 * whether an owner's own lease is likely to be paying. It is marked `flag` rather than
 * given a direction it cannot support.
 */
function leaseRow(condition: OperatorCondition): ChangeRow | null {
  const leases = condition.producing_leases;
  if (
    typeof leases?.count !== "number" ||
    typeof leases?.total_leases !== "number" ||
    leases.total_leases <= 0
  ) {
    return null;
  }

  const share = (leases.count / leases.total_leases) * 100;

  return {
    kind: "flag",
    headline: `${formatCount(leases.count)} of ${formatCount(leases.total_leases)} leases are producing`,
    detail: `${share.toFixed(1)}% of the leases on record are in production.`,
    source: "Filed lease records",
    evidence: evidence(
      "An operator can hold far more leases than it produces from. The share in production is what says whether a given lease is likely to be earning.",
      "Producing lease count against total leases on record, as returned by the operator details endpoint. The endpoint carries no prior period for this figure, so no trend is claimed.",
      [
        { k: "Producing", v: formatCount(leases.count), note: "" },
        { k: "On record", v: formatCount(leases.total_leases), note: "" },
        { k: "Share", v: `${share.toFixed(1)}%`, note: "" },
      ],
    ),
  };
}

/** Where the operator sits statewide, when the record carries a rank. */
function rankRow(record: OperatorDetailsRecord): ChangeRow | null {
  if (typeof record.statewide_rank !== "number" || record.statewide_rank <= 0) {
    return null;
  }

  return {
    kind: "swap",
    headline: `Ranked #${record.statewide_rank} statewide by reported production`,
    detail: `Across ${formatCount(record.leaseCount)} leases on record in Texas.`,
    source: "MineralView ranking",
    evidence: evidence(
      "Rank puts the volumes above in proportion: it is the difference between an operator that is large in absolute terms and one that is large for its area.",
      "Statewide position by reported production, as returned by the operator details endpoint.",
      [
        { k: "Statewide rank", v: `#${record.statewide_rank}`, note: "" },
        { k: "Leases on record", v: formatCount(record.leaseCount), note: "" },
      ],
    ),
  };
}

/**
 * Build the panel's findings from one details response.
 *
 * Returns null when the response carries no condition block — the endpoint omits it
 * when it cannot compute one, and a panel with only a rank in it is not a "what
 * changed". The caller then reports the section empty rather than thin.
 */
export function measuredFindings(
  details: OperatorDetailsResponse,
): MeasuredFindings | null {
  const record = details.operator_details[0];
  const condition = details.operator_condition;
  if (!record || !condition) return null;

  const rows: ChangeRow[] = [
    ...productionRows(condition),
    permitRow(condition),
    completionRow(condition),
    leaseRow(condition),
    rankRow(record),
  ].filter((row): row is ChangeRow => row !== null);

  if (rows.length === 0) return null;

  return {
    operatorName: record.OperatorName,
    /* The latest FILED month, not `as_of`. `as_of` is the day the block was computed —
       today — and labelling the panel with it would date the findings to a day no
       production was reported for. */
    asOfLabel:
      condition.latest_monthly_boe.month_label ?? record.end_productiondate,
    activityDays: ACTIVITY_DAYS,
    rows,
  };
}
