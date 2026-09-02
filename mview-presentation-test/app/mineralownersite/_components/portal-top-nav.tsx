"use client";

import Link from "next/link";

import { alertCounts } from "../alerts/_lib/alert-counts";
import { PortalDemoStateMenu } from "./portal-demo-state-menu";
import { PortalIcon } from "./portal-icon";
import { PortalProfileMenu } from "./portal-profile-menu";
import { usePortalState } from "./portal-state-provider";
import { demoDisclosure } from "../_lib/portal-demo-data";
import { FUNNEL_PLAN } from "../_lib/portal-state";

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
 *   The demo state menu, which picks any of the five funnel states.
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

      {/* v50 · D-012 — the five states in FUNNEL order: unclaimed → claimed →
          trial → lapsed → paid. The button names the state you are IN, and the
          dropdown lets you pick any of them directly. */}
      <PortalDemoStateMenu />

      {/* THE BELL IS A LINK NOW that the Alerts module exists — it was an inert
          span reporting a count it could not open.

          The count is `alertCounts.unread`, the same derived figure the sidebar
          row uses, and it replaced a literal `6` written here and again in
          `portal-nav.ts` while the inbox itself carried seven unread rows. Three
          copies of one number is how a badge starts lying; see the note on the
          Alerts row in `portal-nav.ts`. */}
      <Link
        href="/mineralownersite/alerts"
        className="bellbtn"
        aria-label={`Alerts — ${alertCounts.unread} unread`}
        title={`Alerts — ${alertCounts.unread} unread`}
      >
        <PortalIcon name="bell" />
        <span className="bdg">{alertCounts.unread}</span>
      </Link>

      {/* v36 · #67 — a quiet link to Billing & Plan, not a second CTA. Unbuilt,
          so it states the plan and goes nowhere for now. */}
      <span className="plan-pill" title="Your plan">
        {FUNNEL_PLAN[funnelState]}
      </span>

      <PortalProfileMenu />
    </div>
  );
}
