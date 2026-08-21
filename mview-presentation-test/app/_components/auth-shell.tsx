"use client";

import { Info } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";

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
    /*
     * 24px of top padding, not the stylesheet's 44px: at 44 the card floated
     * clear of the header with a band of empty page above it that read as a
     * rendering fault rather than as breathing room.
     *
     * BOTTOM IS 32px, NOT THE 80px THIS CARRIED (Ryan, 2026-08-19: "Remove that
     * space"). Measured on /register before the change: exactly 80px of empty
     * band between the card and the dark footer, all of it this padding — the
     * card's own margin was already zero and the footer sat flush against this
     * wrapper.
     *
     * The 80px used to be justified here as "what keeps the card off the fold on
     * short viewports". IT NEVER DID THAT JOB: `min-h` already guarantees the
     * wrapper fills the viewport, and on any page whose content exceeds that —
     * which /register does by 480px — the padding only ever added a gap below
     * the card. So it bought nothing and cost the band in the screenshot.
     *
     * 32px/24px is not a fresh guess: it is `pageShellClass`, which every
     * library and legal page already uses after this same complaint was raised
     * on 2026-08-17. Not zero, for the reason recorded there — butted against
     * the footer the card looks clipped rather than finished. `pb-20` was the
     * last one left in the app; nothing is now on a different value.
     *
     * AND `min-h` IS GONE TOO (Ryan, 2026-08-19: "remove that space from both
     * pages"). Cutting the padding to 32px was not enough on sign-in, because the
     * padding was only part of it: `min-h-[calc(100vh-64px)]` resolved to 656px
     * against content that needed 599, so the wrapper was STRETCHED 57px and the
     * visible gap was 89 — the 32 plus the stretch. Measured, not inferred.
     *
     * What it was for was keeping the dark footer below the fold on a short page.
     * It is not missed: the footer is 552px tall on its own, so even with the
     * wrapper shrunk to its content the page still overflows the viewport and the
     * footer still starts off-screen. The gap is now the same 32px on both auth
     * pages as everywhere else, rather than sign-in quietly carrying 89 because
     * its card happens to be shorter than the viewport.
     */
    <div className="pb-8 pt-6 max-[767px]:pb-6">
      <div className="mx-auto max-w-[1200px] px-7 max-[767px]:px-4">
        <div className="mx-auto max-w-[520px] rounded-mv border border-mv-line bg-mv-card p-[22px] shadow-mv">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * The centred heading and lede.
 *
 * NO LOGO (Ryan, 2026-08-19: "remove the logo from form both login and
 * registration"). It was the design's own asset, at a Cloudinary URL carrying an
 * `e_replace_color:0f1b16:48:ffffff` transform so the wordmark's white "VIEW"
 * did not vanish against this white card.
 *
 * Removed HERE rather than at the two call sites on purpose: `AuthHead` is used
 * by sign-in and sign-up and nothing else, so this one edit covers both forms and
 * they cannot drift apart. The mark is still in the header directly above the
 * card, which is what made a second copy inside it redundant.
 *
 * That also dropped the file's only `next/image` usage, so the import went with
 * it — and with it the `priority` hint that was making this a preload candidate
 * on both pages.
 */
export function AuthHead({ title, lede }: { title: string; lede: string }) {
  return (
    <div className="mb-[18px] text-center">
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
/**
 * How long a revealed password stays revealed before it re-masks itself.
 *
 * Long enough to read back a typed passphrase and spot the wrong character;
 * short enough that walking away from the desk does not leave it on screen.
 */
const REVEAL_TIMEOUT_MS = 15_000;

export function PasswordInput({
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const [shown, setShown] = useState(false);

  /*
   * NO RE-MASK ON SUBMIT — the timeout below is the whole mechanism.
   *
   * There WAS a form `submit` listener here, added earlier the same day for "the
   * password remains visible indefinitely after the user enables Show Password
   * and submits an unsuccessful login attempt". It was removed on the follow-up
   * (Ryan, 2026-08-19): re-masking on submit "defeats the purpose of the toggle at
   * exactly the moment it's needed" — you reveal the password precisely to check
   * it, and hiding it the instant the attempt fails takes it away before you can.
   *
   * Both notes asked for the same guarantee, and the original wording offered a
   * choice: re-masked "after submission OR after a short timeout". The timeout
   * satisfies it without the conflict, so it is the one kept. Nothing stays
   * revealed indefinitely either way.
   */

  /*
   * `setShown` is inside the timer callback rather than the effect body, which is
   * what keeps this clear of `react-hooks/set-state-in-effect`.
   */
  useEffect(() => {
    if (!shown) return;
    const id = setTimeout(() => setShown(false), REVEAL_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [shown]);

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
  hint,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  children: ReactNode;
  /** Optional (i) note, shown on hover. Same treatment as `Field`'s `hint`. */
  hint?: ReactNode;
}) {
  const generatedId = useId();
  /* A caller-supplied id has to win, or `htmlFor` below would point at an input
     that renamed itself out from under it. */
  const inputId = (rest.id as string | undefined) ?? generatedId;
  const hintId = `${inputId}-hint`;

  /*
   * NO LONGER A WRAPPING <label>, and that is what makes the hint possible.
   *
   * This was `<label>` around the box and the text, which is the tidiest way to
   * make the words clickable — but the tooltip trigger is a <button>, and a
   * button inside a label toggles the checkbox when pressed. Hovering to read a
   * note is one thing; reading it and finding you had also ticked the box is
   * another.
   *
   * So the row is a <div>, the text carries `htmlFor`, and the trigger sits
   * OUTSIDE that label. Clicking the words still toggles the box — the
   * association is by id now rather than by nesting — and pressing the (i) does
   * nothing but open the tooltip.
   */
  return (
    <div className="mt-[10px] flex items-start gap-[10px] text-[13px] text-mv-slate">
      <input
        type="checkbox"
        {...rest}
        id={inputId}
        aria-describedby={hint ? hintId : rest["aria-describedby"]}
        /* 20px, not the stylesheet's 17px: beside 13px label text a 17px box
           read as undersized next to every other control on the card. `mt-0`
           follows from the height — at 17px the box needed a pixel of nudge to
           sit on the text's first line, at 20px it already does. */
        className="mt-0 h-5 w-5 flex-none cursor-pointer accent-mv-green-deep"
      />
      {/* `flex-wrap` and the `inline` label: the terms row runs to three lines,
          and the (i) has to follow the END of the text rather than sit in a
          column of its own. `items-baseline` keeps the glyph on the last line's
          baseline instead of centring it against the whole block. */}
      <span className="flex flex-wrap items-baseline gap-x-[5px]">
        <label htmlFor={inputId} className="cursor-pointer">
          {children}
        </label>
        {hint ? (
          <>
            <Tooltip>
              <TooltipTrigger
                type="button"
                aria-label="About this option"
                /* Same treatment as `Field`'s hint trigger, so the two read as
                   one control rather than two similar ones. */
                className="inline-flex shrink-0 translate-y-[2px] cursor-help items-center justify-center rounded-full bg-transparent p-0 text-mv-muted transition hover:text-mv-green-deep focus-visible:text-mv-green-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep data-[state=delayed-open]:text-mv-green-deep"
              >
                <Info aria-hidden className="h-[15px] w-[15px]" />
              </TooltipTrigger>
              <TooltipContent>{hint}</TooltipContent>
            </Tooltip>
            {/*
             * The permanent copy `aria-describedby` points at — Radix only mounts
             * tooltip content while the tooltip is OPEN, so without this the
             * checkbox would describe nothing for anyone who never hovers.
             * `sr-only`, never `hidden`: display:none drops it from the
             * accessibility tree entirely. Same reasoning as `Field`.
             */}
            <span id={hintId} className="sr-only">
              {hint}
            </span>
          </>
        ) : null}
      </span>
    </div>
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
 * The submit-level failure, on the page rather than in a toast.
 *
 * THIS HAS BEEN ROUND THE HOUSES — read before moving it again. It began as a red
 * line under the password field; it was replaced by `toast.error` on 2026-08-19
 * ("instead of showing that msg here show in toast msg"); it is back, same day,
 * because the toast covered the page heading and no floating position avoided
 * that ("The error message should be positioned above/below the login button or
 * within the form, without covering the page heading or other important
 * content").
 *
 * The thing that kept going wrong was PLACEMENT, not the medium. Under the
 * password field it sat mid-form with inputs below it; as a toast it floated over
 * the title. Sign-in now renders it immediately above the submit button, which is
 * both the last thing read before pressing and inside the form's own flow, so it
 * can cover nothing.
 *
 * `role="alert"` so it is announced when it appears — a toast got that for free
 * from sonner's live region, and an inline element has to ask.
 *
 * NOT FOR FIELD VALIDATION. That has its own slot on `Field`, beside the input it
 * concerns and in the tab order. This is only for a whole-submit outcome the API
 * decided: wrong credentials, a throttle, an unreachable service.
 */
export function FormError({
  message,
  className = "mb-3",
  id,
}: {
  message: string | null;
  className?: string;
  /**
   * Lets the inputs point `aria-describedby` here (Ryan, 2026-08-19: after a
   * server failure "both inputs are aria-invalid='false' with no
   * aria-describedby pointing at the error").
   *
   * `role="alert"` alone only ANNOUNCES the sentence once, as it appears. It does
   * not associate it with anything, so a screen-reader user who then tabs back to
   * the email box hears the label and no hint of why the form refused. The
   * association is what survives past the announcement.
   */
  id?: string;
}) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      /* JUST THE SENTENCE (Ryan, 2026-08-19: "Don't show that red box only show
         msg"). This briefly had a tinted panel and a border, on the argument that
         an unadorned line above a full-width green button reads as more fine
         print. Overruled — and the red plus the semibold weight still separate it
         from the grey `Fine` notes, which are neither. */
      className={`text-[13px] font-semibold text-mv-red ${className}`}
    >
      {message}
    </p>
  );
}

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
