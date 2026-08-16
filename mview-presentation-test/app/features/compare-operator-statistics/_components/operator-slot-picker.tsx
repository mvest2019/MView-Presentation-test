"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { OperatorMonogram } from "@/app/_components/operator-monogram";
import {
  SLOT_COLORS,
  SLOT_LABELS,
  STATISTICS_OPERATOR_COUNT,
  type StatisticsOption,
} from "@/lib/operator-statistics";

/**
 * One comparison slot: a searchable operator combobox.
 *
 * The design's `.cs-selbox` — a bordered field that shows the chosen operator's
 * tile, name and statewide rank, and turns into a search box the moment it takes
 * focus. Four of these sit side by side; each owns its open/query/highlight state
 * and reports only the chosen slug upward, so typing in one does not re-render the
 * other three or the comparison below.
 *
 * ARIA. This is the combobox-with-listbox pattern, not a text input with a styled
 * div beside it: the input carries `role="combobox"`, `aria-expanded` and
 * `aria-controls`, the popup is a real `listbox` of `option`s, and the keyboard
 * highlight is published through `aria-activedescendant` rather than by moving
 * focus — so the input keeps focus and keeps receiving keystrokes while the
 * highlight walks the list. The prototype styled the same interaction with plain
 * divs and no announced state.
 *
 * FILTERING. `query === null` means "not searching": the field displays the
 * selected operator's name and the list shows everything. That is the design's
 * behaviour — opening a filled slot selects its text so typing replaces it, but
 * the list is not pre-filtered down to the one operator already chosen.
 */

export function OperatorSlotPicker({
  slot,
  value,
  options,
  takenSlugs,
  onSelect,
  onClear,
  inputRef,
}: {
  /** 0–3. Drives the colour dot and the A–D label. */
  slot: number;
  /** The chosen slug, or "" when the slot is empty. */
  value: string;
  options: StatisticsOption[];
  /** Slugs held by the *other* slots — an operator cannot be compared to itself. */
  takenSlugs: Set<string>;
  onSelect: (slug: string) => void;
  onClear: () => void;
  /** Lets the page focus this field from "Edit selection". */
  inputRef?: (element: HTMLInputElement | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(-1);

  const baseId = useId();
  const inputId = `${baseId}-input`;
  const listboxId = `${baseId}-listbox`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const boxRef = useRef<HTMLDivElement | null>(null);
  const localInputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const selected = useMemo(
    () => options.find((option) => option.slug === value) ?? null,
    [options, value],
  );

  const visible = useMemo(() => {
    const needle = (query ?? "").trim().toLowerCase();
    return options.filter((option) => {
      if (option.slug !== value && takenSlugs.has(option.slug)) return false;
      return !needle || option.haystack.includes(needle);
    });
  }, [options, query, takenSlugs, value]);

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

  function close() {
    setOpen(false);
    setQuery(null);
    setHighlight(-1);
  }

  function choose(option: StatisticsOption | undefined) {
    if (!option) return;
    onSelect(option.slug);
    close();
    // Focus stays in the field so the next Tab continues through the form rather
    // than restarting at the top of the document.
    localInputRef.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      close();
      return;
    }

    if (event.key === "Tab") {
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

  const displayValue = query === null ? (selected?.name ?? "") : query;
  const isFiltering = query !== null && query.trim().length > 0;

  return (
    <div className="min-w-0">
      <label
        htmlFor={inputId}
        className="mb-[7px] flex items-center gap-2 truncate text-[12px] font-bold uppercase tracking-[.04em] text-mv-muted"
      >
        <span
          aria-hidden="true"
          className="h-[10px] w-[10px] shrink-0 rounded-full"
          style={{ background: selected ? SLOT_COLORS[slot] : "var(--color-mv-scroll)" }}
        />
        Operator {SLOT_LABELS[slot]}
        {slot >= 2 ? " · optional" : ""}
      </label>

      <div ref={boxRef} className="relative min-w-0">
        <div
          className="flex h-12 min-w-0 items-center gap-2 rounded-[11px] border bg-white pl-3 pr-[10px] transition-[border-color,box-shadow] focus-within:border-mv-green focus-within:ring-[3px] focus-within:ring-[rgba(84,191,150,.16)]"
          style={selected ? { borderColor: SLOT_COLORS[slot] } : undefined}
        >
          {selected ? (
            <OperatorMonogram monogram={selected.monogram} size={28} className="!rounded-lg" />
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

          {selected ? (
            <>
              <span className="shrink-0 rounded-full border border-mv-line bg-mv-bg px-2 py-[2px] text-[12px] font-bold text-mv-muted">
                #{selected.rank}
              </span>
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
                <X aria-hidden="true" className="h-[15px] w-[15px]" strokeWidth={2.2} />
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

        {/* Rendered only while open: four always-mounted 30-item listboxes would be
            120 rows of DOM on a page that starts with nothing selected. */}
        {open ? (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-xl border border-mv-line bg-white shadow-mv-lg">
            <p className="border-b border-mv-line-soft bg-mv-bg px-[13px] py-[9px] text-[12px] font-semibold text-mv-muted">
              {visible.length} operator{visible.length === 1 ? "" : "s"}
              {isFiltering
                ? " matching"
                : ` · type to search all ${STATISTICS_OPERATOR_COUNT}`}
            </p>

            {visible.length === 0 ? (
              <p className="p-4 text-center text-[13px] text-mv-muted">
                No operators match “{query?.trim()}”.
              </p>
            ) : (
              <ul
                ref={listRef}
                id={listboxId}
                role="listbox"
                aria-label={`Operator ${SLOT_LABELS[slot]}`}
                className="m-0 max-h-[280px] list-none overflow-auto p-0 [scrollbar-color:var(--color-mv-scroll)_transparent] [scrollbar-width:thin]"
              >
                {visible.map((option, index) => {
                  const isCurrent = option.slug === value;
                  return (
                    <li
                      key={option.slug}
                      id={optionId(index)}
                      role="option"
                      aria-selected={isCurrent}
                      data-index={index}
                      // `pointerdown`, not `click`: the field's outside-pointerdown
                      // listener would otherwise close the popup before a click
                      // could land on the row.
                      onPointerDown={(event) => {
                        event.preventDefault();
                        choose(option);
                      }}
                      onMouseEnter={() => setHighlight(index)}
                      className={`grid cursor-pointer grid-cols-[auto_auto_1fr_auto_auto] items-center gap-[10px] border-b border-mv-line-soft px-[13px] py-[9px] last:border-b-0 ${
                        index === highlight || isCurrent ? "bg-mv-tint" : "bg-white"
                      }`}
                    >
                      <span className="text-[12px] font-bold text-mv-muted">
                        #{option.rank}
                      </span>
                      <OperatorMonogram monogram={option.monogram} size={26} />
                      <span className="truncate text-[13px] font-semibold text-mv-ink">
                        {option.name}
                      </span>
                      <span className="whitespace-nowrap text-[12px] tabular-nums text-mv-muted">
                        {option.boeLabel}
                      </span>
                      <span className="whitespace-nowrap text-[12px] font-bold text-mv-green-deep">
                        {isCurrent ? "✓" : "Select"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
