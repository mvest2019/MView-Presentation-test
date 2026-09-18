import {
  COMPARE_ROWS,
  PLANS as PRICING_PLANS,
  type Plan as PricingPlan,
} from "@/app/pricing/_components/pricing-content";
/* THE CREDIT BALANCE AND ITS LEDGER ARE SHARED, not this page's own. Profile
   shows the balance too, and `profile/page.tsx` warns in its own header against
   a page carrying "a second, staler answer" to something another page owns.
   One module, three readers — see `_lib/referral-credits.ts`. */
import { BALANCE, LEDGER, type LedgerEntry } from "@/app/mineralownersite/_lib/referral-credits";

/**
 * BILLING & PLAN — where every figure on the page comes from.
 *
 * ── THE PRICES ARE NOT WRITTEN HERE, AND THAT IS THE POINT ──
 *
 * `app/pricing/_components/pricing-content.ts` is this repo's pricing ladder.
 * Its own header records why it is the single source: the plan cards, the
 * comparison table and the plan-by-plan detail on `/pricing` all read from it
 * so "they cannot disagree about a figure". A billing page that carried its own
 * copy would be the fourth reader and the first one able to drift.
 *
 * IT ALREADY HAD. This page was first built from the demo build's billing
 * screen, which is an older revision of the ladder, and the two disagreed on
 * every line that matters:
 *
 *                         demo screen        pricing-content (2026-09-14)
 *   middle tier           "Essentials"       **Pro**
 *   middle monthly        $49.95             **$49.99**
 *   middle annual         $499.50            **$499.90**
 *   Premium monthly       $99.95             **$99.99**
 *   Premium annual        $999.50            **$999.90**
 *   Premium capacity      10 leases          **2 records × 10 = 20 leases**
 *   add-on lease          —                  **$1.99/mo · $19.90/yr, Premium only**
 *   annual framing        "two months free"  **pay 10 months, get 12**
 *
 * The revision note in that file is explicit that the annual prices are exactly
 * ten times monthly — "$499.90 and $999.90, not the design's $499.99/$999.99" —
 * so the demo's $499.50/$999.50 are two revisions behind. Everything below
 * reads the live ladder, so the next revision reaches this page for free.
 *
 * ── WHAT IS STILL A FIXTURE, AND WHY ──
 *
 * Everything that is about THIS ACCOUNT rather than about the plans: which term
 * it is in, which invoices it has paid, what credit it holds, what the year
 * bought. None of that is in `Payload`, which describes an owner's minerals,
 * and there is no billing service to ask — see `BILLING_API.md` in this folder
 * for the endpoints this page needs and the shape each one should return. The
 * fixture below is that shape, so wiring it is replacing these constants with a
 * fetch.
 *
 * ── THE PRICES ARE STILL NOT AN OFFER ──
 *
 * `/pricing` and the FAQ both carry "all pricing is illustrative for design
 * review — not yet an offer", so the chip on this page stays until that
 * sentence comes off those pages too. Reading the real ladder makes the figures
 * CONSISTENT; it does not make them contractual.
 */

/* ------------------------------------------------------------------ plans */

/** which of the canonical plans this account is on */
export const CURRENT_PLAN_ID = "premium" as const;

/**
 * The per-tier lines that belong to BILLING rather than to pricing — what
 * moving to this plan would do to the reader's own record. `/pricing` sells the
 * ladder to a stranger; this page tells somebody already on it what changes.
 * The capacities inside them are read from the ladder, never retyped.
 */
const planFor = (id: string): PricingPlan => {
  const plan = PRICING_PLANS.find((p) => p.id === id);
  /* A LOUD FAILURE, NOT A QUIET ONE. If the ladder renames a tier, this page
     should stop building rather than render a card with no price in it. */
  if (!plan) throw new Error(`billing: no plan "${id}" in pricing-content`);
  return plan;
};

/** total lease capacity, off the ladder's own access rows */
const capacityOf = (plan: PricingPlan): string =>
  plan.access.find((row) => row.label === "Total capacity")?.mo ?? "—";

export interface PlanTier {
  key: string;
  name: string;
  price: string;
  priceNote: string | null;
  summary: string;
  points: { text: string; no?: boolean }[];
  cta: { label: string; href?: string; future?: boolean };
  current?: boolean;
}

/** the reader's own leases, which is what the "would lock" lines count against */
const MY_LEASES = 10;

