import type { Metadata } from "next";

import Portal from "../../_components/reference/Portal";
import {
  getOwnerPayload,
  type OwnerSelection,
} from "../../_lib/reference/owner-data";
import type { Payload } from "../../_lib/reference/payload";
import "./settings.css";
import "../../reference-flex-reset.css";
import "../../page-gutters.css";

import { AccountCards } from "./_components/account-card";
import { AdvancedCard } from "./_components/advanced-card";
import { AlertPreferencesCard } from "./_components/alert-preferences-card";
import { CreditsCard } from "./_components/credits-card";
import { DeliveryCard } from "./_components/delivery-card";
import { GuidedTourCard } from "./_components/guided-tour-card";
import { NotificationsCard } from "./_components/notifications-card";
import { PrivacyCard } from "./_components/privacy-card";
import { ProfileCard } from "./_components/profile-card";
import { QuietWeekCard } from "./_components/quiet-week-card";
import {
  SettingsHeader,
  UnclaimedSettingsNotice,
} from "./_components/settings-header";
import { SettingsHashTarget } from "./_components/hash-target";
import { SettingsJumpNav } from "./_components/settings-jump-nav";
import { UltraSettings } from "./_components/ultra-settings";
import { ViewCard } from "./_components/view-card";

/**
 * SETTINGS — `/mineralownersite/settings`.
 *
 * Converted from the redesign prototype's `owner/src/routes/app-settings.html`
 * (158 lines of markup, plus behaviour spread across `route-groups.js`,
 * `route-groups-3.js` and `v33js.js`) into React server components, Tailwind
 * and the portal's own primitives. `settings/README.md` carries the full map;
 * this header is the two decisions a reader of the page needs first.
 *
 * ── THIS IS THE UI PASS: NOTHING HERE IS WIRED ──
 *
 * Every component under this route is a SERVER component and the page ships no
 * JavaScript of its own. The switches, the channel chips, the two Recommended
 * buttons and the profile form render the positions their data gives them and
 * do nothing when pressed. The controls are real `<button>`s and real inputs
 * carrying the right roles and ARIA state, so wiring each one is adding a
 * handler rather than rebuilding it.
 *
 * ONE THING THE FUNCTIONALITY PASS SHOULD KNOW BEFORE IT STARTS. "Use
 * Recommended Settings" is rendered TWICE — in the page head and in the Ultra
 * card — and one press has to reach three rows in the Notifications card and
 * every channel on three rows in Alert preferences. That is four components,
 * so the positions will have to be shared state rather than local to each
 * control. Which rows it covers is already recorded, as the `recommended` flag
 * in `_lib/settings-data.ts`.
 *
 * ── WHY THE TOP-LEVEL SECTIONS ARE FLAT ──
 *
 * `portal.css` gates this page in two ways that both select DIRECT CHILDREN of
 * `.mv-dash-routes`: Ultra hides every sibling of the `tier-u` card, and the
 * unclaimed swap hides every sibling of an `.nc-swap` panel. Wrapping the
 * cards in a layout div would put them out of reach of both, and the page would
 * render eleven cards at Ultra. The two-column grid IS one of those direct
 * children, which is why the columns are inside it and not around it.
 *
 * THIS PAGE IS THE ONE ROUTE THAT STAYS FULLY USABLE WITH NO CLAIM — a banner,
 * not a swap. `UnclaimedSettingsNotice` says why.
 *
 * ── IT WEARS THE REFERENCE SHELL, WHICH IS WHY IT MOVED GROUPS ──
 *
 * This page was under `(portal)`, whose layout stacks its own white top bar, a
 * pinned value bar and a funnel bar. Alerts, the Dashboard, Activities, Invite
 * and Billing all wear `Chrome` instead — the reference build's single dark bar
 * carrying the account state, the spot prices and the avatar. Two shells over
 * one URL space meant the sidebar led to two different-looking products
 * depending on which row you pressed.
 *
 * A shell is not a per-page setting, so the page came to the shell rather than
 * the shell to the page — the same move Invite made, for the same reason and by
 * the same mechanism. The folder changed route GROUP only: `(portal)` and
 * `(reference)` are both invisible to the router, so the URL is unchanged.
 *
 * ── THE GATE CLASSES SURVIVED THE MOVE UNTOUCHED ──
 *
 * `gates()` writes `tier-s`, `tier-p`, `hide-s`, `nc-only` and friends, and
 * those were `portal.css`'s. `dashboard-reference.css` defines the same set with
 * the same semantics under its own root — `.mv-ref-app:not(.view-simple)
 * .tier-s` against `.mv-portal:not(.view-simple) .tier-s` — and `Portal` writes
 * `view-*` and `no-claim` onto that root exactly as `PortalShell` did onto
 * its own. So every density and claim gate on this page keeps working and not
 * one component needed editing.
 *
 * ── EXCEPT THE PAGE ROOT, WHICH HAD TO BECOME A ROUTE SECTION ──
 *
 * The one rule that differs is the unclaimed SWAP and the Ultra collapse:
 *
 *   portal.css   `.mv-portal.no-claim .mv-dash-routes:has(> .nc-swap) > :not(.nc-only)`
 *   reference    `.mv-ref-app.no-claim section[data-route].active:has(> .nc-swap) > :not(.nc-only)`
 *
 * The reference's version selects children of a route `<section>`, which is
 * exactly the trap `InviteView` documents: a page that brings its own view
 * through `children` is never inside one, so the rule would match nothing and
 * fail SILENTLY. The page root is that section now, so both rules resolve.
 *
 * ── THE OWNER PAYLOAD IS FOR THE CHROME, NOT FOR THIS PAGE ──
 *
 * Nothing here reads `initial`. It is loaded because the SHELL reads it — the
 * value in the bar, the owner picker and the sidebar foot all come off that one
 * snapshot. `Portal` skips its "no owner is loaded yet" card precisely when a
 * page brought its own view, so a failed read costs the bar its figures and
 * nothing else.
 *
 * `force-dynamic` for the reason every page in this group sets it: the owner
 * comes off the query string, so there is nothing correct to cache.
 */
