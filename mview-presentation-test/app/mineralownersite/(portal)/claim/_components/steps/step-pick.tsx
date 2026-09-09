"use client";

import {
  ListFilter,
  LoaderCircle,
  Lock,
  RotateCcw,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

import { PortalButton } from "../../../../_components/ui/button";
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
  const needle = filter.trim().toLowerCase();

  /** Anything set in either filter — the search fields or the narrow-down box. */
  const anyFilter = Boolean(
    query.name || query.county || query.lease || query.address || filter,
  );

  /* Numbered ONCE, against the full answer, so a card keeps its place in the
     1,153 while the filter hides the rows above it — and so finding that place
     is not a scan of the whole array per row. */
  const numbered = records.map((record, i) => ({ record, index: i + 1 }));
  const shown = needle
    ? numbered.filter(({ record: r }) =>
        `${r.name} ${r.address} ${r.county}`.toLowerCase().includes(needle),
      )
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
      <div className="grid gap-[18px] rounded-mv border border-mv-line bg-mv-card p-4">
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

        {/* The rows below are the PREVIOUS answer while this runs, so it says
            so — a count that silently belongs to an older query is worse than
            no count. */}
        {refreshing && (
          <p
            role="status"
            className="flex items-center gap-2 text-[12px] text-mv-muted"
          >
            <LoaderCircle
              aria-hidden="true"
              className="h-[13px] w-[13px] animate-spin text-mv-green-deep"
            />
            Updating results…
          </p>
        )}

        {/* THE FIRST SEARCH GETS THE BIG BLOCK, A RE-SEARCH DOES NOT. There is
            nothing to hold the reader's place on the first one, so the slab
            reserves it. Once rows exist, replacing them with that slab on every
            pause in typing is a flash between two full-height layouts — the
            rows stay and the heading says it is refreshing instead. */}
        {/* THE LABEL DOES NOT SAY "SEARCHING" AGAIN. The heading directly above
            already says "Searching the public record…", so repeating it filled
            the block with the one thing the reader had just read. This says
            what the heading cannot: why it is taking a moment. */}
        {firstLoad && (
          <FlowLoading label="A common name can match a thousand records — this takes a few seconds." />
        )}

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
            <label className="relative flex items-center">
              <ListFilter
                aria-hidden="true"
                className="pointer-events-none absolute left-[11px] h-[14px] w-[14px] text-mv-muted"
              />
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={`Narrow these ${records.length.toLocaleString("en-US")} results — name, address or county`}
                aria-label="Filter the results on this page"
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

            {needle !== "" && (
              <p className="text-[11.5px] text-mv-muted" role="status">
                Showing{" "}
                <b className="font-semibold text-mv-ink">
                  {shown.length.toLocaleString("en-US")}
                </b>{" "}
                of {records.length.toLocaleString("en-US")}
                {hiddenPicks > 0 &&
                  ` · ${hiddenPicks} record${hiddenPicks === 1 ? "" : "s"} you ticked ${hiddenPicks === 1 ? "is" : "are"} hidden by this filter, and ${hiddenPicks === 1 ? "is" : "are"} still selected`}
              </p>
            )}
          </div>
        )}

        {shown.length > 0 && (
          <div className="grid gap-3 @[760px]:grid-cols-2">
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
        )}

        {/* A FILTER THAT MATCHES NOTHING IS NOT A SEARCH THAT FOUND NOBODY.
            The wording has to send you to the box you actually typed in. */}
        {records.length > 0 && shown.length === 0 && (
          <FlowEmpty
            message={`Nothing on this page matches "${filter.trim()}".`}
            hint="This filters the results already loaded. Clear it to see all of them, or change the search fields at the top of this step to ask the record for a different name."
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

      <p className="-mx-[22px] -mb-[22px] flex items-center gap-[6px] border-t border-mv-line px-[22px] py-[10px] text-[11.5px] text-mv-muted max-[767px]:-mx-4 max-[767px]:-mb-4 max-[767px]:px-4">
        <Lock aria-hidden="true" className="h-[12px] w-[12px]" />
        Values are withheld until a record is confirmed as yours.
      </p>
    </div>
  );
}
