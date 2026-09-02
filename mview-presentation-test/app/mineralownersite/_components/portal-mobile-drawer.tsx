"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { PortalIcon } from "./portal-icon";
import { PortalNavRow } from "./portal-nav-row";
import { PortalSectionList } from "./portal-section-list";
import { drawerSections, primarySlots } from "../_lib/portal-nav";
import { demoDisclosure } from "../_lib/portal-demo-data";

/**
 * The mobile portal menu.
 *
 * v33 · A/mobile — it MIRRORS the desktop sidebar: an explicit Close (X), a
 * prominent Claim entry, and the same labelled sections with spacing. Before
 * that pass it was one undifferentiated list, and the sections are what make it
 * scannable rather than a wall of eleven rows.
 *
 * v33 · J31 — the explicit Close (X) top-right. The backdrop closes it too, but
 * a backdrop is not discoverable and it is not reachable from a keyboard.
 *
 * IT CARRIES AN ACCOUNT SECTION and the sidebar does not, because there is no
 * avatar menu at phone width for Settings and Billing to live in. That is the
 * one intended difference between the two.
 */
export function PortalMobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  // Escape closes it. A drawer that traps a keyboard user behind a backdrop is
  // worse than no drawer.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <div
      className={`app-drawer ${open ? "open" : ""}`}
      // The backdrop closes; a click inside the panel must not. Comparing
      // target to currentTarget is what distinguishes the two.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="panel" role="navigation" aria-label="Portal menu">
        <button
          type="button"
          className="v33-drawer-x"
          onClick={onClose}
          aria-label="Close menu"
        >
          <svg
            className="mvi"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {primarySlots.map((slot) => (
          <PortalNavRow
            key={slot.slotClass}
            item={slot}
            active={false}
            extraClass={slot.slotClass}
            onNavigate={onClose}
          />
        ))}

        <PortalSectionList
          pathname={pathname}
          sections={drawerSections}
          onNavigate={onClose}
        />

        <Link href="/" className="nav-item" onClick={onClose}>
          <span className="nav-ico">
            <PortalIcon name="back" />
          </span>
          Public site
        </Link>

        <div className="mv-drawer-demo">{demoDisclosure.drawer}</div>
      </div>
    </div>
  );
}
