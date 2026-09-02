import type { ComponentProps, ReactNode } from "react";

/**
 * THE PORTAL'S SURFACES — `portal.css`'s `.card` / `.card-pad` / `.chartbox`.
 *
 * `Card` IS THE ONE SURFACE, and everything that needs a white box uses it
 * rather than restating a border, a radius and a shadow. `padded` is a prop and
 * not a second component because the two always appear together except for the
 * handful of cards that hold a full-bleed table, and a `<CardPad>` wrapper for
 * that would be an element that exists to add a class.
 *
 * `accent` is the design's own left-rule variant — a 4px green edge that marks
 * the plain-English hero and the "worth reading" notices. It also drops the
 * card's own left border, or the two stack into a 5px double rule.
 *
 * `pendingData` is `portal.css`'s `.dbhook` — the design's own name for it is
 * "pending-DB hook cards". A dashed blue edge and a cool wash mark a card whose
 * figures are NOT yet read from the database: the spacing percentile, the
 * operator league position, the reservoir extent. It is a promise about the
 * card's contents, so it belongs on the surface rather than in a footnote —
 * a reader can see at a glance which cards are waiting on a feed.
 *
 * `CardHeader` is shadcn's shape (a header row that holds a title and an
 * optional action) narrowed to what the portal actually does with it: a heading
 * on the left, a chip or a button on the right, wrapping on a phone. Fourteen
 * copies of `<div class="between" style="flex-wrap:wrap">` in the prototype.
 */

export function Card({
  padded = true,
  accent = false,
  pendingData = false,
  className = "",
  children,
  ...props
}: {
  padded?: boolean;
  accent?: boolean;
  /** `.dbhook` — this card's figures are not wired to the database yet. */
  pendingData?: boolean;
  className?: string;
  children: ReactNode;
} & ComponentProps<"div">) {
  return (
    <div
      className={`rounded-mv border border-mv-line bg-mv-card shadow-mv ${
        padded ? "p-[22px]" : ""
      } ${
        accent
          ? "border-l-4 border-l-mv-green bg-[linear-gradient(160deg,var(--color-mv-card),var(--color-mv-portal-hero-tint))]"
          : ""
      } ${
        pendingData
          ? "border-[1.5px] border-dashed border-mv-pending bg-[linear-gradient(180deg,var(--color-mv-pending-top),var(--color-mv-pending-bottom))]"
          : ""
      } ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * A heading with something on the far right. `title` takes a node rather than a
 * string so a heading can carry an inline chip, which most of them do.
 */
export function CardHeader({
  title,
  action,
  className = "",
}: {
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 ${className}`.trim()}
    >
      {title}
      {action}
    </div>
  );
}

/**
 * `portal.css`'s `.setrow` — a label and a value on one line, hairline beneath,
 * no hairline on the last one. The year summary is six of these.
 *
 * `last:border-b-0` is why this is a component: as a bare div the caller has to
 * know which row is last, and the prototype's markup did (`:last-child` in CSS,
 * hand-maintained order in the HTML).
 */
export function StatRow({
  label,
  value,
}: {
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-mv-portal-hairline py-[14px] text-[13px] last:border-b-0">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
