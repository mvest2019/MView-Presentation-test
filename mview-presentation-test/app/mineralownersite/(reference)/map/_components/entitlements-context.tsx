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
 * ── TWO TIERS, AND WHY ──
 *
 *   ACCOUNT TIER   what the reader has actually paid for. Resolved server-side
 *                  from the session (`entitlementsForUser`), so it is the only
 *                  one that may ever grant anything.
 *
 *   DEMO TIER      which tier the portal chrome's density picker is currently
 *                  showing. A preference, set in the browser, worth exactly
 *                  nothing as a claim.
 *
 * THE EFFECTIVE TIER IS THE LOWER OF THE TWO. That is §12.1's "fail down, never
 * up" applied to the one control that could otherwise break it: the picker can
 * only ever show LESS than the account holds, so an Ultra account that selects
 * Pro sees the Ultra map. Set `MAP_TIER_DEFAULT=pro` (server-side, dev only) to
 * raise the account ceiling and demo the whole ladder.
 *
 * Keeping the picker meaningful matters — it is how the four tiers are reviewed
 * and demonstrated in this build — but it is a VIEW of an entitlement, never a
 * source of one.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";

import {
  TIERS,
  TIER_ORDER,
  type Entitlements,
  type Tier,
} from "@/lib/entitlements";

export interface MapEntitlements {
  /** What to draw. The lower of the account tier and the demo tier. */
  ent: Entitlements;
  /** What the account really holds — what a lock chip promises against. */
  accountTier: Tier;
  /** True when the picker is showing less than the account holds. */
  demoting: boolean;
}

const Ctx = createContext<MapEntitlements | null>(null);

function lower(a: Tier, b: Tier): Tier {
  return TIER_ORDER.indexOf(a) <= TIER_ORDER.indexOf(b) ? a : b;
}

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
  const effective = demoTier ? lower(account.tier, demoTier) : account.tier;
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
  /** Server-resolved. The ceiling. */
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

/** The account tier and whether the picker is currently below it. */
export function useEntitlementContext(): MapEntitlements {
  return (
    useContext(Ctx) ?? {
      ent: TIERS.ultra,
      accountTier: "ultra",
      demoting: false,
    }
  );
}
