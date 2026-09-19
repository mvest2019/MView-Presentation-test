import { Check } from "lucide-react";

import { claimSteps } from "../_lib/claim-steps";

/**
 * THE NUMBERED RAIL ACROSS THE TOP — five nodes joined by a rule.
 *
 * THREE NODE STATES, and the difference between two of them is the point:
 *
 *   done     green disc, a tick, NOT the number. A tick is the only mark that
 *            says "behind you"; a green disc still showing "2" reads as the
 *            current step at a glance, which is exactly the confusion a
 *            five-step flow cannot afford.
 *   current  green disc with the number, and the label goes bold with a rule
 *            under it. Carries `aria-current="step"`.
 *   ahead    hairline disc, muted number, muted label.
 *
 * ── THE CONNECTOR IS A TRACK WITH A FILL, AND THE HALF-FILL IS THE POINT ──
 *
 * Each node owns the segment BEFORE it, drawn as a grey track with a green bar
 * inside it. Three states:
 *
 *   100%  the segment is behind you — both its nodes are done, or it ends on
 *         the step you are standing on
 *    50%  the segment LEAVING the current step. You have started the flow but
 *         not reached the next node, and a half-filled segment is the only one
 *         of the three that says so
 *     0%  still ahead
 *
 * Without the half-fill, standing on step 1 draws four identical grey segments
 * and the bar reports no progress at all — the disc is the only thing that has
 * moved. Filling the whole segment instead would say you had arrived at step 2.
 *
 * It is a nested element rather than a border or a gradient because a border
 * cannot stop halfway and a gradient would need its stops restated per state.
 *
 * IT IS AN `<ol>`, not five divs: this is an ordered list of stages, and a
 * screen reader that announces "list, 5 items, item 3 of 5" has conveyed the
 * progress bar's entire meaning without seeing it.
 */
