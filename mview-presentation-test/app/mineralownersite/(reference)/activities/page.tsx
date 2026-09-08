import type { Metadata } from "next";

import Portal from "../../_components/reference/Portal";
import {
  getOwnerPayload,
  type OwnerSelection,
} from "../../_lib/reference/owner-data";
import type { Payload } from "../../_lib/reference/payload";

/**
 * ACTIVITIES — `/mineralownersite/activities`, the server half.
 *
 * PORTED FROM the reference's `src/app/activities/page.tsx`, and the same page
 * as the Dashboard's server half with a different `route` prop — see the note
 * on Alerts for why all four load identically.
 *
 * THIS REPLACES the portal's own Activities page, which was a server component
 * over `_lib/portal-activities-data`, a separate hand-written record. The
 * reference's version reads `p.timeline` and `p.activities`, so its counts are
 * the Dashboard's counts and a filing that reaches the alert list is the same
 * filing here.
 *
 * WHAT IT IS: ONE TIMELINE of six event kinds — permit, completion,
 * production, adjacent, status, operator — under two controls, a date range
 * and a distance.
 *
 *   THE PAGE OPENS ON THE OWNER'S OWN LEASES. The reference's own measurement
 *   is the argument: on `all` this owner sees 890 rows of which 133 are hers,
 *   so the first screen was her neighbours' permits and her own production was
 *   pages down.
 *
 *   EVERY DATE FILTER IS A STRING COMPARISON against the eight-character sort
 *   key the ordering already uses, so no date parsing happens in the browser.
 *   A standing fact carries no date and is therefore never removed by a date
 *   filter; it stays, pinned below the dated rows, and the summary says so.
 *
 *   DISTANCE IS MEASURED OR IT IS NOT CLAIMED. A row with a real distance from
 *   the owner's nearest well carries it; a row matched only by county says
 *   that instead of implying a mile it cannot prove.
 *
 * WHAT RENDERS WHEN:
 *
 *   ULTRA         how many things happened, in one headline, with the
 *                 production, completion and permit counts as the status line
 *                 and one button into the neighbours explainer.
 *
 *   ESSENTIALS    the header and the plain-English summary.
 *
 *   DETAILED      the control bar (date range, custom months, distance,
 *                 search), the six kind cards that filter the feed and scroll
 *                 to it, the by-month permits-and-completions chart, the
 *                 owner's own production months, the neighbourhood curve, and
 *                 the timeline itself.
 *
 *   PROFESSIONAL  the same, with a 40-row page instead of 20 and the method
 *                 notes.
 *
 *   NOT CLAIMED   the claim rail and the sample badge — and the badge is
 *                 precise about which half is real: the neighbouring filings
 *                 and measured distances are public record and shown as filed;
 *                 only the rows marked as the owner's are a sample.
 *
 * `force-dynamic`: the owner comes off the query string, so there is nothing
 * correct to cache at the page level.
 */
export const metadata: Metadata = {
  title: "Activities",
  description:
    "Every filing on your leases and around them — permits, completions, production and operator changes.",
};

export const dynamic = "force-dynamic";

export default async function ActivitiesPage({
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
    /* the client shell retries on mount when it receives no payload, so a
       failed read shows the named loader rather than an error page */
    initial = null;
  }

  return <Portal route="activities" initial={initial} />;
}
