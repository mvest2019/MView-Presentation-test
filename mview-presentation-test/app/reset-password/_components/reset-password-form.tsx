"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  requestPasswordResetAction,
  resetPasswordAction,
} from "@/app/_components/auth-actions";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordValues,
  type ResetPasswordValues,
} from "@/app/_components/auth-schema";
import {
  AuthHead,
  Divider,
  Field,
  Fine,
  FormError,
  PasswordInput,
  Req,
  SubmitButton,
} from "@/app/_components/auth-shell";

/**
 * Password reset, both halves.
 *
 * Which half renders is decided by the token from the emailed link, read on the
 * server in `page.tsx`. Everything the sign-in form learned on 2026-08-19 is
 * carried over rather than re-derived, because these are the same two field types
 * in the same card:
 *
 *   · NO TOASTS. Messages render in the form, above the button.
 *   · Focus returns to a field on a server-side failure — nothing else claims it,
 *     because the submit button is disabled during the request and a disabled
 *     element cannot hold focus.
 *   · `aria-invalid` and `aria-describedby` are composed, not overwritten, so a
 *     field can point at its own message AND the form-level one.
 *   · The email box carries `inputMode`, `autoCapitalize`, `autoCorrect` and
 *     `spellCheck={false}`, and normalises itself on blur.
 *   · Length caps: 254 on the address (the RFC 5321 maximum), 128 on a password
 *     (well past anything real, since `maxLength` truncates SILENTLY and a shorter
 *     cap would lock someone out of the account they are recovering).
 */

/** The id `FormError` renders with, so inputs can point `aria-describedby` at it. */
const RESET_ERROR_ID = "reset-error";

/** Composes the form-level error into a field's own aria wiring. See sign-in. */
function describedByFailure(
  props: { "aria-invalid": boolean; "aria-describedby": string | undefined },
  failure: string | null,
): { "aria-invalid": boolean; "aria-describedby": string | undefined } {
  if (!failure) return props;
  const ids = [props["aria-describedby"], RESET_ERROR_ID].filter(Boolean);
  return { "aria-invalid": true, "aria-describedby": ids.join(" ") || undefined };
}

export function ResetPasswordForm({ token }: { token: string | null }) {
  return token ? <SetNewPassword token={token} /> : <RequestLink />;
}

/* ─────────────────────────────────────────────── step 1: request a link ── */

