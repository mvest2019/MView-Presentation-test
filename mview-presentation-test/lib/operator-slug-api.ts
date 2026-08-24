import "server-only";

import { unstable_cache } from "next/cache";

import { searchOperators } from "./operator-api";
import { TEMP_MEMBER_ID } from "./operator-api-types";

/**
 * Slug -> operator, from the live directory.
 *
 * WHY THIS EXISTS. `/operators/{slug}` used to resolve against a 30-record fixture,
 * so the other ~24,700 operators the listing links to answered 404. There is no
 * endpoint that takes a slug, but `/operators/search` RETURNS one — `operator_name_url`
 * is on every record and is the very value the listing builds its links from. So the
 * slug is resolved by searching for the operator and matching the API's own slug,
 * rather than by deriving anything.
 *
 * WHY THE SLUG CANNOT SIMPLY BE UN-SLUGGED INTO A QUERY. `search_text` matches a
 * literal substring of the FILED name, and filed names carry punctuation the slug has
 * dropped. Measured: `eog-texas-inc` is filed as `EOG (TEXAS) INC.`, so searching
 * "EOG TEXAS" returns zero rows, while "EOG" returns eight — one of which carries
 * exactly that slug. Hence progressively shorter queries, and a match on the slug
 * itself rather than on any name comparison.
 *
 * THE MATCH IS EXACT AND ON THE API'S OWN FIELD, so a near-miss cannot resolve to the
 * wrong operator: `chevron-usa-inc` does not match the record whose slug is
 * `chevron-u-s-a-inc`, and answering 404 is correct for a URL nobody minted.
 *
 * CACHED PER SLUG. Thirty pages are prerendered and the rest render on demand, so
 * without this every visit to a long-tail operator would re-run the search. Keyed on
 * the slug alone, which is the whole input.
 */

/** Rows per query. Large enough that a common leading token still contains the target. */
const PAGE_SIZE = 100;

/**
 * How many pages of a broad query to walk before giving up.
 *
 * A leading token like "BROWN" matches 81 operators; two pages covers every token
 * measured. This is a bound on work, not a promise: a slug whose operator sits past
 * row 200 of its own broadest query resolves to 404, which is why the more selective
 * queries are tried first.
 */
const MAX_PAGES = 2;

/** What the detail page needs before it reads `/operators/details`. */
export interface ResolvedOperator {
  slug: string;
  /** Display spelling — the API's `cleaned_operator_name`. */
  name: string;
  /** The regulator's filed spelling. */
  filedName: string;
  operatorNumber: string;
  /** `active` / `inactive`, as filed. */
  status: string;
  /** Counties the operator reports in, per the directory row. */
  counties: number;
  leases: number;
  /** Whether the record carries a logo; the bytes come from our own origin. */
  hasLogo: boolean;
}

/**
 * The queries to try, most selective first.
 *
 * `eog-texas-inc` -> `EOG TEXAS INC`, `EOG TEXAS`, `EOG`. The first that returns the
 * slug wins, so a distinctive name costs one request and a common one a few more.
 * Trailing legal suffixes are not stripped: dropping tokens from the right already
 * does that, and a list of suffixes to strip is a list to maintain.
 */
function candidateQueries(slug: string): string[] {
  const tokens = slug
    .split("-")
    .map((token) => token.trim())
    .filter((token) => token !== "");
  if (tokens.length === 0) return [];

  const queries: string[] = [];
  for (let take = tokens.length; take >= 1; take -= 1) {
    queries.push(tokens.slice(0, take).join(" ").toUpperCase());
  }
  // A one-token slug produces one query; de-duplicated so it is not tried twice.
  return [...new Set(queries)];
}

async function readSlug(slug: string): Promise<ResolvedOperator | null> {
  const target = slug.trim().toLowerCase();
  if (target === "") return null;

  for (const search_text of candidateQueries(target)) {
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const response = await searchOperators({
        page,
        search_text,
        pageSize: PAGE_SIZE,
        sort: { propertyName: "cleaned_operator_name", type: "asc" },
        activeInLast90Days: false,
        topProducers: false,
        moreThan5Counties: false,
        moreThan10Counties: false,
        county: "",
        member_id: TEMP_MEMBER_ID,
        status: "",
        playtype: "",
        visitorId: "",
      });

      const match = response.result.find(
        (record) => record.operator_name_url?.toLowerCase() === target,
      );

      if (match) {
        return {
          slug: match.operator_name_url,
          name: match.cleaned_operator_name,
          filedName: match.operator_name,
          operatorNumber: match.operator_number,
          status: match.status,
          counties: Number(match.countie_count) || 0,
          leases: Number(match.leaseCount) || 0,
          hasLogo: Boolean(match.operator_logo),
        };
      }

      // Nothing more to page through for this query.
      if (response.result.length < PAGE_SIZE) break;
    }
  }

  return null;
}

/**
 * The reverse direction: operator number -> slug.
 *
 * WHY IT IS NEEDED. `/operators/related-operators` reports `operator_no`,
 * `operator_name` and a logo — and no slug — so a related-operator card had no URL to
 * link to. It used to fall back to a 30-record lookup, which meant most cards rendered
 * as dead text.
 *
 * ONE EXACT SEARCH. `search_text` matches the operator number as well as the name, and
 * a number is unique: measured, "285230" returns exactly one row, carrying its
 * `operator_name_url`. So this is a single request with no candidate broadening and no
 * ambiguity to resolve — the number either names an operator or it does not.
 *
 * The row is still matched on `operator_number` rather than trusted by position, so a
 * substring hit on some other field could not put the wrong slug on a card.
 */
async function readSlugForNumber(
  operatorNumber: string,
): Promise<string | null> {
  const target = operatorNumber.trim();
  if (target === "") return null;

  const response = await searchOperators({
    page: 1,
    search_text: target,
    pageSize: PAGE_SIZE,
    sort: { propertyName: "cleaned_operator_name", type: "asc" },
    activeInLast90Days: false,
    topProducers: false,
    moreThan5Counties: false,
    moreThan10Counties: false,
    county: "",
    member_id: TEMP_MEMBER_ID,
    status: "",
    playtype: "",
    visitorId: "",
  });

  const match = response.result.find(
    (record) => record.operator_number === target,
  );
  return match?.operator_name_url || null;
}

/**
 * One number resolved to a slug, cached.
 *
 * Keyed on the number, so the handful of operators that appear as a relation of many
 * others — the large ones do — are resolved once for the whole site rather than once
 * per page that mentions them.
 */
export const slugForOperatorNumber = unstable_cache(
  readSlugForNumber,
  ["operator-slug-by-number", "v1"],
  { revalidate: 3_600, tags: ["operators"] },
);

/**
 * One slug resolved, cached.
 *
 * A miss is cached as `null` too: a crawler hitting a mistyped URL repeatedly should
 * not re-run every candidate query each time.
 */
export const resolveOperatorSlug = unstable_cache(
  readSlug,
  ["operator-slug", "v1"],
  { revalidate: 3_600, tags: ["operators"] },
);
