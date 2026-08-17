"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ComponentProps } from "react";

/**
 * shadcn/ui's Tooltip, on `@radix-ui/react-tooltip`.
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
 * `TooltipProvider` lives INSIDE `Tooltip`, matching shadcn's current source, so
 * a tooltip is self-contained and no provider has to be threaded through the app
 * root.
 */

function Tooltip({
  delayDuration = 150,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Root> & { delayDuration?: number }) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root {...props} />
    </TooltipPrimitive.Provider>
  );
}

function TooltipTrigger(
  props: ComponentProps<typeof TooltipPrimitive.Trigger>,
) {
  return <TooltipPrimitive.Trigger {...props} />;
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
