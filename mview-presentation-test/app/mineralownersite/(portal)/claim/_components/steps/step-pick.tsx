"use client";

import { ListFilter, LoaderCircle, RotateCcw, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { PortalButton } from "../../../../_components/ui/button";
import {
  SegmentedControl,
  type SegmentedOption,
} from "../../../../_components/ui/segmented-control";
import { recordKey } from "../../_lib/claim-format";
import {
  MAX_CLAIM_OWNERS as MAX_CLAIM,
  type CountyIndex,
  type OwnerRecord,
} from "../../_lib/claim-types";
import type { Async } from "../claim-wizard";
import { FlowEmpty, FlowError, FlowLoading } from "../flow-state";
import { GuideNote } from "../guide-note";
import { ClaimSearchFields, type ClaimQuery } from "../search-fields";
import { StepIntro } from "../step-intro";
import { CandidateCard } from "./candidate-card";

/**
 * WHICH FIELD THE NARROW-DOWN BOX LOOKS AT.
 *
 * It searched name, address and county at once and said so only in placeholder
 * text — which vanishes the moment anybody types. So a reader who entered "Bee"
 * could not tell whether they had filtered to a county, to an address
 * containing "Bee", or to an owner called Beeson, and across 1,153 records
 * those are very different answers.
 *
 * The scope is a control now rather than a sentence: pick the field, and the
 * placeholder, the result line and the empty state all name it back.
 */
type FilterScope = "all" | "name" | "address" | "county";

const FILTER_SCOPES: SegmentedOption<FilterScope>[] = [
  { value: "all", label: "All" },
  { value: "name", label: "Name" },
  { value: "address", label: "Address" },
  { value: "county", label: "County" },
];

/** What the box is looking through, in words, for the lines that report it. */
const SCOPE_NOUN: Record<FilterScope, string> = {
  all: "name, address or county",
  name: "owner name",
  address: "address",
  county: "county",
};

/**
 * STEP 2 — pick the records that are yours, from `GET /owners/search`.
 *
 * ── SEVERAL AT ONCE ──
 *
 * One owner is often on the roll more than once: a maiden name, an initial, an
 * old address. Every card is a checkbox and the whole selection goes forward
 * together, because `/owners/claim` takes up to 25 owner names in one
 * transaction — running the flow once per spelling was never the intent.
 *
 * ── THE SELECTION BAR IS STICKY, AND THAT IS THE WHOLE POINT ──
 *
 * This list can be 1,153 records long. A button at the foot of it is a button
 * nobody reaches: you tick a record near the top and then scroll for a minute
 * to act on it. Pinned to the bottom of the viewport it is always one click
 * away, and it carries the running count — the only place that number can be
 * seen without scrolling back up.
 *
 * It clears the portal's fixed mobile tab bar below 1024px, where the two would
 * otherwise occupy the same strip.
 *
 * ── THE SEARCH FIELDS ARE HERE TOO ──
 *
 * A first name alone can match over a thousand records, and the fix is almost
 * always one more field. Sending someone back to step 1 for that means losing
 * the list they are reading, so the same fields — the SAME component as step
 * 1's — sit at the top and re-run the search in place.
 */
export function StepPick({
  results,
  query,
  onQueryChange,
  counties,
  selected,
  onToggle,
  onContinue,
  resolving,
  onSearch,
  tooShort,
  onClearSelection,
  onReset,
}: {
  results: Async<OwnerRecord[]>;
  query: ClaimQuery;
  onQueryChange: (next: ClaimQuery) => void;
  counties: Async<CountyIndex>;
  /** Keys of the records ticked so far. */
  selected: string[];
  onToggle: (record: OwnerRecord, checked: boolean) => void;
  onContinue: () => void;
  /** The `/same-name` calls for the selection are in flight. */
  resolving: boolean;
  onSearch: () => void;
  /** Every filter is under the 3-character floor, so nothing is being asked. */
  tooShort: boolean;
  /** Untick everything — the only way back from a selection made up-list. */
  onClearSelection: () => void;
  /** Empty the search fields AND drop the results they produced. */
  onReset: () => void;
}) {
  const records = results.data ?? [];
  const count = selected.length;

  /** No rows yet — the slab. Rows already on screen — keep them, mark stale. */
  const firstLoad = results.loading && records.length === 0;
  const refreshing = results.loading && records.length > 0;

  /** `postClaim` throws above this, so the bar refuses to go on. */
  const overLimit = count > MAX_CLAIM;

  /*
   * CHANGING A FILTER BRINGS THE LIST BACK INTO VIEW (requested).
   *
   * The four search fields are at the top of the step and the answer is below
   * them. Change one from halfway down 1,153 rows and the new answer starts
   * somewhere above you — so this puts the top of the card back on screen.
   *
   * ── WHEN THE ANSWER LANDS, NOT WHEN IT IS ASKED FOR ──
   *
   * It used to fire the moment a request started, and that is what put the page
   * at the bottom: the scroll was measured against the OLD list — a thousand
   * rows tall — and then the answer came back with four, the document collapsed
   * under it, and the browser clamped what was left to the end of the page.
   * Measured after the rows have rendered, the distance is the real one.
   *
   * ── AND ONLY IF THE LIST IS NOT ALREADY THERE ──
   *
   * If the top of the card is on screen, the reader can already see where the
   * new answer begins, and scrolling anyway only shoves the filter fields off
   * the top for no reason. A short answer therefore does not move the page at
   * all — which is the other half of the bottomed-out jump.
   *
   * `scroll-mt` on the target keeps the card's heading clear of the portal's
   * sticky top bar, which `scrollIntoView` would otherwise tuck it under.
   */
  const listRef = useRef<HTMLDivElement>(null);
  const wasRefreshing = useRef(false);

  useEffect(() => {
    const landed = wasRefreshing.current && !refreshing;
    wasRefreshing.current = refreshing;
    if (!landed) return;

    const card = listRef.current;
    if (!card) return;

    const { top } = card.getBoundingClientRect();
    if (top >= 0 && top < window.innerHeight) return;

    card.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [refreshing]);

  /*
   * THE NARROW-DOWN BOX — a filter over the rows already on the page.
   *
   * ── WHY IT IS NOT THE SEARCH ABOVE ──
   *
   * "ryan" returns 1,153 records and the fields at the top of this step go back
   * to the API to change that. This one does not: it hides rows in the list you
   * already have, instantly, with no request and no waiting. They answer
   * different questions — "search somebody else" versus "where in this list is
   * the one I recognise" — which is why they are two controls and why this one
   * says what it filters on.
   *
   * ── LOCAL STATE, DELIBERATELY ──
   *
   * `query` lives up in the wizard because step 2 has to open with what was
   * actually searched. A filter is a way of looking at an answer, not part of
   * it, so it resets when you come back from step 3 — with the 1,153 records
   * and every tick still intact.
   */
  const [filter, setFilter] = useState("");
  const [scope, setScope] = useState<FilterScope>("all");
  const needle = filter.trim().toLowerCase();

  /** Anything set in either filter — the search fields or the narrow-down box. */
  const anyFilter = Boolean(
    query.name || query.county || query.lease || query.address || filter,
  );

  /* Numbered ONCE, against the full answer, so a card keeps its place in the
     1,153 while the filter hides the rows above it — and so finding that place
     is not a scan of the whole array per row. */
  const numbered = records.map((record, i) => ({ record, index: i + 1 }));
  /* ONE FIELD OR ALL THREE, whichever the scope says. The space between the
     three in the "all" case is load-bearing: joined without it, a needle could
     match across the seam of two fields and hide a row for a reason that is in
     neither of them. */
  const shown = needle
    ? numbered.filter(({ record: r }) => {
        const hay =
          scope === "name"
            ? r.name
            : scope === "address"
              ? r.address
              : scope === "county"
                ? r.county
                : `${r.name} ${r.address} ${r.county}`;
        return hay.toLowerCase().includes(needle);
      })
    : numbered;

  /* Ticks are kept on rows the filter is hiding — losing a selection because a
     row scrolled out of view would be the worst thing this control could do —
     so when that happens the count says so. */
  const visible = new Set(shown.map(({ record }) => recordKey(record)));
  const hiddenPicks = needle
    ? selected.filter((k) => !visible.has(k)).length
    : 0;

  return (
    <div className="grid gap-[18px]">
      {/* CARD ONE — the filter. Its own surface, because it is a control panel
          and not part of the answer.

          NO SEARCH BUTTON. The fields search themselves: 400ms after typing
          stops, and only once a filter is 3 characters long. A button here was
          a second thing to remember after editing a field, and the results
          below it are the feedback — pressing it changed nothing that had not
          already happened. Enter still submits for anyone who reaches for it,
          and skips the wait. */}
      <form
        className="grid gap-3 rounded-mv border border-mv-line bg-mv-card p-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
      >
        <ClaimSearchFields
          query={query}
          onChange={onQueryChange}
          counties={counties}
          compact
        />

        {/* RESET CLEARS BOTH FILTERS, because there are two and the reader is
            not tracking which is which: the four search fields that go back to
            the API, and the narrow-down box over the rows already loaded. A
            reset that emptied the fields and left "smith" narrowing the list
            would look broken — the search says everything, the page shows
            almost nothing.

            It appears only when there IS something to clear. A permanently
            visible Reset on an empty form is a control that does nothing, and
            it takes a line of the card to say so. */}
        {anyFilter && (
          <div className="flex justify-end">
            <button
              type="button"
              /* RESET CLEARS THE ANSWER TOO, not just the question. Emptying
                 the fields while leaving 1,153 rows underneath is a page that
                 says it is not searching for anything and then lists what it
                 found — `onReset` drops the results in the wizard, so the step
                 goes back to the state it opens in. */
              onClick={() => {
                onReset();
                setFilter("");
              }}
              className="flex cursor-pointer items-center gap-[5px] text-[12px] font-semibold text-mv-green-deep hover:underline hover:underline-offset-2"
            >
              <RotateCcw aria-hidden="true" className="h-[13px] w-[13px]" />
              Reset filters
            </button>
          </div>
        )}
      </form>

      {/* CARD TWO — the answer to whatever the filter last asked. */}
      <div
        ref={listRef}
        className="grid scroll-mt-[76px] gap-[18px] rounded-mv border border-mv-line bg-mv-card p-4"
      >
        <StepIntro
          step={2}
          icon={Users}
          /* A FAILED SEARCH HAS NO COUNT. This used to fall through to the
             record tally, so a 502 rendered "0 candidate owner records" above
             the error — telling the reader their name matched nothing, which is
             a different and false answer to the one they asked. */
          /* `tooShort` no longer suppresses the count on its own — with rows
             still on screen it produced a bare "Pick your record" heading over
             a list of 1,153, which reads as a page that has lost track of what
             it is showing. The count is suppressed only when there is nothing
             to count. */
          title={
            results.loading
              ? "Searching the public record…"
              : results.error || records.length === 0
                ? "Pick your record"
                : `${records.length} candidate owner record${records.length === 1 ? "" : "s"}`
          }
          lead={
            records.length > 0 && !refreshing
              ? "Tick every record that is you — you can take more than one."
              : undefined
          }
        />

        {/* ONE REFRESH INDICATOR, NOT TWO. A mint bar used to sit here as well
            as the pill over the list, so a single request drew two spinners
            saying the same sentence — which reads as two things loading. The
            pill won because it is where the staleness is: on the rows. */}

        {/* THE FIRST SEARCH GETS THE BIG BLOCK, A RE-SEARCH DOES NOT. There is
            nothing to hold the reader's place on the first one, so the slab
            reserves it. Once rows exist, replacing them with that slab on every
            pause in typing is a flash between two full-height layouts — the
            rows stay and the heading says it is refreshing instead. */}
        {/* ONE SHORT LINE (requested). It used to explain itself — "a common
            name can match a thousand records" — which is true and is two lines
            of reading under a spinner, at the moment the reader has the least
            appetite for either. The heading above already says what is
            happening; this only has to say it will not be instant. */}
        {firstLoad && <FlowLoading label="This takes a few seconds." />}

        {results.error && (
          <FlowError message={results.error} onRetry={onSearch} />
        )}

        {/* ONLY WHEN THERE IS NOTHING BELOW IT.
            This used to render on `tooShort` alone, so deleting a character
            put "Type at least 3 characters to search" directly above 1,153
            results — the page telling the reader it had not searched, over the
            answer to a search. The rows are still the last answer given; the
            prompt belongs only where there is no answer at all. */}
        {tooShort && !results.loading && records.length === 0 && (
          <FlowEmpty
            /* NO CHARACTER COUNT. "Type at least 3 characters" states a rule
               the reader is not breaking — they have typed nothing — and makes
               a threshold sound like something to satisfy rather than a detail
               of how the search paces itself. The fields simply search when
               there is enough to search on. */
            message="Start typing to search the public record."
            hint="The results update on their own as you type — or pick a county, which searches on its own."
          />
        )}

        {!results.loading &&
          !results.error &&
          !tooShort &&
          records.length === 0 && (
            <FlowEmpty
              message="No records matched that search."
              hint="Try initials, an entity name, or a different county — records often carry old spellings."
            />
          )}

        {records.length > 0 && (
          <div className="grid gap-2">
            {/* THE BOX AND ITS SCOPE ARE ONE CONTROL, so they sit on one row
                and wrap together. The scope is to the RIGHT of the field
                because it qualifies what was typed — reading left to right,
                "kennedy" then "Name". */}
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative flex min-w-[min(100%,240px)] flex-1 items-center">
                <ListFilter
                  aria-hidden="true"
                  className="pointer-events-none absolute left-[11px] h-[14px] w-[14px] text-mv-muted"
                />
                <input
                  type="search"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder={
                    scope === "all"
                      ? `Narrow these ${records.length.toLocaleString("en-US")} results — name, address or county`
                      : `Narrow these ${records.length.toLocaleString("en-US")} results by ${SCOPE_NOUN[scope]}`
                  }
                  aria-label={`Filter the results on this page by ${SCOPE_NOUN[scope]}`}
                  className="w-full rounded-mv border border-mv-line bg-mv-card py-[9px] pr-[34px] pl-[32px] text-[12.5px] text-mv-ink outline-none placeholder:text-mv-muted focus-visible:border-mv-green focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.28)] [&::-webkit-search-cancel-button]:appearance-none"
                />
                {filter !== "" && (
                  <button
                    type="button"
                    onClick={() => setFilter("")}
                    aria-label="Clear the filter"
                    className="absolute right-[8px] flex h-[20px] w-[20px] cursor-pointer items-center justify-center rounded-full text-mv-muted hover:bg-mv-hover hover:text-mv-ink"
                  >
                    <X aria-hidden="true" className="h-[13px] w-[13px]" />
                  </button>
                )}
              </label>

              <SegmentedControl
                label="Which field to filter on"
                options={FILTER_SCOPES}
                value={scope}
                onChange={setScope}
                className="flex-none"
              />
            </div>

            {needle !== "" && (
              <p className="text-[11.5px] text-mv-muted" role="status">
                Showing{" "}
                <b className="font-semibold text-mv-ink">
                  {shown.length.toLocaleString("en-US")}
                </b>{" "}
                of {records.length.toLocaleString("en-US")} by{" "}
                <b className="font-semibold text-mv-ink">{SCOPE_NOUN[scope]}</b>
                {hiddenPicks > 0 &&
                  ` · ${hiddenPicks} record${hiddenPicks === 1 ? "" : "s"} you ticked ${hiddenPicks === 1 ? "is" : "are"} hidden by this filter, and ${hiddenPicks === 1 ? "is" : "are"} still selected`}
              </p>
            )}
          </div>
        )}

        {/* AND THE STALE ROWS LOOK STALE. Dimmed and unclickable while the new
            answer is in flight — the reader keeps their place in the list, which
            is why these are not torn down and replaced by a loading slab, but
            cannot mistake them for the result of the filter they just typed.

            `aria-busy` says the same thing to a screen reader, which cannot
            see a dim. */}
        {shown.length > 0 && (
          <div className="relative">
            <div
              aria-busy={refreshing}
              className={`grid gap-3 transition-opacity @[760px]:grid-cols-2 ${
                refreshing ? "pointer-events-none opacity-45" : ""
              }`}
            >
              {shown.map(({ record, index }) => (
                <CandidateCard
                  key={recordKey(record)}
                  index={index}
                  record={record}
                  selected={selected.includes(recordKey(record))}
                  onToggle={onToggle}
                />
              ))}
            </div>

            {/* THE ONLY REFRESH INDICATOR, AND IT IS ON THE ROWS.
                This list runs to 1,153 rows, and a notice at the top of the
                card is off screen for most of it — a reader scrolled into the
                list would see the rows go pale with nothing saying why. This
                floats over them, and it carries `role="status"` because it is
                now the one thing announcing the refresh.

                ── IT COSTS NO LAYOUT ──

                Absolute over the grid, so nothing below it moves when it
                appears and nothing shifts back when it goes.

                ── AND IT FOLLOWS THE SCROLL ──

                `sticky` inside a wrapper that covers the whole grid keeps it in
                view for as long as any part of the list is, and clamps it
                inside the grid rather than letting it wander off the end. The
                whole overlay is `pointer-events-none`; the rows underneath are
                already inert while this is up. */}
            {refreshing && (
              <div className="pointer-events-none absolute inset-0 z-20 flex justify-center">
                <span
                  role="status"
                  className="sticky top-[38vh] flex h-fit items-center gap-2 rounded-full border border-mv-mint-edge bg-mv-card px-4 py-[9px] text-[12.5px] font-bold text-mv-green-deep shadow-mv-lg"
                >
                  <LoaderCircle
                    aria-hidden="true"
                    className="h-[14px] w-[14px] animate-spin"
                  />
                  Searching…
                </span>
              </div>
            )}
          </div>
        )}

        {/* A FILTER THAT MATCHES NOTHING IS NOT A SEARCH THAT FOUND NOBODY.
            The wording has to send you to the box you actually typed in. */}
        {records.length > 0 && shown.length === 0 && (
          <FlowEmpty
            message={`No record’s ${SCOPE_NOUN[scope]} matches "${filter.trim()}".`}
            hint={
              scope === "all"
                ? "This filters the results already loaded. Clear it to see all of them, or change the search fields at the top of this step to ask the record for a different name."
                : `This is only looking at the ${SCOPE_NOUN[scope]}. Switch the filter to All to search every field, or clear it to see all of them.`
            }
          />
        )}
      </div>

      {/*
        THE SELECTION BAR — a floating pill, not a full-width panel.

        ── IT USED TO COVER THE LIST IT BELONGS TO ──

        A white card the full width of the results, pinned to the bottom, sits
        ON the two rows you are scrolling past — an opaque band through the
        middle of the answer. Sticky positioning guarantees an overlap somewhere
        in the scroll; the only question is how much it hides. Centred and only
        as wide as its contents, the rows either side stay readable, and the
        wrapper is `pointer-events-none` so the bar never eats a click meant
        for a card beside it.

        ── DARK, BECAUSE IT IS NOT PART OF THE PAGE ──

        `mv-deep` is the portal's own dark surface — the value band at the top
        of this very screen. White-on-white needed a border to prove it was
        floating; this reads as an overlay on sight, and the green button gains
        contrast it never had against a white card.

        ── THE COUNT IS SAID ONCE ──

        It was "1 record selected" beside a button reading "Confirm 1 record →
        step 3" — the same number twice, in a bar whose whole job is to be
        glanceable. The chip carries it; the button just moves you on.

        ── 25 IS A REAL CEILING, AND THIS IS THE ONLY PLACE TO SAY SO ──

        `/owners/claim` refuses more than 25 owner names in one call. Finding
        that out on step 3, after picking 30 records and attesting to them, is a
        dead end two screens deep — so the bar stops it here, where the ticks
        are.
      */}
      {count > 0 && (
        <div className="pointer-events-none sticky bottom-4 z-30 flex justify-center max-[1024px]:bottom-[84px]">
          <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-full border border-white/10 bg-mv-deep py-2 pr-2 pl-3 shadow-mv-lg">
            <span className="flex items-center gap-2 text-[12.5px] font-semibold text-mv-on-deep">
              <span
                className={`flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-[6px] text-[11.5px] font-bold tabular-nums ${
                  overLimit
                    ? "bg-mv-red text-white"
                    : "bg-mv-on-deep-accent text-mv-deep-ink"
                }`}
              >
                {count}
              </span>
              selected
            </span>

            {overLimit ? (
              <span className="text-[11.5px] text-mv-on-deep-soft">
                25 is the most one claim can take — untick {count - MAX_CLAIM}.
              </span>
            ) : (
              <button
                type="button"
                onClick={onClearSelection}
                className="cursor-pointer text-[11.5px] font-semibold text-mv-on-deep-soft underline underline-offset-2 hover:text-mv-on-deep"
              >
                Clear
              </button>
            )}

            <PortalButton
              variant="primary"
              size="sm"
              className="rounded-full"
              onClick={onContinue}
              disabled={resolving || overLimit}
            >
              {resolving && (
                <LoaderCircle
                  aria-hidden="true"
                  className="h-[14px] w-[14px] animate-spin"
                />
              )}
              {/* NAMES THE NEXT SCREEN, not the act of moving. "Continue" is
                  true of every button in a wizard and tells the reader nothing
                  about what they are about to be asked. */}
              {resolving ? "Checking these records…" : "Review addresses →"}
            </PortalButton>
          </div>
        </div>
      )}

      <GuideNote title="Why there may be several">
        Name-only matching is unsafe: identical owner strings recur across
        unrelated parties.
        <br />
        Address is the discriminator — city pre-verification, street
        post-verification, no cross-record merge on name.
      </GuideNote>
    </div>
  );
}
