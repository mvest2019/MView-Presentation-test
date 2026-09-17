"use client";

import { useEffect, useState } from "react";

import { REPORT_PAGES } from "../../_lib/report-fixtures";

/**
 * THE TWELVE JUMP CHIPS — and which page you are currently reading.
 *
 * ── THEY ARE ANCHOR LINKS, NOT TABS ──
 *
 * All twelve pages are on the screen at once: it is a document, find-in-page
 * has to reach every figure in it, and it has to print. The chips jump; nothing
 * is hidden behind them.
 *
 * ── THE ACTIVE CHIP IS THE POINT OF REDOING THIS ──
 *
 * A jump list with no current state answers "where can I go" and not "where am
 * I", and in a document this long the second question is the one a reader
 * actually has — they scroll, they lose the thread, and the nav that could tell
 * them they are on page 8 of 12 instead sits there looking identical to how it
 * looked on page 1. So the chip for the page under the reading line is filled.
 *
 * ── WHY `IntersectionObserver` AND NOT A SCROLL HANDLER ──
 *
 * A scroll listener fires on every frame of every scroll and then has to
 * measure twelve elements to decide anything, which is twelve forced layouts a
 * frame. The observer is handed the same question once and answers it off the
 * main thread's critical path.
 *
 * THE `rootMargin` IS THE READING LINE. `-124px` off the top clears the portal's
 * sticky chrome — the same offset the pages' own `scroll-mt-28` uses, so a
 * clicked chip and the chip that then lights up agree. `-55%` off the bottom
 * narrows the observer's band to the upper part of the viewport, so "current"
 * means the page you are reading rather than every page that happens to be
 * visible on a tall screen.
 *
 * ── A CLICK MARKS ITSELF, RATHER THAN WAITING TO BE OBSERVED ──
 *
 * The observer cannot answer until the jump has landed and the next frame has
 * been rendered, so a chip clicked at the bottom of a long page stayed unlit
 * for the whole scroll — the one moment the reader is looking straight at it.
 * The click sets it directly; the observer then keeps it honest as they scroll
 * on. Both write the same piece of state, so they cannot disagree for longer
 * than a frame.
 *
 * ── IT DEGRADES TO AN ORDINARY NAV ──
 *
 * No observer, no active chip, and every link still works. The state is a
 * courtesy on top of twelve anchors, not the thing that makes them function.
 */
export function ReportNav() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const sections = REPORT_PAGES.map((page) =>
      document.getElementById(page.id),
    ).filter((element): element is HTMLElement => element !== null);

    if (sections.length === 0) return;

    /* The observer reports changes, not the full picture, so the set of what is
       currently in the band is kept here and the topmost member of it wins. */
    const inBand = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inBand.add(entry.target.id);
          else inBand.delete(entry.target.id);
        }
        const first = REPORT_PAGES.find((page) => inBand.has(page.id));
        /* Keep the last answer when the band is empty — that happens between
           pages and at the very bottom of the document, and blanking the nav
           there would flicker it off exactly where the reader is looking. */
        if (first) setActive(first.id);
      },
      { rootMargin: "-124px 0px -55% 0px" },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Report pages"
      className="flex flex-wrap gap-2 border-t border-mv-line-strong bg-mv-bg px-4 py-3"
    >
      {REPORT_PAGES.map((page, position) => {
        const current = active === page.id;
        return (
          <a
            key={page.id}
            href={`#${page.id}`}
            onClick={() => setActive(page.id)}
            aria-current={current ? "true" : undefined}
            className={`inline-flex items-center gap-2 rounded-[10px] border px-2.5 py-[7px] text-[12px] font-semibold whitespace-nowrap no-underline transition-colors ${
              current
                ? "border-mv-green-deep bg-mv-green-deep text-white"
                : "border-mv-line bg-mv-card text-mv-slate hover:border-mv-green hover:bg-mv-mint"
            }`}
          >
            <span
              className={`inline-flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full text-[10px] font-bold tabular-nums ${
                current ? "bg-white/20 text-white" : "bg-mv-mint text-mv-green-ink"
              }`}
            >
              {position + 1}
            </span>
            {/* The short name where a page has one — see `nav` on `ReportPage`
                for why these are not truncated titles. */}
            {page.nav ?? page.title}
          </a>
        );
      })}
    </nav>
  );
}
