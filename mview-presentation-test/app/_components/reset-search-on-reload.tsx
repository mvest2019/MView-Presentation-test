"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Clears the `q` search param when the document was RELOADED (QA #4).
 *
 * The term lives in the URL so a filtered view is shareable and the back button
 * works, which also meant a refresh came back still filtered. The Navigation
 * Timing entry separates the cases: only `reload` means "start again". A shared
 * link reports `navigate` and a back/forward step reports `back_forward`, so
 * both still restore the search they carry.
 *
 * RENDERED FROM THE LAYOUT, not from the toolbar, and that placement is the
 * point: the toolbar sits inside the route's Suspense boundary, so the reset
 * only ran once the articles had been fetched — leaving the old results on
 * screen for a second first, and never running at all if the boundary stalled.
 * A layout renders outside the boundary, so the URL is corrected immediately.
 *
 * The query is read from `window.location`, NOT from `useSearchParams`. That
 * hook opts its whole subtree out of prerendering, and a layout has no Suspense
 * boundary above it to bail into, so the production build failed to prerender
 * every page under this layout ("useSearchParams() should be wrapped in a
 * suspense boundary"). Nothing is lost: this runs once, in an effect, on the
 * client, where `window.location` is the authoritative value anyway.
 *
 * Renders nothing.
 */
export function ResetSearchOnReload({ basePath }: { basePath: string }) {
  const router = useRouter();

  useEffect(() => {
    const [entry] = performance.getEntriesByType(
      "navigation",
    ) as PerformanceNavigationTiming[];
    if (entry?.type !== "reload") return;

    const params = new URLSearchParams(window.location.search);
    if (!params.has("q")) return;

    params.delete("q");
    params.delete("show"); // the "Load more" count belongs to the old query
    const query = params.toString();
    router.replace(query ? `${basePath}?${query}` : basePath, {
      scroll: false,
    });
    // Mount only: this is about how the document was loaded, nothing else.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
