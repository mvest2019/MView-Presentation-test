import {
  getOwnerPayload,
  type OwnerSelection,
} from "../../../_lib/reference/owner-data";
import type { Payload } from "../../../_lib/reference/payload";

/**
 * The owner snapshot the SHARED CHROME needs, read the way every other page in
 * the `(reference)` group reads it.
 *
 * MY LEASES DOES NOT USE THE PAYLOAD ITSELF — its figures come from
 * `leases/_lib/`, as they always have. This is for the header: the owner name
 * in the top bar, the pinned value line and the sidebar foot all come off this
 * snapshot, so without it the page would be the right shell with nothing in the
 * top of it. That is the same reason the Map loads it — see the note there.
 *
 * `null` ON A FAILURE rather than a thrown page. The shell retries on mount
 * when it receives no payload, and My Leases renders perfectly well meanwhile
 * because none of its own content depends on this read.
 *
 * ONE COPY FOR BOTH PAGES — the list and the report — so the two cannot drift
 * about which four parameters name an owner.
 */
export async function loadShellPayload(
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
