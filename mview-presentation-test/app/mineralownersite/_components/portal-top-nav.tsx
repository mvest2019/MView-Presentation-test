"use client";

import Image from "next/image";
import Link from "next/link";

import { alertCounts } from "../(portal)/alerts/_lib/alert-counts";
import { PortalDemoStateMenu } from "./portal-demo-state-menu";
import { PortalIcon } from "./portal-icon";
import { PortalProfileMenu } from "./portal-profile-menu";
import { usePortalState } from "./portal-state-provider";
import { demoDisclosure } from "../_lib/portal-demo-data";
import { FUNNEL_PLAN } from "../_lib/portal-state";

/**
 * THE TOP BAR'S LOGO — the real Cloudinary assets, and the ones drawn for a
 * LIGHT ground, because `.app-top` is `#fff`.
 *
 * WHICH FILE MATTERS AND THE PAIRS ARE NOT INTERCHANGEABLE. This is the same
 * distinction `app/_components/site-nav.ts` sets out at length and the same one
 * `portal-side-nav.tsx` records for the rail:
 *
 *   `graphics/mview-logo.png` — green `#00CD95` and BLACK on transparency,
 *   supplied for the white marketing header. Reads on white. This bar is white,
 *   so this is the wordmark it takes.
 *
 *   `icons/mineralview-logo.png` — green "MINERAL" plus WHITE "VIEW". That is
 *   what the sidebar uses, because the rail is `--ink`. Put it here and the word
 *   VIEW disappears into the white bar.
 *
 * `icons/logo.jpg.jpg` is the square icon mark, the same file the marketing
 * header takes at phone width. A JPG, so its black tile is baked in and it wants
 * the circular crop that bounds its inscribed ring — hence `rounded-full`, the
 * marketing header's own treatment of this file.
 *
 * NO CLOUDINARY TRANSFORM ON EITHER, which is a standing instruction (Ryan,
 * 2026-08-13, confirmed after seeing the rendered result). A colour swap is never
 * the fix for a logo that does not read — pick the pair drawn for the ground.
 *
 * DECLARED LOCALLY rather than imported from `site-nav.ts`, for the reason
 * `portal-side-nav.tsx` gives for `SIDEBAR_LOGO`: that module describes the
 * marketing header and footer, and the portal tree stays isolated from it. The
 * intrinsic sizes are the files' real ones, read off the images — `next/image`
 * needs them for the aspect ratio and the rendered size comes from the classes.
 */
const TOP_LOGO = {
  wordmark: {
    src: "https://res.cloudinary.com/mview/image/upload/graphics/mview-logo.png",
    width: 577,
    height: 132,
  },
  mark: {
    src: "https://res.cloudinary.com/mview/image/upload/icons/logo.jpg.jpg",
    width: 63,
    height: 63,
  },
} as const;

/**
 * The portal top bar.
 *
 * LEFT TO RIGHT, and every slot is the design's:
 *
 *   The hamburger — mobile only, opens the drawer.
 *   The logo, linking to the portal's own home.
 *   The page name.
 *   The "Fictional demo" chip — mobile only, where the sidebar foot's
 *     disclosure is off screen. Every screen has to say the account is not real.
 *   A spacer.
 *   The demo state menu, which picks any of the five funnel states.
 *   The alerts bell with its unread badge.
 *   The plan pill.
 *   The avatar and its account menu.
 *
 * THE LOGO, AND WHY IT SWAPS AT THE SIDEBAR'S BREAKPOINT. The bar carried no
 * branding at all, which the rail's wordmark covered on desktop and NOTHING
 * covered below 1024px — that is exactly where `.app-side` goes to
 * `display: none` and the hamburger takes its place, so a phone had no Mineral
 * View mark anywhere on screen. So:
 *
 *   BELOW 1025px the bar shows the full wordmark, which is the branding the
 *   hidden rail took with it.
 *
 *   AT 1025px AND UP it shows the square icon mark instead. The rail's wordmark
 *   is on screen 236px to the left at that width, and a second wordmark beside
 *   it would be the same logo twice in one corner — a change to the design
 *   rather than the missing piece of it. The compact mark reads as the portal's
 *   brand anchor and leaves the page name the room it had.
 *
 * Both are in the markup and CSS picks, which is the marketing header's own
 * approach and is there for the reason it records: choosing in JavaScript would
 * send one from the server and pop the other in after hydration.
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
 *
 *   A SECOND LOG OUT. It is in the account menu, and in the drawer at the widths
 *   with no account menu on screen. A bar-level sign-out button would be a third
 *   copy of one action.
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

      {/* TO THE PORTAL'S HOME, not the public site. The way out to the
          marketing site is the rail's own wordmark and the drawer's "Public
          site" row; a logo in a signed-in app's bar goes to that app's front
          page, and making it leave the portal would be a trap on the control
          people click to get back to their dashboard.

          `alt` on the wordmark and `alt=""` on the mark, so the link is
          announced once and not twice — the marketing header's own arrangement
          for its two toggled images. */}
      <Link
        href="/mineralownersite"
        className="app-brand"
        aria-label="Mineral View — portal home"
      >
        <Image
          src={TOP_LOGO.wordmark.src}
          alt="Mineral View"
          width={TOP_LOGO.wordmark.width}
          height={TOP_LOGO.wordmark.height}
          priority
          className="app-brand-word"
        />
        <Image
          src={TOP_LOGO.mark.src}
          alt=""
          width={TOP_LOGO.mark.width}
          height={TOP_LOGO.mark.height}
          priority
          className="app-brand-mark"
        />
      </Link>

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
