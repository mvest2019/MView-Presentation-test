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
  className = "",
  children,
  ...props
}: { className?: string; children: ReactNode } & ComponentProps<"div">) {
  return (
    <div
      className={`relative overflow-x-auto rounded-mv border border-mv-line bg-mv-card ${className}`.trim()}
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
  children,
}: {
  minWidth: number;
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
      className={`w-full border-collapse text-[13px] ${frozen}`.trim()}
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
      className={`${CELL_BASE} text-[11px] font-bold tracking-[0.06em] whitespace-nowrap text-mv-muted uppercase ${
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
