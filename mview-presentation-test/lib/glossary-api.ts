import "server-only";

import { unstable_cache } from "next/cache";

import {
  GLOSSARY_TYPE,
  type GlossaryTerm,
  type GlossaryTermSummary,
} from "./glossary-types";

/**
 * Client for the two NewsFramework glossary endpoints, as used by the
 * production repo's `services/services.ts`:
 *
 *   POST {BASE_URL}/NewsFramework/Glossary_data
 *        { Category, visitorId, type, member_id, page, pageSize, sortby }
 *        -> { data: GlossaryTerm[], totalRecord }
 *
 *   POST {BASE_URL}/NewsFramework/Glossary_datadetails
 *        { term_slug, member_id, visitorId }
 *        -> { data: { details } }   // HTTP 404 + data:null on a miss
 *
 * The corpus is 46 terms and the endpoint has no search parameter, so the
 * listing reads all of them once (cached) and filters in memory — same reasoning
 * as `blog-api.ts`, which documents it at length.
 */

const REVALIDATE_SECONDS = 300;

/** Comfortably above the 46 live terms; warns below if it ever fills. */
const CORPUS_PAGE_SIZE = 500;

function baseUrl(): string {
  const url = process.env.BASE_URL;
  if (!url) {
    throw new Error(
      "BASE_URL is not set. Point it at the NewsFramework API host (see next.config.ts).",
    );
  }
  return url.replace(/\/+$/, "");
}

const getCorpus = unstable_cache(
  async (): Promise<GlossaryTerm[]> => {
    const response = await fetch(`${baseUrl()}/NewsFramework/Glossary_data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Category: "",
        visitorId: "",
        type: GLOSSARY_TYPE,
        member_id: 0,
        page: 1,
        pageSize: CORPUS_PAGE_SIZE,
        sortby: "",
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Glossary_data responded ${response.status} ${response.statusText}`,
      );
    }

    const body = (await response.json()) as { data: GlossaryTerm[] | null };
    const data = body.data ?? [];

    if (data.length >= CORPUS_PAGE_SIZE) {
      console.warn(
        `[glossary] filled the ${CORPUS_PAGE_SIZE}-record page — the A–Z index ` +
          "may be short. Raise CORPUS_PAGE_SIZE or paginate.",
      );
    }

    // Alphabetical by display name; the endpoint's own order is not guaranteed.
    return data.sort((a, b) =>
      a.term_name.localeCompare(b.term_name, "en", { sensitivity: "base" }),
    );
  },
  ["glossary-corpus"],
  { revalidate: REVALIDATE_SECONDS, tags: ["glossary"] },
);

/** Every term, without the full article body. See `GlossaryTermSummary`. */
export async function getGlossaryTerms(): Promise<GlossaryTermSummary[]> {
  const corpus = await getCorpus();
  return corpus.map((term) => {
    const summary: GlossaryTermSummary & { content?: string } = { ...term };
    delete summary.content;
    return summary;
  });
}

/** Distinct categories with counts, derived from the corpus. */
export async function getGlossaryCategories(): Promise<
  { category: string; count: number }[]
> {
  const corpus = await getCorpus();
  const counts = new Map<string, number>();
  for (const term of corpus) {
    const category = term.Category?.trim();
    if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}

/**
 * One term by slug, or null when it does not exist.
 *
 * Served from the cached corpus rather than the detail endpoint: the list
 * response already carries the full `content`, so a detail call would fetch
 * bytes we hold. It also answers HTTP 404 for a miss, which would otherwise
 * surface as a thrown error rather than a `notFound()`.
 */
export async function getGlossaryTerm(
  slug: string,
): Promise<GlossaryTerm | null> {
  const corpus = await getCorpus();
  const wanted = decodeURIComponent(slug).toLowerCase();
  return corpus.find((term) => term.term_slug.toLowerCase() === wanted) ?? null;
}

/**
 * Resolves `related_terms` — which the API gives as display names, not slugs —
 * to linkable terms. Names with no matching record are dropped rather than
 * rendered as dead links.
 */
export async function resolveRelatedTerms(
  names: string[] | undefined,
): Promise<{ term_name: string; term_slug: string }[]> {
  if (!names?.length) return [];
  const corpus = await getCorpus();
  const bySlugName = new Map(
    corpus.map((term) => [term.term_name.toLowerCase(), term]),
  );

  return names
    .map((name) => bySlugName.get(String(name).toLowerCase()))
    .filter((term): term is GlossaryTerm => Boolean(term))
    .map(({ term_name, term_slug }) => ({ term_name, term_slug }));
}
