import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * THE PORTAL'S BUTTON — `portal.css`'s `.btn` family as Tailwind.
 *
 * A CLASS FUNCTION FIRST, A COMPONENT SECOND. Half the portal's buttons are
 * links (Open the report, Back to Dashboard) and half are real buttons (Mark all
 * read, Export). A component that renders `<button>` cannot serve the first half
 * without an `asChild` escape hatch, so the variants are exposed as
 * `portalButtonClass()` and the two wrappers below are thin.
 *
 * The same split, for the same reason, as `app/_components/button.tsx` on the
 * marketing side. NOT that file, though, and the difference is deliberate: the
 * portal ships its own type scale (14px buttons, 13px small, 10px radius) and
 * the marketing shell ships another. Sharing the class function would tie a
 * portal control's geometry to a marketing redesign, and the portal tree is
 * documented as self-contained — see the header of `../../layout.tsx`.
 *
 * Every colour and measurement below is `portal.css` §10 read off the
 * stylesheet, not a Tailwind approximation of it.
 */

export type PortalButtonVariant = "primary" | "ghost" | "mint";
export type PortalButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-transparent font-semibold leading-[1.2] !no-underline transition-[background,border-color,filter] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep disabled:cursor-not-allowed disabled:opacity-55";

const VARIANTS: Record<PortalButtonVariant, string> = {
  primary: "bg-mv-green text-mv-green-ink hover:brightness-[1.05]",
  ghost:
    "border-mv-line bg-mv-card text-mv-slate hover:bg-mv-bg hover:border-mv-line-strong",
  mint: "border-mv-mint-edge bg-mv-mint text-mv-green-ink hover:brightness-[1.03]",
};

const SIZES: Record<PortalButtonSize, string> = {
  sm: "rounded-lg px-3 py-1.5 text-[13px]",
  md: "px-[18px] py-[10px] text-sm",
  lg: "rounded-xl px-[26px] py-[14px] text-base",
};

export function portalButtonClass({
  variant = "ghost",
  size = "md",
  className = "",
}: {
  variant?: PortalButtonVariant;
  size?: PortalButtonSize;
  className?: string;
} = {}): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`.trim();
}

interface StyleProps {
  variant?: PortalButtonVariant;
  size?: PortalButtonSize;
}

/**
 * A real `<button>`. `type="button"` by default so one inside a form cannot
 * submit it by accident — the caller passes `type="submit"` when it means to.
 */
export function PortalButton({
  variant,
  size,
  className,
  type = "button",
  ...props
}: StyleProps & ComponentProps<"button">) {
  return (
    <button
      type={type}
      className={portalButtonClass({ variant, size, className })}
      {...props}
    />
  );
}

/** A `next/link` wearing the same clothes. */
export function PortalButtonLink({
  variant,
  size,
  className,
  children,
  ...props
}: StyleProps & ComponentProps<typeof Link> & { children: ReactNode }) {
  return (
    <Link className={portalButtonClass({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}
