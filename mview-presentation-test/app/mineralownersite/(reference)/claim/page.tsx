import type { Metadata } from "next";

import { getSessionUser } from "@/lib/session";

import Portal from "../../_components/reference/Portal";
import {
  getOwnerPayload,
  type OwnerSelection,
} from "../../_lib/reference/owner-data";
import type { Payload } from "../../_lib/reference/payload";
import { ClaimWizard } from "./_components/claim-wizard";
import "./claim.css";

/**
 * CLAIM MINERAL OWNER — `/mineralownersite/claim`.
 *
 * The destination of the sidebar's primary slot while the record is unclaimed
 * (`_lib/portal-nav.ts`). It sits INSIDE the portal on purpose: the row is
 * portal chrome, so following it should not throw the owner out to the
 * marketing site mid-sentence.
 *
 * The page is one component — see `_components/claim-wizard.tsx`, which holds
 * the step state and composes the five screens. Everything else in this folder
 * is presentational or data.
 *
 * ── IT MOVED FROM `(portal)` TO `(reference)`, AND THE CHROME MOVED WITH IT ──
 *
 * The two groups carry different shells and the difference is not cosmetic.
 * `(portal)/layout.tsx` wraps its children in `PortalShell` and imports
 * `portal.css`, so a page under it returns bare content and is dressed for
 * free. `(reference)/layout.tsx` does neither — it supplies the stylesheet, the
 * icon sprite and the session, and every page under it wraps ITSELF in
 * `Portal`. Moving the folder without this wrapper is what left the flow as a
 * card floating on an empty page with no sidebar and no top bar.
 *
 * So this follows `map/page.tsx`, which joined the same group for the same
 * reason: an owner arriving here should find the sidebar and the top bar they
 * just left, not a second arrangement of the same idea.
 *
 * ── THE PAYLOAD IS THE CHROME'S, NOT THE FLOW'S ──
 *
 * The owner picker, the pinned value line and the sidebar foot all read it, so
 * without it the top of the page would be the right shell with nothing in it.
 * The claim flow itself reads none of it — it has its own API layer and its own
 * state — which is why a failed read returns `null` rather than throwing the
 * page away: the chrome loses its figures and the flow loses nothing.
 *
 * ── NO `mv-dash-routes` ON THE ROOT, AND THAT IS DELIBERATE ──
 *
 * `portal.css` uses that class to select DIRECT CHILDREN for two page-
 * replacement gates: while unclaimed it hides every child that is not
 * `.nc-only`, and in the Ultra tier every child that is not `.tier-u`. A route
 * carrying it must therefore supply both variants or render blank.
 *
 * This flow needs neither. Its whole audience is the unclaimed owner — the row
 * that reaches it is hidden once the record is claimed — so an `nc-only` gate
 * would be a second copy of a rule the navigation already enforces. And an
 * Ultra variant of a five-step legal attestation is not a shorter version of
 * it: the reassurances and the attestation are the parts a density switch would
 * cut, and they are the parts that must not be cut. Omitting the class is what
 * keeps the flow whole in all four densities.
 */
export const metadata: Metadata = {
  title: "Claim Mineral Owner",
  description:
    "Claim your mineral owner record in five steps — free, about two minutes, and it never changes who owns your minerals.",
};

/* The owner comes off the query string, so there is nothing correct to cache at
   the page level — the same reason the Dashboard and the Map are dynamic. */
export const dynamic = "force-dynamic";

/**
 * `member_id` IS READ ON THE SERVER AND PASSED DOWN. The session cookie is
 * httpOnly, so page JavaScript cannot read the id itself — and
 * `POST /owners/claim` rejects an anonymous claim with a 400, so the flow has
 * to know whether it has one before it offers to file anything.
 *
 * NO REDIRECT ON A SIGNED-OUT VISITOR, unlike the Map. The portal is reachable
 * by anyone with the URL — see `(reference)/layout.tsx` — and this flow is
 * usable without an account right up to the last step, where step 4 disables
 * the one button that writes. Sending them away would remove four screens they
 * are entitled to read.
 */
export default async function PortalClaimPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  const initial = await loadInitial(searchParams);

  return (
    <Portal route={null} initial={initial}>
      <ClaimWizard memberId={user?.id ?? null} />
    </Portal>
  );
}

/**
 * Read the four owner parameters and hand them to the data seam — the same read
 * the Dashboard and the Map do, and here purely for the chrome.
 *
 * `null` on a failure rather than a thrown page: the shell retries on mount
 * when it receives no payload, and the claim flow does not depend on the result
 * either way.
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
  } catch {
    return null;
  }
}
