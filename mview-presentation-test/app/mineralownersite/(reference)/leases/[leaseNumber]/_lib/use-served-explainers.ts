"use client";

import { useEffect, useState } from "react";

import {
  fetchLeaseExplainers,
  type ExplainerQuery,
} from "../../_api/leases-api";
import type { Explainer } from "../_components/explainer-drawer";
import { explainersFromApi } from "./explainers-from-api";

/**
 * THE SERVICE'S DRAWERS FOR ONE TAB, KEYED BY THE NAME A TILE OPENS.
 *
 * ── ONE READ PER TAB, NOT ONE PER TILE ──
 *
 * `/leases/explainers` answers with every panel the tab has — seven on the
 * lease report, six on each of the other two — so this runs once when the tab
 * is on screen and every tile reads from what came back. Fetching on the click
 * instead would put a spinner inside a drawer that exists to explain a figure
 * already printed beside it.
 *
 * It is NOT prefetched across tabs: the reservoir's panels are about a rock the
 * reader may never open, and the endpoint takes a lease to answer for.
 *
 * ── AN EMPTY MAP IS THE ANSWER ON THE FIXTURE PATH ──
 *
 * The ten sample leases have no id to ask about, so callers pass `null` and get
 * an empty map back — every tile then falls through to the locally composed
 * panel it used before. The same happens on a failed read: a drawer is an
 * explanation of a figure that is already correct on the page, so losing the
 * service's version costs the reader the better wording and nothing else. It
 * is not worth an error card.
 */

const EMPTY: Map<string, Explainer> = new Map();

export function useServedExplainers(
  query: ExplainerQuery | null,
): Map<string, Explainer> {
  const [byKey, setByKey] = useState<Map<string, Explainer>>(EMPTY);

  /* Spread into primitives so the effect compares VALUES. A fresh object
     literal from the caller's render would re-run this on every render of the
     tab, whatever caused it. */
  const { id, tab, scope, reservoirKey, api10 } = query ?? {};
  const asked = `${id}|${tab}|${scope}|${reservoirKey}|${api10}`;

  /* ── WHAT WAS ASKED LAST, SO A STALE ANSWER IS NEVER SHOWN ──
     Changing lease, scope, rock or hole makes every panel in hand wrong, and
     the new read has not landed yet. Cleared during render rather than in the
     effect: the tiles fall back to their local panels for the moment in
     between, instead of opening the previous subject's drawer. */
  const [lastAsked, setLastAsked] = useState(asked);
  if (asked !== lastAsked) {
    setLastAsked(asked);
    setByKey(EMPTY);
  }

  useEffect(() => {
    if (!id || !tab) return;

    const controller = new AbortController();

    fetchLeaseExplainers(
      { id, tab, scope, reservoirKey, api10 },
      controller.signal,
    )
      .then((wire) => {
        if (!controller.signal.aborted) setByKey(explainersFromApi(wire));
      })
      /* See the note above: the figures do not depend on this. */
      .catch(() => {});

    return () => controller.abort();
  }, [id, tab, scope, reservoirKey, api10]);

  return byKey;
}
