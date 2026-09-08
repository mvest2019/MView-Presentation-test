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

/** `$99.95` / `$999.50` — plan prices DO carry cents, unlike lease values. */
export function planPrice(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

/**
 * STEP 2's "WHAT YOU'LL UNLOCK" CARD — a preview, and labelled as one.
 *
 * It sits beside three candidate records whose values are deliberately withheld,
 * so it has to be unmistakably about the PRODUCT rather than about any of the
 * three: a reader who mistook it for candidate 1's figure would be reading a
 * number that is not theirs. Hence "sample details" and a modelled range rather
 * than a single confident figure.
 */
export const unlockPreview = {
  yearlyValue: 41270,
  rangeLow: 32000,
  rangeHigh: 56400,
  samples: [
    { name: "Alameda Ranch", producing: true },
    { name: "Bluestem 3H", producing: true },
    { name: "Caddo Creek", producing: false },
  ],
  /*
   * TWO LINES, NOT ONE SENTENCE. This was a single run-on string joined by
   * middots, which read as one long clause and buried the second half. Split, it
   * is a list of what actually lands in the inbox — and the card renders each
   * with its own tick.
   */
  weekly: [
    "Production postings · permits within 1 mile",
    "Operator news · a Saturday plain-English report",
  ],
} as const;
