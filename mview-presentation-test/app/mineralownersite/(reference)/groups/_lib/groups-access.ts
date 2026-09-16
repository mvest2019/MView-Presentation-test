import type { FunnelKey } from "../../../_components/reference/Portal";

/**
 * WHAT EACH ACCOUNT STATE MAY DO IN GROUPS — the whole policy, in one file.
 *
 * ── WHY IT IS A TABLE AND NOT A DOZEN `funnel === 'lapsed'` TESTS ──
 *
 * Five account states times four controls that write (post · comment · reply ·
 * like) times two kinds of group is forty decisions. Spread through the
 * components they become forty places to get one of them wrong, and the way
 * they go wrong is silent: a button that should be disabled simply works.
 * Here they are one function with one return shape, so the page asks
 * `access.write` and the ANSWER is reviewable in a single screen.
 *
 * ── THE FIVE STATES, AND WHAT EACH ONE MEANS HERE ──
 *
 *   NOT CLAIMED   The public groups are public: a county, an operator and a
 *                 play exist whether or not this reader owns anything, so they
 *                 stay readable and the directory stays browsable. What is NOT
 *                 available is the private half — a private group is either one
 *                 the reader made or one a CLAIMED lease created, and with
 *                 nothing claimed there is neither. Writing is off for the same
 *                 reason it is off everywhere else on an unclaimed record:
 *                 there is no verified person to attribute a post to.
 *
 *   CLAIMED·FREE  Everything. Groups is not a paid feature and nothing here is
 *                 gated behind a plan — the paid feature on this portal is the
 *                 VALUE estimate, and there is not a single dollar figure on
 *                 this page. A free member who claimed a lease is exactly the
 *                 person the lease's group was created for, so locking them out
 *                 of it would lock the room against the one who holds the key.
 *
 *   FREE TRIAL    Everything, for the same reason — the trial is the plan.
 *
 *   PAID          Everything.
 *
 *   LAPSED        READ-ONLY, NOT SHUT. The reader keeps every group they are
 *                 in and can read every post in them; what stops is writing.
 *                 This follows the portal's own treatment of a lapsed account
 *                 elsewhere — the record stays, the figures are held back — and
 *                 it is the honest half to withhold: posts already written by
 *                 co-owners are THEIR words in a room the reader belongs to,
 *                 and hiding those would be taking away something the
 *                 subscription never provided.
 *
 * ── SHARING IS NEVER GATED ──
 *
 * `write` deliberately does not cover Share. Sharing copies a link to the
 * clipboard; it writes nothing, it reveals nothing that was not already on the
 * reader's screen, and disabling it in one state would make a reader think the
 * link had stopped working rather than that their plan had.
 */
export interface GroupsAccess {
  /** Whether the private half of the directory exists for this reader at all. */
  privateGroups: boolean;
  /** Post, comment, reply, like — anything that writes. Share is never gated. */
  write: boolean;
  /** Whether the reader may start a private group of their own. */
  createGroup: boolean;
  /** The one sentence the page prints when something above is false. */
  note: string | null;
  /** Which `.notice` tone that sentence is drawn in. */
  tone: "mint" | "slate" | "amber" | "gold";
  /** Where the state's way forward goes, or null when there is nothing to fix. */
  action: { label: string; href: string } | null;
}

const OPEN: GroupsAccess = {
  privateGroups: true,
  write: true,
  createGroup: true,
  note: null,
  tone: "mint",
  action: null,
};

export function groupsAccess(funnel: FunnelKey): GroupsAccess {
  switch (funnel) {
    case "unclaimed":
      return {
        privateGroups: false,
        write: false,
        createGroup: false,
        note:
          "You are reading the public groups as a visitor. Claiming your mineral owner record is what opens the private half — every lease you claim starts a private group with the other owners on it — and it is what lets you post here under your own name.",
        tone: "slate",
        action: {
          label: "Claim your record",
          href: "/mineralownersite/claim",
        },
      };
    case "lapsed":
      return {
        privateGroups: true,
        write: false,
        createGroup: false,
        note:
          "Your subscription has ended, so Groups is read-only for now. Your groups and everything posted in them are still here — posting, commenting and liking start again the moment the plan does.",
        tone: "amber",
        action: { label: "See the plans", href: "/pricing#plans" },
      };
    case "claimed":
    case "trial":
    case "paid":
    default:
      return OPEN;
  }
}

/**
 * What one control says when it is off.
 *
 * A DISABLED CONTROL WITH NO REASON IS A BUG THE READER CANNOT REPORT. Every
 * place the page disables something, it hands the same sentence to `title` and
 * to the screen-reader description, so the answer to "why can I not press this"
 * is on the control itself rather than in a banner further up the page.
 */
export function blockedReason(access: GroupsAccess, what: string): string {
  if (access.write) return "";
  return access.privateGroups
    ? `${what} is paused while the subscription is lapsed.`
    : `${what} needs a claimed mineral owner record.`;
}
