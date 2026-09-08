import { leaseRecords } from "./lease-records";

/**
 * THE ONE LEASE THAT STAYS LIVE AFTER A TRIAL ENDS.
 *
 * ── WHAT THE LAPSED STATE ACTUALLY IS ──
 *
 * Not a paywall dropped over the record. The owner keeps everything — every
 * lease, every name, every county — and ONE lease keeps its real figures. They
 * choose which one, and they can change that choice every seven days. The other
 * nine are "on hold", which is a different word from "gone" and the design is
 * careful about the difference: the lease NAME is never blurred, only its value.
 *
 * That consolation is the whole reason the state exists as a distinct design
 * rather than a locked-out screen, so the picker is not an optional extra.
 *
 * ── WHY THE SEVEN-DAY LOCK IS ENFORCED AND NOT JUST ANNOUNCED ──
 *
 * Because a picker that lets you re-choose freely is a picker that gives you all
 * ten leases, one click at a time. The lock is what makes "one lease" true. It
 * is stored as the timestamp of the last change, so the rule reads the same way
 * a reader would state it: you changed it then, you may change it again seven
 * days later.
 *
 * ── AN EXTERNAL STORE, NOT AN EFFECT ──
 *
 * The choice has to survive a reload and there is no owner record to write to,
 * so it lives in `localStorage` — the same place the density tier is kept, and
 * read the same way: `useSyncExternalStore`. `_components/portal-state-provider.tsx`
 * sets that precedent and gives the reasons, which hold here too.
 *
 * `localStorage` IS an external system, so this is the tool React provides for
 * reading one — rather than an effect that reads it and calls `setState`, which
 * cascades a second render. It also buys cross-tab sync for free: picking a live
 * lease in one tab updates every other open tab through the `storage` event.
 *
 * The server snapshot is `DEFAULT_ACTIVE_LEASE`, so first paint shows the
 * strongest lease as live and the saved choice lands on hydration. Guessing
 * differently would flash the wrong row as LIVE for every owner who never
 * changed it.
 *
 * Both callbacks are module-level so their identity is stable across renders — a
 * `subscribe` that changed each render would resubscribe on every one.
 */

const STORAGE_KEY = "mv_active_lease";
const STORAGE_SET_AT = "mv_active_lease_set";

/** The prototype's own figure: one change per week. */
export const LEASE_LOCK_DAYS = 7;

const DAY_MS = 86_400_000;

/**
 * The strongest lease, chosen for them until they choose otherwise.
 *
 * DERIVED, not a literal: whichever lease is worth most is the one an owner
 * would pick, and hard-coding "305892" would quietly become the wrong default
 * the first time the record changes.
 */
export const DEFAULT_ACTIVE_LEASE = leaseRecords.reduce((best, lease) =>
  lease.mvestimate > best.mvestimate ? lease : best,
).number;

/** The stored choice, or the default. Safe to call only on the client. */
export function readActiveLease(): string {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    /* A stored number that is no longer on the record falls back to the default
       rather than leaving every row locked and none of them live. */
    return stored && leaseRecords.some((lease) => lease.number === stored)
      ? stored
      : DEFAULT_ACTIVE_LEASE;
  } catch {
    /* Private browsing, or storage disabled. The picker still works for this
       session; it just will not be remembered. */
    return DEFAULT_ACTIVE_LEASE;
  }
}

/** When the choice may next be changed, as a timestamp. 0 = right now. */
export function readUnlockTime(): number {
  try {
    const setAt = Number.parseInt(
      window.localStorage.getItem(STORAGE_SET_AT) ?? "0",
      10,
    );
    return setAt ? setAt + LEASE_LOCK_DAYS * DAY_MS : 0;
  } catch {
    return 0;
  }
}

/** Records a new choice and starts the lock. Returns the unlock timestamp. */
export function writeActiveLease(leaseNumber: string, now: number): number {
  try {
    window.localStorage.setItem(STORAGE_KEY, leaseNumber);
    window.localStorage.setItem(STORAGE_SET_AT, String(now));
  } catch {
    /* Nothing to do — see `readActiveLease`. */
  }
  return now + LEASE_LOCK_DAYS * DAY_MS;
}

/* ----------------------------------------------------------------------------
   THE STORE
   ---------------------------------------------------------------------------- */

const listeners = new Set<() => void>();

/**
 * `storage` fires in OTHER tabs, so a local write has to notify this one itself.
 * Both paths funnel through here, which is also why the snapshots below can stay
 * plain reads.
 */
function emit() {
  for (const listener of listeners) listener();
}

export function subscribeActiveLease(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function getActiveLeaseSnapshot(): string {
  return readActiveLease();
}

export function getActiveLeaseServerSnapshot(): string {
  return DEFAULT_ACTIVE_LEASE;
}

export function getUnlockSnapshot(): number {
  return readUnlockTime();
}

export function getUnlockServerSnapshot(): number {
  /* Nothing is locked until the reader has actually changed something, and the
     server cannot know whether they have. Zero means "changeable now", which is
     the state a first-time reader is genuinely in. */
  return 0;
}

/** Record a new choice and tell every subscriber, in this tab and the others. */
export function commitActiveLease(leaseNumber: string, now: number): void {
  writeActiveLease(leaseNumber, now);
  emit();
}
