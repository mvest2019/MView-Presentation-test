"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import {
  registerAction,
  sendCodeAction,
  verifyCodeAction,
} from "@/app/_components/auth-actions";
import {
  registerSchema,
  type RegisterValues,
} from "@/app/_components/auth-schema";
import {
  AuthHead,
  CheckRow,
  Divider,
  Field,
  Fine,
  OrDivider,
  PasswordInput,
  Req,
  SubmitButton,
  inputClass,
} from "@/app/_components/auth-shell";
import { GoogleSignIn } from "@/app/_components/google-sign-in";

/**
 * Sign up — the design's `route:signup`, wired to the live endpoints.
 *
 * THE ORDER IS THE LIVE SITE'S (Ryan, 2026-08-19: "check current website flow
 * for register need same"). It verifies the address FIRST and creates the
 * account last:
 *
 *   fill the form → Verify Email → 6-digit code → Register → signed in
 *
 * This is the reverse of what was here. The old flow submitted the form, created
 * the account, mailed a code, and swapped the whole card for a verify panel and
 * then a "verified" panel with a Continue button. Nothing about that matched
 * `app/register/_components/RegisterForm.tsx` in the live repo, where:
 *
 *   · the verification lives INSIDE the form, between the last field and the
 *     terms checkbox, and the card never swaps out;
 *   · "Verify Email" is disabled until every required field is valid
 *     (`allRequiredFieldsValid`), so the code cannot be requested for an address
 *     that is about to be rejected;
 *   · Register is disabled until the code is confirmed, and `handleRegisterSubmit`
 *     refuses outright — "Please verify your email before registering.";
 *   · a confirmed registration signs the member straight in and routes them on,
 *     rather than ending on a panel with a button.
 *
 * The prototype accepted any six digits and hard-coded 482916; nothing of that
 * is carried over.
 *
 * ONE DELIBERATE DEPARTURE, and it is the account type — see `DEFAULT_MEMBER_TYPE`
 * in `auth-actions.ts`. The live form opens `MemberTypePopup` to ask owner vs
 * professional; here everyone is a mineral owner and nothing is asked.
 *
 * The live site's plan machinery is also absent, because this form chooses no
 * plan: no `subscriptionid`/`price` in the payload beyond the free default, and
 * none of its `/welcome` or `/payment` routing.
 */
const RESEND_COOLDOWN_SECONDS = 300;

