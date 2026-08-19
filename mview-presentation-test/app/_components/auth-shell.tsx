"use client";

import { Info } from "lucide-react";
import Image from "next/image";
import { useId, useState, type ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

/**
 * The frame and controls shared by sign-in and sign-up.
 *
 * PORTED FROM THE DESIGN, not composed from this site's other components:
 * `marketing/src/routes/login.html` and `signup.html`, plus the rules for
 * `.auth-shell`, `.auth-card`, `.field`, `.hint`, `.v33-gbtn`, `.v33-ordiv`,
 * `.pw-wrap`, `.pw-eye`, `.auth-check`, `.v33-req`, `.v33-code` and `.divider`
 * in `styles/v33css.css`. The measurements below are that stylesheet's, one for
 * one — 520px card, 14px field gap, 42x48 code boxes — so the pages match the
 * mockups rather than resembling them.
 *
 * TWO DELIBERATE DEPARTURES from that stylesheet, both from review of the built
 * pages rather than the mockups: the shell's top padding (44px there) and the
 * checkbox (17px there). Each is noted where it is set.
 *
 * The one thing NOT taken from the prototype is its behaviour: every control
 * there is `onclick="…demo…"`. The wiring is this build's, against the live
 * API — see `lib/auth-api.ts`.
 */

/** `.auth-shell` + `.wrap` + `.card.card-pad.auth-card`. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    // 24px of top padding, not the stylesheet's 44px: at 44 the card floated
    // clear of the header with a band of empty page above it that read as a
    // rendering fault rather than as breathing room. The 80px bottom stays —
    // it is what keeps the card off the fold on short viewports.
    <div className="min-h-[calc(100vh-64px)] pb-20 pt-6">
      <div className="mx-auto max-w-[1200px] px-7 max-[767px]:px-4">
        <div className="mx-auto max-w-[520px] rounded-mv border border-mv-line bg-mv-card p-[22px] shadow-mv">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * The centred logo, heading and lede.
 *
 * The logo is the DESIGN'S OWN asset URL, `e_replace_color:0f1b16:48:ffffff` —
 * white swapped for near-black. That transform is required here and is not the
 * one the header uses: this card is white, and the untransformed file has a
 * white "VIEW" that would be invisible on it.
 */
export function AuthHead({ title, lede }: { title: string; lede: string }) {
  return (
    <div className="mb-[18px] text-center">
      <Image
        src="https://res.cloudinary.com/mview/image/upload/e_replace_color:0f1b16:48:ffffff/f_auto,q_auto,w_320/f_auto/icons/mineralview-logo.png"
        alt="Mineral View"
        width={320}
        height={73}
        priority
        className="mx-auto mb-[14px] block h-[30px] w-auto"
      />
      <h1 className="font-sans text-[24px] font-semibold tracking-[-.01em] text-mv-ink">
        {title}
      </h1>
      <p className="mt-[6px] text-[13px] text-mv-muted">{lede}</p>
    </div>
  );
}

/**
 * `.v33-gbtn` — "Continue with Google".
 *
 * An `<a>`, not a button with an onClick: this starts a full-page redirect to
 * Google, so it is a navigation. Written as a link it works with JavaScript
 * disabled, can be opened in a new tab, and shows its destination on hover.
 */
export function GoogleButton({ next }: { next?: string }) {
  const href = next
    ? `/api/auth/google?next=${encodeURIComponent(next)}`
    : "/api/auth/google";
  return (
    <a
      href={href}
      className="mb-1 flex w-full cursor-pointer items-center justify-center gap-[10px] rounded-[10px] border border-mv-line bg-white px-[18px] py-[11px] font-sans text-[15px] font-semibold text-mv-ink !no-underline hover:bg-[#f6f8f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </svg>
      Continue with Google
    </a>
  );
}

/** `.v33-ordiv` — a rule either side of the label. */
export function OrDivider({ label }: { label: string }) {
  return (
    <div className="my-3 flex items-center gap-3 text-[11.5px] uppercase tracking-[.6px] text-mv-muted before:h-px before:flex-1 before:bg-mv-line before:content-[''] after:h-px after:flex-1 after:bg-mv-line after:content-['']">
      <span>{label}</span>
    </div>
  );
}

/** The red asterisk on a required label — `.v33-req`. */
export function Req() {
  return (
    <span title="Required" className="font-extrabold text-[#b3261e]">
      *
    </span>
  );
}

/**
 * `.field` — label, control, then a hint or an error.
 *
 * `aria-invalid` and `aria-describedby` are wired so the failure is announced,
 * not only coloured. The design shows the hint permanently; when a field is in
 * error the error replaces it, so the row never carries two lines of small text.
 */
export function Field({
  label,
  error,
  hint,
  aside,
  children,
}: {
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  /** The "Forgot password?" link, which the design puts on the label row. */
  aside?: ReactNode;
  children: (props: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
    className: string;
  }) => ReactNode;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="mb-[14px] flex flex-col gap-[6px]">
      {/* One label row in both cases now. It used to branch — a bare <label>
          without `aside`, a flex row with it — and the (i) has to sit beside the
          label either way. With nothing on the right, `justify-between` is a
          no-op, so the no-aside rendering is unchanged. */}
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-[5px]">
          <label htmlFor={id} className={labelClass}>
            {label}
          </label>
          {/*
            HELPER TEXT ON HOVER, behind an (i) (Ryan, 2026-08-17: "when hover on
            that i icons then show text use shadcn"). Printed under the field it
            was three paragraphs of explanation running down the form, which on a
            phone pushed the Create button below the fold.

            `type="button"` is load-bearing — this sits inside a <form>, and a
            button without it defaults to `submit`, so hovering to read a note and
            pressing Enter would have posted the form.
          */}
          {hint ? (
            <Tooltip>
              <TooltipTrigger
                type="button"
                aria-label="About this field"
                /* Lucide's `Info`, not a bordered <span> holding an italic "i".
                   That was a 15px circle drawn with a 1px border and a 10px
                   glyph, and at that size the letter sat visibly off-centre and
                   the ring rendered unevenly on non-retina screens. One SVG path
                   set is crisp at any size, and lucide is already the icon set
                   everywhere else in this app. Colour rides `currentColor`, so
                   the hover and open states are a single `text-*` swap. */
                className="inline-flex shrink-0 cursor-help items-center justify-center rounded-full bg-transparent p-0 text-mv-muted transition hover:text-mv-green-deep focus-visible:text-mv-green-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep data-[state=delayed-open]:text-mv-green-deep"
              >
                <Info aria-hidden className="h-[15px] w-[15px]" />
              </TooltipTrigger>
              <TooltipContent>{hint}</TooltipContent>
            </Tooltip>
          ) : null}
        </span>
        {aside}
      </div>
      {children({
        id,
        "aria-invalid": Boolean(error),
        "aria-describedby": describedBy,
        className: inputClass(Boolean(error)),
      })}
      {error ? (
        <span id={`${id}-error`} className="text-[12px] font-semibold text-[#b3261e]">
          {error}
        </span>
      ) : hint ? (
        /*
         * ALWAYS `sr-only`, never `hidden`, and it is NOT the tooltip.
         *
         * This element is what the input's `aria-describedby` points at, and
         * Radix only mounts tooltip content while the tooltip is open — so
         * pointing the input at the tooltip would leave `aria-describedby`
         * dangling at nothing for a screen-reader user who never hovers. Keeping
         * a permanent visually-hidden copy means the note is read out with the
         * field, whether or not anyone hovers. `display:none` would not do:
         * hidden content is dropped from the accessibility tree entirely.
         */
        <span
          id={`${id}-hint`}
          className="sr-only"
        >
          {hint}
        </span>
      ) : null}
    </div>
  );
}

