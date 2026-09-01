/**
 * THE PORTAL'S TWO GATING AXES — keys, labels and storage, in one place.
 *
 * EXTRACTED, NOT AUTHORED. Every key, class name, label string and storage key
 * below is the reference build's own, from `owner/src/scripts/route-groups.js`
 * (`MV_FUNNEL_STATES`, `MV_FUNNEL_LABEL`, `MV_FUNNEL_PLAN`, `mvSetFunnelState`,
 * `setViewTier`, `initViewTier`, `TIER_TOAST`) and the CSS contract in
 * `mvfunnelstates.css`. Nothing here is invented — if a level or a label looks
 * wrong it is wrong in the design.
 *
 * THE TWO AXES ARE ORTHOGONAL, and confusing them is the design's most-repeated
 * warning:
 *
 *   FUNNEL STATE  what the account IS — and therefore what it may see.
 *                 Plan names are Free · Premium trial · Premium.
 *
 *   VIEW TIER     how DENSELY the owner reads — a display preference, nothing
 *                 more. Names are Ultra · Essentials · Detailed · Professional.
 *
 * "Professional" is a VIEW DENSITY, never a plan. The reference records a copy
 * defect where the trial called itself a "Pro trial" and the word came back as
 * a plan level; the note there reads: plan names are Free / Essentials /
 * Premium, and "Pro"/"Professional" must never return as one. The same trap
 * runs the other way — "Ultra Detailed" is not a level either; Ultra and
 * Detailed are two separate tiers on this axis.
 */

/* ============================================================================
   AXIS 1 · THE FIVE OWNER FUNNEL STATES
   ============================================================================ */

/**
 * The funnel, in order. The demo cycler walks them in exactly this sequence
 * (`mvCycleFunnelState`), because that is the order an owner meets them:
 * unclaimed -> claimed -> trial -> lapsed -> paid.
 */
export const FUNNEL_STATES = [
  "unclaimed",
  "claimed",
  "trial",
  "lapsed",
  "paid",
] as const;

export type FunnelState = (typeof FUNNEL_STATES)[number];

/** The design's default, and the state a bad `?state=` value falls back to. */
export const DEFAULT_FUNNEL_STATE: FunnelState = "paid";

/**
 * The root class each state applies, and which the whole `.nc-* / .cl-* /
 * .tr-* / .lp-*` helper family in `portal.css` keys off.
 *
 * `unclaimed` maps to `no-claim` and NOT to `state-unclaimed`: the v9 no-claim
 * machinery came first and thirteen helper classes are named off it. Renaming
 * one end without the other is how a gate silently stops gating.
 */
export const FUNNEL_STATE_CLASS: Record<FunnelState, string> = {
  unclaimed: "no-claim",
  claimed: "state-claimed",
  trial: "state-trial",
  lapsed: "state-lapsed",
  paid: "state-paid",
};

/** The demo cycler's button label — `MV_FUNNEL_LABEL`, verbatim. */
export const FUNNEL_LABEL: Record<FunnelState, string> = {
  unclaimed: "Demo: not claimed",
  claimed: "Demo: free · claimed",
  trial: "Demo: Premium trial",
  lapsed: "Demo: trial ended",
  paid: "Demo: paid",
};

/**
 * What the plan pill and the sidebar foot say — `MV_FUNNEL_PLAN`, verbatim.
 * These are the plan names the owner reads: Free, Premium trial, Premium.
 */
export const FUNNEL_PLAN: Record<FunnelState, string> = {
  unclaimed: "Free · no claim yet",
  claimed: "Free · record claimed",
  trial: "Premium trial · 4 days left",
  lapsed: "Free · trial ended",
  paid: "Premium plan",
};

/**
 * The trial's length and the demo's position in it.
 *
 * Day 3 of 7 is deliberate: in production this comes from `trial_started_at` on
 * the subscription row, and it is pinned here to the moment that matters — the
 * point where the owner has seen value and the ask lands best.
 */
export const TRIAL_LENGTH_DAYS = 7;
export const TRIAL_DAY = 3;

/**
 * How often a lapsed owner may change which single lease stays live.
 *
 * Ryan's rule: once every seven days, so the choice carries weight and the
 * owner feels the cost of only having one.
 */
export const LEASE_LOCK_DAYS = 7;

/** Narrow an untrusted `?state=` value. Anything unknown falls back. */
export function toFunnelState(value: string | null | undefined): FunnelState {
  return FUNNEL_STATES.includes(value as FunnelState)
    ? (value as FunnelState)
    : DEFAULT_FUNNEL_STATE;
}

/**
 * `?state=noclaim` is the v9 deep link and still has to work — the reference
 * keeps the old boolean API and its links alive alongside the five-state one.
 */
export function normaliseStateParam(value: string | null | undefined): string {
  return value === "noclaim" ? "unclaimed" : (value ?? "");
}

/** The next state in the cycle, for the top bar's demo button. */
export function nextFunnelState(current: FunnelState): FunnelState {
  const index = FUNNEL_STATES.indexOf(current);
  return FUNNEL_STATES[(index + 1) % FUNNEL_STATES.length];
}

