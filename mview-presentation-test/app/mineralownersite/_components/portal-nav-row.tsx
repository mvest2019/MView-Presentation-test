"use client";

import Link from "next/link";

import { PortalIcon } from "./portal-icon";
import type { PortalNavItem } from "../_lib/portal-nav";

/**
 * One row of portal navigation — the sidebar's and the drawer's shared row.
 *
 * IT RENDERS ONE OF TWO THINGS, and the difference is the point:
 *
 *   A LINK, when the row's module exists.
 *
 *   A PLAIN LABEL, when it does not. Not a disabled link, not a link to a 404,
 *   and not a lock icon — a lock would say "your plan does not include this",
 *   which is a lie about a module nobody can reach yet. It says "Soon" and it
 *   carries `aria-disabled`, so a screen reader is told the row is inert rather
 *   than left to discover that a link does nothing. This is the convention
 *   `site-nav.ts` already established for the Explore menu's unbuilt `/data/*`
 *   destinations.
 *
 * Give a row its `href` in `portal-nav.ts` when its page lands and it becomes a
 * link with no change here.
 *
 * `.on` is the design's own name for the active row, and the active row also
 * carries `aria-current="page"` — the green wash alone is a colour-only signal.
 */
export function PortalNavRow({
  item,
  active,
  extraClass = "",
  onNavigate,
}: {
  item: PortalNavItem;
  active: boolean;
  /** For the two swapping top slots, which carry their own styling class. */
  extraClass?: string;
  /** The drawer closes itself on navigation; the sidebar passes nothing. */
  onNavigate?: () => void;
}) {
  if (!item.href) {
    return (
      <span
        className={`nav-item ${extraClass}`}
        aria-disabled="true"
        style={{ opacity: 0.5, cursor: "default" }}
        title={`${item.label} — this part of your portal is not open yet`}
      >
        <span className="nav-ico">
          <PortalIcon name={item.icon} />
        </span>
        {item.label}
        <span
          className="tiny"
          style={{ marginLeft: "auto", color: "#5b6472", fontWeight: 700 }}
        >
          Soon
        </span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      className={`nav-item ${extraClass} ${active ? "on" : ""}`}
      aria-current={active ? "page" : undefined}
      data-nav={item.navKey}
      onClick={onNavigate}
    >
      <span className="nav-ico">
        <PortalIcon name={item.icon} />
      </span>
      {item.label}
      {item.badge !== undefined && (
        <span className="unread" style={{ marginLeft: "auto" }}>
          {item.badge}
        </span>
      )}
    </Link>
  );
}
