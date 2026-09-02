"use client";

import { useState, type ReactNode } from "react";

import { gates } from "../../_components/ui/portal-gating";
import {
  matchesAlertFilter,
  type AlertFilter,
  type AlertFilterFields,
} from "../_lib/alert-filters";
import { AlertFilterBar } from "./alert-filter-bar";
import { AlertSearchBox } from "./alert-search-box";
import { useAlertsRead } from "./alerts-read-state";

/**
 * THE INBOX — search, filter, and the nine rows.
 *
 * ── IT IS A CLIENT SHELL AROUND SERVER-RENDERED ROWS ──
 *
 * The rows arrive already rendered, as `item.row`. This is the same arrangement
 * `LeasesTabs` uses next door and for the same reason: the interactive part is
 * a search string and a selected pill, and none of the CONTENT needs to be in
 * the browser to support them.
 *
 * The saving is not incidental. Each row carries a four-heading explainer, and
 * nine of those is most of the page's text; shipping them as JSX so that a
 * `String.includes` could run in the browser would put the entire page in the
 * bundle to filter it. What crosses the boundary instead is four short strings
 * per row (`AlertFilterFields`) plus finished markup.
 *
 * ── HIDING, NOT UNMOUNTING ──
 *
 * A filtered-out row is `hidden`, exactly as the reference sets `display:none`.
 * Two reasons, and the second is the load-bearing one:
 *
 *   · An open explainer stays open when the reader clears the search. Unmounting
 *     would collapse every `<details>` they had opened, which is the state most
 *     worth preserving on this page.
 *   · The rows are server-rendered nodes handed in as props. Removing them from
 *     the tree and putting them back is churn for no gain when the total is nine.
 *
 * ── SEARCH AND FILTER ARE `hide-s`, THE LIST IS NOT ──
 *
 * Essentials gets the alerts and the one-line summary above them; Detailed and
 * Professional get the query tools. Ultra gets neither — `portal.css` hides this
 * whole section, because Ultra is one headline and one action.
 */

export interface AlertInboxItem extends AlertFilterFields {
  id: string;
  /** The finished row, rendered on the server. */
  row: ReactNode;
}

export function AlertInbox({ items }: { items: AlertInboxItem[] }) {
  const { allRead } = useAlertsRead();
  const [filter, setFilter] = useState<AlertFilter>("all");
  const [query, setQuery] = useState("");

  /* A Set of ids rather than a filtered array, because the render below asks
     "is this one visible?" nine times and the empty state asks "are none?" once.
     A filtered array answers the second well and the first by scanning. */
  const visibleIds = new Set(
    items
      .filter((item) => matchesAlertFilter(item, filter, query))
      .map((item) => item.id),
  );

  function clearAndShowAll() {
    setQuery("");
    setFilter("all");
  }

  return (
    <section aria-label="Your alerts">
      <div className={gates("hideInEssentials")}>
        <AlertSearchBox value={query} onChange={setQuery} />

        {visibleIds.size === 0 && (
          <p className="mt-2 text-[11px] text-mv-muted">
            No alerts match that search — clear it or switch the filter back to{" "}
            <button
              type="button"
              onClick={clearAndShowAll}
              className="cursor-pointer border-0 bg-transparent p-0 font-bold text-mv-green-deep underline"
            >
              All
            </button>
            .
          </p>
        )}

        <AlertFilterBar value={filter} onChange={setFilter} />
      </div>

      {/*
        `data-all-read` IS WHAT "MARK ALL READ" ACTUALLY DOES. Every row states
        its unread styling with a `group-data-[all-read=true]/inbox:` revert, so
        flipping this one attribute turns nine green edges off without a single
        row re-rendering. See the note in `alert-row.tsx`.
      */}
      <div
        className="group/inbox flex flex-col gap-2.5"
        data-all-read={allRead}
      >
        {items.map((item) => (
          <div key={item.id} hidden={!visibleIds.has(item.id)}>
            {item.row}
          </div>
        ))}
      </div>
    </section>
  );
}
