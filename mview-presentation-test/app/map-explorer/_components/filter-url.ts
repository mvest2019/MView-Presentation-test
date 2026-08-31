/*
 * The applied filter, in the address bar.
 *
 * A link to the map is worth little if it opens on the whole state: what
 * someone wants to send is what they were looking at. The filter is the part
 * of that a URL can carry honestly — the facets and their values, exactly as
 * `matched-wells` takes them — so a shared link opens with the same wells
 * drawn and the same boxes ticked.
 *
 * Only these six. The extent is not written: the map moves on its own when a
 * filter lands, and a saved centre would fight it.
 */

/** The parameters `matched-wells` accepts, and the only ones we round-trip. */
export const FILTER_PARAMS = [
  "county",
  "operator",
  "wtype",
  "status",
  "play",
  "field",
] as const;

/** What a URL is asking for, or an empty object if it asks for nothing. */
export function readFilterParams(search: string): Record<string, string[]> {
  const params = new URLSearchParams(search);
  const filters: Record<string, string[]> = {};

  for (const key of FILTER_PARAMS) {
    const raw = params.get(key);
    if (!raw) continue;

    const values = raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (values.length > 0) filters[key] = values;
  }

  return filters;
}

/**
 * Writes the filter into the current address, without a navigation.
 *
 * `replaceState`, not `pushState`: applying a filter is not a page the back
 * button should have to walk through, and the map already has its own way
 * back — Clear filters.
 */
export function writeFilterParams(filters: Record<string, string[]>): void {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  for (const key of FILTER_PARAMS) url.searchParams.delete(key);

  for (const [key, values] of Object.entries(filters)) {
    if (values.length > 0) url.searchParams.set(key, values.join(","));
  }

  window.history.replaceState(null, "", url.toString());
}
