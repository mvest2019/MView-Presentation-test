"use client";

import { useEffect, useState } from "react";

import {
  hasProductionSelection,
  productionFiltersKey,
  productionFiltersToQuery,
} from "@/lib/operator-production-filters";
import type {
  ProductionFilters,
  ProductionInfo,
  ProductionSeries,
} from "@/lib/operator-production-shape";

/**
 * The two reads behind Compare Operator Production.
 *
 * ONE HOOK PER ENDPOINT, AND NEITHER FIRES THE OTHER'S REQUEST. The figures come from
 * `/api/operators/production-info`, the chart's series from
 * `/api/operators/production-series`, and each is asked for only where it is used —
 * `useProductionSeries` is called inside the chart card, which the page mounts lazily,
 * so a visitor who applies filters and reads the cards never pays for the series at
 * all. That is the whole reason the two endpoints are not folded into one route.
 *
 * NOTHING IS REQUESTED UNTIL FILTERS ARE APPLIED. The hooks take the APPLIED filter
 * set, not the draft one, so editing a dropdown costs nothing — no request fires until
 * Apply produces a new value. With no operator chosen there is nothing to compare, so
 * the state stays `idle`, no request is made, and the page shows its prompt. The first
 * paint therefore costs zero requests.
 *
 * STATUS IS DERIVED FROM A CACHE, NOT MIRRORED INTO STATE. The key is the filter set,
 * sorted, so the same scope reached by a different route is one entry — and re-applying
 * a set already asked for resolves in the same render pass rather than flashing a
 * skeleton. Mirroring the result into state would also trip
 * `react-hooks/set-state-in-effect`.
 *
 * THE EFFECT DEPENDS ON THE KEY, NOT THE FILTER OBJECT. The key is a string, so a
 * caller that rebuilds an identical filters object on every render does not re-fire the
 * request — which is exactly what would happen if the object were the dependency.
 *
 * A SUPERSEDED REQUEST IS ABORTED, so applying twice quickly cannot let the older
 * comparison land over the newer one.
 */

export type ResourceState<T> =
  /** No operator chosen — nothing to compare and nothing requested. */
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error" };

const EMPTY_INFO: ProductionInfo = {
  operators: [],
  leaders: {
    highestOil: null,
    highestGas: null,
    mostEfficient: null,
    widestFootprint: null,
  },
  totalOperators: 0,
  locked: false,
};

const EMPTY_SERIES: ProductionSeries = { years: [], operators: [], locked: false };

/**
 * The shared state machine, parameterised by which endpoint it reads.
 *
 * Not exported: the two wrappers below are the API. A generic "fetch some JSON" hook
 * would invite callers that do not want this idle rule.
 *
 * NO CACHE, BY REQUIREMENT. Each of these used to keep a module-level `Map` keyed by
 * the filter set and shared for the life of the page, so re-applying a set already
 * seen was answered without a request. Both are gone. The state below holds ONE
 * entry, tagged with the key it belongs to, so a change of filters makes it stale at
 * once and a previous response can never be read back — not even for the same
 * filters a moment later.
 *
 * THE TAG IS ALSO WHAT MAKES A LATE REPLY HARMLESS: `answered` is read only while
 * `resolved.key` is still the key on screen, so a response that lands after the
 * filters moved on is ignored by derivation rather than by a second `setState`.
 */
function useProductionResource<T>(
  filters: ProductionFilters,
  path: string,
  read: (payload: unknown) => T,
): { state: ResourceState<T>; retry: () => void } {
  const [resolved, setResolved] = useState<{
    key: string;
    value: T | null;
  } | null>(null);
  /** Bumped by `retry`, so the same key can be requested again. */
  const [attempt, setAttempt] = useState(0);

  const key = hasProductionSelection(filters)
    ? productionFiltersKey(filters)
    : "";
  const answered =
    key !== "" && resolved?.key === key ? resolved.value : undefined;
  const query = key === "" ? "" : productionFiltersToQuery(filters);

  useEffect(() => {
    if (key === "") return;

    const controller = new AbortController();

    fetch(`${path}?${query}`, {
      signal: controller.signal,
      /* The response depends on whether the reader is signed in, so a replayed
         copy is wrong in both directions. The route sends `private, no-store`;
         this governs what the browser already holds. */
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(`Request failed (${response.status})`);
        setResolved({ key, value: read(await response.json()) });
      })
      .catch(() => {
        // An aborted request was superseded, not failed — the newer filter set owns
        // the state, and recording a failure against this key would misreport it.
        if (controller.signal.aborted) return;
        setResolved({ key, value: null });
      });

    return () => controller.abort();
    // `query` is a pure function of `key`, and `path`/`read` are module constants —
    // `key` alone is the identity of this request; `attempt` is `retry` asking again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const state: ResourceState<T> =
    key === ""
      ? { status: "idle" }
      : answered === undefined
        ? { status: "loading" }
        : answered === null
          ? { status: "error" }
          : { status: "ready", data: answered };

  return {
    state,
    retry: () => {
      if (key === "") return;
      // Back to loading, then a fresh request for the same key.
      setResolved(null);
      setAttempt((count) => count + 1);
    },
  };
}

/** The operators, their figures and the four leader tiles. */
export function useProductionInfo(filters: ProductionFilters) {
  return useProductionResource<ProductionInfo>(
    filters,
    "/api/operators/production-info",
    (payload) => (payload as { info?: ProductionInfo }).info ?? EMPTY_INFO,
  );
}

/** The annual series behind the chart. Called from inside the chart card only. */
export function useProductionSeries(filters: ProductionFilters) {
  return useProductionResource<ProductionSeries>(
    filters,
    "/api/operators/production-series",
    (payload) =>
      (payload as { series?: ProductionSeries }).series ?? EMPTY_SERIES,
  );
}
