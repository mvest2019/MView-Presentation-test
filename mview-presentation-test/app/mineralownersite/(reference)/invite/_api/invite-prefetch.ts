import "server-only";

import { getSessionUser } from "@/lib/session";
import {
  LEASES_PAGE,
  mapLeasesResponse,
  type ClaimedOwner,
  type LeaseChoice,
} from "./invite-api";

/**
 * THE FIRST PAGE OF LEASES, FETCHED WHILE THE PAGE IS STILL ON THE SERVER.
 *
 * Without this the dropdown's data could not start loading until the bundle
 * had downloaded, hydrated and mounted — a whole network waterfall spent
 * before the first useful request left the browser. The page component runs
 * this IN PARALLEL with the shell's own owner payload (see `page.tsx`), so on
 * the happy path the leases ride the document and step 1 is filled at first
 * paint.
 *
 * NULL MEANS "LET THE CLIENT ASK". Signed out, upstream down, no claim, a
 * slow read past the ceiling — every miss returns null rather than an error,
 * and the workbench then makes its own call and shows the right notice for
 * whatever comes back. This module only ever removes a round trip; it never
 * replaces the client's error handling.
 *
 * THE CEILING IS TIGHT ON PURPOSE. The shell's payload read is the slow part
 * of this page's server render; a leases read that hangs must not add to it.
 * Eight seconds covers every measured warm and cold read; past that the
 * client's own fetch — which shows a loading line rather than a blank page —
 * is the better place to wait.
 */
const PREFETCH_TIMEOUT_MS = 8_000;

const BASE =
  process.env.MINERALVIEW_API_BASE_URL ||
  "https://mview-dev-api.mineralview.com";

export interface PrefetchedLeases {
  leases: LeaseChoice[];
  total: number;
  /** Every identity this member has claimed, and which one is active. */
  owners: ClaimedOwner[];
  /**
   * The identity this list is SCOPED TO, or null when it is every claim.
   *
   * The client sends it back on the search so a type-ahead cannot reach past
   * the owner the top bar is showing. See `fetchInviteLeases`.
   */
  owner: string | null;
}

export async function prefetchInviteLeases(): Promise<PrefetchedLeases | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const read = async (owner: string | null) => {
    const params = new URLSearchParams({
      member_id: String(user.id),
      limit: String(LEASES_PAGE),
    });
    if (owner) params.set("owner", owner);
    const res = await fetch(`${BASE}/api/v1/invite/leases?${params}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(PREFETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return mapLeasesResponse(await res.json());
  };

  try {
    const all = await read(null);
    if (!all) return null;

    /*
     * ── THE SECOND READ, AND WHEN IT IS WORTH MAKING ──
     *
     * The contract lists every identity the member has claimed unless `owner`
     * narrows it, on the argument that an invite comes from the MEMBER. But
     * the top bar names ONE owner record and the page sits under it, so a
     * picker offering another record's leases reads as the page ignoring the
     * bar — which is what QA saw: the same 4,461 leases whichever owner was
     * chosen. Defect sheet row 23.
     *
     * SO IT IS SCOPED WHENEVER THERE IS SOMETHING TO SCOPE. One claimed
     * identity, or none marked active, means the unscoped list is already the
     * active owner's and the second call would ask the same question twice.
     * A scoped read that comes back empty or fails is DISCARDED rather than
     * shown: a picker with nothing in it is worse than one that reaches wider
     * than the bar.
     */
    if (all.owners.length < 2 || !all.activeOwner) {
      return all.leases.length ? { ...all, owner: null } : null;
    }

    const scoped = await read(all.activeOwner);
    if (scoped?.leases.length) {
      return { ...scoped, owners: all.owners, owner: all.activeOwner };
    }
    return all.leases.length ? { ...all, owner: null } : null;
  } catch {
    return null;
  }
}
