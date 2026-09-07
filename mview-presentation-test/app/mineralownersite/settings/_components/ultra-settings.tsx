import { Card } from "../../_components/ui/card";
import { ViewTierLink } from "../../_components/ui/view-tier-link";
import { gates } from "../../_components/ui/portal-gating";
import { ultraSettings } from "../_lib/settings-data";
import { RecommendedSettingsButton } from "./recommended-button";

/**
 * SETTINGS AT ULTRA — one card, two sentences, two buttons.  (v41 · AUDIT #2)
 *
 * `portal.css` hides every sibling of a `tier-u` element inside
 * `.mv-dash-routes`, so this card IS the page for a reader on the calmest view.
 * Everything below it — eleven cards, forty-one switches, a channel matrix —
 * simply is not there.
 *
 * ── WHY IT STATES THE TWO SETTINGS RATHER THAN OFFERING THEM ──
 *
 * The reader Ultra is assigned to is the one the dossier has tagged as
 * overwhelmed or low-engagement. Handing them a shorter list of controls would
 * still be a list of controls. So the card TELLS them where their report goes
 * and which view they are on, and offers exactly two next steps: accept the
 * recommended alerts, or ask for a little more page. Both are one press.
 *
 * "Show me a little more" moves to Essentials rather than to Detailed — the
 * next step up, not the far end. `ViewTierLink` carries the current `?state=`
 * across, so a reviewer holding a funnel state keeps it.
 */
export function UltraSettings() {
  return (
    <Card accent className={`${gates("ultraOnly")} mb-3.5`}>
      <h3 className="mb-1.5 text-base font-bold">{ultraSettings.heading}</h3>
      <p className="mt-0 mb-2.5 text-[15px] leading-[1.55]">
        {ultraSettings.deliveryLead}{" "}
        <strong>{ultraSettings.delivery}</strong>
        {ultraSettings.viewLead} <strong>{ultraSettings.view}</strong>
        {ultraSettings.tail}
      </p>
      <div className="flex flex-wrap gap-2">
        <RecommendedSettingsButton size="md" />
        <ViewTierLink tier="simple" size="md">
          {ultraSettings.more}
        </ViewTierLink>
      </div>
    </Card>
  );
}
