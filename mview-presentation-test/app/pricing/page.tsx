import type { Metadata } from "next";

import { pageShellClass } from "../_components/page-shell";
import { PricingView } from "./_components/pricing-view";

/**
 * Pricing — a composed route.
 *
 * THIS PAGE NO LONGER RENDERS `PRICING_MARKUP`. It used to inject the
 * prototype's 31 KB HTML string through `ProtoPage` with
 * `dangerouslySetInnerHTML`; it is built from `mv-*` tokens and Tailwind
 * utilities now, like the feature landings. Three things that could not be done
 * through the injected string are the reason:
 *
 *   1. The feature cards open the pages that explain them. Injected markup can
 *      only carry plain `<a href>`, which is a full page load; these are real
 *      `next/link` navigations.
 *   2. `#plans` exists as a real anchor, so `upgradeHref` in
 *      `lib/entitlements.ts` — which returns `/pricing?…#plans` — lands on the
 *      ladder instead of scrolling nowhere.
 *   3. The Professionals segment shows the professional feature pages this app
 *      actually has, rather than an empty ladder.
 *
 * `PRICING_MARKUP` in `_proto/markup.ts` is now unread. It is left in place
 * because the generator still emits it alongside the home and professionals
 * markup this app does still inject.
 */
export const metadata: Metadata = {
  // The design's own title for this route, from its route/title map.
  title: "Plans & Pricing — Owner & Professional | Mineral View",
  description:
    "Owner plans free to start, and professional plans for operators and advisors. No auto-renew — renewal always needs your explicit click.",
};

export default function PricingPage() {
  return (
    <div className={pageShellClass}>
      {/*
        The page's own h1, which the prototype's pricing section never had — its
        heading was set by the router as the segment switched. Visually hidden
        because the section leads with its own centred display heading; a second
        visible one would read as a duplicate.
      */}
      <h1 className="sr-only">Plans and pricing</h1>
      <PricingView />
    </div>
  );
}
