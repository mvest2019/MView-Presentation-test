"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { signInAction } from "@/app/_components/auth-actions";
import { loginSchema, type LoginValues } from "@/app/_components/auth-schema";
import {
  AuthHead,
  Divider,
  Field,
  Fine,
  FormError,
  OrDivider,
  PasswordInput,
  Req,
  SubmitButton,
} from "@/app/_components/auth-shell";
import { GoogleSignIn } from "@/app/_components/google-sign-in";

/**
 * Sign in — the design's `route:login`, wired to `POST /User/login_user`.
 *
 * Order, copy and controls are the mockup's, unchanged. The prototype's own
 * handlers were all demos (`onclick="…Reset link sent ✓ (demo)"`); those are
 * replaced by real calls, and only real calls.
 */
/** The id `FormError` renders with, so both inputs can point at it. */
const SIGN_IN_ERROR_ID = "signin-error";

/**
 * Marks a field invalid and points it at the sign-in error, WITHOUT losing the
 * field's own error wiring.
 *
 * `Field` already hands each input an `aria-invalid` and an `aria-describedby`
 * for its own validation message. A server failure is a second, independent
 * reason the field is wrong, so this COMPOSES rather than replaces: `aria-invalid`
 * becomes true if either is true, and the ids are concatenated — `aria-describedby`
 * is a space-separated list, so a field can legitimately point at both its own
 * message and the form-level one, and assistive tech reads both.
 *
 * Overwriting instead of composing was the tempting version and it is wrong: it
 * would drop the field's own "Email is required" association the moment a server
 * failure was also on screen.
 */
