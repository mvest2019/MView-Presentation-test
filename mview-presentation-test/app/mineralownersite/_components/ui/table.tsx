import type { ComponentProps, ReactNode } from "react";

/**
 * THE PORTAL'S TABLE — shadcn's `Table` composition, `portal.css`'s look.
 *
 * shadcn's shape (one component per element, a scroll container around the
 * whole thing) with the portal's own measurements: 13px body, 11px uppercase
 * tracked headers in muted grey, 10px/14px cells, a hairline under every row
 * and none under the last.
 *
 * `TableScroll` IS THE POINT OF THE WRAPPER. The lease table is 1120px wide at
 * Professional density and the portal's content column is not, so it has to
 * scroll horizontally inside its own box — never the page. The border and radius
 * live on the wrapper rather than the table so the rounded corners clip the
 * scrolling content.
 *
 * `numeric` ON A CELL DOES THREE THINGS AT ONCE, which is why it is one prop
 * and not three classes: right-aligns it, switches on tabular figures, and — on
 * a header — keeps it from wrapping. Money and volumes only line up into
 * readable columns when all three are true, and the prototype needed a
 * per-route `<style>` block to force it back after they drifted apart.
 *
 * ── WHY `TableScroll` IS `relative`, WHICH IS NOT DECORATION ──
 *
 * `overflow-x: auto` clips PAINTING, but it does not clip an absolutely
 * positioned descendant that has no positioned ancestor — that element's
 * containing block is the initial one, so its overflow lands on the DOCUMENT
 * instead of inside the scroller.
 *
 * Tailwind's `sr-only` is `position: absolute`, and the action column's header
 * carries one ("Open the lease report"). Measured on a 375px viewport: the
 * page's `scrollWidth` went to 1359px against a 375px viewport — the whole page
 * scrolled sideways, and the fixed mobile tab bar stretched with it. Setting
 * `overflow: hidden` on the wrapper did NOT fix it; `position: relative` does,
 * because it makes the wrapper the containing block those descendants resolve
 * against. Keep it here, and any visually hidden label inside any portal table
 * is safe by construction.
 */

