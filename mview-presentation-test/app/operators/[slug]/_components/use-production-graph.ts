"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  fetchProductionGraph,
  type ProductionSeries,
} from "@/lib/operator-production-graph";

/**
 * The production chart's data.
 *
 * TWO READS, NOT ONE, and they answer different questions.
 *
 *   `full`  — the operator's whole history for the selected county, fetched with no
 *             year bounds. It fixes the brush's domain and the years under it. Without
 *             it the brush would shrink each time you narrowed the range, and there
 *             would be no way back out.
 *   `range` — the years the reader selected. This is what the chart plots and what the
 *             summary totals come from, and those totals are the API's own sums over
 *             the range rather than something added up here.
 *
 * BEFORE ANY DRAG, THAT IS ONE REQUEST, NOT TWO. With no range selected the two would
 * be byte-identical, so the ranged read is switched off entirely and the full read
 * serves both roles. Firing both would double every first paint for one answer.
 *
 * DRAGGING MUST NOT BECOME A REQUEST PER FRAME. The caller debounces the brush into a
 * settled range; each run here owns an `AbortController` and the cleanup aborts it, so
 * a range the reader has moved past is cancelled rather than left to land late over
 * newer data.
 *
 * STATUS IS DERIVED, NOT SET. The effect never calls `setState` in its body — it only
 * writes from the fetch callbacks. Which state the hook is in is worked out by
 * comparing the key being requested against the key that last resolved, which is both
 * simpler than a flag and free of the extra render a synchronous `setState` in an
 * effect costs.
 */

/**
 * `locked` is a state of its own, not a flavour of `empty`.
 *
 * An operator with nothing filed also returns no rows. Drawing "no production is
 * reported for this operator" at a reader who simply has no account would be a claim
 * about the operator that the request never made — so the chart branches on this
 * before it branches on emptiness.
 */
export type GraphStatus =
  | "loading"
  | "success"
  | "empty"
  | "error"
  | "locked";

export interface YearRange {
  start: number;
  end: number;
}

export interface GraphState {
  status: GraphStatus;
  /** The selected range's series — what the chart plots and the totals come from. */
  range: ProductionSeries | null;
  /** The operator's full history for this county — the brush's domain. */
  full: ProductionSeries | null;
  error: string | null;
  retry: () => void;
}

interface Resolved {
  key: string;
  data: ProductionSeries | null;
  error: string | null;
}

/**
 * One keyed, abortable read.
 *
 * `enabled` is what keeps the unranged case to a single request — see the note above.
 * `build` is held in a ref rather than a dependency because it is a fresh closure every
 * render; as a dependency it would refetch on any unrelated state change.
 */
function useKeyedSeries(
  key: string,
  enabled: boolean,
  build: () => Parameters<typeof fetchProductionGraph>[0],
): Resolved | null {
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const buildRef = useRef(build);
  useEffect(() => {
    buildRef.current = build;
  });

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    let active = true;

    fetchProductionGraph(buildRef.current(), controller.signal)
      .then((data) => {
        if (active) setResolved({ key, data, error: null });
      })
      .catch((error: unknown) => {
        // A cancelled request is not a failure — the cleanup superseded it.
        if (!active || controller.signal.aborted) return;
        setResolved({
          key,
          data: null,
          error:
            error instanceof Error
              ? error.message
              : "Production data is unavailable",
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [key, enabled]);

  return enabled ? resolved : null;
}

export function useProductionGraph({
  operatorNumber,
  county,
  range,
}: {
  operatorNumber: string;
  /** A single county, or null for every county the operator reports in. */
  county: string | null;
  /** The years to plot, or null before the reader has narrowed anything. */
  range: YearRange | null;
}): GraphState {
  const [nonce, setNonce] = useState(0);
  const countyKey = county ?? "*";

  const fullKey = `full:${operatorNumber}:${countyKey}:${nonce}`;
  const rangeKey =
    range === null
      ? fullKey
      : `range:${operatorNumber}:${countyKey}:${range.start}-${range.end}:${nonce}`;

  const fullResolved = useKeyedSeries(fullKey, true, () => ({
    operatorNo: operatorNumber,
    ...(county === null ? {} : { county }),
  }));

  // Off until a range exists, so the first paint costs one request.
  const rangeResolved = useKeyedSeries(rangeKey, range !== null, () => ({
    operatorNo: operatorNumber,
    ...(county === null ? {} : { county }),
    ...(range === null ? {} : { start_year: range.start, end_year: range.end }),
  }));

  const retry = useMemo(() => () => setNonce((value) => value + 1), []);

  const full = fullResolved?.key === fullKey ? fullResolved.data : null;

  /* With no range selected, the full history IS the plotted series. */
  const active = range === null ? fullResolved : rangeResolved;
  const activeKey = range === null ? fullKey : rangeKey;
  const isCurrent = active !== null && active.key === activeKey;

  if (isCurrent && active.error !== null) {
    return { status: "error", range: null, full, error: active.error, retry };
  }

  if (!isCurrent) {
    // The previous series stays on screen while the next one arrives, so narrowing
    // the range dims the chart rather than emptying it.
    return {
      status: "loading",
      range: active?.data ?? null,
      full,
      error: null,
      retry,
    };
  }

  /* Before the emptiness check, and that ordering is the point: a locked read returns
     no rows, so falling through would draw "no production is reported for this
     operator" — a statement about the operator, from a request that was never made. */
  if (active.data?.locked === true) {
    return { status: "locked", range: null, full: null, error: null, retry };
  }

  const rows = active.data?.rows ?? [];
  return {
    status: rows.length === 0 ? "empty" : "success",
    range: active.data,
    full,
    error: null,
    retry,
  };
}
