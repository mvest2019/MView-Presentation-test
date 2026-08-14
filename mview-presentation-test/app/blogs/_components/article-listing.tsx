import Link from "next/link";

import { getBlogList, getCategoryFacets } from "@/lib/blog-api";
import { SECTIONS, type BlogMode } from "@/lib/blog-types";

import { Breadcrumb } from "../../_components/breadcrumb";
import { headingBase, inlineLink } from "../../_components/typography";
import { BlogCard } from "./blog-card";
import { BlogToolbar } from "./blog-toolbar";
import { ResourceTabs } from "./resource-tabs";

/**
 * The listing body shared by `/blogs` and `/oil-and-gas-news`.
 *
 * Both sections are the same page against a different API `type`, so the layout
 * lives here once and each route supplies its mode. Everything on screen — the
 * articles, the category chips and their counts — comes from
 * `/NewsFramework/Blog_data`.
 *
 * The URL carries the whole view state (`category`, `q`, `show`), so this stays
 * a server component and every filtered list is shareable.
 */

const PAGE_SIZE = 12;

export type ListingSearchParams = {
  category?: string | string[];
  q?: string | string[];
  show?: string | string[];
};

export async function ArticleListing({
  mode,
  searchParams,
}: {
  mode: BlogMode;
  searchParams: ListingSearchParams;
}) {
  const section = SECTIONS[mode];

  const search = first(searchParams.q) ?? "";
  const requestedCategory = first(searchParams.category);
  const show = toPositiveInt(first(searchParams.show), PAGE_SIZE);

  const { facets, total } = await getCategoryFacets(mode);

  // Ignore a category that is not in this section — an old `category` carried
  // over from the other tab would otherwise render an empty grid.
  const category = facets.some((f) => f.category === requestedCategory)
    ? requestedCategory
    : undefined;

  const { items, totalRecords, hasMore } = await getBlogList({
    mode,
    category,
    search,
    limit: show,
  });

  const moreHref = buildHref(section.path, {
    category,
    search,
    show: show + PAGE_SIZE,
  });

  return (
    <div className="py-16 pt-[26px] max-[767px]:pb-11">
      <div className="mx-auto max-w-[1200px] px-7 max-[767px]:px-4">
        <Breadcrumb trail={[{ label: section.tab }]} />
        {/* No `min-height` here. The design gives `.res-head` a 150px floor so
            the pill row cannot bounce between library pages, but with the live
            copy Blog, News and Glossary all measure the same 97px, so the floor
            only left blank space under the lede. If a future library page gets
            a taller header and the row starts moving between tabs, put a floor
            back at that page's height rather than raising this one blindly. */}
        {/* No all-caps kicker above the heading. The breadcrumb directly above
            already names the section, so it was the same word twice. */}
        <div>
          {/* Its own size and leading — the design's `.res-h` override. */}
          <h2
            className={`${headingBase} my-2 text-[clamp(26px,3vw,34px)] leading-[1.16]`}
          >
            {section.heading}
          </h2>
          <p className="m-0 max-w-[620px] text-mv-muted">{section.lede}</p>
        </div>

        <ResourceTabs active={section.path} />

        {/* No Suspense boundary around this. `useSearchParams` only needs one
            on a statically rendered route, and wrapping it here stopped the
            subtree hydrating at all — the buttons rendered but carried no React
            handlers, so the chips and search box did nothing. This route awaits
            `searchParams` and is dynamic, so no boundary is due. */}
        <BlogToolbar
          basePath={section.path}
          searchLabel={section.searchLabel}
          searchPlaceholder={section.searchPlaceholder}
          facets={facets}
          total={total}
          activeCategory={category}
          search={search}
        />

        {/* Card grid: three up on desktop, two on tablet, one on phones. The
            design only collapses `.g3` at 767px, which left 220px cards with
            four-line titles on a 768px tablet. */}
        {items.length > 0 ? (
          <div className="mt-[14px] grid grid-cols-3 gap-[18px] max-[1023px]:grid-cols-2 max-[767px]:grid-cols-1">
            {items.map((article, index) => (
              <BlogCard
                key={article._id}
                article={article}
                priority={index < 3}
              />
            ))}
          </div>
        ) : (
          // Centred to match the count line below it: with the grid gone there is
          // nothing left-aligned for this to line up with, so hugging the left
          // edge of an otherwise empty page read as a stray fragment.
          <p className="mt-8 text-center text-mv-muted">
            Nothing matches that search{category ? ` in ${category}` : ""}.{" "}
            <Link href={section.path} className={inlineLink}>
              Clear the filters →
            </Link>
          </p>
        )}

        {hasMore && (
          <div className="mt-4 text-center">
            <Link
              href={moreHref}
              scroll={false}
              className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-mv-line bg-white px-[18px] py-[10px] text-sm font-semibold text-mv-slate !no-underline hover:bg-mv-bg"
            >
              Load more ▾
            </Link>
          </div>
        )}

        <p className="mt-4 text-center text-xs text-mv-muted">
          {totalRecords}{" "}
          {totalRecords === 1 ? section.noun.one : section.noun.many} — every one
          opens in full.{" "}
          <Link href="/media" className={inlineLink}>
            Prefer to watch or listen? →
          </Link>
        </p>
      </div>
    </div>
  );
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildHref(
  basePath: string,
  {
    category,
    search,
    show,
  }: { category: string | undefined; search: string; show: number },
): string {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (search) params.set("q", search);
  params.set("show", String(show));
  return `${basePath}?${params.toString()}`;
}
