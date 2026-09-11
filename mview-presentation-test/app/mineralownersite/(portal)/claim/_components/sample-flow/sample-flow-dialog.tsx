"use client";

import {
  ArrowRight,
  CircleCheck,
  Pause,
  Play,
  PlayCircle,
  RotateCcw,
  X,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { PortalButton } from "../../../../_components/ui/button";
import {
  SAMPLE_CLAIM_SET,
  SAMPLE_COUNTIES,
  SAMPLE_RESULT,
} from "../../_lib/sample-flow";
import {
  SAMPLE_ACTS,
  SAMPLE_RAIL,
  SCREEN_STARTS,
  type Act,
} from "../../_lib/sample-script";
import { ClaimShell } from "../claim-shell";
import { StepFind } from "../steps/step-find";
import { StepLeases } from "../steps/step-leases";
import { StepPick } from "../steps/step-pick";
import { StepProve } from "../steps/step-prove";
import { StepSuccess } from "../steps/step-success";
import { SampleCursor } from "./sample-cursor";

/** Every callback the real steps take, wired to nothing. */
const noop = () => {};

/**
 * "AM I BEING RENDERED INSIDE THE WALKTHROUGH?"
 *
 * ── THE BUG THIS FIXES ──
 *
 * The trigger moved into step 1's heading, and the walkthrough mounts the REAL
 * `StepFind` — so the sample's own first screen drew a second "Watch a sample
 * claim" button. Inert, so it did nothing when pressed, which is worse than
 * useless: a control on screen that cannot be used is one the viewer spends
 * attention on and then distrusts.
 *
 * ── A CONTEXT, NOT A PROP ──
 *
 * A `showSample` prop would have to be threaded from the dialog, through
 * `StepFind`, into `StepIntro`, and every future step that wants its own sample
 * trigger would have to remember to add one. The stage sets this once and
 * anything inside it disappears on its own.
 *
 * It is `false` everywhere else, which is the page, so the real button is
 * unaffected.
 */
const InsideSample = createContext(false);

const LAST = SAMPLE_ACTS.length - 1;

/** How often the pointer and the progress bar are recomputed. */
const TICK_MS = 40;

/** Where the pointer waits before the first act aims it somewhere. */
const HOME = { x: 60, y: 40 };

/**
 * "WATCH A SAMPLE CLAIM" — the trigger on step 1 and the popup it opens.
 *
 * ── IT ACTS THE FLOW OUT, IT DOES NOT SLIDESHOW IT ──
 *
 * A pointer moves to the owner-name box, types a name a letter at a time,
 * presses Search, waits out the search, reads twenty results, types a county to
 * cut them to six, ticks two records, and carries on to the claim. The five
 * screens are the setting; the acting is the point. See `_lib/sample-script.ts`
 * for the beat list and why it is a timeline rather than five screenshots.
 *
 * The reader presses nothing. Pause, scrub back to a screen, and replay are
 * there for anyone who wants them; the walkthrough needs none of them.
 *
 * ── IT SHOWS THE REAL SCREENS, DRIVEN BY REAL STATE ──
 *
 * `StepFind`, `StepPick`, `StepProve`, `StepLeases` and `StepSuccess`
 * themselves, fed from the script's `state`. Not lookalikes: a lookalike drifts
 * from the flow the first time either is restyled, and then the sample is
 * quietly lying. When the typing puts a letter in the name box, it is the real
 * field showing it, and when the county lands, it is `StepPick` re-rendering
 * against a shorter list.
 *
 * The steps are safe to mount here because they do not fetch — every call in
 * the module belongs to `claim-wizard.tsx`, and a step has nothing in it to
 * reach the network with. See `_lib/sample-flow.ts`.
 *
 * ── THE STAGE IS `inert` ──
 *
 * Which is the load-bearing line in this file. Step 4's primary button is the
 * one that POSTS a claim, and it is on screen here. `inert` takes the whole
 * subtree out of hit-testing, out of the tab order and out of the accessibility
 * tree, so no click, keystroke or screen-reader gesture can reach it — and
 * every callback passed in is a no-op besides. Two independent reasons the
 * sample cannot file anything.
 *
 * It is also what lets the drawn pointer own the screen: nothing under it can
 * take a hover or a focus ring the script did not ask for.
 *
 * ── `mv-portal` AND `ClaimShell` ARE WHY IT LOOKS RIGHT ──
 *
 * `portal.css` is unlayered and reaches its subjects through
 * `.mv-portal <element>`. This dialog is portalled to `document.body` to escape
 * step 1's `<form>`, which also puts it outside `.mv-portal` — so the class is
 * copied off the live page, density and all, onto the stage. `ClaimShell`
 * supplies the rest of the page: heading, stepper, caption bar, the card inside
 * a card.
 */
export function SampleFlowButton() {
  /* Inside the walkthrough this renders nothing — see `InsideSample`. The hook
     runs before any other, because a component that returns null must still
     call its hooks in the same order as one that does not. */
  const insideSample = useContext(InsideSample);

  const dialog = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  /*
   * THE PORTAL'S OWN CLASSES, READ OFF THE LIVE PAGE AT OPEN TIME.
   *
   * `mv-portal state-paid view-simple` today — the density half changes with
   * the reader's setting, so it is copied rather than guessed.
   */
  const [portalClass, setPortalClass] = useState("mv-portal");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  /*
   * PROGRESS LIVES IN BOTH A REF AND STATE, ON PURPOSE.
   *
   * The state drives the bar and the typing. The ref is what PAUSE reads:
   * resuming has to pick the act up where it stopped, and the timer effect
   * cannot depend on the progress state to learn that — it would tear itself
   * down and rebuild twenty-five times a second.
   */
  const progressRef = useRef(0);
  const [progress, setProgress] = useState(0);

  const [cursor, setCursor] = useState(HOME);
  const [clicks, setClicks] = useState(0);

  /*
   * THE GLIDE'S START AND END, MEASURED ONCE PER ACT.
   *
   * A ref rather than state: the clock writes `scrollTop` from it twenty-five
   * times a second, and putting the span in state would re-render the whole
   * dialog at that rate to move a number nothing else reads.
   */
  const glideRef = useRef<{ from: number; to: number } | null>(null);

  /** Whether this dialog's own history entry is still on the stack. */
  const pushedRef = useRef(false);

  const act: Act = SAMPLE_ACTS[index];

  const seek = useCallback((next: number) => {
    progressRef.current = 0;
    setProgress(0);
    setIndex(next);
  }, []);

  /*
   * THE CLOCK. One interval per act, rebuilt when the act or the play state
   * changes and never in between.
   *
   * It reads wall time rather than counting its own ticks: a background tab
   * throttles `setInterval` to once a second, and a counter would come back to
   * an act that had barely advanced while the reader was away.
   */
  useEffect(() => {
    if (!open || !playing) return;

    const { ms } = SAMPLE_ACTS[index];
    const started = Date.now() - progressRef.current * ms;

    const id = setInterval(() => {
      const value = (Date.now() - started) / ms;

      if (value < 1) {
        progressRef.current = value;
        setProgress(value);
        /*
         * EASED, NOT LINEAR. A scroll that starts and stops at full speed reads
         * as a jump cut with frames in between; easing gives it the pick-up and
         * settle a wheel gesture has.
         *
         * SINE RATHER THAN QUAD, which was the first choice and is the reason
         * the glide still felt fast after its duration had been doubled: an
         * ease-in-out quad peaks at TWICE its average speed, so the middle of
         * the travel — the part the eye actually watches — was always racing
         * whatever the act's length. Sine peaks at about 1.57x, so the same
         * distance over the same time reads a good deal slower.
         */
        const span = glideRef.current;
        const root = stage.current;
        if (span && root) {
          const t = -(Math.cos(Math.PI * value) - 1) / 2;
          root.scrollTop = span.from + (span.to - span.from) * t;
        }
        return;
      }

      /* The last act does not wrap round to the first — it stops, and the
         footer turns into Replay and the door out. A demo that silently
         restarted would leave a reader unsure whether they had seen it all. */
      if (index === LAST) {
        progressRef.current = 1;
        setProgress(1);
        setPlaying(false);
        return;
      }

      progressRef.current = 0;
      setProgress(0);
      setIndex((i) => i + 1);
    }, TICK_MS);

    return () => clearInterval(id);
  }, [open, playing, index]);

  /*
   * AIMING THE POINTER.
   *
   * Runs on the act, not on every frame: the destination is fixed for the whole
   * beat and the CSS transition does the travel. Measuring per frame would
   * fight that transition and cost a layout read at 25fps for no gain.
   *
   * ── IT SCROLLS THE TARGET INTO VIEW FIRST ──
   *
   * The stage scrolls, and step 2's continue button sits under six record
   * cards. Pointing at something off-screen would move the pointer to a
   * coordinate outside the visible box and look like it had wandered off. The
   * scroll is `instant` for the same reason `ClaimShell`'s is: a smooth scroll
   * racing a 620ms pointer transition arrives after it.
   *
   * ── AND IT WAITS A TICK ──
   *
   * The act's state was assigned in the same commit. On the act that reveals
   * six filtered records, the DOM this reads has to be the one those records
   * are in, not the twenty-card list they replaced.
   *
   * A TIMEOUT AND NOT `requestAnimationFrame`, which was the first thing tried
   * and does not fire at all while the tab is hidden or the window is behind
   * another. That is not a test artefact: a reader who opens the walkthrough,
   * switches away and comes back would find the pointer still parked where it
   * started, because every aim that fell due while they were gone never ran.
   * This only needs to be after the commit, not aligned to a frame.
   */
  /*
   * BACK TO THE TOP WHENEN THE SCREEN CHANGES.
   *
   * The stage is one scroller reused by all five steps, and they are wildly
   * different heights — step 2 is twenty cards, step 1 is a short form. Left
   * alone, a scroll position earned on a long screen carries into the next one
   * and the reader arrives part-way down it, or below its end entirely, staring
   * at the ground under the card and wondering where the page went.
   *
   * Keyed on the SCREEN, not the act: the acts within a screen scroll on
   * purpose — that is what `glide` is for — and resetting between them would
   * undo the reading beat on step 2 every time the pointer moved.
   */
  const screen = act.screen;
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      const root = stage.current;
      if (root) root.scrollTop = 0;
    }, 0);
    /* AND THE POINTER GOES HOME WITH IT. Its coordinates are content-relative,
       so one measured against a long screen is meaningless on a short one — and
       until the next act aims it, that is where it would sit.

       Inside the timeout, not the effect body: `set-state-in-effect` reads a
       synchronous setState during an effect as a second render pass, which is
       exactly what it is. Deferred, it lands the same way every other update in
       this file does. */
    const home = setTimeout(() => setCursor(HOME), 0);
    return () => {
      clearTimeout(timer);
      clearTimeout(home);
    };
  }, [open, screen]);

  /*
   * THE GLIDE REMEMBERS ITS TARGET, NOT A DESTINATION IN PIXELS.
   *
   * It stored a `to` computed once when the act began, and that was wrong at
   * exactly the moment it mattered most: the first glide on a screen runs a beat
   * or two after that screen mounted, and 16ms in the content can still be
   * laying out. `scrollHeight` then equals `clientHeight`, the clamp pins `to`
   * to 0, and the whole act scrolls nowhere — which is what step 3 did, with
   * 286px of overflow sitting there unused.
   *
   * Keeping the NODE and resolving its offset on each tick costs one
   * `getBoundingClientRect` at 25fps and is right whenever the layout settles.
   */
  useEffect(() => {
    if (!open) {
      glideRef.current = null;
      return;
    }

    const aim = SAMPLE_ACTS[index].glide;
    if (!aim) {
      glideRef.current = null;
      return;
    }

    const timer = setTimeout(() => {
      const root = stage.current;
      if (!root) return;

      const node = aim(root);
      if (!(node instanceof HTMLElement)) return;

      const from = root.scrollTop;
      const wanted =
        node.getBoundingClientRect().top -
        root.getBoundingClientRect().top +
        from -
        24;

      glideRef.current = {
        from,
        to: Math.max(
          0,
          Math.min(wanted, root.scrollHeight - root.clientHeight),
        ),
      };
    }, 16);

    return () => clearTimeout(timer);
  }, [open, index]);

  useEffect(() => {
    if (!open) return;

    const aim = SAMPLE_ACTS[index].target;
    if (!aim) return;

    const timer = setTimeout(() => {
      const root = stage.current;
      if (!root) return;

      const node = aim(root);
      if (!(node instanceof HTMLElement)) return;

      node.scrollIntoView({ block: "nearest", behavior: "instant" });

      const box = node.getBoundingClientRect();
      const frameBox = root.getBoundingClientRect();

      /*
       * THE SCROLL OFFSET IS PART OF THE SUM.
       *
       * `getBoundingClientRect` is viewport-relative; the pointer is absolutely
       * positioned inside the stage, which scrolls, so its coordinates are
       * CONTENT-relative. Subtracting the two rects alone is only correct while
       * the stage is scrolled to the top — and step 2's continue button sits
       * under six record cards, which is exactly when it is not.
       *
       * A THIRD IN FROM THE LEFT, not the centre: a pointer parked over the
       * middle of a wide button hides the word on it, and the word is what the
       * reader is meant to be reading.
       */
      setCursor({
        x:
          box.left -
          frameBox.left +
          root.scrollLeft +
          Math.min(box.width / 3, 90),
        y: box.top - frameBox.top + root.scrollTop + box.height / 2,
      });
    }, 16);

    return () => clearTimeout(timer);
  }, [open, index]);

  /*
   * The ring fires once per click act, at the end of the pointer's travel —
   * or immediately, when the act before already did the travelling. See
   * `clickDelay` on `Act`.
   */
  useEffect(() => {
    if (!open || !SAMPLE_ACTS[index].click) return;
    const timer = setTimeout(
      () => setClicks((n) => n + 1),
      SAMPLE_ACTS[index].clickDelay ?? 560,
    );
    return () => clearTimeout(timer);
  }, [open, index]);

  /*
   * `showModal()` WAITS FOR THE PORTAL TO EXIST. The dialog is only in the tree
   * while `open`, so it cannot be opened in the same tick the flag is set.
   */
  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);

  function start() {
    progressRef.current = 0;
    setProgress(0);
    setIndex(0);
    setCursor(HOME);
    /* AUTOPLAY IS A MOTION PREFERENCE. Someone who has asked their system to
       reduce motion has asked not to be shown things that move on their own,
       and a pointer that flies across the screen is exactly that. They get the
       same walkthrough, paused, with the controls to drive it. */
    setPlaying(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setPortalClass(
      document.querySelector(".mv-portal")?.className ?? "mv-portal",
    );
    setOpen(true);

    /*
     * OPENING IT IS A PLACE THE READER CAN COME BACK FROM.
     *
     * ── THE BUG THIS FIXES ──
     *
     * The popup was React state and nothing else. Back — the normal way to
     * dismiss a full-screen overlay, and the PRIMARY way on Android — did not
     * close it: the browser acted on the page instead, and since the trigger
     * only exists on step 1, that meant leaving the claim page altogether. The
     * gesture people reach for to close the video was the one that threw them
     * off the page.
     *
     * ── THE SAME URL, A MARKED STATE ──
     *
     * The entry is the URL the reader is already on, so the address bar does
     * not change and the wizard's own `popstate` handler reads the same
     * `?step=N` and re-selects the step it is already showing. The marker in
     * `history.state` is what tells this component the entry is its own.
     *
     * Next's router keeps its own keys in `history.state`, so they are spread
     * through rather than replaced — a bare object would drop them.
     */
    if (!pushedRef.current) {
      pushedRef.current = true;
      window.history.pushState(
        { ...window.history.state, mvSampleOpen: true },
        "",
        window.location.href,
      );
    }
  }

  /*
   * THE ONE WAY OUT, WHICHEVER CONTROL WAS USED.
   *
   * Unmounts the dialog — `open` is what renders it, so nothing is left behind
   * — and drops the history entry it pushed. Leaving that entry on the stack
   * would mean the reader's next Back returned to a popup that is not open.
   *
   * `pushedRef` makes it safe to call twice: the second call finds the entry
   * already gone and only settles the state.
   */
  const dismiss = useCallback(() => {
    setOpen(false);
    if (!pushedRef.current) return;
    pushedRef.current = false;
    window.history.back();
  }, []);

  function close() {
    dismiss();
  }

  /*
   * BACK CLOSES IT — and does not then go back a second time, which is what
   * clearing the ref before `dismiss` prevents. The browser has already moved.
   */
  useEffect(() => {
    if (!open) return;
    const onPop = () => {
      pushedRef.current = false;
      setOpen(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open]);

  /*
   * ESCAPE, ON A NATIVE LISTENER — and this fixes a bug that predates the
   * history work.
   *
   * The browser closes a `<dialog>` on Escape itself, without going through any
   * handler of ours, and announces it with a `close` event. React's `onClose`
   * never saw it: `close` does not bubble, this dialog is `createPortal`-ed to
   * `document.body`, and React's delegated listeners sit on the root container
   * — so the event had nowhere to reach.
   *
   * The consequence was quiet and total. `open` stayed `true` with the dialog
   * shut, so the element stayed mounted, and `showModal()` — which runs only
   * when `open` CHANGES — never fired again. Pressing Escape once made "Watch a
   * sample claim" a dead button for the rest of the page's life.
   *
   * A listener on the element itself is the fix: it is where the event is
   * dispatched, so there is no delegation to miss it.
   */
  useEffect(() => {
    const el = dialog.current;
    if (!open || !el) return;

    /* `cancel` IS THE ONE TO ACT ON, and `close` is the safety net.
       Escape fires `cancel` first, and it is cancelable — so this takes the
       dismissal over rather than letting the browser shut the dialog and then
       reacting to it. That ordering is what keeps the history entry and the
       React state in step with the element: one path out, whichever key or
       control started it. */
    const onCancel = (event: Event) => {
      event.preventDefault();
      dismiss();
    };
    el.addEventListener("cancel", onCancel);
    el.addEventListener("close", dismiss);
    return () => {
      el.removeEventListener("cancel", onCancel);
      el.removeEventListener("close", dismiss);
    };
  }, [open, dismiss]);

  function replay() {
    progressRef.current = 0;
    setProgress(0);
    setIndex(0);
    setCursor(HOME);
    setPlaying(true);
  }

  const finished = index === LAST && !playing && progress >= 1;

  /*
   * THE LETTERS APPEAR ONE AT A TIME, sliced out of the act's finished value by
   * how far through the act we are. No second timer: the typing is a function
   * of the same clock the bar is, so they cannot drift apart, and pausing
   * mid-word leaves the half-typed word on screen rather than completing it.
   */
  const typed = (field: "name" | "county") => {
    const full = act.state[field];
    if (act.typing !== field) return full;
    return full.slice(0, Math.round(Math.min(progress, 1) * full.length));
  };

  const query = {
    name: typed("name"),
    county: typed("county"),
    lease: "",
    address: "",
  };

  const screenOf = (i: number) => SAMPLE_ACTS[i].screen;

  /* AFTER every hook, never before one. An early return above them would
     change the hook count between the page's copy and the stage's, which React
     rejects outright. */
  if (insideSample) return null;

  return (
    <>
      {/* MINT, NOT THE GREY OUTLINE (requested).
          In the card's corner the ghost variant was a white button on a white
          card — an outline that had to be looked for. Mint is the portal's own
          accent and it is the right weight for this control: visible, and still
          plainly not the primary. Filling it with `mv-green` would put two
          solid green buttons on one screen and leave the reader to work out
          which one starts the claim.

          It is a NAMED VARIANT rather than a `className` override because a
          background utility passed through `className` and the variant's own
          `bg-*` are both single classes — specificity cannot separate them and
          Tailwind's stylesheet order decides. See the note in `button.tsx`. */}
      <PortalButton variant="mint" type="button" onClick={start}>
        <PlayCircle aria-hidden="true" className="h-[15px] w-[15px]" />
        Watch a sample claim
      </PortalButton>

      {/*
        IT IS PORTALLED TO `document.body`, AND THAT IS NOT OPTIONAL.

        The trigger sits in step 1's footer, and step 1 IS A `<form>`. Rendering
        the dialog where the trigger stands puts `StepFind`'s own `<form>` —
        which this walkthrough mounts on its first screen — inside that one.
        Nested forms are invalid HTML: React throws a hydration error, and the
        browser reparents the inner form out of the dialog, so the sample's
        first screen loses its fields entirely.

        A modal belongs at the top of the document anyway. `<dialog>` renders in
        the top layer regardless of where it sits, so nothing about the visual
        result changes — only the ancestry the parser sees.

        MOUNTED ONLY WHILE OPEN, which keeps the five real steps out of the tree
        until someone asks for them.
      */}
      {open &&
        createPortal(
          <dialog
            ref={dialog}
            /* AN `aria-label`, NOT `aria-labelledby`. The heading it
               pointed at is gone (requested), and a modal with no
               accessible name is announced as just "dialog". The eyebrow
               above stays visible and says the same thing to everyone
               else. */
            aria-label="Sample claim walkthrough"
            /* Kept as a belt-and-braces path only — see the effect above for
               why it does not fire here. `dismiss` is safe to run twice. */
            onClose={dismiss}
            onClick={(event) => {
              /* Click-outside. The backdrop is part of the dialog's own box, so
                 a click landing on the element ITSELF rather than a child is
                 outside the panel. */
              if (event.target === event.currentTarget) close();
            }}
            className="relative m-auto max-h-[min(78vh,760px)] w-[min(1120px,calc(100vw-40px))] flex-col overflow-hidden rounded-[16px] border border-mv-line bg-mv-card p-0 shadow-[0_18px_50px_rgba(13,14,23,.28)] backdrop:bg-black/55 backdrop:backdrop-blur-[2px] open:flex"
          >
            <header className="flex flex-none flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-mv-line bg-linear-to-r from-mv-portal-wash/55 to-mv-card px-5 py-[11px]">
              {/*
                THE HEADER IS A MARK, A NAME AND A DISCLAIMER — in that order.

                It was one line of small uppercase green, which is an eyebrow:
                the thing that sits ABOVE a title and looks unfinished without
                one. There is no title to give it — the popup's subject is the
                page already on screen underneath — so the eyebrow became the
                heading instead, and the two jobs it was doing at once (naming
                the thing, and warning that the data is invented) were fighting
                for one line.

                Split across two, with the play mark to anchor them: the name
                reads as a name, and the disclaimer reads as a disclaimer rather
                than as half of a label.
              */}
              <div className="mr-auto flex min-w-0 items-center gap-[10px]">
                <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-mv-mint text-mv-green-deep">
                  <PlayCircle
                    aria-hidden="true"
                    className="h-[16px] w-[16px]"
                  />
                </span>

                <span className="min-w-0">
                  <span className="block text-[14px] leading-[1.25] font-bold text-mv-ink">
                    Sample claim
                  </span>
                  <span className="mt-[1px] block text-[11px] leading-[1.3] text-mv-muted">
                    Fictional records · nothing is filed
                  </span>
                </span>
              </div>

              {/*
                THE TWO CONTROLS LIVE IN THE HEADER, NOT A FOOTER (requested).

                They sat in a bar of their own across the bottom, which cost the
                popup a whole row of chrome to carry two buttons and a line that
                repeated the eyebrow above ("fictional records" against "SAMPLE
                CLAIM · FICTIONAL DATA"). Beside the close button they are where
                a reader already looks to leave, and the stage gets the height
                back.

                "Try it" still grows into the primary once the walkthrough has
                run its course — before that it is one of two equal ways out,
                after it is the obvious next move.
              */}
              <PortalButton
                variant="ghost"
                size="sm"
                type="button"
                onClick={replay}
              >
                <RotateCcw aria-hidden="true" className="h-[14px] w-[14px]" />
                Replay
              </PortalButton>

              <PortalButton
                variant={finished ? "primary" : "ghost"}
                size="sm"
                type="button"
                onClick={close}
              >
                Try it with your own record
                <ArrowRight aria-hidden="true" className="h-[14px] w-[14px]" />
              </PortalButton>

              <button
                type="button"
                onClick={close}
                aria-label="Close the sample"
                className="-mt-1 -mr-1 inline-flex flex-none cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent p-1 text-mv-muted hover:text-mv-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
              >
                <X aria-hidden="true" className="h-[18px] w-[18px]" />
              </button>
            </header>

            {/*
              THE RAIL IS THE SCRUBBER — five segments, one per screen, each
              filling across the acts that make up that screen. They are buttons
              because a reader who missed something needs to get back to it
              without watching the whole thing again.
            */}
            <div className="flex flex-none flex-wrap items-center gap-x-[10px] gap-y-2 border-b border-mv-line px-5 py-[6px]">
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? "Pause the sample" : "Play the sample"}
                className="flex h-[24px] w-[24px] flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-mv-green-deep text-white hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
              >
                {playing ? (
                  <Pause aria-hidden="true" className="h-[11px] w-[11px]" />
                ) : (
                  <Play
                    aria-hidden="true"
                    className="ml-[1px] h-[11px] w-[11px]"
                  />
                )}
              </button>

              <div className="flex min-w-[260px] flex-1 items-center gap-[6px]">
                {SAMPLE_RAIL.map((label, i) => {
                  const screen = i + 1;
                  const acts = SAMPLE_ACTS.filter((a) => a.screen === screen);
                  const done = SAMPLE_ACTS.slice(0, index).filter(
                    (a) => a.screen === screen,
                  ).length;

                  /* Acts inside a screen are not the same length, so the bar
                     counts them rather than weighting by time — a segment that
                     lurched forward on a short beat and crawled on a long one
                     would read as a stall. */
                  const filled =
                    screenOf(index) > screen
                      ? 1
                      : screenOf(index) < screen
                        ? 0
                        : (done + Math.min(progress, 1)) / acts.length;

                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => seek(SCREEN_STARTS[i])}
                      aria-label={`Screen ${screen} of ${SAMPLE_RAIL.length}: ${label}`}
                      aria-current={
                        screenOf(index) === screen ? "step" : undefined
                      }
                      className="group flex flex-1 cursor-pointer flex-col gap-[5px] border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
                    >
                      <span className="h-[3px] w-full overflow-hidden rounded-full bg-mv-line">
                        <span
                          className="block h-full rounded-full bg-mv-green-deep"
                          style={{ width: `${filled * 100}%` }}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="flex-none text-[11px] font-semibold text-mv-muted tabular-nums">
                Step {act.screen} of {SAMPLE_RAIL.length}
              </p>
            </div>

            {/* THE STAGE. `relative` so the pointer can be placed against it. */}
            <div
              ref={stage}
              /* `flex-[0_1_auto]`, NOT `flex-1`. With `flex-1` the stage takes a
                 basis of 0 and GROWS into whatever the dialog gives it, so a
                 short step left a band of stage background under the card —
                 empty space the reader can scroll into for nothing. Sized to
                 its content it hugs a short step and still scrolls a tall one,
                 because the dialog's own `max-h` bounds it either way. */
              className="relative min-h-0 flex-[0_1_auto] overflow-y-auto overscroll-contain bg-mv-bg px-4 pt-[12px] pb-0"
            >
              <div
                inert
                className={`mv-sample-stage pointer-events-none ${portalClass}`}
              >
                {/* Everything below is the walkthrough, so anything in it that
                    would offer the walkthrough removes itself. */}
                <InsideSample.Provider value={true}>
                  <ClaimShell current={act.state.step} scrollOnChange={false}>
                    {act.state.step === 1 && (
                      <StepFind
                        query={query}
                        onQueryChange={noop}
                        counties={{
                          data: SAMPLE_COUNTIES,
                          loading: false,
                          error: null,
                        }}
                        onRetryCounties={noop}
                        onSearch={noop}
                      />
                    )}

                    {act.state.step === 2 && (
                      <StepPick
                        results={{
                          data: act.state.results,
                          loading: act.state.loading,
                          error: null,
                        }}
                        query={query}
                        onQueryChange={noop}
                        counties={{
                          data: SAMPLE_COUNTIES,
                          loading: false,
                          error: null,
                        }}
                        selected={act.state.selected}
                        onToggle={noop}
                        onContinue={noop}
                        resolving={false}
                        onSearch={noop}
                        tooShort={false}
                        onClearSelection={noop}
                        onReset={noop}
                      />
                    )}

                    {act.state.step === 3 && (
                      <StepProve
                        claimSet={{
                          data: SAMPLE_CLAIM_SET,
                          loading: false,
                          error: null,
                        }}
                        memberId={1}
                        /* THE SCRIPT'S, NOT THE CONSTANT'S. It was pinned to
                         `SAMPLE_CONFIRMED`, so every address arrived already
                         ticked and the pointer then mimed clicking boxes that
                         were green before it got there. */
                        confirmed={act.state.confirmed}
                        onToggleRecord={noop}
                        attested={act.state.attested}
                        onAttest={noop}
                        onConfirm={noop}
                        onBack={noop}
                      />
                    )}

                    {act.state.step === 4 && (
                      <StepLeases
                        records={SAMPLE_CLAIM_SET.records}
                        leases={SAMPLE_CLAIM_SET.all.leases}
                        ownerCount={SAMPLE_CLAIM_SET.records.length}
                        memberId={1}
                        claiming={false}
                        claimError={null}
                        alreadyClaimed={false}
                        onContinue={noop}
                        onBack={noop}
                      />
                    )}

                    {act.state.step === 5 && (
                      <StepSuccess
                        result={SAMPLE_RESULT}
                        records={SAMPLE_CLAIM_SET.records}
                        onStartOver={noop}
                      />
                    )}
                  </ClaimShell>
                </InsideSample.Provider>
              </div>

              <SampleCursor
                x={cursor.x}
                y={cursor.y}
                clicks={clicks}
                visible={act.state.step !== 5}
              />
            </div>

            {/*
              THE END CARD — the one thing the walkthrough asks for.

              ── WHY IT IS HERE AND NOT IN THE HEADER ──

              "Try it with your own record" has sat in the header since the
              first act, where it is one of two quiet ghost buttons and reads as
              a way OUT. At the end it is the point: the reader has just watched
              a claim go through, and this is the moment to make their own.

              ── CENTRED, OVER A SCRIM ──

              It sat at the foot of the stage, which put it level with the last
              receipt row and reading as one more row rather than as the end of
              the thing. Centred over a dimmed screen it is unmistakably a stop:
              the walkthrough is over and this is what to do next.

              The scrim is `pointer-events-none` so the close button and the
              header controls underneath stay clickable through it; only the
              card itself takes its clicks back.

              ── IT IS OUTSIDE THE SCROLLER, AND THAT IS THE FIX ──

              It was a `sticky` child of the stage held back by a negative
              margin. Sticky elements are still laid out in flow, so the card
              contributed `height - 132px` of real content to the scroll — an
              empty band under the receipt that the reader could scroll into,
              and one that grew or shrank with the card's own height as the copy
              wrapped. Positioned against the DIALOG instead, it takes part in
              no layout at all: the scroll length is exactly the step, on this
              screen and every other.

              `pointer-events-none` on the frame so the receipt underneath is
              not swallowed; the card itself takes its clicks back.
            */}
            {finished && (
              <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-mv-ink/35 px-4 backdrop-blur-[2px]">
                <div className="pointer-events-auto w-full max-w-[400px] rounded-mv border border-mv-line bg-mv-card p-6 text-center shadow-mv-lg">
                  <span className="mx-auto flex h-[46px] w-[46px] items-center justify-center rounded-full bg-mv-mint text-mv-green-deep">
                    <CircleCheck
                      aria-hidden="true"
                      className="h-[24px] w-[24px]"
                    />
                  </span>

                  <p className="mt-[13px] text-[16px] leading-[1.3] font-bold text-mv-ink">
                    That is the whole claim, start to finish.
                  </p>
                  <p className="mt-[7px] text-[12.5px] leading-[1.55] text-mv-muted">
                    Now do it with your own record — about two minutes, and
                    nothing is filed until the last step.
                  </p>

                  {/* STACKED, NOT SIDE BY SIDE. Two buttons on one row read as
                      a pair of equal choices; the reader has just watched the
                      whole thing, and starting their own claim is not equal to
                      watching it again. */}
                  <div className="mt-[18px] grid gap-2">
                    <PortalButton
                      variant="primary"
                      size="md"
                      type="button"
                      onClick={close}
                      className="w-full"
                    >
                      Try it and claim your lease
                      <ArrowRight
                        aria-hidden="true"
                        className="h-[15px] w-[15px]"
                      />
                    </PortalButton>

                    <PortalButton
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={replay}
                      className="w-full"
                    >
                      <RotateCcw
                        aria-hidden="true"
                        className="h-[14px] w-[14px]"
                      />
                      Watch again
                    </PortalButton>
                  </div>
                </div>
              </div>
            )}
          </dialog>,
          document.body,
        )}
    </>
  );
}
