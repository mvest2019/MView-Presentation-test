"use client";

import { Building2, MapPin, Scroll, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { getMapSearch, type MapSearchResult } from "@/lib/map-api";

/*
 * The table's search box and the dropdown under it.
 *
 * Self-contained: it owns the query, the debounce, the request and the
 * keyboard, and reports only what was chosen. The table decides what a choice
 * means; this only has to find it.
 */

/** Below this the endpoint matches too much to be worth asking. */
const MIN_CHARS = 2;

/** What each result type is, and how it filters. */
const KINDS: Record<
  string,
  { label: string; facet: string; icon: typeof MapPin }
> = {
  county: { label: "County", facet: "county", icon: MapPin },
  operator: { label: "Operator", facet: "operator", icon: Building2 },
  lease: { label: "Lease", facet: "lease", icon: Scroll },
};

export type SearchPick = {
  /** The query parameter this filters on. */
  facet: string;
  /** Its value — an id for operators and fields, a key for leases. */
  param: string;
  /** What to show for it. */
  label: string;
  kind: string;
};

export function TableSearch({
  picked,
  disabled,
  onPick,
  onClear,
}: {
  picked: SearchPick | null;
  disabled?: boolean;
  onPick: (pick: SearchPick) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MapSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const needle = query.trim();
    let cancelled = false;

    // Debounced, or every keystroke is a request the next one replaces.
    const timer = setTimeout(() => {
      if (needle.length < MIN_CHARS) {
        setResults([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      getMapSearch(needle)
        .then((found) => {
          if (cancelled) return;
          setResults(found);
          setError(null);
          setActive(0);
        })
        .catch((failure: unknown) => {
          if (cancelled) return;
          setResults([]);
          setError(failure instanceof Error ? failure.message : "Search failed.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, needle.length < MIN_CHARS ? 0 : 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Dismiss on an outside click or Escape, as the filter dropdowns do.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function choose(result: MapSearchResult) {
    const kind = KINDS[result.type];
    if (!kind) return;

    setQuery("");
    setOpen(false);
    onPick({
      facet: kind.facet,
      // `id` where the filter wants one — an operator's number, a lease's key.
      param: result.id ?? result.value,
      label: result.value || (result.label ?? ""),
      kind: kind.label,
    });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(results[active]);
    }
  }

  // Picked already: the box shows what it is, and offers to drop it.
  if (picked) {
    return (
      <div className="flex w-full items-center gap-2 rounded-lg border border-mv-line bg-white px-[12px] py-[7px] lg:w-auto lg:shrink-0">
        <Search size={14} className="shrink-0 text-mv-muted" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-mv-ink lg:w-[196px]">
          <span className="text-mv-muted">{picked.kind} · </span>
          <span className="font-semibold">{picked.label}</span>
        </span>
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="grid h-[16px] w-[16px] shrink-0 cursor-pointer place-items-center rounded text-mv-muted hover:bg-[#f1f2f4] hover:text-mv-red"
        >
          <X size={12} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>
    );
  }

  const showPanel = open && query.trim().length > 0;

  return (
    <div ref={boxRef} className="relative w-full lg:w-auto lg:shrink-0">
      <div className="flex w-full items-center gap-2 rounded-lg border border-mv-line bg-white px-[12px] py-[7px] focus-within:border-mv-green-deep">
        <Search size={14} className="shrink-0 text-mv-muted" aria-hidden="true" />
        <label htmlFor="table-search" className="sr-only">
          Search leases, operators and counties
        </label>
        <input
          id="table-search"
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={showPanel}
          aria-controls="table-search-results"
          disabled={disabled}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search lease, operator or county"
          className="w-full min-w-0 border-0 bg-transparent text-[12.5px] leading-tight text-mv-ink outline-none placeholder:text-mv-muted lg:w-[210px]"
        />
      </div>

      {showPanel && (
        <ul
          id="table-search-results"
          role="listbox"
          aria-label="Search results"
          className="mv-thin-scroll absolute left-0 top-full z-50 mt-2 max-h-[300px] w-[320px] max-w-[86vw] overflow-y-auto rounded-xl border border-mv-line bg-white py-1 shadow-mv-lg"
        >
          {loading || error || results.length === 0 ? (
            <li className="flex items-center gap-2 px-3 py-[11px] text-[12px] text-mv-muted">
              {loading ? (
                <span
                  aria-hidden="true"
                  className="h-[13px] w-[13px] shrink-0 animate-spin rounded-full border-2 border-mv-line border-t-mv-green-deep"
                />
              ) : (
                <Search size={13} className="shrink-0" aria-hidden="true" />
              )}
              {query.trim().length < MIN_CHARS
                ? `Type ${MIN_CHARS} letters to search`
                : loading
                  ? "Searching…"
                  : (error ?? "Nothing matches that")}
            </li>
          ) : (
            results.map((result, index) => {
              const kind = KINDS[result.type];
              if (!kind) return null;
              const Icon = kind.icon;

              return (
                <li key={`${result.type}:${result.id ?? result.value}:${index}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === active}
                    // Keeps focus in the field, so blur never races the click.
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(result)}
                    className={`flex w-full cursor-pointer items-center gap-[10px] px-3 py-[9px] text-left ${
                      index === active ? "bg-[#f2f8f5]" : ""
                    }`}
                  >
                    <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-lg bg-mv-mint text-mv-green-deep">
                      <Icon size={13} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold text-mv-ink">
                        <Marked text={result.value} query={query} />
                      </span>
                      <span className="block text-[10.5px] uppercase tracking-[.06em] text-mv-muted">
                        {kind.label}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

/** Marks the typed run inside a result, wherever it falls. */
function Marked({ text, query }: { text: string; query: string }) {
  const needle = query.trim().toLowerCase();
  const at = needle ? text.toLowerCase().indexOf(needle) : -1;
  if (at === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, at)}
      <span className="text-mv-green-deep">
        {text.slice(at, at + needle.length)}
      </span>
      {text.slice(at + needle.length)}
    </>
  );
}
