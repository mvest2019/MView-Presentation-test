import type { Metadata } from "next";

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

export default function PortalClaimPage() {
  return <ClaimWizard />;
}
