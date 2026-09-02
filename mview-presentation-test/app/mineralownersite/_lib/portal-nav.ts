/**
 * The portal's navigation — sidebar, mobile drawer, bottom tab bar and the
 * account menu, as data.
 *
 * EXTRACTED, NOT AUTHORED. Labels, ordering, section headings, icons and badge
 * counts are the reference build's, from `owner/src/shell/chunk-004.html` (the
 * desktop sidebar and top bar), `chunk-005.html` (the drawer and tab bar) and
 * `v33css.css` (the two swapping top slots). The prototype is a hash-router
 * single file, so its `#/app/...` hrefs are translated to the App Router paths
 * those modules will occupy under `/mineralownersite`.
 *
 * TWO DIFFERENT KINDS OF "NOT AVAILABLE" LIVE IN THIS FILE. Keeping them apart
 * matters, because they are decided by different things and they must never be
 * allowed to look the same:
 *
 *   `href: undefined`  THE MODULE IS NOT BUILT YET. A build fact. This task
 *                      ships the Dashboard only, so every other row has no
 *                      destination and renders as a plain label rather than a
 *                      link into a 404 — the same convention `site-nav.ts`
 *                      already uses for the Explore menu's `/data/*` entries.
 *                      Give the row its `href` when its page lands; nothing
 *                      else has to change.
 *
 *   `state` gating     THE ACCOUNT MAY NOT SEE IT. A product rule, owned by
 *                      `portal-state.ts` and applied in CSS by `portal.css`.
 *                      Only the two swapping top slots use it here.
 *
 * The first is temporary scaffolding and says "not yet". The second is the
 * design's funnel and says "not for you, here is how". They are deliberately
 * not merged behind one flag.
 */

import type { FunnelState } from "./portal-state";

/** The icons the portal uses, by the reference's own `mvi-*` sprite ids. */
export type PortalIconName =
  | "home"
  | "bell"
  | "leases"
  | "map"
  | "activity"
  | "mail"
  | "user"
  | "audit"
  | "groups"
  | "invite"
  | "settings"
  | "billing"
  | "claim"
  | "back"
  | "trend"
  | "lock";

export interface PortalNavItem {
  /** The visible label. Literal text — never an icon-only row. */
  label: string;
  icon: PortalIconName;
  /**
   * Where the row goes, or `undefined` while its module is unbuilt. See the
   * header: this is a build fact, not a plan gate.
   */
  href?: string;
  /**
   * The reference's `data-nav` value, which is what marks the active row. Kept
   * even for unbuilt rows so the active-state logic does not need a second
   * source of truth later.
   */
  navKey: string;
  /** An unread count rendered as a pill on the right of the row. */
  badge?: number;
}

export interface PortalNavSection {
  /** The `.navsec` heading above the group. */
  heading: string;
  items: PortalNavItem[];
}

/* ============================================================================
   THE TWO SWAPPING TOP SLOTS

   v33 · M36 — "Claim Mineral Owner" is the most important action while the
   record is UNCLAIMED.
   v37 · D1 (Ryan) — once the owner has claimed, that slot becomes a useful
   action instead: Run a Lease Audit. Claiming another record still lives under
   Switch Owner -> add another, so nothing is lost by the swap.

   Both rows are always in the markup; `portal.css` decides which one shows, so
   the swap costs no JavaScript and cannot flash the wrong one on first paint.
   ============================================================================ */

export interface PortalPrimarySlot extends PortalNavItem {
  /** The reference's own class, which carries the slot's distinct styling. */
  slotClass: "v33-claimnav" | "v37-auditnav";
  /** Which funnel states this slot is for. */
  states: readonly FunnelState[];
}

export const primarySlots: PortalPrimarySlot[] = [
  {
    label: "Claim Mineral Owner",
    icon: "claim",
    // The claim flow is a marketing route and it is already built, so this one
    // row genuinely goes somewhere.
    href: "/claim",
    navKey: "claim",
    slotClass: "v33-claimnav",
    states: ["unclaimed"],
  },
  {
    label: "Run a Lease Audit",
    icon: "audit",
    navKey: "app-audit",
    slotClass: "v37-auditnav",
    states: ["claimed", "trial", "lapsed", "paid"],
  },
];

/* ============================================================================
   THE SIDEBAR SECTIONS

   Three headings, in this order. "My Minerals" is the owner's own record;
   "Services" is what Mineral View does for them; "Community" is the other
   owners. Account items are deliberately absent — see `accountMenu` below.
   ============================================================================ */

