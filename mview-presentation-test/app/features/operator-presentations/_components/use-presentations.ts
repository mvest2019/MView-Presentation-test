"use client";

import { useEffect, useState } from "react";

import type {
  PresentationRecord,
  PresentationsResult,
} from "@/lib/operator-presentations-shape";

/**
 * One page of the presentation library, for the applied filters.
 *
 * IT WATCHES THE *APPLIED* FILTERS, NOT THE FORM. The controls are a draft until
 * "Apply filters" is pressed, so typing a date or opening the operator list makes no
 * request. That is the behaviour asked for, and it is also what keeps a half-entered
 * date range — which the endpoint would accept and silently ignore — from ever being
 * sent.
 *
 * A PAGE CHANGE IS A NEW KEY, not a new mechanism: paging and filtering go through
 * the same request and the same cache, so returning to page 1 after visiting page 4
 * is answered from memory.
 *
 * STATUS IS DERIVED FROM THE CACHE rather than mirrored into state, so a page already
 * held renders in the same pass with no skeleton flash — and there is no `setState`
 * in the effect body to cascade a second render.
 *
 * A SUPERSEDED REQUEST IS ABORTED, so clicking through pages quickly cannot let an
 * earlier page land over a later one.
 */

export interface PresentationsQueryInput {
  /** The chosen operator's name, or "" for every operator. */
  operator: string;
  /** `YYYY-MM-DD`, or "" — always sent as a pair or not at all. */
  from: string;
  to: string;
  page: number;
}

export type PresentationsState =
  | { status: "loading" }
  | { status: "ready"; result: PresentationsResult }
  | { status: "error" };

function keyOf(input: PresentationsQueryInput): string {
  return JSON.stringify([input.operator, input.from, input.to, input.page]);
}

const cache = new Map<string, PresentationsResult | null>();

export function usePresentations(input: PresentationsQueryInput): {
  state: PresentationsState;
  retry: () => void;
} {
  const [, setResolvedCount] = useState(0);

  const key = keyOf(input);
  const answered = cache.get(key);

  useEffect(() => {
    if (cache.has(key)) return;

    const [operator, from, to, page] = JSON.parse(key) as [
      string,
      string,
      string,
      number,
    ];
    const params = new URLSearchParams({ page: String(page) });
    if (operator) params.set("operator", operator);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const controller = new AbortController();

    fetch(`/api/operators/presentations?${params}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Failed (${response.status})`);
        cache.set(key, (await response.json()) as PresentationsResult);
      })
      .catch(() => {
        // An aborted request was superseded, not failed — caching a failure under
        // this key would poison a page the visitor may come back to.
        if (controller.signal.aborted) return;
        cache.set(key, null);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setResolvedCount((count) => count + 1);
      });

    return () => controller.abort();
  }, [key]);

  const state: PresentationsState =
    answered === undefined
      ? { status: "loading" }
      : answered === null
        ? { status: "error" }
        : { status: "ready", result: answered };

  return {
    state,
    retry: () => {
      cache.delete(key);
      setResolvedCount((count) => count + 1);
    },
  };
}

export type { PresentationRecord, PresentationsResult };
