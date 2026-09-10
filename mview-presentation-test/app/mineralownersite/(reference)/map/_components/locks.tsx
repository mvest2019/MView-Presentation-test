"use client";

/**
 * THE TRUNCATION BAND — spec §11.2, and the only lock pattern this map kept.
 *
 * ── WHAT WAS HERE AND WHY IT WENT ──
 *
 * §11.1 governs the spec's whole approach to gating:
 *
 *   > **Show the lock. Never hide the feature.**
 *
 * and this file used to carry all three patterns it defines — a lock chip for
 * a single control, a locked card for a whole panel, a truncation band for
 * capped data. The first two are gone, by product decision: the map now renders
 * only what the reader's mode can actually use. A facet they cannot filter on,
 * a tool they cannot arm and a basemap they cannot select are not drawn at all.
 *
 * The reasons, recorded so this is not quietly reverted by someone reading
 * §11.1 on its own: at rail and panel widths the tier chips collided with the
 * labels they annotated, and a Tools panel where half the rows were adverts
 * read as a paywall rather than a toolbox. The upsell moved to the pricing
 * page.
 *
 * ── WHY THE BAND STAYED ──
 *
 * Because it is not the same kind of thing. A lock chip points at a CONTROL the
 * reader cannot press; a truncation band reports that the DATA in front of them
 * is incomplete. Hiding the first is a product choice about how to sell. Hiding
 * the second is lying about the map, and §5.5(a) is unambiguous:
 *
 *   > "Do not hide the truncation. A silently incomplete map is the fastest way
 *   > to destroy trust in a data product, and the honest version is a better
 *   > upsell than the dishonest one."
 *
 * §6 agrees from the other direction — it lists the true `matched`/`total`
 * counts among the things deliberately never gated, because "the size of what
 * they cannot reach is the upgrade argument".
 */

import Link from "next/link";
import {
  TIERS,
  TIER_LABELS,
  TIER_ORDER,
  upgradeHref,
  type Entitlements,
  type Tier,
} from "@/lib/entitlements";

import { useEntitlementContext } from "./entitlements-context";

/* ========================================================================== */
/*  TRUNCATION BAND                                                       */
/* ========================================================================== */

/**
 * "Showing 250 of 1,412 wells in view. Essential draws up to 1,000."
 *
 * PERSISTENT AND NON-DISMISSIBLE, by §11.2. §5.5(a) is emphatic about why:
 *
 *   > "Do not hide the truncation. A silently incomplete map is the fastest way
 *   > to destroy trust in a data product, and the honest version is a better
 *   > upsell than the dishonest one."
 *
 * `next` is the tier above the current one and the cap it would draw. Omit it at
 * the top tier, where there is nothing to sell and the band is pure disclosure.
 */
export function TruncationBand({
  showing,
  total,
  noun,
  next,
  feature,
}: {
  showing: number;
  /** The service's TRUE figure, never the capped one. */
  total: number;
  /** "wells in view", "matched wells", "rows". */
  noun: string;
  next: { tier: Tier; cap: number } | null;
  feature: string;
}) {
  const { ent } = useEntitlementContext();
  const n = (v: number) => v.toLocaleString("en-US");

  return (
    <div
      role="status"
      className="pointer-events-auto flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b border-mv-line bg-[#fdf6e6] px-3 py-[6px] text-center text-[12px] leading-[1.45] text-mv-ink"
    >
      <span>
        <strong className="font-bold">
          {`Showing ${n(showing)} of ${n(total)} ${noun}.`}
        </strong>
        {next
          ? ` ${TIER_LABELS[next.tier]} draws up to ${n(next.cap)}.`
          : null}
      </span>
      {next ? (
        <Link
          href={upgradeHref(ent.tier, feature)}
          className="font-semibold text-mv-green-deep"
        >
          Upgrade
        </Link>
      ) : null}
    </div>
  );
}

/* ========================================================================== */
/*  helpers                                                                   */
/* ========================================================================== */

/**
 * The next tier up and what it raises a cap to, for a truncation band.
 *
 * Reads `TIERS` rather than taking a number, so a band can never quote a cap
 * that disagrees with §7.5. Returns `null` at `pro`, where there is no next.
 */
export function nextCapUp(
  current: Tier,
  read: (e: Entitlements) => number,
): { tier: Tier; cap: number } | null {
  const at = TIER_ORDER.indexOf(current);
  if (at < 0 || at === TIER_ORDER.length - 1) return null;

  const next = TIER_ORDER[at + 1];
  return { tier: next, cap: read(TIERS[next]) };
}
