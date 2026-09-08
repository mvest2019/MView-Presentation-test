import { PortalLink } from "../../../_components/portal-link";
import { KpiTile } from "../../../_components/ui/kpi-tile";
import { gates } from "../../../_components/ui/portal-gating";
import { SETTINGS_SECTIONS, credits } from "../_lib/settings-data";
import { SettingsCard } from "./settings-card";

/**
 * CREDITS & REFERRALS — what referring a co-owner earned, and what it is worth.
 *
 * ── THE TWO FIGURES ARE KPI TILES BECAUSE THEY ARE THE SAME KIND OF CLAIM ──
 *
 * `KpiTile` requires a basis line, and the note in that component says why:
 * every number in this product is measured, derived or modelled, and a figure
 * with no stated basis gets read as money somebody will be paid. Both tiles
 * here are dollars that are NOT money — they are account credit — which makes
 * this exactly the card where that rule earns its keep.
 *
 * ── THE FOOTNOTE IS THE CARD'S REAL CONTENT ──
 *
 * Three constraints, in the design's own words: free signups earn no credit,
 * credits are not cash, and a credit is never a "free month". Each is a
 * question support would otherwise answer one owner at a time, and a referral
 * scheme that is vague about any of them is one that will be argued about.
 *
 * `nc-hide` — a visitor with no claim has no referrals to report, and `hide-s`
 * keeps a ledger off the plain-English view. Both are the design's.
 */
export function CreditsCard() {
  return (
    <SettingsCard
      section={SETTINGS_SECTIONS.credits}
      gate={gates("hideInEssentials", "hideInUnclaimed")}
      action={
        <PortalLink
          href="/mineralownersite/invite"
          className="text-[13px] font-semibold"
        >
          {credits.invite}
        </PortalLink>
      }
    >
      <div className="my-3 grid gap-2.5 min-[560px]:grid-cols-2">
        <KpiTile
          label={credits.available.label}
          value={credits.available.value}
          basis={
            <>
              {credits.available.basisLead}{" "}
              <PortalLink href="/mineralownersite/audit">
                {credits.available.basisLink}
              </PortalLink>
              {credits.available.basisTail}
            </>
          }
        />
        <KpiTile
          label={credits.lifetime.label}
          value={credits.lifetime.value}
          basis={credits.lifetime.basis}
        />
      </div>
      <p className="text-[11px] leading-[1.55] text-mv-muted">
        {credits.footnoteLead}{" "}
        <PortalLink href="/mineralownersite/billing">
          {credits.footnoteLink}
        </PortalLink>
        .
      </p>
    </SettingsCard>
  );
}
