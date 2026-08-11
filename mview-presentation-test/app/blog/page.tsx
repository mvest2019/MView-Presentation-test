import type { Metadata } from "next";
import Link from "next/link";

import { getBlogList, getCategoryFacets } from "@/lib/blog-api";
import { isBlogMode, type BlogMode } from "@/lib/blog-types";

import { buttonClass } from "../_components/button";
import { displayMdClass, eyebrowClass, inlineLink } from "../_components/typography";

import { BlogCard } from "./_components/blog-card";
import { BlogToolbar } from "./_components/blog-toolbar";
import { ResourceTabs } from "./_components/resource-tabs";

/**
 * Blog & News listing — the prototype's `route:blog`.
 *
 * Everything on the page comes from `/NewsFramework/Blog_data`: the articles,
 * the category chips, and their counts. The only fixed strings are the design's
 * own copy and the two API `type` values.
 *
 * The URL carries the whole view state (`view`, `category`, `q`, `show`), so
 * this stays a server component and every filtered list is shareable.
 */

export const metadata: Metadata = {
  title: "Blog & News — Owner guides & Texas news | Mineral View",
  description:
    "Owner guides, Texas activity news, and market notes from the Mineral View team. Free to read — no account required.",
};

const PAGE_SIZE = 12;

export default async function BlogPage({ searchParams }: PageProps<"/blog">) {
  const params = await searchParams;

  const view = first(params.view);
  const mode: BlogMode = isBlogMode(view) ? view : "blog";
  const search = first(params.q) ?? "";
  const requestedCategory = first(params.category);
  const show = toPositiveInt(first(params.show), PAGE_SIZE);

  const { facets, total } = await getCategoryFacets(mode);

  // Ignore a category that is not in this view — switching views with a stale
  // `category` in the URL would otherwise render an empty grid.
  const category = facets.some((f) => f.category === requestedCategory)
    ? requestedCategory
    : undefined;

  const { items, totalRecords, hasMore } = await getBlogList({
    mode,
    category,
    search,
    limit: show,
  });

  const moreHref = buildHref({
    view,
    category,
    search,
    show: show + PAGE_SIZE,
  });

  return (
    <div className="py-16 pt-[52px] max-[767px]:py-11">
      <div className="mx-auto max-w-[1200px] px-7 max-[767px]:px-4">
        <div className="min-h-[150px] max-[767px]:min-h-0">
          <div className={eyebrowClass}>Blog &amp; News</div>
          {/* The design's `.res-h` override, now named in the type scale. */}
          <h2 className={`${displayMdClass} my-2`}>
            Owner guides &amp; Texas news
          </h2>
          <p className="m-0 max-w-[620px] text-mv-muted">
            Owner guides, Texas activity news, and market notes from the Mineral
            View team. Free to read — no account required.
          </p>
        </div>

        <ResourceTabs active="/blog" />

        {/* No Suspense boundary around this. `useSearchParams` only needs one
            on a statically rendered route, and wrapping it here stopped the
            subtree hydrating at all — the buttons rendered but carried no React
            handlers, so the view switch, chips and search box did nothing. This
            route awaits `searchParams` and is dynamic, so no boundary is due. */}
        <BlogToolbar
          mode={mode}
          facets={facets}
          total={total}
          activeCategory={category}
          search={search}
        />

        {items.length > 0 ? (
          <div className="mt-[14px] grid grid-cols-3 gap-[18px] max-[767px]:grid-cols-1">
            {items.map((article, index) => (
              <BlogCard
                key={article._id}
                article={article}
                priority={index < 3}
              />
            ))}
          </div>
        ) : (
          <p className="mt-8 text-mv-muted">
            No articles match that search{category ? ` in ${category}` : ""}.{" "}
            <Link href="/blog" className={inlineLink}>
              Clear the filters →
            </Link>
          </p>
        )}

        {hasMore && (
          <div className="mt-4 text-center">
            <Link
              href={moreHref}
              scroll={false}
              className={buttonClass({ variant: "outline", size: "lg" })}
            >
              Load more articles ▾
            </Link>
          </div>
        )}

        <p className="mt-4 text-center text-xs text-mv-muted">
          {totalRecords} {totalRecords === 1 ? "article" : "articles"} — every
          one opens in full.{" "}
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

function buildHref({
  view,
  category,
  search,
  show,
}: {
  view: string | undefined;
  category: string | undefined;
  search: string;
  show: number;
}): string {
  const params = new URLSearchParams();
  if (view) params.set("view", view);
  if (category) params.set("category", category);
  if (search) params.set("q", search);
  params.set("show", String(show));
  return `/blog?${params.toString()}`;
}
