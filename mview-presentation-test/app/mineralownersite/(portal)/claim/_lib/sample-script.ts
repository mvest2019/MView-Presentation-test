import type { OwnerRecord } from "./claim-types";
import {
  SAMPLE_COUNTY,
  SAMPLE_NAME,
  SAMPLE_RESULTS,
  SAMPLE_RESULTS_IN_COUNTY,
  SAMPLE_SELECTED,
} from "./sample-flow";

/**
 * THE WALKTHROUGH'S SCRIPT — what the pointer does, beat by beat.
 *
 * ── WHY A TIMELINE OF ACTS AND NOT FIVE SCREENSHOTS ──
 *
 * The five screens on their own show WHAT the flow looks like and nothing about
 * HOW it is used: a reader who has never typed into it still does not know that
 * a name alone is enough to start, that a common name comes back in the
 * hundreds, or that the county box is what cuts that down. Acting it out — a
 * pointer that moves to the field, types, and presses the button — answers all
 * three without a word of instruction.
 *
 * ── EACH ACT CARRIES THE WHOLE STATE, NOT A MUTATION ──
 *
 * `state` is what the screens are fed WHILE that act runs, in full. That is
 * what makes the scrubber work: jumping to any act is assigning its state, with
 * nothing to replay and no chance of the demo landing in a state no sequence of
 * acts could have produced. A list of `apply(draft)` mutations would have to be
 * re-run from the top on every seek.
 *
 * ── THE POINTER FINDS ITS TARGET IN THE DOM ──
 *
 * `target` is a function rather than a selector string because half of these
 * are identified by their words — "the button that says Review leases" — and
 * CSS cannot say that. It is handed the stage element and returns what to point
 * at, or null; a null simply leaves the pointer where it was, which is the
 * right behaviour if a screen ever stops carrying that control.
 */

export interface DemoState {
  /** 1-5 — which of the real step components is mounted. */
  step: number;
  name: string;
  county: string;
  /** `null` before the first search: step 2's own "nothing yet" state. */
  results: OwnerRecord[] | null;
  loading: boolean;
  selected: string[];
  confirmed: string[];
  attested: boolean;
  /** The claim has been filed — step 5's receipt is live. */
  claimed: boolean;
}

export interface Act {
  /** 1-5, for the rail. Several acts share a screen. */
  screen: number;
  /** How long this beat runs. */
  ms: number;
  /** What the reader is being shown doing, in the caption bar. */
  caption: string;
  /** Where the pointer should be. Omitted: it stays put. */
  target?: (stage: HTMLElement) => Element | null | undefined;
  /**
   * SCROLL THE STAGE TO THIS ELEMENT, CONTINUOUSLY, over the act's duration.
   *
   * Distinct from `target`, which SNAPS the element into view so the pointer
   * can be placed on it — a jump, and the right behaviour when the point is to
   * press something. This one is the scroll itself: the reader is reading down
   * a list, and that has to glide or it reads as a page turn.
   */
  glide?: (stage: HTMLElement) => Element | null | undefined;
  /** Ring the pointer at the end of the move. */
  click?: boolean;
  /**
   * How long after the act starts the ring fires, in ms. Default 560, which is
   * roughly how long the pointer takes to travel.
   *
   * SET IT TO 0 WHEN THE POINTER IS ALREADY THERE — on the second half of a
   * move-then-press pair, waiting out a travel that already happened would put
   * the ring half a second after the thing it is supposed to have caused.
   */
  clickDelay?: number;
  /**
   * Type into a field over the act's duration. The rendered value is sliced
   * from `state`'s value by how far through the act we are, so the letters
   * appear one at a time without a second timer.
   */
  typing?: "name" | "county";
  state: DemoState;
}

const BLANK: DemoState = {
  step: 1,
  name: "",
  county: "",
  results: null,
  loading: false,
  selected: [],
  confirmed: [],
  attested: false,
  claimed: false,
};

/** `{...BLANK, ...}` gets verbose over twenty acts. */
const at = (patch: Partial<DemoState>): DemoState => ({ ...BLANK, ...patch });

/* ── FINDING THINGS ON THE STAGE ──────────────────────────────────────────── */

const byPlaceholder = (fragment: string) => (stage: HTMLElement) =>
  [...stage.querySelectorAll("input")].find((input) =>
    input.placeholder.toLowerCase().includes(fragment.toLowerCase()),
  );

