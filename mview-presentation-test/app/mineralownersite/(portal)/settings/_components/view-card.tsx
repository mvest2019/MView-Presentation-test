import { PortalLink } from "../../../_components/portal-link";
import { ViewTierSwitch } from "../../../_components/view-tier-switch";
import {
  gates,
  type PortalGate,
} from "../../../_components/ui/portal-gating";
import {
  VIEW_TIERS,
  VIEW_TIER_NAME,
  type ViewTier,
} from "../../../_lib/portal-state";
import { SETTINGS_SECTIONS, viewCard } from "../_lib/settings-data";
import { SettingsCard } from "./settings-card";

/**
 * YOUR VIEW — the four-density switch, and the one place it lives.
 *
 * v41 · AUDIT #1 (Ryan): the switch used to sit on the top bar of every page.
 * It now appears here and in the avatar menu, and every other page simply
 * renders the density the reader chose. Putting it back on the bar would undo
 * that decision, which is why `ViewTierSwitch` says so in its own header.
 *
 * ── THE PARAGRAPH ABOVE THE SWITCH IS THE IMPORTANT PART ──
 *
 * Two claims, and both have to be there. The tier is ASSIGNED from the reader's
 * dossier, and their own choice OVERRIDES it — a product that quietly decides
 * how much you can handle owes you both facts, and the sentence gives them in
 * that order. Then: views change density only, they never hide leases the plan
 * makes visible. Without that line a four-way switch on a page full of plan
 * gates reads as a paywall, and a reader trying to see everything they pay for
 * would sit on Professional whether or not they can read it.
 *
 * ── "SIMPLE" NEVER REACHES THE SCREEN ──
 *
 * The key is `simple`; the name is Essentials. `portal-state.ts` carries the
 * whole contract — the class stays `.view-simple`, the word is derogatory about
 * the reader rather than descriptive of the density, and it must not surface as
 * copy. Everything on this card takes its wording from `VIEW_TIER_NAME`.
 */
export function ViewCard() {
  return (
    <SettingsCard section={SETTINGS_SECTIONS.view} accent="green">
      <p className="mt-1 mb-2.5 text-[11px] leading-[1.55] text-mv-muted">
        {viewCard.lead} <strong>{viewCard.assigned}</strong>{" "}
        {viewCard.currentLead} <CurrentTierName />) — or{" "}
        <strong>{viewCard.choose}</strong>; {viewCard.reassurance}
      </p>

      {/* `compact={false}` — full labels. See the prop's note: the account
          menu's copy shortens them because its panel is 280px wide. */}
      <ViewTierSwitch compact={false} />

      <p className="mt-2 text-[11px] leading-[1.55] text-mv-muted">
        {viewCard.footnote} {viewCard.dossierLead}{" "}
        <PortalLink href="/mineralownersite/dossier">
          {viewCard.dossierLink}
        </PortalLink>
        .
      </p>
    </SettingsCard>
  );
}

/**
 * WHICH DENSITY THE READER IS ON, in words — the design's `#setTierNow`.
 *
 * ALL FOUR NAMES RENDER AND THE TIER GATES SHOW ONE. The prototype rewrote the
 * text node from `setViewTier()`; doing that here would mean a client component
 * reading the provider for a single word, and — because the tier is also a
 * query parameter — a first paint that says "Detailed" before correcting
 * itself. This is the same no-JavaScript mechanism `TierCopy` uses for the
 * portal's four-register strings, and it cannot flash the wrong answer.
 */
function CurrentTierName() {
  /* The gate that shows each tier's own name. Spelled out rather than derived
     from the key, because the class names do not follow from them: `simple` is
     `tier-s` and `pro` is `tier-p`, and a template string would be a silent
     mismatch rather than a type error. */
  const gateFor: Record<ViewTier, PortalGate> = {
    ultra: "ultraOnly",
    simple: "essentialsOnly",
    detailed: "detailedOnly",
    pro: "professionalOnly",
  };

  return (
    <>
      {VIEW_TIERS.map((tier) => (
        <strong key={tier} className={gates(gateFor[tier])}>
          {VIEW_TIER_NAME[tier]}
        </strong>
      ))}
    </>
  );
}
