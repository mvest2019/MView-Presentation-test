import "server-only";

import { getOperatorNames, type OperatorName } from "./operator-api";
import type {
  OperatorNameMatch,
  OperatorNameResult,
} from "./operator-statistics-shape";

/**
 * Operator name search, for the Compare Operator Statistics picker.
 *
 * WHAT THIS IS NOT. The comparison itself lives in `operator-compare-api.ts`, which
 * wraps `/api/v1/operators/compare`. This module only answers "which operators are
 * called something like this", which is a different question with a different cache
 * lifetime — the directory changes far less often than production figures.
 *
 * IT IS A SERVER MODULE because the list it searches is 24,742 records — 4.11 MB of
 * JSON, 473 KB gzipped now that every record carries a logo URL as well. Keeping it
 * here means the browser receives twenty names at a time instead of all of them.
 */

/* --------------------------------------------------------------------------
   Searching the name list
   -------------------------------------------------------------------------- */

/**
 * How many names one request answers with.
 *
 * The dropdown pages through the directory twenty at a time as it is scrolled, so
 * this is a page size rather than a cap: the reader can reach every one of the
 * 24,742 operators by scrolling, and search is there to jump straight to one
 * instead. Twenty fills the popup with a little over a screen to scroll, which is
 * what makes the next page feel like continuation rather than a jump.
 */
export const NAME_PAGE_SIZE = 20;

function toMatch(entry: OperatorName): OperatorNameMatch {
  return {
    name: entry.cleaned,
    operatorNumber: entry.operatorNumber,
    monogram: monogramOf(entry.cleaned),
    logoUrl: entry.logoPath,
  };
}

function monogramOf(name: string): string {
  const words = name.match(/[A-Za-z]+/g) ?? [];
  return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
}

/**
 * One page of names, matched against a query.
 *
 * NO QUERY IS THE BROWSE CASE: the dropdown paging through the directory in the
 * only order a name record supports. There is no rank or production on one to sort
 * by, so it is the endpoint's own alphabetical order, sliced. Nothing is copied
 * beyond the page itself — slicing before mapping is what keeps opening the
 * dropdown from building 24,742 objects to show twenty.
 *
 * A QUERY RANKS PREFIX MATCHES FIRST. Someone typing "eog" means the operator
 * called EOG, not the ones whose name merely contains those letters, so the two
 * groups are collected separately and concatenated rather than merged.
 *
 * THE QUERY MATCHES A NUMBER AS WELL AS A NAME, because the haystack carries the
 * operator number too — typing `665748` finds exactly one operator, which is how
 * these are often referred to in the field.
 *
 * `total` IS THE SIZE OF THE WHOLE RESULT SET, not of the page, so the caller can
 * say "20 of 137" and know whether scrolling further is worth a request. Finding it
 * means scanning the full list on a search — 24,742 string tests, measured in
 * fractions of a millisecond on a cached array, and it happens on the server.
 */
export function matchOperatorNames(
  names: readonly OperatorName[],
  query: string,
  offset: number = 0,
  limit: number = NAME_PAGE_SIZE,
): OperatorNameResult {
  const needle = query.trim().toLowerCase();
  const from = Math.max(0, offset);

  if (needle === "") {
    return {
      matches: names.slice(from, from + limit).map(toMatch),
      total: names.length,
    };
  }

  const prefix: OperatorName[] = [];
  const contains: OperatorName[] = [];

  for (const entry of names) {
    if (entry.haystack.startsWith(needle)) prefix.push(entry);
    else if (entry.haystack.includes(needle)) contains.push(entry);
  }

  const ranked = prefix.length > 0 ? [...prefix, ...contains] : contains;

  return {
    matches: ranked.slice(from, from + limit).map(toMatch),
    total: ranked.length,
  };
}

/**
 * The cached list, queried or browsed.
 *
 * IT THROWS ON FAILURE, AND THAT IS THE FIX. It used to return `{ matches: [],
 * total: 0 }` and log, which sounds like graceful degradation and was in fact how
 * the operator listing disappeared without a trace: an upstream timeout became a
 * 200 carrying an empty list, indistinguishable from "nothing matched what you
 * typed". The picker cached that emptiness per query and never asked again, so one
 * slow read left both comparison pages with a permanently empty dropdown and no
 * error anywhere for anyone to notice.
 *
 * The degrading now happens one level up, in the route handler, which turns a
 * throw into a 503 — a response the picker can tell apart from an empty result and
 * offer to retry. Nothing else on either page depends on this call, so a failure
 * here still costs only the dropdown.
 */
export async function searchOperatorNames(
  query: string,
  offset: number = 0,
): Promise<OperatorNameResult> {
  return matchOperatorNames(await getOperatorNames(), query, offset);
}