const labelClass = "m-0 text-[13.5px] font-semibold text-mv-ink";

/**
 * 16px on phones for the same reason the site search is — Safari on iOS zooms
 * the page in on a field under 16px and does not zoom back out.
 */
export function inputClass(invalid: boolean): string {
  return [
    "w-full rounded-[10px] border bg-white px-[13px] py-[11px] text-[15px] text-mv-ink",
    /*
     * `mv-muted` (#6b7280), NOT the `mv-placeholder` token (#9aa3ae) the rest of
     * the site uses in inputs. At #9aa3ae the example text sat at about 2.6:1 on
     * white — under the 4.5:1 floor, and faint enough beside a near-black label
     * that the field read as disabled rather than empty. #6b7280 clears the
     * floor at ~4.9:1 and still reads as a prompt rather than as a typed value.
     * Scoped to the auth inputs on purpose: the token is shared with the
     * operator directory and the presentations filters, which were not in
     * question here.
     */
    "outline-none placeholder:text-mv-muted max-[767px]:text-[16px]",
    invalid
      ? "border-[#b3261e] focus:border-[#b3261e]"
      : "border-mv-line focus:border-mv-green-deep",
  ].join(" ");
}

/** `.pw-wrap` + `.pw-eye`. */
export function PasswordInput({
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input
        {...rest}
        type={shown ? "text" : "password"}
        className={`${className} pr-[42px]`}
      />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-pressed={shown}
        aria-label={shown ? "Hide password" : "Show password"}
        title={shown ? "Hide password" : "Show password"}
        className={`absolute right-[6px] top-1/2 -translate-y-1/2 cursor-pointer rounded-lg border-0 bg-transparent p-[6px] text-[16px] leading-none ${
          shown ? "opacity-100" : "opacity-55"
        } hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep`}
      >
        <span aria-hidden="true">👁</span>
      </button>
    </div>
  );
}

