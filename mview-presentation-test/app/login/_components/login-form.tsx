"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { signInAction } from "@/app/_components/auth-actions";
import { loginSchema, type LoginValues } from "@/app/_components/auth-schema";
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
} from "@/app/_components/auth-shell";
import { GoogleSignIn } from "@/app/_components/google-sign-in";

/**
 * Sign in — the design's `route:login`, wired to `POST /User/login_user`.
 *
 * Order, copy and controls are the mockup's, unchanged. The prototype's own
 * handlers were all demos (`onclick="…Reset link sent ✓ (demo)"`); those are
 * replaced by real calls, and only real calls.
 */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  async function onValid(values: LoginValues) {
    const result = await signInAction(values);
    if (!result.ok) {
      /* A toast, matching sign-up. These two forms are siblings and shared the
         same inline slot; moving only one would leave the pair inconsistent. */
      toast.error(result.message);
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

      {/* A TOAST, not a line under the button (Ryan, 2026-08-19).
          Nothing here is about what was typed — every message this can carry is
          about Google or the API being unreachable ("Google's sign-in script
          could not load", "Sign-in is temporarily unavailable"). The inline
          version had to be styled to sit against the button without reading as
          part of it, and it pushed the whole form down as it appeared. See the
          note in `ui/sonner.tsx` on why field errors did NOT move. */}
      <GoogleSignIn next={next} onError={(message) => toast.warning(message)} />

      {/* Lower case here on purpose — `OrDivider` sets `uppercase`, so this
          renders as "OR WITH EMAIL". */}
      <OrDivider label="or with email" />

      <form onSubmit={handleSubmit(onValid)} noValidate>
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
          {(props) => (
            <input
              {...props}
              {...register("email")}
              type="email"
              autoComplete="username"
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
              autoComplete="current-password"
              placeholder="Enter your password"
            />
          )}
        </Field>

        {/* Unchecked by default, as the design specifies: shared and family
            devices. Checked, the session cookie lasts 30 days; unchecked it
            lasts the browser session. */}
        <div className="mb-3 mt-[2px]">
          <CheckRow {...register("remember")}>
            <span className="text-[13px]">Stay signed in on this device</span>
          </CheckRow>
        </div>

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
