import "server-only";

import { getSessionUser } from "@/lib/session";
import {
  LEASES_PAGE,
  mapLeasesResponse,
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
}

export async function prefetchInviteLeases(): Promise<PrefetchedLeases | null> {
  const user = await getSessionUser();
  if (!user) return null;

  try {
    const params = new URLSearchParams({
      member_id: String(user.id),
      limit: String(LEASES_PAGE),
    });
    const res = await fetch(`${BASE}/api/v1/invite/leases?${params}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(PREFETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const mapped = mapLeasesResponse(await res.json());
    return mapped.leases.length ? mapped : null;
  } catch {
    return null;
  }
}
