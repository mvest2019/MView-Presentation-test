"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { OperatorLogo } from "@/app/_components/operator-logo";
import { operatorLogoPath } from "@/lib/operator-api-types";
import { monogramOf } from "@/lib/operator-statistics";

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
 * IT IS THE COMPARE PAGES' PICKER, VISUALLY (requested). Same field - search icon,
 * the chosen operator's logo tile, a clear cross, the same focus ring - and the same
 * popup: rows of logo, name and a "Select" affordance, with a tick on the current one.
 * The one thing not copied is the 48px height. This sits in a filter bar whose columns
 * are 46px and are aligned to each other, and two pixels of "exactly the same" is not
 * worth the row going crooked.
 *
 * THE OPTIONS STAY DECK-ONLY. The compare picker reads `/api/operators/names`, the
 * whole 24,742-record directory. This deliberately does not: only about thirty
 * operators have a presentation on file, so the directory would offer thousands of
 * choices that return nothing. Same control, same behaviour, a list that can answer.
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
}: {
  id: string;
  /** The chosen operator's name, or "" for every operator. */
  value: string;
  /** The name is what the request needs; the number is passed along for display. */
  onChange: (name: string, operatorNumber: string | null) => void;
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

  /** The chosen row, for the field's logo tile. */
  const selected = rows.find((row) => row.name !== "" && row.name === value);

  return (
    <div ref={boxRef} className="relative min-w-0">
      {/* The compare picker's field, at this bar's control height. */}
      <div className="flex h-[46px] min-w-0 items-center gap-2 rounded-[11px] border border-mv-line bg-white pl-3 pr-[10px] transition-[border-color,box-shadow] focus-within:border-mv-green focus-within:ring-[3px] focus-within:ring-[rgba(84,191,150,.16)]">
        {selected ? (
          <OperatorLogo
            url={selected.number ? operatorLogoPath(selected.number) : null}
            monogram={monogramOf(selected.label)}
            size={26}
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
          placeholder={ALL_LABEL}
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
          className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-mv-ink outline-none placeholder:font-normal placeholder:text-mv-muted"
        />

        {value ? (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Clear operator"
            // `pointerdown` default prevented so clearing does not blur the input
            // and close the popup out from under the click.
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => {
              onChange("", null);
              setQuery(null);
              inputRef.current?.focus();
            }}
            className="shrink-0 cursor-pointer rounded-md border-0 bg-transparent p-1 text-mv-muted hover:bg-mv-bg hover:text-mv-ink"
          >
            <X
              aria-hidden="true"
              className="h-[15px] w-[15px]"
              strokeWidth={2.2}
            />
          </button>
        ) : (
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none h-[7px] w-[11px] shrink-0 text-mv-muted"
            strokeWidth={1.8}
          />
        )}
      </div>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-xl border border-mv-line bg-white shadow-mv-lg">
          {loading ? (
            /* One row's worth of height while the list is fetched, so the popup does
               not grow from nothing under the pointer. */
            <p className="px-[13px] py-[9px] text-[13px] text-mv-muted">
              <span
                aria-hidden="true"
                className="inline-block h-3 w-[160px] animate-pulse rounded bg-mv-line-soft align-middle"
              />
            </p>
          ) : rows.length <= 1 && needle !== "" ? (
            <p className="p-4 text-center text-[13px] text-mv-muted">
              No operators match “{needle}”.
            </p>
          ) : (
            <ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label="Operator"
              className="m-0 max-h-[280px] list-none overflow-auto p-0 [scrollbar-color:var(--color-mv-scroll)_transparent] [scrollbar-width:thin]"
            >
              {rows.map((row, index) => {
                const isCurrent = row.name === value;
                const isAll = row.name === "";
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
                    className={`grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-[10px] border-b border-mv-line-soft px-[13px] py-[9px] last:border-b-0 ${
                      index === highlight || isCurrent
                        ? "bg-mv-tint"
                        : "bg-white"
                    }`}
                  >
                    {isAll ? (
                      /* Keeps the three-column grid aligned without inventing a logo
                         for a row that is not an operator. */
                      <span aria-hidden="true" className="h-[26px] w-[26px]" />
                    ) : (
                      <OperatorLogo
                        url={row.number ? operatorLogoPath(row.number) : null}
                        monogram={monogramOf(row.label)}
                        size={26}
                        radius={10}
                      />
                    )}
                    <span className="truncate text-[13px] font-semibold text-mv-ink">
                      {row.label}
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
  );
}
