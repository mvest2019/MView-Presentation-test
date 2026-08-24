import "server-only";

import type { ChangeEvidence, ChangeRow } from "./operator-detail-data";
import { fetchOperatorDetails } from "./operator-details-api";
import { rewriteWording } from "./what-changed-ai";
import { measuredFindings } from "./what-changed-facts";

/**
 * "What changed" — the panel, from the Python service that measures it.
 *
 * THE CHAIN. Browser → this app's own route handler → tunnel → Python service →
 * MongoDB → Claude → back. This module is the middle hop, and it is `server-only` for
 * the reason the whole shape exists: the service URL and its bearer token must never
 * reach the browser. A client component importing this file fails the build rather
 * than shipping either one, which is a better guard than remembering not to.
 *
 * WHY THERE IS A ROUTE HANDLER IN FRONT. The section is lazy-loaded, so the fetch has
 * to be startable from the browser — and a browser that could call the tunnel directly
 * would need the tunnel's address and token in its bundle. The route handler is the
 * same-origin door: the browser calls `/api/operators/<no>/what-changed`, this runs
 * server-side behind it, and the secrets stay on the server.
 *
 * THE FACTS ARE MEASURED BEFORE THE MODEL SEES THEM. The service reads the five
 * collections, computes the changes, ranks them, and only then asks Claude to rewrite
 * the wording. Claude cannot reach Mongo and is never sent a question — it is sent
 * finished findings and told to rephrase them. `kind` (the up/down/add/flag/swap
 * direction) and `source` are carried across from the measured signal and never taken
 * from the model, and the service rejects any output containing a figure that was not
 * in the input. So the model can change how a finding reads and nothing about what it
 * says.
 *
 * `writer` REPORTS WHICH WORDING ARRIVED, and the UI shows it. A run where the model
 * timed out returns the measured sentences — complete and correct, just plainer — and
 * that must not look identical to a model-written one, or a service stuck on its
 * fallback is a service nobody notices is stuck.
 */

/** How long this app waits on the service before giving up on the whole panel. */
const REQUEST_TIMEOUT_MS = 60_000;

/** Cache window. Production posts monthly, so a panel is safe for far longer than this. */
const REVALIDATE_SECONDS = 1800;

export type PanelWriter =
  "claude-api" | "claude-cli" | "gemini" | "measured" | "deterministic";

export interface WhatChangedPanel {
  kind: "panel";
  operatorNumber: string;
  operatorName: string;
  /** The newest complete month on record — never today; production posts on a lag. */
  asOfLabel: string;
  activityDays: number;
  /** Which wording is on screen. `measured`/`deterministic` mean the model did not run. */
  writer: PanelWriter;
  /** Why the model did not run, when it did not. Empty on a clean model run. */
  writerNote: string;
  cached: boolean;
  rows: ChangeRow[];
}

export interface WhatChangedEmpty {
  kind: "empty";
  detail: string;
}

export type WhatChangedResult = WhatChangedPanel | WhatChangedEmpty;

const KINDS = new Set(["up", "down", "add", "flag", "swap"]);
const WRITERS = new Set([
  "claude-api",
  "claude-cli",
  // The service reports this when its own Gemini path wrote the rows. Missing from
  // this set, it fell through to `measured` and a model-written panel was labelled
  // as a fallback one — the exact confusion `writer` exists to prevent.
  "gemini",
  "measured",
  "deterministic",
]);

/** Wording the service produced without a model, and which this app may re-phrase. */
const UNWRITTEN = new Set<PanelWriter>(["measured", "deterministic"]);

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * The service's row shape into the page's.
 *
 * `bold`/`rest` are the service's names for the short claim and the sentence that
 * continues it; the page has always called them `headline`/`detail`. An unrecognised
 * `kind` becomes `flag` rather than throwing — a new signal type upstream should read
 * as a neutral finding, not take the section down.
 */
