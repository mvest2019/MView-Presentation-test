/**
 * The site's button styling — one source of truth for button colour.
 *
 * WHY A CLASS FUNCTION AND NOT ONLY A COMPONENT. Most buttons on this site are
 * `next/link` anchors, not `<button>` elements: "Find your record", "Free
 * account", "Load more articles". A component that renders `<button>` cannot
 * serve those without an `asChild` escape hatch, so the variants are exposed as
 * `buttonClass()` and `<Button>` is a thin wrapper over it for real buttons.
 * That also matches the existing house style — `navLinkBase`, `inlineLink` and
 * the heading classes are all exported class strings.
 *
 * EVERY COLOUR BELOW ALREADY EXISTED. The variants are the marketing shell's
 * `.mk-btn` pair (primary green, mint) and the prototype's `.btn` / `.btn-dark`
 * / `.linklike` rules, expressed against the tokens in `globals.css`. Nothing
 * here is a new palette. Two inconsistencies were resolved in favour of the
 * majority, both noted inline.
 *
 * Pressed states: the design specifies hover but never a pressed colour, so
 * filled variants dim slightly via `brightness` rather than introduce a hex the
 * design does not have.
 */

/**
 * The "this one is chosen" fill, shared by controls that are *not* generic
 * buttons: page numbers, A–Z letters, category chips, pill tabs. Those keep
 * their own radius, padding and hover semantics — the design gives each its own
 * — so they cannot become `<Button>` without redesigning them. What they should
 * not each own is the colour, which is this.
 */
export const selectedControlClass =
  "border-mv-green-deep bg-mv-green-deep text-white";

export type ButtonVariant =
  | "primary"
  | "mint"
  | "outline"
  | "dark"
  | "ghost"
  | "link";

export type ButtonSize = "sm" | "md" | "lg";

/**
 * Shared skeleton. `no-underline` is here because the same classes are used on
 * anchors, which the browser underlines by default. `type="button"` is set by
 * the `<Button>` wrapper, not here.
 */
const BASE =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border font-semibold leading-[1.2] !no-underline transition-[background,border-color,color,filter] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep disabled:cursor-not-allowed disabled:opacity-55";

const VARIANTS: Record<ButtonVariant, string> = {
  /** The one filled CTA — brand green on dark green ink. */
  primary:
    "border-transparent bg-mv-green text-mv-green-ink hover:brightness-[1.05] active:brightness-[.97]",

  /** The stepped-back CTA, so two funnel actions do not compete. */
  mint: "border-mv-mint-edge bg-mv-mint text-mv-green-ink hover:brightness-[1.03] active:brightness-[.97]",

  /**
   * The default neutral button (the prototype's `.btn`, including its
   * `background:var(--hover);border-color:#d5dae0` hover).
   *
   * Text is `mv-slate`. Two call sites used it and one used `mv-ink`; slate wins
   * because it also matches the header's nav links, so neutral controls read the
   * same everywhere. The shift is #0d0e17 → #1e293b.
   */
  outline:
    "border-mv-line bg-white text-mv-slate hover:border-mv-line-strong hover:bg-mv-hover",

  /** The prototype's `.btn-dark` — the same fill as `selectedControlClass`. */
  dark: `${selectedControlClass} hover:brightness-95 active:brightness-90`,

  /** Chromeless, for triggers that sit inside another surface. */
  ghost:
    "border-transparent bg-transparent text-mv-slate hover:text-mv-green-deep",

  /** The prototype's `.linklike` — a button that should read as a link. */
  link: "!rounded-none border-transparent bg-transparent p-0 text-mv-green-deep hover:underline",
};

/**
 * `lg` carries wider padding at a *smaller* type size than `md`. That is not a
 * slip: `md` is the prototype's in-page `.btn` (15px) and `lg` is the marketing
 * shell's header/footer CTA (14px in a taller pill).
 */
const SIZES: Record<ButtonSize, string> = {
  sm: "px-3 py-[6px] text-[13px]",
  md: "px-4 py-[9px] text-[15px]",
  lg: "px-[18px] py-[10px] text-sm",
};

export function buttonClass({
  variant = "outline",
  size = "md",
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  // `link` supplies its own padding, so the size slot is skipped for it.
  const sizing = variant === "link" ? "" : SIZES[size];
  return `${BASE} ${VARIANTS[variant]} ${sizing} ${className}`.trim();
}

/**
 * A real `<button>`. Defaults to `type="button"` — an unqualified button inside
 * a form submits it, which is almost never what these are for.
 *
 * Typed with `ComponentPropsWithRef` so callers can pass `ref` directly: React
 * 19 hands `ref` to function components as an ordinary prop, so it arrives in
 * the spread and no `forwardRef` wrapper is needed.
 */
export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
} & React.ComponentPropsWithRef<"button">) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, className })}
      {...props}
    />
  );
}
