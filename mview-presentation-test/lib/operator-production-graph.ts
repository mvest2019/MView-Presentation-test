/**
 * `POST /api/v1/operators/production-graph` — the annual production series behind
 * the "Production over time" chart.
 *
 * NOT server-only, deliberately. This is the one read on the detail page that
 * genuinely belongs on the client: the chart sits well below the fold, it is not in
 * `generateMetadata`, and it is not the LCP element. Fetching it when the section
 * scrolls into view is what keeps it off the initial page load. The endpoint sends
 * `Access-Control-Allow-Origin: *`, so the browser can call it directly — no
 * forwarder needed, unlike the logo route.
 *
 * `county` IS REQUIRED AND MUST BE NON-EMPTY. An empty array or a missing key both
 * answer 400 `COUNTY_AND_OPERATOR_REQUIRED`, so there is no "whole operator" mode.
 * Passing every county the operator reports in is what produces the operator-wide
 * series, and it reconciles: for Pioneer the 79-county payload returns 30 years whose
 * oil sums to 1,907,873,826, which is exactly the `Totaloilproduction` that
 * `/operators/details` reports. That county list comes from the same `/details`
 * response, so the chart depends on it and is fetched second.
 *
 * YEARS CAN HAVE GAPS. A single county returns e.g. 2000, 2001, 2002, 2006 — 2003 to
 * 2005 simply absent. Anything plotting this must use the returned years as the axis
 * rather than assuming a contiguous range.
 *
 * THE LAST YEAR IS PARTIAL. 2026 reports 92,667,725 barrels against 2025's
 * 214,403,548 — a year in progress, not a collapse. Whatever renders it should not
 * present that as a decline.
 */

/** Exactly the documented payload. */
export interface ProductionGraphRequest {
  /** The only value observed in use. */
  type: "Operator Data";
  operatorNo: string;
  /** Upper-case county names. Must contain at least one. */
  county: string[];
}

/** Parallel arrays — every one is the same length as `years`. */
export interface ProductionGraphResponse {
  /** Year labels as strings, ascending. May skip years. */
  years: string[];
  /** Barrels per year. */
  oilValues: number[];
  /** Mcf per year. */
  gasValues: number[];
  /** Barrels of oil equivalent. Returned, but the chart does not plot it. */
  BOEValues: number[];
}

/** One year, with the parallel arrays zipped into a point. */
export interface ProductionYear {
  year: number;
  /** Barrels. */
  oil: number;
  /** Mcf. */
  gas: number;
}

const ENDPOINT = "/api/v1/operators/production-graph";

function isGraphResponse(value: unknown): value is ProductionGraphResponse {
  if (!value || typeof value !== "object") return false;
  const body = value as ProductionGraphResponse;
  return (
    Array.isArray(body.years) &&
    Array.isArray(body.oilValues) &&
    Array.isArray(body.gasValues) &&
    body.oilValues.length === body.years.length &&
    body.gasValues.length === body.years.length
  );
}

/**
 * Zip the parallel arrays into points, dropping any year whose label is not a
 * number. Oil and gas only — `BOEValues` is deliberately not carried through,
 * because the chart does not plot it and passing it would invite it back in.
 */
export function toProductionYears(
  response: ProductionGraphResponse,
): ProductionYear[] {
  return response.years
    .map((label, index) => ({
      year: Number(label),
      oil: response.oilValues[index] ?? 0,
      gas: response.gasValues[index] ?? 0,
    }))
    .filter((point) => Number.isFinite(point.year))
    .sort((a, b) => a.year - b.year);
}

/**
 * Fetch one operator's annual series.
 *
 * Takes an `AbortSignal` so a component that unmounts mid-flight — the visitor
 * scrolled past and navigated away — cancels rather than resolving into nothing.
 * Throws on a bad status or an unrecognised body so the caller can show its own
 * error state; the chart is one section, and a failure there should not blank the
 * page around it.
 */
export async function fetchProductionGraph(
  baseUrl: string,
  request: ProductionGraphRequest,
  signal?: AbortSignal,
): Promise<ProductionYear[]> {
  if (request.county.length === 0) {
    throw new Error("production-graph requires at least one county");
  }

  const response = await fetch(`${baseUrl}${ENDPOINT}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    throw new Error(`production-graph responded ${response.status}`);
  }

  const body: unknown = await response.json();
  if (!isGraphResponse(body)) {
    throw new Error("production-graph did not return parallel year arrays");
  }

  return toProductionYears(body);
}
