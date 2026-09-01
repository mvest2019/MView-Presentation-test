import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

/**
 * The spot strip's settlements — read server-side, and FAIL CLOSED.
 *
 * READ THE HISTORY BEFORE CHANGING ANYTHING HERE. What this replaced in the
 * reference build was four hardcoded seed prices pushed through a ±0.2% random
 * walk on a 30-second interval, with ▲/▼ percentage deltas painted from the
 * drift and an "updated 12s ago" stamp implying a feed. The real WTI settlement
 * that day was $84.38 against a $68.78 seed: the strip was about $15.50 wrong,
 * moving convincingly, sourced from nothing, on a site that sells data accuracy.
 * The same clock also re-priced the portfolio total off those invented moves.
 *
 * THE RULES THAT CAME OUT OF THAT, and they are not negotiable:
 *
 *   NO SEEDS, NO SIMULATION, NO INTERVAL. Nothing perturbs a number after it
 *   renders.
 *
 *   FAIL CLOSED. A missing file, unreadable JSON, a malformed payload or zero
 *   usable items all resolve to `null`, and the caller renders NO STRIP. Not a
 *   spinner, not a zero, not a last-known value. A missing strip is honest; a
 *   confident wrong one is what was removed. A fallback here would BE the bug.
 *
 *   NO MOVEMENT INDICATORS. One settlement is a value, not a change — there is
 *   nothing to compare it against in the payload, so no arrow may be drawn.
 *
 *   THE DATE RENDERS AS VISIBLE TEXT, never as a tooltip alone. The series runs
 *   about eight days behind, and that lag is precisely the thing a reader must
 *   not be misled about.
 *
 * WHY SERVER-SIDE, when the reference fetches on the client: the payload is a
 * static file, so reading it during render costs no client JavaScript and the
 * strip arrives in the first paint instead of popping in. The fail-closed
 * contract is unchanged — an unreadable file still yields no strip.
 *
 * The file lives at `public/data/prices.json`, the reference's own URL, so the
 * ticker build (`mineralview-ticker/build_ticker_json.py`) can refresh it
 * without a rebuild of this app.
 */

export type SpotKey = "wti" | "gas" | "brent" | "propane";

/** The four series the strip has room for, keyed by the payload's own labels. */
const SERIES_KEY: Record<string, SpotKey> = {
  WTI: "wti",
  "NAT GAS": "gas",
  BRENT: "brent",
  PROPANE: "propane",
};

export interface SpotItem {
  key: SpotKey;
  label: string;
  /** Pre-formatted by the payload — never re-rounded here. */
  display: string;
  /** The tooltip: what the series is, its unit, its settlement date. */
  title: string;
}

export interface SpotData {
  items: SpotItem[];
  /** "EIA settlement · 20 Jul 2026" — the part that may never be dropped. */
  stamp: string;
  /** The basis sentence, which may fold away on a narrow window. */
  basis: string;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * "2026-07-20" -> "20 Jul 2026".
 *
 * Regex-parsed rather than `new Date()`, so the settlement date cannot slip a
 * day for a reader in a negative-offset timezone.
 */
function formatSettlementDay(iso: unknown): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ""));
  if (!match) return "";
  const month = MONTHS[Number.parseInt(match[2], 10) - 1];
  if (!month) return "";
  return `${Number.parseInt(match[3], 10)} ${month} ${match[1]}`;
}

/** The shape we accept. Anything else is a malformed payload. */
interface RawPayload {
  basis?: unknown;
  items?: unknown;
}

interface RawItem {
  label?: unknown;
  display?: unknown;
  unit?: unknown;
  as_of?: unknown;
  desc?: unknown;
}

/**
 * `cache` de-duplicates the read within a single render pass, so the shell and
 * any other caller share one file read rather than one each.
 */
export const getSpotPrices = cache(async (): Promise<SpotData | null> => {
  let payload: RawPayload;

  try {
    const file = await readFile(
      path.join(process.cwd(), "public", "data", "prices.json"),
      "utf8",
    );
    payload = JSON.parse(file) as RawPayload;
  } catch (error) {
    // Hidden IS the handled state — loud in the log, silent on the page.
    console.warn(
      "[spot] strip hidden — no settlement data:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }

  if (!Array.isArray(payload.items)) return null;

  const items: SpotItem[] = [];
  const days = new Set<string>();
  let latest = "";

  for (const raw of payload.items as RawItem[]) {
    const label = typeof raw?.label === "string" ? raw.label : "";
    const key = SERIES_KEY[label];
    // An unknown or malformed row is DROPPED, not defaulted.
    if (!key || typeof raw.display !== "string" || !raw.display) continue;

    const asOf = formatSettlementDay(raw.as_of);
    const desc = typeof raw.desc === "string" && raw.desc ? raw.desc : label;
    const unit =
      typeof raw.unit === "string" && raw.unit ? ` · ${raw.unit}` : "";

    items.push({
      key,
      label,
      display: raw.display,
      title: `${desc}${unit}${asOf ? ` · EIA settlement ${asOf}` : ""} · not a live price`,
    });

    if (typeof raw.as_of === "string" && raw.as_of) {
      days.add(raw.as_of);
      if (raw.as_of > latest) latest = raw.as_of;
    }
  }

  // Nothing usable rendered — still fail closed.
  if (items.length === 0) return null;

  const latestDay = formatSettlementDay(latest);
  const stamp = latestDay
    ? days.size > 1
      ? `EIA settlements through ${latestDay}`
      : `EIA settlement · ${latestDay}`
    : "EIA settlement";

  return {
    items,
    stamp,
    basis:
      typeof payload.basis === "string" && payload.basis
        ? payload.basis
        : "End-of-day exchange settlements. Not live prices.",
  };
});
