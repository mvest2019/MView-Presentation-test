"use client";

import { Search } from "lucide-react";

import { type MapWellLookup } from "@/lib/map-api";

/*
 * The dropdown under the toolbar's API-number box.
 *
 * Rendered outside the toolbar rather than inside it: the toolbar scrolls
 * horizontally and `overflow-x` clips on both axes, so a nested dropdown would
 * be sliced off. `map-chrome.tsx` measures where to put it.
 */

type ApiResultsProps = {
  results: MapWellLookup[];
  /** What was typed, so the matching part of each number can be marked. */
  query: string;
  activeIndex: number;
  loading: boolean;
  error: string | null;
  /** Fewer than the minimum characters — the box is waiting, not empty. */
  tooShort: boolean;
  onHover: (index: number) => void;
  onPick: (well: MapWellLookup) => void;
  style: React.CSSProperties;
};

export function ApiResults({
  results,
  query,
  activeIndex,
  loading,
  error,
  tooShort,
  onHover,
  onPick,
  style,
}: ApiResultsProps) {
  const empty = tooShort || loading || error || results.length === 0;

  /*
   * A line of prose takes the field's width; a list takes its own.
   *
   * `minWidth` is the field, measured by the caller. Holding the panel to it
   * while there is nothing to list keeps the message square under the box it
   * belongs to, rather than in a wider one whose edges line up with nothing.
   */
  const box = empty ? { ...style, width: style.minWidth } : style;

  return (
    <ul
      id="map-search-results"
      role="listbox"
      aria-label="Wells matching this API number"
          className="mv-thin-scroll pointer-events-auto absolute z-40 max-h-[264px] w-max max-w-[340px] overflow-y-auto overscroll-contain rounded-xl border border-mv-line bg-white py-1 shadow-mv-lg"
      style={box}
    >
      {empty ? (
        <li className="flex items-start gap-[9px] px-3 py-[10px]">
          {loading ? (
            <span
              aria-hidden="true"
              className="mt-[2px] h-[13px] w-[13px] shrink-0 animate-spin rounded-full border-2 border-mv-line border-t-mv-green-deep"
            />
          ) : (
            <Search
              size={13}
              className="mt-[2px] shrink-0 text-mv-muted"
              aria-hidden="true"
            />
          )}

          <span className="min-w-0">
            <span className="block text-[12px] font-semibold leading-snug text-mv-slate">
              {tooShort
                ? "Keep typing"
                : loading
                  ? "Searching…"
                  : (error ?? "No wells match that number")}
            </span>
            {/* The shape of the thing being asked for, under the instruction
                rather than trailing it across two lines. */}
            {tooShort && (
              <span className="mt-[3px] block text-[11px] leading-snug text-mv-muted">
                Six digits or more, like 42-123-45678
              </span>
            )}
          </span>
        </li>
      ) : (
        results.map((well, index) => (
          <li key={well.api}>
            <button
              type="button"
              id={`map-search-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              // Keeps focus in the field, so the blur never races the click.
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => onHover(index)}
              onClick={() => onPick(well)}
              className={`flex w-full cursor-pointer items-center gap-3 px-3 py-[9px] text-left ${
                index === activeIndex ? "bg-[#f2f8f5]" : ""
              }`}
            >
              <span className="flex-1 whitespace-nowrap font-mono text-[12.5px] tracking-[.01em] text-mv-ink">
                <Marked value={well.api} query={query} />
              </span>
              <span className="max-w-[104px] shrink-0 truncate rounded-full bg-mv-mint px-[8px] py-[3px] text-[10px] font-bold uppercase tracking-[.05em] text-mv-green-deep">
                {well.county}
              </span>
            </button>
          </li>
        ))
      )}
    </ul>
  );
}

/**
 * Marks the part of the number that matched.
 *
 * Comparison is on digits alone, because "42003" and "42-003" are the same
 * prefix — so the run to highlight is found by walking the number and counting
 * digits, not by a substring search.
 */
function Marked({ value, query }: { value: string; query: string }) {
  const digits = query.replace(/\D/g, "");
  if (!digits) return <>{value}</>;

  let seen = 0;
  let end = 0;
  for (const character of value) {
    end += 1;
    if (/\d/.test(character)) seen += 1;
    if (seen === digits.length) break;
  }

  return (
    <>
      <span className="font-semibold text-mv-green-deep">
        {value.slice(0, end)}
      </span>
      {value.slice(end)}
    </>
  );
}
