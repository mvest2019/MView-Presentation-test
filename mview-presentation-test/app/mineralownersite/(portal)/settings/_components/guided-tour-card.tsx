import { Badge } from "../../../_components/ui/badge";
import { PortalButtonLink } from "../../../_components/ui/button";
import { SETTINGS_SECTIONS, guidedTour } from "../_lib/settings-data";
import { SettingsCard } from "./settings-card";

/**
 * GUIDED TOUR — replay the one-time walkthrough.  (v11)
 *
 * ── THE SECOND SENTENCE IS WHY THIS CARD EXISTS ──
 *
 * "or showing a family member around". Mineral rights are inherited, and the
 * person holding the account is regularly explaining it to a sibling, a parent
 * or a co-owner who has never seen it. A tour that can only be taken once, on
 * the first visit, is useless for that — so it is replayable, and it says so
 * where somebody would come looking.
 *
 * NEW ACCOUNTS START IN ESSENTIALS, which the card also states. That is the
 * product default from the retention brief, not a fact about this reader, and
 * it belongs beside the tour because the two together are what a new owner
 * meets.
 *
 * `?tour=1` on the Dashboard is the design's own deep link.
 */
export function GuidedTourCard() {
  return (
    <SettingsCard
      section={SETTINGS_SECTIONS.tour}
      action={
        <Badge tone="slate" size="xs">
          {guidedTour.duration}
        </Badge>
      }
    >
      <p className="mt-1.5 mb-2.5 text-[11px] leading-[1.55] text-mv-muted">
        {guidedTour.body} <strong>{guidedTour.defaultTier}</strong>{" "}
        {guidedTour.bodyTail}
      </p>
      <PortalButtonLink
        variant="ghost"
        size="sm"
        href={{ pathname: "/mineralownersite", query: { tour: "1" } }}
      >
        {guidedTour.cta}
      </PortalButtonLink>
    </SettingsCard>
  );
}
