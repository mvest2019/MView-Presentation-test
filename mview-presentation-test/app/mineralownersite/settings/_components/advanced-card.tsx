import { Badge } from "../../_components/ui/badge";
import { PrototypeButton } from "../../_components/ui/prototype-button";
import { gates } from "../../_components/ui/portal-gating";
import { SETTINGS_SECTIONS, advancedCard } from "../_lib/settings-data";
import { SettingRow } from "./setting-row";
import { SettingToggle } from "./setting-toggle";
import { SettingsCard } from "./settings-card";

/**
 * ADVANCED — PROFESSIONAL: the power-user surface.  (v41 · AUDIT #2)
 *
 * `tier-p`, so it exists only for the reader who chose the densest view. That
 * is the point of the card rather than a limitation of it: a scheduled CSV
 * export, an API token and a 90-day audit log are four rows of noise to an
 * owner who wanted to know when they get paid, and they are the first four
 * things a CPA or a family office looks for.
 *
 * ── DENSITY IS SHOWN AS A CONSEQUENCE, NOT AS A SWITCH ──
 *
 * The last row reads "On — via your view" with no control. It is the one place
 * the two axes meet, and making it a toggle would create a second way to set
 * something the view switch already decides — two controls for one fact, which
 * is how they end up disagreeing. So the row reports the state and names what
 * set it.
 *
 * ── THE TOKEN ROW IS HONEST ABOUT ITS DEPENDENCY ──
 *
 * "wires with the API program" is an `.anno` — an aside about the BUILD, not
 * about the reader's plan. The button is real and acknowledges the press, which
 * is the prototype's own idiom for a control whose backend is not there yet;
 * see `PrototypeButton` for why that beats a greyed-out one.
 */
export function AdvancedCard() {
  return (
    <SettingsCard
      section={SETTINGS_SECTIONS.advanced}
      accent="slate"
      gate={gates("professionalOnly")}
      action={
        <Badge tone="slate" size="xs">
          {advancedCard.badge}
        </Badge>
      }
    >
      <SettingRow
        label={advancedCard.export.label}
        hint={advancedCard.export.hint}
        control={
          <SettingToggle
            id={advancedCard.export.id}
            label={advancedCard.export.label}
          />
        }
      />

      <SettingRow
        label={advancedCard.token.label}
        hint={
          <>
            {advancedCard.token.hint}{" "}
            <span className="anno">{advancedCard.token.annotation}</span>
          </>
        }
        control={
          <PrototypeButton acknowledgement={advancedCard.token.acknowledgement}>
            {advancedCard.token.action}
          </PrototypeButton>
        }
      />

      <SettingRow
        label={advancedCard.auditLog.label}
        hint={advancedCard.auditLog.hint}
        control={
          <PrototypeButton
            acknowledgement={advancedCard.auditLog.acknowledgement}
          >
            {advancedCard.auditLog.action}
          </PrototypeButton>
        }
      />

      <SettingRow
        label={advancedCard.density.label}
        hint={advancedCard.density.hint}
        control={
          <Badge tone="mint" size="xs">
            {advancedCard.density.value}
          </Badge>
        }
      />
    </SettingsCard>
  );
}
