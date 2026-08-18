"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import {
  registerAction,
  resendCodeAction,
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
  FormError,
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
 * Three states, exactly as the mockup walks them:
 *   form → verify (six-digit code) → verified
 *
 * The email code GATES the account, which is the design's rule and the API's:
 * `userRegistration` creates the row, `send-code` mails the digits, and only a
 * confirmed `verify-code` opens the verified panel. The prototype accepted any
 * six digits and hard-coded 482916; nothing of that is carried over.
 */
type Stage = "form" | "verify" | "verified";

export function RegisterForm() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("form");
  const [failure, setFailure] = useState<string | null>(null);
  /* Kept apart from `failure`: a Google problem belongs next to the Google
     button, not in the form's error slot halfway down the card. */
  const [googleFailure, setGoogleFailure] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  /* Held past the form step for the resend call, which needs a `username`. */
  const [fullName, setFullName] = useState("");

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
      inviteCode: "",
    },
  });

  // The design disables the create button until the box is ticked, rather than
  // letting it be pressed and then complaining.
  //
  // `useWatch`, not `watch()`: the latter returns a fresh function each render,
  // which React Compiler cannot memoize, so it bails out of optimising this
  // whole component. `useWatch` subscribes to the one field instead.
  const agreed = useWatch({ control, name: "terms" });

  async function onValid(values: RegisterValues) {
    setFailure(null);
    const result = await registerAction(values);
    if (!result.ok) {
      setFailure(result.message);
      return;
    }
    setEmail(values.email);
    setFullName(values.fullName);
    setStage("verify");
  }

  if (stage === "verified") {
    return <VerifiedPanel onContinue={() => router.push("/")} />;
  }

  if (stage === "verify") {
    return (
      <VerifyPanel
        email={email}
        fullName={fullName}
        onVerified={() => setStage("verified")}
      />
    );
  }

  return (
    <>
      <AuthHead
        title="Create your account"
        lede="Create your account with your email or Google. No credit card required."
      />

      {/* The same endpoint as sign-in: the backend resolves existing-vs-new
          from the Google token, so there is no separate "sign up with Google". */}
      <GoogleSignIn onError={setGoogleFailure} />
      {googleFailure && (
        <p
          role="alert"
          className="mb-1 mt-2 text-[12.5px] font-semibold leading-[1.45] text-[#b3261e]"
        >
          {googleFailure}
        </p>
      )}

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

        {/* UNDER THE PASSWORD FIELD, matching sign-in. Every failure this can
            carry — "that email address already has an account", a rejected
            password, an upstream fault — is about the credentials above it, and
            at the top of the form it sat under the "or with email" divider where
            it read as a complaint about the Google button instead.

            It is NOT the last field on this form, so it does not sit directly
            above the submit button as sign-in's does; the fields that follow are
            optional, and this stays with the three required ones it concerns. */}
        <FormError message={failure} className="-mt-[8px] mb-3" />

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

        <Field
          label={
            <>
              Invite code <Optional />
            </>
          }
          error={errors.inviteCode?.message}
          hint="Enter an invite code if one was provided to you."
        >
          {(props) => (
            <input
              {...props}
              {...register("inviteCode")}
              type="text"
              autoComplete="off"
              placeholder="e.g. 4821-0653"
            />
          )}
        </Field>

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

        <SubmitButton disabled={!agreed || isSubmitting}>
          {isSubmitting
            ? "Creating your account…"
            : "Create account & verify email"}
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

/**
 * The six-digit code step.
 *
 * Six separate boxes, as the design draws them, with paste and backspace
 * handled — a code arrives from an email and is almost always pasted, and a
 * six-box control that cannot take a paste is worse than one text field.
 */
function VerifyPanel({
  email,
  fullName,
  onVerified,
}: {
  email: string;
  /** Carried through only so "Resend the code" can supply the required
      `username` — see `resendCodeAction`. */
  fullName: string;
  onVerified: () => void;
}) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState<string | null>(null);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join("");

  function setAt(index: number, value: string) {
    setError(null);
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < 5) boxes.current[index + 1]?.focus();
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const result = await verifyCodeAction(email, code);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onVerified();
  }

  return (
    <>
      <AuthHead
        title="Check your email"
        lede={`We sent a 6-digit code to ${email}.`}
      />

      <div className="rounded-[12px] border border-mv-line bg-[#f7fbf9] p-4">
        <p className="m-0 mb-[10px] text-[12px] leading-[1.5] text-mv-muted">
          Your account opens{" "}
          <strong className="font-bold">only after this code is confirmed</strong>{" "}
          — it proves the address is really yours, so your record, alerts and
          anything the county mails through us reach you and nobody else.
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
              maxLength={1}
              aria-label={`Digit ${index + 1}`}
              onChange={(event) =>
                setAt(index, event.target.value.replace(/\D/g, "").slice(-1))
              }
              onKeyDown={(event) => {
                // Backspace on an empty box steps back, so a mistyped code can
                // be cleared without reaching for the mouse.
                if (event.key === "Backspace" && !digits[index] && index > 0) {
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
                const next = Array(6).fill("");
                for (let i = 0; i < pasted.length; i += 1) next[i] = pasted[i];
                setDigits(next);
                boxes.current[Math.min(pasted.length, 5)]?.focus();
              }}
              className="h-12 w-[42px] rounded-[9px] border border-mv-line text-center text-[20px] font-bold text-mv-ink outline-none focus:border-mv-green focus:outline-2 focus:outline-mv-green"
            />
          ))}
        </div>

        {error && (
          <p role="alert" className="mb-[10px] text-[13px] font-semibold text-[#b3261e]">
            {error}
          </p>
        )}
        {resent && (
          <p role="status" className="mb-[10px] text-[13px] text-mv-green-deep">
            {resent}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={code.length !== 6 || busy}
          className="w-full cursor-pointer rounded-[10px] border-2 border-transparent bg-mv-green px-[18px] py-[10px] font-sans text-[14px] font-bold text-mv-green-ink hover:brightness-[1.05] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {busy ? "Verifying…" : "Verify & create my account"}
        </button>

        <p className="mt-2 text-center text-[12px] text-mv-muted">
          Didn&apos;t get it?{" "}
          <button
            type="button"
            onClick={async () => {
              setResent(null);
              setError(null);
              const result = await resendCodeAction(email, fullName);
              if (result.ok) setResent("A new code is on its way.");
              else setError(result.message);
            }}
            className="cursor-pointer border-0 bg-transparent p-0 font-sans text-[12px] font-semibold text-mv-green-deep underline"
          >
            Resend the code
          </button>{" "}
          · check spam · codes expire in 15 minutes
        </p>
      </div>
    </>
  );
}

function VerifiedPanel({ onContinue }: { onContinue: () => void }) {
  return (
    <>
      <AuthHead
        title="Email verified"
        lede="Your free account is ready."
      />
      <div className="rounded-[12px] border border-[#bfe6d3] bg-mv-mint p-4 text-center">
        <div aria-hidden="true" className="text-[26px] text-mv-green-deep">
          ✓
        </div>
        <h2 className="mb-1 mt-1 font-sans text-[16px] font-bold text-mv-ink">
          Email verified — your free account is ready
        </h2>
        <p className="m-0 mb-3 text-[12px] text-mv-muted">
          Your acceptance of the Terms was recorded with the document version and
          timestamp.
        </p>
        <button
          type="button"
          onClick={onContinue}
          className="w-full cursor-pointer rounded-[10px] border-2 border-transparent bg-mv-green px-[18px] py-[10px] font-sans text-[14px] font-bold text-mv-green-ink hover:brightness-[1.05]"
        >
          Continue →
        </button>
      </div>
    </>
  );
}

export { inputClass };
