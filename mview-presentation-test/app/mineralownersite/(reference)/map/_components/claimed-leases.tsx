"use client";

/**
 * MY LEASES — the leases this member has claimed, at the head of the filter
 * rail.
 *
 * Fed by `GET /api/v1/map/claimed-wells?member_id=`. The rail's other sections
 * are facets of the whole public record; this one is the reader's own holding,
 * which is why it sits above them rather than among them.
 *
 * ── THE THREE STATES, ALL OF THEM ──
 *
 * Loading, failed and empty are each rendered, and each says something
 * different. A section that renders nothing while it waits and nothing when it
 * fails has told the reader the same thing about two different situations —
 * and "you have no claimed leases" is a third thing again, which an owner who
 * has just claimed some would read as their claim being lost.
 *
 * ── WHY IT FILTERS LOCALLY ──
 *
 * 782 leases came back for the member this was built against, and a list that
 * long is only usable with a way into it. The rows are already in hand, so the
 * box sifts what is loaded rather than asking the service again — unlike the
 * Operator facet beside it, which is paged and has to.
 */

import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { type MapClaimedLease } from "@/lib/map-api";

import { Checkbox } from "./checkbox";
import {
  useClaimed,
  useClaimedDismiss,
  useClaimedSelection,
} from "./claimed-context";

/** How many rows show before the list scrolls inside itself. */
const VISIBLE_ROWS = 6;

/** One shared empty array, so "not loaded yet" has a stable identity. */
const EMPTY: MapClaimedLease[] = [];

