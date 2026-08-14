"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import type { CategoryFacet } from "@/lib/blog-types";
import { selectedControlClass } from "@/app/_components/button";
import { searchFieldClass, searchRowClass } from "@/app/_components/field";

/**
 * The listing controls: a search box and a row of category chips carrying live
 * counts.
 *
 * Both write to the URL and let the server component refetch — the URL is the
 * single source of truth, so a filtered view is shareable and the back button
 * behaves. Changing category or search resets the "Load more" count, otherwise
 * a visitor deep in one list would land mid-way down another.
 *
 * The prototype's Blog/News view switch used to sit above this. Blog and News
 * are separate routes now, so the library tab row does that job and the switch
 * would be a second control for the same choice.
 *
 * Chips are built from `facets`, which the API's own data produces; nothing
 * here assumes which categories exist.
 */

export function BlogToolbar({
  basePath,
  searchLabel,
  searchPlaceholder,
  facets,
  total,
  activeCategory,
  search,
}: {
  /** The section this toolbar filters — `/blogs` or `/oil-and-gas-news`. */
  basePath: string;
  searchLabel: string;
  searchPlaceholder: string;
  facets: CategoryFacet[];
  total: number;
  activeCategory?: string;
  search: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [term, setTerm] = useState(search);
  const [syncedSearch, setSyncedSearch] = useState(search);

  /*
   * The last value this component pushed into the URL.
   *
   * WHY THIS EXISTS. The sync below adopts the URL's `search` into the input, so
   * the back button and a "clear the filters" link both work. But the URL also
   * echoes back what we just pushed, and that echo arrives late — the debounce
   * waits 300ms and the API answers in about a second. Anything typed inside that
   * window was overwritten when the echo landed: type "royalty" and the box
   * would snap back to "r", losing every character after the first request went
   * out. Comparing against what we pushed tells our own echo apart from a genuine
   * external change, so only the latter touches the input.
   *
   * State, not a ref: this is read while rendering, and a ref read during render
   * is not safe under concurrent rendering (and `react-hooks/refs` rejects it).
   */
  const [pushed, setPushed] = useState(search);

  // Keep the box in step when the URL changes from OUTSIDE — the back button, or
  // a link that cleared the query. Adjusted during render rather than in an
  // effect: React re-runs this component before touching the DOM, so the input
  // never paints a stale value, and typing is not interrupted the way a remount
  // via `key` would interrupt it.
  if (search !== syncedSearch) {
    setSyncedSearch(search);
    if (search !== pushed) setTerm(search);
  }

  function navigate(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("show"); // any filter change restarts the list
    const query = params.toString();
    startTransition(() =>
      router.replace(query ? `${basePath}?${query}` : basePath, {
        scroll: false,
      }),
    );
  }

  // Debounce so a keystroke does not fire a request each time.
  useEffect(() => {
    if (term === search) return;
    const timer = setTimeout(() => {
      const next = term.trim();
      // Record it BEFORE navigating, so the echo is recognised when it returns.
      setPushed(next);
      navigate((params) => {
        if (next) params.set("q", next);
        else params.delete("q");
      });
    }, 300);
    return () => clearTimeout(timer);
    // `navigate` closes over the current searchParams, which is what we want.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, search]);

  return (
    <>
      <div className={searchRowClass}>
        <input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          aria-label={searchLabel}
          placeholder={searchPlaceholder}
          className={searchFieldClass}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-[6px]">
        <ChipButton
          label={`All (${total})`}
          active={!activeCategory}
          onClick={() => navigate((params) => params.delete("category"))}
        />
        {facets.map((facet) => (
          <ChipButton
            key={facet.category}
            label={`${facet.category} (${facet.count})`}
            active={facet.category === activeCategory}
            onClick={() =>
              navigate((params) => params.set("category", facet.category))
            }
          />
        ))}
      </div>
    </>
  );
}

function ChipButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`cursor-pointer rounded-full border px-[15px] py-[7px] text-[13px] font-semibold ${
        active
          ? selectedControlClass
          : "border-mv-line bg-white text-mv-slate hover:border-mv-green-deep hover:text-mv-green-deep"
      }`}
    >
      {label}
    </button>
  );
}
