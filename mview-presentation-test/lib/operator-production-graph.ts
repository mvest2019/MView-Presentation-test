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
  /** Present in the response and deliberately unused — BOE is not plotted. */
  BOEValues: number[];
}

export interface ProductionYear {
  year: number;
  /** Barrels. */
  oil: number;
  /** Mcf. */
  gas: number;
}

export interface ProductionSeries {
  rows: ProductionYear[];
  /** Oil across every year returned, in barrels. */
  totalOil: number;
  /** Gas across every year returned, in Mcf. */
  totalGas: number;
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
export function toSeries(response: ProductionGraphResponse): ProductionSeries {
  const rows: ProductionYear[] = [];
  let totalOil = 0;
  let totalGas = 0;

  response.years.forEach((label, index) => {
    const year = Number.parseInt(label, 10);
    if (!Number.isFinite(year)) return;
    const oil = numberAt(response.oilValues, index);
    const gas = numberAt(response.gasValues, index);
    rows.push({ year, oil, gas });
    totalOil += oil;
    totalGas += gas;
  });

  rows.sort((a, b) => a.year - b.year);
  return { rows, totalOil, totalGas };
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
