/**
 * WHAT THE FREE ACCOUNT SEES, AND WHAT THE PAID ONES DO.
 *
 * Step 5 is a paywall, and the one thing it must never imply is that an unseen
 * lease is a lost lease. So the cap is expressed as VISIBILITY and nothing
 * else: every lease stays joined to the record, counted in every total on step
 * 4, and reversible from Settings without re-claiming. The wording below is
 * load-bearing for that, which is why it lives here rather than inline.
 */

export interface ClaimPlan {
  name: string;
  /** How many leases render in full. */
  visibleLeases: number;
  monthly: number;
  /** Premium's annual option; Essentials is monthly only in the design. */
  yearly?: number;
}

export const freeVisibleLeases = 1;

export const claimPlans: ClaimPlan[] = [
  { name: "Essentials", visibleLeases: 5, monthly: 49.95 },
  { name: "Premium", visibleLeases: 10, monthly: 99.95, yearly: 999.5 },
];
