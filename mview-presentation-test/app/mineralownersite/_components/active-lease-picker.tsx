"use client";

import { useSyncExternalStore } from "react";

import { leaseSnapshot } from "../_lib/portal-demo-data";
import { LEASE_LOCK_DAYS, STORAGE_KEYS } from "../_lib/portal-state";

/**
 * State 4B's active-lease picker — the one control in the funnel bar that
 * genuinely works.
 *
 * WHY IT HAD TO BE BUILT. The lapsed message says "One lease stays fully live —
 * pick which below", and until now there was nothing below to pick with. A
 * sentence that names a control the reader cannot find is worse than no
 * sentence: it reads as a broken page rather than an unfinished one. This is
 * also the only funnel-bar control that needs NO unbuilt route — the choice is
 * the owner's own, stored on their device — so there is no reason for it to
 * wait for Billing.
 *
 * RYAN'S RULE, VERBATIM: one change every seven days, "so the choice carries
 * weight and the owner feels the cost of only having one". While locked the
 * select is disabled and its `title` says when the next change is available.
 * The lock is measured from `mv_active_lease_set`, the reference's own key, so
 * a browser that used the prototype carries its choice and its lock in.
 *
 * IT IS NOT AN AUTHORISATION BOUNDARY, and neither is the lapsed gate it feeds.
 * Which lease is "live" is a presentational choice here exactly as it is in the
 * reference; when the portal shows a real owner's figures this has to be a
 * server-side decision on an authorised read. See the note at the foot of
 * `portal-state.ts`.
 *
 * THE DEFAULT IS THE FIRST LEASE, which on this record is the strongest one
 * (Smith 305892). That matters: defaulting to whatever happened to sort first
 * would quietly hand a lapsed owner their least valuable lease.
 */

/* ----------------------------------------------------------------------------
   THE STORED CHOICE, as an external store — the same pattern
   `portal-state-provider.tsx` uses for the saved density, and for the same
   reasons: no `setState` in an effect, and a change in one tab reaches the
   others.
   ---------------------------------------------------------------------------- */

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/** Returns a primitive, so React's `===` comparison is stable. */
function readChoice(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.activeLease);
  } catch {
    return null;
  }
}

function readChoiceOnServer(): string | null {
  return null;
}

function readLockSetAt(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.activeLeaseSet);
  } catch {
    return null;
  }
}

function readLockSetAtOnServer(): string | null {
  return null;
}

/* ----------------------------------------------------------------------------
   THE CLOCK, also as an external store.

   "Is the lock still running?" compares a stored timestamp against NOW, and
   `Date.now()` is impure — called in the component body it makes the output
   depend on when React happened to render, which `react-hooks/purity` rejects
   and which would also disagree between the server and the first client paint.

   A store is the right home for it: reading an external system is exactly what
   `getSnapshot` is for. The snapshot is a MINUTE BUCKET rather than a
   millisecond, which is what makes it usable — it is stable across renders
   within the same minute, so React's `===` check cannot loop, while still
   moving on its own so a lock that expires while the page is open unlocks the
   control instead of waiting for a reload.
   ---------------------------------------------------------------------------- */

const MINUTE = 60_000;

function subscribeToClock(onChange: () => void): () => void {
  const id = window.setInterval(onChange, MINUTE);
  return () => window.clearInterval(id);
}

function readMinuteBucket(): number {
  return Math.floor(Date.now() / MINUTE);
}

/** The server has no business deciding whether a client-side lock has run out. */
function readMinuteBucketOnServer(): number {
  return 0;
}

export function ActiveLeasePicker() {
  const stored = useSyncExternalStore(subscribe, readChoice, readChoiceOnServer);
  const setAtRaw = useSyncExternalStore(
    subscribe,
    readLockSetAt,
    readLockSetAtOnServer,
  );
  const minuteBucket = useSyncExternalStore(
    subscribeToClock,
    readMinuteBucket,
    readMinuteBucketOnServer,
  );

  const setAt = Number(setAtRaw) || 0;
  const lockedUntil = setAt ? setAt + LEASE_LOCK_DAYS * 86_400_000 : 0;

  // `minuteBucket` is 0 on the server and on the first paint, so the control
  // starts UNLOCKED and locks on hydration if it should be. That is the safe
  // way round for a demo affordance: a reviewer never meets a control that is
  // disabled for a reason the page has not worked out yet.
  const locked = lockedUntil > 0 && minuteBucket * MINUTE < lockedUntil;

  const options = leaseSnapshot;
  const active =
    options.find((row) => row.lease === stored)?.lease ?? options[0]?.lease;

  function pick(name: string) {
    if (locked && name !== active) return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.activeLease, name);
      window.localStorage.setItem(
        STORAGE_KEYS.activeLeaseSet,
        String(Date.now()),
      );
      // `storage` does not fire in the writing tab, so nudge our own subscriber.
      window.dispatchEvent(
        new StorageEvent("storage", { key: STORAGE_KEYS.activeLease }),
      );
    } catch {
      // Nothing to do — the select simply keeps its current value.
    }
  }

  return (
    <span id="mvActiveLeaseWrap">
      <label htmlFor="mvActiveLease" className="tiny" style={{ fontWeight: 600 }}>
        Active lease
      </label>
      <select
        id="mvActiveLease"
        value={active}
        disabled={locked}
        onChange={(event) => pick(event.target.value)}
        title={
          locked
            ? `Locked until ${new Date(lockedUntil).toLocaleDateString()} — one change per ${LEASE_LOCK_DAYS} days`
            : "Choose the one lease that stays fully live"
        }
      >
        {options.map((row) => (
          <option key={row.lease} value={row.lease}>
            {row.lease}
          </option>
        ))}
      </select>
    </span>
  );
}