export const PLANS: PlanTier[] = [
  {
    key: "free",
    name: planFor("free").name,
    price: planFor("free").priceMo,
    priceNote: planFor("free").periodMo,
    summary: `1 owner record · **${capacityOf(planFor("free"))} visible lease**`,
    points: [
      { text: "Owner map + weekly report (headline + your 1 lease)" },
      { text: `${MY_LEASES - 1} of your leases would lock`, no: true },
      { text: "No monthly mailed report · no included audits", no: true },
    ],
    cta: { label: "Downgrades at end of term", future: true },
  },
  {
    key: "pro",
    name: planFor("pro").name,
    price: planFor("pro").priceMo,
    priceNote: `${planFor("pro").periodMo} · or ${planFor("pro").priceYr}/yr · 12-mo term`,
    summary: `Up to **${capacityOf(planFor("pro"))} visible leases** — a lower tier than your Premium`,
    points: [
      { text: "Full weekly report on your 5 visible leases" },
      { text: "Portfolio CSV + PDF exports" },
      { text: "Dossier-aware AI assistant" },
      { text: `${MY_LEASES - 5} of your ${MY_LEASES} leases would lock`, no: true },
      { text: "No monthly mailed report · no included audits", no: true },
    ],
    cta: { label: "Switch to Pro at end of term", future: true },
  },
  {
    key: "premium",
    name: planFor("premium").name,
    price: planFor("premium").priceMo,
    priceNote: `${planFor("premium").periodMo} · or ${planFor("premium").priceYr}/yr — pay 10 months, get 12`,
    summary:
      `**2 owner records, 10 leases each** — ${capacityOf(planFor("premium"))} ` +
      "leases of capacity, plus the mailed report and the vault",
    points: [
      { text: "Everything in Pro" },
      {
        text:
          "**3 Lease Audits per term year, on 3 leases** — $500 each bought " +
          "separately, so $1,500 of value · 3 of 3 unused",
      },
      { text: "**Monthly** production report — printed and mailed" },
      { text: "Extended history + advanced charts" },
      { text: "Private document vault" },
      {
        text:
          `**Add-on lease ${planFor("premium").access.find((r) => r.label === "Add-on lease")?.mo}** ` +
          `or ${planFor("premium").access.find((r) => r.label === "Add-on lease")?.yr} — the only plan that has one`,
      },
    ],
    cta: { label: "Current plan", future: true },
    current: true,
  },
  {
    key: "enterprise",
    name: planFor("enterprise").name,
    price: planFor("enterprise").priceMo,
    priceNote: null,
    summary: "Entities, trusts, multi-owner families, advisors — **3 or more records**",
    points: [
      { text: "All leases per record" },
      { text: "SSO, roles, audit trail" },
      { text: "No self-checkout", no: true },
    ],
    cta: { label: "Talk to Mineral View", href: "/contact-us" },
  },
];

/* ---------------------------------------------------- the comparison table */

/**
 * A SUBSET OF `/pricing`'s OWN MATRIX, not a second matrix.
 *
 * `COMPARE_ROWS` carries 26 rows across six groups, which is the right answer
 * for a page whose whole job is the ladder. This page is not that page — it
 * ends on "Full pricing page →" — so it shows the rows a reader weighs when
 * deciding whether to keep, change or drop the plan they are already paying
 * for, and links out for the rest.
 *
 * SELECTED BY LABEL, AND A MISSING LABEL THROWS. If `/pricing` renames a row
 * this page stops building rather than quietly dropping it, which is the same
 * rule `planFor` follows and for the same reason: silence is how a billing page
 * ends up one revision behind.
 */
const BILLING_ROWS = [
  "Monthly price",
  "Yearly price",
  "Twelve months, paid monthly",
  "Cost per lease",
  "Commitment",
  "Owner records you can claim",
  "Leases per record",
] as const;

export interface CompareCell {
  value: string;
  sub?: string;
  strong?: boolean;
}
export interface CompareRow {
  label: string;
  note?: string;
  cells: CompareCell[];
}

/** which column of `COMPARE` is the reader's — Free · Pro · Premium · Enterprise */
export const MINE_COLUMN = 2;

export const TIER_HEADS = [
  planFor("free").name,
  planFor("pro").name,
  `${planFor("premium").name} — yours`,
  planFor("enterprise").name,
];

export const COMPARE: CompareRow[] = BILLING_ROWS.map((label) => {
  const row = COMPARE_ROWS.find((r) => r.kind === "row" && r.label === label);
  if (!row || row.kind !== "row") {
    throw new Error(`billing: no comparison row "${label}" in pricing-content`);
  }
  return {
    label: row.label,
    note: row.note || undefined,
    cells: row.cells.map((value, i) => ({ value, strong: i === MINE_COLUMN })),
  };
});

/**
 * THE ROWS THIS PAGE ADDS, which are about the SERVICE rather than the ladder
 * and so have no row in `/pricing`'s matrix. They are appended rather than
 * interleaved so it stays obvious which half came from where.
 */
export const COMPARE_EXTRA: CompareRow[] = [
  {
    label: "Monthly production report — printed and mailed",
    cells: [
      { value: "—" },
      { value: "—" },
      { value: "✓", strong: true },
      { value: "✓" },
    ],
  },
  {
    label: "Private document vault",
    cells: [
      { value: "—" },
      { value: "—" },
      { value: "✓", strong: true },
      { value: "✓" },
    ],
  },
  {
    label: "Lease Audits included",
    note: "— $500 per audit on any plan",
    cells: [
      { value: "—" },
      { value: "—" },
      { value: "3 / term year, on 3 leases", sub: "$1,500 of value", strong: true },
      { value: "custom" },
    ],
  },
];

