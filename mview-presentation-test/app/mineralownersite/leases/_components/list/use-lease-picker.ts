"use client";

import { useState, useSyncExternalStore } from "react";

import { usePortalState } from "../../../_components/portal-state-provider";
import {
  commitActiveLease,
  getActiveLeaseServerSnapshot,
  getActiveLeaseSnapshot,
  getUnlockServerSnapshot,
  getUnlockSnapshot,
  LEASE_LOCK_DAYS,
  subscribeActiveLease,
} from "../../_lib/active-lease";

/**
 * THE LAPSED LEASE PICKER, for any table that lists leases.
 *
 * ── WHY A HOOK AND NOT PROPS ──
 *
 * TWO tables carry the picker: the wide lease table on the My Leases tab, and
 * the per-lease annual view on the Financials tab. The design gates both — its
 * own note on the matter is that `#lsPanelFin` and `#lsPanelMain` are "both
 * gated so no view leaks past the lock", which is exactly right: a lock that
 * holds on one tab and not the other is not a lock.
 *
 * Those two tables have no common client ancestor to hold the state — the
 * Financials panel is server-rendered and handed to the tab shell as a prop. But
 * they do not need one, because the choice lives in `localStorage` and
 * `useSyncExternalStore` lets each table read the same external store
 * independently. Pick a lease in one table and the other updates itself, with no
 * context, no prop drilling and no lifted state.
 *
 * ── WHAT IS DELIBERATELY *NOT* GATED ──
 *
 * The two `<details>` explainers. They repeat the same ten lease names in
 * service of showing how a number is worked out, and the design excludes them by
 * name. Blurring the derivation of a figure that is itself blurred tells the
 * reader nothing and costs them the explanation.
 */
export interface LeasePicker {
  activeLease: string;
  onPick: (leaseNumber: string) => void;
}

export function useLeasePicker(): {
  /** True only in the lapsed state; every caller renders nothing otherwise. */
  lapsed: boolean;
  picker: LeasePicker | undefined;
  /** Set when a change was refused by the seven-day lock. */
  lockNotice: string | null;
} {
  const { funnelState } = usePortalState();
  const lapsed = funnelState === "lapsed";

  const activeLease = useSyncExternalStore(
    subscribeActiveLease,
    getActiveLeaseSnapshot,
    getActiveLeaseServerSnapshot,
  );
  const lockedUntil = useSyncExternalStore(
    subscribeActiveLease,
    getUnlockSnapshot,
    getUnlockServerSnapshot,
  );

  /* The only piece of component state: it is about THIS reader's last click, not
     about the stored choice, so it belongs to the table they clicked in. */
  const [lockNotice, setLockNotice] = useState<string | null>(null);

  function onPick(leaseNumber: string) {
    const now = Date.now();
    if (lockedUntil > now && leaseNumber !== activeLease) {
      /* An inline message rather than the prototype's `alert()`: a modal dialog
         to state a rule is a poor trade, and the caller renders this into a
         `role="status"` region, which reaches a screen reader without stealing
         focus. */
      setLockNotice(
        `You can change your live lease once every ${LEASE_LOCK_DAYS} days. Next change available ${new Date(
          lockedUntil,
        ).toLocaleDateString()} — or restore full access to keep every lease live.`,
      );
      return;
    }
    commitActiveLease(leaseNumber, now);
    setLockNotice(null);
  }

  return {
    lapsed,
    picker: lapsed ? { activeLease, onPick } : undefined,
    lockNotice,
  };
}
