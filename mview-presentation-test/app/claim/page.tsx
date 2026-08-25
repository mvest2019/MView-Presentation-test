import type { Metadata } from "next";

import { ClaimFinder } from "./_components/claim-finder";

export const metadata: Metadata = {
  title: "Find Your Record | Mineral View",
  description:
    "Search Texas county appraisal mineral rolls by name, lease, or county — find and claim your owner record, no account needed.",
};

/**
 * Find your record — the header CTA's destination (`/claim`).
 *
 * The whole page is the client-side finder: search runs in the browser over
 * the prebuilt index in `public/owners/` (no database at runtime), so there is
 * nothing to render on the server beyond the shell. See
 * `_components/claim-finder.tsx` for the engine's provenance and the
 * behaviours it preserves.
 */
export default function ClaimPage() {
  return <ClaimFinder />;
}
