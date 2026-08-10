/**
 * The rounded filter pill from the prototype's `.fp` rule, with its optional
 * count badge (`.fp .cnt`).
 *
 * `#e6f6ee` is written out rather than reaching for `bg-mv-mint`: the token is
 * `#e6fff5`, a visibly cooler mint, and the prototype's selected pill is the
 * warmer green tint. Same reason `#eef1f4` appears for the badge — the design's
 * `--line2` has no token. Neither is added to `@theme`; per `globals.css` a
 * colour may only be defined there if it exists in the design system, and these
 * two are page-level values.
 */

export function FilterPill({
  children,
  active,
  count,
  srLabel,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  active: boolean;
  /** Rendered as the trailing badge. Omit for pills that carry no count. */
  count?: number;
  /**
   * Plain-text label for the accessible name. Worth passing whenever `count` is
   * set: the badge sits in its own element, so the name computed from contents
   * runs the two together ("Top 10 producers10") and the bare number reads as
   * part of the label rather than as a match count.
   */
  srLabel?: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={
        srLabel && count !== undefined
          ? `${srLabel}, ${count} matches`
          : undefined
      }
      onClick={onClick}
      className={`group inline-flex cursor-pointer items-center rounded-full border px-4 py-[9px] font-sans text-[13.5px] shadow-[0_1px_1px_rgba(13,14,23,.03)] transition-[background,border-color,color,box-shadow,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep ${
        active
          ? "border-mv-green bg-[#e6f6ee] font-bold text-mv-green-deep shadow-[0_5px_14px_rgba(47,138,102,.16)]"
          : "border-mv-line bg-white font-medium text-mv-ink hover:-translate-y-px hover:border-mv-green hover:text-mv-green-deep hover:shadow-[0_5px_12px_rgba(47,138,102,.12)]"
      } ${className}`}
    >
      {children}
      {count !== undefined && (
        <span
          className={`ml-[6px] rounded-full px-2 py-px text-[11.5px] font-bold tracking-[.01em] ${
            active
              ? "bg-white text-mv-green-deep"
              : "bg-[#eef1f4] text-mv-muted group-hover:bg-white group-hover:text-mv-green-deep"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