export const navSections: PortalNavSection[] = [
  {
    heading: "My Minerals",
    items: [
      {
        label: "Dashboard",
        icon: "home",
        href: "/mineralownersite",
        navKey: "app",
      },
      // The badge is the reference's own count for the demo record: 9 alerts
      // since the last visit, 6 of them unread.
      { label: "Alerts", icon: "bell", navKey: "app-alerts", badge: 6 },
      // The module itself is not built. The row is a real link anyway, to a
      // placeholder page that says so — a dimmed, unclickable row left an owner
      // unable to tell "not open yet" from "my click did nothing".
      {
        label: "My Leases",
        icon: "leases",
        href: "/mineralownersite/leases",
        navKey: "app-leases",
      },
      { label: "Map", icon: "map", navKey: "app-map" },
      {
        label: "Activities",
        icon: "activity",
        href: "/mineralownersite/activities",
        navKey: "app-activities",
      },
      {
        label: "Weekly Report",
        icon: "mail",
        href: "/mineralownersite/briefing",
        navKey: "app-briefing",
      },
      {
        label: "Production & Forecast",
        icon: "trend",
        navKey: "app-production",
      },
    ],
  },
  {
    heading: "Services",
    items: [{ label: "Lease Audit", icon: "audit", navKey: "app-audit" }],
  },
  {
    heading: "Community",
    items: [
      { label: "Groups", icon: "groups", navKey: "app-groups" },
      { label: "Invite Co-Owners", icon: "invite", navKey: "app-invite" },
    ],
  },
];

/* ============================================================================
   THE ACCOUNT MENU  (v41 · AUDIT #35, Ryan)

   "Sidebar simplified — My Profile, Settings, Billing & Plan and Contact Us
   moved to the top-right avatar menu where users expect account items."

   The sidebar carries a line pointing at this menu, so an owner who looks for
   Settings in the old place is told where it went rather than finding nothing.
   ============================================================================ */

export const accountMenu: PortalNavItem[] = [
  { label: "My Profile", icon: "user", navKey: "app-dossier" },
  { label: "Settings", icon: "settings", navKey: "app-settings" },
  { label: "Billing & Plan", icon: "billing", navKey: "app-billing" },
  // Contact is a marketing route and exists. The reference points at `#/contact`;
  // this build's equivalent is `/contact-us`.
  {
    label: "Contact Us",
    icon: "mail",
    href: "/contact-us",
    navKey: "contact",
  },
];

/* ============================================================================
   THE MOBILE BOTTOM TAB BAR

   Five slots, the design's own five: Home · Leases · Map · Activity · Profile.
   Short labels, because the row is 10px type at phone width. Deliberately NOT
   the sidebar's list — a tab bar is the four or five places a thumb goes, and
   the drawer behind the hamburger carries everything else.
   ============================================================================ */

export const tabBar: PortalNavItem[] = [
  { label: "Home", icon: "home", href: "/mineralownersite", navKey: "app" },
  {
    label: "Leases",
    icon: "leases",
    href: "/mineralownersite/leases",
    navKey: "app-leases",
  },
  { label: "Map", icon: "map", navKey: "app-map" },
  {
    label: "Activity",
    icon: "activity",
    href: "/mineralownersite/activities",
    navKey: "app-activities",
  },
  { label: "Profile", icon: "user", navKey: "app-dossier" },
];

/* ============================================================================
   THE MOBILE DRAWER

   v33 · A/mobile — the drawer MIRRORS the desktop sidebar: a Close (X), a
   prominent Claim entry, and the same labelled sections with spacing. It was
   one undifferentiated list before, which is the defect that note records.

   It differs from the sidebar in exactly one way, and on purpose: it carries an
   Account section, because there is no avatar menu at phone width for those
   four items to live in.
   ============================================================================ */

export const drawerSections: PortalNavSection[] = [
  ...navSections,
  {
    heading: "Account",
    items: [
      { label: "Settings", icon: "settings", navKey: "app-settings" },
      { label: "Billing & Plan", icon: "billing", navKey: "app-billing" },
    ],
  },
];

/**
 * What the top bar's `.pagename` reads on a given path.
 *
 * Derived from the nav data rather than kept as a second list, so a module that
 * gains its `href` here gains its page name at the same moment. The fallback is
 * the Dashboard's name because `/mineralownersite` is the portal's index.
 */
export function pageNameForPath(pathname: string): string {
  for (const section of navSections) {
    for (const item of section.items) {
      if (item.href && isNavItemActive(item.href, pathname)) return item.label;
    }
  }
  return "Dashboard";
}

/**
 * Which sidebar row is the current one.
 *
 * Exact match for the dashboard, prefix match for everything below it, so a
 * lease detail page still lights My Leases when those modules land. `/` would
 * otherwise prefix-match every route, which is why the root case is separate.
 */
export function isNavItemActive(
  itemHref: string | undefined,
  pathname: string,
): boolean {
  if (!itemHref) return false;
  if (itemHref === "/mineralownersite") return pathname === "/mineralownersite";
  return pathname === itemHref || pathname.startsWith(`${itemHref}/`);
}
