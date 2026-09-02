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
      className={`cursor-pointer rounded-full border border-mv-line bg-mv-card px-[15px] py-[7px] text-[13px] font-semibold text-mv-slate transition-colors hover:bg-mv-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep data-[state=active]:border-mv-ink data-[state=active]:bg-mv-ink data-[state=active]:text-white ${className}`.trim()}
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
