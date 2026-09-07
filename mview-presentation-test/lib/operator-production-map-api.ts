/**
 * The choropleth's per-county oil and gas.
 *
 * IT GOES THROUGH `/api/operators/production-map`, NOT STRAIGHT AT THE OPERATOR API —
 * DEFECT 189. This used to post to `POST /api/v1/operators/production-map` from the
 * browser with a hard-coded `member_id: TEMP_MEMBER_ID`, which answered the upstream
 * gate on the reader's behalf: `member_id` IS the viewer here — without one every value
 * returns `****`, with one they are real — so every signed-out visitor received the
 * per-county volumes that the directory, the profile panel and the county table all
 * withhold. It also shipped a real member id in the client bundle.
 *
 * The route handler pins `member_id` from the session and answers `locked` for a
 * visitor without calling upstream at all. See the note there.
 *
 * THE VALUES ARRIVE AS FORMATTED STRINGS WITH THEIR UNITS INSIDE THEM —
 * `"714.982 (MMBBL)"`, `"2,274.798 (BCF)"`. So this endpoint does state its units, and
 * they are millions of barrels and billions of cubic feet, NOT the raw bbl/Mcf the rest
 * of the app uses. Verified against `/production-by-county`, which reports MIDLAND as
 * 714,981,764 bbl and 2,274,798,122 Mcf — the same quantities at 1e6 scale. Both the
 * number and the unit label are parsed out and kept: the number drives the colour
 * scale, the label is printed so a tooltip never implies the wrong magnitude.
 *
 * COUNTY NAMES ARE TITLE CASE HERE (`"Midland"`, `"De Witt"`) while the map's paths are
 * keyed upper case, so keys are normalised on the way through. A name that fails to
 * match simply never shades a county — it is not an error, because the county list and
 * the path list come from different sources and need not agree.
 */

export interface ProductionMapRequest {
  operator_no: string;
}

/** One county's figure: the number that scales, and the unit the API named. */
export interface MeasuredValue {
  value: number;
  /** e.g. `MMBBL`, `BCF`. Empty when the API sent no unit. */
  unit: string;
  /** The API's own string, for display — never reformatted. */
  label: string;
}

export interface CountyProductionPoint {
  /** Upper case, matching `TEXAS_COUNTY_PATHS` keys. */
  key: string;
  /** As the API spelled it, for display. */
  name: string;
  oil: MeasuredValue | null;
  gas: MeasuredValue | null;
  boe: number;
}

export interface ProductionMapData {
  counties: CountyProductionPoint[];
  /** The unit label shared by the oil column, for the legend. */
  oilUnit: string;
  gasUnit: string;
  /**
   * The handler's own answer — DEFECT 189. True means the reader has no account, which
   * is a different fact from "this operator has no county figures" and the map draws it
   * differently. It travels on the response rather than being inferred from an empty
   * list, per OPERATORS.md §4 rule 2.
   */
  locked: boolean;
}

/** `"2,274.798 (BCF)"` → `{ value: 2274.798, unit: "BCF", label: "2,274.798 (BCF)" }`. */
export function parseMeasured(raw: unknown): MeasuredValue | null {
  if (typeof raw !== "string") return null;
  const label = raw.trim();
  // Masked values arrive as `****` when `member_id` is absent — not a zero.
  if (label === "" || label.includes("*")) return null;

  const match = /^\s*(-?[\d,]*\.?\d+)\s*(?:\(([^)]*)\))?/.exec(label);
  if (!match) return null;

  const value = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(value)) return null;

  return { value, unit: (match[2] ?? "").trim(), label };
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function fetchProductionMap(
  operatorNumber: string,
  signal?: AbortSignal,
): Promise<ProductionMapData> {
  const request: ProductionMapRequest = { operator_no: operatorNumber };

  const response = await fetch("/api/operators/production-map", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Production map unavailable (${response.status})`);
  }

  const payload: unknown = await response.json();
  const locked = (payload as { locked?: unknown }).locked === true;
  if (locked) return { counties: [], oilUnit: "", gasUnit: "", locked: true };

  const raw = (payload as { counties?: unknown }).counties;
  const list = Array.isArray(raw) ? raw : [];

  const counties: CountyProductionPoint[] = [];
  let oilUnit = "";
  let gasUnit = "";

  for (const entry of list) {
    const record = entry as Record<string, unknown>;
    const name = text(record.name);
    if (name === "") continue;

    const oil = parseMeasured(record.total_oil);
    const gas = parseMeasured(record.total_gas);
    if (oil && oilUnit === "") oilUnit = oil.unit;
    if (gas && gasUnit === "") gasUnit = gas.unit;

    counties.push({
      key: name.toUpperCase(),
      name,
      oil,
      gas,
      boe:
        typeof record.total_BOE === "number" &&
        Number.isFinite(record.total_BOE)
          ? record.total_BOE
          : 0,
    });
  }

  return { counties, oilUnit, gasUnit, locked: false };
}
