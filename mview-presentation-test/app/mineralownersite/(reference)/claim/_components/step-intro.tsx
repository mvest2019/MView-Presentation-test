import { ArrowLeft, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { TOTAL_STEPS } from "../_lib/claim-steps";

/**
 * EVERY STEP OPENS THE SAME WAY: a tinted glyph tile with "STEP N OF 5" and the
 * heading beside it, then one bold sentence saying what to do, then the
 * explanation.
 *
 * ── WHY `lead` IS A SEPARATE PROP FROM `children` ──
 *
 * The bold line is the INSTRUCTION and the paragraph under it is the
 * MECHANISM — "Choose the one that best matches you" against three paragraphs
 * about fuzzy name matching across RRC and county strings. Someone who already
 * knows what they are doing reads the first and skips the second, which only
 * works if the two are visibly different weights. Passing them as one blob puts
 * that decision in five separate call sites.
 *
 * `eyebrow` overrides "STEP N OF 5" for the two steps whose design adds their
 * own name to it ("STEP 3 OF 5 · PROVE IT'S YOURS").
 */
export function StepIntro({
  step,
  icon: Icon,
  eyebrow,
  title,
  lead,
  onBack,
  backLabel,
  aside,
  children,
}: {
  step: number;
  icon: LucideIcon;
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  /**
   * A way back, at the TOP of the card.
   *
   * Steps 3 and 4 already end with one, and on step 4 that is under a table
   * sixteen rows long — a control you can only reach by scrolling past the
   * thing you decided against. This one sits above the heading, where the eye
   * already is on arrival, and the footer keeps its own for anyone who reads to
   * the bottom before changing their mind.
   */
  onBack?: () => void;
  backLabel?: string;
  /**
   * ONE CONTROL, RANGED RIGHT ON THE HEADING LINE.
   *
   * For the thing that is ABOUT this step rather than a move within it — step
   * 1's "Watch a sample claim". The footer holds the way forward; the top-right
   * corner is where a reader looks for the way to understand what they are
   * being asked, and it is on screen before the form rather than after it.
   *
   * It is deliberately not a general slot for buttons: anything that acts on
   * the step's own data belongs in the footer with Search, where the reader is
   * already deciding.
   */
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-[10px] flex cursor-pointer items-center gap-[5px] text-[12px] font-semibold text-mv-green-deep hover:underline hover:underline-offset-2"
        >
          <ArrowLeft aria-hidden="true" className="h-[13px] w-[13px]" />
          {backLabel ?? "Back"}
        </button>
      )}

      {/* THE GLYPH SITS BESIDE THE TITLE, not above it. Stacked, the tile spent
          a whole line of vertical space saying what the heading underneath it
          already said, and pushed the step's first real sentence further down
          on every screen. Paired, it reads as one unit — icon, step number,
          name of the step — and the fold gains a line back.

          `items-center` against the two-line block, so the 34px tile centres on
          the eyebrow-plus-heading rather than hanging off the top of it. */}
      {/* ONE WRAPPING ROW HOLDS THE WHOLE HEADER, so the aside can be ordered
          around the sentences below it rather than being stuck between them.
          `items-center` only applies to what actually shares a line — the lead
          and the body take the full width and sit on their own. */}
      <div className="flex flex-wrap items-center gap-x-[14px]">
        <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-mv-mint text-mv-green-deep">
          <Icon
            aria-hidden="true"
            className="h-[17px] w-[17px]"
            strokeWidth={2.2}
          />
        </span>

        {/* `basis-0` KEEPS THE TILE AND THE HEADING ON ONE LINE.
            With `basis-auto` this block's hypothetical width is the title's
            max-content — "Address-verify the owner record before you file the
            claim" laid out in one line — so on a phone it could not fit beside
            a 34px tile and dropped below it, leaving the icon stranded on a row
            of its own. At `basis-0` it always fits and then grows into whatever
            is left, wrapping its text inside itself where it belongs. */}
        <div className="order-1 min-w-0 grow basis-0">
          <p className="text-[10.5px] font-bold tracking-[.12em] text-mv-green-deep uppercase">
            {eyebrow ?? `Step ${step} of ${TOTAL_STEPS}`}
          </p>

          {/* WEIGHT 700 ON SLATE, NOT 800 ON INK.
              `mv-ink` is #0d0e17 — near-black — and extrabold at 19–23px on top
              of it made every step open with a heading heavier than anything
              else on the page, including the portal's own chrome. Nothing was
              competing with it for attention, so the emphasis was spent on a
              contest that was not happening. Bold on `mv-slate` (#1e293b) is
              still unmistakably the heading and stops it reading as shouted. */}
          <h2
            data-claim="step-title"
            className="mt-[3px] text-[clamp(19px,2.6vw,23px)] font-bold leading-[1.25] tracking-[-.01em] text-mv-slate"
          >
            {title}
          </h2>
        </div>

        {/* The lead and the body stay at the FULL width of the column, flush
            with the tile's left edge — indenting them to line up under the
            heading would cost the paragraph 48px on a phone to no benefit. */}
        {/* The instruction is a step DOWN from the heading, not level with it.
            At bold-on-ink it was the same colour and nearly the same weight as
            the h2 above, so the two read as one heavy block rather than a title
            and the sentence that follows it. */}
        {lead && (
          <p
            data-claim="step-lead"
            className="order-2 mt-[14px] w-full text-[14px] font-semibold text-mv-slate sm:order-3"
          >
            {lead}
          </p>
        )}

        {/* FULL COLUMN WIDTH — the 68ch reading measure that used to cap this
            is gone (requested). It was holding the explanation to roughly
            two-thirds of the column and spilling every step's opening paragraph
            onto a third line, with the right third of the card left empty
            beside it. The paragraphs are two lines each, which is short enough
            that the long measure costs nothing a reader would notice. */}
        {children && (
          <div className="order-3 mt-[6px] w-full text-[13px] leading-[1.65] text-mv-muted sm:order-4">
            {children}
          </div>
        )}

        {/*
          THE ASIDE IS LAST ON A PHONE AND TOP-RIGHT EVERYWHERE ELSE.

          ── WHY IT MOVES ──

          In the corner it is out of the reading flow, so it costs the heading
          nothing. Wrapped onto its own line on a narrow card it is IN that
          flow, and it landed between the heading and the instruction — so step
          1 read "Find your record", then a button, then what to actually do.
          An optional "show me how" interrupting the sentence that tells you
          what the step is.

          EVERY ITEM IN THIS ROW CARRIES AN EXPLICIT ORDER, and that is the
          correction to a first attempt that only ordered this one. `order-last`
          alone fixed the phone and broke the desktop: the lead and the body are
          `w-full`, so they end the line they are on, and an aside left in DOM
          order after them lands on a third row — the button dropped out of the
          heading's corner and sat under the instruction, ranged right against
          nothing.

          Phone  1 heading · 2 lead · 3 body · 4 aside
          sm:    1 heading · 2 aside · 3 lead · 4 body

          which is the original desktop layout exactly: the heading block grows
          into the row, so the aside is pushed to the right edge beside it, and
          the lead and body wrap to their own lines underneath.

          ── AND IT IS FULL WIDTH THERE ──

          A 190px chip floating on an otherwise empty line reads as debris. The
          wrapper is a flex row so the button can be told to fill it, and goes
          back to hugging its own words at `sm:`.

          `mt-auto` is deliberately absent: the margin is the button's own, so
          the gap is the same whether or not a step passes a `lead`.
        */}
        {aside && (
          <div className="order-4 mt-[14px] flex w-full [&>*]:flex-1 sm:order-2 sm:mt-0 sm:ml-auto sm:w-auto sm:[&>*]:flex-none">
            {aside}
          </div>
        )}
      </div>
    </header>
  );
}
