"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  fetchProductionMap,
  type ProductionMapData,
} from "@/lib/operator-production-map-api";

/**
 * Shades the Texas choropleth from `/operators/production-map`.
 *
 * WHY IT MUTATES THE PATHS INSTEAD OF RENDERING THEM. All 254 county outlines are 64 KB
 * of geometry, identical for every operator, and the server already renders them into
 * the HTML — that is deliberate, so the shapes gzip inside the document and never enter
 * a client bundle. Rebuilding the SVG in a client component to colour it would ship all
 * 64 KB to every visitor to change five numbers per county. So the geometry stays where
 * it is and this writes the shade onto it: one pass over 254 nodes, once per operator.
 *
 * THE TAB SWITCH STAYS FREE. Each path carries BOTH `--b-oil` and `--b-gas`, so
 * `FootprintMap` still toggles metric by flipping one class on the wrapper and CSS
 * repaints from the other property. No refetch, no React re-render, no 254-element
 * reconcile — which is exactly what the brief asks for, and it is the behaviour the
 * section already had.
 *
 * ONE FETCH PER OPERATOR, aborted on change. Both series come from the same response,
 * so switching Oil/Gas cannot trigger a request; there is nothing to request.
 *
 * BUCKETS ARE SPACED BY ORDER OF MAGNITUDE, NOT BY VALUE. This is the part worth
 * explaining, because the obvious scales both fail here. County production spans six
 * orders of magnitude — Pioneer runs from Potter at 0.001 MMBBL to Midland at 714.982 —
 * so a linear scale paints everything but Midland the lightest shade, and `sqrt`, which
 * this section used at first, is barely better: it put 47 of 73 counties in bucket 1,
 * which is exactly the "too light, can't tell them apart" problem. Placing each county
 * on the LOG range instead spreads the same 73 counties 13/15/14/6/7 across the ramp,
 * and it stays honest: the step still rises with the figure, so a darker county always
 * out-produces a lighter one. (Quantile bucketing would spread them perfectly evenly,
 * but then the shade would encode a county's RANK while the tooltip shows its value —
 * a small county would look mid-range merely because others are smaller.)
 *
 * Counties absent from the response keep bucket 0: white, and inert — no hover outline
 * and no tooltip, because there is nothing to report.
 */

/** Where the five steps sit, as a fraction of the way up the operator's log range. */
const STOPS = [0.8, 0.6, 0.4, 0.2] as const;

/** The log range of one metric across this operator's counties. */
interface Scale {
  low: number;
  high: number;
}

/** Null when nothing was reported — every county then stays at bucket 0. */
function scaleOf(values: number[]): Scale | null {
  let max = 0;
  let min = Number.POSITIVE_INFINITY;
  for (const value of values) {
    if (value <= 0) continue;
    if (value > max) max = value;
    if (value < min) min = value;
  }
  if (max <= 0) return null;
  return { low: Math.log10(min), high: Math.log10(max) };
}

/** Bucket 0 is the "no data" fill; 1–5 are the ramp, darkest at 5. */
function bucketOf(value: number, scale: Scale | null): number {
  if (value <= 0 || !scale) return 0;

  // One reporting county, or several at the same figure: no range to spread across, so
  // the ramp would be arbitrary. Give them the top step rather than the faintest.
  const span = scale.high - scale.low;
  const ratio = span <= 0 ? 1 : (Math.log10(value) - scale.low) / span;

  if (ratio >= STOPS[0]) return 5;
  if (ratio >= STOPS[1]) return 4;
  if (ratio >= STOPS[2]) return 3;
  if (ratio >= STOPS[3]) return 2;
  return 1;
}

interface Shade {
  oil: number;
  gas: number;
  oilLabel: string;
  gasLabel: string;
}

type State =
  | { status: "loading" }
  | { status: "ready"; data: ProductionMapData }
  | { status: "empty" }
  | { status: "error" };

