"use client";

import { useState } from "react";

import { gates } from "../../_components/ui/portal-gating";
import {
  SETTINGS_SECTIONS,
  quietWeek,
  quietWeekOptions,
} from "../_lib/settings-data";
import { SettingsCard } from "./settings-card";
import { useSettingsState } from "./settings-state";

/**
 * QUIET-WEEK BEHAVIOUR — what arrives when nothing happened.
 *
 * ── THIS CARD IS THE PRODUCT'S POSITION ON QUIET WEEKS, AS A SETTING ──
 *
 * Most weeks nothing changes near a lease. A service that only writes when
 * there is news trains the owner to read its silence as neglect; one that
 * invents activity to look busy is worse. So the design's answer is to make
 * "nothing new" a deliverable the owner can choose the shape of — a short note,
 * nothing at all, or the market context that explains a quiet month.
 *
 * The Alerts inbox makes the same argument in its own words ("Quiet is a
 * result, not a failure — we never invent activity to look busy"), which is
 * where the promise this card configures is actually kept.
 *
 * ── THE FOOTNOTE IS AN OVERRIDE, AND IT IS NOT NEGOTIABLE ──
 *
 * New production numbers post whatever this is set to. "Skip entirely" governs
 * the weekly note, never the monthly production anchor. Without that line a
 * reader can quite reasonably conclude they have switched off the numbers they
 * pay for, and the one thing a royalty product may never do is drop a payment
 * figure because of a display preference.
 *
 * `hide-s` — an Essentials reader gets the design's default and is not asked to
 * choose. `useState` and not the provider: nothing else on the page reads this,
 * and "Use Recommended Settings" deliberately does not touch it.
 */
export function QuietWeekCard() {
  const [chosen, setChosen] = useState(
    () => quietWeekOptions.find((option) => option.selected)?.id ?? quietWeekOptions[0].id,
  );
  const { announce } = useSettingsState();

  return (
    <SettingsCard
      section={SETTINGS_SECTIONS.quietWeek}
      gate={gates("hideInEssentials")}
    >
      <p className="mt-1 mb-2.5 text-[11px] leading-[1.55] text-mv-muted">
        {quietWeek.lead}
      </p>
      {/* A real radio group: one name, one tab stop, arrow keys between the
          three. The prototype's `name="qw"` inputs already were one — this
          keeps that and adds the group label a screen reader announces first. */}
      <div
        role="radiogroup"
        aria-label={SETTINGS_SECTIONS.quietWeek.heading}
        className="flex flex-col gap-2 text-[13.5px]"
      >
        {quietWeekOptions.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-center gap-2 leading-[1.45]"
          >
            <input
              type="radio"
              name="quiet-week"
              value={option.id}
              checked={chosen === option.id}
              onChange={() => {
                setChosen(option.id);
                announce();
              }}
              className="accent-mv-green"
            />
            {option.label}
          </label>
        ))}
      </div>
      <p className="mt-2.5 text-[11px] leading-[1.55] text-mv-muted">
        {quietWeek.footnote}
      </p>
    </SettingsCard>
  );
}