/** A button by its words. `title` is included so an icon-only one can match. */
const byLabel = (fragment: string) => (stage: HTMLElement) =>
  [...stage.querySelectorAll("button, a")].find((el) =>
    `${el.textContent ?? ""} ${el.getAttribute("title") ?? ""}`
      .toLowerCase()
      .includes(fragment.toLowerCase()),
  );

/** The nth record card on step 2 — the label wrapping its checkbox. */
const card = (n: number) => (stage: HTMLElement) => {
  const box = [...stage.querySelectorAll('input[type="checkbox"]')][n];
  return box?.closest("label") ?? box;
};

/** Anything the steps tag for the walkthrough — see `data-claim` in `claim.css`. */
const byData = (name: string) => (stage: HTMLElement) =>
  stage.querySelector(`[data-claim="${name}"]`);

/**
 * THE LAST ROW OF WHATEVER LIST THE SCREEN IS SHOWING.
 *
 * Step 5's receipt is `<li>`s; the earlier screens use labels and table rows.
 * Taking the last of whichever is present lets one glide act read "scroll to
 * the end of this list" without the script needing to know which screen it is
 * on — and a screen whose list already fits simply scrolls nowhere, because the
 * glide clamps to the scrollable range.
 */
const lastRow = (stage: HTMLElement) => {
  const rows = stage.querySelectorAll("li, tbody tr");
  return rows[rows.length - 1];
};

/** Step 3's attestation — the LAST checkbox on the screen, under the list. */
const attestBox = (stage: HTMLElement) => {
  const boxes = [...stage.querySelectorAll('input[type="checkbox"]')];
  const box = boxes[boxes.length - 1];
  return box?.closest("label") ?? box;
};

/* ── THE SCRIPT ───────────────────────────────────────────────────────────── */

const searched = {
  name: SAMPLE_NAME,
  county: "",
  results: SAMPLE_RESULTS,
  step: 2,
};

const filtered = {
  name: SAMPLE_NAME,
  county: SAMPLE_COUNTY,
  results: SAMPLE_RESULTS_IN_COUNTY,
  step: 2,
};

/**
 * STEP 3'S STATE, WITH WHICHEVER ADDRESSES HAVE BEEN TICKED SO FAR.
 *
 * ── IT OPENS WITH THE PICKED RECORDS ALREADY TICKED, AND THAT IS THE FLOW ──
 *
 * `claim-wizard.tsx` seeds this from the pick — `setConfirmed(records.map(
 * recordKey))` — so arriving at step 3 the addresses taken on step 2 are green
 * before the reader touches anything. The walkthrough briefly showed all three
 * empty, which is a screen the real flow never renders.
 *
 * What is NOT seeded is the `others` row: the same doorstep found on a second
 * county roll. That one starts empty because nobody picked it, and it is the
 * only address the pointer has any business clicking here.
 */
const proving = (confirmed: string[] = SAMPLE_SELECTED) => ({
  ...filtered,
  step: 3,
  selected: SAMPLE_SELECTED,
  confirmed,
});

/** Step 4's state — the lease table, nothing filed yet. */
const leases = () => ({
  ...filtered,
  step: 4,
  selected: SAMPLE_SELECTED,
  confirmed: SAMPLE_SELECTED,
  attested: true,
});

/** Step 5's state — the claim is filed and the receipt is on screen. */
const claimed = () => ({
  ...filtered,
  step: 5,
  selected: SAMPLE_SELECTED,
  confirmed: SAMPLE_SELECTED,
  attested: true,
  claimed: true,
});

