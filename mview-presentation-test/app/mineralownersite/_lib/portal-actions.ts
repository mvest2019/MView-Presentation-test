/**
 * "WHAT DO YOU WANT TO DO NEXT?" — the per-route action sets.
 *
 * Every portal route ends with the same card and a DIFFERENT three or four
 * actions, chosen for that screen. The prototype holds this as two objects —
 * `MV_ACTIONS` (the seven actions) and `MV_ACTION_SETS` (which route gets
 * which) — and appends the card at runtime. Both are ported verbatim.
 *
 * WHY THE SETS ARE WORTH PORTING RATHER THAN PICKING PER PAGE. They encode a
 * judgement about each screen: My Leases offers `upgrade` because that is where
 * a free owner sees how many leases they cannot open; a lease REPORT offers
 * `ask` instead, because by then the reader has one specific lease to ask their
 * operator about. Choosing four buttons per page by feel loses that.
 *
 * `built` IS THE HONEST BIT. One of the seven destinations exists in this build.
 * The rest render as labelled, inert affordances rather than links into a 404 —
 * the convention `portal-nav.ts` sets for the whole portal. When a module lands,
 * flip `built` and give it its `href`; nothing else changes.
 */

export type PortalActionId =
  | "watch"
  | "audit"
  | "ask"
  | "invite"
  | "upgrade"
  | "map"
  | "briefing";

export interface PortalAction {
  /** The button label, exactly as the design writes it. */
  label: string;
  /** The one-line explanation, which the design carries as a `title`. */
  hint: string;
  /** Where it goes, or undefined while that module is unbuilt. */
  href?: string;
}

export const portalActions: Record<PortalActionId, PortalAction> = {
  audit: {
    label: "✓ Run my Lease Audit",
    hint: "Compare production to your check stubs",
    /* The one built destination — the marketing Lease Audit route. The
       prototype's `#/app/audit?mode=upload` is the in-portal flow, which is not
       built; this is the same product, one step earlier. */
    href: "/lease-audit",
  },
  watch: {
    label: "Watch this",
    hint: "Add to your weekly briefing watch list",
  },
  ask: {
    label: "Ask my operator",
    hint: "Draft a question with your co-owners",
  },
  invite: {
    label: "Invite a co-owner",
    hint: "Split costs, compare notes — privately",
  },
  upgrade: {
    label: "Upgrade my plan",
    hint: "See more leases + mailed report",
  },
  map: {
    label: "See it on the map",
    hint: "Your leases and the activity around them",
  },
  briefing: {
    label: "Read this week",
    hint: "Your four questions, answered",
  },
};

/**
 * Which actions each route offers. Keys are the prototype's own route names, so
 * this table can be read straight against `MV_ACTION_SETS` in `owner/v42.html`.
 *
 * Only the routes this build has are listed; the prototype's table covers
 * fourteen. Add a row when its route lands.
 */
export const portalActionSets = {
  /** The Dashboard. */
  app: ["watch", "audit", "briefing", "invite"],
  /** My Leases — `upgrade` because this is where a free owner counts what they cannot open. */
  "app-leases": ["audit", "watch", "map", "upgrade"],
  /**
   * Alerts — THREE, not four, and no `upgrade`. The inbox's job is retention,
   * not conversion (OW-32), and the design's own set says so: the reader has
   * just been told most days are quiet, so the page closes by offering the
   * audit, the watch list and the map, and asks for nothing.
   */
  "app-alerts": ["audit", "watch", "map"],
  /** A fully captured lease report — `ask` because there is now one lease to ask about. */
  "app-lease-detail": ["audit", "ask", "watch", "invite"],
  /** A lease with no captured curve — three actions, not four. */
  "app-lease-generic": ["audit", "watch", "map"],
} as const satisfies Record<string, readonly PortalActionId[]>;

export type PortalActionSetKey = keyof typeof portalActionSets;