function RequestLink() {
  const [failure, setFailure] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onValid(values: ForgotPasswordValues) {
    setFailure(null);
    const result = await requestPasswordResetAction(values);
    if (!result.ok) {
      setFailure(result.message);
      setFocus("email");
      return;
    }
    setSent(true);
  }

  /*
   * THE SAME PANEL WHETHER OR NOT THE ADDRESS HAS AN ACCOUNT, and the wording is
   * careful about it: "If that address has an account".
   *
   * The endpoint does not distinguish — probed with an address that has no account
   * and it still answered SUCCESS — and `requestPasswordResetAction` swallows any
   * refusal that is not an outage for the same reason. Saying "we've sent you a
   * link" outright would be a claim this page cannot support; saying "no account
   * for that address" would rebuild the enumeration oracle that was removed from
   * sign-in the same day, on a form that needs no password at all.
   */
  if (sent) {
    return (
      <>
        <AuthHead
          title="Check your email"
          lede="If that address has an account, a reset link is on its way."
        />
        <div className="rounded-[12px] border border-mv-mint-line bg-mv-mint px-[14px] py-[11px] text-center text-[13.5px] leading-[1.5] text-mv-green-deep">
          The link opens a page where you can set a new password. It can only be
          used once, and it expires — request another if it stops working.
        </div>
        <Fine className="mt-3">
          Nothing arrived? Check spam, then try again with the address you signed
          up with.
        </Fine>
        <Divider />
        <p className="text-center text-[13px] text-mv-slate">
          <Link
            href="/login"
            className="font-semibold text-mv-green-deep no-underline hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <AuthHead
        title="Reset your password"
        lede="Enter the email address on your account and we will send a reset link."
      />

      <form
        onSubmit={handleSubmit(onValid)}
        onChange={() => {
          if (failure) setFailure(null);
        }}
        noValidate
      >
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
                inputMode="email"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={254}
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

        <FormError message={failure} id={RESET_ERROR_ID} />

        <SubmitButton disabled={isSubmitting}>
          {isSubmitting ? "Sending the link…" : "Send reset link"}
        </SubmitButton>
      </form>

      <Divider />

      <p className="text-center text-[13px] text-mv-slate">
        Remembered it?{" "}
        <Link
          href="/login"
          className="font-semibold text-mv-green-deep no-underline hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </>
  );
}

/* ────────────────────────────────────────────── step 2: set a password ── */

function SetNewPassword({ token }: { token: string }) {
  const router = useRouter();
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onValid(values: ResetPasswordValues) {
    setFailure(null);
    const result = await resetPasswordAction(token, values);
    if (!result.ok) {
      setFailure(result.message);
      setFocus("password");
      return;
    }
    setDone(true);
  }

  /*
   * `router.replace`, NOT `push` — ported from the live site along with its
   * reason: back out of the confirmation and you must not land on a completed
   * reset form holding a spent token. The only way back in is a fresh link.
   */
  if (done) {
    return (
      <>
        <AuthHead
          title="Password updated"
          lede="You can sign in with your new password now."
        />
        <div className="rounded-[12px] border border-mv-mint-line bg-mv-mint px-[14px] py-[11px] text-center text-[14px] font-semibold text-mv-green-deep">
          <span aria-hidden="true">✓</span> Your password has been changed
        </div>
        {/* A LINK, not `SubmitButton` — that one is a real `type="submit"` and
            takes no `onClick`, and there is no form left to submit here. Styled to
            match it so the card does not change shape on the last step.

            `replace` rather than a plain href for the reason above: pressing Back
            from sign-in must not return to a completed reset form holding a spent
            token. */}
        <button
          type="button"
          onClick={() => router.replace("/login")}
          className="mt-4 w-full cursor-pointer rounded-[10px] border-2 border-transparent bg-mv-green px-[18px] py-[11px] font-sans text-[15px] font-bold leading-[1.2] text-mv-green-ink hover:brightness-[1.05] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
        >
          Continue to sign in
        </button>
      </>
    );
  }

  return (
    <>
      <AuthHead
        title="Set a new password"
        lede="Choose a password you have not used on this account before."
      />

      <form
        onSubmit={handleSubmit(onValid)}
        onChange={() => {
          if (failure) setFailure(null);
        }}
        noValidate
      >
        <Field
          label={
            <>
              New password <Req />
            </>
          }
          error={errors.password?.message}
        >
          {(props) => (
            <PasswordInput
              {...props}
              {...register("password")}
              {...describedByFailure(props, failure)}
              autoComplete="new-password"
              maxLength={128}
              placeholder="Minimum 8 characters"
            />
          )}
        </Field>

        <Field
          label={
            <>
              Confirm new password <Req />
            </>
          }
          error={errors.confirmPassword?.message}
        >
          {(props) => (
            <PasswordInput
              {...props}
              {...register("confirmPassword")}
              {...describedByFailure(props, failure)}
              autoComplete="new-password"
              maxLength={128}
              placeholder="Type it again"
            />
          )}
        </Field>

        <FormError message={failure} id={RESET_ERROR_ID} />

        <SubmitButton disabled={isSubmitting}>
          {isSubmitting ? "Updating your password…" : "Update password"}
        </SubmitButton>
      </form>

      <Divider />

      <p className="text-center text-[13px] text-mv-slate">
        {/* The link is single-use and expires, so the way out of a stale one is a
            new request — this page, without the token. */}
        Link expired?{" "}
        <Link
          href="/reset-password"
          className="font-semibold text-mv-green-deep no-underline hover:underline"
        >
          Request a new one
        </Link>
      </p>
    </>
  );
}