export function ClaimStepper({
  current,
  onGo,
}: {
  current: number;
  /**
   * CLICK A STEP TO GO BACK TO IT (requested).
   *
   * Optional, and absent means the rail is a read-out rather than a control —
   * which is what the sample walkthrough wants: it mounts this shell inside a
   * dialog that drives itself, and a reader who could steer it would be
   * fighting the clock advancing underneath them.
   */
  onGo?: (step: number) => void;
}) {
  return (
    <ol
      data-claim="stepper"
      /* `flex-nowrap` is stated rather than assumed: five nodes that wrap turn
         a progress rail into two rows with a connector running backwards
         between them, which is worse than no rail at all.

         The bottom padding is the phone's. With the labels hidden there is
         nothing under the discs to hold the rail off the card's edge, so it is
         put back here and dropped again once the labels return. */
      className="flex flex-nowrap gap-0 overflow-x-auto rounded-mv border border-mv-line bg-mv-card px-4 pt-[14px] pb-[14px] sm:pb-0"
    >
      {claimSteps.map((step) => {
        const done = step.n < current;
        const active = step.n === current;

        /*
         * BACKWARD ONLY, AND THAT IS A RULE ABOUT STEP 3 RATHER THAN A
         * SIMPLIFICATION.
         *
         * Step 3's Continue is the only thing in the flow enforcing the
         * good-faith statement — step 4 files without re-checking it, and the
         * wizard deliberately drops the tick whenever the picked records
         * change. A rail that jumped FORWARD would walk straight round that
         * assertion in one click, so it does not.
         *
         * Backward is always safe by contrast: every earlier step rebuilds
         * itself from state that is still there, and arriving at one asks the
         * reader for nothing they have not already been asked.
         *
         * Narrowed into a value rather than tested as a boolean, so the click
         * handler below is reaching for something TypeScript knows is defined.
         */
        const back = onGo && done ? onGo : undefined;

        /* How much of the segment BEFORE this node is green. See the note
           above — the 50% case is the segment the reader is currently on. */
        const fill = step.n <= current ? 100 : step.n === current + 1 ? 50 : 0;

        return (
          <li
            key={step.n}
            /* The current step's cell is tinted, so the rail says where you
               are twice — by the mark under the label and by the panel behind
               it. On a five-node rail the underline alone is easy to lose.

               BOTH OF THOSE BELONG TO THE LABELLED LAYOUT, so both wait for
               `sm:`. A tinted cell with no word in it is a coloured rectangle,
               and the underline marks the bottom of a label that is not there.

               `min-w-[92px]` IS THE PHONE BUG. Five nodes at 92px is 460px of
               minimum width inside a card that has about 300px on a 375px
               screen, so the rail wrapped to two rows — discs 1-2-3 above
               4-5, with the connector crossing back under them. The floor only
               applies once there is a label that needs the room. */
            className={`relative flex min-w-0 flex-1 flex-col items-center gap-2 rounded-t-[10px] pt-[2px] transition-colors sm:min-w-[92px] ${
              active ? "sm:bg-mv-mint/45" : back ? "sm:hover:bg-mv-mint/25" : ""
            }`}
            aria-current={active ? "step" : undefined}
          >
            {/* The joining rule. Absolute so it can sit behind the disc and
                still reach the midpoint of the node on either side. */}
            {step.n > 1 && (
              <span
                aria-hidden="true"
                data-claim="step-line"
                className="absolute top-[13px] right-1/2 left-[-50%] h-[2px] bg-mv-line"
              >
                <span
                  className="block h-full rounded-full bg-mv-green"
                  style={{ width: `${fill}%` }}
                />
              </span>
            )}

            {/* ON A PHONE THE DISC IS THE WHOLE RAIL, so the current one gets a
                ring. With the labels gone, "done" and "current" are both a
                filled green disc and the only thing separating them is a tick
                against a number — too fine a distinction to carry the question
                "where am I" on its own. The ring drops away at `sm:`, where the
                tint and the underline take the job back. */}
            <span
              data-claim="step-dot"
              className={`relative z-[1] flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full text-[12px] font-bold ${
                done || active
                  ? "bg-mv-green-deep text-white"
                  : "border border-mv-line bg-mv-card text-mv-muted"
              } ${active ? "ring-[3px] ring-mv-green/35 sm:ring-0" : ""}`}
            >
              {done ? (
                <Check
                  aria-hidden="true"
                  className="h-[14px] w-[14px]"
                  strokeWidth={3}
                />
              ) : (
                step.n
              )}
            </span>

            {/* THE ACTIVE MARK SITS ON THE CARD'S BOTTOM EDGE, not under the
                word. It was a `border-b` on this label, six pixels below the
                text and floating in the middle of the card; as a tab indicator
                flush with the border it reads as "this is the open panel" and
                ties the stepper to the step card beneath it.

                Three things make it land there and stay there:
                  · the `<ol>` carries `pt` only, so there is no bottom padding
                    between the label's box and the card's border;
                  · the labels STRETCH (the `<ol>` no longer uses `items-start`),
                    so a one-line label's box reaches as low as the two-line
                    one next to it and the mark cannot ride up;
                  · `inset-x-1` matches the label's own `px-1`, so the mark is
                    exactly as wide as the word above it — the width the border
                    used to have. */}
            {/* HIDDEN ON A PHONE, and that is the point rather than a
                casualty. Five labels in ~300px wrap to two lines each and
                still do not fit, and the caption bar directly beneath the rail
                already names the step in full — "Step 1 of 5 — Search the
                public record". The discs carry the progress, the caption
                carries the words, and neither is squeezed. */}
            <span
              data-claim="step-label"
              className={`relative hidden flex-1 px-1 pb-[11px] text-center text-[12.5px] leading-[1.3] sm:block ${
                active
                  ? "font-bold text-mv-ink"
                  : done
                    ? "font-semibold text-mv-green-deep"
                    : "text-mv-muted"
              }`}
            >
              {step.label}
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-1 bottom-0 h-[2px] rounded-t-full bg-mv-green-deep"
                />
              )}
            </span>

            {/* THE WHOLE CELL IS THE TARGET, AS AN OVERLAY RATHER THAN A
                WRAPPER.

                Putting a `<button>` around the disc and the label would insert
                a containing block between this `<li>` and its two absolutely
                positioned children, and the connector is drawn at
                `left-[-50%]` — deliberately OUTSIDE the cell, so it can reach
                the middle of the node before it. Re-parented, it would resolve
                against the button and be cut off at the cell's own edge.

                An overlay changes no layout at all. It sits above the disc's
                `z-[1]`, so a click anywhere in the cell — disc, label or the
                gap between them — lands on it.

                IT IS NOT DRAWN ON THE STEP YOU ARE ON, nor on the ones ahead:
                a control that does nothing, on a rail where the other cells
                move you, reads as a step you are not allowed into rather than
                as the one you are standing on. */}
            {back && (
              <button
                type="button"
                onClick={() => back(step.n)}
                aria-label={`Go back to step ${step.n}: ${step.label}`}
                title={`Back to step ${step.n} — ${step.label}`}
                className="absolute inset-0 z-[2] cursor-pointer rounded-t-[10px] border-0 bg-transparent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mv-green-deep"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