/* ============================================================================
   AXIS 2 · THE FOUR VIEW TIERS  (RV-03, the canonical engine)

   THE CONTRACT, all six clauses, from the reference's own header:
     1  KEYS       'ultra' | 'simple' | 'detailed' | 'pro' — internal only,
                   never rendered.
     2  NAMES      Ultra · Essentials · Detailed · Professional. The class stays
                   `.view-simple`; the word "Simple" must NEVER reach the UI —
                   it reads as derogatory about the reader, not the density.
     3  GRAMMAR    `view-<key>`, and 'ultra' ALSO carries `view-simple`, so
                   Ultra can only ever go further than Essentials, never
                   sideways.
     4  FALLBACK   unknown input -> 'simple'.
     5  DEEP LINK  `?view=<key>` honoured in the query string.
     6  A11Y       the switch is a real tablist: role=tab + aria-selected track
                   the choice.
   ============================================================================ */

export const VIEW_TIERS = ["ultra", "simple", "detailed", "pro"] as const;

export type ViewTier = (typeof VIEW_TIERS)[number];

/**
 * Clause 4. Essentials is the product default — plain language, just the three
 * to five things that matter — per the retention brief.
 */
export const DEFAULT_VIEW_TIER: ViewTier = "simple";

/** Clause 2 — the public names. The key `simple` reads "Essentials". */
export const VIEW_TIER_NAME: Record<ViewTier, string> = {
  ultra: "Ultra",
  simple: "Essentials",
  detailed: "Detailed",
  pro: "Professional",
};

/** The switch's `title` — what each density actually gives you. */
export const VIEW_TIER_HINT: Record<ViewTier, string> = {
  ultra: "Ultra-simple — one headline, one status, one button",
  simple: "Essentials — plain language, just the 3–5 things that matter",
  detailed: "Detailed — key numbers plus context and drill-downs",
  pro: "Professional — full tables, maximum density, exports",
};

/**
 * Clause 3. Ultra carries `view-simple` as well as `view-ultra` so every
 * `.hide-s` rule that fires for Essentials also fires for Ultra — the tiers
 * nest rather than sitting side by side.
 */
export function viewTierClasses(tier: ViewTier): string {
  return tier === "ultra" ? "view-ultra view-simple" : `view-${tier}`;
}

/** Clause 4 — narrow an untrusted `?view=` value or stored string. */
export function toViewTier(value: string | null | undefined): ViewTier {
  return VIEW_TIERS.includes(value as ViewTier)
    ? (value as ViewTier)
    : DEFAULT_VIEW_TIER;
}

/* ============================================================================
   STORAGE KEYS

   The reference's own `localStorage` keys, kept so a browser that has used the
   prototype carries its choice into this build instead of silently resetting.
   ============================================================================ */
export const STORAGE_KEYS = {
  /** The owner's chosen density. Survives sessions; a `?view=` link wins. */
  viewTier: "mv_view_tier",
  /** Which single lease a lapsed owner keeps live. */
  activeLease: "mv_active_lease",
  /** When that choice was made — the seven-day lock is measured from it. */
  activeLeaseSet: "mv_active_lease_set",
  /** Whether the getting-started checklist has been dismissed. */
  checklistHidden: "mv_checklist_hide",
} as const;

/* ============================================================================
   WHAT EACH STATE GRANTS

   The gate, stated once as data so no component has to re-derive it from a
   list of state names. Read `portal.css` for the visual half — this is the same
   rule in the form a component can ask a question of.
   ============================================================================ */

export interface StateAccess {
  /** Has the owner claimed a record? Everything real depends on this. */
  claimed: boolean;
  /**
   * May the MVestimate money figure be read in the clear?
   *
   * False in `claimed` (it is what Premium sells, and the reason to start the
   * trial) and in `lapsed` (an all-ten-lease figure, and one lease is live).
   * The design blurs rather than removes: the owner should see that there IS a
   * number, which is the ask.
   */
  showsEstimate: boolean;
  /** Is the funnel bar shown, and does the dashboard carry a state card? */
  showsFunnelBar: boolean;
  /** Does the owner hold Premium, by trial or by payment? */
  premium: boolean;
}

export function stateAccess(state: FunnelState): StateAccess {
  return {
    claimed: state !== "unclaimed",
    showsEstimate: state === "trial" || state === "paid",
    showsFunnelBar:
      state === "claimed" || state === "trial" || state === "lapsed",
    premium: state === "trial" || state === "paid",
  };
}

/* ============================================================================
   A NOTE ON WHAT THIS IS NOT

   None of this is an authorisation boundary, and it must not be mistaken for
   one. The gate is presentational — the same thing it is in the reference,
   which is a design mockup. A blurred figure is still in the DOM.

   `lib/session.ts` carries the same warning about the session cookie for the
   same reason. When the portal holds a figure that not every visitor may see,
   the value must be withheld SERVER-SIDE by an API that authorised the request,
   and this module goes back to being what it says it is: how the page reads.
   ============================================================================ */
