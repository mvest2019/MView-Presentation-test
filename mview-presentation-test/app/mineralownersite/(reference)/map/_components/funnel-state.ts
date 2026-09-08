/*
 * The owner funnel state, as the map reads it.
 *
 * The same five states the portal's top bar offers, with the same keys —
 * `FunnelKey` in `_components/reference/Portal.tsx`. The map does not set them:
 * the account-state button in the chrome does, and this file's job is to say
 * what each one may READ.
 *
 * THE TWO AXES ARE NOT THE SAME THING, which is the portal's most-repeated
 * warning and holds here too:
 *
 *   FUNNEL STATE  what the account IS, and therefore what it MAY see.
 *   VIEW MODE     how much of that the reader WANTS to see.
 *
 * So the state does not hide map features itself. It sets the ceiling on the
 * view modes — a free account cannot read the map at Pro — and everything above
 * that ceiling is simply not reached.
 *
 * This was `demo-state-menu.tsx` and carried the map's own copy of the state
 * picker. That went with the view-mode picker beside it, for the same reason:
 * the chrome already offers both, one row up.
 */

export const FUNNEL_STATES = [
  "unclaimed",
  "claimed",
  "trial",
  "lapsed",
  "paid",
] as const;

export type FunnelState = (typeof FUNNEL_STATES)[number];

/** The portal's default, and what the map assumes when rendered outside it. */
export const DEFAULT_FUNNEL_STATE: FunnelState = "paid";

/**
 * The furthest a state may read.
 *
 * Free accounts — before a claim, after one, and after a trial has run out —
 * get the two plain modes; a trial and a paid plan get all four.
 */
export const FUNNEL_CEILING: Record<FunnelState, import("./density").Density> = {
  unclaimed: "simple",
  claimed: "simple",
  trial: "pro",
  lapsed: "simple",
  paid: "pro",
};
