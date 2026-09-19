"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { usePortalViewState } from "../../../_components/reference/view-state";
import {
  fetchLeaseList,
  LeasesApiError,
  type LeaseTotals,
} from "../_api/leases-api";
import { sampleLeaseRecords } from "../_lib/sample-leases";
import { totalsFromRecords } from "../_lib/lease-totals";
import type { LeaseRecord } from "../_lib/lease-types";

/**
 * THE RECORD, READ ONCE, FOR EVERY BLOCK ON THE PAGE THAT PRINTS IT.
 *
 * Four things on My Leases describe the same record — the subtitle under the
 * title, the five-figure value band, the plain-English list and the table — and
 * before this each read its own fixture. One network answer cannot be fetched
 * four times, and four blocks disagreeing about how many leases there are is
 * the failure this exists to prevent.
 *
 * ── A CONTEXT, NOT A WRAPPER ELEMENT ──
 *
 * `portalGate.pageRoot` gates DIRECT CHILDREN of the page root: Ultra hides
 * every child that is not `.tier-u`, and `hide-s` hides the tab block at
 * Essentials. A `<div>` around the page would make all of them children of a
 * child and the density gates would stop reaching anything. A context provider
 * renders NO DOM node, so the blocks stay exactly where the page put them —
 * see the note on the flat tree in `leases/page.tsx`.
 *
 * It also lets the blocks it feeds stay where they are in that file, so the
 * page still reads as the running order it documents.
 *
 * ── WHERE THE FIGURES COME FROM DEPENDS ON THE FUNNEL STATE ──
 *
 *   NOT CLAIMED   the sample set, and NO REQUEST IS MADE. There is nothing on
 *                 the server to ask for, and the totals are summed from the
 *                 sample leases so the band and the list agree with each other.
 *
 *   ANYTHING ELSE `GET /api/v1/leases`, the member's own record. The totals are
 *                 the SERVICE'S `totals` block, not a sum of the rows — see
 *                 `LeaseTotals` for why that distinction matters.
 *
 * The state comes from `usePortalViewState()`, the shared shell's, so the
 * account-state button in the top bar switches this the way it switches
 * everything else and no URL is involved.
 */

export interface LeasesData {
  /** `null` until the answer arrives. */
  leases: LeaseRecord[] | null;
  /** `null` until the answer arrives. */
  totals: LeaseTotals | null;
  /** The roll owner, or "" when unknown. */
  ownerName: string;
  /** A readable failure, or `null`. */
  error: string | null;
  /** True while the first read is still out. */
  loading: boolean;
}

const Ctx = createContext<LeasesData | null>(null);

/**
 * The record, or `null` outside the provider.
 *
 * NULLABLE ON PURPOSE, the same contract `usePortalViewState` uses: a component
 * that can render outside the page has to say what it does then, rather than
 * being handed a default that looks like a real answer.
 */
export function useLeasesData(): LeasesData | null {
  return useContext(Ctx);
}

export function LeasesDataProvider({ children }: { children: ReactNode }) {
  const view = usePortalViewState();
  const unclaimed = view?.funnel === "unclaimed";

  const [loaded, setLoaded] = useState<{
    leases: LeaseRecord[];
    totals: LeaseTotals;
    ownerName: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /* Nothing to read for a visitor with no claim — the sample stands in, and
       it is already in the bundle. */
    if (unclaimed) return;

    const controller = new AbortController();
    let live = true;

    fetchLeaseList(controller.signal)
      .then((list) => {
        if (live)
          setLoaded({
            leases: list.leases,
            totals: list.totals,
            ownerName: list.ownerName,
          });
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || !live) return;
        setError(
          cause instanceof LeasesApiError
            ? cause.message
            : "Could not load your leases.",
        );
      });

    return () => {
      live = false;
      controller.abort();
    };
  }, [unclaimed]);

  const value = useMemo<LeasesData>(() => {
    /* THE SAMPLE IS NOT A FALLBACK FOR A FAILED READ. It is what an unclaimed
       visitor is shown on purpose; putting it up when a claimed member's
       request fails would tell them their record holds leases it does not. */
    if (unclaimed) {
      return {
        leases: sampleLeaseRecords,
        totals: totalsFromRecords(sampleLeaseRecords),
        ownerName: "",
        error: null,
        loading: false,
      };
    }
    return {
      leases: loaded?.leases ?? null,
      totals: loaded?.totals ?? null,
      ownerName: loaded?.ownerName ?? "",
      error,
      loading: !loaded && !error,
    };
  }, [unclaimed, loaded, error]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
