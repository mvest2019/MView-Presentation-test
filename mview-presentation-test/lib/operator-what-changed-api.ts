import "server-only";

import type { ChangeRow } from "./operator-detail-data";

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
  "claude-api" | "claude-cli" | "measured" | "deterministic";

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
  "measured",
  "deterministic",
]);

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
      },
    ];
  });
}

/**
 * Fetch one operator's panel.
 *
 * Throws with a message fit to show a reader. The caller decides what a failure looks
 * like on screen — this only decides that a failure is a failure.
 */
export async function fetchWhatChanged(
  operatorNumber: string,
): Promise<WhatChangedResult> {
  const baseUrl = (process.env.WHAT_CHANGED_SERVICE_URL ?? "").replace(
    /\/+$/,
    "",
  );
  const token = process.env.WHAT_CHANGED_SERVICE_TOKEN ?? "";

  // Prefixed so the route handler can tell "nobody set this up" apart from "the
  // service is down". They need different answers — one is a deploy step, the other
  // is an outage — and a single "could not be reached" for both sends you looking
  // for a network fault that does not exist.
  if (baseUrl === "" || token === "") {
    throw new Error(
      "NOT_CONFIGURED: WHAT_CHANGED_SERVICE_URL and WHAT_CHANGED_SERVICE_TOKEN " +
        "are not set on this deployment",
    );
  }

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

  const writer = text(body.writer);
  return {
    kind: "panel",
    operatorNumber: text(body.operator_no) || operatorNumber,
    operatorName: text(body.operator_name),
    asOfLabel: text(body.as_of_label),
    activityDays:
      typeof body.activity_days === "number" ? body.activity_days : 90,
    writer: (WRITERS.has(writer) ? writer : "measured") as PanelWriter,
    writerNote: text(body.writer_note),
    cached: body.cached === true,
    rows,
  };
}