export const metadata: Metadata = {
  title: "Settings",
  description:
    "Delivery, notifications, alert channels, credits and privacy — every change saves immediately.",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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

  let initial: Payload | null = null;
  try {
    initial = await getOwnerPayload(sel);
  } catch {
    /* Only the chrome reads this — see the note above. */
    initial = null;
  }

  return (
    <Portal route={null} initial={initial} shellClass="mv-wide-gutters">
      <section data-route="app-settings" className="active">
        {/* THE FRAGMENT IN THE URL IS AN INSTRUCTION — see `SettingsHashTarget`.
            "Alert preferences" on the Alerts page links 2,400px down this page,
            and a client navigation can commit before the card exists. */}
        <SettingsHashTarget />

        {/* v9 — the no-claim banner. `nc-only` and deliberately NOT `nc-swap`. */}
        <UnclaimedSettingsNotice />

        {/* v41 · AUDIT #2 — Ultra's whole page. Everything below is hidden by
            `portal.css` while this card is showing. */}
        <UltraSettings />

        <SettingsHeader />

        {/* v33 · H18/H19 — the section map, for a page this long. */}
        <SettingsJumpNav />

        {/*
          THE TWO COLUMNS, AND WHY THEY ARE SPLIT WHERE THEY ARE.

          `items-start` is load-bearing: grid items stretch to the tallest row by
          default, so without it every card in the shorter column grows to match
          the taller one and the page fills with cards holding four rows in
          eighteen rows of white. That is the misalignment the design's own
          `align-items:start` was there to prevent.

          LEFT IS HOW THE PRODUCT PRESENTS ITSELF AND WHAT IT SENDS YOU — view,
          the guided tour, delivery, quiet weeks, notifications, alert channels.
          RIGHT IS WHO YOU ARE AND WHAT YOU CAN DO ABOUT IT — credits, profile,
          privacy, account, and the Professional surface. The split is by
          subject, not by height, so a reader scanning for "where does my
          report go" only has to read one column.

          THE TOUR SITS UNDER "YOUR VIEW", which is where the delivered design
          puts it (`mineralview-settings-detailed 2.html`, 2026-09-14) and not
          where this page had it — it was the first card of the right column.
          The design's placement is the better one and the move is not merely
          cosmetic: the tour card's own copy ends "New accounts start in the
          Essentials view with the tour offered once", so it is describing the
          card directly above it. From the right column that sentence referred
          to a control the reader had to go and find.

          One column below 1024px, in the design's own order: the whole left
          column, then the whole right one. That keeps the four cards that hold
          switches together on a phone rather than interleaving them with the
          account furniture.
        */}
        <div className="grid grid-cols-1 items-start gap-[18px] min-[1024px]:grid-cols-2">
          <div className="flex flex-col gap-[18px]">
            <ViewCard />
            <GuidedTourCard />
            <DeliveryCard />
            <QuietWeekCard />
            <NotificationsCard />
            <AlertPreferencesCard />
          </div>

          <div className="flex flex-col gap-[18px]">
            <CreditsCard />
            <ProfileCard />
            <PrivacyCard />
            {/* v26 · S3 — two cards, one per claim state, sharing one anchor so
                the jump chip lands in both. Only ever one shows. */}
            <AccountCards />
            <AdvancedCard />
          </div>
        </div>
      </section>
    </Portal>
  );
}