/**
 * The working behind one finding, if the service sent any.
 *
 * VALIDATED FIELD BY FIELD, like everything else from this service. The panel is the
 * one place on the page where prose comes from a model, so nothing here is trusted to
 * be the shape it should be: a malformed `rows` entry is dropped rather than rendered
 * as `undefined`, and a row with no usable evidence returns undefined so the UI simply
 * does not offer to expand it.
 *
 * Numbers are NOT reformatted. `v` arrives already rendered ("161", "1,617 leases")
 * because signals.py computed it; re-deriving or re-rounding it here would create a
 * second definition of the same figure.
 */
function toEvidence(raw: unknown): ChangeEvidence | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const record = raw as Record<string, unknown>;

  const rows = (Array.isArray(record.rows) ? record.rows : []).flatMap(
    (entry): ChangeEvidence["rows"][number][] => {
      const row = entry as Record<string, unknown>;
      const k = text(row.k);
      const v = text(row.v);
      // A label with no value, or a value with no label, is not a table row.
      if (k === "" || v === "") return [];
      return [{ k, v, note: text(row.note) }];
    },
  );

  const series = (Array.isArray(record.series) ? record.series : []).flatMap(
    (entry): ChangeEvidence["series"][number][] => {
      const point = entry as Record<string, unknown>;
      const label = text(point.label);
      const value =
        typeof point.value === "number" && Number.isFinite(point.value)
          ? point.value
          : null;
      if (label === "" || value === null) return [];
      return [{ label, value, on: point.on === true }];
    },
  );

  const why = text(record.why);
  const method = text(record.method);

  // Nothing worth opening a row for.
  if (why === "" && method === "" && rows.length === 0 && series.length === 0) {
    return undefined;
  }
  return { why, rows, method, series };
}

function toRows(raw: unknown): ChangeRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry): ChangeRow[] => {
    const record = entry as Record<string, unknown>;
    const headline = text(record.bold);
    if (headline === "") return [];
    const kind = text(record.kind);
    return [
      {
        kind: (KINDS.has(kind) ? kind : "flag") as ChangeRow["kind"],
        headline,
        detail: text(record.rest),
        source: text(record.source),
        evidence: toEvidence(record.evidence),
      },
    ];
  });
}

/**
 * Can this deployment produce the panel at all?
 *
 * TWO WAYS TO SAY YES, because there are now two paths to the findings. Either the
 * analysis service is configured — URL and token both set — or there is a model key,
 * in which case the rows are measured from the operator details endpoint and phrased
 * here. The second is what a Vercel deployment has.
 *
 * WHY A PAGE ASKS BEFORE RENDERING THE SECTION. With neither, the panel can only report
 * its own absence — and it was reporting it to the public: a visitor to the live site
 * read "The analysis service is not configured for this environment yet.", which is a
 * note for whoever deploys, not for a mineral owner reading an operator page.
 *
 * SERVER-SIDE AND FREE. A few `process.env` reads, no request, so gating the section
 * costs nothing and happens before any markup is produced. It is deliberately NOT the
 * same thing as the panel's error state: an outage is transient and worth showing with
 * a retry, while an unequipped deployment shows nothing.
 */
export function whatChangedConfigured(): boolean {
  const env = (name: string) => (process.env[name] ?? "").trim() !== "";

  return (
    (env("WHAT_CHANGED_SERVICE_URL") && env("WHAT_CHANGED_SERVICE_TOKEN")) ||
    env("AI_SUMMARY_KEY") ||
    env("ANTHROPIC_API_KEY") ||
    env("GEMINI_API_KEY")
  );
}

