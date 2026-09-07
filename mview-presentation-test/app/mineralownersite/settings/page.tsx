import type { Metadata } from "next";

import { gates } from "../_components/ui/portal-gating";
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
 */
export const metadata: Metadata = {
  title: "Settings",
  description:
    "Delivery, notifications, alert channels, credits and privacy — every change saves immediately.",
};

export default function SettingsPage() {
  return (
    <div className={gates("pageRoot")}>
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

        LEFT IS WHAT THE PRODUCT SENDS YOU — view, delivery, quiet weeks,
        notifications, alert channels. RIGHT IS WHO YOU ARE AND WHAT YOU CAN
        DO ABOUT IT — the tour, credits, profile, privacy, account, and the
        Professional surface. The split is by subject, not by height, so a
        reader scanning for "where does my report go" only has to read one
        column.

        One column below 1024px, in the design's own order: the whole left
        column, then the whole right one. That keeps the four cards that hold
        switches together on a phone rather than interleaving them with the
        account furniture.
      */}
      <div className="grid grid-cols-1 items-start gap-[18px] min-[1024px]:grid-cols-2">
        <div className="flex flex-col gap-[18px]">
          <ViewCard />
          <DeliveryCard />
          <QuietWeekCard />
          <NotificationsCard />
          <AlertPreferencesCard />
        </div>

        <div className="flex flex-col gap-[18px]">
          <GuidedTourCard />
          <CreditsCard />
          <ProfileCard />
          <PrivacyCard />
          {/* v26 · S3 — two cards, one per claim state, sharing one anchor so
              the jump chip lands in both. Only ever one shows. */}
          <AccountCards />
          <AdvancedCard />
        </div>
      </div>
    </div>
  );
}
