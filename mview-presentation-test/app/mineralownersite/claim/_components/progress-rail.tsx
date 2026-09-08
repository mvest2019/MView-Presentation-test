import { Check, Eye, FileText, Search, ShieldCheck, Users } from "lucide-react";

import { Badge } from "../../_components/ui/badge";
import { claimSteps, type ClaimStepIcon, TOTAL_STEPS } from "../_lib/claim-steps";

/**
 * The rail's glyphs. Kept out of `claim-steps.ts` so that file stays a plain
 * `.ts` data module with no React import — the stepper and the caption bar read
 * it too, and neither of them draws an icon.
 */
const ICONS: Record<ClaimStepIcon, typeof Search> = {
  search: Search,
  users: Users,
  shield: ShieldCheck,
  leases: FileText,
  eye: Eye,
};

/**
 * YOUR PROGRESS — the same five steps as the top stepper, vertically.
 *
 * ── WHY BOTH, WHEN THEY CARRY THE SAME FIVE LABELS ──
 *
 * They answer different questions. The stepper answers "how far through am I",
 * in one glance, and it is deliberately terse. The rail answers "what does each
 * step actually ask of me", which needs a second line per row, and that line is
 * the reason someone at step 2 can tell whether step 3 is going to want a
 * document they do not have.
 *
 * The connecting rule runs BETWEEN rows rather than down the whole rail, so it
 * cannot dangle past the last one.
 */
export function ProgressRail({ current }: { current: number }) {
  return (
    <section
      className="rounded-mv border border-mv-line bg-mv-card p-4"
      aria-label="Your progress"
    >
      <h2 className="text-[10.5px] font-bold tracking-[.12em] text-mv-muted uppercase">
        Your progress
      </h2>
      <p className="mt-[6px] text-[17px] font-extrabold text-mv-ink">
        Step {current} of {TOTAL_STEPS}
      </p>

      <ol className="mt-3">
        {claimSteps.map((step) => {
          const done = step.n < current;
          const active = step.n === current;
          const Icon = ICONS[step.icon];

          return (
            /* A HAIRLINE BETWEEN ROWS. Five rows of two lines each run together
               without one — the eye has to use the discs to work out where a row
               ends, and the sub-line of one step sits as close to the title of
               the next as it does to its own. `last:` drops the rule and the
               padding off the bottom of the list. */
            <li
              key={step.n}
              className="flex gap-3 border-b border-mv-line py-[9px] first:pt-0 last:border-b-0 last:pb-0"
            >
              {/* THE DISC AND ITS CONNECTOR AS ONE STRETCHING COLUMN.
                  The connector used to be absolutely positioned at a fixed
                  `top-[26px]`, which silently assumed the row had no top padding
                  — adding it for the dividers above would have left the line
                  starting 12px inside the disc. As a flex child with `flex-1` it
                  simply fills whatever is left below the disc, so the row's
                  padding can change without anything here needing to know. */}
              <div className="flex flex-none flex-col items-center self-stretch">
                <span
                  className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11px] font-bold ${
                    done || active
                      ? "bg-mv-green-deep text-white"
                      : "bg-mv-portal-wash text-mv-muted"
                  }`}
                >
                  {done ? (
                    <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} />
                  ) : (
                    step.n
                  )}
                </span>

                <span
                  aria-hidden="true"
                  className={`mt-[3px] w-[2px] flex-1 rounded-full ${
                    done ? "bg-mv-green" : "bg-mv-line"
                  } [li:last-child_&]:hidden`}
                />
              </div>

              <div
                className={`min-w-0 flex-1 rounded-[10px] px-[10px] py-[6px] ${
                  active ? "bg-mv-mint" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="flex min-w-0 items-center gap-[6px] text-[13px] font-bold text-mv-ink">
                    <Icon
                      aria-hidden="true"
                      className="h-[13px] w-[13px] flex-none text-mv-muted"
                    />
                    <span className="truncate">{step.label}</span>
                  </p>
                  {active && (
                    <Badge tone="mint" size="xs" className="flex-none">
                      You&rsquo;re here
                    </Badge>
                  )}
                  {done && (
                    <Badge tone="mint" size="xs" className="flex-none">
                      Completed
                    </Badge>
                  )}
                </div>
                <p className="mt-[2px] text-[11.5px] leading-[1.4] text-mv-muted">
                  {step.railSub}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
