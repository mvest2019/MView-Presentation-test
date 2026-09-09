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
export function ClaimStepper({ current }: { current: number }) {
  return (
    <ol className="flex gap-0 overflow-x-auto rounded-mv border border-mv-line bg-mv-card px-4 pt-[14px]">
      {claimSteps.map((step) => {
        const done = step.n < current;
        const active = step.n === current;

        /* How much of the segment BEFORE this node is green. See the note
           above — the 50% case is the segment the reader is currently on. */
        const fill = step.n <= current ? 100 : step.n === current + 1 ? 50 : 0;

        return (
          <li
            key={step.n}
            /* The current step's cell is tinted, so the rail says where you
               are twice — by the mark under the label and by the panel behind
               it. On a five-node rail the underline alone is easy to lose. */
            className={`relative flex min-w-[92px] flex-1 flex-col items-center gap-2 rounded-t-[10px] pt-[2px] ${
              active ? "bg-mv-mint/45" : ""
            }`}
            aria-current={active ? "step" : undefined}
          >
            {/* The joining rule. Absolute so it can sit behind the disc and
                still reach the midpoint of the node on either side. */}
            {step.n > 1 && (
              <span
                aria-hidden="true"
                className="absolute top-[13px] right-1/2 left-[-50%] h-[2px] bg-mv-line"
              >
                <span
                  className="block h-full rounded-full bg-mv-green"
                  style={{ width: `${fill}%` }}
                />
              </span>
            )}

            <span
              className={`relative z-[1] flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full text-[12px] font-bold ${
                done || active
                  ? "bg-mv-green-deep text-white"
                  : "border border-mv-line bg-mv-card text-mv-muted"
              }`}
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
            {/* THE LABEL CARRIES ITS ONE-LINE DESCRIPTION. Five words under
                each node say what the step is FOR — "Locate the record you
                own" against a bare "Find your record" — which is what turns
                the rail from a position indicator into a map of the flow. */}
            <span
              className={`relative flex flex-1 flex-col items-center gap-[3px] px-2 pb-[11px] text-center ${
                active
                  ? "font-bold text-mv-ink"
                  : done
                    ? "font-semibold text-mv-green-deep"
                    : "text-mv-muted"
              }`}
            >
              <span className="text-[12.5px] leading-[1.3]">{step.label}</span>
              <span
                className={`text-[10.5px] leading-[1.35] font-normal ${
                  active ? "text-mv-slate" : "text-mv-muted"
                }`}
              >
                {step.railSub}
              </span>
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-1 bottom-0 h-[2px] rounded-t-full bg-mv-green-deep"
                />
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