export function CountyShading({
  operatorNumber,
  children,
}: {
  operatorNumber: string;
  /** The server-rendered `<svg>`, geometry and all. */
  children: React.ReactNode;
}) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [nonce, setNonce] = useState(0);
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetchProductionMap(operatorNumber, controller.signal)
      .then((data) => {
        if (!active) return;
        setState(
          data.counties.length === 0
            ? { status: "empty" }
            : { status: "ready", data },
        );
      })
      .catch(() => {
        // A cancelled request is not a failure — the cleanup superseded it.
        if (!active || controller.signal.aborted) return;
        setState({ status: "error" });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [operatorNumber, nonce]);

  /**
   * County key → its two buckets and two labels. Recomputed only when the response
   * changes, never on a tab switch or an unrelated render.
   */
  const shades = useMemo(() => {
    if (state.status !== "ready") return null;

    /* Each metric is scaled against its own range. They have to be: oil is in MMBBL and
       gas in BCF, and an operator's gas leader is frequently not its oil leader. */
    const oilScale = scaleOf(
      state.data.counties.map((county) => county.oil?.value ?? 0),
    );
    const gasScale = scaleOf(
      state.data.counties.map((county) => county.gas?.value ?? 0),
    );

    const map = new Map<string, Shade>();
    for (const county of state.data.counties) {
      map.set(county.key, {
        oil: bucketOf(county.oil?.value ?? 0, oilScale),
        gas: bucketOf(county.gas?.value ?? 0, gasScale),
        oilLabel: county.oil?.label ?? "—",
        gasLabel: county.gas?.label ?? "—",
      });
    }
    return map;
  }, [state]);

  /**
   * Write the shades onto the server-rendered paths.
   *
   * A deliberate escape hatch: React does not own this geometry, the server does, and
   * the alternative is shipping 64 KB of it to the browser to recolour it.
   *
   * BOTH METRICS ARE WRITTEN IN THE SAME PASS, which is what keeps the Oil/Gas toggle
   * free — it flips one class and CSS repaints from the other attribute, with no
   * request and no React work.
   *
   * The bucket goes in a data attribute rather than a CSS custom property on purpose:
   * the stylesheet selects on it, and an attribute match is exact where a
   * `[style*="…"]` substring match depends on how the browser serialises the style
   * text — which differs between React's rendering and `setProperty`.
   */
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const paths = host.querySelectorAll<SVGPathElement>("path[data-county]");
    paths.forEach((path) => {
      const key = (path.dataset.county ?? "").toUpperCase();
      const shade = shades?.get(key);

      path.dataset.oilBucket = String(shade?.oil ?? 0);
      path.dataset.gasBucket = String(shade?.gas ?? 0);
      path.dataset.oil = shade?.oilLabel ?? "—";
      path.dataset.gas = shade?.gasLabel ?? "—";
    });
  }, [shades]);

  const units =
    state.status === "ready"
      ? [state.data.oilUnit, state.data.gasUnit].filter(Boolean).join(" · ")
      : "";

  return (
    <>
      {/* `aria-busy` so the shading's arrival is announced without a layout change —
          the geometry is already on screen at full size, so nothing shifts. */}
      <div ref={hostRef} aria-busy={state.status === "loading"}>
        {children}
      </div>

      {state.status === "loading" ? (
        <p role="status" className="mt-2 px-1 text-[12px] text-mv-muted">
          <span className="sr-only">Loading county production</span>
          <span
            aria-hidden="true"
            className="inline-block h-3 w-[180px] animate-pulse rounded-md bg-mv-line-soft align-middle"
          />
        </p>
      ) : null}

      {state.status === "error" ? (
        <p
          role="alert"
          className="mt-2 flex flex-wrap items-center gap-2 px-1 text-[12px] text-mv-ink-soft"
        >
          County production could not be loaded, so the map is unshaded.
          <button
            type="button"
            onClick={() => {
              setState({ status: "loading" });
              setNonce((value) => value + 1);
            }}
            className="cursor-pointer rounded-[8px] border border-mv-line bg-white px-[10px] py-[2px] font-semibold text-mv-slate transition-colors hover:border-mv-line-strong hover:bg-mv-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
          >
            Try again
          </button>
        </p>
      ) : null}

      {state.status === "empty" ? (
        <p className="mt-2 px-1 text-[12px] text-mv-muted">
          No per-county production is reported for this operator.
        </p>
      ) : null}

      {/* The legend keys off the metric class, so it recolours with the map. */}
      {state.status === "ready" ? (
        <p className="mt-2 flex flex-wrap items-center gap-2 px-1 text-[12px] text-mv-muted">
          <span>Lower</span>
          {[1, 2, 3, 4, 5].map((bucket) => (
            <span
              key={bucket}
              aria-hidden="true"
              className="tx-key h-[10px] w-[22px] rounded-sm"
              data-bucket={bucket}
            />
          ))}
          <span>Higher</span>
          {units === "" ? null : (
            <span className="ml-1">
              {state.data.counties.length} counties · {units}
            </span>
          )}
        </p>
      ) : null}
    </>
  );
}
