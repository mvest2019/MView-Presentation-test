/**
 * THE PORTAL'S STATE CLASSES, NAMED ONCE.
 *
 * These are `portal.css`'s own class names and they stay class names — see
 * `portal-ui.md` for why the density and funnel gates are not reimplemented in
 * React. What they should not be is thirty bare string literals scattered
 * through a module, where a typo (`tier-u` for `tier-d`) is invisible: a
 * misspelled gate class does not error, it just silently shows an element in
 * every density.
 *
 * Naming them here gives them one definition, a doc comment each, and — because
 * `PortalGate` is a union of the real keys — a compile error instead of a
 * mystery when one is misspelled.
 */

/** Density tiers, in the order the switch presents them. */
export const portalGate = {
  /** Essentials only. The plain-English tier. */
  essentialsOnly: "tier-s",
  /** Detailed only. */
  detailedOnly: "tier-d",
  /** Professional only — the extra table columns and the raw figures. */
  professionalOnly: "tier-p",
  /** Ultra only. One headline, one status line, one action. */
  ultraOnly: "tier-u",
  /** Everything EXCEPT Essentials. The dense furniture a plain reader skips. */
  hideInEssentials: "hide-s",
  /** Everything EXCEPT Ultra. */
  hideInUltra: "hide-u",
  /** Unclaimed record only. */
  unclaimedOnly: "nc-only",
  /**
   * Marks the unclaimed panel that REPLACES the page rather than topping it.
   * Always used together with `unclaimedOnly`.
   */
  unclaimedSwap: "nc-swap",
  /**
   * A money figure that is blurred while the record is claimed but unpaid.
   * Opt-in per element, so every locked value is a deliberate one.
   */
  lockedValue: "cl-lock",
  /**
   * THE PAGE ROOT. `portal.css` selects DIRECT CHILDREN of this element for
   * both the unclaimed swap and the Ultra page replacement, so a module's
   * top-level sections must be its direct children or neither gate reaches
   * them.
   */
  pageRoot: "mv-dash-routes",
} as const;

export type PortalGate = keyof typeof portalGate;

/**
 * `gates("hideInEssentials", "professionalOnly")` -> `"hide-s tier-p"`.
 *
 * For the common case of two or three gates on one element, so call sites read
 * as intent (`gates("hideInUltra")`) rather than as CSS.
 */
export function gates(...keys: PortalGate[]): string {
  return keys.map((key) => portalGate[key]).join(" ");
}
