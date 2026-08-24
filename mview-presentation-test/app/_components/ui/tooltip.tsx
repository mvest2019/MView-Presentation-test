"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";

/**
 * shadcn/ui's Tooltip, on `@radix-ui/react-tooltip`, WITH TAP SUPPORT ADDED.
 *
 * ADDED BY HAND RATHER THAN BY `shadcn init` (2026-08-17). The CLI does more than
 * drop a component in: it writes its own colour system into `app/globals.css`
 * — `--background`, `--foreground`, `--border` and the rest — plus a global
 * `* { @apply border-border }` reset. This project already defines its palette in
 * a hand-written `@theme` block and relies on Tailwind's own preflight, so
 * letting the CLI rewrite that file would restyle the whole site to fix a
 * tooltip. The component below is shadcn's, with its tokens swapped for this
 * project's (`mv-ink`, `mv-line`) and its `cn()` helper dropped, since that would
 * pull in `clsx` and `tailwind-merge` for string concatenation this file does not
 * need. Radix — the part that actually does the work — is the real dependency and
 * is installed normally.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS CONTROLLED, AND WHY THE CLICK HANDLER CALLS `preventDefault`
 * (Ryan, 2026-08-19: "i icon is not clickable for mobile and ipad").
 *
 * RADIX TOOLTIP CANNOT OPEN ON TOUCH. That is not a bug in it — a tooltip is a
 * hover affordance and Radix implements it as one. From its source (1.2.16):
 *
 *   onPointerMove: … if (event.pointerType === "touch") return;   // never opens
 *   onPointerDown: … if (context.open) context.onClose();          // only closes
 *   onFocus:       … if (!isPointerDownRef.current) context.onOpen();
 *   onClick:       composeEventHandlers(props.onClick, context.onClose)
 *
 * So on a phone: hover never happens, the tap's focus is suppressed because
 * `isPointerDownRef` is set, and pointerdown and click only ever CLOSE. Three
 * separate reasons a tap shows nothing, which is why the icon was inert on every
 * touch device while working fine with a mouse.
 *
 * The lever is `composeEventHandlers` in `@radix-ui/primitive`:
 *
 *   originalEventHandler?.(event);
 *   if (checkForDefaultPrevented === false || !event || !event.defaultPrevented)
 *     return ourEventHandler?.(event);
 *
 * Radix runs OUR handler first and skips its own when the event has been
 * default-prevented. So `preventDefault()` on a touch-originated click stops
 * `context.onClose` from undoing the open, and the tooltip can be driven from
 * state instead. `preventDefault` on a `type="button"` click suppresses nothing
 * else — there is no default action to lose.
 *
 * MOUSE BEHAVIOUR IS UNTOUCHED. The pointer type is recorded on pointerdown and
 * anything reporting "mouse" is left entirely to Radix, so hover, focus and the
 * open delay behave exactly as before on a desktop. Only touch and pen take the
 * new path.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Lets `TooltipTrigger` drive the open state its `Tooltip` owns.
 *
 * `open` is in here as well as the setter, and it is needed: the trigger has to
 * know whether the tooltip was open WHEN THE TAP STARTED, not when the click
 * lands. See the second-tap note in `TooltipTrigger`.
 */
const ToggleContext = createContext<{
  open: boolean;
  setOpen: (next: boolean) => void;
} | null>(null);

function Tooltip({
  delayDuration = 150,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Root> & { delayDuration?: number }) {
  const [open, setOpen] = useState(false);

  /*
   * A tap opens it; something has to close it again. Escape is Radix's, and
   * tapping the icon a second time toggles — but a tap ANYWHERE ELSE would
   * otherwise leave the bubble hanging, because Radix's own dismissal is built
   * around a pointer leaving the trigger and on a touchscreen nothing ever does.
   *
   * `capture` so the listener runs before React's own delegated handlers, and
   * `pointerdown` rather than `click` so a tap that starts a scroll also
   * dismisses. Bound only while open, so there is no idle document listener.
   */
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      const target = event.target as Element | null;
      // The trigger's own handler owns the toggle; leave it to it.
      if (target?.closest("[data-mv-tooltip-trigger]")) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss, { capture: true });
    return () =>
      document.removeEventListener("pointerdown", dismiss, { capture: true });
  }, [open]);

  return (
    <ToggleContext.Provider value={{ open, setOpen }}>
      <TooltipPrimitive.Provider delayDuration={delayDuration}>
        {/* `onOpenChange` is what keeps the MOUSE path working: Radix still
            decides when hover and focus open or close it, and simply reports the
            change here instead of holding the state itself. */}
        <TooltipPrimitive.Root open={open} onOpenChange={setOpen} {...props} />
      </TooltipPrimitive.Provider>
    </ToggleContext.Provider>
  );
}

function TooltipTrigger({
  onPointerDown,
  onClick,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Trigger>) {
  const toggle = useContext(ToggleContext);
  /* Written from event handlers only, never during render — `react-hooks/refs`
     rejects a render-phase ref write. */
  const fromTouch = useRef(false);
  const wasOpenOnPress = useRef(false);

  return (
    <TooltipPrimitive.Trigger
      {...props}
      /* Marks this element for the outside-tap dismissal above, which must not
         fire for a tap on the trigger itself. */
      data-mv-tooltip-trigger=""
      onPointerDown={(event) => {
        fromTouch.current = event.pointerType !== "mouse";
        /*
         * THE STATE IS SAMPLED HERE, BEFORE RADIX SEES THE EVENT, and that is
         * what makes a second tap close the bubble.
         *
         * Radix's own pointerdown runs after this one and does
         * `if (context.open) context.onClose()`. So by the time the click fires,
         * an open tooltip has ALREADY been closed — and a handler that blindly
         * toggled would flip it straight back open. Measured exactly that: the
         * first tap opened, the second appeared to do nothing.
         *
         * Reading the value at press time and setting the opposite of it at click
         * time gives one net change per tap, whatever Radix did in between. No
         * `preventDefault` on pointerdown, deliberately: that suppresses the
         * compatibility mouse events on some browsers, which would take the click
         * this relies on with it.
         */
        wasOpenOnPress.current = toggle?.open ?? false;
        onPointerDown?.(event);
      }}
      onClick={(event) => {
        if (fromTouch.current) {
          // Stops Radix's composed `context.onClose` — see the note above.
          event.preventDefault();
          toggle?.setOpen(!wasOpenOnPress.current);
        }
        onClick?.(event);
      }}
    />
  );
}

function TooltipContent({
  className = "",
  sideOffset = 6,
  children,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        /* `max-w` and `text-wrap` matter here: these notes are full sentences,
           and Radix does not cap the width, so without it the tooltip stretches
           to one long line and runs off a phone screen. */
        className={`z-50 max-w-[260px] text-balance rounded-[8px] border border-mv-line bg-mv-ink px-[10px] py-[7px] text-[12px] leading-[1.45] text-white shadow-[0_6px_18px_rgba(6,20,15,.18)] ${className}`}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="fill-mv-ink" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipTrigger };
