import { PortalLink } from "../../_components/portal-link";
import { StatRow } from "../../_components/ui/card";
import { PrototypeButton } from "../../_components/ui/prototype-button";
import { gates } from "../../_components/ui/portal-gating";
import {
  SETTINGS_SECTIONS,
  accountPlan,
  accountRows,
  activeOwnerRecord,
  unclaimedAccount,
  unclaimedAccountRows,
} from "../_lib/settings-data";
import { SettingRow } from "./setting-row";
import { SettingsAnchor, SettingsCard } from "./settings-card";

/**
 * ACCOUNT — two cards, and only ever one of them on screen.
 *
 * ── WHY THIS IS A SWAP AND NOT A CONDITIONAL  (v26 · S3, a P0) ──
 *
 * The claimed card names a real person, a real owner record and a paid plan.
 * The funnel state is a CSS class on the portal root, so a single card with
 * gated rows would still have shipped "Suzie Smith", "SMITH, RAYMOND E" and
 * "Premium" inside the markup of a page served to a visitor who has claimed
 * nothing — visible in view-source, and one missing class away from visible on
 * screen.
 *
 * So there are two cards. The claimed one carries `nc-hide` and the free one
 * `nc-only`, and the free one contains no owner data to leak. That is why this
 * file renders both rather than picking.
 *
 * ── IT DUPLICATES NAME AND EMAIL FROM THE PROFILE CARD, ON PURPOSE ──
 *
 * Profile & contact is where they are EDITED; this is where the account is
 * described, alongside the record and the plan. An owner checking which record
 * is active should not have to read a form to find out who they are logged in
 * as, and the two are far enough apart on the page that neither reads as a
 * repeat of the other.
 */
export function AccountCards() {
  return (
    <SettingsAnchor section={SETTINGS_SECTIONS.account}>
      <ClaimedAccountCard />
      <UnclaimedAccountCard />
    </SettingsAnchor>
  );
}

function ClaimedAccountCard() {
  return (
    <SettingsCard
      section={SETTINGS_SECTIONS.account}
      gate={gates("hideInUnclaimed")}
      anchored={false}
    >
      {accountRows.map((row) => (
        <StatRow key={row.label} label={<strong className="text-[13px]">{row.label}</strong>} value={<span className="text-[13px]">{row.value}</span>} />
      ))}

      {/* v35 · feedback 38 — Switch Owner lives here as well as in the top bar.
          The seven-day lock is in the hint rather than discovered on the second
          attempt: an owner who manages three family records needs to know the
          choice has a cost BEFORE making it. */}
      <SettingRow
        label={activeOwnerRecord.label}
        hint={activeOwnerRecord.hint}
        control={
          <span className="inline-flex flex-wrap items-center gap-2 rounded-full border-[1.5px] border-mv-green bg-mv-card py-[5px] pr-2 pl-[13px] text-[12.5px] font-bold text-mv-green-ink">
            {activeOwnerRecord.value}
            <PrototypeButton
              acknowledgement={activeOwnerRecord.acknowledgement}
              title={activeOwnerRecord.switchTitle}
              variant="mint"
              size="sm"
              className="!rounded-full !border-0 !px-[9px] !py-[3px] !text-[10.5px]"
            >
              {activeOwnerRecord.switchLabel}
            </PrototypeButton>
          </span>
        }
      />

      <StatRow
        label={<strong className="text-[13px]">{accountPlan.label}</strong>}
        value={
          <PortalLink
            href="/mineralownersite/billing"
            className="text-[13px] font-semibold"
          >
            {accountPlan.value}
          </PortalLink>
        }
      />
    </SettingsCard>
  );
}

/**
 * THE SAME CARD FOR A VISITOR WITH NO CLAIM — and no owner data in it.
 *
 * Every line points at the one thing that would make the rest of the portal
 * real: "None yet — claim your record →". The plan line says "Free · $0
 * forever", which is the design's standing promise and not a trial countdown;
 * a visitor being told their free tier expires is the fastest way to lose them.
 *
 * It carries the same heading as the claimed card and neither carries the id:
 * both are in the DOM at once, so a shared id would be a duplicate. The anchor
 * lives on `SettingsAnchor` one level out, which is also what keeps the jump
 * chip working in both states — see the note there.
 */
function UnclaimedAccountCard() {
  return (
    <SettingsCard
      section={SETTINGS_SECTIONS.account}
      gate={gates("unclaimedOnly")}
      anchored={false}
    >
      {unclaimedAccountRows.map((row) => (
        <StatRow key={row.label} label={<strong className="text-[13px]">{row.label}</strong>} value={<span className="text-[13px]">{row.value}</span>} />
      ))}

      <SettingRow
        label={unclaimedAccount.record.label}
        hint={unclaimedAccount.record.hint}
        control={
          <PortalLink
            href={unclaimedAccount.record.href}
            className="text-[13px] font-semibold"
          >
            {unclaimedAccount.record.value}
          </PortalLink>
        }
      />

      <StatRow
        label={<strong className="text-[13px]">{unclaimedAccount.plan.label}</strong>}
        value={
          <PortalLink
            href="/mineralownersite/billing"
            className="text-[13px] font-semibold"
          >
            {unclaimedAccount.plan.value}
          </PortalLink>
        }
      />
    </SettingsCard>
  );
}