/** `.auth-check` — a 17px box beside its label. */
export function CheckRow({
  children,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { children: ReactNode }) {
  return (
    <label className="mt-[10px] flex items-start gap-[10px] text-[13px] text-mv-slate">
      <input
        type="checkbox"
        {...rest}
        /* 20px, not the stylesheet's 17px: beside 13px label text a 17px box
           read as undersized next to every other control on the card. `mt-0`
           follows from the height — at 17px the box needed a pixel of nudge to
           sit on the text's first line, at 20px it already does. */
        className="mt-0 h-5 w-5 flex-none cursor-pointer accent-mv-green-deep"
      />
      <span>{children}</span>
    </label>
  );
}

/** `.btn.btn-primary.btn-block.btn-lg`, plus the design's `.is-disabled`. */
export function SubmitButton({
  disabled,
  children,
}: {
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full cursor-pointer rounded-[10px] border-2 border-transparent bg-mv-green px-[18px] py-[11px] font-sans text-[15px] font-bold leading-[1.2] text-mv-green-ink hover:brightness-[1.05] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:brightness-100"
    >
      {children}
    </button>
  );
}

/*
 * `FormError` WAS HERE and is deliberately gone (Ryan, 2026-08-19: "instead of
 * showing that msg here show in toast msg").
 *
 * It rendered the submit-level failure — "That email address already has an
 * account. Sign in instead.", "That email and password did not match." — as a
 * red line under the password field. Both callers now raise `toast.error`
 * instead, so nothing referenced it. Do not reinstate it for FIELD validation:
 * that already has its own slot on `Field`, which keeps the message beside the
 * input and in the form's tab order.
 */

/** `.tiny.muted`, centred — the reassurance lines under the button. */
export function Fine({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-center text-[12px] leading-[1.5] text-mv-muted ${className}`}>
      {children}
    </p>
  );
}

/** `.divider`. */
export function Divider() {
  return <hr className="my-4 border-0 border-t border-mv-line" />;
}
