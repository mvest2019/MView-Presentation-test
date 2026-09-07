/**
 * THE PORTAL'S SWITCH — the design's `.toggle`, measured off
 * `mineral-view-owner-full-site.css`: a 40 × 22 track, a 16px knob inset 3px,
 * sliding to 21px when on, grey to green.
 *
 * ── PRESENTATIONAL. IT DOES NOT MOVE YET ──
 *
 * This is the UI pass: the switch renders the position its row's data gives it
 * and nothing happens when it is pressed. It is a real `<button>` rather than a
 * `<div>` so it is already focusable and in the tab order, and so wiring it is
 * adding an `onClick` and a `"use client"` — not rebuilding the control.
 *
 * ── WHAT WIRING IT WILL NEED, SO THE SHAPE IS RIGHT NOW ──
 *
 * `id` is here and unused for exactly that reason: it is the key each row's
 * position will be stored under (`ToggleSetting.id`), and it is what a "Use
 * Recommended Settings" press will address rows by. The page's controls are
 * spread across four cards and two of them have to be reachable from a button
 * in the page head, so the state will need to be shared rather than local to
 * each switch.
 *
 * ── `role="switch"`, WHICH THE PROTOTYPE'S WAS NOT ──
 *
 * The reference renders `<button class="toggle">` and sets `aria-checked` on
 * it. `aria-checked` on a plain button is ignored — the role has to support the
 * state or the attribute means nothing, so every one of these announced as an
 * unlabelled button with no position at all. `role="switch"` is what makes
 * `aria-checked` legible, and `aria-label` gives the control the name its
 * visible text sits outside of.
 *
 * That is a fix, not a redesign: the design's INTENT is in its own comment
 * beside the handler — "v6 a11y — switches announce their state".
 */
export function SettingToggle({
  id,
  label,
  on,
}: {
  /** `ToggleSetting.id` — the key this row's position will be stored under. */
  id: string;
  label: string;
  on: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      data-setting={id}
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