/* ============================================================================
   BELOW THIS LINE IS ACCOUNT STATE — the fixture the API replaces.
   See BILLING_API.md in this folder.
   ========================================================================= */

export interface ReviewStat {
  label: string;
  value: string;
  sub: string;
}

export const YEAR_REVIEW: ReviewStat[] = [
  { label: "Leases watched daily", value: "10", sub: "every posting, permit & status change" },
  { label: "Alerts sent", value: "18", sub: "each one a real event — never noise" },
  {
    label: "Production changes flagged",
    value: "2",
    sub: "incl. the Ledbetter produced-months question",
  },
  { label: "Weekly briefings prepared", value: "12", sub: "since your term began" },
  {
    label: "Lease Audits included this term",
    value: "3",
    sub: "on 3 leases · $1,500 of value · none run yet",
  },
  { label: "Referral credits earned", value: "$100.00", sub: "auto-applies to your renewal" },
];

export interface Invoice {
  id: string;
  title: string;
  processor: string;
  period: string;
  amount: string;
  status: string;
}

/** the amounts are the ladder's, so an invoice cannot quote a price the plan does not charge */
export const INVOICES: Invoice[] = [
  {
    id: "jul-2026",
    title: `${planFor("premium").name} — monthly`,
    processor: "Braintree (PayPal) · card ending 4242",
    period: "Jul 2026 · month 3 of 12",
    amount: planFor("premium").priceMo,
    status: "Paid",
  },
  {
    id: "jun-2026",
    title: `${planFor("pro").name} → ${planFor("premium").name} upgrade — prorated`,
    processor: "Braintree (PayPal)",
    period: "Jun 2026",
    amount: "$50.00",
    status: "Paid",
  },
  {
    id: "may-2026",
    title: `${planFor("pro").name} — monthly`,
    processor: "Braintree (PayPal)",
    period: "May 2026 · month 1 of 12",
    amount: planFor("pro").priceMo,
    status: "Paid",
  },
];

export interface TermStep {
  title: string;
  detail: string;
  quiet?: boolean;
}

export const TERM_STEPS: TermStep[] = [
  { title: "Checkout", detail: "monthly billing · charges stop at end of term" },
  { title: "Mid-term upgrade ✓", detail: "prorated difference only · effective immediately" },
  { title: "Before end of term", detail: "never a surprise charge" },
  {
    title: "End of term",
    detail: "no auto-renew · account reverts to Free · data kept",
    quiet: true,
  },
];

export const TERM_STEP_TAILS = [
  ` — your 1-year term started on ${planFor("pro").name} (May 2026)`,
  ` — you moved to ${planFor("premium").name} in Jun 2026`,
  " — we send reminders",
  " — billing stops automatically",
];

export { LEDGER };
export type { LedgerEntry };

export const TERM_END_CHOICES = [
  {
    key: "renew",
    title: `Renew ${planFor("premium").name} for another 12-month term`,
    detail: "— one explicit click at term end · $100.00 credit auto-applies",
  },
  {
    key: "switch",
    title: "Switch plan at term end",
    detail:
      `— e.g. ${planFor("premium").name} → ${planFor("pro").name}; 5 of your ` +
      "10 leases would stay visible and you'd pick which five",
  },
  {
    key: "revert",
    title: "Do not renew — revert to Free at term end",
    detail: "— choose the 1 lease that stays visible below",
  },
] as const;

export type TermEndChoice = (typeof TERM_END_CHOICES)[number]["key"];

export const KEEP_LEASES = [
  { key: "smith", label: "Smith Gas Unit (305892) — your largest", suggested: true },
  { key: "ledbetter", label: "Ledbetter (74318) — your deep-dive lease" },
  { key: "cedar", label: "Cedar Bend (578204)" },
];

const premium = planFor("premium");

export const ACCOUNT = {
  planName: premium.name,
  headline: `${premium.name} plan · monthly billing · all ${MY_LEASES} of your leases visible`,
  termLine:
    `month 3 of a 12-month term · all ${MY_LEASES} of your leases visible on ` +
    "1 of your 2 owner records · 3 of 3 Lease Audits unused this term year · " +
    "never auto-renews",
  monthlyPrice: `${premium.priceMo}/mo`,
  annualPrice: `${premium.priceYr}/yr`,
  creditBalance: BALANCE,
  termEndDate: "May 12, 2027",
  otherLeaseCount: 7,
  /** the renewal example's arithmetic, so the three figures cannot disagree */
  renewalExample: {
    annual: premium.priceYr,
    credit: BALANCE,
    payable: "$899.90",
  },
} as const;

export const MVESTIMATE_DEF =
  "MVestimate — Mineral View's modeled estimate of what your minerals could be " +
  "worth: production history × decline curve × recent prices × your decimal " +
  "interest. An estimate, never an appraisal.";
