"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ComponentProps } from "react";

/**
 * shadcn/ui's Tabs, on `@radix-ui/react-tabs`, wearing the portal's pill tabs.
 *
 * ADDED BY HAND, NOT BY `shadcn init` — the same call `app/_components/ui/tooltip.tsx`
 * documents at length: the CLI rewrites `app/globals.css` with its own colour
 * system and a global border reset, which would restyle the whole site to install
 * a tab strip. This is shadcn's component with `mv-*` tokens and without `cn()`.
 *
 * WHY RADIX AND NOT THREE BUTTONS AND A `useState`. What the prototype shipped
 * was three buttons toggling `style.display` on three divs — no `role`, no
 * `aria-selected`, no `aria-controls`, and no keyboard model, so a keyboard user
 * tabbed through every control in a hidden panel and a screen reader was told
 * nothing about the relationship. Radix supplies the roles, the arrow-key
 * roving focus, the `Home`/`End` handling and the tab/panel wiring. That is
 * roughly 80 lines of well-tested behaviour for a 5KB dependency, and getting
 * it subtly wrong by hand is the normal outcome.
 *
 * THE SELECTED PILL IS BRAND GREEN, not the portal's near-black. The design
 * gives the module tab strip the green fill and keeps `mv-ink` for the one
 * finished action on a screen — see the `dark` variant in `button.tsx`. Changed
 * here rather than passed in per call site so every tab strip in the portal
 * agrees; this component has one consumer today, My Leases.
 *
 * `activationMode="manual"` is deliberate: with automatic activation an arrow
 * key both moves focus and switches the panel, so a keyboard user scanning the
 * strip re-renders a large table on every keystroke. Manual means arrows move,
 * Enter or Space commits.
 *
 * THE PANELS ALL RENDER. Radix unmounts an inactive panel by default;
 * `forceMount` keeps it in the DOM (hidden) so the browser's in-page search can
 * find a figure in the Financials tab while the reader is on the list, and so
 * switching tabs costs no re-render of a 10-row × 16-column table.
 */

function Tabs(props: ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root activationMode="manual" {...props} />;
}

function TabsList({
  className = "",
  ...props
}: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      /* WRAP IS THE SAFETY NET, NOT THE LAYOUT. The three pills are sized
         below to fit one row on a 375px phone; `flex-wrap` stays so a narrower
         device or a longer label folds rather than pushing the card sideways. */
      className={`flex flex-wrap gap-1.5 ${className}`.trim()}
      {...props}
    />
  );
}

function TabsTrigger({
  className = "",
  ...props
}: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      /* `data-[state=active]` is Radix's own attribute — the selected pill is
         driven by the component's state rather than by a class the caller has to
         remember to toggle, which is what the prototype got wrong. */
      /* SMALLER ON A PHONE, SO THE THREE STAY ON ONE ROW.
         At 13px with 15px of padding either side the row measures about 343px
         against the ~347px a 375px phone gives the card — inside the margin of
         error, so "Monthly Reports" dropped to a second line. 12px with 10px
         padding brings it to about 294px, which is a real margin rather than a
         coin toss. Full size returns at `sm`, where there was never a problem.

         `whitespace-nowrap` so a pill never breaks its own label in half, and
         `shrink-0` so three pills never compress into ellipses instead of
         wrapping.

         ── AND THEY FILL THE ROW ON A PHONE ──

         `grow`, NOT `flex-1`. `flex-1` sets `basis: 0`, which divides the row
         into equal thirds — about 112px each on a 375px screen, against the
         114px "Monthly Reports" needs at this size. Two pixels short, and with
         `whitespace-nowrap` the label would spill out of its own pill rather
         than wrap. `grow` keeps each pill's natural width and shares only the
         SLACK, so the row fills edge to edge and no label is squeezed: about
         97, 103 and 136 across.

         `sm:grow-0` returns them to natural width on a real screen, where three
         pills stretched across 1360px would read as a segmented control rather
         than as tabs.

         ── THE 44px FLOOR IS WHAT ACTUALLY SETS THIS HEIGHT ──

         `dashboard-reference.css` carries, below 640px:

           .mv-ref-app .app-main button { min-height: 44px; min-width: 44px }

         a touch-target rule that applies to EVERY button in this module. It is
         why trimming padding here changed nothing: the padding was never what
         the height was coming from.

         `min-h-8` is a Tailwind utility, and `utilities` is a later cascade
         layer than `mv-reference`, so it wins without `!important`. 32px is
         still comfortably above the 24px WCAG 2.2 AA target size (2.5.8); 44px
         is the AAA/Apple figure, which is generous for a compact control that
         sits in a row of four. */
      className={`min-h-8 grow shrink-0 cursor-pointer rounded-full border border-mv-line bg-mv-card px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap text-mv-slate transition-colors hover:bg-mv-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep data-[state=active]:border-mv-green-deep data-[state=active]:bg-mv-green-deep data-[state=active]:text-white sm:min-h-0 sm:grow-0 sm:px-[15px] sm:py-[7px] sm:text-[13px] ${className}`.trim()}
      {...props}
    />
  );
}

function TabsContent({
  className = "",
  ...props
}: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      forceMount
      /* `forceMount` renders the panel in every state, so the hidden one must be
         hidden by CSS as well — without this every panel would be visible at
         once. `data-[state=inactive]:hidden` is the pair to `forceMount`. */
      className={`data-[state=inactive]:hidden ${className}`.trim()}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
