import "server-only";

import { unstable_cache } from "next/cache";

import {
  BLOG_TYPES,
  CATEGORY_ORDER,
  type BlogDetails,
  type BlogListItem,
  type BlogMode,
  type CategoryFacet,
} from "./blog-types";

/**
 * Client for the two NewsFramework blog endpoints, as used by the production
 * repo's `services/services.ts`:
 *
 *   POST {BASE_URL}/NewsFramework/Blog_data
 *        { pageSize, page, type, Category, visitorId, member_id }
 *        -> { data: BlogListItem[], totalRecord: number }
 *
 *   POST {BASE_URL}/NewsFramework/Blog_datadetails
 *        { title, member_id, visitorId }
 *        -> { data: BlogDetails }   // { data: { error: "Blog not found" } } on a miss
 *
 * Differences from that repo, and why:
 *
 *  · `fetch` instead of axios — no reason to add a dependency for two POSTs.
 *
 *  · One cached full-corpus read per type, then filter/search/paginate over it,
 *    rather than one API call per page. Two things force this. The chip row has
 *    to show a count per category and the endpoint exposes no facet or
 *    aggregate call, so the counts are only obtainable from the whole set. And
 *    the payload accepts no search term, so a search box that only filtered the
 *    current page would silently miss matches. The corpus is 129 articles
 *    (~250 KB) and is cached for five minutes, so this is one upstream request
 *    per type per window. If the corpus grows past a few thousand articles,
 *    move the grid back onto the endpoint's own `page`/`pageSize` and keep this
 *    call for the facets alone.
 *
 *  · Errors are not swallowed into empty arrays. A failed upstream call throws
 *    so the route's error boundary shows it, rather than rendering an empty
 *    grid that reads as "no articles".
 */

const REVALIDATE_SECONDS = 300;

/** Upstream pages are capped; this is comfortably above the 129 live records. */
const CORPUS_PAGE_SIZE = 1000;

