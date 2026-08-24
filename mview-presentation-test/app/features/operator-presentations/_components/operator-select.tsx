"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

/**
 * The Operator filter: the operators that actually have presentations.
 *
 * IT OFFERS THIRTY, NOT 24,742, AND THAT IS THE POINT. Feeding this from the full
 * operator directory produced an alphabetical list headed by "1-2-3 Operating, LLC"
 * and "14start, LLC", with Chevron and ConocoPhillips buried thousands of rows down.
 * `/api/operators/presentations/operators` returns only the operators with a deck on
 * file — the thirty that the library actually covers.
 *
 * THE WHOLE LIST ARRIVES IN ONE REQUEST, under two kilobytes, so filtering happens
 * in the browser: no request per keystroke, and the list opens instantly on the
 * second use. That is only affordable because the set is thirty; it is exactly why
 * the directory-wide picker on the compare page has to work the other way round.
 *
 * TYPING MATCHES NAME OR NUMBER. Each entry carries its RRC number, so "chevron" and
 * "217426" both find their operator. Rows show the name alone — a number on every
 * line is chrome a native select does not have.
 *
 * IT LOOKS LIKE A NATIVE SELECT: same height, border, radius and chevron as the date
 * inputs beside it, and a plain list with a solid fill on the current row.
 *
 * ARIA. The combobox-with-listbox pattern: `role="combobox"` on the input,
 * `aria-expanded`, `aria-controls`, and the highlight published through
 * `aria-activedescendant` so focus stays in the field while the list is walked.
 */

interface PresentationOperator {
  name: string;
  operatorNumber: string | null;
}

/** Fetched once per page load and shared by every instance. */
let optionsMemo: PresentationOperator[] | null = null;
let optionsInFlight: Promise<PresentationOperator[]> | null = null;

function loadOptions(): Promise<PresentationOperator[]> {
  if (optionsMemo) return Promise.resolve(optionsMemo);
  optionsInFlight ??= fetch("/api/operators/presentations/operators")
    .then((response) => (response.ok ? response.json() : { operators: [] }))
    .then((payload: { operators?: PresentationOperator[] }) => {
      optionsMemo = payload.operators ?? [];
      return optionsMemo;
    })
    .catch(() => {
      // A filter that cannot offer options is a degraded control, not a broken
      // page — every other part keeps working, and "All operators" still applies.
      optionsMemo = [];
      return optionsMemo;
    })
    .finally(() => {
      optionsInFlight = null;
    });
  return optionsInFlight;
}

/** How the endpoint spells "no operator filter"; also the first row's label. */
const ALL_LABEL = "All operators";

export function OperatorSelect({
  id,
  value,
  onChange,
  className = "",
}: {
  id: string;
  /** The chosen operator's name, or "" for every operator. */
  value: string;
  /** The name is what the request needs; the number is passed along for display. */
  onChange: (name: string, operatorNumber: string | null) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  /** null means "not searching" — the field shows the current selection. */
  const [query, setQuery] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(-1);
  const [options, setOptions] = useState<PresentationOperator[] | null>(
    optionsMemo,
  );

  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const needle = (query ?? "").trim().toLowerCase();
  const loading = open && options === null;

  /** Fetched when the field is first opened, never on page load. */
  useEffect(() => {
    if (!open || options !== null) return;
    let active = true;
    loadOptions().then((loaded) => {
      if (active) setOptions(loaded);
    });
    return () => {
      active = false;
    };
  }, [open, options]);

  /** Close when the pointer goes down outside the field. */
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (highlight < 0) return;
    listRef.current
      ?.querySelector(`[data-index="${highlight}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  function close() {
    setOpen(false);
    setQuery(null);
    setHighlight(-1);
  }

  /* "All operators" is always the first row, so clearing the filter never depends on
     a request having succeeded. Thirty entries filtered on every keystroke is far
     below the point where memoising would earn its keep — but the list is a new
     array each render and the effects below read it, so it is memoised anyway. */
  const rows = useMemo(() => {
    const matched = (options ?? []).filter(
      (option) =>
        needle === "" ||
        option.name.toLowerCase().includes(needle) ||
        (option.operatorNumber ?? "").includes(needle),
    );
    return [
      { name: "", label: ALL_LABEL, number: null as string | null },
      ...matched.map((option) => ({
        name: option.name,
        label: option.name,
        number: option.operatorNumber,
      })),
    ];
  }, [options, needle]);

  function choose(index: number) {
    const row = rows[index];
    if (!row) return;
    onChange(row.name, row.number);
    close();
    inputRef.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" || event.key === "Tab") {
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
      setHighlight((current) => Math.min(rows.length - 1, current + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((current) => Math.max(0, current - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(highlight >= 0 ? highlight : 0);
    }
  }

  return (
    <div ref={boxRef} className="relative min-w-0">
      <input
        id={id}
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && highlight >= 0 ? optionId(highlight) : undefined
        }
        autoComplete="off"
        placeholder="All operators"
        value={query === null ? value : query}
        onFocus={(event) => {
          setOpen(true);
          setHighlight(-1);
          event.currentTarget.select();
        }}
        onChange={(event) => {
          setOpen(true);
          setQuery(event.target.value);
          setHighlight(-1);
        }}
        onKeyDown={onKeyDown}
        className={`${className} cursor-pointer truncate pr-[34px]`}
      />

      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mv-muted"
        strokeWidth={2.2}
      />

      {open ? (
        /* Styled after a native select's popup: a plain list, one line per
           operator, and a solid fill on the row you are on. No header row, no
           per-row badges — the chrome is what made it look unlike the rest of the
           site's dropdowns. */
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-40 overflow-hidden rounded-[10px] border border-mv-line bg-white shadow-mv-lg">
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label="Operator"
            className="m-0 max-h-[280px] list-none overflow-auto py-1 [scrollbar-color:var(--color-mv-scroll)_transparent] [scrollbar-width:thin]"
          >
            {rows.map((row, index) => {
              const isCurrent = row.name === value;
              const isActive = index === highlight || isCurrent;
              return (
                <li
                  key={row.name || "__all"}
                  id={optionId(index)}
                  role="option"
                  aria-selected={isCurrent}
                  data-index={index}
                  // `pointerdown`, not `click`: the outside-pointerdown listener
                  // would otherwise close the popup before a click could land.
                  onPointerDown={(event) => {
                    event.preventDefault();
                    choose(index);
                  }}
                  onMouseEnter={() => setHighlight(index)}
                  className={`cursor-pointer truncate px-3 py-[6px] text-[13.5px] leading-[1.45] ${
                    isActive
                      ? "bg-mv-green-deep text-white"
                      : "bg-white text-mv-ink"
                  }`}
                >
                  {row.label}
                </li>
              );
            })}

            {/* Both states are a row in the list rather than a banner above it, so
                the popup keeps one shape whatever it is doing. */}
            {loading ? (
              <li
                aria-hidden="true"
                className="px-3 py-[6px] text-[13.5px] text-mv-muted"
              >
                Loading operators…
              </li>
            ) : null}

            {!loading && needle !== "" && rows.length === 1 ? (
              <li
                aria-hidden="true"
                className="px-3 py-[6px] text-[13.5px] text-mv-muted"
              >
                No operators match “{query?.trim()}”.
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
