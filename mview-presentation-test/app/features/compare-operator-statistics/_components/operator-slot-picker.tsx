"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { OperatorLogo } from "@/app/_components/operator-logo";
import { SLOT_LABELS } from "@/lib/operator-statistics";
import type {
  OperatorNameMatch,
  OperatorNameResult,
} from "@/lib/operator-statistics-shape";

/**
 * One comparison slot: a searchable operator combobox.
 *
 * The design's `.cs-selbox` — a bordered field that shows the chosen operator's
 * tile, name and statewide rank, and turns into a search box the moment it takes
 * focus. Four of these sit side by side; each owns its own query, matches and
 * highlight, and reports only the chosen name upward, so typing in one does not
 * re-render the other three or the comparison below.
 *
 * IT WORKS BOTH WAYS. Opening the field shows a list to browse; typing searches the
 * whole directory. Both are the same request to `/api/operators/names` — an empty
 * `q` is the browse case — so the two behaviours share one code path, one cache and
 * one set of states.
 *
 * THE OPTIONS COME FROM THE SERVER, A QUERY AT A TIME. The full name list is 24,742
 * records and 342 KB gzipped, which is not something a combobox can hold: it would
 * cost more transfer than the rest of the page and land as a 24,742-element parse
 * on the main thread. `/api/operators/names` keeps the list server-side and returns
 * fifty rows to browse or twenty to a search — under a few kilobytes either way,
 * and the header states the full count so the head of the list is not mistaken for
 * all of it.
 *
 * THREE THINGS KEEP THAT CHEAP. Keystrokes are debounced, so a request follows a
 * pause rather than a letter. A superseded request is aborted, so the slowest reply
 * can never overwrite the newest. And answered queries are remembered in a cache
 * shared by all four slots, so backspacing, retyping, or searching the same
 * operator in a second slot costs nothing.
 *
 * ARIA. The combobox-with-listbox pattern: the input carries `role="combobox"`,
 * `aria-expanded` and `aria-controls`, the popup is a real `listbox` of `option`s,
 * and the keyboard highlight is published through `aria-activedescendant` rather
 * than by moving focus — so the input keeps focus and keeps receiving keystrokes
 * while the highlight walks the list.
 */

/** A pause this long after the last keystroke sends one request. */
const DEBOUNCE_MS = 200;

/**
 * Query → matches, for the life of the page and shared by every slot.
 *
 * Module scope on purpose: four independent components searching the same
 * directory should not each pay for "eog". The values are small (twenty names at
 * most) and the endpoint is cached behind its own revalidate, so a stale entry is
 * no worse than the response it came from.
 */
const matchCache = new Map<string, OperatorNameResult>();

/**
 * `query` + `offset` → that page.
 *
 * JSON rather than a joined string: a query can contain any character a name can,
 * so a plain separator risks colliding with one — and an invisible control
 * character as the separator turns the source file binary to grep and to git.
 */
function pageKey(query: string, offset: number): string {
  return JSON.stringify([query, offset]);
}

/** How close to the end of the list counts as reaching the bottom, in pixels. */
const SCROLL_THRESHOLD = 96;

