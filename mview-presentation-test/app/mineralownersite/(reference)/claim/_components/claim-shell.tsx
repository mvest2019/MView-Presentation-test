"use client";

import { CircleCheck, Lock, ShieldCheck } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { claimSteps, TOTAL_STEPS } from "../_lib/claim-steps";
import { ClaimStepper } from "./claim-stepper";

/**
 * How far down the viewport the flow's top edge should land after a step
 * change: the portal's sticky top bar (58px) plus the pinned value bar (45px),
 * plus a few pixels so the card does not touch the bar above it.
 */
const STICKY_OFFSET = 112;

/**
 * THE FRAME EVERY STEP RENDERS INSIDE — title bar, stepper, caption bar, and
 * the two columns.
 *
 * ── THE CAPTION BAR IS THE PIECE THAT EARNS ITS KEEP ──
 *
 * "Step 3 of 5 — Confirm the address, then the claim is made" on the left, and
 * on the right the step's own promise. It reads as chrome and it is not: it is
 * the only place the flow tells you, before you have read a word of the step,
 * whether this screen commits anything. Both halves come from `claim-steps.ts`
 * so the stepper above cannot disagree with them.
 *
 * ── ONE COLUMN, FULL WIDTH ──
 *
 * There was a 320px rail beside the step card and there is not any more
 * (requested). The step now owns the whole measure, which is what step 4's
 * five-column lease table and step 5's card grid wanted all along.
 *
 * `claim.css` still pins `.app-body` to one width for this route, so the
 * portal's density switch cannot change how wide this flow renders.
 *
 * ── IT RETURNS YOU TO THE TOP WHEN THE STEP CHANGES ──
 *
 * Every step's button is at the BOTTOM of a long screen, so advancing without
 * this drops you into the middle of the next one — past its heading, past the
 * stepper, and on step 3 past the record you are being asked to confirm. The
 * first render is skipped so arriving at the page does not yank it.
 */