export const SAMPLE_ACTS: Act[] = [
  /* ── 1 · FIND ── */
  {
    screen: 1,
    ms: 1400,
    caption:
      "Start with a name. County, lease and address only narrow a common one — none of them is required.",
    state: at({}),
  },
  {
    screen: 1,
    ms: 900,
    caption: "The owner name as it appears on your cheques or mail.",
    target: byPlaceholder("Mineral Owner"),
    state: at({}),
  },
  {
    screen: 1,
    ms: 1900,
    caption: "The owner name as it appears on your cheques or mail.",
    target: byPlaceholder("Mineral Owner"),
    typing: "name",
    state: at({ name: SAMPLE_NAME }),
  },
  {
    screen: 1,
    ms: 900,
    caption:
      "One filter is enough — the button wakes up as soon as there is one.",
    target: byLabel("Search records"),
    state: at({ name: SAMPLE_NAME }),
  },
  {
    screen: 1,
    ms: 700,
    caption: "Searching the public record. Nothing is claimed by looking.",
    target: byLabel("Search records"),
    click: true,
    state: at({ name: SAMPLE_NAME }),
  },
  {
    screen: 2,
    ms: 1200,
    caption: "Searching the public record. Nothing is claimed by looking.",
    state: at({ step: 2, name: SAMPLE_NAME, loading: true }),
  },

  /* ── 2 · PICK ── */
  {
    screen: 2,
    ms: 2600,
    caption:
      "Twenty records carry this name. That is normal — the roll spells one person several ways, and each spelling is its own record.",
    state: at(searched),
  },
  /*
   * READING DOWN THE LIST BEFORE FILTERING IT (requested).
   *
   * ── IT GLIDES, IT DOES NOT PAGE ──
   *
   * The first build of this beat used `target` on three cards further down the
   * list, which SNAPS each one into view: three jumps of four-hundred-odd
   * pixels, and it read as turning pages rather than scrolling. `glide` moves
   * the stage continuously across the whole act instead.
   *
   * ── A FEW RECORDS, NOT ALL TWENTY ──
   *
   * Six cards is enough to show that the list keeps going, which is the whole
   * point; running to the twentieth took five seconds to say the same thing and
   * left the reader at the bottom of a list the next beat has to climb back out
   * of.
   *
   * IT IS THE BEAT THAT MAKES THE COUNTY BOX MEAN SOMETHING. Cutting from
   * twenty to six lands as a relief only if the twenty were felt first.
   *
   * No `click` — nothing is being pressed, and a ring would say otherwise.
   */
  {
    screen: 2,
    /* SLOW (requested, twice). The distance is fixed by the cards, so duration
       is the only thing that sets the speed: about 800px, so 7.5s puts it near
       105px a second — slower than a comfortable reading scroll, which is the
       point. It was 2.2s, then 4.6s, and both still read as a flick. */
    ms: 7500,
    caption: "Twenty near-identical spellings, and only some of them are you.",
    glide: card(5),
    state: at(searched),
  },
  {
    screen: 2,
    /* The way back is a return, not a beat of its own, so it moves faster than
       the way down — but still slowly enough to read as travel. */
    ms: 3800,
    caption: "Scrolling to find yours is the work the county box saves.",
    /* BACK TO THE TOP. `firstElementChild` is the stage's own wrapper, so
       this is "scroll to 0" expressed as an element — which is what the
       glide takes. Step 2 has no <form> to aim at; the fields live in a
       plain card, so looking one up would have fallen through to exactly
       this and only read as though it meant something more. */
    glide: (stage) => stage.firstElementChild,
    state: at(searched),
  },
  {
    screen: 2,
    ms: 1100,
    caption: "The county box is how you cut a common name down.",
    target: byPlaceholder("Any Texas county"),
    state: at(searched),
  },
  {
    screen: 2,
    ms: 1500,
    caption: "The county box is how you cut a common name down.",
    target: byPlaceholder("Any Texas county"),
    typing: "county",
    state: at({ ...searched, county: SAMPLE_COUNTY }),
  },
  {
    screen: 2,
    ms: 2400,
    caption: "Twenty down to six — every record on the Reeves roll.",
    click: true,
    state: at(filtered),
  },
  /*
   * A TICK IS TWO ACTS: TRAVEL, THEN PRESS.
   *
   * It was one — the pointer set off for the card and the card's state in that
   * same act already had it selected, so the box was ticked a second before the
   * pointer arrived and the ring fired on a card that was already done. The
   * demo showed the result and then mimed the cause.
   *
   * Split, the first act only moves (nothing selected yet) and the second
   * carries both the ring and the tick. `clickDelay: 0` because the pointer has
   * already arrived — the default 560ms exists to cover travel that, here,
   * happened in the act before.
   */
  {
    screen: 2,
    ms: 800,
    caption: "Tick every record that is you. You can take more than one.",
    target: card(0),
    state: at(filtered),
  },
  {
    screen: 2,
    ms: 900,
    caption: "Tick every record that is you. You can take more than one.",
    target: card(0),
    click: true,
    clickDelay: 0,
    state: at({ ...filtered, selected: SAMPLE_SELECTED.slice(0, 1) }),
  },
  {
    screen: 2,
    ms: 800,
    caption:
      "Both spellings are the same person, so both go forward — together, in one claim.",
    target: card(1),
    state: at({ ...filtered, selected: SAMPLE_SELECTED.slice(0, 1) }),
  },
  {
    screen: 2,
    ms: 1000,
    caption:
      "Both spellings are the same person, so both go forward — together, in one claim.",
    target: card(1),
    click: true,
    clickDelay: 0,
    state: at({ ...filtered, selected: SAMPLE_SELECTED }),
  },
  {
    screen: 2,
    ms: 1100,
    caption:
      "Both spellings are the same person, so both go forward — together, in one claim.",
    target: byLabel("Review addresses"),
    click: true,
    state: at({ ...filtered, selected: SAMPLE_SELECTED }),
  },

  /* ── 3 · PROVE ── */
  {
    screen: 3,
    ms: 2600,
    caption:
      "Values appear here for the first time. The address is what separates you from someone with the same name.",
    state: at(proving()),
  },

  /*
   * NOTHING IS TICKED HERE (requested).
   *
   * The pointer used to click the second address — the Ward roll's spelling of
   * the same doorstep, the one row `claim-wizard.tsx` does not seed because
   * nobody picked it. It was a defensible thing to demonstrate and it is not
   * what this screen needs to say: the addresses arrive already confirmed from
   * step 2, and the ONE thing the reader has to do here is the attestation.
   *
   * So the beat is read, then attest, then move on — and every move is
   * downward, since the attestation and the button both sit at the foot of the
   * screen.
   */
  {
    screen: 3,
    ms: 5200,
    caption: "Every address the roll holds under these names.",
    glide: card(2),
    state: at(proving()),
  },
  {
    screen: 3,
    ms: 700,
    caption: "One tick to say the claim is made in good faith.",
    target: attestBox,
    state: at(proving()),
  },
  {
    screen: 3,
    ms: 900,
    caption: "One tick to say the claim is made in good faith.",
    target: attestBox,
    click: true,
    clickDelay: 0,
    state: at({ ...proving(), attested: true }),
  },
  {
    screen: 3,
    ms: 1100,
    caption: "Still nothing filed — the next screen is where that happens.",
    target: byLabel("Review leases"),
    click: true,
    state: at({ ...proving(), attested: true }),
  },

  /* ── 4 · LEASES ── */
  {
    screen: 4,
    ms: 3000,
    caption:
      "Every lease those names hold statewide, not just the county you searched. Sort any column to read it your way.",
    state: at(leases()),
  },
  /*
   * READ DOWN THE LEASE TABLE (requested).
   *
   * This screen was the one that still jumped: it held on the totals, then the
   * pointer's aim SNAPPED the commit button into view — the page-turn the glide
   * exists to avoid, on the one screen where the reader most needs to see what
   * they are agreeing to.
   *
   * Aimed at the action row rather than the last table row, because that is
   * where the pointer is going next: the glide ends exactly where the press
   * happens, so nothing has to move twice. The table's own scroller does not
   * come into it — six rows sit well inside its 440px cap, so what scrolls here
   * is the screen, not the table.
   */
  {
    screen: 4,
    ms: 5200,
    caption: "Six leases, three operators, two counties — all of it in one go.",
    glide: byData("step-actions"),
    state: at(leases()),
  },
  {
    screen: 4,
    ms: 900,
    caption: "This is the button that commits. Everything before it was free.",
    target: byLabel("Claim 6 leases"),
    state: at(leases()),
  },
  {
    screen: 4,
    ms: 1300,
    caption: "This is the button that commits. Everything before it was free.",
    target: byLabel("Claim 6 leases"),
    click: true,
    clickDelay: 0,
    state: at(leases()),
  },

  /* ── 5 · CLAIMED ── */
  {
    screen: 5,
    ms: 4200,
    caption:
      "Filed. The record is linked to your account — nothing about who owns the minerals changed, and it is reversible from Settings.",
    state: at(claimed()),
  },
  /*
   * READ THE RECEIPT (requested). The claimed-lease rows run past the bottom of
   * the frame — on a real claim of a dozen names, well past it — and the demo
   * used to end with them half shown. Same slow glide as the other lists.
   *
   * A claim short enough to fit scrolls nowhere: the glide clamps to what the
   * stage can actually scroll, so this costs a still screen rather than a jerk.
   */
  {
    screen: 5,
    ms: 6000,
    caption: "Every lease the claim took, name by name.",
    glide: lastRow,
    state: at(claimed()),
  },
  {
    screen: 5,
    ms: 2600,
    caption: "Every lease the claim took, name by name.",
    state: at(claimed()),
  },
];

/** Rail labels — the flow's own step names, one per screen. */
export const SAMPLE_RAIL = [
  "Find",
  "Pick",
  "Prove",
  "Leases",
  "Claimed",
] as const;

/** The first act of each screen, for the scrubber to seek to. */
export const SCREEN_STARTS = SAMPLE_RAIL.map((_, i) =>
  SAMPLE_ACTS.findIndex((act) => act.screen === i + 1),
);
