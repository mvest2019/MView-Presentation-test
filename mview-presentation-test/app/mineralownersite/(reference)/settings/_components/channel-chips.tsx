"use client";

import { useState, useTransition } from "react";

import {
  ALERT_CHANNELS,
  ALERT_CHANNEL_NAME,
  type AlertChannel,
  type ChannelSet,
} from "../_lib/settings-types";

/**
 * WHERE ONE ALERT TYPE REACHES YOU — three press-to-toggle chips, the design's
 * `.chtg` pair (`chip-mint` when on, `chip-slate` when off).
 *
 * ── IT DOES SOMETHING NOW ──
 *
 * This was presentational: each chip rendered the position a hardcoded row gave
 * it and nothing happened on press. The page that links here promises
 * "Delivery is your call — email, push, or in-app per alert type in Settings",
 * so a live-looking control that discarded the press was the worst of the three
 * possible arrangements. `PUT /api/alerts/preferences` stores it now, keyed on
 * the RULE id the findings themselves carry, and `items[].channels` on the
 * alert is rendered from the stored row — so a reader who turns email off stops
 * being told the finding goes to email.
 *
 * ── OPTIMISTIC, AND IT PUTS ITSELF BACK ──
 *
 * The chip flips on press and the write follows. A write that fails REVERTS the
 * chip rather than leaving it, which is the opposite of the choice made for
 * read state next door — and deliberately so. A read that does not persist
 * costs the reader a row they have already looked at; a delivery preference
 * that does not persist is an email they asked to stop still arriving. The
 * pessimistic answer is the honest one here.
 *
 * `readOnly` is for the case where there is nothing to write to: not signed in,
 * or the service could not be read. The chips still render the position, and
 * the card says why above them.
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
export function ChannelChips({
  id,
  label,
  channels,
  readOnly = false,
}: {
  /** the RULE id this row's channels are stored under — `permit-ring`, `filed` */
  id: string;
  label: string;
  channels: ChannelSet;
  /** nothing to write to: rendered, pressable-looking state removed */
  readOnly?: boolean;
}) {
  const [set, setSet] = useState<ChannelSet>(channels);
  const [saving, start] = useTransition();
  const [failed, setFailed] = useState(false);

  const toggle = (channel: AlertChannel): void => {
    if (readOnly) return;
    const was = set;
    const next = { ...set, [channel]: !set[channel] };
    setSet(next);
    setFailed(false);
    start(async () => {
      try {
        const res = await fetch("/api/alerts/preferences", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          /* the wire spells the third one `in_app`; the card's own type spells
             it `inApp`, and the two are mapped here rather than either side
             being bent to the other */
          body: JSON.stringify({
            id,
            channels: { email: next.email, push: next.push, in_app: next.inApp },
          }),
        });
        if (!res.ok) throw new Error(String(res.status));
      } catch (e) {
        /* PUT IT BACK. See the header: a delivery preference that silently did
           not save is an email the reader asked to stop still arriving. */
        setSet(was);
        setFailed(true);
        console.warn("[alerts] delivery preference was not saved:", id, channel, e);
      }
    });
  };

  return (
    <div
      className="flex flex-wrap items-center justify-end gap-[5px]"
      role="group"
      aria-label={`Where to send: ${label}`}
      aria-busy={saving || undefined}
    >
      {failed ? (
        <span className="text-[11px] text-mv-slate" role="status">
          not saved
        </span>
      ) : null}
      {ALERT_CHANNELS.map((channel) => {
        const on = set[channel];
        return (
          <button
            key={channel}
            type="button"
            aria-pressed={on}
            disabled={readOnly}
            data-alert={id}
            data-channel={channel}
            onClick={() => toggle(channel)}
            className={`inline-flex items-center rounded-full px-[10px] py-[3px] text-[11.5px] leading-[1.3] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep ${
              readOnly ? "cursor-default" : "cursor-pointer"
            } ${
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