export function ClaimShell({
  current,
  done = false,
  below,
  scrollOnChange = true,
  children,
}: {
  current: number;
  /**
   * THE CLAIM IS WRITTEN AND THE FLOW IS OVER. The stepper comes off — five
   * numbered stages with the last one lit would invite a sixth tap on a form
   * that no longer exists — and the caption bar says so instead.
   */
  done?: boolean;
  /**
   * Full width, BELOW the step card. The completion screen uses it for the
   * blocks that used to sit in the rail.
   */
  below?: ReactNode;
  /**
   * RETURN TO THE TOP WHEN THE STEP CHANGES. True on the real flow, where each
   * step's button is at the bottom of a long screen.
   *
   * The sample walkthrough turns it OFF. It renders this shell inside a modal
   * that advances itself every few seconds, and the scroll it would fire moves
   * the PAGE BEHIND the dialog — a page the reader cannot see and did not ask
   * to move, left somewhere else when the popup closes.
   */
  scrollOnChange?: boolean;
  children: ReactNode;
}) {
  const step = claimSteps[current - 1];
  const root = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (!scrollOnChange) return;

    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    /*
     * ── WHY AN EXPLICIT `scrollTo` AND NOT `scrollIntoView` + `scroll-mt` ──
     *
     * The idiomatic pair was tried first and does not land here: it stopped
     * with the card's top at 32px, under the pinned value bar, and calling it
     * again would not move it. Computing the target and scrolling the window to
     * it is deterministic and checkable — the card's top lands at exactly
     * `STICKY_OFFSET`.
     *
     * ── WHY `instant`, EXPLICITLY, AND NOT THE INHERITED SMOOTH ──
     *
     * `globals.css` sets `scroll-behavior: smooth` on `html`, so an unqualified
     * scroll inherits it — and a smooth scroll UPWARD was measured doing
     * nothing at all on this page, leaving the reader mid-step with no
     * indication the step had changed. Naming `instant` opts out of the
     * inherited value rather than relying on it.
     *
     * It is also the better behaviour on its own merits. This is a full content
     * swap, not a jump within one document: animating the scroll of a page
     * whose content has already been replaced animates nothing meaningful, and
     * an instant reposition is what an ordinary page navigation does. It needs
     * no `prefers-reduced-motion` branch for the same reason — there is no
     * motion to reduce.
     *
     * ── DEFERRED BY ONE FRAME ──
     *
     * So the incoming step's layout has settled. The five steps are different
     * heights, and a target measured against the outgoing one is wrong by that
     * difference.
     */
    const frame = requestAnimationFrame(() => {
      const node = root.current;
      if (!node) return;
      const target =
        node.getBoundingClientRect().top + window.scrollY - STICKY_OFFSET;
      window.scrollTo({ top: Math.max(0, target), behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [current, done, scrollOnChange]);

  return (
    <div
      ref={root}
      /* `mv-claim-flow` is a MARKER, not styling — `claim.css` uses it to opt
         this route out of two global `portal.css` rules that would otherwise
         make the flow look different in each density. See that file. */
      className="mv-claim-flow @container rounded-mv border border-mv-line bg-mv-card p-5 shadow-mv max-[767px]:p-3"
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <h1
          data-claim="heading"
          className="flex items-center gap-[9px] text-[17px] font-extrabold tracking-[-.01em] text-mv-ink"
        >
          <ShieldCheck
            aria-hidden="true"
            className="h-[19px] w-[19px] text-mv-green-deep"
          />
          Claim your owner record
        </h1>
        {/*
          "SAVED AS YOU GO" WAS REMOVED, BECAUSE IT WAS NOT TRUE.

          It promised the reader that leaving or refreshing would not cost them
          anything: come back and your progress is here. Nothing in this flow is
          persisted — the query, the ticked records, the resolved addresses and
          the lease set are all React state and nothing else — so F5 on step 4
          returns an empty step 1. The line was the one thing on screen telling
          a reader it was safe to close the tab, and it was wrong.

          The fix is the honest half of the choice. Making it TRUE is a real
          feature, not a copy change: the search answer alone is over a thousand
          records with their lease arrays, which is the wrong thing to put in
          `localStorage`, so a restore has to re-run the search and re-resolve
          the picks — with a filed claim as its own case. Worth doing, and worth
          doing deliberately rather than to justify a sentence.

          What replaces it is a fact the flow can keep. "About two minutes" is
          the same promise this page's own metadata makes, and it answers the
          question the line was really there for — how much am I taking on.
        */}
        <p className="flex items-center gap-[6px] text-[12px] text-mv-muted">
          <CircleCheck
            aria-hidden="true"
            className="h-[14px] w-[14px] text-mv-green-deep"
          />
          {TOTAL_STEPS} short steps · About two minutes · No card, ever
        </p>
      </header>

      {!done && <ClaimStepper current={current} />}

      {/* The caption bar sits CLOSER to the step card than to the stepper above
          it (requested): 10px below, 12px above. It reads as that card's own
          strapline — "Step 1 of 5 — Search the public record" describes what is
          in the panel underneath, not what is in the numbered rail on top — and
          the tighter side is the side it belongs to. */}
      <div
        className={`mb-[10px] flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-[12px] text-mv-muted ${
          done ? "" : "mt-3"
        }`}
      >
        {done ? (
          /* No right-hand aside once the flow is over: the "you can change this
             in Settings" line it used to carry is said again, in place, by the
             "Unclaim in Settings" link at the foot of the card. */
          <p className="flex items-center gap-[7px] text-[12.5px]">
            <CircleCheck
              aria-hidden="true"
              className="h-[15px] w-[15px] flex-none text-mv-green-deep"
            />
            <span>
              <b className="font-bold text-mv-green-deep">Done</b> — Your owner
              record is claimed!
            </span>
          </p>
        ) : (
          <>
            <p>
              Step {current} of {TOTAL_STEPS} — {step.caption}
            </p>
            <p className="flex items-center gap-[6px]">
              {step.asideLock && (
                <Lock aria-hidden="true" className="h-[12px] w-[12px]" />
              )}
              {step.aside}
            </p>
          </>
        )}
      </div>

      {/* FULL WIDTH — there is no side rail any more (requested). It carried the
          vertical progress list, a reassurance note per step and, on the
          completion screen, the next-steps and value cards; the first duplicated
          the stepper above, and what was worth keeping moved into `below`.

          Still `@container`: the grids INSIDE a step (step 1's field pairs,
          step 4's stat tiles, step 5's lease cards) measure the column they live
          in rather than the window, which is what keeps them right in all four
          portal densities. Dropping the rail simply makes that column wider. */}
      <div
        data-claim="panel"
        className="@container rounded-mv border border-mv-line bg-mv-card p-[22px] max-[767px]:p-4"
      >
        {children}
      </div>

      {below && <div className="mt-[18px]">{below}</div>}
    </div>
  );
}
