import { PortalLink } from "../../../_components/portal-link";
import { currentMemberTarget } from "../../../_lib/reference/owner-data";
import {
  fetchAlertPreferences,
  type AlertPreferenceRow,
} from "../../../_lib/reference/member-api";
import { SETTINGS_SECTIONS, alertPrefsCard, alertPreferences } from "../_lib/settings-data";
import type { AlertPreference } from "../_lib/settings-types";
import { ChannelChips } from "./channel-chips";
import { SettingRow } from "./setting-row";
import { SettingsCard } from "./settings-card";

/**
 * WHERE EACH ALERT REACHES THIS READER.
 *
 * ── WHAT CHANGED ──
 *
 * This card rendered `alertPreferences`, a hardcoded array, and its chips did
 * nothing on press — while the Alerts page's own footer told every reader
 * "Delivery is your call — email, push, or in-app per alert type in Settings"
 * and linked here. A real setting, rendered, that silently discarded input.
 *
 * The rows come from `GET /alerts/preferences` now, keyed on the RULE ids the
 * findings themselves carry (`permit-ring`, `filed`, `pricedeck`) rather than
 * the card's own invented `alert-permit` / `alert-production`. A preference
 * stored under a key no finding will ever match looks saved and governs
 * nothing, which is the defect this replaces rather than a variation on it.
 *
 * ── EVERY RULE, ALWAYS ──
 *
 * The service returns every rule — the member's own row where they have one and
 * its default where they have not — so a member who has changed nothing sees
 * the full matrix rather than an empty card. Nothing is filtered here.
 *
 * ── AND WHEN THERE IS NOTHING TO READ ──
 *
 * Not signed in, or the service could not answer: the committed defaults are
 * rendered READ-ONLY with a line saying so. That is the honest third state, and
 * it is the one that matters most in practice — the endpoints 500 until the
 * service's migration has been run, and a card that looked writable against a
 * dead store would be the original defect wearing a new coat.
 */

/** the wire's `in_app` against the card's own `inApp` — mapped here, once */
function asCardRow(r: AlertPreferenceRow): AlertPreference {
  return {
    id: r.id,
    label: r.label,
    hint: r.hint ?? "",
    ...(r.annotation ? { annotation: r.annotation } : {}),
    channels: { email: r.channels.email, push: r.channels.push, inApp: r.channels.in_app },
    ...(r.recommended ? { recommended: true } : {}),
  };
}

async function liveRows(): Promise<AlertPreference[] | null> {
  const who = await currentMemberTarget();
  if (!who) return null;
  try {
    const res = await fetchAlertPreferences(who.base, who.member);
    return Array.isArray(res.rows) && res.rows.length ? res.rows.map(asCardRow) : null;
  } catch (e) {
    console.warn(
      "[alerts] delivery preferences could not be read; showing the defaults "
        + "read-only:", e instanceof Error ? e.message : e,
    );
    return null;
  }
}

export async function AlertPreferencesCard() {
  const live = await liveRows();
  const rows = live ?? alertPreferences;
  const readOnly = live === null;

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
      {readOnly ? (
        /* SAY IT, RATHER THAN RENDER A CONTROL THAT CANNOT WORK. The chips
           below are the published defaults and are not pressable; the reader is
           told which, so nobody presses one and believes it was kept. */
        <p className="mt-1 mb-1.5 text-[11px] leading-[1.55] text-mv-slate" role="status">
          These are the published defaults. Your own delivery choices could not
          be read just now, so they cannot be changed here until that is back —
          nothing you have set has been lost.
        </p>
      ) : null}
      {rows.map((row) => (
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
            <ChannelChips
              id={row.id}
              label={row.label}
              channels={row.channels}
              readOnly={readOnly}
            />
          }
        />
      ))}
      <p className="mt-2 text-[11px] leading-[1.55] text-mv-muted">
        {alertPrefsCard.footnote}
      </p>
    </SettingsCard>
  );
}
