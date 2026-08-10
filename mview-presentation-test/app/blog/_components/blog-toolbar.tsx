"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import type { BlogMode, CategoryFacet } from "@/lib/blog-types";

/**
 * The listing controls from the prototype: a Blog/News view switch, a search
 * box, and a row of category chips carrying live counts.
 *
 * All three write to the URL and let the server component refetch — the URL is
 * the single source of truth, so a filtered view is shareable and the back
 * button behaves. Changing view, category or search resets the "Load more"
 * count, otherwise a visitor deep in one list would land mid-way down another.
 *
 * Chips are built from `facets`, which the API's own data produces; nothing
 * here assumes which categories exist.
 */

const VIEW_LABELS: Record<BlogMode, string> = {
  blog: "Blog — owner guides",
  news: "News — Texas activity",
};

export function BlogToolbar({
  mode,
  facets,
  total,
  activeCategory,
  search,
}: {
  mode: BlogMode;
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

  // Keep the box in step when the URL changes from outside — the back button, or
  // a chip click that cleared the search. Adjusted during render rather than in
  // an effect: React re-runs this component before touching the DOM, so the
  // input never paints a stale value, and typing is not interrupted the way a
  // remount via `key` would interrupt it.
  if (search !== syncedSearch) {
    setSyncedSearch(search);
    setTerm(search);
  }

  function navigate(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("show"); // any filter change restarts the list
    const query = params.toString();
    startTransition(() =>
      router.replace(query ? `/blog?${query}` : "/blog", { scroll: false }),
    );
  }

  // Debounce so a keystroke does not fire a request each time.
  useEffect(() => {
    if (term === search) return;
    const timer = setTimeout(() => {
      navigate((params) => {
        if (term.trim()) params.set("q", term.trim());
        else params.delete("q");
      });
    }, 300);
    return () => clearTimeout(timer);
    // `navigate` closes over the current searchParams, which is what we want.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, search]);

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-[10px]">
        <span className="text-xs font-bold uppercase tracking-[.05em] text-mv-muted">
          View
        </span>
        <div
          role="group"
          aria-label="Choose Blog or News view"
          className="inline-flex gap-[2px] rounded-[10px] bg-[#e8ecf3] p-[3px]"
        >
          {(Object.keys(VIEW_LABELS) as BlogMode[]).map((value) => {
            const active = value === mode;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  navigate((params) => {
                    // `blog` is the default view, so it needs no param.
                    if (value === "blog") params.delete("view");
                    else params.set("view", value);
                    // Categories do not overlap between views.
                    params.delete("category");
                  })
                }
                className={`cursor-pointer whitespace-nowrap rounded-lg border-0 px-3 py-[6px] font-sans text-xs font-bold ${
                  active
                    ? "bg-mv-green text-mv-green-ink"
                    : "bg-transparent text-mv-slate"
                }`}
              >
                {VIEW_LABELS[value]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-[10px] flex flex-wrap items-center gap-[10px]">
        <input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          aria-label="Search articles"
          placeholder="Search articles… (title or topic)"
          className="min-w-[220px] flex-1 rounded-full border border-mv-line bg-white px-[14px] py-2 text-[13px] outline-none focus-visible:border-mv-green-deep"
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
      className={`cursor-pointer rounded-full border px-[15px] py-[7px] font-sans text-[13px] font-semibold ${
        active
          ? "border-mv-green-deep bg-mv-green-deep text-white"
          : "border-mv-line bg-white text-mv-slate hover:border-mv-green-deep hover:text-mv-green-deep"
      }`}
    >
      {label}
    </button>
  );
}
