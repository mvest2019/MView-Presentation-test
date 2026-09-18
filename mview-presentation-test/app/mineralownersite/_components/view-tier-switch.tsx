"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { usePortalStateOptional } from "./portal-state-provider";
import { usePortalViewState } from "./reference/view-state";
import { writeViewTier } from "../_lib/view-tier-store";
import {
  VIEW_TIERS,
  VIEW_TIER_ABBR,
  VIEW_TIER_HINT,
  VIEW_TIER_NAME,
} from "../_lib/portal-state";

/**
 * THE DENSITY SWITCH — Ultra · Essentials · Detailed · Professional.
 *
 * ── IT CHANGES THE DENSITY WITHOUT CHANGING THE URL ──
 *
 * This used to be four `<Link href="?view=pro">`s, so choosing a density was a
 * NAVIGATION: it pushed a history entry and left `?view=pro` in the address bar
 * of every page the owner then copied or bookmarked. The Dashboard's own
 * persona switch has never done that — it sets state and saves the choice — so
 * the same control behaved differently depending on which page it was opened
 * from. Now both write to the same saved preference and neither touches the
 * query string.
 *
 * WHAT REPLACED THE NAVIGATION. `writeViewTier` saves the choice and notifies
 * this tab, `PortalStateProvider` is subscribed to that store, and the class on
 * its wrapper changes. No route change, no history entry, no re-render of the
 * page beneath — the gate is still CSS, which is the whole reason the density
 * costs nothing to switch.
 *
 * ── `?view=` IS STILL A DEEP LINK, AND IS STRIPPED WHEN THE SWITCH IS USED ──
 *
 * Body copy across the portal still links to "read this at Detailed" with
 * `?view=detailed`, and that contract is untouched: the provider applies such a
 * link and saves it. But once the reader has used the switch, the param in the
 * bar is a stale instruction that would be re-applied on the next reload and
 * silently undo their choice. So a click removes it — `router.replace`, so the
 * correction does not become a history entry the Back button has to walk
 * through, and `scroll: false` so the page does not jump to the top while an
 * account menu is open over it.
 *
 * A `<button>`, NOT AN `<a>`: this changes how the current page is displayed
 * rather than going anywhere, which is the line between the two elements.
 * `portal.css` already styled `.view-switch button` alongside the anchor.
 * Clause 6 of the tier contract is unchanged — it is still a real tablist with
 * `role="tab"` and `aria-selected` tracking the choice.
 */
export function ViewTierSwitch({
  onNavigate,
  compact = true,
}: {
  /** Close the menu or drawer this switch is sitting in. */
  onNavigate?: () => void;
  compact?: boolean;
}) {
  /*
   * TWO SHELLS, ONE SWITCH.
   *
   * `(reference)` pages — the Dashboard, Alerts, Invite, Billing, Settings and
   * Profile — are wrapped by `Portal`, which owns the density in React state
   * and persists it under `mv.tier`. `(portal)` pages still use
   * `PortalStateProvider`, which reads `?view=` and the other store.
   *
   * THE REFERENCE ONE WINS WHERE IT EXISTS, and it has to: under that shell
   * `writeViewTier` writes a key nothing reads, so the switch would show the
   * right value and do nothing when pressed. `usePortalViewState()` returns
   * null outside that shell, which is the documented way it says so, and the
   * old provider answers instead.
   */
  const reference = usePortalViewState();
  const legacy = usePortalStateOptional();
  const viewTier = reference?.tier ?? legacy?.viewTier ?? "detailed";
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function choose(tier: (typeof VIEW_TIERS)[number]): void {
    if (reference) reference.setTier(tier);
    else writeViewTier(tier);

    if (params.has("view")) {
      const next = new URLSearchParams(params.toString());
      next.delete("view");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    }

    onNavigate?.();
  }

  return (
    <div
      className={`view-switch${compact ? " v41-avviews" : ""}`}
      role="tablist"
      aria-label="View density"
    >
      {VIEW_TIERS.map((tier) => {
        const selected = tier === viewTier;
        return (
          <button
            key={tier}
            type="button"
            role="tab"
            aria-selected={selected}
            className={selected ? "on" : undefined}
            title={VIEW_TIER_HINT[tier]}
            onClick={() => choose(tier)}
          >
            {/* Clause 2: the KEY is `simple`, the NAME is "Essentials". The word
                "Simple" must never reach the UI — it reads as derogatory about
                the reader rather than descriptive of the density.

                BOTH LABELS SHIP, and CSS picks: the design's own `.vs-full` /
                `.vs-abbr` pair. `portal.css` takes the short one at phone width
                and inside the account menu, whose panel is 280px at every
                viewport — four full labels overflowed it, clipping
                "Professional" against the panel edge. */}
            <span className="vs-full">{VIEW_TIER_NAME[tier]}</span>
            <span className="vs-abbr">{VIEW_TIER_ABBR[tier]}</span>
          </button>
        );
      })}
    </div>
  );
}
