"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import type { ViewTier } from "../_lib/portal-state";

/**
 * "See the details →" — a density change, written as a link.
 *
 * WHY THIS EXISTS AS A SHARED COMPONENT. The reference calls `setViewTier(...)`
 * from a dozen inline `onclick` handlers scattered across the Activities and
 * Weekly Report routes: "See the details", "Read the full report", "switch to
 * Professional →". Each of those is the same action, and `ViewTierSwitch`
 * already established how this build performs it — as a `?view=` link, RV-03
 * clause 5, so the change is bookmarkable and needs no click handler.
 *
 * Rebuilding that URL logic at every call site is how the account menu's
 * switch and an in-page button end up disagreeing about whether `?state=`
 * survives. They must agree: a reviewer holding `?state=lapsed` who clicks
 * "See the details" has asked for more detail, not to leave the funnel state
 * they were inspecting.
 *
 * `scroll={false}` throughout — a density change re-styles the page in place;
 * jumping the reader to the top would lose their position in a five-page
 * report for no reason.
 */
export function TierLink({
  tier,
  className,
  children,
}: {
  tier: ViewTier;
  /** The reference's own class on that control — a `.btn`, or `.linklike`. */
  className?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useSearchParams();

  const next = new URLSearchParams(params.toString());
  next.set("view", tier);

  return (
    <Link
      href={`${pathname}?${next.toString()}`}
      className={className}
      scroll={false}
    >
      {children}
    </Link>
  );
}
