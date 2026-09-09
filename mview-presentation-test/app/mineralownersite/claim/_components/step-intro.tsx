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
      <div className="flex items-center gap-[14px]">
        <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-mv-mint text-mv-green-deep">
          <Icon
            aria-hidden="true"
            className="h-[17px] w-[17px]"
            strokeWidth={2.2}
          />
        </span>

        <div className="min-w-0">
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
          <h2 className="mt-[3px] text-[clamp(19px,2.6vw,23px)] font-bold leading-[1.25] tracking-[-.01em] text-mv-slate">
            {title}
          </h2>
        </div>
      </div>

      {/* The lead and the body stay at the FULL width of the column, flush with
          the tile's left edge — indenting them to line up under the heading
          would cost the paragraph 48px on a phone to no benefit. */}
      {/* The instruction is a step DOWN from the heading, not level with it. At
          bold-on-ink it was the same colour and nearly the same weight as the
          h2 above, so the two read as one heavy block rather than a title and
          the sentence that follows it. */}
      {lead && (
        <p className="mt-[14px] text-[14px] font-semibold text-mv-slate">
          {lead}
        </p>
      )}

      {/* FULL COLUMN WIDTH — the 68ch reading measure that used to cap this is
          gone (requested). It was holding the explanation to roughly two-thirds
          of the column and spilling every step's opening paragraph onto a third
          line, with the right third of the card left empty beside it. The
          paragraphs are two lines each, which is short enough that the long
          measure costs nothing a reader would notice. */}
      {children && (
        <div className="mt-[6px] text-[13px] leading-[1.65] text-mv-muted">
          {children}
        </div>
      )}
    </header>
  );
}
