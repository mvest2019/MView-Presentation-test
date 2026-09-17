import type {
  CreditPlan,
  CreditPolicy,
  FlowStep,
  OwnerKind,
} from "./invite-types";

/**
 * THE JOURNEY AND THE CREDIT, AS DATA.
 *
 * WHY THE NINE STEPS ARE A LIST AND NOT PROSE IN A COMPONENT: five of them
 * happen on a page this portal does not have, and three need a write store that
 * does not exist. Holding them in one array with a `state` on each lets the rail
 * show the whole journey — which is what a reader needs in order to understand
 * what they are starting — without any single step pretending to work. A
 * component that hard-coded the same sentences would have to be edited, rather
 * than re-read, on the day the claim-by-code flow lands.
 *
 * `who` SPLITS THE LANES, and the split is not cosmetic. Numbering all nine in
 * one column invites a reader to treat step 6 as something they can do; steps
 * 5-8 are things only the other person can do, and the rail draws them apart
 * and hollow for exactly that reason.
 */
export const FLOW: FlowStep[] = [
  {
    n: 1,
    who: "you",
    state: "live",
    title: "Pick a lease",
    detail: "The public appraisal roll says who else owns it.",
  },
  {
    n: 2,
    who: "you",
    state: "live",
    title: "Choose who to invite",
    detail: "Tick the people you actually know.",
  },
  {
    n: 3,
    who: "you",
    state: "live",
    title: "Copy the email",
    detail: "One is written for each of them, with their own code in it.",
  },
  {
    n: 4,
    who: "you",
    state: "manual",
    title: "Send it yourself",
    detail: "Paste it into your own mail. It reads as personal because it is.",
  },
  {
    n: 5,
    who: "them",
    state: "pending",
    title: "They enter the code",
    detail: "It says which owner of record they are.",
  },
  {
    n: 6,
    who: "them",
    state: "pending",
    title: "They confirm one detail",
    detail: "Their town, so a forwarded email cannot claim their record.",
  },
  {
    n: 7,
    who: "them",
    state: "pending",
    title: "They register — free",
    detail: "Claiming changes nothing about legal ownership.",
  },
  {
    n: 8,
    who: "them",
    state: "pending",
    title: "Their leases claim themselves",
    detail: "Every lease that owner number holds, not just this one.",
  },
  {
    n: 9,
    who: "you",
    state: "pending",
    title: "You get a free month",
    detail: "The moment they take a paid plan.",
  },
];

/**
 * WHAT AN INVITATION EARNS, AND ON WHAT CONDITION.
 *
 * NOTHING ON SEND, AND NOTHING ON A FREE SIGNUP. A lease on this record carries
 * dozens of other owners: paying per letter would make the rational move "write
 * to all of them", which is a mailshot — and the entire reason this page is
 * worth building is that a letter from a relative is not one. A free account
 * costs money to serve rather than earning any, so that pays nothing either.
 * The two rungs that pay nothing are shown on the rail on purpose; deleting
 * them to make the panel tidier would delete the argument.
 *
 * ONE MONTH OF SERVICE WHEN THEY GO PAID. Paid in service rather than in cash,
 * which matters: there is nothing to withdraw, so there is no reason to invent
 * a co-owner.
 *
 * AND ONCE PER PERSON, NOT PER LEASE. The same names sit on several of this
 * owner's leases — the three largest holders of 290271 are on eight of the
 * other nine — so crediting per lease would pay nine times over for one human
 * being, who is one subscriber. The credit counts owner numbers, and the rail
 * names how many of the reader's picks repeat so the rule is visible rather
 * than merely stated.
 *
 * NO COUNT APPEARS IN ANY OF THESE SENTENCES. A figure baked into prose is
 * wrong the moment the roll moves, and not one of these rules needs one.
 */
export const CREDIT: CreditPolicy = {
  monthsOnPaid: 1,
  monthsOnSend: 0,
  monthsOnFreeSignup: 0,
  per: "person",
  label: "One free month of Mineral View",
  rules: [
    "It lands the moment they take a paid plan — there is no waiting period.",
    "One month per person, ever — not per lease. The same co-owners sit on " +
      "several of your leases, and one person is one subscriber.",
    "Posting a letter earns nothing on its own, and neither does a free " +
      "signup — otherwise the sensible move would be to write to every owner " +
      "of record on the roll, which is a mailshot.",
    "If two owners invite the same person, the earlier code earns the month.",
    "It is credited as service on your own account, so there is nothing to cash out.",
  ],
};

/**
 * What this selection could earn, worked out from the ticks rather than
 * asserted in the markup.
 *
 * THE CEILING IS THE NUMBER OF DISTINCT PEOPLE, so `monthsMax` counts owner
 * numbers and not letters. Within one lease those are the same figure; the
 * reason to count it this way is the reader's NEXT lease, where several of the
 * same names appear again and a second letter earns nothing more.
 *
 * AN OPERATOR IS EXCLUDED FROM THE CEILING, not from the selection. A reader
 * may have good reason to write to the operator; they will never get a month
 * for it, and a figure that counted them would be a promise this page cannot
 * keep.
 *
 * IT COUNTS THE CURRENT SELECTION AND NOTHING ELSE NOW. The fixture build
 * cross-checked every pick against the owner's other nine leases and named the
 * repeats; the roll now arrives one lease at a time from the invite API, so
 * the browser never holds every lease's roster to check against. `repeat`
 * stays in the shape — empty — and the rail keeps the "one month per person,
 * ever" sentence, which is the rule the repeat count was illustrating.
 */
export function creditPlan(
  chosen: { kind: OwnerKind }[],
  policy: CreditPolicy = CREDIT,
): CreditPlan {
  const eligible = chosen.filter((owner) => owner.kind !== "operator");
  const months = eligible.length * policy.monthsOnPaid;

  return {
    chosen: chosen.length,
    eligible: eligible.length,
    repeat: [],
    repeatLeases: 0,
    monthsMax: months,
    /*
     * THREE STATES, NOT TWO. Nothing ticked and nothing eligible both come out
     * at zero months, and the prompt for the first is a lie about the second:
     * a reader who has ticked the operator HAS picked somebody, and telling
     * them to "tick a co-owner" reads as the page failing to notice. The middle
     * case says why the figure is zero, which is the only useful thing there is
     * to say about it.
     */
    line:
      chosen.length === 0
        ? "Tick a co-owner and this says what it could earn you."
        : months === 0
          ? "The working-interest party cannot register as a mineral owner, so " +
            "this selection earns nothing. Tick somebody on the roll as well."
          : `If all ${eligible.length} of them take a paid plan, that is ${months} free ` +
            `${months === 1 ? "month" : "months"} of Mineral View.`,
  };
}
