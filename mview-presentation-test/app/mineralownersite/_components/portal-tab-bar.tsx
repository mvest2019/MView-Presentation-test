"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PortalIcon } from "./portal-icon";
import { isNavItemActive, tabBar } from "../_lib/portal-nav";

/**
 * The phone bottom tab bar — five slots, shown below 1024px.
 *
 * Home · Leases · Map · Activity · Profile: the design's own five, and NOT the
 * sidebar's eleven. A tab bar is the handful of places a thumb goes; the drawer
 * behind the hamburger carries everything else. Labels are short because the row
 * is 10px type.
 *
 * `.app-body` gains bottom padding at these widths (v26 · S2) so this bar never
 * covers content or a CTA.
 *
 * An unbuilt slot renders as a plain label with `aria-disabled`, same as the
 * sidebar — a tab that silently does nothing is worse than one that says it is
 * not ready.
 */
export function PortalTabBar() {
  const pathname = usePathname();

  return (
    <nav className="tabbar" aria-label="Primary">
      {tabBar.map((item) => {
        const icon = (
          <span className="t-ico">
            <PortalIcon name={item.icon} />
          </span>
        );

        if (!item.href) {
          return (
            <span
              key={item.navKey}
              aria-disabled="true"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                fontSize: 10,
                fontWeight: 700,
                color: "#9aa3ae",
                padding: "4px 2px",
              }}
              title={`${item.label} — not open yet`}
            >
              {icon}
              {item.label}
            </span>
          );
        }

        const active = isNavItemActive(item.href, pathname);
        return (
          <Link
            key={item.navKey}
            href={item.href}
            className={active ? "on" : undefined}
            aria-current={active ? "page" : undefined}
            data-nav={item.navKey}
          >
            {icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
