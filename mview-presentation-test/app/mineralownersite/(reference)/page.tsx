import type { Metadata } from "next";

import Portal from "../_components/reference/Portal";
import {
  getOwnerPayload,
  type OwnerSelection,
} from "../_lib/reference/owner-data";
import type { Payload } from "../_lib/reference/payload";

/**
 * THE DASHBOARD — `/mineralownersite`, the server half.
 *
 * PORTED FROM the reference's `src/app/page.tsx`. Its shape is the reference's
 * and so is the reasoning: the payload is loaded on the SERVER for the first
 * paint, so the page arrives with real figures in the HTML rather than a
 * spinner that then fetches, and after that the client shell owns navigation —
 * switching between the Dashboard and the Weekly Report re-uses the snapshot
 * instead of loading it twice. Each route still has a real server page, which
 * is what makes a cold entry or a shared link work.
 *
 * WHAT RENDERS WHEN — decided in REACT, not in CSS, because that is how the
 * reference decides it. `bits.tsx` gives the reason: the prototype's density
 * rule is `section > :not(.tier-u)`, which depends on the child being a DIRECT
 * descendant of the route section, and "in a component tree that is not
 * reliably true, and a wrong depth silently hides the whole page". So
 * `Dashboard` takes `tier` and `funnel` as props and branches on them. The one
 * gate still done in CSS is the money figure, `.cl-lock`, because it blurs a
 * value in eleven places at once.
 *
 *   ULTRA         the plan card and `UltraHero`, and nothing else: one kicker,
 *                 one headline (the value, or the lease count while
 *                 unclaimed), one status sentence, one button, one footnote.
 *
 *   ESSENTIALS    greeting, portfolio strip, alerts rollup, the one-line hero,
 *                 the five plain-English cards — are my leases earning · is it
 *                 going up or down · what is it worth · what is happening
 *                 around me · what should I watch next — then the month chart.
 *
 *   DETAILED      the above without the Essentials-only cards, plus "what
 *                 changed", the alert strip, the four KPIs and both rails:
 *                   left   switchable lease chart · monthly trend · what's
 *                          going on around you · how long these leases have
 *                          produced · your operators · the price path
 *                   right  what we watched · reserves & new-well outlook ·
 *                          neighbours & standing permits · your wells · where
 *                          your value sits · where every number came from
 *
 *   PROFESSIONAL  Detailed plus "every lease, every field" under the left
 *                 rail — and the price deck moves to the right rail, because
 *                 the table makes the left rail the long one. That swap is the
 *                 reference's own; its measurements are in `Dashboard.tsx`.
 *
 *   NOT CLAIMED   the claim rail and the sample badge, with the density forced
 *                 to Professional however the reader has it set — the
 *                 reference's rule, because "someone deciding whether to claim
 *                 is looking at a shop window". The payload is rewritten by
 *                 `sample.ts`: real dates, substituted names, figures scaled by
 *                 one seeded factor so the rows still add to the totals.
 *
 *   CLAIMED       the owner's own density, with the plan card explaining the
 *                 state and the value figures blurred by `.cl-lock`. Every
 *                 lease, volume and permit stays in the clear, because they
 *                 claimed them; what Premium adds is what they are worth.
 *
 *   PREMIUM TRIAL full Premium — the trial IS the plan — and the plan card
 *                 counts the days from the stamp the shell writes rather than
 *                 printing a frozen day 3.
 *
 *   TRIAL ENDED   the plan card says one lease stays live and the rest are on
 *                 hold, and the value figures are covered for that reason.
 *
 * `force-dynamic`: the owner comes off the query string, so there is nothing
 * correct to cache at the page level.
 */
export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "What your minerals are worth, what changed since your last visit, and the one thing that needs you.",
};

export const dynamic = "force-dynamic";

export default async function MineralOwnerDashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const initial: Payload | null = await loadInitial(searchParams);
  return <Portal route="dashboard" initial={initial} />;
}

/**
 * Read the four owner parameters and hand them to the data seam.
 *
 * `null` on a failure rather than a thrown page: the client shell retries on
 * mount when it receives no payload, so a slow or missing read shows the named
 * loader instead of an error screen. That is the reference's own behaviour and
 * the reason `initial` is nullable.
 */
async function loadInitial(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<Payload | null> {
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
  try {
    return await getOwnerPayload(sel);
  } catch (e) {
    /* THE REASON IS LOGGED, NOT DISCARDED. The client shell retries on mount
       when it receives no payload, so a failed read still shows the named
       loader rather than an error page — but a bare `catch` left the cause
       nowhere at all: not in the browser, because this read is server-side,
       and not in the terminal either. That is what made "the API call is not
       appearing" impossible to diagnose from the outside. */
    console.error('[dashboard] the owner payload could not be read:',
      e instanceof Error ? e.message : e);
    return null;
  }
}
