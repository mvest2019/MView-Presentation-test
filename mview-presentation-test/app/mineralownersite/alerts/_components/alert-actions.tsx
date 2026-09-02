import { PortalButtonLink } from "../../_components/ui/button";
import { PrototypeButton } from "../../_components/ui/prototype-button";
import type { AlertAction } from "../_lib/alert-types";

/**
 * THE BUTTON ROW UNDER AN ALERT — one to three of them, never more.
 *
 * ── EVERY ALERT ENDS IN A DOOR, AND THAT IS THE PRODUCT PROMISE ──
 *
 * The page's own subtitle is "each alert links to the exact screen it's about".
 * An inbox that tells you eleven permits were filed and then leaves you to find
 * the map yourself has moved the work rather than done it. So a row with no
 * action is a row that should not have been sent.
 *
 * ── THREE KINDS OF BUTTON, AND THE DIFFERENCE IS HONESTY ──
 *
 *   `href`           the destination exists. A real link.
 *   `acknowledgement` the destination does not exist yet. A real, enabled button
 *                    that admits it — see `PrototypeButton` for why that beats a
 *                    greyed-out "— soon" label on a control whose weight a design
 *                    review needs to be able to judge.
 *   `dismissal`      not a destination at all. "Not mine — dismiss for good" is a
 *                    decision the reader makes about the alert itself, and its
 *                    confirmation is a promise about future alerts rather than a
 *                    receipt for this one. The wording differs for that reason
 *                    and it is the design's own.
 *
 * `dismissal` still renders through `PrototypeButton`, because that is exactly
 * what it is: a control whose real behaviour needs somewhere to persist the
 * decision, and there is nowhere yet. Being clear about that is better than a
 * button that appears to remember and forgets on reload.
 */
export function AlertActions({ actions }: { actions: AlertAction[] }) {
  if (actions.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-wrap gap-2">
      {actions.map((action) => {
        if (action.href) {
          return (
            <PortalButtonLink
              key={action.label}
              size="sm"
              variant={action.variant ?? "ghost"}
              href={action.href}
            >
              {action.label}
            </PortalButtonLink>
          );
        }

        return (
          <PrototypeButton
            key={action.label}
            size="sm"
            variant={action.variant ?? "ghost"}
            acknowledgement={
              action.dismissal ??
              action.acknowledgement ??
              `${action.label} ✓ (prototype)`
            }
          >
            {action.label}
          </PrototypeButton>
        );
      })}
    </div>
  );
}
