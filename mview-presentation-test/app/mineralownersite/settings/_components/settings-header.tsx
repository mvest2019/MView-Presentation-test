import { Notice } from "../../_components/ui/notice";
import { PortalLink } from "../../_components/portal-link";
import { gates } from "../../_components/ui/portal-gating";
import { settingsMeta, unclaimedNotice } from "../_lib/settings-data";
import { RecommendedSettingsButton } from "./recommended-button";

/**
 * THE PAGE HEAD — the title, what the page confirms, and the one button.
 *
 * The strapline's last clause is doing work: "every change confirms itself with
 * a Saved ✓". There is no Save button anywhere on this page, and a settings
 * screen with no Save button is either instant or broken — saying which is what
 * stops a reader hunting for one. `SettingsStateProvider` is the half of that
 * promise that has to be kept.
 */
export function SettingsHeader() {
  return (
    <div className="mb-2.5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-2xl font-bold">{settingsMeta.title}</h2>
        <p className="mt-0.5 text-[13px] leading-[1.5] text-mv-muted">
          {settingsMeta.strapline}
        </p>
      </div>
      {/* v36 · #11. It sits in the head because it is the page's one shortcut,
          not one card's action. `shrink-0` keeps it whole when the strapline
          wraps — it was the strapline's last word that pushed it off-line. */}
      <div className="shrink-0">
        <RecommendedSettingsButton />
      </div>
    </div>
  );
}

/**
 * THE NO-CLAIM BANNER  (v9)
 *
 * SETTINGS IS THE ONE ROUTE THAT STAYS FULLY USABLE WITHOUT A CLAIM, and this
 * banner is the whole of its unclaimed treatment. It carries `nc-only` but NOT
 * `nc-swap`, which is the difference between a note and a page replacement:
 * every card below it still renders and still works.
 *
 * That is a product decision worth not undoing by reflex. Delivery, privacy and
 * notification preferences are about the PERSON, not about a mineral record —
 * there is nothing to withhold — and a visitor who sets them up before claiming
 * has already invested in the account. The three items that genuinely cannot
 * work yet are named in the sentence rather than hidden.
 */
export function UnclaimedSettingsNotice() {
  return (
    <Notice tone="slate" glyph="ⓘ" className={`${gates("unclaimedOnly")} mb-3.5`}>
      <strong>{unclaimedNotice.lead}</strong> {unclaimedNotice.body}{" "}
      <PortalLink href="/claim">{unclaimedNotice.linkText}</PortalLink>.
    </Notice>
  );
}
