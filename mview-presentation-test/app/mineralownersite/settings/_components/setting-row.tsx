import type { ReactNode } from "react";

/**
 * ONE SETTINGS LINE — `portal.css`'s `.setrow` as Tailwind.
 *
 * A label with its consequence underneath on the left, a control on the right,
 * a hairline between rows and none under the last. Forty-one of these across
 * the page, so it is the component that decides whether Settings reads as one
 * surface or as eleven cards that each invented their own spacing.
 *
 * ── WHY THE CONTROL COLUMN HAS A FIXED FLOOR ──
 *
 * `.setrow` in the prototype was `justify-content: space-between` with
 * `flex-wrap`, and its rows carry four different controls: a 40px switch, a
 * "Future" tag, a small button, and — in the Alert preferences card — three
 * channel chips. Space-between alone put each of those wherever its own width
 * left it, so no two rows in a card had their control at the same x. That is
 * the misalignment the page reads as.
 *
 * The control gets its own column with `min-w-[124px]` and is pushed to the
 * right inside it, so a switch, a tag and a button all land on one edge, and
 * the chip group — which is wider than the floor — still gets the room it needs
 * without dragging the other rows out of line.
 *
 * ── AND WHY THE LABEL'S BASIS IS 160px, NOT THE 220px IT LOOKS LIKE ──
 *
 * `flex-1` means the label fills whatever is left regardless, so the basis only
 * decides ONE thing: the width at which the row gives up and wraps. At 220 it
 * wrapped on every phone — 390px viewport, less 44px of card padding, is 290px
 * of row, and 220 + 16 + 124 does not fit — so every settings row on a phone
 * became two lines with the switch adrift under the label. At 160 the common
 * rows stay on one line at 390px and keep the label-left / control-right shape
 * they have everywhere else. Nothing moves on a desktop, where the label grows
 * to fill either way.
 *
 * `ml-auto` is for the rows that still wrap — the three-chip groups in Alert
 * preferences, which genuinely cannot fit beside their label on a phone. It
 * keeps the control on the right edge of its own line instead of at the left,
 * so the card still reads as a column of controls. That is a small, deliberate
 * departure from the prototype, which left them at the start of the wrapped
 * line; it changes nothing above the wrap point.
 *
 * `hint` IS NOT OPTIONAL BY ACCIDENT. Every row on this page states what the
 * setting will do; a switch labelled only "Email" leaves the reader guessing
 * whether it means the briefing or the receipts.
 */
export function SettingRow({
  label,
  hint,
  control,
}: {
  label: ReactNode;
  hint: ReactNode;
  /** The switch, tag, button or chip group on the right. */
  control: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-mv-portal-hairline py-[14px] last:border-b-0">
      <div className="min-w-0 flex-1 basis-40">
        <strong className="block text-[13px] leading-[1.45]">{label}</strong>
        <div className="mt-0.5 text-xs leading-[1.5] text-mv-muted">{hint}</div>
      </div>
      <div className="ml-auto flex min-w-[124px] flex-none flex-wrap items-center justify-end gap-[5px]">
        {control}
      </div>
    </div>
  );
}

/**
 * THE ROW WHOSE FEATURE IS NOT BUILT — the design's `.future-tag`.
 *
 * A dashed, uppercase "Future" where the switch would be. It is deliberately
 * NOT a disabled switch: a switch that cannot move still says the feature
 * exists and that the reader has failed to operate it. The tag says the truth,
 * which is that there is nothing to operate yet.
 *
 * The same distinction `portal-nav.ts` draws for navigation and
 * `portal-routes.ts` draws for prose — "not built" must never be dressed as
 * "not for your plan".
 */
export function FutureTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-mv-portal-switch-off bg-mv-portal-inert px-[7px] py-0.5 text-[10.5px] font-bold tracking-[0.06em] text-mv-muted uppercase">
      Future
    </span>
  );
}
