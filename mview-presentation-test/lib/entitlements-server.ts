/**
 * WHERE A TIER COMES FROM — server only. Spec §7.3, §12.1 and Appendix D.
 *
 * ── THE ONE RULE THAT MATTERS ──
 *
 * The tier is resolved HERE, from the session, on every request. It is never
 * read from a request body, header or query parameter, and never from a plain
 * field in the `mv_user` cookie. §7.3 rates that last option ❌ Forbidden and
 * says why: `httpOnly` stops JavaScript reading a cookie, it does not stop the
 * user EDITING one. `{"id":1,"tier":"pro"}` means anyone with devtools holds
 * every entitlement.
 *
 * §7.3 offers three options and recommends A, a lookup keyed on the user id.
 * That is what this file is shaped for. What it does not yet have is a
 * subscription table to look in — see the seam below.
 *
 * ── FAIL DOWN, NEVER UP ──
 *
 * §12.1: a signed-in user with no subscription record resolves to `ultra`, and
 * it is LOGGED, because a paying customer resolving to Ultra is a billing bug
 * and deserves an alert rather than a silent downgrade.
 *
 * ── WHAT IS NOT HERE ──
 *
 * Enforcement. This resolves who the reader is; §8.2's proxy is what makes the
 * answer bite, and it does not exist yet. Every cap in `entitlements.ts` is
 * currently a rendering hint: the upstream map API is unauthenticated and
 * `MAP_BASE_URL` is in the client bundle (§8.1), so a determined reader can
 * still fetch a Pro-sized extent by hand. The spec is blunt about what that
 * means — "Shipping only the first is a revenue leak, not a soft launch" — so
 * this must not be read as tiering being finished.
 */

import "server-only";

import {
  TIERS,
  toTier,
  type Entitlements,
  type Tier,
} from "./entitlements";

/**
 * The subscription lifecycle, Appendix D's own list.
 *
 * More states than "paid" and "not paid", and each maps to exactly one
 * effective tier. Kept beside the resolver, as the appendix asks.
 */
export type SubscriptionState =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "none";

export interface SubscriptionRecord {
  state: SubscriptionState;
  /** The tier that was actually bought, or is being trialled. */
  purchased: Tier;
  /** When a `canceled` subscription's paid period runs out. */
  currentPeriodEnd?: Date | null;
  /** When `past_due` began, for the seven-day grace. */
  pastDueSince?: Date | null;
  /** Appendix C grandfathering — `detailed` until this date. */
  grandfatheredUntil?: Date | null;
}

const GRACE_DAYS = 7;

const dayMs = 24 * 60 * 60 * 1000;

/**
 * Appendix D, as a function.
 *
 * THE TIE-BREAK IS "TAKE THE HIGHER TIER". Where two sources could apply — a
 * grandfather window and an active subscription, say — the appendix's rule is
 * to take the better of the two, because "never charge someone and give them
 * less than they had for free".
 */
export function tierForSubscription(
  record: SubscriptionRecord | null,
  now = new Date(),
): Tier {
  const grandfathered =
    record?.grandfatheredUntil && record.grandfatheredUntil > now
      ? ("detailed" as Tier)
      : null;

  const earned = ((): Tier => {
    if (!record || record.state === "none") return "ultra";

    switch (record.state) {
      case "active":
      case "trialing":
        return record.purchased;

      /* A bounced card is not a cancellation. Seven days at the tier they
         bought, with the banner the appendix specifies, then down to Ultra —
         "downgrading someone on a bounced card is how you lose a customer you
         already had". */
      case "past_due": {
        const since = record.pastDueSince?.getTime();
        if (!since) return record.purchased;
        return now.getTime() - since <= GRACE_DAYS * dayMs
          ? record.purchased
          : "ultra";
      }

      /* They paid for the period, so they keep it to the end of it. */
      case "canceled":
        return record.currentPeriodEnd && record.currentPeriodEnd > now
          ? record.purchased
          : "ultra";
    }
  })();

  if (!grandfathered) return earned;
  return higher(earned, grandfathered);
}

function higher(a: Tier, b: Tier): Tier {
  const order = ["ultra", "essential", "detailed", "pro"] as const;
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

/**
 * THE SEAM. Replace the body, not the signature.
 *
 * This is where option A from §7.3 plugs in: one read of the subscription table
 * keyed on `userId`, handed to `tierForSubscription` above. Everything that
 * consumes a tier already goes through here, so wiring the real table is a
 * change to this function and nothing else.
 *
 * UNTIL THEN IT READS ONE ENVIRONMENT VARIABLE, and that is a deliberate,
 * visible placeholder rather than a hardcoded `pro`:
 *
 *   · `MAP_TIER_DEFAULT` sets what a signed-in user without a record gets, so
 *     the four tiers can be exercised end-to-end in dev and on a preview
 *     deployment without a billing system.
 *   · Unset, it is `ultra` — §12.1's answer, and the safe one. A missing
 *     record must never grant Pro.
 *
 * It is read from `process.env` on the SERVER, never `NEXT_PUBLIC_`, so it
 * cannot be set from the browser.
 */
export async function entitlementsForUser(
  userId: number,
): Promise<Entitlements> {
  const record = await subscriptionForUser(userId);

  if (!record) {
    /* §12.1 — log it. A paying customer landing here is a billing bug, and the
       only thing worse than the downgrade is not knowing it happened. When
       there is an alerting channel this is where it fires. */
    console.warn(
      `[entitlements] no subscription record for user ${userId} — resolving to the entry tier`,
    );
    return TIERS[toTier(process.env.MAP_TIER_DEFAULT)];
  }

  return TIERS[tierForSubscription(record)];
}

/**
 * The unwired half: one query, when there is a table to query.
 *
 * Returns `null` today for every user, which routes them all through the
 * no-record branch above. Left as its own function so the shape of what is
 * missing is obvious to whoever wires billing — it is a `SELECT`, not a
 * refactor.
 */
async function subscriptionForUser(
  _userId: number,
): Promise<SubscriptionRecord | null> {
  return null;
}