/**
 * Fetch one operator's panel, from whichever source this deployment can reach.
 *
 * THE ANALYSIS SERVICE IS PREFERRED WHERE IT EXISTS, because it measures across five
 * MongoDB collections and can therefore see changes the details endpoint does not
 * carry. Where it is absent OR UNREACHABLE, the findings are measured from
 * `/api/v1/operators/details` instead.
 *
 * A CONFIGURED-BUT-DOWN SERVICE FALLS BACK RATHER THAN FAILING. That case is not
 * hypothetical: it is every local checkout whose `.env.local` points at a Python
 * service that is not currently running, and it was showing "The analysis service
 * could not be reached." while a complete panel was available from an endpoint the
 * page had already called. A reader does not care which of two sources measured the
 * filing; they care whether the section says anything.
 *
 * Throws only when BOTH sources fail. The caller decides what that looks like on
 * screen — this only decides that a failure is a failure.
 */
export async function fetchWhatChanged(
  operatorNumber: string,
): Promise<WhatChangedResult> {
  const baseUrl = (process.env.WHAT_CHANGED_SERVICE_URL ?? "").replace(
    /\/+$/,
    "",
  );
  const token = process.env.WHAT_CHANGED_SERVICE_TOKEN ?? "";

  /*
   * NO SERVICE CONFIGURED IS NO LONGER AN ERROR — it is the other path.
   *
   * This used to throw `NOT_CONFIGURED`, which the route handler turned into "The
   * analysis service is not configured for this environment yet." That sentence was
   * being shown to mineral owners on the live site, because Vercel cannot reach the
   * MongoDB the service reads and never will. The findings are now measured from the
   * operator details endpoint instead, which needs nothing but the public API.
   */
  if (baseUrl === "" || token === "") {
    return fromOperatorDetails(operatorNumber);
  }

  try {
    return await fromAnalysisService(operatorNumber, baseUrl, token);
  } catch (error) {
    // Logged, not swallowed: a service that was configured and did not answer is a
    // fault worth seeing in the server log, even though the reader still gets a panel.
    console.warn(
      `[what-changed] ${operatorNumber}: analysis service unavailable, ` +
        `measuring from the operator details endpoint instead`,
      error,
    );
    return fromOperatorDetails(operatorNumber);
  }
}

