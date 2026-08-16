"use client";

import { useEffect, useMemo, useState } from "react";

import { publicOperatorApiBaseUrl } from "@/lib/operator-api-types";
import {
  fetchProductionGraph,
  type ProductionYear,
} from "@/lib/operator-production-graph";

/**
 * The production chart's data, for one operator and one county selection.
 *
 * WHY THE COUNTY LIST IS A PAYLOAD DETAIL, NOT A UI DETAIL. The endpoint rejects an
 * empty `county` array with 400 `COUNTY_AND_OPERATOR_REQUIRED`, so "all counties"
 * cannot be expressed as "no filter" — it has to be sent as every county the operator
 * reports in. That list comes from `/operators/details`, and sending it whole
 * reconciles with the operator's own lifetime total. Selecting one county sends that
 * one.
 *
 * ONE REQUEST AT A TIME. Each run owns an `AbortController` and the cleanup aborts
 * it, so switching county mid-flight cancels the previous request rather than leaving
 * two in the air. Without that, a slow all-counties reply could land after a fast
 * single-county one and paint the wrong series.
 *
 * STATUS IS DERIVED, NOT SET. The effect never calls `setState` in its body — it only
 * writes from the fetch callbacks. Whether the hook is loading is worked out by
 * comparing the county key being asked for against the key that last resolved, which
 * is both simpler than a status flag and free of the cascading render that a
 * synchronous `setState` in an effect causes.
 */

export type GraphStatus = "idle" | "loading" | "success" | "empty" | "error";

export interface GraphState {
  status: GraphStatus;
  /** The last series that loaded, kept on screen while the next one arrives. */
  data: ProductionYear[] | null;
  error: string | null;
  retry: () => void;
}

/** A resolved result, tagged with the request it answered. */
interface Resolved {
  key: string;
  data: ProductionYear[] | null;
  error: string | null;
}

export function useProductionGraph({
  operatorNumber,
  counties,
}: {
  operatorNumber: string;
  /** Every county to include. One entry for a single-county view. */
  counties: readonly string[];
}): GraphState {
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const [nonce, setNonce] = useState(0);

  /**
   * The payload's county list as a stable primitive. A fresh array identity every
   * render would restart the effect forever; keying on the joined string means the
   * request re-runs only when the selection genuinely changes.
   */
  const countyKey = useMemo(() => [...counties].sort().join("|"), [counties]);

  /** Bumped by `retry`, so a failed request can be reissued unchanged. */
  const requestKey = `${operatorNumber}::${countyKey}::${nonce}`;

  useEffect(() => {
    if (countyKey === "") return;

    const controller = new AbortController();
    let active = true;

    fetchProductionGraph(
      publicOperatorApiBaseUrl(),
      {
        type: "Operator Data",
        operatorNo: operatorNumber,
        county: countyKey.split("|"),
      },
      controller.signal,
    )
      .then((years) => {
        if (active) setResolved({ key: requestKey, data: years, error: null });
      })
      .catch((error: unknown) => {
        // A cancelled request is not a failure — the cleanup superseded it.
        if (!active || controller.signal.aborted) return;
        setResolved({
          key: requestKey,
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
  }, [operatorNumber, countyKey, requestKey]);

  const retry = useMemo(
    () => () => setNonce((value) => value + 1),
    [],
  );

  if (countyKey === "") {
    return { status: "idle", data: null, error: null, retry };
  }

  // Anything not answering the current request is still in flight, so the previous
  // series stays on screen and the chart dims rather than emptying.
  if (resolved?.key !== requestKey) {
    return { status: "loading", data: resolved?.data ?? null, error: null, retry };
  }

  if (resolved.error !== null) {
    return { status: "error", data: null, error: resolved.error, retry };
  }

  const data = resolved.data ?? [];
  return {
    status: data.length === 0 ? "empty" : "success",
    data,
    error: null,
    retry,
  };
}
