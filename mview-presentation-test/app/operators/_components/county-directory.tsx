"use client";

import { MapPin, Search } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";

import {
  COUNTY_LETTERS,
  COUNTY_LETTERS_PRESENT,
  TEXAS_COUNTIES,
} from "@/lib/texas-counties";

/**
 * "Browse operators by county" — the design's v46 county directory: an A–Z
 * filter, a search box, and a grid over all 254 Texas counties.
 *
 * Filtering is local and instant because the county list is static public
 * record; nothing here needs the operator API. The county pages themselves do,
 * so the links are the prototype's paths against routes that do not exist yet.
 *
 * Letters no county starts with are rendered disabled rather than hidden, so
 * the row keeps a stable width and does not reflow as the search narrows.
 */

export function CountyDirectory() {
  const [letter, setLetter] = useState("ALL");
  const [term, setTerm] = useState("");
  const searchId = useId();

  const visible = useMemo(() => {
    const query = term.trim().toLowerCase();
    return TEXAS_COUNTIES.filter((county) => {
      if (letter !== "ALL" && county[0].toUpperCase() !== letter) return false;
      if (query && !`${county} county, texas`.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [letter, term]);

  function reset() {
    setTerm("");
    setLetter("ALL");
  }

  return (
    <div className="mt-[18px] rounded-2xl border border-mv-line bg-white px-[22px] py-5 shadow-mv max-[767px]:px-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div
          role="group"
          aria-label="Filter counties by first letter"
          className="flex flex-wrap gap-[6px]"
        >
          {COUNTY_LETTERS.map((value) => {
            const disabled =
              value !== "ALL" && !COUNTY_LETTERS_PRESENT.has(value);
            const active = value === letter;
            return (
              <button
                key={value}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() => setLetter(value)}
                className={`min-w-[34px] cursor-pointer rounded-[9px] border px-[9px] py-[7px] font-sans text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep disabled:cursor-not-allowed disabled:opacity-40 ${
                  active
                    ? "border-mv-green-deep bg-mv-green-deep text-white"
                    : "border-mv-line bg-white text-mv-ink enabled:hover:border-mv-green enabled:hover:text-mv-green-deep"
                }`}
              >
                {value}
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[230px] shrink-0 max-[560px]:w-full max-[560px]:min-w-0">
          <label htmlFor={searchId} className="sr-only">
            Search counties
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-[13px] top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa3ae]"
            strokeWidth={1.8}
          />
          <input
            id={searchId}
            type="text"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search a county…"
            className="h-[42px] w-full rounded-[10px] border border-mv-line bg-white py-2 pl-[38px] pr-[14px] font-sans text-sm text-mv-ink outline-none focus-visible:border-mv-green focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.16)]"
          />
        </div>
      </div>

      <p aria-live="polite" className="mx-[2px] mt-4 text-[13px] text-mv-muted">
        Showing <b className="font-bold text-mv-ink">{visible.length}</b> of{" "}
        <b className="font-bold text-mv-ink">{TEXAS_COUNTIES.length}</b> counties
      </p>

      {visible.length > 0 ? (
        <ul className="mt-[14px] grid list-none grid-cols-[repeat(auto-fill,minmax(215px,1fr))] gap-[10px] p-0 max-[560px]:grid-cols-2 max-[560px]:gap-2">
          {visible.map((county) => (
            <li key={county}>
              <Link
                href={`/operators/county/${encodeURIComponent(county.toLowerCase().replace(/\s+/g, "-"))}`}
                className="group flex items-center gap-[10px] rounded-[11px] border border-mv-line bg-white px-[13px] py-[11px] text-sm font-medium text-mv-ink !no-underline transition-[border-color,color,box-shadow,transform] hover:-translate-y-px hover:border-mv-green hover:text-mv-green-deep hover:shadow-[0_5px_14px_rgba(47,138,102,.10)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep max-[560px]:px-[11px] max-[560px]:py-[10px] max-[560px]:text-[13px]"
              >
                <MapPin
                  aria-hidden="true"
                  className="h-[15px] w-[15px] shrink-0 text-[#9aa3ae] group-hover:text-mv-green-deep"
                  strokeWidth={1.7}
                />
                <span className="min-w-0 flex-1 truncate">
                  {county} County, Texas
                </span>
                <span
                  aria-hidden="true"
                  className="text-[15px] font-semibold text-[#c4cbd3] group-hover:text-mv-green-deep"
                >
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-[10px] py-11 text-center text-sm text-mv-muted">
          No counties match your filter.{" "}
          <button
            type="button"
            onClick={reset}
            className="cursor-pointer border-0 bg-transparent p-0 font-sans text-[13.5px] font-semibold text-mv-green-deep hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
          >
            Clear filter
          </button>
        </p>
      )}
    </div>
  );
}
