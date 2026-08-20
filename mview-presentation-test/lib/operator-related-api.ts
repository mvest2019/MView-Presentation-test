import "server-only";

import { unstable_cache } from "next/cache";

import { getCasedNameLookup } from "./operator-api";
import {
  operatorLogoPath,
  publicOperatorApiBaseUrl,
} from "./operator-api-types";
import { detailSlugForNumber } from "./operator-detail";

/**
 * `POST /api/v1/operators/related-operators` — the "Related operators" band.
 *
 * THE CONTRACT, ESTABLISHED BY PROBING:
 *
 *   · `operator_no` is the only field that matters. Sending nothing answers 400
 *     `OPERATOR_NO_REQUIRED`; `member_id` changes nothing, so it is not sent.
 *   · The response is `{ related_operators: [...] }`, already ordered by
 *     `priority` — 1, 2, 3, 4 for Pioneer.
 *   · Each record carries `operator_no`, `operator_name` (filed, upper case) and
 *     `operator_logo`. It does NOT carry production, and it does not carry a slug.
 *   · An operator with no relations answers 200 with an empty array, not an error.
 *
 * READ ON THE SERVER, SO THE BAND COSTS THE BROWSER NOTHING. This page is
 * prerendered, so the fetch happens at build and revalidate time and the visitor
 * receives finished HTML: no client component, no request, no JavaScript, and
 * nothing to hydrate. That is the cheapest way to add a section to this page, and it
 * is why the band cannot affect the page's runtime performance.
 *
 * THE BOE FIGURE THE OLD FIXTURE CARDS SHOWED IS GONE, because this endpoint does
 * not report production. Recovering it would mean a second upstream call per related
 * operator — four more per page, thirty pages at build — for one line of text. Not
 * worth it, and inventing the number is not an option.
 *
 * A CARD LINKS ONLY WHERE THIS SITE HAS A PAGE. The detail route is prerendered from
 * its own set of slugs, so `detailSlugForNumber` decides: a related operator inside
 * that set becomes a link, one outside it stays plain text. A slug guessed from the
 * name would 404 just as reliably, only less visibly.
 */

export interface RelatedOperator {
  /** The cased spelling, for display. */
  name: string;
  operatorNumber: string;
  /** Same-origin logo path, or null when the record carries none. */
  logoUrl: string | null;
  /** This site's detail slug, or null when there is no page to link to. */
  slug: string | null;
}

interface RelatedRecord {
  priority?: unknown;
  operator_no?: unknown;
  operator_name?: unknown;
  operator_logo?: unknown;
}

function text(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

async function readRelated(operatorNumber: string): Promise<RelatedOperator[]> {
  if (operatorNumber === "") return [];

  const response = await fetch(
    `${publicOperatorApiBaseUrl()}/api/v1/operators/related-operators`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operator_no: operatorNumber }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Related operators unavailable (${response.status})`);
  }

  const payload: unknown = await response.json();
  const rows = (payload as { related_operators?: unknown }).related_operators;
  if (!Array.isArray(rows)) return [];

  const displayNameFor = await getCasedNameLookup();

  const related: RelatedOperator[] = [];
  const seen = new Set<string>();

  for (const row of rows as RelatedRecord[]) {
    const number = text(row.operator_no);
    const filed = text(row.operator_name);
    if (number === "" || filed === "") continue;
    // The same operator twice would render as two identical cards.
    if (seen.has(number)) continue;
    seen.add(number);

    related.push({
      name: displayNameFor(filed, number),
      operatorNumber: number,
      /* `operator_logo` says whether one exists; the bytes come from our origin,
         because the API serves logos `cross-origin-resource-policy: same-origin`
         and a browser refuses to embed those. */
      logoUrl: text(row.operator_logo) ? operatorLogoPath(number) : null,
      slug: detailSlugForNumber(number),
    });
  }

  // The endpoint already orders by `priority`; this only guards a malformed row.
  return related;
}

/**
 * One operator's related operators, cached.
 *
 * Keyed on the operator number, so the thirty prerendered pages each pay for their
 * own band once per revalidation window and repeat builds cost nothing.
 */
export const getRelatedOperators = unstable_cache(
  readRelated,
  ["operator-related", "v1"],
  { revalidate: 600, tags: ["operators"] },
);
