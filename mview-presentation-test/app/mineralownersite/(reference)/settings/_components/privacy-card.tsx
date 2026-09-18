import Link from "next/link";

import { PortalButton } from "../../../_components/ui/button";
import { SETTINGS_SECTIONS, privacyCard } from "../_lib/settings-data";
import { SettingRow } from "./setting-row";
import { SettingsCard } from "./settings-card";

/**
 * PRIVACY — and the sentence at the foot of it that is not a setting.
 *
 * ── THE CARD'S SHAPE IS ITS ARGUMENT ──
 *
 * Three controls, in the order a worried owner asks about them: who can see my
 * documents, can I get my data out, and can I leave. Advisor sharing first
 * because it is the only one that grants somebody else access; deletion last
 * and in red, because it is the one that cannot be taken back.
 *
 * ── THE DELETION ROW TELLS THE READER WHAT SURVIVES ──
 *
 * "invoices and the consent log are kept as tax/legal records". A delete button
 * that implies everything vanishes and then keeps the invoices is a promise
 * broken at the worst possible moment, so the exception is named in the row and
 * the full retention schedule is one link away. It is styled destructive but
 * worded as a REQUEST — nothing on this page can delete an account on its own.
 *
 * ── "PRODUCT RULE, NOT A TOGGLE" ──
 *
 * Mineral View does not sell owner data, and the design prints that here rather
 * than only in the policy. The label matters as much as the sentence: an owner
 * who saw it as a switch would reasonably wonder what happens if it defaults
 * back on. Calling it a rule says there is no switch to flip — and the link
 * goes to where it is defined exactly, including the parts a one-liner cannot
 * carry (processors, legal process, AI training).
 *
 * `/privacy` is a marketing route and is built, so both links here are real.
 */
export function PrivacyCard() {
  return (
    <SettingsCard section={SETTINGS_SECTIONS.privacy} accent="green">
      <p className="my-2 text-[11px] leading-[1.55] text-mv-muted">
        {privacyCard.lead}
      </p>

      {privacyCard.rows.map((row) => (
        <SettingRow
          key={row.id}
          label={row.label}
          hint={row.hint}
          control={
            <PortalButton size="sm">{row.action}</PortalButton>
          }
        />
      ))}

      <SettingRow
        label={privacyCard.deletion.label}
        hint={
          <>
            {privacyCard.deletion.hint}{" "}
            <Link href="/privacy-policy">{privacyCard.deletion.hintLink}</Link>
          </>
        }
        control={
          /* Red text on the ghost button, which is the design's own treatment:
             a destructive action should not be a filled red button sitting a
             mis-click away from three harmless ones. */
          <PortalButton size="sm" className="!text-mv-red">
            {privacyCard.deletion.action}
          </PortalButton>
        }
      />

      <p className="mt-2 text-[11px] leading-[1.55] text-mv-muted">
        <strong>{privacyCard.ruleLead}</strong> {privacyCard.ruleBody}{" "}
        <Link href="/privacy-policy">{privacyCard.ruleLink}</Link>
        {privacyCard.ruleTail}
      </p>
    </SettingsCard>
  );
}
