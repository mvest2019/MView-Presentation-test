import { gates } from "../../../_components/ui/portal-gating";
import { SETTINGS_SECTIONS, notificationSettings } from "../_lib/settings-data";
import type { ToggleSetting } from "../_lib/settings-types";
import { SettingRow } from "./setting-row";
import { SettingToggle } from "./setting-toggle";
import { SettingsCard } from "./settings-card";

/**
 * NOTIFICATIONS — whether each kind of event reaches the owner at all.
 *
 * ── THIS CARD AND ALERT PREFERENCES ARE NOT THE SAME QUESTION ──
 *
 * They look like duplicates and they are not: this one is WHETHER, the next is
 * WHERE. Merging them — one row per event with three channel chips and no
 * master switch — was tempting and would have cost the reader the ability to
 * turn a whole class of event off without hunting down three chips, which is
 * the thing somebody who is getting too much actually wants to do.
 *
 * ── THE MARKETING ROW'S HINT IS A PROMISE ──
 *
 * "turning this off never affects service email". Without it, the row an owner
 * most wants to switch off is the one they are most afraid to, in case it takes
 * the payment-gap alert with it — so the card loses the setting it exists to
 * offer. It is also the row "Use Recommended Settings" pointedly does not
 * touch; see `recommended-button.tsx`.
 */
export function NotificationsCard() {
  return (
    <SettingsCard section={SETTINGS_SECTIONS.notifications}>
      {notificationSettings.map((row) => (
        <SettingRow
          key={row.id}
          label={row.label}
          hint={<NotificationHint row={row} />}
          control={<SettingToggle id={row.id} label={row.label} on={row.on} />}
        />
      ))}
    </SettingsCard>
  );
}

/**
 * THE HINT THAT CHANGES WHEN THERE IS NO RECORD.
 *
 * Two rows here describe the owner's own leases — "your 10 claimed leases", "22
 * adjacent leases + 38 permits tracked". A visitor with no claim has neither
 * number, and printing somebody else's counts at them is exactly the leak
 * v26 · S3 was raised for.
 *
 * BOTH LINES SHIP AND CSS PICKS, which is how every gate in this portal works.
 * `nc-inline` is load-bearing: `.nc-only` is a block by default, and without it
 * the replacement hint breaks onto its own line inside a hint that is already
 * one line.
 */
function NotificationHint({ row }: { row: ToggleSetting }) {
  if (!row.unclaimedHint) return <>{row.hint}</>;

  return (
    <>
      <span className={gates("hideInUnclaimed")}>{row.hint}</span>
      <span className={gates("unclaimedOnly", "unclaimedInline")}>
        {row.unclaimedHint}
      </span>
    </>
  );
}
