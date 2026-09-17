"use client";

import { useEffect, useState, type ReactNode } from "react";

import { Card } from "../../../_components/ui/card";
import { Notice } from "../../../_components/ui/notice";
import { portalGate } from "../../../_components/ui/portal-gating";
import { usePortalViewState } from "../../../_components/reference/view-state";
import { fetchLeaseList, LeasesApiError } from "../_api/leases-api";
import { sampleLeaseRecords } from "../_lib/sample-leases";
import type { LeaseRecord } from "../_lib/lease-types";
import { LeaseListPanel } from "./list/lease-list-panel";
import { LeasesTabs, type LeaseTab } from "./leases-tabs";
import { PlainEnglishList } from "./plain-english-list";

/**
 * THE LEASES THEMSELVES — read once, drawn twice.
 *
 * Essentials shows `PlainEnglishList` and every tier above it shows the table
 * inside `LeasesTabs`. Those are two renderings of ONE answer, so one component
 * owns the answer and hands it to both. Before this they each read the fixture
 * for themselves, which was fine while there was only ever one set to read.
 *
 * ── WHERE THE LEASES COME FROM DEPENDS ON THE FUNNEL STATE ──
 *
 *   NOT CLAIMED   the sample set, and NO REQUEST IS MADE. There is nothing on
 *                 the server to ask for — the whole point of the state is that
 *                 the visitor has not claimed a record — and asking anyway
 *                 would spend a round trip to be told so.
 *
 *   ANYTHING ELSE `GET /api/v1/leases`, the member's own leases, through the
 *                 module's API layer. See `_api/leases-api.ts` for the paging
 *                 and `app/api/leases/[endpoint]/route.ts` for why the call
 *                 goes through our own origin.
 *
 * The state comes from `usePortalViewState()` — the shared shell's, the same
 * context the density reads from, so the account-state button in the top bar
 * switches this the way it switches everything else and the URL is not
 * involved.
 *
 * ── IT RENDERS A FRAGMENT, AND THAT IS LOAD-BEARING ──
 *
 * `portalGate.pageRoot` gates DIRECT CHILDREN of the page root: Ultra hides
 * every child that is not `.tier-u`, and `hide-s` hides the tab block at
 * Essentials. A wrapper `<div>` here would make both of those children of a
 * child, and the page would stop responding to density at all. A fragment adds
 * no element, so the two blocks stay exactly where the page put them — see the
 * note on the flat tree in `leases/page.tsx`.
 *
 * ── THE FINANCIALS AND THE STATEMENTS PASS STRAIGHT THROUGH ──
 *
 * They arrive as `ReactNode` from the server page and are handed to `LeasesTabs`
 * untouched, so they stay server-rendered: this component is a client boundary
 * for the lease list, not for the other two tabs.
 */
export function LeaseListSection({
  defaultTab,
  financials,
  statements,
}: {
  defaultTab: LeaseTab;
  financials: ReactNode;
  statements: ReactNode;
}) {
  const view = usePortalViewState();
  const unclaimed = view?.funnel === "unclaimed";

  const [loaded, setLoaded] = useState<LeaseRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /* Nothing to read for a visitor with no claim — the sample stands in, and
       it is already in the bundle. */
    if (unclaimed) return;

    const controller = new AbortController();
    let live = true;

    fetchLeaseList(controller.signal)
      .then((list) => {
        if (live) setLoaded(list.leases);
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

  /* THE SAMPLE IS NOT A FALLBACK FOR A FAILED READ. It is what an unclaimed
     visitor is shown on purpose; putting it up when a claimed member's request
     fails would tell them their record holds ten leases it does not. */
  const leases = unclaimed ? sampleLeaseRecords : loaded;

  if (!leases) {
    return error ? (
      <Notice tone="amber" glyph="⚠">
        {error}
      </Notice>
    ) : (
      <LeasesLoading />
    );
  }

  return (
    <>
      <PlainEnglishList leases={leases} />

      {/* HIDDEN AT ESSENTIALS — see the note this moved from, in
          `leases/page.tsx`. The plain list above is the Essentials view of the
          same leases, and both on one screen is the same list twice. */}
      <div className={portalGate.hideInEssentials}>
        <LeasesTabs
          defaultTab={defaultTab}
          leases={<LeaseListPanel leases={leases} />}
          financials={financials}
          statements={statements}
        />
      </div>
    </>
  );
}

/**
 * WHILE THE RECORD IS ON ITS WAY.
 *
 * A block the height the toolbar and the first rows occupy, so the page below
 * does not jump when the leases land. `aria-busy` with a live label, because a
 * screen reader gets nothing from a grey rectangle.
 */
function LeasesLoading() {
  return (
    <Card padded={false} className="px-[18px] py-4" aria-busy="true">
      <span className="sr-only" aria-live="polite">
        Loading your leases…
      </span>
      <div className="h-[420px] animate-pulse rounded-mv bg-mv-portal-wash" />
    </Card>
  );
}
