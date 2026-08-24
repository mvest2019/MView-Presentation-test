import "server-only";

/**
 * Client for the content API — blogs, news, glossary and FAQs.
 *
 *   GET {CONTENT_API_URL}/blogs      ?category= &search= &page= &pageSize=
 *   GET {CONTENT_API_URL}/blogs/{slug}
 *   GET {CONTENT_API_URL}/news       (same query shape)
 *   GET {CONTENT_API_URL}/news/{slug}
 *   GET {CONTENT_API_URL}/glossary
 *   GET {CONTENT_API_URL}/glossary/{slug}
 *   GET {CONTENT_API_URL}/faqs
 *
 * REPLACES THE NewsFramework ENDPOINTS (2026-08-13). The difference is not just
 * the host — this API does work the old one pushed onto the client:
 *
 *   · PAGINATION AND SEARCH ARE SERVER-SIDE. `blog-api.ts` used to pull all 86
 *     articles on every request and filter them in memory, because the old
 *     endpoint had no search parameter. That is gone.
 *   · FACET COUNTS COME BACK WITH THE PAGE, so the category chips no longer
 *     need a second pass over the whole corpus.
 *   · The glossary reports its own populated LETTERS, and every article and term
 *     ships a `tableOfContents`, so headings no longer have to be parsed out of
 *     the HTML to build a contents list.
 *   · Slugs are real fields. `slugFromUrlTitle` and its inverse are gone with
 *     the `urlTitle` column they existed to work around.
 *
 * THE SEARCH PARAMETER IS `search`, NOT `q` — `?q=` answers 400.
 */

function base(): string {
  const url = process.env.CONTENT_API_URL;
  if (!url) {
    throw new Error(
      "CONTENT_API_URL is not set. Point it at the content API (see next.config.ts).",
    );
  }
  return url.replace(/\/+$/, "");
}

/** Five minutes, matching what the old client used. */
const REVALIDATE_SECONDS = 300;

async function get<T>(path: string, tags: string[]): Promise<T | null> {
  try {
    const response = await fetch(`${base()}${path}`, {
      headers: { Accept: "application/json" },
      // Cached and revalidated rather than `no-store`: this is public content,
      // and the tags let a single article be refreshed without the whole list.
      next: { revalidate: REVALIDATE_SECONDS, tags },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/* ────────────────────────────────────────────────────── blogs and news ── */

/** One row in a listing. */
export interface ArticleSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  image: string;
}

/** A heading in an article or term, as the API reports it. */
export interface TocEntry {
  id: string;
  label: string;
}

export interface ArticleDetail extends ArticleSummary {
  /** "blog" or "news" — the section the article belongs to. */
  kind: string;
  updatedAt: string | null;
  author: string;
  contentHtml: string;
  tableOfContents: TocEntry[];
  seo?: { title?: string; description?: string } | null;
}

export interface CategoryFacet {
  category: string;
  count: number;
}

export interface ArticleListResult {
  items: ArticleSummary[];
  facets: CategoryFacet[];
  /** Matching the current filters. */
  total: number;
  /** The whole section, ignoring the category filter — for the "All" chip. */
  facetTotal: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

/** Which listing to read. The value is the path segment. */
export type ArticleSection = "blogs" | "news";

export async function fetchArticles(
  section: ArticleSection,
  {
    category,
    search,
    page = 1,
    pageSize = 12,
  }: { category?: string; search?: string; page?: number; pageSize?: number },
): Promise<ArticleListResult> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  // `search`, not `q` — see the note at the top of this file.
  if (search) params.set("search", search);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

  const data = await get<ArticleListResult>(
    `/${section}?${params.toString()}`,
    [section],
  );

  // An unreachable API renders an empty listing rather than a 500 — the rest of
  // the page (header, tabs, footer) is still worth showing.
  return (
    data ?? {
      items: [],
      facets: [],
      total: 0,
      facetTotal: 0,
      page: 1,
      pageSize,
      totalPages: 0,
      hasMore: false,
    }
  );
}

export async function fetchArticle(
  section: ArticleSection,
  slug: string,
): Promise<{ article: ArticleDetail; related: ArticleSummary[] } | null> {
  const data = await get<{
    article: ArticleDetail;
    related: ArticleSummary[] | null;
  }>(`/${section}/${encodeURIComponent(slug)}`, [section, `${section}:${slug}`]);

  if (!data?.article) return null;
  return { article: data.article, related: data.related ?? [] };
}

/* ─────────────────────────────────────────────────────────── glossary ── */

export interface GlossaryTermSummary {
  id: string;
  slug: string;
  term: string;
  /** The A–Z bucket, decided by the API rather than from the first letter. */
  letter: string;
  category: string;
  definition: string;
}

export interface GlossaryTermDetail extends GlossaryTermSummary {
  contentHtml: string;
  tableOfContents: TocEntry[];
  image: string | null;
  publishedAt: string;
  seo?: { title?: string; description?: string } | null;
}

export interface GlossaryIndexResult {
  terms: GlossaryTermSummary[];
  /** Only the letters that actually have terms. */
  letters: string[];
  facets: CategoryFacet[];
  total: number;
  truncated: boolean;
}

export async function fetchGlossary(): Promise<GlossaryIndexResult> {
  const data = await get<GlossaryIndexResult>("/glossary", ["glossary"]);
  return (
    data ?? { terms: [], letters: [], facets: [], total: 0, truncated: false }
  );
}

export async function fetchGlossaryTerm(
  slug: string,
): Promise<{ term: GlossaryTermDetail; related: GlossaryTermSummary[] } | null> {
  const data = await get<{
    term: GlossaryTermDetail;
    relatedTerms: GlossaryTermSummary[] | null;
  }>(`/glossary/${encodeURIComponent(slug)}`, ["glossary", `glossary:${slug}`]);

  if (!data?.term) return null;
  return { term: data.term, related: data.relatedTerms ?? [] };
}

/* ───────────────────────────────────────────────────────────────── FAQ ── */

export interface FaqItem {
  id: string;
  question: string;
  answerHtml: string;
  answerText: string;
}

export interface FaqCategory {
  id: string;
  category: string;
  slug: string;
  items: FaqItem[];
}

export async function fetchFaqs(): Promise<{
  categories: FaqCategory[];
  total: number;
}> {
  const data = await get<{ categories: FaqCategory[]; total: number }>(
    "/faqs",
    ["faqs"],
  );
  return data ?? { categories: [], total: 0 };
}
