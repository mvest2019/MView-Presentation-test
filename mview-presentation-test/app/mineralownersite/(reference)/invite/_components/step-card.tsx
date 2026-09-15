import type { ReactNode } from "react";

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
 *
 * ── WHAT THE RE-SKIN CHANGED ──
 *
 * The card was `<Card>` from the `(portal)` UI kit with a flex row and a
 * Tailwind disc, which is a different card from the one every other page in
 * this route group draws. It is `.chartbox .iv-step` now — the reference's own
 * pair, and `.chartbox` is the same surface the Dashboard's panels sit on — so
 * the border radius, the shadow and the padding come from the group's sheet
 * instead of being restated here in utilities.
 *
 * THE NUMBER'S GUTTER IS A GRID COLUMN, NOT A FLEX CHILD, and that is what
 * fixed the alignment note this file used to carry. `.iv-step` is
 * `grid-template-columns: 46px minmax(0,1fr)` above a container width of 520px
 * and a single stacked column below it, so the disc drops above the heading on
 * a narrow card rather than shrinking the column beside it. The old warning
 * about `.mv-ref-app .flex { align-items:center }` colliding with Tailwind's
 * `flex` no longer applies, because there is no `flex` here to collide.
 */
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
    <div className="chartbox iv-step" id={id} style={{ scrollMarginTop: 96 }}>
      <div className="iv-stepno" aria-hidden="true">
        {n}
      </div>
      <div className="iv-stepbody">
        <div
          className="between"
          style={{ flexWrap: "wrap", padding: "0 0 10px" }}
        >
          <h2 className="iv-h">{title}</h2>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}
