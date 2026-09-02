/**
 * THE SAME SENTENCE, WRITTEN FOUR WAYS — one per density tier.
 *
 * ── THIS IS A MECHANISM I MISSED, AND IT IS WORTH SAYING WHERE ──
 *
 * The portal's density tiers do not only show and hide things. Certain strings
 * are REWRITTEN per tier, and that is done in JavaScript rather than in CSS, so
 * an audit of `portal.css` and `mvfunnelstates.css` finds no trace of it. The
 * prototype's engine is `mvApplyCopy(tier)`:
 *
 *   var k = tier === 'ultra' ? 'u' : tier === 'simple' ? 's'
 *         : tier === 'detailed' ? 'd' : 'p';
 *   document.querySelectorAll('[data-copy]') … el.textContent = MV_COPY[key][k]
 *
 * So every element carrying `data-copy="claim.cta"` says "Find my land" at Ultra
 * and "Claim owner record · free, no obligation, no ownership transfer" at
 * Professional — the same button, four registers. The markup ships ONE of the
 * four (usually the Detailed one), which is why a conversion that reads only the
 * HTML gets a button that never changes.
 *
 * ── WHY IT IS DATA HERE, AND RENDERED WITHOUT JAVASCRIPT ──
 *
 * `TierCopy` renders all four variants and lets the tier gates in `portal.css`
 * show exactly one — the same no-JavaScript approach the rest of the portal uses
 * for density. Nothing is measured, nothing flashes the wrong register on first
 * paint, and it works with JavaScript off.
 *
 * ── THE SEVEN KEYS BELOW ARE THE ONES ACTUALLY USED ──
 *
 * The prototype's dictionary defines seventeen; ten of them (`alerts.*`, `act.*`,
 * `wr.*`, `unit.prod`, `kpi.income.sub`) have no `data-copy` element anywhere in
 * `v42.html` and are dead. These seven are the live ones, with their call sites:
 *
 *   claim.cta      6 elements — the claim rail and every sample footer CTA
 *   kpi.income     the dashboard's income KPI label
 *   kpi.value      the dashboard's portfolio-value KPI label
 *   kpi.leases     the dashboard's lease-count KPI label
 *   kpi.activity   the dashboard's nearby-activity KPI label
 *   kpi.gross      a gross-production label
 *   audit.title    the Lease Audit heading
 *
 * ⚠ ONLY `claim.cta` IS WIRED SO FAR. The five dashboard KPI labels and
 * `audit.title` still render one fixed register. Those live on screens outside
 * the leases module; the strings are here so wiring them is a one-line change
 * per call site rather than another trip through the prototype.
 */

export interface TierCopyVariants {
  /** Ultra — the calmest register. Plain words, no jargon, no qualifiers. */
  ultra: string;
  /** Essentials — plain English, one qualifier at most. */
  essentials: string;
  /** Detailed — the register the prototype's markup usually ships. */
  detailed: string;
  /** Professional — precise, and unafraid of a unit or a method name. */
  professional: string;
}

/** Extracted verbatim from `MV_COPY` in `owner/v42.html`. */
export const portalCopy = {
  "claim.cta": {
    ultra: "Find my land",
    essentials: "Claim your record — free",
    detailed: "Claim your record — free, no obligation",
    professional:
      "Claim owner record · free, no obligation, no ownership transfer",
  },
  "kpi.income": {
    ultra: "Money your minerals earned",
    essentials: "Your share of the income",
    detailed: "Owner-share income · June",
    professional: "Owner-share income · Jun 2026 (net revenue interest)",
  },
  "kpi.gross": {
    ultra: "How much the whole well produced",
    essentials: "What the well produced (everyone’s share)",
    detailed: "Gross unit production — before your share is worked out",
    professional: "Gross unit production · 8/8ths, pre-royalty allocation",
  },
  "kpi.value": {
    ultra: "What your minerals are worth",
    essentials: "Estimated value of your minerals",
    detailed: "Estimated portfolio value — six-year owner-share model",
    professional:
      "Est. portfolio value · 6-yr PV owner-share, spot-linked — not an appraisal",
  },
  "kpi.leases": {
    ultra: "How many pieces of land you own under",
    essentials: "Leases on your record",
    detailed: "Leases on the record · producing and inactive",
    professional: "Leases on record · RRC lease-level, incl. inactive",
  },
  "kpi.activity": {
    ultra: "New things happening near you",
    essentials: "New activity nearby",
    detailed: "New activity within one mile of your acreage",
    professional:
      "New activity · permits + completions, 1-mi radius of unit boundary",
  },
  "audit.title": {
    ultra: "Check I am being paid right",
    essentials: "Lease Audit — are you being paid correctly?",
    detailed:
      "Lease Audit — compares the public production record against your statements",
    professional:
      "Lease Audit · reconciles filed PR volumes × decimal interest against remitted statement detail",
  },
} as const satisfies Record<string, TierCopyVariants>;

export type PortalCopyKey = keyof typeof portalCopy;