export function RegisterForm({ next }: { next: string }) {
  const router = useRouter();

  /*
   * VERIFICATION STATE, held as the two ADDRESSES rather than as booleans.
   *
   * `verifiedEmail` is what the code actually confirmed, and `codeSentTo` is
   * where the current code went. Both compare against the live email field
   * instead of latching a `emailVerified` flag, which closes a hole the live site
   * has: over there `emailVerified` is a plain boolean, so verifying address A
   * and then editing the box to address B leaves the flag true and registers B
   * unverified. Deriving it means changing the address silently un-verifies it
   * and the Verify Email button comes back, with no effect and no reset call.
   */
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      phone: "",
      mailingAddress: "",
    },
  });

  // The design disables the create button until the box is ticked, rather than
  // letting it be pressed and then complaining.
  //
  // `useWatch`, not `watch()`: the latter returns a fresh function each render,
  // which React Compiler cannot memoize, so it bails out of optimising this
  // whole component. `useWatch` subscribes to the one field instead.
  const agreed = useWatch({ control, name: "terms" });

  /* Watched because the verification block reacts to them as they are typed:
     these four gate the Verify Email button, and the address decides whether an
     existing confirmation still counts. */
  const watched = useWatch({
    control,
    name: ["fullName", "email", "password", "phone"],
  });
  const [nameNow, emailRaw, passwordNow, phoneNow] = watched;
  const emailNow = (emailRaw ?? "").trim();

  const emailVerified =
    verifiedEmail !== null &&
    verifiedEmail.toLowerCase() === emailNow.toLowerCase();
  const awaitingCode = codeSentTo !== null && !emailVerified;

  /*
   * The live site's `allRequiredFieldsValid`, field for field: name, email and
   * password must be valid, and phone must be valid OR empty — which the schema
   * already encodes, since every phone check short-circuits on "".
   *
   * Checked against the SCHEMA rather than re-implemented, so this gate and the
   * messages under the inputs can never disagree about what "valid" means.
   */
  const canSendCode =
    registerSchema.shape.fullName.safeParse(nameNow ?? "").success &&
    registerSchema.shape.email.safeParse(emailRaw ?? "").success &&
    registerSchema.shape.password.safeParse(passwordNow ?? "").success &&
    registerSchema.shape.phone.safeParse(phoneNow ?? "").success;

  /* Resend ticker — the live site's, at the same 300s. The updater is a callback
     rather than a bare `setCooldown(n - 1)`, which is what keeps this out of
     `react-hooks/set-state-in-effect`. */
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(
      () => setCooldown((left) => (left > 0 ? left - 1 : 0)),
      1000,
    );
    return () => clearInterval(id);
  }, [cooldown]);

  async function sendCode() {
    setSending(true);
    setOtpError(null);
    /* Address and name only — no password (Ryan, 2026-08-19). The password field
       is still WATCHED, but only so `canSendCode` can require a valid one before
       this button unlocks; the value itself never leaves the form until the
       registration call. */
    const result = await sendCodeAction(emailNow, nameNow ?? "");
    setSending(false);

    if (!result.ok) {
      toast.error(result.message || "Could not send the code. Please try again.");
      return;
    }

    setCodeSentTo(emailNow);
    setDigits(Array(6).fill(""));
    setCooldown(RESEND_COOLDOWN_SECONDS);
    toast.success("Verification code sent to your email.");
  }

  async function verifyOtp(code: string) {
    if (code.length !== 6 || !codeSentTo) {
      setOtpError("Enter the 6-digit code.");
      return;
    }

    setVerifying(true);
    setOtpError(null);
    /* Verified against the address the code was SENT to, not against whatever is
       in the box now — those can differ, and confirming the wrong one is exactly
       the hole this avoids. */
    const result = await verifyCodeAction(codeSentTo, code);
    setVerifying(false);

    if (!result.ok) {
      setOtpError(result.message || "Invalid or expired code. Please try again.");
      return;
    }

    setVerifiedEmail(codeSentTo);
    setCodeSentTo(null);
    setOtpError(null);
    setCooldown(0);
    toast.success("Email verified!");
  }

  async function onValid(values: RegisterValues) {
    /* The live site's guard, kept even though the button is disabled: a form can
       still be submitted by pressing Enter in a field, and the account must not
       be created for an unconfirmed address. */
    if (!emailVerified) {
      toast.error("Please verify your email before registering.");
      return;
    }

    const result = await registerAction(values);
    if (!result.ok) {
      /*
       * A TOAST, not the line that used to sit under the password field (Ryan,
       * 2026-08-19, on "That email address already has an account. Sign in
       * instead.").
       *
       * `error` rather than `warning` deliberately: this is the red inline
       * message's replacement, so it keeps the red treatment and stays distinct
       * from the amber Google/API-fault toasts above the form.
       */
      toast.error(result.message);
      return;
    }

    toast.success("Registration Successful");
    /* `registerAction` signed them in and set the cookie, so the tree on screen
       is still the signed-out one — `refresh` is what re-renders the header. */
    router.push(next);
    router.refresh();
  }

  return (
    <>
      <AuthHead
        title="Create your account"
        lede="Create your account with your email or Google. No credit card required."
      />

      {/* The same endpoint as sign-in: the backend resolves existing-vs-new
          from the Google token, so there is no separate "sign up with Google". */}
      {/* A toast, for the reason sign-in's carries — these are Google and API
          faults, not anything about this form. */}
      <GoogleSignIn onError={(message) => toast.warning(message)} />

      {/* Lower case on purpose — `OrDivider` sets `uppercase`. */}
      <OrDivider label="or with email" />

      {/* No "* Required fields" legend (Ryan, 2026-08-17). The red asterisk on
          each label already reads as required without being explained, and the
          line sat between the divider and the first field where it was the first
          thing the eye landed on. `Req` still marks the labels themselves. */}
      <form onSubmit={handleSubmit(onValid)} noValidate>
        <Field
          label={
            <>
              Full name <Req />
            </>
          }
          error={errors.fullName?.message}
        >
          {(props) => (
            <input
              {...props}
              {...register("fullName")}
              type="text"
              autoComplete="name"
              placeholder="Enter your full name"
            />
          )}
        </Field>

        <Field
          label={
            <>
              Email <Req />
            </>
          }
          error={errors.email?.message}
        >
          {(props) => (
            <input
              {...props}
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
            />
          )}
        </Field>

        <Field
          label={
            <>
              Password <Req />
            </>
          }
          error={errors.password?.message}
        >
          {(props) => (
            <PasswordInput
              {...props}
              {...register("password")}
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
            />
          )}
        </Field>

        <Field
          label={
            <>
              Mobile phone <Optional />
            </>
          }
          error={errors.phone?.message}
          hint="Optional — a second way to reach you about your record and account recovery. Never sold, never shared."
        >
          {(props) => (
            <input
              {...props}
              {...register("phone")}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(555) 555-0123"
              /* 14 = the placeholder's own length, "(555) 555-0123" — ten digits
                 plus the brackets, space and dash someone may type around them.
                 A hard stop in the control as well as in the schema, so a runaway
                 string like the 27-digit one this replaced cannot be entered at
                 all rather than being caught after the fact. The schema still has
                 the last word: this caps characters, it cannot count digits. */
              maxLength={14}
            />
          )}
        </Field>

        <Field
          label={
            <>
              Mailing address{" "}
              <Optional>(optional for now)</Optional>
            </>
          }
          error={errors.mailingAddress?.message}
          hint="You can add your address later. It is required before claiming a record to help verify ownership."
        >
          {(props) => (
            <input
              {...props}
              {...register("mailingAddress")}
              type="text"
              autoComplete="street-address"
              placeholder="Street, City, State, ZIP"
            />
          )}
        </Field>

        {/* NO INVITE CODE FIELD (Ryan, 2026-08-19: "don't show double
            verification code box").

            It was the design's, and it read as a SECOND code box: its placeholder
            was "e.g. 4821-0653" and it sat immediately above the verification
            block, so with the digits open the form appeared to ask for two codes.
            Removing it rather than restyling it, for two reasons beyond the
            confusion — the live register form has no such field, and this one was
            never sent anywhere. `registerUser` has no parameter for it, so
            whatever was typed here was validated and then dropped. Nothing is
            lost. If invitations are built later they need an API field first. */}

        {/* ----- Email verification (gates Register) -----
            Position is the live site's: after the last field, immediately before
            the terms checkbox, inside the form rather than replacing it. */}
        <div className="mb-3">
          {emailVerified ? (
            <div className="flex items-center gap-2 rounded-[10px] border border-mv-mint-line bg-mv-mint px-[14px] py-[11px] text-[14px] font-semibold text-mv-green-deep">
              <span aria-hidden="true">✓</span>
              Email verified
            </div>
          ) : !awaitingCode ? (
            <>
              <button
                type="button"
                onClick={sendCode}
                disabled={sending || !canSendCode}
                /* Disabled until every required field is valid, so the code is
                   never sent for details the API is about to reject. */
                title={
                  canSendCode ? undefined : "Fill in the fields above first"
                }
                className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border-2 border-mv-green-deep bg-white px-4 font-sans text-[14px] font-bold leading-[1.2] text-mv-green-deep transition-colors hover:bg-mv-mint disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-white"
              >
                {sending ? "Sending…" : "Verify email"}
              </button>
              <p className="mt-2 inline-block rounded-[6px] bg-mv-mint px-[10px] py-1 text-[11.5px] font-semibold text-mv-green-deep">
                Click the Verify email button to get a 6-digit code on your
                email.
              </p>
            </>
          ) : (
            <div className="rounded-[12px] border border-mv-mint-line bg-[#f7fbf9] p-3">
              <p className="m-0 mb-[10px] text-[12.5px] leading-[1.5] text-mv-muted">
                Enter the 6-digit code sent to{" "}
                <strong className="font-bold text-mv-ink">{codeSentTo}</strong>
              </p>

              <div className="mb-[10px] flex gap-[6px]">
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      boxes.current[index] = el;
                    }}
                    value={digit}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    aria-label={`Digit ${index + 1}`}
                    onChange={(event) => {
                      const value = event.target.value
                        .replace(/\D/g, "")
                        .slice(-1);
                      setOtpError(null);
                      const nextDigits = [...digits];
                      nextDigits[index] = value;
                      setDigits(nextDigits);
                      if (value && index < 5) boxes.current[index + 1]?.focus();
                      /* Auto-submits on the sixth digit, as the live site's
                         `onComplete` does — nobody should have to find a button
                         after typing a code they just read. */
                      const joined = nextDigits.join("");
                      if (joined.length === 6) verifyOtp(joined);
                    }}
                    onKeyDown={(event) => {
                      // Backspace on an empty box steps back, so a mistyped code
                      // can be cleared without reaching for the mouse.
                      if (
                        event.key === "Backspace" &&
                        !digits[index] &&
                        index > 0
                      ) {
                        boxes.current[index - 1]?.focus();
                      }
                    }}
                    onPaste={(event) => {
                      const pasted = event.clipboardData
                        .getData("text")
                        .replace(/\D/g, "")
                        .slice(0, 6);
                      if (!pasted) return;
                      event.preventDefault();
                      const nextDigits = Array(6).fill("");
                      for (let i = 0; i < pasted.length; i += 1) {
                        nextDigits[i] = pasted[i];
                      }
                      setDigits(nextDigits);
                      boxes.current[Math.min(pasted.length, 5)]?.focus();
                      if (pasted.length === 6) verifyOtp(pasted);
                    }}
                    className="h-11 w-[38px] rounded-[9px] border border-mv-line text-center text-[18px] font-bold text-mv-ink outline-none focus:border-mv-green focus:outline-2 focus:outline-mv-green"
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-[12.5px]">
                {cooldown > 0 ? (
                  <span className="text-mv-muted">
                    Resend in {Math.floor(cooldown / 60)}:
                    {String(cooldown % 60).padStart(2, "0")}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={sendCode}
                    disabled={sending}
                    className="cursor-pointer border-0 bg-transparent p-0 font-sans text-[12.5px] font-semibold text-mv-green-deep underline disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    Resend code
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setCodeSentTo(null);
                    setDigits(Array(6).fill(""));
                    setOtpError(null);
                    setCooldown(0);
                  }}
                  className="cursor-pointer border-0 bg-transparent p-0 font-sans text-[12.5px] font-semibold text-mv-muted underline hover:text-mv-green-deep"
                >
                  Change email
                </button>
              </div>

              {(verifying || otpError) && (
                <p
                  role={otpError ? "alert" : "status"}
                  className={`mt-2 text-[12.5px] font-semibold ${
                    otpError ? "text-[#b3261e]" : "text-mv-muted"
                  }`}
                >
                  {verifying ? "Verifying…" : otpError}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mb-3 mt-[2px]">
          <CheckRow {...register("terms")}>
            <strong className="font-bold text-mv-ink">
              I agree to the{" "}
              <Link
                href="/terms-condition"
                className="text-mv-green-deep no-underline hover:underline"
              >
                Terms of Use
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy-policy"
                className="text-mv-green-deep no-underline hover:underline"
              >
                Privacy Policy
              </Link>
              .
            </strong>
            {errors.terms && (
              <span className="mt-1 block font-semibold text-[#b3261e]">
                {errors.terms.message}
              </span>
            )}
          </CheckRow>
        </div>

        {/* `!emailVerified` is the live site's gate (`disabled={isLoading ||
            !emailVerified}`), and the label no longer promises to verify: the
            code is already confirmed by the time this is pressable, so "Create
            account & verify email" described the old order and would now be a
            lie. */}
        <SubmitButton disabled={!agreed || !emailVerified || isSubmitting}>
          {isSubmitting ? "Creating your account…" : "Create account"}
        </SubmitButton>

        <Fine className="mt-2">
          Free plan • No credit card required • Cancel anytime
        </Fine>
        <Fine className="mt-[6px]">
          Your acceptance of the Terms of Use and Privacy Policy is recorded.
        </Fine>
        <Fine className="mt-[10px]">
          After you claim a record, we verify your ownership before displaying
          ownership data. Verification may take up to 24 hours.
        </Fine>

        {/* ONE HORIZONTAL LINE, not a stacked bullet list (Ryan, 2026-08-17:
            "need that horizontal to reduce space"). As a <ul> this was six lines
            and 72px of the fifth consecutive block of small print above the
            footer — two of those lines were the list's own leading, spent on two
            items of three words each.

            Back to `Fine`, which is what the four notes above it use, with the
            same `•` separators as the "Free plan • No credit card required"
            line. Every phrase is kept verbatim; only the layout changed. The <ul>
            is not missed — with two short items on one line there is no list to
            navigate, and it reads as the sentence it always was. */}
        <Fine className="mt-3">
          Free plan includes: 1 owner profile • 1 visible lease • Upgrade at any
          time.
        </Fine>
      </form>

      <Divider />

      <p className="text-center text-[13px] text-mv-slate">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-mv-green-deep no-underline hover:underline"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}

function Optional({ children }: { children?: React.ReactNode }) {
  return (
    <span className="font-normal text-mv-muted">
      {children ?? "(optional)"}
    </span>
  );
}

/*
 * `VerifyPanel` and `VerifiedPanel` WERE HERE and are gone with the reordering.
 *
 * They were the two cards the old flow swapped in after submitting: a six-digit
 * step, then an "Email verified — your free account is ready" panel with a
 * Continue button. The live site has neither. Verification is now a block inside
 * the form above (the digit boxes, the paste and backspace handling and the
 * resend cooldown all moved there intact), and a confirmed registration signs the
 * member in and routes them on, so there is nothing left for a terminal panel to
 * say.
 */

export { inputClass };