export function OperatorSlotPicker({
  slot,
  value,
  rank,
  monogram,
  logoUrl,
  takenNames,
  onSelect,
  onClear,
  inputRef,
}: {
  /** 0–3. Drives the colour dot and the A–D label. */
  slot: number;
  /** The chosen operator's name, or "" when the slot is empty. */
  value: string;
  /** Statewide rank once the figures have arrived; null while loading or failed. */
  rank: number | null;
  /** The chosen operator's initials, or null when the slot is empty. */
  monogram: string | null;
  /** The chosen operator's logo, or null — the tile falls back to the initials. */
  logoUrl: string | null;
  /** Names held by the *other* slots — an operator cannot be compared to itself. */
  takenNames: Set<string>;
  onSelect: (name: string) => void;
  onClear: () => void;
  /** Lets the page focus this field from "Edit selection". */
  inputRef?: (element: HTMLInputElement | null) => void;
}) {
  const [open, setOpen] = useState(false);
  /** null means "not searching" — the field shows the selected operator instead. */
  const [query, setQuery] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(-1);
  /**
   * The logo of the match this slot picked, remembered so the tile fills in on the
   * click rather than when the comparison lands. The page's `logoUrl` prop only
   * exists once two operators are chosen — the first selection would otherwise sit
   * as initials until a second one joined it.
   */
  const [chosen, setChosen] = useState<{
    name: string;
    logo: string | null;
  } | null>(null);
  /**
   * How many pages have been asked for, and which query they belong to. Holding
   * both together means a new query resets the paging by derivation rather than by
   * a second `setState` — see `pages` below.
   */
  const [paging, setPaging] = useState<{ needle: string; pages: number }>({
    needle: "",
    pages: 1,
  });
  /** Bumped when a page lands, so the cache is read again. */
  const [, setPageLoaded] = useState(0);

  const baseId = useId();
  const inputId = `${baseId}-input`;
  const listboxId = `${baseId}-listbox`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const boxRef = useRef<HTMLDivElement | null>(null);
  const localInputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const needle = (query ?? "").trim();

  /**
   * THE LIST IS ASSEMBLED FROM THE CACHE ON EVERY RENDER, and every bit of the
   * slot's status is derived from what it finds — none of it is mirrored into
   * state. A page already held renders in the same pass, so scrolling back up and
   * down never re-requests and never flashes a spinner. (Mirroring it would also
   * trip `react-hooks/set-state-in-effect`, which is right to flag it.)
   *
   * Resetting on a new query is derivation too: `paging` remembers which query its
   * count belongs to, so a different query reads as one page again with no extra
   * `setState`.
   *
   * OFFSETS COME FROM THE PAGES THEMSELVES, accumulated from how many rows each one
   * returned, so the client never has to agree with the server about a page size.
   */
  const pages = paging.needle === needle ? paging.pages : 1;

  const matches: OperatorNameMatch[] = [];
  let total = 0;
  let missingOffset = -1;
  let exhausted = false;

  for (let page = 0; page < pages; page += 1) {
    const hit = matchCache.get(pageKey(needle, matches.length));
    if (!hit) {
      missingOffset = matches.length;
      break;
    }
    if (page === 0) total = hit.total;
    // An empty page is the end of the set; asking again would not advance.
    if (hit.matches.length === 0) {
      exhausted = true;
      break;
    }
    matches.push(...hit.matches);
  }

  const searching = open && missingOffset !== -1;
  /**
   * Only the FIRST page may replace the list with a placeholder. Once there are
   * rows, a page in flight is reported by the tail row instead — swapping the whole
   * listbox out mid-scroll destroys the rows under the pointer, resets scrollTop,
   * and leaves nothing to scroll, which stops any further page from ever being
   * asked for.
   */
  const loadingFirstPage = searching && matches.length === 0;
  const hasMore = !exhausted && matches.length < total;

  /**
   * Fetch whatever is not already answered, debounced and abortable.
   *
   * GATED ON `open`, which is what keeps four idle comboboxes from each asking for
   * the browse list on page load. Nothing is requested until a field is actually
   * opened, so the initial render still costs no operator request at all.
   *
   * Opening and scrolling skip the debounce — that delay exists to swallow
   * keystrokes, and neither produces any.
   */
  useEffect(() => {
    if (!open || missingOffset === -1) return;

    const controller = new AbortController();
    const offset = missingOffset;

    const timer = setTimeout(
      () => {
        fetch(
          `/api/operators/names?q=${encodeURIComponent(needle)}&offset=${offset}`,
          { signal: controller.signal },
        )
          .then((response) =>
            response.ok ? response.json() : { matches: [], total: 0 },
          )
          .then((payload: Partial<OperatorNameResult>) => {
            const found: OperatorNameResult = {
              matches: payload.matches ?? [],
              total: payload.total ?? 0,
            };
            matchCache.set(pageKey(needle, offset), found);
            setPageLoaded((count) => count + 1);
          })
          .catch(() => {
            // An aborted request was superseded, not failed; the newer one owns the
            // state. Anything else resolves to nothing and shows the empty copy.
            if (controller.signal.aborted) return;
            // Cache the emptiness too, so a failed page is not retried in a loop.
            matchCache.set(pageKey(needle, offset), { matches: [], total: 0 });
            setPageLoaded((count) => count + 1);
          });
      },
      needle !== "" && offset === 0 ? DEBOUNCE_MS : 0,
    );

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [needle, open, missingOffset]);

  /** Close when the pointer goes down anywhere outside this field. */
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery(null);
        setHighlight(-1);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  /* An operator already in another slot is offered but not selectable twice. This
     is a filter over at most twenty rows — cheap enough that memoising it would
     cost more in bookkeeping than it saves. */
  const visible = matches.filter(
    (match) => match.name === value || !takenNames.has(match.name),
  );

  /**
   * Ask for the next page when the scroller nears its end.
   *
   * Reading `scrollTop` in the handler rather than observing a sentinel: this is one
   * bounded element, the read is on an event the browser is already dispatching, and
   * it avoids an IntersectionObserver per slot. A page in flight or an exhausted set
   * short-circuits before any state is touched, so scrolling at the bottom of the
   * list cannot queue a run of duplicate requests.
   */
  function onListScroll(event: React.UIEvent<HTMLUListElement>) {
    if (searching || !hasMore) return;

    const list = event.currentTarget;
    if (
      list.scrollTop + list.clientHeight <
      list.scrollHeight - SCROLL_THRESHOLD
    ) {
      return;
    }
    setPaging({ needle, pages: pages + 1 });
  }

  function close() {
    setOpen(false);
    setQuery(null);
    setHighlight(-1);
  }

  function choose(match: OperatorNameMatch | undefined) {
    if (!match) return;
    setChosen({ name: match.name, logo: match.logoUrl });
    onSelect(match.name);
    close();
    // Focus stays in the field so the next Tab continues through the form rather
    // than restarting at the top of the document.
    localInputRef.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" || event.key === "Tab") {
      // Tabbing away commits nothing and closes — the same as clicking elsewhere.
      close();
      return;
    }

    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      setOpen(true);
      setHighlight(0);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((current) => Math.min(visible.length - 1, current + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((current) => Math.max(0, current - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setHighlight(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setHighlight(visible.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      // Enter with nothing highlighted takes the first match, which is what makes
      // "type three letters, press Enter" work.
      choose(visible[highlight] ?? visible[0]);
    }
  }

  /** Keep the highlighted option in view as the keyboard walks past the fold. */
  useEffect(() => {
    if (highlight < 0) return;
    listRef.current
      ?.querySelector(`[data-index="${highlight}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  const displayValue = query === null ? value : query;

  return (
    <div className="min-w-0">
      <label
        htmlFor={inputId}
        className="mb-[7px] flex items-center gap-2 truncate text-[12px] font-bold uppercase tracking-[.04em] text-mv-muted"
      >
        <span
          aria-hidden="true"
          className="h-[10px] w-[10px] shrink-0 rounded-full"
          /* One accent, not four: green marks a filled slot, the same green as the
             "N of 4 selected" tick above. Which slot this is, is already spelled out
             by the label beside the dot, and which operator by the tile below it. */
          style={{
            background: value
              ? "var(--color-mv-green-deep)"
              : "var(--color-mv-scroll)",
          }}
        />
        Operator {SLOT_LABELS[slot]}
        {slot >= 2 ? " · optional" : ""}
      </label>

      <div ref={boxRef} className="relative min-w-0">
        <div
          className="flex h-12 min-w-0 items-center gap-2 rounded-[11px] border bg-white pl-3 pr-[10px] transition-[border-color,box-shadow] focus-within:border-mv-green focus-within:ring-[3px] focus-within:ring-[rgba(84,191,150,.16)]"
          /* Neutral whichever slot this is: four differently-coloured input
             outlines side by side was the loudest thing on the page, and the dot
             beside the label already identifies the slot. */
        >
          {value && monogram ? (
            <OperatorLogo
              url={logoUrl ?? (chosen?.name === value ? chosen.logo : null)}
              monogram={monogram}
              size={28}
              radius={8}
              monogramClassName="!rounded-lg"
            />
          ) : (
            <Search
              aria-hidden="true"
              className="h-[17px] w-[17px] shrink-0 text-mv-muted"
              strokeWidth={1.9}
            />
          )}

          <input
            id={inputId}
            ref={(element) => {
              localInputRef.current = element;
              inputRef?.(element);
            }}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              open && highlight >= 0 ? optionId(highlight) : undefined
            }
            autoComplete="off"
            placeholder="Search operator…"
            value={displayValue}
            onFocus={(event) => {
              setOpen(true);
              setHighlight(-1);
              // Selecting the text means typing replaces the current operator
              // instead of appending to its name.
              event.currentTarget.select();
            }}
            onChange={(event) => {
              setOpen(true);
              setQuery(event.target.value);
              setHighlight(-1);
            }}
            onKeyDown={onKeyDown}
            className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-mv-ink outline-none placeholder:font-normal placeholder:text-mv-muted"
          />

          {value ? (
            <>
              {/* Only when a rank is actually known. `/operators/compare` reports
                  none, so the em-dash placeholder would now sit in every filled
                  slot permanently, reading like a figure that never loaded. The
                  fixed width stays for the case where one IS known: it stops the
                  chip resizing as the figures land and dragging the clear button
                  with it. 46px holds every rank in the directory — five digits is
                  the widest there is. */}
              {rank === null ? null : (
                <span className="inline-flex min-w-[46px] shrink-0 justify-center rounded-full border border-mv-line bg-mv-bg px-2 py-[2px] text-[12px] font-bold tabular-nums text-mv-muted">
                  #{rank}
                </span>
              )}
              <button
                type="button"
                tabIndex={-1}
                aria-label={`Clear operator ${SLOT_LABELS[slot]}`}
                // `pointerdown` default is prevented so clearing does not first
                // blur the input and close the popup out from under the click.
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => {
                  onClear();
                  setQuery(null);
                  localInputRef.current?.focus();
                }}
                className="shrink-0 cursor-pointer rounded-md border-0 bg-transparent p-1 text-mv-muted hover:bg-mv-bg hover:text-mv-ink"
              >
                <X
                  aria-hidden="true"
                  className="h-[15px] w-[15px]"
                  strokeWidth={2.2}
                />
              </button>
            </>
          ) : (
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none h-[7px] w-[11px] shrink-0 text-mv-muted"
              strokeWidth={1.8}
            />
          )}
        </div>

        {/* Rendered only while open: four always-mounted listboxes would be eighty
            rows of DOM on a page that starts with nothing selected. */}
        {open ? (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-xl border border-mv-line bg-white shadow-mv-lg">
            <p
              aria-live="polite"
              className="border-b border-mv-line-soft bg-mv-bg px-[13px] py-[9px] text-[12px] font-semibold text-mv-muted"
            >
              {loadingFirstPage
                ? "Searching…"
                : needle === ""
                  ? /* Browsing. Say how many are shown AND how many exist, so the
                       head of the list does not read as the whole directory. */
                    `${visible.length} of ${total.toLocaleString("en-US")} operators · scroll for more, or type to search`
                  : total > visible.length
                    ? `${visible.length} of ${total.toLocaleString("en-US")} matching · scroll for more`
                    : `${visible.length} operator${visible.length === 1 ? "" : "s"} matching`}
            </p>

            {loadingFirstPage ? (
              /* One row's worth of height while the request is out, so the popup
                 does not grow from nothing to twenty rows under the pointer. */
              <p className="px-[13px] py-[9px] text-[13px] text-mv-muted">
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-[160px] animate-pulse rounded bg-mv-line-soft align-middle"
                />
              </p>
            ) : visible.length === 0 ? (
              <p className="p-4 text-center text-[13px] text-mv-muted">
                {needle === ""
                  ? "No operators are available just now."
                  : `No operators match “${needle}”.`}
              </p>
            ) : (
              <ul
                ref={listRef}
                id={listboxId}
                role="listbox"
                aria-label={`Operator ${SLOT_LABELS[slot]}`}
                onScroll={onListScroll}
                className="m-0 max-h-[280px] list-none overflow-auto p-0 [scrollbar-color:var(--color-mv-scroll)_transparent] [scrollbar-width:thin]"
              >
                {visible.map((match, index) => {
                  const isCurrent = match.name === value;
                  return (
                    <li
                      key={match.name}
                      id={optionId(index)}
                      role="option"
                      aria-selected={isCurrent}
                      data-index={index}
                      // `pointerdown`, not `click`: the field's outside-pointerdown
                      // listener would otherwise close the popup before a click
                      // could land on the row.
                      onPointerDown={(event) => {
                        event.preventDefault();
                        choose(match);
                      }}
                      onMouseEnter={() => setHighlight(index)}
                      className={`grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-[10px] border-b border-mv-line-soft px-[13px] py-[9px] last:border-b-0 ${
                        index === highlight || isCurrent
                          ? "bg-mv-tint"
                          : "bg-white"
                      }`}
                    >
                      <OperatorLogo
                        url={match.logoUrl}
                        monogram={match.monogram}
                        size={26}
                        radius={10}
                      />
                      <span className="truncate text-[13px] font-semibold text-mv-ink">
                        {match.name}
                      </span>
                      <span className="whitespace-nowrap text-[12px] font-bold text-mv-green-deep">
                        {isCurrent ? "✓" : "Select"}
                      </span>
                    </li>
                  );
                })}

                {/* The tail. It is inside the scroller and always rendered while
                    more remain, so reaching it is what asks for the next page and
                    the list never jumps by appearing and disappearing. */}
                {hasMore ? (
                  <li
                    aria-hidden="true"
                    className="px-[13px] py-[9px] text-[12px] text-mv-muted"
                  >
                    <span className="inline-block h-3 w-[140px] animate-pulse rounded bg-mv-line-soft align-middle" />
                  </li>
                ) : null}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
