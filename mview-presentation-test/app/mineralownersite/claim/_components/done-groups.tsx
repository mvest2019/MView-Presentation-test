import { ChevronRight, Users } from "lucide-react";

import { PortalLink } from "../../_components/portal-link";
import { Badge } from "../../_components/ui/badge";
import { ownerGroups } from "../_lib/claim-done";
import { DoneIconTile } from "./done-icons";

/**
 * "YOU'VE BEEN AUTO-JOINED TO N GROUPS" — the completion screen's full-width
 * footer, below both columns.
 *
 * ── WHY IT IS NOT IN THE MAIN COLUMN ──
 *
 * It is not part of the receipt. The card above answers "what did I just do";
 * this answers "who am I now in a room with", which is a different question and
 * the only thing on the screen the reader might act on out of curiosity rather
 * than duty. Given the full width it reads as four places to go; squeezed into
 * the left column it would read as a fifth bullet of the summary.
 *
 * ── PRIVATE VS PUBLIC IS THE CHIP, AND IT IS THE POINT ──
 *
 * One of the four is matched to the reader's own leases and carries real
 * constraints ("No operators — ever"). Three are open rooms. Someone about to
 * post a scan of their cheque stub needs that difference legible before they
 * click, not after.
 *
 * ── "VIEW ALL GROUPS" GOES THROUGH `PortalLink` ──
 *
 * The Groups module is not built. `PortalLink` renders an unbuilt destination
 * as inert labelled text rather than a link into a 404 — the convention
 * `portal-routes.ts` sets for the whole portal. The card chevrons are
 * `aria-hidden` for the same reason: a hint, not a control.
 */
export function DoneGroups() {
  return (
    <section aria-label="Groups you were joined to">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="flex items-center gap-[9px] text-[17px] font-extrabold tracking-[-.01em] text-mv-ink">
          <Users
            aria-hidden="true"
            className="h-[18px] w-[18px] text-mv-green-deep"
          />
          You&rsquo;ve been auto-joined to {ownerGroups.length} groups
        </h2>
        <PortalLink
          href="/mineralownersite/groups"
          className="text-[12px] font-semibold text-mv-green-deep"
        >
          View all groups →
        </PortalLink>
      </div>

      <div className="mt-3 grid gap-3 @[720px]:grid-cols-2">
        {ownerGroups.map((group) => (
          <article
            key={group.name}
            className="flex items-start gap-3 rounded-mv border border-mv-line bg-mv-card p-4"
          >
            <DoneIconTile name={group.icon} tone="mint" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-[9px] gap-y-1">
                <h3 className="text-[13px] font-bold text-mv-ink">
                  {group.name}
                </h3>
                <Badge
                  tone={group.visibility === "Private" ? "slate" : "mint"}
                  size="xs"
                >
                  {group.visibility}
                </Badge>
              </div>
              <p className="mt-[5px] text-[11.5px] leading-[1.55] text-mv-muted">
                {group.blurb}
              </p>
            </div>
            <ChevronRight
              aria-hidden="true"
              className="mt-1 h-4 w-4 flex-none text-mv-placeholder"
            />
          </article>
        ))}
      </div>
    </section>
  );
}
