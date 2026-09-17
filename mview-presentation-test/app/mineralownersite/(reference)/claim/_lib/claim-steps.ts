/**
 * THE FIVE STEPS, DECLARED ONCE.
 *
 * Every piece of chrome around the flow reads from this list — the numbered
 * stepper across the top and the "Step N of 5 — …" caption bar beneath it. They
 * said the same thing twice over in the design, which is two places for them to
 * disagree about what step 3 is called.
 *
 * `aside` is the line on the RIGHT of the caption bar, and it is the step's
 * promise to the reader: steps 1 to 3 say nothing is committed, step 4 says
 * plainly that it commits, step 5 says it is done. It changes per step because
 * the reassurance that is TRUE changes per step, and a standing "nothing is
 * committed" would become a lie at step 4.
 *
 * ── STEP 5 IS A CONFIRMATION, NOT A CHOICE ──
 *
 * It used to be the visibility allocation — a grid asking which single lease
 * the plan should show in full, with a full receipt behind it. Both are gone.
 * Step 4 files the claim and step 5 says it landed, with one way on: the
 * dashboard, where the claimed record actually is.
 *
 * `TOTAL_STEPS` is this array's length, so the stepper, the caption bar and
 * every step intro follow the list rather than a number written down in four
 * places.
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
    railSub: "Locate the record you own",
    caption: "Search the public record",
    aside: "Nothing here changes who owns anything.",
    icon: "search",
  },
  {
    n: 2,
    label: "Pick your record",
    railSub: "Select from the available records",
    caption: "Pick the record that's yours",
    aside: "Values stay hidden until you're confirmed",
    asideLock: true,
    icon: "users",
  },
  {
    n: 3,
    label: "Prove it's yours",
    railSub: "Verify your ownership",
    caption: "Confirm the address on the record",
    aside: "Still nothing filed — the next step commits",
    icon: "shield",
  },
  {
    n: 4,
    label: "See your leases",
    railSub: "Review your lease details",
    caption: "The leases this claim will take",
    aside: "This is the step that commits",
    icon: "leases",
  },
  {
    n: 5,
    label: "You're claimed",
    railSub: "Your record is now verified",
    caption: "Claim filed",
    aside: "All your leases stay on your record",
    icon: "eye",
  },
];

export const TOTAL_STEPS = claimSteps.length;
