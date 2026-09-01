"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { PortalIcon } from "./portal-icon";
import { PortalProfileMenu } from "./portal-profile-menu";
import { usePortalState } from "./portal-state-provider";
import { demoDisclosure } from "../_lib/portal-demo-data";
import {
  FUNNEL_LABEL,
  FUNNEL_PLAN,
  nextFunnelState,
} from "../_lib/portal-state";

/**
 * The portal top bar.
 *
 * LEFT TO RIGHT, and every slot is the design's:
 *
 *   The hamburger — mobile only, opens the drawer.
 *   The page name.
 *   The "Fictional demo" chip — mobile only, where the sidebar foot's
 *     disclosure is off screen. Every screen has to say the account is not real.
 *   A spacer.
 *   The demo state cycler, which walks the five funnel states in funnel order.
 *   The alerts bell with its unread badge.
 *   The plan pill.
 *   The avatar and its account menu.
 *
 * WHAT IS NOT HERE, on purpose:
 *
 *   THE FOUR-VIEW TOGGLE. v41 · AUDIT #1 (Ryan 2026-07-15) took it off every
 *   page's top bar; it lives in the account menu and in Settings, and pages
 *   simply render the owner's chosen density. Putting it back on the bar undoes
 *   that decision.
 *
 *   A SECOND "MANAGE PLAN" BUTTON. v36 · #67 — there is ONE Manage Plan action
 *   and it is on Billing & Plan. The plan pill is a quiet link to that page, not
 *   a competing CTA.
 */
export function PortalTopNav({
  pageName,
  onOpenDrawer,
}: {
  pageName: string;
  onOpenDrawer: () => void;
}) {
  const { funnelState } = usePortalState();
  const pathname = usePathname();
  const params = useSearchParams();

  // The cycler is a LINK to the next state rather than a click handler: the
  // state is a URL parameter, so walking the funnel stays bookmarkable and the
  // browser's Back button steps back through the states.
  const next = nextFunnelState(funnelState);
  const nextParams = new URLSearchParams(params.toString());
  nextParams.set("state", next);
  const cyclerHref = `${pathname}?${nextParams.toString()}`;

  return (
    <div className="app-top">
      <button
        type="button"
        className="app-hamburger"
        onClick={onOpenDrawer}
        aria-label="Open portal menu"
      >
        <svg
          className="mvi"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <span className="pagename">{pageName}</span>

      <span className="mv-demochip" title={demoDisclosure.ribbon}>
        {demoDisclosure.chip}
      </span>

      <span className="spacer" />

      {/* v50 · D-012 — the cycler walks five states in FUNNEL order:
          unclaimed → claimed → trial → lapsed → paid. The label names the
          state you are IN, not the one you are going to. */}
      <Link
        href={cyclerHref}
        className="btn btn-ghost btn-sm"
        title="Prototype demo — walk the five owner funnel states"
        scroll={false}
      >
        {FUNNEL_LABEL[funnelState]} ▾
      </Link>

      {/* The Alerts module is not built, so the bell reports the count without
          claiming to open anything. It becomes a Link the moment that page
          lands. `aria-disabled` so the count is still announced but the control
          is not offered as actionable. */}
      <span
        className="bellbtn"
        aria-disabled="true"
        aria-label="Alerts — 6 unread. Not open yet."
        title="Alerts — 6 unread · this part of your portal is not open yet"
      >
        <PortalIcon name="bell" />
        <span className="bdg">6</span>
      </span>

      {/* v36 · #67 — a quiet link to Billing & Plan, not a second CTA. Unbuilt,
          so it states the plan and goes nowhere for now. */}
      <span className="plan-pill" title="Your plan">
        {FUNNEL_PLAN[funnelState]}
      </span>

      <PortalProfileMenu />
    </div>
  );
}
