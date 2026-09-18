import { gates } from "../../../_components/ui/portal-gating";
import {
  SETTINGS_SECTIONS,
  quietWeek,
  quietWeekOptions,
} from "../_lib/settings-data";
import { SettingsCard } from "./settings-card";

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
 * ── UNCONTROLLED, WHICH IS THE UI PASS'S ANSWER FOR A RADIO GROUP ──
 *
 * `defaultChecked` rather than `checked`, so the three radios are the browser's
 * own and the reader can still move between them — a native radio group needs
 * no JavaScript to behave correctly. Wiring means reading the choice, not
 * building the control.
 *
 * `hide-s` — an Essentials reader gets the design's default and is not asked to
 * choose.
 */
export function QuietWeekCard() {
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
              defaultChecked={option.selected}
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
