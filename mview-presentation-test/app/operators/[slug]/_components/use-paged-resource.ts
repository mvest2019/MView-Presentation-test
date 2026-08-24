"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { PagedResult } from "@/lib/operator-leases-api";

/**
 * One page of a filtered, abortable server read.
 *
 * Both tables in the leases section want the same thing — fetch a page, cancel the
 * previous request when the filters move, keep the last good rows on screen while the
 * next page arrives, and report loading / empty / error without the caller tracking
 * flags. That is one hook, not two nearly identical ones.
 *
 * THE KEY IS THE REQUEST. Everything that changes what is fetched belongs in
 * `requestKey`; the effect depends on that string and nothing else. `load` is held in a
 * ref rather than a dependency because it is a fresh closure every render — as a
 * dependency it would refetch on every keystroke that touched any state at all.
 *
 * STATUS IS DERIVED, NOT SET. The effect only writes from the fetch's callbacks. Which
 * state the hook is in is worked out by comparing the key being requested against the
 * key that last resolved, which avoids the extra render a synchronous `setState` in an
 * effect costs — and the lint rule that rightly flags it.
 *
 * THE PREVIOUS PAGE SURVIVES THE NEXT. `rows` keeps the last resolved page while a new
 * one is in flight, so paging dims the table instead of blanking it and the section
 * does not collapse and reflow under the reader.
 */

export type ResourceStatus = "idle" | "loading" | "success" | "empty" | "error";

export interface ResourceState<T> {
  status: ResourceStatus;
  rows: T[];
  /** Rows matching the filters across every page. */
  total: number;
  error: string | null;
  retry: () => void;
}

interface Resolved<T> {
  key: string;
  data: PagedResult<T> | null;
  error: string | null;
}

export function usePagedResource<T>({
  requestKey,
  enabled = true,
  load,
}: {
  /** Every input that changes the response, joined into one string. */
  requestKey: string;
  /** False parks the hook in `idle` without fetching — e.g. no lease is open. */
  enabled?: boolean;
  load: (signal: AbortSignal) => Promise<PagedResult<T>>;
}): ResourceState<T> {
  const [resolved, setResolved] = useState<Resolved<T> | null>(null);
  const [nonce, setNonce] = useState(0);

  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  /** Bumped by `retry`, so a failed request can be reissued unchanged. */
  const key = `${requestKey}::${nonce}`;

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    let active = true;

    loadRef
      .current(controller.signal)
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
            error instanceof Error ? error.message : "This could not be loaded",
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [key, enabled]);

  const retry = useMemo(() => () => setNonce((value) => value + 1), []);

  if (!enabled) {
    return { status: "idle", rows: [], total: 0, error: null, retry };
  }

  if (resolved?.key !== key) {
    return {
      status: "loading",
      rows: resolved?.data?.rows ?? [],
      total: resolved?.data?.total ?? 0,
      error: null,
      retry,
    };
  }

  if (resolved.error !== null) {
    return {
      status: "error",
      rows: [],
      total: 0,
      error: resolved.error,
      retry,
    };
  }

  const data = resolved.data ?? { rows: [], total: 0 };
  return {
    status: data.rows.length === 0 ? "empty" : "success",
    rows: data.rows,
    total: data.total,
    error: null,
    retry,
  };
}
