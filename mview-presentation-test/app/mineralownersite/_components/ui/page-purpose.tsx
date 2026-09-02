"use client";

import { useState } from "react";

/**
 * "WHY THIS PAGE?" — an opt-in, one-line statement of what a route is for.
 *
 * ── WHY IT IS A BUTTON AND NOT A BANNER ──
 *
 * It used to be an always-on panel at the top of every route, and the design's
 * note on replacing it is a budget argument: on a phone, a standing explanation
 * pushes the owner's own figures below the fold on every single screen. So the
 * panel became a 32px pill that reveals it, and owner content starts at the top.
 *
 * ── DISMISSAL PERSISTS, PER ROUTE ──
 *
 * A reader who has understood what My Leases is for does not need telling again,
 * but may still want the hint on the lease report. So `✕` records THIS route in
 * `localStorage` and the control does not come back for it. Keyed by route, not
 * globally, which is the difference between a helpful hint and a nag.
 *
 * `useState` for the open/dismissed flags rather than an external store: unlike
 * the density tier and the live lease, nothing else on the page needs to know,
 * and a first paint that shows the pill is correct in every case.
 *
 * ── WHAT IS DELIBERATELY ABSENT ──
 *
 * The design's banner ends with "Explain every box on this page →", which turns
 * on EXPLAIN MODE — a separate feature that annotates every card on the route
 * and is not built here. A link that announces a mode nobody can enter is worse
 * than no link, so the banner carries the purpose and the dismiss, and stops.
 */
export function PagePurpose({
  routeKey,
  children,
}: {
  /** Namespaces the dismissal, so each route is remembered separately. */
  routeKey: string;
  /** The one sentence. Extracted from the design's `PAGE_PURPOSE` table. */
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  function dismiss() {
    setDismissed(true);
    try {
      const hidden = JSON.parse(
        window.localStorage.getItem("mv_ppf_hide") ?? "{}",
      );
      hidden[routeKey] = 1;
      window.localStorage.setItem("mv_ppf_hide", JSON.stringify(hidden));
    } catch {
      /* Storage unavailable — it stays dismissed for this session only. */
    }
  }

  if (dismissed) return null;

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        className="inline-flex min-h-[32px] cursor-pointer items-center gap-1.5 rounded-full border border-mv-line bg-mv-card px-3 py-1 text-[11.5px] font-bold text-mv-green-deep hover:bg-mv-tint max-[767px]:min-h-[44px]"
      >
        <span aria-hidden="true">ⓘ</span> Why this page?
      </button>

      {open && (
        <div className="mt-2 flex w-full items-start gap-2 rounded-[9px] border border-mv-mint-line bg-mv-mint px-3 py-2 text-[12.5px]">
          <span aria-hidden="true">ⓘ</span>
          <span className="min-w-0 flex-1">
            <strong>What this page is for:</strong> {children}
          </span>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss — do not show this again for this page"
            className="flex-none cursor-pointer border-0 bg-transparent p-0 text-mv-muted hover:text-mv-ink"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
