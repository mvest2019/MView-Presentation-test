/**
 * THE PORTAL'S SWITCH — the design's `.toggle`, measured off
 * `mineral-view-owner-full-site.css`: a 40 × 22 track, a 16px knob inset 3px,
 * sliding to 21px when on, grey to green.
 *
 * ── IT MOVES WHEN IT IS GIVEN SOMETHING TO MOVE ──
 *
 * `onToggle` is optional, and that is the whole design. A caller that passes it
 * gets a working switch; a caller that leaves it off gets the presentational
 * one this started as, which is what every settings card still renders. So the
 * profile page's two-factor switch could be wired without touching — or
 * re-testing — the thirty-odd switches on Settings that have no store behind
 * them yet.
 *
 * The prediction the old note made held exactly: wiring was "adding an
 * `onClick`", and no part of the control had to be rebuilt. There is still no
 * `"use client"` here, because it does not need one — a component with no hooks
 * is usable from both sides, and it joins the client bundle by being imported
 * from a client parent. Adding the directive would drag every settings card
 * that renders a switch into the bundle with it for nothing.
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
  onToggle,
}: {
  /** `ToggleSetting.id` — the key this row's position will be stored under. */
  id: string;
  label: string;
  on: boolean;
  /**
   * Called with the position the switch is moving TO. Leave it off and the
   * switch is inert, which is still the right state for a row with nothing
   * behind it — see the note above.
   */
  onToggle?: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      data-setting={id}
      onClick={onToggle ? () => onToggle(!on) : undefined}
      /* NOT `disabled` WHEN THERE IS NO HANDLER, on purpose: a disabled switch
         says "you may not change this", and the truth on those rows is "this
         is not connected yet". The `cursor-pointer` and the focus ring stay, so
         the control still reads and behaves as the real thing it will be. */
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
