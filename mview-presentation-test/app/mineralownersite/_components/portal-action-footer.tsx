"use client";

import { usePathname } from "next/navigation";

import { PortalLink } from "./portal-link";
import {
  ACTION_FOOTER_COPY,
  OWNER_ACTIONS,
  ROUTE_ACTIONS,
} from "../_lib/portal-page-furniture";

/**
 * "What do you want to do next?" — v32 · C4, v40 · A6-ICONS.
 *
 * THE SECOND LINE IS THE COMPONENT. "No action is a fine choice — nothing here
 * is urgent" sits beside the heading, at the foot of every major page, and it
 * is the reason this footer is not a nag. A portal that ends every screen with
 * three calls to action teaches an owner that something is always wrong; this
 * one ends by saying that doing nothing is a legitimate answer — which is the
 * same thing the rest of the product says when it reports a quiet week as a
 * result rather than an empty state.
 *
 * THE SET FOLLOWS THE PAGE. Activities ends in watch / map / ask because its
 * content is filings and neighbours. The report ends in audit / watch / map
 * because its content raises one question only the owner's own paperwork can
 * settle. A single shared set of buttons would make the footer furniture; a
 * route-specific one makes it the answer to "I have read this, now what?".
 *
 * `.nc-hide` — IT DOES NOT RENDER WHILE UNCLAIMED. The reference returns early
 * on `no-claim` with the reason in one line: actions are owner-record
 * decisions, and a visitor has no record to decide about. Their one action is
 * the claim rail at the top of the page, and offering four more here would
 * compete with it.
 *
 * `wr-noprint` — it is navigation, so it never reaches paper.
 *
 * UNBUILT DESTINATIONS DEGRADE, they do not 404: `PortalLink` renders the ones
 * whose modules have not shipped as inert text. Today that is most of them,
 * which is honest — and each becomes a real button the moment its route is
 * added to `portal-routes.ts`.
 */
export function PortalActionFooter() {
  const pathname = usePathname();
  const keys = ROUTE_ACTIONS[pathname];

  if (!keys) return null;

  return (
    <div
      className="mv-action-footer card card-pad nc-hide wr-noprint"
      role="complementary"
      aria-label="What to do next"
    >
      <div className="mv-action-head">
        <strong>{ACTION_FOOTER_COPY.heading}</strong>
        <span className="tiny muted">{ACTION_FOOTER_COPY.reassurance}</span>
      </div>

      <div className="flex mv-action-row">
        {keys.map((key) => {
          const action = OWNER_ACTIONS[key];
          if (!action) return null;
          return (
            <PortalLink
              key={action.key}
              href={action.href}
              className="btn btn-ghost btn-sm"
            >
              {action.label}
            </PortalLink>
          );
        })}
      </div>
    </div>
  );
}
