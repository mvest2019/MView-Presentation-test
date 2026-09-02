import type { ReactNode } from "react";

/**
 * THE PORTAL'S CHIP — `portal.css`'s `.chip` family as Tailwind.
 *
 * FIVE TONES, AND EACH ONE MEANS SOMETHING. This is the reason the tone is a
 * union and not a `className`: the portal uses chip colour as a signal, and the
 * signal only works if it is used the same way everywhere.
 *
 *   mint        good / live / ready — a producing lease, a ready statement
 *   slate       neutral state — inactive, archived, "illustrative"
 *   estimate    ⚠ THE HONESTY LABEL. Amber, and it appears beside every
 *               forward-looking figure on the page: "Estimate — not an
 *               appraisal". Never used decoratively.
 *   blue        a note about the data itself — "$0-fallback shown"
 *   flag        "Worth a look" — the county-gap flag. Amber like `estimate`
 *               but square-cornered and tighter, because it is a marker inside
 *               a table cell rather than a label beside a heading.
 *
 * `size="xs"` exists because the design shrinks a chip when it sits inside a
 * table cell or beside a 13px heading; the prototype did it with a dozen inline
 * `style="font-size:9.5px"` attributes on individual chips.
 */

export type BadgeTone = "mint" | "slate" | "estimate" | "blue" | "flag";

const TONES: Record<BadgeTone, string> = {
  mint: "rounded-full bg-mv-mint text-mv-green-ink",
  slate: "rounded-full bg-mv-portal-wash text-mv-slate",
  estimate: "rounded-full bg-mv-amber-bg text-mv-amber",
  blue: "rounded-full bg-mv-blue-bg text-mv-blue",
  flag: "rounded-md bg-mv-amber-bg text-mv-amber whitespace-nowrap",
};

const SIZES = {
  xs: "px-[7px] py-[2px] text-[9.5px]",
  sm: "px-[10px] py-[3px] text-[11.5px]",
} as const;

export function Badge({
  tone = "slate",
  size = "sm",
  className = "",
  children,
}: {
  tone?: BadgeTone;
  size?: keyof typeof SIZES;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-[5px] font-semibold leading-[1.3] ${TONES[tone]} ${SIZES[size]} ${className}`.trim()}
    >
      {children}
    </span>
  );
}

/**
 * The one chip with fixed wording, because it is the page's standing disclaimer
 * and it must read identically in all eleven places it appears. Nine of those
 * places wrote it out by hand in the prototype, and two of them said
 * "Estimates — not appraisals" instead.
 */
export function EstimateBadge({
  size = "xs",
  plural = false,
}: {
  size?: keyof typeof SIZES;
  plural?: boolean;
}) {
  return (
    <Badge tone="estimate" size={size}>
      {plural ? "Estimates — not appraisals" : "Estimate — not an appraisal"}
    </Badge>
  );
}
