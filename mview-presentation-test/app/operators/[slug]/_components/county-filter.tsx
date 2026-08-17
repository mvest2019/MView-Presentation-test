"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import {
  CONTROL_CARET,
  CONTROL_TINT,
  SELECT_CLASS,
} from "@/app/_components/control-styles";
import { titleCase } from "@/lib/text-case";

/**
 * The production chart's county filter.
 *
 * WHY THIS IS NOT A `<select>`. It was one, and a native select's popup is drawn by the
 * operating system: its own row height, its own bright-blue active row, its own
 * scrollbar, and no way to reach any of it from CSS. With eighty-odd counties that
 * popup ran the height of the viewport and looked nothing like the surrounding card.
 * Only a listbox built out of real elements can carry the design, so this is one —
 * which also buys the filter field that eighty options need.
 *
 * IT IS STILL A LISTBOX, not a div soup. The trigger reports `aria-expanded` and owns
 * the popup, the popup is `role="listbox"` with `role="option"` rows and
 * `aria-selected`, and the filter field drives `aria-activedescendant` so a screen
 * reader announces the row the arrow keys are on. Escape closes and returns focus to
 * the trigger, Enter takes the active row, Tab and an outside press dismiss. A custom
 * control that drops the keyboard is a regression on the `<select>` it replaced, not an
 * improvement.
 *
 * IT WEARS THE LISTING'S CONTROL STYLE. The trigger uses the very `SELECT_CLASS` and
 * `CONTROL_TINT` the operator listing's Play / Status / Counties selects use, and the
 * same `CONTROL_CARET` placement, so the two read as one control language — mint edge,
 * 10px radius, the green hover and focus ring. The classes are imported, not copied, so
 * a change to the listing's controls reaches this one. Option rows follow the listing's
 * label format too: "Andrews County", not a bare name.
 *
 * THE PANEL IS ANCHORED, NOT PORTALLED. It is absolutely positioned against the
 * trigger, so it needs no portal and no scroll listener; the card it sits in does not
 * clip, and the chart below is not tall enough to matter. Its scroll is capped and
 * `overscroll-contain`ed so flicking through counties never scrolls the page instead.
 */

/** The sentinel for "no county filter" — every county the operator reports in. */
export const ALL_COUNTIES = "__all__";

interface Option {
  value: string;
  label: string;
}

export function CountyFilter({
  value,
  options,
  onChange,
}: {
  /** The selected county, or `ALL_COUNTIES`. */
  value: string;
  /** Raw county names, upper-cased as the API returns them. */
  options: readonly string[];
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const baseId = useId();
  const listId = `${baseId}-list`;

  const items = useMemo<Option[]>(() => {
    const all: Option[] = [
      { value: ALL_COUNTIES, label: "All counties" },
      ...options.map((name) => ({
        value: name,
        label: `${titleCase(name)} County`,
      })),
    ];
    const needle = query.trim().toLowerCase();
    return needle === ""
      ? all
      : all.filter((item) => item.label.toLowerCase().includes(needle));
  }, [options, query]);

  const selectedLabel =
    value === ALL_COUNTIES ? "All counties" : `${titleCase(value)} County`;

  /** Dismiss on an outside press or on Escape, wherever focus happens to be. */
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  /** Opening lands focus in the filter, so typing narrows immediately. */
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  /** Keep the arrow-key row in view without scrolling the page. */
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const commit = (next: string) => {
    onChange(next);
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  };

  const openWith = () => {
    // Start on the selected row, so the list opens where the user left it.
    const at = items.findIndex((item) => item.value === value);
    setActive(at < 0 ? 0 : at);
    setOpen(true);
  };

  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (items.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((at) => (at + step + items.length) % items.length);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : items.length - 1);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const item = items[active];
      if (item) commit(item.value);
      return;
    }
    if (event.key === "Tab") setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className="relative min-w-[180px] max-[560px]:w-full max-[767px]:min-w-full"
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`Filter production by county. Currently ${selectedLabel}.`}
        onClick={() => (open ? setOpen(false) : openWith())}
        className={`${SELECT_CLASS} ${CONTROL_TINT} min-h-[44px] truncate text-left`}
      >
        {selectedLabel}
      </button>
      <ChevronDown
        aria-hidden="true"
        className={`${CONTROL_CARET} transition-transform ${open ? "rotate-180" : ""}`}
        strokeWidth={1.8}
      />

      {open ? (
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[260px] overflow-hidden rounded-[10px] border border-mv-mint-line bg-white shadow-mv-lg max-[560px]:left-0 max-[560px]:w-full">
          <div className="flex items-center gap-2 border-b border-mv-line-soft px-[14px] py-[9px]">
            <Search
              aria-hidden="true"
              className="h-[15px] w-[15px] shrink-0 text-mv-placeholder"
              strokeWidth={1.9}
            />
            <input
              ref={searchRef}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={
                items[active] ? `${baseId}-opt-${active}` : undefined
              }
              placeholder="Search counties…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onSearchKeyDown}
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-mv-ink placeholder:text-mv-placeholder focus:outline-none"
            />
          </div>

          {items.length === 0 ? (
            <p className="px-[14px] py-4 text-center text-sm text-mv-muted">
              No county matches “{query.trim()}”.
            </p>
          ) : (
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label="Counties"
              className="max-h-[264px] overflow-y-auto overscroll-contain py-1"
            >
              {items.map((item, index) => {
                const selected = item.value === value;
                return (
                  <li
                    key={item.value}
                    id={`${baseId}-opt-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={selected}
                    onPointerEnter={() => setActive(index)}
                    onClick={() => commit(item.value)}
                    className={`flex cursor-pointer items-center gap-2 px-[14px] py-2 text-sm ${
                      index === active ? "bg-mv-tint" : "bg-white"
                    } ${
                      selected
                        ? "font-semibold text-mv-green-deep"
                        : "font-medium text-mv-ink"
                    }`}
                  >
                    <Check
                      aria-hidden="true"
                      className={`h-[14px] w-[14px] shrink-0 ${selected ? "opacity-100" : "opacity-0"}`}
                      strokeWidth={2.4}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {item.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