function baseUrl(): string {
  const url = process.env.BASE_URL;
  if (!url) {
    throw new Error(
      "BASE_URL is not set. Point it at the NewsFramework API host (see next.config.ts).",
    );
  }
  return url.replace(/\/+$/, "");
}

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    // Caching is handled by `unstable_cache` around the callers; Next does not
    // cache POST responses on its own.
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `${path} responded ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as T;
}

/**
 * Every article of one type. Cached because the listing derives facets, search
 * and pagination from it.
 *
 * `visitorId`/`member_id` are analytics fields upstream and are deliberately
 * NOT part of the cache key — including them would give every visitor their own
 * copy of the same 129 articles. The per-visitor signal is sent on the article
 * detail read, which is where the production repo's read tracking matters.
 */
const getCorpus = unstable_cache(
  async (mode: BlogMode): Promise<BlogListItem[]> => {
    const body = await postJson<{
      data: BlogListItem[] | null;
      totalRecord: number;
    }>("/NewsFramework/Blog_data", {
      pageSize: CORPUS_PAGE_SIZE,
      page: 1,
      type: BLOG_TYPES[mode],
      Category: "",
      visitorId: "",
      member_id: 0,
    });

    const data = body.data ?? [];

    // The endpoint caps a response at `pageSize`; if it ever fills the page the
    // facet counts below would silently under-report.
    if (data.length >= CORPUS_PAGE_SIZE) {
      console.warn(
        `[blog] ${BLOG_TYPES[mode]} filled the ${CORPUS_PAGE_SIZE}-record page — ` +
          "category counts may be short. Move the grid onto API pagination.",
      );
    }

    return data;
  },
  ["blog-corpus"],
  { revalidate: REVALIDATE_SECONDS, tags: ["blog"] },
);

/**
 * Does this article match a free-text search?
 *
 * EXTRACTED so the category counts and the grid cannot disagree. They were two
 * separate filters, and only the grid applied the search — so a search for
 * "oil and gas production" narrowed the results to 2 while the chips still read
 * "All (86) · Mineral Owners (48) · …", describing a corpus the visitor could no
 * longer see.
 */
function matchesSearch(item: BlogListItem, term: string | undefined): boolean {
  if (!term) return true;
  return Boolean(
    item.blog_title?.toLowerCase().includes(term) ||
      item.Category?.toLowerCase().includes(term),
  );
}

/**
 * Categories present in one type, counted from the API and ordered to match the
 * live site's chip row — see `CATEGORY_ORDER`.
 *
 * COUNTS ARE SCOPED TO THE SEARCH, not to the whole section: with a term
 * active, each chip says how many of the MATCHING articles carry that category,
 * and `total` is the size of the match. Deliberately NOT scoped to the selected
 * category as well — a chip has to keep showing what it would give you if you
 * pressed it, and scoping to the current one would zero every other chip.
 *
 * Anything the API returns that `CATEGORY_ORDER` does not name is appended,
 * alphabetically, after the known chips. A new CMS category therefore appears on
 * the page without a code change; it just does not jump the established order.
 */
export async function getCategoryFacets(
  mode: BlogMode,
  search?: string,
): Promise<{ facets: CategoryFacet[]; total: number }> {
  const corpus = await getCorpus(mode);
  const term = search?.trim().toLowerCase();
  const scope = corpus.filter((item) => matchesSearch(item, term));

  const counts = new Map<string, number>();
  for (const item of scope) {
    const category = item.Category?.trim();
    if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  const order = CATEGORY_ORDER[mode];
  // Unlisted categories sort after every listed one, so `order.length` is the
  // rank for "not found" rather than -1, which would sort it to the front.
  const rank = (category: string) => {
    const index = order.indexOf(category);
    return index === -1 ? order.length : index;
  };

  const facets = [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort(
      (a, b) =>
        rank(a.category) - rank(b.category) ||
        a.category.localeCompare(b.category),
    );

  return { facets, total: scope.length };
}

export interface BlogListQuery {
  mode: BlogMode;
  /** Exact `Category` value, or undefined for all. */
  category?: string;
  /** Free-text match over title and category. */
  search?: string;
  /**
   * How many to return. The design paginates with "Load more articles", so the
   * URL carries a growing limit rather than a page number — that keeps every
   * step server-rendered and shareable.
   */
  limit: number;
}

export interface BlogListResult {
  items: BlogListItem[];
  /** Articles matching the filters, before the limit is applied. */
  totalRecords: number;
  /** True when `totalRecords` exceeds what was returned. */
  hasMore: boolean;
}

export async function getBlogList({
  mode,
  category,
  search,
  limit,
}: BlogListQuery): Promise<BlogListResult> {
  const corpus = await getCorpus(mode);
  const term = search?.trim().toLowerCase();

  const matching = corpus.filter(
    (item) =>
      (!category || item.Category === category) && matchesSearch(item, term),
  );

  // Newest first — the endpoint's own order is not guaranteed to be by date.
  matching.sort(
    (a, b) =>
      new Date(b.Created_date).getTime() - new Date(a.Created_date).getTime(),
  );

  return {
    items: matching.slice(0, limit),
    totalRecords: matching.length,
    hasMore: matching.length > limit,
  };
}

/**
 * One article, by the slug in the URL. Returns null when the API reports the
 * article does not exist — it answers 200 with `{ data: { error: ... } }`
 * rather than a 404, so presence of `details` is the only reliable test.
 */
export async function getBlogDetails(
  slug: string,
  visitorId: string,
  memberId = 0,
): Promise<BlogDetails | null> {
  const body = await postJson<{ data: Partial<BlogDetails> | { error: string } }>(
    "/NewsFramework/Blog_datadetails",
    { title: urlTitleFromSlug(slug), member_id: memberId, visitorId },
  );

  const data = body.data as Partial<BlogDetails> | undefined;
  if (!data?.details) return null;

  return {
    details: data.details,
    realetedArray: data.realetedArray ?? [],
    TableOfContents: data.TableOfContents ?? [],
  };
}

/**
 * Slug convention, kept identical to the production site so URLs match: the
 * API's `urlTitle` with spaces swapped for hyphens, reversed on the way back
 * in. This round-trips only because no `urlTitle` in the corpus contains a
 * hyphen (verified across all 129). Should the CMS ever emit one, the reverse
 * mapping breaks and the API needs a slug field of its own.
 */
export function slugFromUrlTitle(urlTitle: string): string {
  return urlTitle.trim().replace(/\s+/g, "-");
}

export function urlTitleFromSlug(slug: string): string {
  return decodeURIComponent(slug).replace(/-/g, " ");
}
