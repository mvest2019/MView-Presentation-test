import Link from "next/link";

import {
  portalActions,
  portalActionSets,
  type PortalActionSetKey,
} from "../../_lib/portal-actions";
import { gates } from "./portal-gating";

/**
 * "WHAT DO YOU WANT TO DO NEXT?" — the card every portal route ends with.
 *
 * ── THE SECOND LINE IS THE POINT OF THE CARD ──
 *
 * "No action is a fine choice — nothing here is urgent." A page that ends in
 * four buttons implies the reader is behind on something, and most owners
 * opening their leases are not: the honest answer to a healthy record is to
 * close the tab. Saying so is what makes the buttons an offer rather than a
 * demand, and it is the line most likely to be dropped as redundant.
 *
 * ── THE ACTIONS COME FROM THE ROUTE, NOT FROM THIS COMPONENT ──
 *
 * `setKey` indexes the design's own per-route table — see `portal-actions.ts`.
 * My Leases gets `upgrade`; a lease report gets `ask` instead. That difference
 * is a product judgement about each screen and it belongs in data, not in four
 * hand-picked buttons per page.
 *
 * ── SUPPRESSED IN TWO STATES, FOR TWO DIFFERENT REASONS ──
 *
 * `nc-hide`: these are owner-record decisions — audit this, watch it, invite a
 * co-owner — and none of them means anything against a record nobody has
 * claimed. The prototype's own builder bails out on `body.no-claim`.
 *
 * `hide-u`: Ultra is one headline, one status line and ONE action. A second card
 * offering four more is the opposite of that tier.
 */
export function PortalActionFooter({ setKey }: { setKey: PortalActionSetKey }) {
  const actions = portalActionSets[setKey];

  return (
    <div
      className={`mt-[18px] mb-1 rounded-mv border border-mv-line border-t-[3px] border-t-mv-green bg-mv-card p-[22px] shadow-mv ${gates("hideInUltra")} nc-hide`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-[15px] font-bold">What do you want to do next?</h4>
        <span className="text-[11px] text-mv-muted">
          No action is a fine choice — nothing here is urgent.
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-2">
        {actions.map((id) => {
          const action = portalActions[id];

          if (action.href) {
            return (
              <Link
                key={id}
                href={action.href}
                title={action.hint}
                className="inline-flex items-center gap-2 rounded-[10px] border border-transparent bg-mv-green px-3 py-1.5 text-[13px] font-semibold text-mv-green-ink no-underline transition-[filter] hover:brightness-105"
              >
                {action.label}
              </Link>
            );
          }

          return (
            <span
              key={id}
              aria-disabled="true"
              title={`${action.hint} — not open yet`}
              className="inline-flex cursor-default items-center gap-2 rounded-[10px] border border-mv-line bg-mv-bg px-3 py-1.5 text-[13px] font-semibold text-mv-muted opacity-70"
            >
              {action.label} — soon
            </span>
          );
        })}
      </div>
    </div>
  );
}
