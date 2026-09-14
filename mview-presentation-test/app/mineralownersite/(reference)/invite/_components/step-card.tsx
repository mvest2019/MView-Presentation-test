import type { ReactNode } from "react";

import { Card, CardHeader } from "../../../_components/ui/card";

/**
 * ONE NUMBERED STEP — the surface all three of this page's cards are built on.
 *
 * THE NUMBER IS IN THE CARD AND NOT IN THE HEADING TEXT. Three reasons, and the
 * third is the one that matters:
 *
 *  · the rail on the right numbers the same three steps, and two hand-typed
 *    sequences drift the moment a step is inserted;
 *  · a heading that begins "1." reads as a numbered list item to a screen
 *    reader that is already announcing the heading level;
 *  · the number is DECORATION over a page that is not a wizard. Nothing here is
 *    gated on the step above being finished — a reader may open step 3 to see
 *    what the letter says before ticking anybody, and the page lets them. The
 *    numbers describe the usual order, they do not enforce one, and marking
 *    them `aria-hidden` is what keeps them from being read as instructions.
 *
 * THE HEADING IS AN `h2`. The page's own title is the `h1` in `InviteHeader`,
 * so its three sections are one level below it. Their size is the design's
 * 15px; the level is the outline a screen reader navigates by, and the two are
 * unrelated decisions that get conflated whenever a heading is picked by how
 * big it looks.
 */
/* `items-*` IS LOAD-BEARING IN THIS ROUTE GROUP, not decoration.
   `dashboard-reference.css` defines `.mv-ref-app .flex { align-items:center }`,
   which collides with Tailwind's own `flex`. `globals.css` orders the
   `mv-reference` layer before `utilities`, so a utility WINS — but only
   where there is one, and there is none for a property you never set. So
   an unstated alignment silently becomes `center`: it centred the step
   discs against whole cards and shrink-wrapped the card columns. */
export function StepCard({
  n,
  title,
  action,
  id,
  children,
}: {
  n: number;
  title: string;
  /** A chip or a control on the right of the heading row. */
  action?: ReactNode;
  id?: string;
  children: ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-28">
      <div className="flex items-start gap-[14px]">
        <span
          aria-hidden="true"
          className="mt-[2px] flex h-7 w-7 flex-none items-center justify-center rounded-full bg-mv-mint text-[13px] font-bold text-mv-green-ink"
        >
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <CardHeader
            className="pb-[10px]"
            title={
              <h2 className="m-0 text-[15px] leading-[1.35] font-bold">{title}</h2>
            }
            action={action}
          />
          {children}
        </div>
      </div>
    </Card>
  );
}
