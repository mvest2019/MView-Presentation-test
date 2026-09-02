import {
  portalActions,
  portalActionSets,
  type PortalActionSetKey,
} from "../../_lib/portal-actions";
import { PortalButtonLink } from "./button";
import { gates } from "./portal-gating";
import { PrototypeButton } from "./prototype-button";

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

      {/*
        ALL FOUR ARE GHOST BUTTONS, none emphasised and none disabled — the
        design builds every chip in this row as `btn btn-ghost btn-sm`. Giving
        the Lease Audit a green fill made it the page's loudest control, which
        contradicts the line directly above it: no action is a fine choice.

        The three without a built destination use the prototype's own
        acknowledgement idiom rather than a greyed-out label. See
        `PrototypeButton` for why that is the honest choice here.
      */}
      <div className="mt-2.5 flex flex-wrap gap-2">
        {actions.map((id) => {
          const action = portalActions[id];

          if (action.href) {
            return (
              <PortalButtonLink
                key={id}
                size="sm"
                href={action.href}
                title={action.hint}
              >
                {action.label}
              </PortalButtonLink>
            );
          }

          return (
            <PrototypeButton
              key={id}
              title={action.hint}
              acknowledgement={`${action.label} — opens here ✓ (prototype)`}
            >
              {action.label}
            </PrototypeButton>
          );
        })}
      </div>
    </div>
  );
}
