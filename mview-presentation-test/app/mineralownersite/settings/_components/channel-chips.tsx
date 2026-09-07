"use client";

import {
  ALERT_CHANNELS,
  ALERT_CHANNEL_NAME,
  type AlertChannel,
} from "../_lib/settings-types";
import { useSettingsState } from "./settings-state";

/**
 * WHERE ONE ALERT TYPE REACHES YOU — three press-to-toggle chips, the design's
 * `.chtg` pair (`chip-mint` when on, `chip-slate` when off).
 *
 * ── WHY A CHIP AND NOT THREE MORE SWITCHES ──
 *
 * Because the question is different. A switch answers "do I want this at all";
 * these answer "and where" — three related choices about one row, read as a
 * group. Nine switches down the right-hand edge of this card would read as nine
 * unrelated settings, and the card's whole point is the matrix.
 *
 * `aria-pressed` is the right state here rather than `aria-checked`: these are
 * toggle BUTTONS within a row, not a set of independent switches, and each one
 * carries its channel name as its own label. The row's subject is announced by
 * the group's `aria-label`, so a reader hears "New production posted, Email,
 * pressed" rather than three bare channel names.
 *
 * ── IN-APP IS A CHOICE, AND THE HISTORY IS NOT ──
 *
 * Turning "In-app" off stops the alert appearing as a notification; it does not
 * delete the record. That distinction is stated in the card's own footnote and
 * is the reason unsubscribing here is safe — see `alert-preferences-card.tsx`.
 */
export function ChannelChips({ id, label }: { id: string; label: string }) {
  const { channels, setChannel } = useSettingsState();
  const set = channels[id];

  return (
    <div
      className="flex flex-wrap items-center justify-end gap-[5px]"
      role="group"
      aria-label={`Where to send: ${label}`}
    >
      {ALERT_CHANNELS.map((channel: AlertChannel) => {
        const on = set?.[channel] ?? false;
        return (
          <button
            key={channel}
            type="button"
            aria-pressed={on}
            onClick={() => setChannel(id, channel, !on)}
            className={`inline-flex cursor-pointer items-center rounded-full px-[10px] py-[3px] text-[11.5px] leading-[1.3] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep ${
              on
                ? "bg-mv-mint text-mv-green-ink"
                : "bg-mv-portal-wash text-mv-slate"
            }`}
          >
            {ALERT_CHANNEL_NAME[channel]}
          </button>
        );
      })}
    </div>
  );
}
