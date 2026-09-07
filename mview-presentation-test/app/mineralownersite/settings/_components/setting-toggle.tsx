"use client";

import { useSettingsState } from "./settings-state";

/**
 * THE PORTAL'S SWITCH — the design's `.toggle`, measured off
 * `mineral-view-owner-full-site.css`: a 40 × 22 track, a 16px knob inset 3px,
 * sliding to 21px when on, grey to green.
 *
 * ── IT IS A `role="switch"`, WHICH THE PROTOTYPE'S WAS NOT ──
 *
 * The reference renders `<button class="toggle">` and sets `aria-checked` on
 * it. `aria-checked` on a plain button is ignored — the role has to support the
 * state or the attribute means nothing, so every one of these announced as an
 * unlabelled button with no position at all. `role="switch"` is what makes
 * `aria-checked` legible, and `aria-label` gives the control the name its
 * visible text sits outside of.
 *
 * That is a fix, not a redesign: the design's INTENT is in its own comment
 * beside the handler — "v6 a11y — switches announce their state". This is that
 * intent, working.
 *
 * ── THE POSITION LIVES IN THE PROVIDER, NOT HERE ──
 *
 * A `useState` per switch would be simpler and would break the one thing this
 * page has to do: "Use Recommended Settings" reaches six rows across two cards.
 * See the header of `settings-state.tsx`.
 */
export function SettingToggle({ id, label }: { id: string; label: string }) {
  const { toggles, setToggle } = useSettingsState();
  const on = toggles[id] ?? false;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => setToggle(id, !on)}
      className={`relative h-[22px] w-10 flex-none cursor-pointer rounded-full border-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep ${
        on ? "bg-mv-green" : "bg-mv-portal-switch-off"
      }`}
    >
      {/* The knob. `aria-hidden` — the switch's state is already on the button
          itself, and a screen reader has no use for the moving part. */}
      <span
        aria-hidden="true"
        className={`absolute top-[3px] h-4 w-4 rounded-full bg-white transition-[left] duration-150 ${
          on ? "left-[21px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}
