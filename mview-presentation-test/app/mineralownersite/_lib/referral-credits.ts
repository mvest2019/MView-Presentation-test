import { CREDIT } from "../(reference)/invite/_lib/invite-flow";

/**
 * REFERRAL CREDITS — one balance, one ledger, read by every page that shows it.
 *
 * ── WHY THIS MODULE EXISTS ──
 *
 * Three pages now talk about the same credit:
 *
 *   Invite    what one would be worth if you ticked these co-owners
 *   Billing   the ledger, the balance, and what it does at renewal
 *   Profile   the balance, and the way through to the other two
 *
 * `profile/page.tsx` carries an explicit warning against exactly this: it says
 * plan and capacity belong to Billing, and that "summarizing them here would
 * put a second, staler answer on screen next to that page's real one". The
 * warning is right, and the answer is not to keep credits off the profile — it
 * is to make sure there is only ever ONE answer to copy. That is this file.
 *
 * The balance and the entries below are account state and are a fixture; see
 * `(reference)/billing/BILLING_API.md` §3 for the endpoint that replaces them.
 * When it lands, it lands here and all three pages move together.
 *
 * ── THE POLICY IS NOT RESTATED HERE ──
 *
 * What EARNS a credit is `CREDIT` in `(reference)/invite/_lib/invite-flow.ts`,
 * which is the module that reasons about it at length: nothing for sending,
 * nothing for a free signup, one credit per PERSON rather than per lease. This
 * file re-exports it rather than paraphrasing, so a page showing a balance and
 * a page showing the rule cannot drift apart.
 *
 * ── ONE THING IS UNRESOLVED, AND IT IS FLAGGED RATHER THAN PAPERED OVER ──
 *
 * The two existing sources disagree about a credit in two ways:
 *
 *   UNIT     `invite-flow` says "One free month of Mineral View" and counts in
 *            MONTHS (`monthsOnPaid: 1`). The billing ledger posts "+ $100.00"
 *            and counts in DOLLARS. At Premium's $99.99 these are within a
 *            penny of each other, so they are probably the same policy said two
 *            ways — but nothing in the code says so.
 *
 *   TIMING   `CREDIT.rules[0]` says it lands "the moment they take a paid plan
 *            — there is no waiting period". The billing ledger's own entry says
 *            the credit posted once the referred owner "cleared the 30-day
 *            confirmation window". Those cannot both be true.
 *
 * Neither is resolved here, because which one is right is a product decision
 * and guessing would bake the wrong one into three pages at once. `BALANCE`
 * carries the dollar figure the ledger already used, and the timing sentence is
 * left where it was — on the ledger entry that makes the claim — rather than
 * being promoted to a rule. Settle it and this file is the one place to say so.
 */

export { CREDIT };

/** what a page should link to when it wants the reader to earn one */
export const INVITE_HREF = "/mineralownersite/invite";

/** where the full ledger lives, anchored at the credits fold */
export const LEDGER_HREF = "/mineralownersite/billing#credits";

export interface LedgerEntry {
  title: string;
  detail: string;
  balance: string;
  /** a posting that actually paid — its balance reads in the accent color */
  credited?: boolean;
}

/**
 * THE BALANCE, AS THE LEDGER STATES IT.
 *
 * Cents as well as the formatted string, because a page that wants to say
 * "nothing yet" has to test a number and not a string that happens to read
 * "$0.00".
 */
export const BALANCE_CENTS = 10000;
export const BALANCE = "$100.00";

export const LEDGER: LedgerEntry[] = [
  {
    title: "+ $100.00 — paid-conversion referral",
    detail:
      "Jun 2026 · your referred co-owner became a paid member and cleared the " +
      "30-day confirmation window",
    balance: "balance $100.00",
    credited: true,
  },
  {
    title: "$0.00 — free-account signup (no credit)",
    detail:
      "May 2026 · your referred co-owner created a free account — you were " +
      "connected in your group; credits post only on paid conversion",
    balance: "balance $0.00",
  },
  {
    title: "No spends yet",
    detail:
      "credits spend on services (e.g. a $500 Lease Audit beyond your three " +
      "included) or auto-apply at your renewal",
    balance: "—",
  },
];

/** how many entries actually paid — the profile card counts them rather than
 *  asserting a figure no source records */
export const CREDITED_COUNT = LEDGER.filter((e) => e.credited).length;

/**
 * THE ONE-LINE RULE, for a surface with room for a sentence and not a list.
 *
 * Built from `CREDIT` rather than written out, so the unit and the "per person"
 * rule come from the module that owns them.
 */
export const EARN_LINE =
  `${CREDIT.label} when a co-owner you invited takes a paid plan. ` +
  `One per ${CREDIT.per}, ever — not per lease. ` +
  "Sending a letter earns nothing on its own, and neither does a free signup.";