function describedByFailure(
  props: { "aria-invalid": boolean; "aria-describedby": string | undefined },
  failure: string | null,
): { "aria-invalid": boolean; "aria-describedby": string | undefined } {
  if (!failure) return props;
  const ids = [props["aria-describedby"], SIGN_IN_ERROR_ID].filter(Boolean);
  return {
    "aria-invalid": true,
    "aria-describedby": ids.join(" ") || undefined,
  };
}

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [failure, setFailure] = useState<string | null>(null);
  /* Kept apart from `failure`: a Google fault belongs under the Google button,
     not in the form's error slot next to the password field. */
  const [googleFailure, setGoogleFailure] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  /*
   * FOCUS BACK TO THE EMAIL FIELD AFTER A SERVER-SIDE FAILURE (Ryan, 2026-08-19:
   * "keyboard focus is lost and moves to the <body> element instead of the Email
   * field").
   *
   * WHY FOCUS IS LOST AT ALL: the submit button is `disabled` while the request is
   * in flight, and a disabled element cannot hold focus — so clicking Sign in
   * blurs to `<body>` and nothing claims it back. A keyboard or screen-reader user
   * is returned to the top of the document with no idea the form refused them.
   *
   * IN AN EFFECT, NOT IN THE SUBMIT HANDLER, and that is the fix for the second
   * report of this. `setFocus` used to be called inline right after
   * `setFailure(...)` — which runs BEFORE React commits that state, and before
   * react-hook-form flips `isSubmitting` back to false and re-renders again. The
   * focus call therefore raced two renders; it measured as working locally and
   * still failed on the deployed build. An effect keyed on `failure` runs after
   * the commit, so the field is settled by the time focus moves.
   *
   * VALIDATION failures are NOT handled here — react-hook-form's
   * `shouldFocusError` is on by default and already lands on the first invalid
   * field, confirmed as `INPUT[email]`. Adding a second mechanism for that path
   * would mean two things fighting over the same element.
   */
  useEffect(() => {
    if (failure) setFocus("email");
  }, [failure, setFocus]);

  async function onValid(values: LoginValues) {
    setFailure(null);
    const result = await signInAction(values);
    if (!result.ok) {
      /*
       * ON THE PAGE, not in a toast (Ryan, 2026-08-19: "instead of showing in
       * toast show on page"). The toast covered the "Sign in to Mineral View"
       * heading, and no floating position avoided that — see `FormError` and the
       * position note in `ui/sonner.tsx`.
       *
       * Rendered immediately above the submit button, which is what the request
       * asked for and what keeps it out of the way of everything else.
       */
      setFailure(result.message);
      return;
    }
    router.push(next);
    // The cookie was set on the server; the tree on screen is still the
    // signed-out one, so the header needs re-rendering.
    router.refresh();
  }

  return (
    <>
      <AuthHead
        title="Sign in to Mineral View"
        lede="Access your Mineral View account."
      />

      {/* NO TOASTS ON THIS PAGE AT ALL (Ryan, 2026-08-19: "don't show toast
          msg"). This was `toast.warning`, on the argument that a Google or API
          fault is not about anything the visitor typed and so does not belong in
          the form. It is inline again, and under the GOOGLE button rather than in
          the form's own error slot above "Sign in" — every message it can carry
          ("Google's sign-in script could not load", "Sign-in is temporarily
          unavailable") is about the control directly above it, and putting it
          beside the password fields would blame the wrong thing.

          `mt-2` matters: the button carries only `mb-1`, so without it this sat
          4px under the border and read as part of the button rather than as a
          message about it. */}
      <GoogleSignIn next={next} onError={setGoogleFailure} />
      {googleFailure && (
        <p
          role="alert"
          className="mb-1 mt-2 text-[12.5px] font-semibold leading-[1.45] text-mv-red"
        >
          {googleFailure}
        </p>
      )}

      {/* Lower case here on purpose — `OrDivider` sets `uppercase`, so this
          renders as "OR WITH EMAIL". */}
      <OrDivider label="or with email" />

      {/* Typing clears the notice: it describes an attempt the visitor has now
          moved on from, and leaving "Email or password is incorrect." above the
          button while they retype makes the form look like it is still refusing
          them. Cheaper than wiring a reset into every field — one handler on the
          form catches all of them, and `failure &&` keeps it to a no-op once
          there is nothing to clear. */}
      <form
        onSubmit={handleSubmit(onValid)}
        onChange={() => {
          if (failure) setFailure(null);
        }}
        noValidate
      >
        {/* Both fields carry the asterisk, as sign-up's do. Sign-in had none,
            which left the form looking as though something on it were optional
            when nothing is. */}
        <Field
          label={
            <>
              Email <Req />
            </>
          }
          error={errors.email?.message}
        >
          {(props) => {
            const field = register("email");
            return (
              <input
                {...props}
                {...field}
                {...describedByFailure(props, failure)}
                type="email"
                autoComplete="username"
                /*
                 * MOBILE KEYBOARD HINTS (Ryan, 2026-08-19: the field "has
                 * spellcheck enabled and no inputmode / autocapitalize /
                 * autocorrect", so phones "trigger auto-capitalisation and red
                 * squiggles on email addresses").
                 *
                 * `type="email"` alone does NOT settle these. iOS still
                 * capitalises the first letter and still runs autocorrect on the
                 * local part, and both spellcheck the whole thing — so "jane@" is
                 * offered as "Jane@" and underlined red as a misspelling. Four
                 * attributes because they are four separate behaviours; none
                 * implies the others.
                 *
                 * `autoCorrect` is not a standard attribute and React passes it
                 * through as-is, which is the point: it is what WebKit reads.
                 */
                inputMode="email"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                /*
                 * 254 = the longest address RFC 5321 permits (the SMTP path
                 * limit). A cap the standard itself sets cannot reject a real
                 * address, which is why this number and not a rounder one.
                 */
                maxLength={254}
                /*
                 * NORMALISE WHAT IS ON SCREEN, not just what is sent (Ryan,
                 * 2026-08-19: leading/trailing spaces "pass client validation and
                 * are submitted as-is").
                 *
                 * The value POSTED was already safe — `auth-schema.ts` trims and
                 * lower-cases, and I proved the server receives the normalised
                 * form. Two things were still true and worth fixing: the box went
                 * on showing "  QA.Test@Example.COM  " after submitting
                 * "qa.test@example.com", so what you read was not what was sent;
                 * and anyone reasoning about a failure from the field alone was
                 * being misled.
                 *
                 * On blur rather than on change, so the caret is not yanked about
                 * mid-typing. `shouldValidate` is left off because this form
                 * validates on submit, so there is no error state to refresh.
                 */
                onBlur={(event) => {
                  const tidy = event.target.value.trim().toLowerCase();
                  if (tidy !== event.target.value) setValue("email", tidy);
                  field.onBlur(event);
                }}
                placeholder="you@example.com"
              />
            );
          }}
        </Field>

        <Field
          label={
            <>
              Password <Req />
            </>
          }
          error={errors.password?.message}
          aside={
            <Link
              href="/reset-password"
              /* 13.5px, matching `labelClass` — this link shares a row with the
                 "Password" label, and at 12px it read as a footnote about the
                 label rather than as the control it is. Same size, same weight:
                 the colour is what separates them now. */
              className="text-[13.5px] font-semibold text-mv-green-deep no-underline hover:underline"
            >
              Forgot password?
            </Link>
          }
        >
          {(props) => (
            <PasswordInput
              {...props}
              {...register("password")}
              {...describedByFailure(props, failure)}
              autoComplete="current-password"
              /*
               * 128, and this is the one length cap worth pausing over: an input
               * `maxLength` TRUNCATES SILENTLY, so anyone whose password is longer
               * could never sign in and would be told only "Email or password is
               * incorrect". 128 is chosen to make that impossible in practice —
               * comfortably past any password a manager generates, and past the
               * 72-byte ceiling bcrypt imposes on the hash anyway.
               *
               * Not lower. A tighter cap looks tidier and risks locking someone
               * out of their own account, which is a far worse failure than
               * accepting an over-long string and letting the API reject it.
               */
              maxLength={128}
              placeholder="Enter your password"
            />
          )}
        </Field>

        {/* NO "STAY SIGNED IN" CHECKBOX (Ryan, 2026-08-19, confirmed as the whole
            row rather than just its (i)).

            It was the design's, unchecked by default for shared and family
            devices, and it chose the cookie's lifetime: ticked gave 30 days,
            unticked gave the browser session. THAT CHOICE IS GONE WITH IT — every
            sign-in now gets the persistent 30-day cookie, set in `signInAction`.
            The live site's sign-in has no such checkbox either and persists by
            default, so this is the behaviour it matches.

            Worth being clear that this is a real trade, not just less UI: someone
            on a borrowed machine can no longer ask for a session that ends when
            the browser closes. Signing out still clears the cookie, so the way to
            leave no trace is now to sign out rather than to have planned ahead.
            `remember` is off `loginSchema` for the same reason — a field nothing
            can set does not belong in the shape. */}

        {/* IMMEDIATELY ABOVE THE BUTTON. Every message this carries is about the
            two fields above and the press that follows — wrong credentials, the
            throttle, an unreachable service — so it belongs in the gap between
            them, where it is read on the way to trying again. */}
        <FormError message={failure} id={SIGN_IN_ERROR_ID} />

        <SubmitButton disabled={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </SubmitButton>

        <Fine className="mt-3">
          Your information is kept private and is never sold.
        </Fine>
      </form>

      <Divider />

      <p className="text-center text-[13px] text-mv-slate">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-bold text-mv-green-deep no-underline hover:underline"
        >
          Create one for free →
        </Link>
      </p>
    </>
  );
}