export function ClaimedLeases() {
  const [query, setQuery] = useState("");

  /* Open on arrival, like County below it: this is the reader's own holding
     and the first thing the rail has to say to them. */
  const [open, setOpen] = useState(true);

  /*
   * THE FETCH LIVES IN `ClaimedLeasesProvider`, not here.
   *
   * The map view needs the same 831KB answer to frame itself, and two
   * consumers asking separately is the payload twice. This reads whatever the
   * provider has.
   */
  const load = useClaimed();
  const { dismissed, dismiss, restore } = useClaimedDismiss();
  const { isSelected, toggleLease } = useClaimedSelection();

  /* Memoised on `load` rather than on a `leases` array derived above it: the
     `: []` branch builds a new array on every render, so a dependency on it
     would re-filter 782 rows on every keystroke anywhere in the rail. */
  const leases = useMemo(
    () => (load.status === "ready" ? load.data.leases : EMPTY),
    [load],
  );

  /*
   * SORTED BY COUNTY, THEN NAME, THEN NUMBER — not left in the order the
   * service sends them, which is by lease key and so effectively by district.
   *
   * Lease names repeat: one member had four leases all called BETTY KENNEDY
   * UNIT A, and 782 leases under 483 distinct names. Scattered down the list
   * they read as the same row printed four times. Sorted, the copies sit
   * together under the county that tells them apart, and the eye can skip a
   * county it does not care about in one movement.
   */
  const sorted = useMemo(
    () =>
      [...leases].sort(
        (a, b) =>
          a.county.localeCompare(b.county) ||
          a.name.localeCompare(b.name) ||
          a.leaseNumber.localeCompare(b.leaseNumber),
      ),
    [leases],
  );

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return sorted;

    return sorted.filter(
      (lease) =>
        lease.name.toLowerCase().includes(needle) ||
        lease.county.toLowerCase().includes(needle) ||
        lease.leaseNumber.includes(needle),
    );
  }, [sorted, query]);

  /*
   * NOTHING IS DRAWN UNLESS THERE IS A CLAIM.
   *
   * Not the heading, not an empty state, not a loader. A reader who has
   * claimed nothing gets the rail exactly as it was before this section
   * existed — no row telling them about a feature they are not using.
   *
   * The empty case used to say "No claimed leases on this record yet.", on the
   * reasoning that an owner who had just claimed some would otherwise fear the
   * claim was lost. That is a real risk, but it is the claim flow's to answer,
   * not a filter rail's: this panel is for narrowing a map, and a permanent
   * notice about an unused feature is furniture on every visit thereafter.
   *
   * `idle` (signed out), `loading`, `failed` and a claim of zero all land
   * here. Failure is deliberately silent for the same reason — the rail still
   * filters, and the map behind it still works.
   */
  /*
   * NOTHING AT ALL unless there is a claim to show — see the note below. This
   * comes before the closed state, because a reader with no claim must not see
   * a "Show on map" row for leases they do not have.
   */
  if (load.status !== "ready" || leases.length === 0) return null;

  /*
   * CLOSED, BUT STILL HERE.
   *
   * Closing hands the map back; it does not make the section vanish. Removed
   * outright, the only way to see your own wells again was a page reload —
   * there was no control left to press, and nothing on screen said the feature
   * existed. It keeps its place in the rail as one row that says what it is
   * and offers it back.
   */
  if (dismissed) {
    return (
      <section className="mt-[14px] border-t border-mv-line pt-[14px]">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-[.1em] text-mv-ink lg:text-[12px]">
            My leases
          </span>
          {/* The rail's own count pill — mint, green, tabular — so this
              reads as the same kind of fact as `WICHITA 27,612` below it. */}
          <span className="shrink-0 rounded-full bg-mv-mint px-[7px] py-[2px] text-[10px] font-semibold tabular-nums leading-none text-mv-green-deep lg:text-[11px]">
            {leases.length.toLocaleString("en-US")}
          </span>
          <button
            type="button"
            onClick={restore}
            className="ml-auto shrink-0 cursor-pointer rounded px-[6px] py-[2px] text-[10.5px] font-semibold text-mv-green-deep hover:bg-[#f2f8f5] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mv-green-deep lg:text-[11.5px]"
          >
            Show on map
          </button>
        </div>
      </section>
    );
  }

  return (
    /*
     * SPACED LIKE EVERY OTHER SECTION IN THE RAIL: `mt-[14px]`, a rule above,
     * `pt-[14px]`. Straight from `SectionShell`, which County and the four
     * facets below it use.
     *
     * It had `border-b`/`pb-[14px]` instead — a rule BELOW itself — and that
     * was wrong twice over. It left only 8px between the search box and the
     * heading, so the section read as part of the search rather than as the
     * first section; and because `SectionShell` brings its own rule above,
     * County's border-top sat 14px under this one's border-bottom and drew
     * the divider twice.
     *
     * The rail separates sections with a rule ABOVE each one. One convention,
     * followed here rather than a second one invented alongside it.
     */
    <section className="mt-[14px] border-t border-mv-line pt-[14px]">
      {/*
       * THE SAME HEADER AS EVERY OTHER SECTION IN THE RAIL — label, count,
       * chevron, and the whole row is the button.
       *
       * It was a plain `<h3>`: the one heading here that did not collapse,
       * sitting directly above five that did. A row that looks like its
       * neighbours and does not behave like them is the worse of the two
       * mistakes, so it collapses now too.
       *
       * Deliberately not `SectionShell` itself. That component belongs to
       * `filters-panel.tsx` and is built around a facet's checkbox list — this
       * section has a loader, an error, an owner line and a find box instead.
       * Borrowing the markup keeps them identical to look at without tying
       * this file to a shape it does not fit.
       */}
      {/* TWO CONTROLS, TWO BUTTONS, SIDE BY SIDE — never nested. A button
          inside a button is not markup a browser will accept, so the collapse
          takes the row and Close sits beside it as a sibling. */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setOpen((was) => !was)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
        >
          <span className="text-[11px] lg:text-[12px] font-extrabold uppercase tracking-[.1em] text-mv-ink">
            My leases
          </span>
          <span className="shrink-0 rounded-full bg-mv-mint px-[7px] py-[2px] text-[10px] font-semibold tabular-nums leading-none text-mv-green-deep lg:text-[11px]">
            {leases.length.toLocaleString("en-US")}
          </span>
          {open ? (
            <ChevronUp
              size={15}
              className="ml-auto shrink-0 text-mv-muted"
              aria-hidden="true"
            />
          ) : (
            <ChevronDown
              size={15}
              className="ml-auto shrink-0 text-mv-muted"
              aria-hidden="true"
            />
          )}
        </button>

        {/*
         * CLOSE — hands the map back.
         *
         * Not a collapse: the chevron beside it folds the list away and leaves
         * the reader's wells on the map, which is the right control for "I
         * have read this". This one ends the claimed view outright — the map
         * goes back to the whole state and the count bubbles, which is the
         * right control for "I want to look at somewhere else now".
         *
         * Labelled for a screen reader, because an X on its own says nothing
         * about what it closes.
         */}
        <button
          type="button"
          onClick={dismiss}
          title="Close my leases and show the whole map"
          aria-label="Close my leases and show the whole map"
          className="-mr-1 grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded text-mv-muted hover:bg-[#f2f8f5] hover:text-mv-green-deep focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mv-green-deep"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      {open && (
        <>
          {/* No state branches here any more. The component returns `null`
              above unless the claim is loaded and has something in it, so
              loading, failure and an empty claim never reach this point. */}
          <>
            {/*
             * THE OWNER RECORD THE CLAIM SITS UNDER, as a caption on the
             * heading — not as the first thing in the list.
             *
             * It had `mt-[6px]` under the heading and the list had `mt-1`
             * under it, which left 6px above and 4px below: the name floated
             * between the two with no allegiance to either, and at a glance
             * "Aasen Ryan R" read as the first lease. Pulled up tight to the
             * heading it is plainly a subtitle of it, and the 10px the list
             * now carries separates the two blocks.
             *
             * Labelled, because the name alone is ambiguous — the account
             * holder and the claimed owner record are often different names,
             * and this is the second one.
             */}
            {load.data.owner?.name && (
              <p className="mt-[3px] mb-0 truncate text-[10.5px] leading-tight text-mv-muted lg:text-[11.5px]">
                <span className="text-mv-placeholder">Owner record: </span>
                {load.data.owner.name}
              </p>
            )}

            {/* Only once the list is long enough to need finding. */}
            {leases.length > VISIBLE_ROWS && (
              <div className="mt-[10px] flex items-center gap-2 rounded-lg border border-mv-line px-[10px] py-[6px]">
                <Search
                  size={13}
                  className="text-mv-muted"
                  aria-hidden="true"
                />
                <label htmlFor="claimed-lease-find" className="sr-only">
                  Find in my leases
                </label>
                <input
                  id="claimed-lease-find"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Find…"
                  className="min-w-0 flex-1 border-0 bg-transparent text-[11.5px] lg:text-[12.5px] leading-tight text-mv-slate outline-none placeholder:text-mv-muted"
                />
              </div>
            )}

            {shown.length === 0 ? (
              <p className="mt-2 mb-0 text-[11px] lg:text-[12px] text-mv-muted">
                No lease matches that.
              </p>
            ) : (
              /* Scrolls inside itself. Left to grow, 782 rows would push every
               facet below it out of reach — the same rule the county list
               follows. */
              <ul
                /* `mt-[10px]` when it follows the caption directly, which
                     is every list short enough not to get a Find box; the box
                     carries the same gap when it is there, so the first row
                     sits in the same place either way. */
                className="mv-thin-scroll mt-[10px] max-h-[264px] list-none overflow-y-auto overscroll-contain p-0"
                aria-label="My claimed leases"
              >
                {shown.map((lease, index) => (
                  <LeaseRow
                    key={lease.leaseKey}
                    lease={lease}
                    divided={index > 0}
                    checked={isSelected(lease.leaseKey)}
                    onToggle={() => toggleLease(lease.leaseKey)}
                  />
                ))}
              </ul>
            )}
          </>
        </>
      )}
    </section>
  );
}

