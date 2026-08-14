"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders its children only once the section is near the viewport.
 *
 * WHY THIS EXISTS, AND WHY IT DEFERS RENDER RATHER THAN FETCH. The three sections it
 * wraps — the 254-path Texas map, the 84-row county table, the 40-row lease table —
 * are the bulk of this page's DOM, and all three are below the fold. None has an
 * endpoint of its own: `/operators/details` returns identity, condition, company and
 * production in one 3.8 KB response, and everything else on the page comes from the
 * fixture. So there is no request to postpone. What costs time is style and layout
 * over roughly two thousand elements, which is exactly what `content-visibility`
 * could not fix on the listing page — measured there, hoisting containment made
 * things worse. Not building the DOM until it is wanted does fix it.
 *
 * NO LAYOUT SHIFT. The placeholder reserves `minHeight` before mounting, so the
 * scroll position and everything below it stay put when the real content arrives.
 * Pass a height close to the section's real one.
 *
 * ONE-WAY. Once mounted it stays mounted — the observer disconnects. Unmounting on
 * scroll-out would throw away the layout work and any state the section holds (an
 * open lease, a map metric), and would re-run it on the way back.
 *
 * `rootMargin` starts the work before the section is visible, so in normal scrolling
 * the content is already there by the time it comes into view.
 */
export function DeferredSection({
  children,
  minHeight,
  /** Announced while the section is still a placeholder. */
  label,
}: {
  children: React.ReactNode;
  minHeight: number;
  label: string;
}) {
  const [shown, setShown] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // No IntersectionObserver (very old browsers, some crawlers): render anyway,
    // rather than leave the section permanently empty. Scheduled rather than set
    // here — a synchronous `setState` in an effect body causes a cascading render
    // and `react-hooks` rightly flags it.
    if (typeof IntersectionObserver === "undefined") {
      const timer = setTimeout(() => setShown(true), 0);
      return () => clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={shown ? undefined : { minHeight }}>
      {shown ? (
        children
      ) : (
        <div
          role="status"
          aria-live="polite"
          className="flex h-full items-center justify-center rounded-2xl border border-mv-line bg-white shadow-mv"
          style={{ minHeight }}
        >
          <span className="sr-only">{label} — loading</span>
          {/* The same shimmer the tables use, so a deferred section reads as
              loading rather than broken. */}
          <span
            aria-hidden="true"
            className="h-3 w-[220px] animate-pulse rounded-md bg-mv-line-soft"
          />
        </div>
      )}
    </div>
  );
}
