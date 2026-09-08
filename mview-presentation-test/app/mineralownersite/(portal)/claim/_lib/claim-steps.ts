/**
 * THE FIVE STEPS, DECLARED ONCE.
 *
 * Every piece of chrome around the flow reads from this list — the numbered
 * stepper across the top, the "Step N of 5 — …" caption bar beneath it, and the
 * YOUR PROGRESS rail on the right. Those three said the same thing three times
 * in the design, which is three places for them to disagree about what step 3
 * is called.
 *
 * `aside` is the line on the RIGHT of the caption bar, and it is the step's
 * promise to the reader: steps 1 and 2 say nothing is committed, step 3 says
 * plainly that it commits, steps 4 and 5 say the claim is already made. It
 * changes per step because the reassurance that is TRUE changes per step, and a
 * standing "nothing is committed" would become a lie at step 3.
 */

/** Which lucide glyph the rail draws. Mapped to components in `progress-rail`. */
export type ClaimStepIcon = "search" | "users" | "shield" | "leases" | "eye";

export interface ClaimStep {
  /** 1-based, and it is the display number as well as the position. */
  n: number;
  /** The stepper's label and the rail's row title. */
  label: string;
  /** The rail's second line — what the step asks of the reader. */
  railSub: string;
  /** The caption bar's left half, after "Step N of 5 — ". */
  caption: string;
  /** The caption bar's right half. See the note above. */
  aside: string;
  /** A padlock beside `aside`, for the step that withholds values. */
  asideLock?: boolean;
  icon: ClaimStepIcon;
}

export const claimSteps: ClaimStep[] = [
  {
    n: 1,
    label: "Find your record",
    railSub: "Search by name and county",
    caption: "Search the public record",
    aside: "Nothing here changes who owns anything.",
    icon: "search",
  },
  {
    n: 2,
    label: "Pick your record",
    railSub: "Select the correct match",
    caption: "Pick the record that's yours",
    aside: "Values stay hidden until you're confirmed",
    asideLock: true,
    icon: "users",
  },
  {
    n: 3,
    label: "Prove it's yours",
    railSub: "Match the mailing address on file",
    caption: "Confirm the address, then the claim is made",
    aside: "This is the step that commits",
    icon: "shield",
  },
  {
    n: 4,
    label: "See your leases",
    railSub: "Everything tied to the record",
    caption: "The leases that came with your record",
    aside: "Claimed · one step left",
    icon: "leases",
  },
  {
    n: 5,
    label: "Choose what you see",
    railSub: "Your plan sets how many show in full",
    caption: "The last one",
    aside: "All your leases stay on your record either way",
    icon: "eye",
  },
];

export const TOTAL_STEPS = claimSteps.length;
