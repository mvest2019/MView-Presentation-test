import { Lock } from "lucide-react";
import Link from "next/link";

/**
 * One withheld figure — the site's single lock treatment.
 *
 * WHY IT IS ONE COMPONENT NOW. This markup existed in four places, and the copies had
 * already drifted. The operator listing and the operator profile drew a redacted bar
 * with a "Free account" link beside it; both comparison tools drew the bar and a
 * padlock with the offer only in `sr-only` text — so a sighted reader on those two
 * pages was shown that something was withheld and never told what it cost, for the
 * same fields, gated by the same rule. Making four files match by editing four files
 * would have left four files to drift again.
 *
 * THE TREATMENT: a redacted bar, then a lock and the words "Free account" as a link.
 * The bar says a value EXISTS and is being withheld — a different statement from
 * "nothing on file", which these pages render as an em dash and which must not be
 * confused with it. The link says what it costs. A bar alone makes the first half of
 * the point and drops the second.
 *
 * ON ONE LINE, not stacked. The listing puts up to thirty of these on screen at once
 * and the statistics matrix sixteen; stacking the bar over the link would double
 * every row. The claim page stacks its own and keeps its own component for that.
 *
 * EVERY LINK CARRIES ITS OWN `aria-label` NAMING THE FIELD. Thirty links reading
 * "Free account" would be thirty identical stops in a screen reader's link list;
 * "Create a free account to see the oil produced" says which cell it is in.
 *
 * THE TARGET IS ALWAYS `/register`, NEVER `/pricing` — routing free-account intent
 * into a plan comparison is the defect the whole treatment exists to avoid
 * (OPERATORS.md §9). `from` is an enumerated in-product source value, not free text,
 * which is why it is a union rather than a string.
 */

/** The enumerated `?from=` values — §9. A new surface means a new member here. */
export type LockedFrom =
  | "operators"
  | "operator-profile"
  | "compare-production"
  | "compare-statistics";

export function LockedValue({
  label,
  from,
  width = "w-[46px]",
  align = "end",
}: {
  /** The field, for the link's accessible name. Sentence case: "Oil produced". */
  label: string;
  from: LockedFrom;
  /** Sized to the figure it stands in for, so the bar is not a uniform smudge. */
  width?: string;
  /** Numeric cells sit right; a card's figure sits left under its own label. */
  align?: "start" | "end";
}) {
  return (
    <span
      className={`inline-flex items-center gap-[7px] ${
        align === "end" ? "justify-end" : "justify-start"
      }`}
    >
      <LockedBar width={width} />
      <Link
        href={`/register?from=${from}`}
        aria-label={`Create a free account to see the ${label.toLowerCase()}`}
        className="inline-flex shrink-0 items-center gap-[4px] whitespace-nowrap text-[11.5px] font-semibold text-mv-green-deep no-underline underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
      >
        <Lock aria-hidden="true" className="h-3 w-3 shrink-0" strokeWidth={2.3} />
        Free account
      </Link>
    </span>
  );
}

/**
 * The offer alone, without a bar.
 *
 * FOR A GROUP OF WITHHELD FIGURES THAT SHARE ONE CTA. Two `LockedValue`s side by side
 * in a narrow two-column cell do not fit: the link is `whitespace-nowrap`, so it
 * cannot shrink, and the pair overflows its card and reads as the same offer twice on
 * one line. Where several figures are withheld together, they get bars and this gets
 * rendered once beneath them.
 *
 * `label` still names what is being unlocked, so the accessible name is specific even
 * though one link now covers more than one figure.
 */
export function LockedLink({
  label,
  from,
}: {
  label: string;
  from: LockedFrom;
}) {
  return (
    <Link
      href={`/register?from=${from}`}
      aria-label={`Create a free account to see the ${label.toLowerCase()}`}
      className="inline-flex items-center gap-[4px] whitespace-nowrap text-[11.5px] font-semibold text-mv-green-deep no-underline underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
    >
      <Lock aria-hidden="true" className="h-3 w-3 shrink-0" strokeWidth={2.3} />
      Free account
    </Link>
  );
}

/**
 * The redacted bar alone, for the places that carry the offer elsewhere.
 *
 * Decorative: whatever sits beside it must carry the meaning for a screen reader.
 */
export function LockedBar({ width = "w-[46px]" }: { width?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-[10px] rounded-full bg-[linear-gradient(90deg,var(--color-mv-line),var(--color-mv-line-soft))] align-middle blur-[2.5px] ${width}`}
    />
  );
}
