"use client";

import { ChevronDown, Lightbulb } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * THE GUIDE BOX — every step ends with one, above the buttons.
 *
 * It is where the flow says what is happening TECHNICALLY: which sources the
 * query runs against, what a claim event actually writes, what "archived"
 * means at the database level. That belongs on the page — an owner deciding
 * whether to attach their name to a public record is entitled to know what the
 * button does — but it must not be the first thing they read, or the flow
 * becomes documentation with a form attached.
 *
 * So it is last, tinted, and headed "Guide", which is a promise that the step
 * is already complete without it.
 *
 * ── ON A PHONE IT OPENS AT THREE LINES (requested) ──
 *
 * The same paragraph that is two lines on a desktop card is six on a 375px
 * screen, and it sits between the form and the button that leaves the step —
 * so the note a reader was meant to be able to skip became the thing they
 * scroll past to reach the control. Clamped to three lines with a "Read more",
 * it keeps its place in the order and costs half the height.
 *
 * NOTHING CHANGES ABOVE 640px. The clamp, the button and the measuring all
 * stop at `sm:`, where the note was never the problem.
 */
export function GuideNote({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const body = useRef<HTMLDivElement>(null);
  /* `useId`, not a slug of the title: the walkthrough mounts a second
     `ClaimShell` over the page, so two guides can be in the document at
     once and a title-derived id would be the same on both. */
  const bodyId = useId();

  /** Whether the clamped body actually has more to show. */
  const [overflows, setOverflows] = useState(false);
  const [open, setOpen] = useState(false);

  /*
   * MEASURED, NOT ASSUMED — because the notes are not the same length. Step 1's
   * runs to six lines on a phone and step 2's to two, and a "Read more" on a
   * note with nothing more to read is a control that lies.
   *
   * ONLY WHILE COLLAPSED: expanded, the clamp is gone and `scrollHeight` equals
   * `clientHeight`, so measuring then would report "nothing hidden" and take
   * the button away mid-read.
   *
   * ABOVE `sm:` THE CLAMP IS NOT APPLIED AT ALL, so the same measurement
   * returns false there and the button never appears — the breakpoint is
   * honoured without this having to know about it.
   *
   * Deferred inside a timeout: a synchronous setState in an effect body is what
   * `react-hooks/set-state-in-effect` exists to refuse, and it would be a second
   * render pass besides. Re-measured on resize, because a rotation changes the
   * answer.
   */
  useEffect(() => {
    if (open) return;

    const measure = () => {
      const el = body.current;
      if (el) setOverflows(el.scrollHeight > el.clientHeight + 1);
    };

    const timer = setTimeout(measure, 0);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", measure);
    };
  }, [open]);

  return (
    /* TIGHTER THAN THE CARDS AROUND IT (requested). 16px of padding on every
       side gave a two-line footnote the same weight of surround as a panel of
       form fields; 10px top and bottom keeps the tint reading as one block
       without the note looking like it holds a card's worth of content. The
       horizontal padding stays at 16px — that one is stopping the text touching
       the tinted edge, and it was never the space in question. */
    <aside
      data-claim="guide"
      className="rounded-[10px] border border-mv-mint-edge bg-mv-mint/60 px-4 py-[10px]"
    >
      <h3 className="flex items-center gap-[7px] text-[12.5px] font-bold text-mv-green-deep">
        <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-mv-mint">
          <Lightbulb aria-hidden="true" className="h-[13px] w-[13px]" />
        </span>
        Guide — {title}
      </h3>

      <div className="relative">
        {/* `line-clamp-3` needs the element to be the one holding the text,
            which is why the clamp sits here and not on a wrapper: it works by
            turning this box into a 3-line flex container, and a wrapper would
            clamp a single child box that is already six lines tall. */}
        <div
          ref={body}
          id={bodyId}
          className={`mt-[3px] pl-[29px] text-[12px] leading-[1.6] text-mv-slate sm:line-clamp-none ${
            open ? "" : "line-clamp-3"
          }`}
        >
          {children}
        </div>

        {/*
          "READ MORE" SITS ON THE THIRD LINE, NOT UNDER IT (requested).

          Below the clamp it was a fourth line — the note then cost four lines
          to say it was showing three, which is most of what the clamp had just
          saved. Laid over the end of line 3 it costs nothing at all.

          ── WHY IT NEEDS A BACKGROUND, AND WHY THAT HEX ──

          It is painted OVER the last words of the clamped text, so it has to be
          opaque or the two read through each other. `#f0fff9` is this note's own
          background resolved: `bg-mv-mint/60` (#e6fff5 at 60%) over the card's
          white. It has to be stated because a second `bg-mv-mint/60` here would
          layer on the first and come out darker.

          The gradient to its left softens the cut, so the line ends in a fade
          rather than a word sliced down the middle.

          ONLY WHILE COLLAPSED. Expanded there is no clamp to sit on, so "Show
          less" goes back to its own line below — where there is no text for it
          to cover and nothing to save.
        */}
        {overflows && !open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={false}
            aria-controls={bodyId}
            className="absolute right-0 bottom-0 flex cursor-pointer items-center gap-[4px] bg-[#f0fff9] pl-2 text-[12px] leading-[1.6] font-bold text-mv-green-deep underline underline-offset-2 before:pointer-events-none before:absolute before:top-0 before:right-full before:bottom-0 before:w-8 before:bg-linear-to-l before:from-[#f0fff9] sm:hidden"
          >
            Read more
            <ChevronDown aria-hidden="true" className="h-[13px] w-[13px]" />
          </button>
        )}
      </div>

      {/* `aria-expanded` and `aria-controls` on both halves rather than swapping
          a label: a screen reader announcing "Read more, button" and then the
          same button as "Show less" has no way to tell that the thing it
          controls is now open. */}
      {overflows && open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-expanded
          aria-controls={bodyId}
          className="mt-[5px] ml-[29px] flex cursor-pointer items-center gap-[4px] text-[12px] font-bold text-mv-green-deep underline underline-offset-2 sm:hidden"
        >
          Show less
          <ChevronDown
            aria-hidden="true"
            className="h-[13px] w-[13px] rotate-180"
          />
        </button>
      )}
    </aside>
  );
}
