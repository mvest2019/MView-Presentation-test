"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Renders its children everywhere EXCEPT the Mineral Owner Portal.
 *
 * WHY A WRAPPER RATHER THAN A GATE INSIDE THE COMPONENT. `SiteHeader` hides
 * itself on portal routes with the same predicate, and it can afford to: it is
 * already a client component and already reads `usePathname` for its active
 * state, so the check is free there. `SiteFooter` is the opposite — a server
 * component, 116 lines of static markup, no hooks. Putting `usePathname` in it
 * would turn the whole footer and its `site-nav` data imports into client
 * JavaScript to answer one question about the URL.
 *
 * So the gate lives out here instead. `children` is passed through untouched,
 * which means the footer stays a server component and only these few lines ship
 * to the browser. It is also removed rather than hidden with CSS — no markup for
 * a footer nobody can see is sent at all.
 *
 * SCOPED TO THE PORTAL ON PURPOSE, and not written as a general
 * `hideOn={[...]}` prop. One caller, one rule, and the rule is a fact about the
 * portal: it supplies its own chrome, so the marketing shell must not appear
 * around it. A generic version would invite the marketing shell to be switched
 * off in places nobody has thought about.
 */
export function HideInPortal({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const inPortal =
    pathname === "/mineralownersite" ||
    pathname.startsWith("/mineralownersite/");

  return inPortal ? null : children;
}
