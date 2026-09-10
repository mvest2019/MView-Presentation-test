"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { PortalAvatar } from "./portal-avatar";
import { PortalIcon } from "./portal-icon";
import { PortalLogout } from "./portal-logout";
import { PortalNavRow } from "./portal-nav-row";
import { usePortalMember } from "./portal-session";
import { PortalSectionList } from "./portal-section-list";
import {
  drawerSections,
  isNavItemActive,
  primarySlots,
} from "../_lib/portal-nav";
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
 *
 * WHO IS SIGNED IN, AT THE TOP, AND LOG OUT AT THE FOOT. The drawer is the
 * menu a thumb actually opens on a phone, so the same two things the desktop
 * account menu carries have to be reachable here: the identity — picture or
 * initials, name, email — and the way out. Both come off the ONE
 * `signOutAction` and the ONE `usePortalMember()` derivation the account menu
 * uses, so the drawer cannot end up showing different initials or ending the
 * session a different way. Signed out, the block is the way IN instead, for the
 * reason the account menu records.
 *
 * LOG OUT SITS BELOW "Public site" and above the disclosure, at the very end of
 * a scroll — nowhere near the navigation rows a thumb sweeps through.
 */
export function PortalMobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const member = usePortalMember();

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

        {/* The identity block, above the navigation. `aria-hidden` is on the
            avatar itself (see `PortalAvatar`), so the name and address here are
            the only announced text. */}
        {member && (
          <div className="mv-drawer-me">
            <PortalAvatar
              image={member.image}
              initials={member.initials}
              className="avatar mv-drawer-me-pic"
            />
            <div className="mv-drawer-me-who">
              <strong>{member.name}</strong>
              {member.email && <span className="tiny">{member.email}</span>}
            </div>
          </div>
        )}

        {primarySlots.map((slot) => (
          <PortalNavRow
            key={slot.slotClass}
            item={slot}
            // Real, for the same reason as the sidebar's copy — see the note
            // there. The drawer mirrors the rail, including which row is lit.
            active={isNavItemActive(slot.href, pathname)}
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

        <div className="mv-drawer-out">
          {member ? (
            <PortalLogout
              className="nav-item mv-drawer-logout"
              onDone={onClose}
            />
          ) : (
            <Link
              href="/login"
              className="nav-item mv-drawer-logout mv-drawer-signin"
              onClick={onClose}
            >
              {/* No `.nav-ico` wrapper, unlike the rows above: the Log out
                  button this slot swaps with renders its icon bare, and the two
                  have to sit on the same left edge. */}
              <PortalIcon name="logout" />
              Sign in
            </Link>
          )}
        </div>

        <div className="mv-drawer-demo">{demoDisclosure.drawer}</div>
      </div>
    </div>
  );
}
