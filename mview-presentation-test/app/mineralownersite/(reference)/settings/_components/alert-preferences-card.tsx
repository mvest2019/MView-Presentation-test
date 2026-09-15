import { PortalLink } from "../../../_components/portal-link";
import { SETTINGS_SECTIONS, alertPrefsCard, alertPreferences } from "../_lib/settings-data";
import { ChannelChips } from "./channel-chips";
import { SettingRow } from "./setting-row";
import { SettingsCard } from "./settings-card";

/**
 * ALERT PREFERENCES — per type, per channel.  (v11)
 *
 * SOURCE: `PG.user_notification_settings`, which carries a column per channel
 * per event type. The card is that table, made legible: six rows the owner
 * recognises, three chips each.
 *
 * ── WHY THE MATRIX IS WORTH THE SPACE ──
 *
 * The alerts on this page are not equally urgent, and one global "email me"
 * switch forces the owner to price the noisiest against the most important. A
 * possible payment gap should reach them everywhere; a price move that touched
 * their estimate belongs in the app, to be found when they look. Six rows of
 * three chips is more surface than one switch and it is the difference between
 * an owner tuning their alerts and an owner turning them all off.
 *
 * ── THE FOOTNOTE CARRIES TWO PROMISES ──
 *
 * "alerts fire on real events, never to look busy" is the same commitment the
 * Alerts inbox and the quiet-week card make, and it is what makes an alert
 * worth reading at all. "Unsubscribing from a channel never hides the in-app
 * history" is the one that makes this card safe to use: switching off email is
 * not deleting the record, so nobody has to keep an unwanted email on in case
 * turning it off loses them something.
 */
export function AlertPreferencesCard() {
  return (
    <SettingsCard
      section={SETTINGS_SECTIONS.alertPrefs}
      accent="green"
      action={
        <PortalLink
          href="/mineralownersite/alerts"
          className="text-[13px] font-semibold"
        >
          {alertPrefsCard.inboxLink}
        </PortalLink>
      }
    >
      <p className="mt-1 mb-1.5 text-[11px] leading-[1.55] text-mv-muted">
        {alertPrefsCard.lead}
      </p>
      {alertPreferences.map((row) => (
        <SettingRow
          key={row.id}
          label={row.label}
          hint={
            <>
              {row.hint}
              {/* `.anno` — an aside about the MODEL behind the alert, not about
                  the alert. "model in build" is why the new-well row is in-app
                  only: a probability band nobody has finished should not be
                  pushing anyone's phone. */}
              {row.annotation ? (
                <span className="anno">{row.annotation}</span>
              ) : null}
            </>
          }
          control={
            <ChannelChips id={row.id} label={row.label} channels={row.channels} />
          }
        />
      ))}
      <p className="mt-2 text-[11px] leading-[1.55] text-mv-muted">
        {alertPrefsCard.footnote}
      </p>
    </SettingsCard>
  );
}
