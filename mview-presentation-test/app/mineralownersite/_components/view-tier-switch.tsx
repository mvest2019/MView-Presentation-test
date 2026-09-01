"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { usePortalState } from "./portal-state-provider";
import {
  VIEW_TIERS,
  VIEW_TIER_HINT,
  VIEW_TIER_NAME,
} from "../_lib/portal-state";

/**
 * The four-view density switch — Ultra · Essentials · Detailed · Professional.
 *
 * WHERE IT LIVES, AND WHERE IT DOES NOT (v41 · AUDIT #1, Ryan 2026-07-15): the
 * switch was on the top bar of every page and it now lives in Settings and in
 * the account menu. Pages simply render the owner's chosen density. That is why
 * this component is only ever mounted inside the account menu — putting it back
 * on the bar would undo that decision.
 *
 * A REAL TABLIST (RV-03 clause 6): `role="tab"` with `aria-selected` tracking
 * the choice, inside a `role="tablist"`. The visual `.on` state is a background
 * swap, so `aria-selected` is what a screen reader has to go on.
 *
 * LINKS, NOT BUTTONS. Each tier is a URL — `?view=pro` — which is RV-03
 * clause 5, the deep link. Making them links means the density is bookmarkable
 * and shareable for free, the choice survives a reload, and the switch needs no
 * click handler. The provider writes the chosen tier to `localStorage` so it
 * also survives the next visit.
 */
export function ViewTierSwitch({ onNavigate }: { onNavigate?: () => void }) {
  const { viewTier } = usePortalState();
  const pathname = usePathname();
  const params = useSearchParams();

  /** Keep any `?state=` a reviewer is holding — changing density must not knock
      them out of the funnel state they were looking at. */
  function hrefFor(tier: string): string {
    const next = new URLSearchParams(params.toString());
    next.set("view", tier);
    return `${pathname}?${next.toString()}`;
  }

  return (
    <div
      className="view-switch v41-avviews"
      role="tablist"
      aria-label="View density"
    >
      {VIEW_TIERS.map((tier) => {
        const selected = tier === viewTier;
        return (
          <Link
            key={tier}
            href={hrefFor(tier)}
            role="tab"
            aria-selected={selected}
            className={selected ? "on" : undefined}
            title={VIEW_TIER_HINT[tier]}
            onClick={onNavigate}
            scroll={false}
          >
            {/* Clause 2: the KEY is `simple`, the NAME is "Essentials". The word
                "Simple" must never reach the UI — it reads as derogatory about
                the reader rather than descriptive of the density. */}
            {VIEW_TIER_NAME[tier]}
          </Link>
        );
      })}
    </div>
  );
}
