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
      /** True when the response withheld the volumes behind the sign-in gate. */
      locked: boolean;
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

/** What the current comparison holds. */
interface ResolvedComparison {
  operators: StatisticsOperatorData[];
  years: number[];
  locked: boolean;
}

export function useOperatorComparison(selected: readonly string[]): {
  state: ComparisonState;
  retry: () => void;
} {
  /**
   * The CURRENT selection's answer, and nothing else.
   *
   * NO CACHE, BY REQUIREMENT. This used to be a module-level `Map` keyed by the
   * selection and shared for the life of the page, so re-picking a set already seen
   * was answered without a request. That is gone: the state holds one entry, it is
   * tagged with the key it belongs to, and any change of key makes it stale
   * immediately — so a previous response can never be read back, not even for the
   * same operators a moment later.
   *
   * IT IS TAGGED RATHER THAN CLEARED because the tag is what makes a late response
   * harmless: `answered` is only read when `resolved.key` is still the key being
   * displayed, so a reply that arrives after the selection moved on is ignored by
   * derivation instead of by a second `setState`.
   */
  const [resolved, setResolved] = useState<{
    key: string;
    value: ResolvedComparison | null;
  } | null>(null);
  /** Bumped by `retry`, so the same key can be requested again. */
  const [attempt, setAttempt] = useState(0);

  const key = selected.length >= MIN_OPERATORS ? keyOf(selected) : "";
  const answered =
    key !== "" && resolved?.key === key ? resolved.value : undefined;

  useEffect(() => {
    if (key === "") return;

    const controller = new AbortController();
    const names: string[] = JSON.parse(key);
    const query = names
      .map((name) => `names=${encodeURIComponent(name)}`)
      .join("&");

    fetch(`/api/operators/compare?${query}`, {
      signal: controller.signal,
      /*
       * NEVER FROM THE BROWSER'S CACHE. The answer depends on who is asking, so a
       * replayed copy is wrong in both directions — a signed-out reader served a
       * member's volumes, or a member served the locked copy. The route also sends
       * `private, no-store`; this is the half that governs what is already held.
       */
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(`Comparison failed (${response.status})`);
        const payload: {
          operators?: StatisticsOperatorData[];
          years?: number[];
          locked?: boolean;
        } = await response.json();
        setResolved({
          key,
          value: {
            operators: payload.operators ?? [],
            years: payload.years ?? [],
            /* Absent reads as "not gated" — the safe default is showing what
               arrived, since a withheld field is visibly withheld anyway. */
            locked: payload.locked === true,
          },
        });
      })
      .catch(() => {
        // An aborted request was superseded, not failed — the newer selection owns
        // the state, and recording a failure against this key would misreport it.
        if (controller.signal.aborted) return;
        setResolved({ key, value: null });
      });

    return () => controller.abort();
  }, [key, attempt]);

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
              locked: answered.locked,
            };

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
