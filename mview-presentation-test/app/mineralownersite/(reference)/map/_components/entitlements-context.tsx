"use client";

/**
 * THE MAP'S ENTITLEMENTS, AS THE CLIENT SEES THEM.
 *
 * The object arrives as a PROP FROM THE SERVER COMPONENT and is never fetched
 * on mount — §5.1's rule, with its reason: "Fetching would flash an ungated UI
 * for one render and then lock it — visibly worse, and briefly exploitable."
 * `page.tsx` resolves it and hands it here; this context spreads it to the
 * fifty-odd components that read it, so no prop is threaded through four levels
 * of map chrome.
 *
 * ── TWO TIERS, AND WHICH ONE WINS TODAY ──
 *
 *   ACCOUNT TIER   resolved server-side from the session
 *                  (`entitlementsForUser`). Intended to be what the reader has
 *                  paid for; today it is an environment default, because no
 *                  billing table is wired behind it.
 *
 *   DEMO TIER      which tier the portal chrome's density picker is showing.
 *
 * THE PICKER DECIDES WHAT IS DRAWN, which makes the map behave like every other
 * portal page — the Dashboard, Alerts, My Leases and the Weekly Report all take
 * their density straight from the picker. The full reasoning, and the one line
 * to change when billing lands, is in `resolveMapEntitlements` below.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { TIERS, type Entitlements, type Tier } from "@/lib/entitlements";

export interface MapEntitlements {
  /** What to draw — the tier the chrome's picker is showing. */
  ent: Entitlements;
  /** What the server resolved for the account. Not a ceiling today; see below. */
  accountTier: Tier;
  /** True when the picker is showing something other than the account tier. */
  demoting: boolean;
}

const Ctx = createContext<MapEntitlements | null>(null);

/**
 * THE PORTAL'S DENSITY KEY IS NOT THE SPEC'S TIER KEY, in one place only.
 *
 * The reference chrome's four view-density values are `ultra | simple |
 * detailed | pro`; the spec's four tiers are `ultra | essential | detailed |
 * pro`. Three of the four match; the second does not, and `simple` is the
 * reference build's own word, baked through `dashboard-reference.css`,
 * `bits.tsx` and `portal-state.ts`.
 *
 * §1 says tier keys "must never be renamed once shipped — they will be written
 * into session records and billing", so the SPEC's key is the one that has to
 * be right, and it is what `lib/entitlements.ts` uses. Renaming the reference
 * port's `simple` to match would fork a file whose whole value is being a
 * verbatim copy, and would touch the Dashboard and the Weekly Report, which
 * have nothing to do with tiering.
 *
 * So the two vocabularies meet here, in one function, and nowhere else.
 */
export function tierFromPortalDensity(density: string): Tier {
  return density === "simple" ? "essential" : (density as Tier);
}

/**
 * The effective entitlements for an account tier and a demo choice.
 *
 * Exported because `MapExplorerView` needs the answer in its own body — it
 * gates map layers and requests, not just JSX — while also providing it to the
 * tree below. One function, so the two can never disagree.
 */
export function resolveMapEntitlements(
  account: Entitlements,
  demoTier: Tier | null,
): MapEntitlements {
  /*
   * THE PICKER DECIDES WHAT IS DRAWN — the same rule every other portal page
   * follows.
   *
   * ── WHAT THIS REPLACED, AND WHY ──
   *
   * It used to be `lower(account.tier, demoTier)`: the server resolved what the
   * account had paid for and the picker could only ever show LESS than that.
   * Correct for a product with real billing, and wrong for this build, for one
   * reason — there IS no billing. `subscriptionForUser` returns `null` for
   * everyone, so the account tier was never a fact about a customer; it was a
   * fallback constant, and on the production deployment that constant is
   * `ultra`. Clamping to it meant the four modes collapsed into one and the map
   * showed two facets whatever the reader chose, while the Dashboard, Alerts,
   * My Leases and the Weekly Report all changed as expected — because those
   * read the picker out of `localStorage` and nothing else.
   *
   * One product, one behaviour. The map now works like its neighbours: the mode
   * you pick is the mode you see, everywhere, local and deployed alike.
   *
   * ── WHAT TO PUT BACK, AND WHEN ──
   *
   * The clamp, on the day `subscriptionForUser` reads a real subscription
   * table. At that point `account.tier` becomes a FACT about a paying customer
   * rather than an environment default, and a picker that can raise it is
   * giving the product away. The line to restore is exactly:
   *
   *     const order = TIER_ORDER;
   *     const effective =
   *       demoTier && order.indexOf(demoTier) < order.indexOf(account.tier)
   *         ? demoTier
   *         : account.tier;
   *
   * — the lower of the two, so the picker can show less than the account holds
   * and never more.
   *
   * Nothing is lost in the meantime: spec §8 enforcement does not exist either,
   * so the caps here have always been rendering hints rather than a gate. The
   * server seam stays wired and keeps resolving a tier, so the day billing
   * lands nothing has to be re-plumbed — only this expression changed back.
   */
  const effective = demoTier ?? account.tier;

  return {
    ent: TIERS[effective],
    accountTier: account.tier,
    demoting: effective !== account.tier,
  };
}

export function MapEntitlementsProvider({
  account,
  demoTier,
  children,
}: {
  /** Server-resolved. The fallback when there is no picker — see
      `resolveMapEntitlements` for why it is not a ceiling today. */
  account: Entitlements;
  /** The portal picker's current choice, or null outside the portal. */
  demoTier: Tier | null;
  children: ReactNode;
}) {
  const value = useMemo<MapEntitlements>(
    () => resolveMapEntitlements(account, demoTier),
    [account, demoTier],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * What this reader may see.
 *
 * FALLS BACK TO THE ENTRY TIER rather than throwing. A component that renders
 * outside the provider — a sample window on the signed-out guide, a test — gets
 * the safe answer, and the safe answer is the least. Never the most.
 */
export function useEntitlements(): Entitlements {
  return useContext(Ctx)?.ent ?? TIERS.ultra;
}

/** The account tier, and whether the picker is showing something else. */
export function useEntitlementContext(): MapEntitlements {
  return (
    useContext(Ctx) ?? {
      ent: TIERS.ultra,
      accountTier: "ultra",
      demoting: false,
    }
  );
}
