/**
 * `POST /api/v1/operators/production-graph` — the production chart's series.
 *
 * EVERY FILTER IS OPTIONAL, AND OMITTING ONE MEANS "ALL". Established by probing, not
 * assumed:
 *
 *   {operatorNo}                                  → all counties, 1997–2026 (30 years)
 *   {operatorNo, county}                          → that county, every year it has
 *   {operatorNo, start_year, end_year}            → all counties, those years only
 *   {operatorNo, county, start_year, end_year}    → that county, those years only
 *
 * This replaces an earlier shape that sent `type: "Operator Data"` and required a
 * non-empty `county` array — which meant the operator-wide series had to be requested
 * by naming all 79 of Pioneer's counties. Omitting the key does the same thing
 * server-side and reconciles exactly: no county, 2025 only, returns oil of
 * 214,403,548, the same figure the 79-county payload produced.
 *
 * THE YEAR RANGE IS SERVER-SIDE, NOT A CLIENT SLICE. Narrowing the range returns the
 * narrowed series, so the totals the panel prints are the API's own sums over the range
 * the reader chose rather than something this app added up from a wider fetch.
 *
 * YEARS CAN HAVE GAPS. A single county returns e.g. 2000, 2001, 2002, 2006 — 2003 to
 * 2005 are absent, not zero. Nothing here fills them in: an interpolated year is a
 * fabricated figure, and a gap in reported production is itself information.
 *
 * THE LAST YEAR IS PARTIAL. Production posts on a lag, so the newest year holds only
 * the months filed so far and always reads low against the one before it.
 *
 * THE RESPONSE DECLARES ITS OWN UNITS, and they are NOT barrels and Mcf. It sends
 * `oil_unit: "MBBL"` and `gas_unit: "MMCF"` — thousand barrels and million cubic feet.
 * They are carried through rather than assumed, because assuming was wrong by a factor
 * of a thousand: these figures were typed here as barrels and Mcf and then divided by a
 * million for display, so Diamondback's 2025 oil of 212,077.007 MBBL was drawn as
 * "0.21MM barrels" instead of the 212,077.007 MBBL the API reported.
 *
 * `BOEValues` IS NOT IN THE RESPONSE. It was declared here and never sent; BOE is not
 * plotted either way, so nothing depended on it.
 */

export interface ProductionGraphRequest {
  operatorNo: string;
  /** A single county name, upper-case. Omit for every county the operator reports in. */
  county?: string;
  /** Inclusive. Omit both to get the operator's full history. */
  start_year?: number;
  end_year?: number;
}

export interface ProductionGraphResponse {
  years: string[];
  oilValues: number[];
  gasValues: number[];
  /** The response's own unit strings, e.g. `MBBL` / `MMCF`. */
  oil_unit?: string;
  gas_unit?: string;
  /** Pre-formatted by the API, e.g. `"1,007,858.177 (MBBL)"`. */
  total_oil?: string | number;
  total_gas?: string | number;
}

export interface ProductionYear {
  year: number;
  /** In `oilUnit` — the response's own unit, not converted. */
  oil: number;
  /** In `gasUnit` — the response's own unit, not converted. */
  gas: number;
}

export interface ProductionSeries {
  rows: ProductionYear[];
  /** Oil across every year returned, in `oilUnit`. */
  totalOil: number;
  /** Gas across every year returned, in `gasUnit`. */
  totalGas: number;
  /** What the response called the oil figures. Empty when it did not say. */
  oilUnit: string;
  /** What the response called the gas figures. Empty when it did not say. */
  gasUnit: string;
}

function isResponse(value: unknown): value is ProductionGraphResponse {
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    Array.isArray(record.years) &&
    Array.isArray(record.oilValues) &&
    Array.isArray(record.gasValues)
  );
}

const numberAt = (values: unknown[], index: number): number => {
  const value = values[index];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

/**
 * The three parallel arrays into rows, with the API's own totals alongside.
 *
 * `BOEValues` is dropped here rather than downstream: the design shows a third series
 * and the panel does not, so the boundary is where that decision belongs — nothing
 * below this can accidentally plot it.
 */
/**
 * The API's own total, e.g. `"1,007,858.177 (MBBL)"` -> `1007858.177`.
 *
 * PREFERRED OVER ADDING THE YEARS UP HERE, and not for tidiness: summing sixteen
 * floats reintroduces binary noise the API never sent — the same way another chart on
 * this site turned a clean total into `1,212.4279999999999`. The sums reconcile exactly
 * (measured: 1,007,858.177 both ways), so this is the same number without the drift.
 * `null` when the field is absent or unreadable, and the caller then falls back.
 */
function apiTotal(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw !== "string") return null;
  const parsed = Number(raw.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function toSeries(response: ProductionGraphResponse): ProductionSeries {
  const rows: ProductionYear[] = [];
  let summedOil = 0;
  let summedGas = 0;

  response.years.forEach((label, index) => {
    const year = Number.parseInt(label, 10);
    if (!Number.isFinite(year)) return;
    const oil = numberAt(response.oilValues, index);
    const gas = numberAt(response.gasValues, index);
    rows.push({ year, oil, gas });
    summedOil += oil;
    summedGas += gas;
  });

  rows.sort((a, b) => a.year - b.year);
  return {
    rows,
    totalOil: apiTotal(response.total_oil) ?? summedOil,
    totalGas: apiTotal(response.total_gas) ?? summedGas,
    oilUnit: typeof response.oil_unit === "string" ? response.oil_unit : "",
    gasUnit: typeof response.gas_unit === "string" ? response.gas_unit : "",
  };
}

export async function fetchProductionGraph(
  baseUrl: string,
  request: ProductionGraphRequest,
  signal?: AbortSignal,
): Promise<ProductionSeries> {
  const response = await fetch(
    `${baseUrl.replace(/\/+$/, "")}/api/v1/operators/production-graph`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(`Production data unavailable (${response.status})`);
  }

  const payload: unknown = await response.json();
  if (!isResponse(payload)) {
    throw new Error("Production data came back in an unexpected shape");
  }
  return toSeries(payload);
}
