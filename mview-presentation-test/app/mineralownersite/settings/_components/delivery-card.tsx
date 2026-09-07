import { SETTINGS_SECTIONS, deliveryDefault, deliverySettings } from "../_lib/settings-data";
import { FutureTag, SettingRow } from "./setting-row";
import { SettingToggle } from "./setting-toggle";
import { SettingsCard } from "./settings-card";

/**
 * WEEKLY BRIEFING DELIVERY — five ways the Saturday report can arrive.
 *
 * ── THE DEFAULT LINE IS PART OF THE CARD, NOT A CAPTION ──
 *
 * "Saturday morning · email + in-app" tells a reader who changes nothing what
 * will happen to them, which is most readers. A settings card that only shows
 * switch positions makes them reconstruct that from five rows.
 *
 * ── TWO ROWS HERE ARE PRODUCT COMMITMENTS, NOT PREFERENCES ──
 *
 * The mailed monthly production report is paper, and it is what Premium
 * includes for the owner who does not read email — that is the whole reason it
 * is a row rather than a plan footnote. And the SMS summary renders a "Future"
 * tag instead of a switch: it is not built, and the honest thing is to say so
 * rather than ship a control that saves a preference nothing will ever read.
 * See `FutureTag`.
 */
export function DeliveryCard() {
  return (
    <SettingsCard section={SETTINGS_SECTIONS.delivery}>
      <p className="mt-1 mb-1.5 text-[11px] leading-[1.55] text-mv-muted">
        {deliveryDefault}
      </p>
      {deliverySettings.map((row) => (
        <SettingRow
          key={row.id}
          label={row.label}
          hint={row.hint}
          control={
            row.future ? (
              <FutureTag />
            ) : (
              <SettingToggle id={row.id} label={row.label} />
            )
          }
        />
      ))}
    </SettingsCard>
  );
}
