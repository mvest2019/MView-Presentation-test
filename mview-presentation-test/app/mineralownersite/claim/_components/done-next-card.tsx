import { ChevronRight } from "lucide-react";

import { nextActions } from "../_lib/claim-done";
import { DoneIconTile } from "./done-icons";

/**
 * "WHAT TO DO NEXT" — the completion screen's rail.
 *
 * ── IT USED TO BE DARK, AND IS NOT ANY MORE ──
 *
 * Inverting it was a way to give the one forward-looking block on a receipt
 * screen more weight than the receipt. It bought that weight too expensively:
 * a near-black panel is the heaviest thing the portal draws, and it out-shouted
 * the "Open my dashboard" button — the actual primary action — from the other
 * side of the page. Numbered discs and a glyph per row carry the same structure
 * on the portal's ordinary white card, and the green button wins again.
 *
 * ── ORDERED, AND THE ORDER IS THE ADVICE ──
 *
 * An `<ol>`, numbered, because "three things, in order" is the heading's
 * promise: the dashboard fills itself, the check stub makes the numbers real,
 * and only then is a Lease Audit worth running. Presented as a bag of
 * suggestions it would be three equal chores.
 *
 * The "Now that you're claimed" list that used to close this card has been
 * removed (requested). Two of its three lines are said elsewhere on the screen
 * anyway — the groups footer below shows the rooms that opened, and the summary
 * rows name the weekly briefing.
 *
 * ── THE CHEVRONS ARE `aria-hidden` AND NOTHING ELSE ──
 *
 * They say "this leads somewhere" and they are honest about it: each row's
 * destination is a portal module that is not built yet, so none of them is a
 * link. A chevron that navigated nowhere would be worse than no chevron.
 */
export function DoneNextCard() {
  return (
    <section
      className="rounded-mv border border-mv-line bg-mv-card p-[18px]"
      aria-label="What to do next"
    >
      <h2 className="text-[10.5px] font-bold tracking-[.12em] text-mv-muted uppercase">
        What to do next
      </h2>
      <p className="mt-[5px] text-[17px] font-extrabold text-mv-ink">
        Three things, in order
      </p>

      <ol className="mt-3">
        {nextActions.map((action, i) => (
          <li
            key={action.title}
            className="flex items-center gap-[10px] border-b border-mv-line py-[10px] first:pt-0 last:border-b-0 last:pb-0"
          >
            <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-mv-green-deep text-[11px] font-bold text-white">
              {i + 1}
            </span>
            <DoneIconTile name={action.icon} />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-bold text-mv-ink">
                {action.title}
              </p>
              <p className="mt-[1px] text-[11px] leading-[1.4] text-mv-muted">
                {action.detail}
              </p>
            </div>
            <ChevronRight
              aria-hidden="true"
              className="h-4 w-4 flex-none text-mv-placeholder"
            />
          </li>
        ))}
      </ol>
    </section>
  );
}