/** The analysis service path — MongoDB-measured findings, through the tunnel. */
async function fromAnalysisService(
  operatorNumber: string,
  baseUrl: string,
  token: string,
): Promise<WhatChangedResult> {
  const response = await fetch(`${baseUrl}/api/what-changed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      // ngrok's free tier serves an HTML interstitial instead of proxying, unless a
      // request opts out. Harmless against a non-ngrok host, and without it the
      // service's JSON arrives as a warning page and parses as malformed.
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({ operator_no: operatorNumber }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    next: {
      revalidate: REVALIDATE_SECONDS,
      tags: [`what-changed:${operatorNumber}`],
    },
  });

  const payload: unknown = await response.json().catch(() => null);

  // A 404 is not a failure of this app or of the service — it means the operator is
  // not in the summary collection this analysis reads. That is a fact about the
  // operator, so it belongs in the empty state; only a 5xx is an outage. Collapsing
  // the two would tell a reader to retry something that can never succeed.
  if (response.status === 404) {
    return {
      kind: "empty",
      detail: "is not in the production summary this analysis reads",
    };
  }

  if (!response.ok) {
    const detail =
      text((payload as Record<string, unknown> | null)?.error) ||
      `service responded ${response.status}`;
    throw new Error(detail);
  }
  if (payload === null || typeof payload !== "object") {
    throw new Error("service returned a malformed body");
  }

  const body = payload as Record<string, unknown>;

  if (body.empty === true) {
    return {
      kind: "empty",
      detail: text(body.detail) || "no measurable window for this operator",
    };
  }

  const rows = toRows(body.points);
  if (rows.length === 0) {
    return { kind: "empty", detail: "no findings for the current window" };
  }

  const reported = text(body.writer);
  const panel: WhatChangedPanel = {
    kind: "panel",
    operatorNumber: text(body.operator_no) || operatorNumber,
    operatorName: text(body.operator_name),
    asOfLabel: text(body.as_of_label),
    activityDays:
      typeof body.activity_days === "number" ? body.activity_days : 90,
    writer: (WRITERS.has(reported) ? reported : "measured") as PanelWriter,
    writerNote: text(body.writer_note),
    cached: body.cached === true,
    rows,
  };

  return applyWording(panel);
}

/**
 * THE WORDING STEP, WHEN WHOEVER MEASURED THE ROWS DID NOT PHRASE THEM.
 *
 * The analysis service phrases its own rows whenever it has a provider configured, and
 * a deployment that reaches a service like that needs nothing here — hence the guard.
 * What it covers is the Vercel case, on both paths into this file: the rows arrive
 * measured but unphrased, and the model call happens here, where `AI_SUMMARY_KEY` is a
 * platform environment variable. See `what-changed-ai.ts`.
 *
 * It cannot fail the panel. `rewriteWording` returns the rows it was handed if anything
 * goes wrong, so the worst case is the wording that already arrived.
 */
async function applyWording(
  panel: WhatChangedPanel,
): Promise<WhatChangedPanel> {
  if (!UNWRITTEN.has(panel.writer)) return panel;

  const rewrite = await rewriteWording(panel.rows, {
    operatorName: panel.operatorName,
    operatorNumber: panel.operatorNumber,
    asOfLabel: panel.asOfLabel,
    activityDays: panel.activityDays,
  });

  if (rewrite.byModel) {
    panel.rows = rewrite.rows;
    /* Named by the provider that actually wrote, not assumed. `claude-api` is the
       existing writer value for "the Messages API phrased this", which is what the
       badge and the panel's own `writer` field already understand. */
    panel.writer = rewrite.provider === "gemini" ? "gemini" : "claude-api";
    // The service's note explains why *its* model stayed out of it, which is no
    // longer interesting once one wrote the rows on screen.
    panel.writerNote = "";
  } else if (rewrite.note !== "") {
    panel.writerNote = [panel.writerNote, rewrite.note]
      .filter((part) => part !== "")
      .join("; ");
  }

  return panel;
}

/**
 * The panel without the Python service — measured from the operator details endpoint.
 *
 * THIS IS THE PATH A VERCEL DEPLOYMENT TAKES. The analysis service reads MongoDB, so it
 * only runs where that database is reachable; a serverless function is not such a
 * place, and the section reported itself unconfigured in production for exactly that
 * reason. `/api/v1/operators/details` is public HTTPS, is what the detail page around
 * this section already reads, and carries a measured `operator_condition` block — so
 * the findings can be built from it with no tunnel and no database.
 *
 * SAME SHAPE, SO NOTHING DOWNSTREAM CHANGES. It returns the same `WhatChangedPanel` the
 * service path returns and goes through the same wording step, so the route handler and
 * the whole UI are untouched by which path produced the rows.
 *
 * PERFORMANCE: NO EXTRA UPSTREAM COST IN PRACTICE. `fetchOperatorDetails` is cached for
 * half an hour and the surrounding page has already made the identical call, so this
 * reads a warm entry. The model call is the only new work, and the section is
 * lazy-loaded, so it happens only for a reader who scrolls to it.
 */
async function fromOperatorDetails(
  operatorNumber: string,
): Promise<WhatChangedResult> {
  const details = await fetchOperatorDetails(operatorNumber);
  if (!details) {
    throw new Error("the operator details endpoint could not be read");
  }

  const measured = measuredFindings(details);
  if (!measured) {
    return {
      kind: "empty",
      detail: "has no measured activity window on the filed record",
    };
  }

  return applyWording({
    kind: "panel",
    operatorNumber,
    operatorName: measured.operatorName,
    asOfLabel: measured.asOfLabel,
    activityDays: measured.activityDays,
    // `measured` is the honest writer here: this file computed the rows and no model
    // has seen them yet. `applyWording` promotes it if one writes.
    writer: "measured",
    writerNote: "",
    cached: false,
    rows: measured.rows,
  });
}