export function TableScroll({
  bare = false,
  className = "",
  children,
  ...props
}: {
  /**
   * DROP THE BORDER AND THE RADIUS — for a table that is already inside a card.
   *
   * A prop rather than a `className` override, and the reason is the one
   * `button.tsx` records at length: `rounded-none` passed in and the base
   * `rounded-mv` are both single-class utilities, so specificity cannot
   * separate them and Tailwind's own stylesheet order decides which wins. Two
   * borders drawn a pixel apart is the visible failure; a prop makes it
   * deterministic.
   */
  bare?: boolean;
  className?: string;
  children: ReactNode;
} & ComponentProps<"div">) {
  return (
    <div
      /*
       * THE SCROLLBAR IS STYLED HERE, AND IT IS NOT DECORATION.
       *
       * Left alone, this box gets the platform's own bar: on Windows that is a
       * full-weight dark grey track sitting inside a white card, and because it
       * is the widest element on the page it reads as a black rule drawn
       * through the bottom of the table — over the totals row rather than under
       * it.
       *
       * `scrollbar-width: thin` and `scrollbar-color` are the standard
       * properties and cover Firefox and current Chromium. The
       * `::-webkit-scrollbar` rules behind them cover the WebKit engines that
       * still ignore those, and both halves say the same thing: a thin track in
       * the portal's page grey, and a rounded thumb in its hairline grey that
       * darkens to the muted ink on hover.
       *
       * THE TRACK IS TINTED RATHER THAN TRANSPARENT. Left clear it vanished
       * against the white card, which made the thumb look like a stray line
       * instead of a control sitting in a groove — a scrollbar has to read as
       * something you can grab.
       *
       * Written as arbitrary variants rather than a `portal.css` rule so the
       * scrolling box and its scrollbar stay one component — see `portal-ui.md`
       * on why this folder is Tailwind.
       */
      className={`relative overflow-x-auto bg-mv-card ${bare ? "" : "rounded-mv border border-mv-line"} [scrollbar-color:var(--color-mv-line-strong)_var(--color-mv-bg)] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb:hover]:bg-mv-muted [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-mv-line-strong [&::-webkit-scrollbar-track]:bg-mv-bg [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * `minWidth` is required, not optional. A portal table that has not decided how
 * wide it needs to be will collapse its columns to unreadable slivers on a
 * phone instead of scrolling, and every table in this design has a width the
 * design chose.
 */
export function Table({
  minWidth,
  freezeFirstColumn = false,
  roomy = false,
  children,
}: {
  minWidth: number;
  /**
   * A TALLER BODY ROW, for a short table of one-line cells.
   *
   * The portal's row is built for the lease table, whose cells carry two and
   * three lines each and are tall whatever the padding says. A table of single
   * words — the filings list is two rows of six — inherits that padding and
   * reads as cramped, because 11px above and below one line of type is a
   * quarter of what it is above and below three.
   *
   * IT NEEDS THE `!`, AND THAT IS NOT BELT AND BRACES. `portal.css` sets
   * `.mv-portal td { padding: 11px 14px }` and that file is unlayered, so it
   * beats every Tailwind utility whatever the specificity — the `py-[10px]` in
   * `CELL_BASE` has never actually applied. Only the important modifier gets
   * past it. See the header-band note below, which is the same story.
   *
   * `tbody` ONLY: the heading band's height is set at every density tier and is
   * not this table's to change.
   */
  roomy?: boolean;
  /**
   * PIN THE FIRST COLUMN while the rest scrolls sideways.
   *
   * For the sixteen-column lease table, where the design freezes it and has to:
   * at 1120px minimum width the lease NAME is the first thing to leave the
   * viewport, so a reader scrolled out to the production columns is looking at
   * numbers with nothing to attach them to. Pinning the identity column is what
   * makes a wide table readable rather than merely reachable.
   *
   * The cells need an opaque background of their own — they are painting over
   * the scrolling content beneath them, and a transparent sticky cell shows the
   * columns sliding under it. The totals row gets its own tint to match, and the
   * header cell sits a layer higher again so it stays above the pinned body
   * cells at the corner.
   */
  freezeFirstColumn?: boolean;
  children: ReactNode;
}) {
  const frozen = freezeFirstColumn
    ? [
        "[&_th:first-child]:sticky [&_th:first-child]:left-0 [&_th:first-child]:z-[3]",
        "[&_td:first-child]:sticky [&_td:first-child]:left-0 [&_td:first-child]:z-[2]",
        "[&_td:first-child]:bg-mv-card [&_thead_th:first-child]:bg-mv-portal-wash",
        "[&_tr[data-tone=total]_td:first-child]:bg-mv-row-hover",
        "[&_th:first-child]:shadow-[2px_0_0_rgba(15,23,42,.06)]",
        "[&_td:first-child]:shadow-[2px_0_0_rgba(15,23,42,.06)]",
      ].join(" ")
    : "";

  return (
    <table
      /*
       * THE HEADER BAND, AND WHY IT NEEDS `!`.
       *
       * `portal.css` sets `.mv-portal th { background: #fafbfc }` and that file
       * is UNLAYERED on purpose — see its own header. Unlayered rules beat
       * everything inside a cascade layer whatever the specificity, and every
       * Tailwind utility lives in `@layer utilities`. So a `bg-…` class on the
       * header row, or on the cells, or on a `[&_thead_th]` variant, all lost
       * to it silently: the markup said the header was tinted and the header
       * rendered at #fafbfc, which is near enough to white that the headings
       * read as a first row rather than as a heading band.
       *
       * The important modifier is the way out, and it is applied once here
       * rather than per table so every portal table's headings sit on the same
       * band.
       *
       * THE HEADING COLOUR IS THE SAME STORY. `.mv-portal th` also sets
       * `color: var(--muted)`, so `text-mv-ink` on `TableHeaderCell` lost to it
       * exactly as the background did — the lease table's headings only looked
       * right because their colour sits on a `<button>` inside the cell, which
       * that rule cannot reach. Every other portal table stayed grey.
       */
      className={`w-full border-collapse text-[13px] [&_thead_th]:bg-mv-portal-wash! [&_thead_th]:text-mv-ink! ${
        roomy ? "[&_tbody_td]:py-[15px]!" : ""
      } ${frozen}`.trim()}
      style={{ minWidth }}
    >
      {children}
    </table>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead>{children}</thead>;
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

/**
 * `interactive` gives the row the design's pointer + mint hover. Use it only
 * where the whole row genuinely opens something: a hover that promises a click
 * and delivers nothing is worse than no hover.
 *
 * `tone="total"` is the footer row's grey wash, `tone="highlight"` the mint one
 * the derivation table ends on.
 */
export function TableRow({
  interactive = false,
  tone,
  className = "",
  children,
  ...props
}: {
  interactive?: boolean;
  tone?: "total" | "highlight";
  className?: string;
  children: ReactNode;
} & ComponentProps<"tr">) {
  const tones = {
    total: "bg-mv-row-hover font-semibold",
    highlight: "bg-mv-portal-row-tint font-semibold",
  };
  return (
    <tr
      /* Emitted so a frozen first column can re-paint the tinted rows — a sticky
         cell paints over the scrolling content beneath it, so it needs its own
         opaque background, and a toned row needs that background to match. See
         `freezeFirstColumn` on `Table`. */
      data-tone={tone}
      className={`${interactive ? "cursor-pointer transition-colors hover:bg-mv-portal-row-tint" : ""} ${
        tone ? tones[tone] : ""
      } ${className}`.trim()}
      {...props}
    >
      {children}
    </tr>
  );
}

const CELL_BASE = "border-b border-mv-line px-[14px] py-[10px] align-top";
const LAST_ROW = "[tr:last-child_&]:border-b-0";

export function TableHeaderCell({
  numeric = false,
  className = "",
  children,
  ...props
}: {
  numeric?: boolean;
  className?: string;
  children?: ReactNode;
} & ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={`${CELL_BASE} text-[11px] font-bold tracking-[0.06em] whitespace-nowrap text-mv-ink uppercase ${
        numeric ? "text-right" : "text-left"
      } ${className}`.trim()}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({
  numeric = false,
  className = "",
  children,
  ...props
}: {
  numeric?: boolean;
  className?: string;
  children?: ReactNode;
} & ComponentProps<"td">) {
  return (
    <td
      className={`${CELL_BASE} ${LAST_ROW} ${
        numeric ? "text-right tabular-nums" : "text-left"
      } ${className}`.trim()}
      {...props}
    >
      {children}
    </td>
  );
}
