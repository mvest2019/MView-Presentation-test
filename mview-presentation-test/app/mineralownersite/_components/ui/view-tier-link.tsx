"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { PortalButtonLink, type PortalButtonSize } from "./button";

/**
 * A BUTTON THAT MOVES THE READER TO ANOTHER DENSITY TIER.
 *
 * Two surfaces in the design end with one of these: the Ultra hero's "See the
 * plain-English list" and the Essentials card's "See the details". Both called
 * `setViewTier(...)` in the prototype; density in this build is the `?view=`
 * parameter that `PortalStateProvider` reads, so the same step is a link.
 *
 * ── WHY IT IS A CLIENT COMPONENT FOR ONE `href` ──
 *
 * Because a bare `?view=simple` DROPS EVERY OTHER PARAMETER, and one of them
 * matters: `?state=` is how a reviewer holds the portal in a funnel state.
 * Measured — clicking the Ultra hero's button while reviewing the claimed state
 * silently returned the page to `paid`, which is the one thing a design reviewer
 * must not have happen mid-review.
 *
 * So the href is built the way `../view-tier-switch.tsx` builds its four: copy
 * the current parameters, set `view`, keep the rest. That needs
 * `useSearchParams`, which needs a client component — and it is a small enough
 * one that both callers stay server-rendered around it.
 *
 * IT DOES NOT RENDER THE ACTIVE STATE. Unlike the tier switch in the account
 * menu, these two buttons only ever appear in the tier they are leaving.
 */
export function ViewTierLink({
  tier,
  size = "sm",
  variant = "ghost",
  children,
}: {
  tier: string;
  size?: PortalButtonSize;
  variant?: "primary" | "ghost" | "mint";
  children: ReactNode;
}) {
  const pathname = usePathname();
  const params = useSearchParams();

  const next = new URLSearchParams(params.toString());
  next.set("view", tier);

  return (
    <PortalButtonLink
      variant={variant}
      size={size}
      href={`${pathname}?${next.toString()}`}
    >
      {children}
    </PortalButtonLink>
  );
}