/**
 * One lease: two lines, with what distinguishes it on the outside edges.
 *
 * ── WHY IT IS SHAPED THIS WAY ──
 *
 * It was three stacked lines of left-aligned text — name, then location, then
 * wells and interest — which put the ONLY repeated field, the name, in the
 * boldest position and buried the identifying one in the third line of grey.
 * Four leases called BETTY KENNEDY UNIT A read as one row printed four times.
 *
 * Now the county and the lease key lead the second line, which is where the
 * eye lands after the name, and the two NUMBERS are pushed to the right edge
 * where they form a column of their own. Numbers in a column can be compared;
 * numbers inline in a sentence cannot. `tabular-nums` keeps that column
 * straight when the digits differ in width.
 *
 * The well count borrows the rail's own count pill — mint, green, right-hand
 * side — so it reads as the same kind of fact as `WICHITA 27,612` in the
 * county facet below it, because it is.
 */
function LeaseRow({
  lease,
  divided,
  checked,
  onToggle,
}: {
  lease: MapClaimedLease;
  divided: boolean;
  checked: boolean;
  /** Ticks this lease's wells on or off the map. */
  onToggle: () => void;
}) {
  const place = [lease.county, lease.leaseKey].filter(Boolean).join(" · ");

  return (
    <li className={`py-[7px] ${divided ? "border-t border-mv-line" : ""}`}>
      <label className="flex cursor-pointer items-start gap-[10px]">
        {/*
         * The same box the county facet uses, from the same component: a
         * transparent real `<input>` laid over the picture of one, so the
         * keyboard, the focus ring and the accessibility tree all stay the
         * browser's. `mt-[2px]` sits it on the first line of text rather than
         * centring it against a two-line row.
         */}
        <span className="relative mt-[2px] grid h-[15px] w-[15px] shrink-0 place-items-center">
          <input
            type="checkbox"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            checked={checked}
            onChange={onToggle}
          />
          <Checkbox checked={checked} />
        </span>

        <span className="min-w-0 flex-1">
          {/* NO WELL COUNT. It was a mint pill on the right of this line, matching
          the county facet's counts — dropped on request. The number is still
          parsed (`wellCount`) and still available the moment it is wanted. */}
          {/* `title` because the name is the one field long enough to truncate,
          and a truncated lease name is unidentifiable. */}
          <span
            title={lease.name}
            /* THE SAME TYPE AS A COUNTY ROW, which is what the rail's other
             * lists use: `text-[11.5px] lg:text-[12.5px] text-mv-ink`, regular
             * weight. It went bold-on-ink first, then semibold-on-slate; both were
             * a third treatment invented for this one list. Matching the facets
             * means a lease name and a county name read as the same kind of thing,
             * which they are — a row you scan for the one you want. */
            className="block truncate text-[11.5px] leading-tight text-mv-ink lg:text-[12.5px]"
          >
            {lease.name}
          </span>

          <div className="mt-[3px] flex items-baseline gap-2 text-[10.5px] leading-tight text-mv-muted lg:text-[11.5px]">
            <span title={place} className="min-w-0 flex-1 truncate">
              {place}
            </span>
            {lease.interest !== null && (
              <span
                className="shrink-0 tabular-nums"
                title="Your decimal interest in this lease"
              >
                {formatInterest(lease.interest)}
              </span>
            )}
          </div>
        </span>
      </label>
    </li>
  );
}

/**
 * The interest, as a decimal fraction.
 *
 * NOT rendered as a percentage. The service's values run from 0.00005 to
 * 15.64 for one member, which no single unit explains — read as percentages
 * the small ones vanish and the large one is impossible. Until the service
 * says what the unit is, the number is printed as it arrived and labelled
 * plainly, rather than being multiplied by a hundred on a guess.
 */
function formatInterest(interest: number): string {
  /* The unit is carried by the column's `title`, not repeated on every row —
     "interest" printed 782 times is 782 words that never change. */
  return interest.toLocaleString("en-US", { maximumFractionDigits: 6 });
}
