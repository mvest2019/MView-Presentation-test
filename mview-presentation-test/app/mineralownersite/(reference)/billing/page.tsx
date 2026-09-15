import type { Metadata } from "next";

import Portal from "../../_components/reference/Portal";
import {
  getOwnerPayload,
  type OwnerSelection,
} from "../../_lib/reference/owner-data";
import type { Payload } from "../../_lib/reference/payload";
import { BillingView } from "./_components/billing-view";
import "./billing.css";
import "../../page-gutters.css";

/**
 * BILLING & PLAN — `/mineralownersite/billing`.
 *
 * ── WHAT THIS REPLACES ──
 *
 * The account menu's "Billing & Plan" row had no `href`, so `Chrome` sent it to
 * `/mineralownersite/soon/billing-and-plan` — a card saying the module had not
 * opened yet. It has now; that slug redirects here, and the row points at this
 * page.
 *
 * ── `route={null}`, AND WHAT IT MEANS ──
 *
 * `Portal`'s third documented adaptation: a page can bring its own view through
 * `children` rather than being one of the shell's five built-in routes. `null`
 * says this is not one of them — no sidebar row lights from the shell's own
 * `route ===` tests, nothing is marked `aria-current`, and no page name is
 * printed that would be wrong. Invite, the Map and the coming-soon pages are
 * the other callers of the same arrangement.
 *
 * ── THE OWNER PAYLOAD IS FOR THE CHROME, NOT FOR THE PAGE ──
 *
 * Nothing on this page reads `initial`. Billing is ACCOUNT data — plan, term,
 * invoices, credits — and none of it is in `Payload`, which describes an
 * owner's minerals; the page reads the fixture in `_lib/billing-records.ts`.
 * The payload is loaded because the SHELL reads it: the value in the bar, the
 * owner picker and the sidebar foot all come off that one snapshot.
 *
 * SO A FAILED READ IS SURVIVABLE HERE in a way it is not on the Dashboard:
 * `Portal` skips its "no owner is loaded yet" card precisely when a page
 * brought its own view, so the plan cards render whatever the payload does and
 * only the bar comes up empty.
 *
 * `force-dynamic` for the reason every other page in this group sets it: the
 * owner comes off the query string, so there is nothing correct to cache at the
 * page level.
 */
export const metadata: Metadata = {
  title: "Billing & Plan",
  description:
    "Your plan, your invoices and your referral credits. Every paid plan is a 12-month term that never renews without your explicit approval.",
};

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  const one = (k: string): string | undefined => {
    const v = q[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const sel: OwnerSelection = {
    owner: one("owner") ?? null,
    num: one("num") ?? null,
    dist: one("dist") ?? null,
    year: one("year") ? Number(one("year")) : null,
  };

  let initial: Payload | null = null;
  try {
    initial = await getOwnerPayload(sel);
  } catch {
    /* The page does not read this — only the chrome does — so a cold or
       unreachable source costs the bar its figures and nothing else. */
    initial = null;
  }

  return (
    <Portal route={null} initial={initial} shellClass="mv-wide-gutters">
      <BillingView />
    </Portal>
  );
}
