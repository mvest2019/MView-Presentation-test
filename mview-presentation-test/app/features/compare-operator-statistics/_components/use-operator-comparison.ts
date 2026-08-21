"use client";

import { useEffect, useState } from "react";

import { MIN_OPERATORS } from "@/lib/operator-statistics";
import type { StatisticsOperatorData } from "@/lib/operator-statistics-shape";

/**
 * The comparison for whichever operators are selected.
 *
 * ONE REQUEST FOR THE WHOLE SELECTION. `/api/operators/compare` returns every
 * operator together, so picking a second one costs a single round trip rather than
 * one per slot — and adding a third replaces that request instead of adding to it.
 *
 * NOTHING IS REQUESTED BELOW THE MINIMUM. One operator is not a comparison, so a
 * lone selection stays `idle`, makes no request, and leaves the page on its prompt.
 * That also means the page's first paint costs nothing: it opens empty.
 *
 * STATUS IS DERIVED FROM A CACHE, NOT MIRRORED INTO STATE. The key is the selected
 * names sorted, so picking A then B and picking B then A are the same entry — and
 * removing an operator and putting it back is answered without a request. A cache
 * hit resolves in the same render pass, which is what keeps a re-selection from
 * flashing a skeleton. (Mirroring the result into state would also trip
 * `react-hooks/set-state-in-effect`.)
 *
 * A SUPERSEDED REQUEST IS ABORTED, so changing the selection twice quickly cannot
 * let the older comparison land over the newer one.
 */

export type ComparisonState =
  /** Fewer than two operators chosen — nothing to compare and nothing requested. */
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "ready";
      operators: StatisticsOperatorData[];
      /**
       * The years every `trend` array is indexed by, from the response.
       *
       * They travel with the operators because the trend figures are positional: a
       * client that assumed a fixed window would mislabel a column the moment the
       * API's own years moved, which is exactly what the old hardcoded 2021–2025
       * window did to 2026.
       */
      years: number[];
    }
  | { status: "error" };

/**
 * Sorted, so the same set of operators is one cache entry however it was reached.
 *
 * JSON rather than a joined string: operator names contain spaces, commas and
 * ampersands, so any plain separator risks either colliding with a name or — worse
 * — being an invisible control character that turns the source file binary.
 */
function keyOf(names: readonly string[]): string {
  return JSON.stringify([...names].sort());
}

/** What one resolved comparison holds. */
interface CachedComparison {
  operators: StatisticsOperatorData[];
  years: number[];
}

/** key → the comparison, or null for a failure. Shared for the life of the page. */
const comparisonCache = new Map<string, CachedComparison | null>();

export function useOperatorComparison(selected: readonly string[]): {
  state: ComparisonState;
  retry: () => void;
} {
  const [, setResolvedCount] = useState(0);

  const key = selected.length >= MIN_OPERATORS ? keyOf(selected) : "";
  const answered = key === "" ? undefined : comparisonCache.get(key);

  useEffect(() => {
    if (key === "" || comparisonCache.has(key)) return;

    const controller = new AbortController();
    const names: string[] = JSON.parse(key);
    const query = names
      .map((name) => `names=${encodeURIComponent(name)}`)
      .join("&");

    fetch(`/api/operators/compare?${query}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(`Comparison failed (${response.status})`);
        const payload: {
          operators?: StatisticsOperatorData[];
          years?: number[];
        } = await response.json();
        comparisonCache.set(key, {
          operators: payload.operators ?? [],
          years: payload.years ?? [],
        });
      })
      .catch(() => {
        // An aborted request was superseded, not failed — the newer selection owns
        // the state and caching a failure here would poison its key.
        if (controller.signal.aborted) return;
        comparisonCache.set(key, null);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setResolvedCount((count) => count + 1);
      });

    return () => controller.abort();
  }, [key]);

  const state: ComparisonState =
    key === ""
      ? { status: "idle" }
      : answered === undefined
        ? { status: "loading" }
        : answered === null
          ? { status: "error" }
          : {
              status: "ready",
              operators: answered.operators,
              years: answered.years,
            };

  return {
    state,
    retry: () => {
      if (key === "") return;
      comparisonCache.delete(key);
      setResolvedCount((count) => count + 1);
    },
  };
}
